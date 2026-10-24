import { createClient } from '@supabase/supabase-js';

async function checkSupabaseStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('============================================================');
  console.log('InternPath - Live Supabase State Diagnostics');
  console.log('============================================================');
  console.log(`Supabase URL configured:       ${Boolean(url && !url.includes('your-project-id'))}`);
  console.log(`Client Anon/Publishable Key:   ${Boolean(anonKey && !anonKey.includes('your-anon-key'))}`);
  console.log(`Service Role Key (Server):     ${Boolean(serviceKey && !serviceKey.includes('your-service-role-key'))}`);

  if (!url || !anonKey || url.includes('your-project-id') || anonKey.includes('your-anon-key')) {
    console.log('\n[INFO] Supabase credentials not found or set to placeholder in .env.local.');
    console.log('Skipping live database query.');
    return;
  }

  const client = createClient(url, anonKey);

  // 1. Check sources table
  console.log('\n--- 1. Querying public.sources table (Public/Anon client) ---');
  const { data: sources, error: sourcesErr } = await client
    .from('sources')
    .select('id, name, source_type, enabled')
    .order('name', { ascending: true });

  if (sourcesErr) {
    console.error(`[Error] Failed to read public.sources: ${sourcesErr.message}`);
  } else {
    console.log(`Successfully connected! Found ${sources?.length || 0} registered source(s):`);
    sources?.forEach((s, idx) => {
      console.log(`  ${idx + 1}. [${s.id}] ${s.name} (${s.source_type}) - enabled: ${s.enabled}`);
    });
  }

  // 2. Check internships table
  console.log('\n--- 2. Querying public.internships table (Public/Anon client) ---');
  const { data: internships, error: internErr } = await client
    .from('internships')
    .select('id, title, organization, publication_status, verification_status')
    .order('title', { ascending: true });

  if (internErr) {
    console.error(`[Error] Failed to read public.internships: ${internErr.message}`);
  } else {
    console.log(`Found ${internships?.length || 0} internship record(s):`);
    internships?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.id}] ${item.title}`);
      console.log(`     Org: ${item.organization} | Status: ${item.publication_status} | Verification: ${item.verification_status}`);
    });
  }

  // 3. Test Service Role Key if configured
  if (serviceKey && !serviceKey.includes('your-service-role-key')) {
    console.log('\n--- 3. Querying with Service Role Admin Client ---');
    try {
      const adminClient = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: adminSources, error: adminErr } = await adminClient
        .from('sources')
        .select('id')
        .limit(1);

      if (adminErr) {
        console.error(`[Error] Service Role query failed: ${adminErr.message}`);
      } else {
        console.log('✓ Service Role Admin Client successfully authenticated with Supabase and queried tables.');
      }
    } catch (e: any) {
      console.error(`[Exception] Service role test failed: ${e.message}`);
    }
  } else {
    console.log('\n[Notice] SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local yet.');
    console.log('Background automated collection runs will require SUPABASE_SERVICE_ROLE_KEY to write to the database under RLS.');
  }

  console.log('\n============================================================\n');
}

checkSupabaseStatus().catch(console.error);
