/**
 * Authentication & Database Diagnostic Tool
 * Add this to your browser console to diagnose issues
 */

// @ts-nocheck - Debug tool with relaxed type checking
import { supabase } from './config/supabase'

export async function diagnoseAuth() {
  console.group('🔍 AUTHENTICATION DIAGNOSTICS')

  // 1. Check session
  console.log('\n1️⃣ Checking Session...')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('❌ Session Error:', sessionError)
    return { success: false, error: 'Failed to get session' }
  }

  if (!session) {
    console.error('❌ No active session found')
    console.log('👉 Please sign in first at /login')
    return { success: false, error: 'Not authenticated' }
  }

  console.log('✅ Session found')
  console.log('   User ID:', session.user.id)
  console.log('   Email:', session.user.email)
  console.log('   Provider:', session.user.app_metadata.provider)

  // 2. Check user
  console.log('\n2️⃣ Checking User...')
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ User Error:', userError)
    return { success: false, error: 'Failed to get user' }
  }

  console.log('✅ User authenticated')
  console.log('   User ID:', user.id)
  console.log('   Matches session:', user.id === session.user.id ? '✅' : '❌')

  // 3. Check profile
  console.log('\n3️⃣ Checking Profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('❌ Profile Error:', profileError)
    console.log('   Code:', profileError.code)
    console.log('   Message:', profileError.message)

    if (profileError.code === 'PGRST116') {
      console.log('   👉 Profile doesn\'t exist. Creating one...')
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name || user.user_metadata.name,
          avatar_url: user.user_metadata.avatar_url
        })

      if (insertError) {
        console.error('   ❌ Failed to create profile:', insertError)
      } else {
        console.log('   ✅ Profile created successfully')
      }
    }
  } else {
    console.log('✅ Profile exists')
    console.log('   Email:', profile.email)
    console.log('   Name:', profile.full_name)
  }

  // 4. Test workspace permissions
  console.log('\n4️⃣ Testing Workspace Permissions...')

  // Test SELECT
  console.log('   Testing SELECT permission...')
  const { data: workspaces, error: selectError } = await supabase
    .from('workspaces')
    .select('*')

  if (selectError) {
    console.error('   ❌ SELECT Error:', selectError.code, selectError.message)
    if (selectError.code === '42P17') {
      console.error('   🔥 INFINITE RECURSION DETECTED!')
      console.log('   👉 Run supabase-complete-setup.sql to fix')
    }
  } else {
    console.log('   ✅ SELECT works:', workspaces.length, 'workspaces found')
  }

  // Test INSERT
  console.log('   Testing INSERT permission...')
  const testWorkspaceName = `Test Workspace ${Date.now()}`
  const { data: newWorkspace, error: insertError } = await supabase
    .from('workspaces')
    .insert({
      name: testWorkspaceName,
      description: 'Diagnostic test workspace',
      owner_id: user.id
    })
    .select()
    .single()

  if (insertError) {
    console.error('   ❌ INSERT Error:', insertError.code, insertError.message)

    if (insertError.code === '42501') {
      console.error('   🔥 RLS POLICY BLOCKING INSERT!')
      console.log('   Debugging...')

      // Check if policy exists
      console.log('   Checking policies...')
      const { data: policies } = await supabase.rpc('pg_policies', {}).catch(() => ({ data: null }))
      console.log('   Policies:', policies)

      // Check auth.uid()
      console.log('   Your user ID:', user.id)
      console.log('   Owner ID being sent:', user.id)
      console.log('   Match:', user.id === user.id ? '✅' : '❌')
    }
  } else {
    console.log('   ✅ INSERT works! Created workspace:', newWorkspace.id)

    // Clean up test workspace
    console.log('   Cleaning up test workspace...')
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', newWorkspace.id)

    if (deleteError) {
      console.warn('   ⚠️  Failed to delete test workspace:', deleteError)
    } else {
      console.log('   ✅ Test workspace deleted')
    }
  }

  // 5. Test helper function
  console.log('\n5️⃣ Testing Helper Function...')
  const { data: helperResult, error: helperError } = await supabase.rpc('is_workspace_member', {
    workspace_uuid: '00000000-0000-0000-0000-000000000000',
    user_uuid: user.id
  })

  if (helperError) {
    console.error('   ❌ Helper function error:', helperError.code, helperError.message)
    if (helperError.code === '42883') {
      console.log('   👉 Function doesn\'t exist. Run supabase-complete-setup.sql')
    }
  } else {
    console.log('   ✅ Helper function exists and works')
  }

  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))

  const issues = []
  if (!session) issues.push('Not authenticated')
  if (profileError) issues.push('Profile missing or inaccessible')
  if (selectError?.code === '42P17') issues.push('Infinite recursion in policies')
  if (insertError?.code === '42501') issues.push('RLS blocking inserts')
  if (helperError?.code === '42883') issues.push('Helper function missing')

  if (issues.length === 0) {
    console.log('✅ Everything looks good!')
  } else {
    console.log('❌ Issues found:')
    issues.forEach(issue => console.log('   -', issue))
    console.log('\n👉 Run supabase-complete-setup.sql to fix these issues')
  }

  console.groupEnd()

  return {
    success: issues.length === 0,
    session,
    user,
    profile,
    issues
  }
}

// Auto-run if in development
if (import.meta.env.DEV) {
  (window as any).diagnoseAuth = diagnoseAuth
  console.log('💡 Run diagnoseAuth() in console to check your setup')
}
