# SyncSpace Setup Guide

## Phase 1 Complete! ✅

I've successfully set up the foundation for your full-stack collaborative whiteboard application. Here's what's been implemented:

### What's Done

1. **Dependencies Installed**
   - React Router for navigation
   - Supabase client for authentication
   - React Query for server state management
   - Tailwind CSS + shadcn/ui for styling
   - All utility libraries

2. **Project Structure Created**
   ```
   client/src/
   ├── config/
   │   └── supabase.ts           # Supabase client
   ├── contexts/
   │   └── AuthContext.tsx        # Authentication state
   ├── hooks/
   │   └── useAuth.ts             # Auth hook
   ├── types/
   │   ├── auth.ts                # Auth types
   │   ├── database.ts            # Supabase database types
   │   └── workspace.ts           # Workspace types
   ├── components/
   │   ├── ui/                    # shadcn components
   │   └── auth/
   │       └── ProtectedRoute.tsx # Route guard
   ├── pages/
   │   ├── LoginPage.tsx          # Google OAuth login
   │   └── DashboardPage.tsx      # Workspace dashboard (placeholder)
   ├── lib/
   │   └── utils.ts               # Utility functions
   └── styles/
       └── globals.css            # Tailwind + theme
   ```

3. **Routing Configured**
   - `/` → Redirects to `/login`
   - `/login` → Google OAuth sign-in page
   - `/dashboard` → Protected workspace dashboard
   - Protected route wrapper with loading states

4. **Authentication Flow Ready**
   - AuthContext with Supabase integration
   - Google OAuth configuration (needs Supabase setup)
   - Automatic session management
   - Sign out functionality

5. **UI Framework**
   - Tailwind CSS configured
   - shadcn/ui components installed (button, card, dialog, input, label, avatar)
   - Modern, clean design system
   - Path aliases configured (@/ → src/)

### What You Need to Do Next

## Step 1: Create Supabase Project

1. **Go to https://supabase.com** and create a free account
2. **Create a new project**
   - Choose a project name
   - Set a database password (save it!)
   - Select a region close to you

3. **Enable Google OAuth**
   - In Supabase Dashboard → Authentication → Providers
   - Enable "Google" provider
   - Follow instructions to set up Google OAuth:
     - Go to https://console.cloud.google.com/
     - Create OAuth credentials
     - Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
     - Copy Client ID and Client Secret to Supabase

4. **Get Your Credentials**
   - Go to Settings → API
   - Copy your `Project URL`
   - Copy your `anon/public` key (NOT the service role key for client!)

5. **Update Environment Variables**
   - Edit `client/.env.local`
   - Replace placeholders:
     ```
     VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
     VITE_SUPABASE_ANON_KEY=your-actual-anon-key
     ```

## Step 2: Set Up Database

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run this SQL** to create all tables and functions:

```sql
-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT workspace_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Workspace members table
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Invite tokens table
CREATE TABLE public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- Create indexes
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_invite_tokens_workspace ON public.invite_tokens(workspace_id);
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view members of their workspaces"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can add members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Invite tokens policies
CREATE POLICY "Users can view invite tokens for their workspaces"
  ON public.invite_tokens FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners/editors can create invite tokens"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Database triggers
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to validate and use invite tokens
CREATE OR REPLACE FUNCTION public.use_invite_token(token_value TEXT)
RETURNS UUID AS $$
DECLARE
  invite_record RECORD;
  workspace_id_result UUID;
BEGIN
  SELECT * INTO invite_record
  FROM public.invite_tokens
  WHERE token = token_value
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite token has expired';
  END IF;

  IF invite_record.max_uses IS NOT NULL AND invite_record.current_uses >= invite_record.max_uses THEN
    RAISE EXCEPTION 'Invite token has reached maximum uses';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (invite_record.workspace_id, auth.uid(), 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.invite_tokens
  SET current_uses = current_uses + 1
  WHERE id = invite_record.id;

  RETURN invite_record.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 3: Test the Application

1. **Start the dev server:**
   ```bash
   cd client
   npm run dev
   ```

2. **Visit http://localhost:5173**
   - You should see the login page
   - Click "Continue with Google"
   - Authenticate with your Google account
   - You'll be redirected to the dashboard

## What's Next

### Phase 2: Workspace Management (Coming Next)
- Create workspace hooks with React Query
- Build full Dashboard with workspace grid
- Create/Delete workspace dialogs
- Workspace settings

### Phase 3: Whiteboard Integration
- Refactor monolithic Whiteboard.tsx
- Create WhiteboardPage with workspace context
- Connect to workspace-specific Yjs rooms
- Update WebSocket server for auth

### Phase 4: Invite System
- Generate invite links
- Join workspace via invite
- Manage invites

### Phase 5: Server Enhancement
- Add Supabase auth to WebSocket server
- Validate workspace access
- Secure connections

### Phase 6: Production Polish
- Error boundaries
- Loading states
- Toast notifications
- Final optimizations

## Troubleshooting

**Build errors?**
- Make sure `.env.local` has valid Supabase credentials
- Run `npm install` to ensure all dependencies are installed

**Can't sign in?**
- Check Google OAuth is enabled in Supabase
- Verify redirect URIs are configured correctly
- Check browser console for errors

**Database errors?**
- Ensure all SQL has been run in Supabase SQL Editor
- Check RLS policies are enabled
- Verify tables were created successfully

## Support

If you encounter issues:
1. Check the implementation plan: `.claude/plans/magical-squishing-cascade.md`
2. Review Supabase docs: https://supabase.com/docs
3. Check the console for error messages

Ready to continue with Phase 2? Just let me know!
