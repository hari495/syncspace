# 🎨 SyncSpace

> **A beautiful, real-time collaborative whiteboard built with modern web technologies**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)]()
[![React](https://img.shields.io/badge/React-19-61dafb)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## ✨ **Features**

- 🎨 **Real-Time Collaboration** - See your team's changes instantly with Y.js CRDT(Conflict-free Replicated Data Type)
- 🖌️ **Powerful Drawing Tools** - Rectangle, pencil, text, and selection tools
- 🎨 **Unlimited Colors** - Built-in palette + custom color picker
- 👥 **Team Management** - Role-based permissions (owner, editor, viewer)
- 🔗 **Easy Sharing** - Generate shareable invite links in seconds
- ⚡ **Auto-Save** - Everything persists automatically
- ⌨️ **Keyboard Shortcuts** - Arrow keys, Delete, Ctrl+Z/Y for power users
- 📱 **Responsive** - Works beautifully on desktop, tablet, and mobile
- 🔒 **Secure** - Google OAuth + Row-Level Security
- 🎯 **Production-Ready** - Error boundaries, toast notifications, optimized bundle

---

## 🚀 **Quick Start**

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn
- Supabase account
- Google OAuth credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/syncspace.git
cd syncspace

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Setup environment variables
cp client/.env.example client/.env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
# → Go to Supabase dashboard
# → Run SQL from docs/setup/supabase-complete-setup.sql

# Start the development servers
# Terminal 1 - Client
cd client
npm run dev

# Terminal 2 - Server
cd server
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 🏗️ **Tech Stack**

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS 4** - Utility-first styling
- **Konva** - HTML5 Canvas rendering
- **Y.js** - CRDT for real-time sync
- **React Query** - Server state management
- **Sonner** - Beautiful toast notifications
- **Radix UI** - Accessible component primitives

### Backend
- **Node.js + Express** - REST API server
- **WebSocket (ws)** - Real-time communication
- **Y.js + LevelDB** - CRDT sync & persistence
- **Supabase** - Database, Auth, Storage

### Infrastructure
- **Supabase** - PostgreSQL with Row-Level Security
- **Vercel** - Frontend hosting
- **Railway** - WebSocket server hosting

---

## 📁 **Project Structure**

```
syncspace/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # Radix UI components
│   │   │   ├── whiteboard/ # Whiteboard-specific
│   │   │   └── workspace/ # Workspace management
│   │   ├── constants/     # Configuration constants
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/          # API & utilities
│   │   ├── pages/        # Route pages
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper functions
│   ├── public/           # Static assets
│   └── vite.config.ts    # Vite configuration
├── server/               # Backend Node.js server
│   ├── index.js         # WebSocket server
│   └── package.json     # Server dependencies
├── docs/                # Documentation
│   ├── setup/          # Setup SQL scripts
│   └── troubleshooting/ # Debug guides
├── DEPLOYMENT.md        # Deployment guide
└── README.md           # This file
```

---

## 🎯 **Key Features Explained**

### Real-Time Collaboration
- Uses **Y.js CRDT** for conflict-free synchronization
- **WebSocket** connection for instant updates
- **Multi-user cursors** to see who's working where
- **Automatic conflict resolution** - no manual merging needed

### Drawing Tools
- **Rectangle Tool** - Click and drag to create shapes
- **Pencil Tool** - Free-form drawing with path simplification
- **Text Tool** - Click to add text anywhere
- **Selection Tool** - Move, resize, rotate shapes

### Performance Optimizations
- **React.memo** - Prevents unnecessary re-renders
- **Virtual Canvas** - Only renders visible shapes
- **Path Simplification** - Reduces pencil strokes by ~70%
- **Code Splitting** - Lazy-loaded routes
- **Optimized Bundling** - Vendor chunks for better caching

---

## 🔐 **Security Features**

- ✅ **Google OAuth 2.0** - Secure authentication
- ✅ **Row-Level Security (RLS)** - Database-level permissions
- ✅ **HTTPS Only** - All traffic encrypted
- ✅ **Environment Variables** - Secrets never committed
- ✅ **CORS Protection** - Configured WebSocket origins
- ✅ **Error Boundaries** - Graceful error handling

---

## 📚 **Documentation**

- [Deployment Guide](./DEPLOYMENT.md) - Complete hosting instructions
- [Database Schema](./docs/setup/supabase-complete-setup.sql) - SQL setup
- [Troubleshooting](./docs/troubleshooting/) - Common issues & fixes

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

Built with amazing open-source technologies:
- [React](https://react.dev) - UI framework
- [Vite](https://vitejs.dev) - Build tool
- [Supabase](https://supabase.com) - Backend platform
- [Y.js](https://docs.yjs.dev) - CRDT framework
- [Konva](https://konvajs.org) - Canvas library
- [TailwindCSS](https://tailwindcss.com) - Styling
- [Radix UI](https://radix-ui.com) - Component primitives

---

## 📧 **Contact**

Questions? Reach out:
- GitHub Issues: [Report a bug](https://github.com/yourusername/syncspace/issues)
- Email: your.email@example.com

---

**Made with ❤️ by developers who love clean code**

⭐ Star this repo if you find it useful!
