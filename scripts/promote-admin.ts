import { createAdminClient, getSupabaseAdminDiagnostics } from '../src/lib/supabase/server-admin';

async function main() {
  const emailArg = process.argv[2];
  const roleArg = (process.argv[3] || 'owner').toLowerCase();

  console.log('============================================================');
  console.log('InternPath - Initial Owner-Admin Account Promotion CLI');
  console.log('============================================================\n');

  if (!emailArg || emailArg.trim() === '') {
    console.error('Usage:');
    console.error('  npx tsx --env-file=.env.local scripts/promote-admin.ts <registered-email> [owner|admin]\n');
    console.error('Example:');
    console.error('  npx tsx --env-file=.env.local scripts/promote-admin.ts myemail@gmail.com owner\n');
    process.exit(1);
  }

  const targetEmail = emailArg.trim().toLowerCase();
  const targetRole = roleArg === 'admin' ? 'admin' : 'owner';

  // 1. Check Server Admin Diagnostics
  const diag = getSupabaseAdminDiagnostics();
  if (!diag.configured) {
    console.error('[Error] Supabase Server Admin client is not configured.');
    console.error(`Reason: ${diag.helpMessage}`);
    console.error('\nAlternative: You can promote your account directly in the Supabase SQL Editor:');
    console.error('Open Supabase Dashboard -> SQL Editor -> Run "supabase/promote_initial_admin.sql" with your email.\n');
    process.exit(1);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    console.error('[Error] Unable to initialize Supabase admin client. Please verify your environment configuration.');
    process.exit(1);
  }

  // 2. Query auth.users to find the account
  console.log(`Searching for registered account: ${targetEmail}...`);
  const { data: usersData, error: userLookupErr } = await adminClient.auth.admin.listUsers();

  if (userLookupErr) {
    console.error(`[Error] Failed to query auth users: ${userLookupErr.message}`);
    process.exit(1);
  }

  const matchedUser = usersData.users.find(
    (u) => (u.email || '').toLowerCase() === targetEmail
  );

  if (!matchedUser) {
    console.error(`\n[Error] No registered user found with email: ${targetEmail}`);
    console.error('Please register your account first on InternPath at /auth/signup, then run this command.\n');
    process.exit(1);
  }

  console.log(`✓ Found user ID: ${matchedUser.id}`);

  // 3. Update public.profiles role
  const { data: updatedProfile, error: updateErr } = await adminClient
    .from('profiles')
    .update({
      role: targetRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchedUser.id)
    .select('id, email, display_name, role, updated_at')
    .single();

  if (updateErr) {
    // If profile didn't exist, insert it
    const { data: insertedProfile, error: insertErr } = await adminClient
      .from('profiles')
      .insert({
        id: matchedUser.id,
        email: targetEmail,
        display_name: matchedUser.user_metadata?.display_name || targetEmail.split('@')[0],
        role: targetRole,
      })
      .select('id, email, display_name, role, updated_at')
      .single();

    if (insertErr) {
      console.error(`[Error] Failed to assign role: ${insertErr.message}`);
      process.exit(1);
    }

    console.log(`\n✓ SUCCESS: User ${insertedProfile.email} has been promoted to ${insertedProfile.role.toUpperCase()}!`);
  } else {
    console.log(`\n✓ SUCCESS: User ${updatedProfile.email} has been promoted to ${updatedProfile.role.toUpperCase()}!`);
  }

  console.log('You can now log in at http://localhost:3000/auth/login and access http://localhost:3000/admin with full privileges.');
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('[Exception]', err);
  process.exit(1);
});
