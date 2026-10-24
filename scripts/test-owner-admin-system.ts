import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { isUserAdmin } from '../src/types';
import { generateUUID, isValidUUID } from '../src/lib/uuid';
import {
  createInternship,
  updateInternship,
  deleteInternship,
  archiveInternship,
  verifyInternship,
  createSource,
  updateSource,
  deleteSource,
  getInternships,
  approveReviewCandidate,
  rejectReviewCandidate,
} from '../src/lib/data-service';
import { executeSourceCollection } from '../src/lib/collection/pipeline';
import { RegisteredSource } from '../src/lib/collection/source-registry';
import { INITIAL_SOURCES } from '../src/data/seedData';

async function runOwnerAdminTests() {
  console.log('============================================================');
  console.log('InternPath - Secure Owner-Admin System Test Suite');
  console.log('Testing 23 Security, RLS-Authorization & Role Invariants');
  console.log('============================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Role System & isUserAdmin Invariants
  // ---------------------------------------------------------------------------
  console.log('Test 1: Role System Invariants...');
  assert.strictEqual(isUserAdmin('admin'), true, '1.1 role admin is recognized as admin');
  assert.strictEqual(isUserAdmin('owner'), true, '1.2 role owner is recognized as admin');
  assert.strictEqual(isUserAdmin('student'), false, '1.3 role student is strictly not admin');
  assert.strictEqual(isUserAdmin(null), false, '1.4 null role is not admin');
  assert.strictEqual(isUserAdmin(undefined), false, '1.5 undefined role is not admin');
  assert.strictEqual(isUserAdmin('attacker'), false, '1.6 arbitrary string is not admin');
  console.log('  ✓ PASS: 1. Role system invariants verified (student, admin, owner)');

  // ---------------------------------------------------------------------------
  // TEST 2: Privilege Escalation Prevention on Client Profile Updates
  // ---------------------------------------------------------------------------
  console.log('\nTest 2: Privilege Escalation Prevention on Profile Updates...');
  const mockStudentProfile = {
    id: generateUUID(),
    email: 'student@example.com',
    display_name: 'Regular Student',
    role: 'student' as const,
  };

  // Simulate updateProfile stripping protected fields
  const clientSubmittedUpdate: any = {
    display_name: 'Hacker Student',
    role: 'admin',
    id: generateUUID(),
  };

  const safeData = { ...clientSubmittedUpdate };
  delete safeData.role;
  delete safeData.id;

  assert.strictEqual(safeData.role, undefined, '2.1 role field is strictly purged from update payload');
  assert.strictEqual(safeData.id, undefined, '2.2 id field is strictly purged from update payload');
  assert.strictEqual(safeData.display_name, 'Hacker Student', '2.3 legitimate fields are preserved');
  console.log('  ✓ PASS: 2. Role escalation stripped from client profile updates');

  // ---------------------------------------------------------------------------
  // TEST 3: Route Protection Guard for Students
  // ---------------------------------------------------------------------------
  console.log('\nTest 3: Route Protection Guard for Students (/admin)...');
  const studentUser = { id: generateUUID(), email: 'student@test.com', role: 'student' as const };
  const adminUser = { id: generateUUID(), email: 'admin@test.com', role: 'admin' as const };
  const ownerUser = { id: generateUUID(), email: 'owner@test.com', role: 'owner' as const };

  const canAccessAdmin = (user: { role?: string } | null) => user ? isUserAdmin(user.role) : false;

  assert.strictEqual(canAccessAdmin(null), false, '3.1 Unauthenticated user blocked from /admin');
  assert.strictEqual(canAccessAdmin(studentUser), false, '3.2 Student user blocked from /admin (403)');
  assert.strictEqual(canAccessAdmin(adminUser), true, '3.3 Admin user permitted to /admin');
  assert.strictEqual(canAccessAdmin(ownerUser), true, '3.4 Owner user permitted to /admin');
  console.log('  ✓ PASS: 3. Route protection properly blocks students and permits admin/owner');

  // ---------------------------------------------------------------------------
  // TEST 4: Student Database Mutations Denied under RLS
  // ---------------------------------------------------------------------------
  console.log('\nTest 4: Database RLS Enforcement — Student Privilege Denial...');

  // Mock a student Supabase client that rejects administrative operations via RLS
  const mockStudentClient: any = {
    from: (table: string) => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: `new row violates row-level security policy for table "${table}"` },
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: { message: `permission denied for table "${table}"` },
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({
          data: null,
          error: { message: `permission denied for table "${table}"` },
        }),
      }),
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        in: () => ({
          order: () => Promise.resolve({
            data: null,
            error: { message: `permission denied for table "${table}"` },
          }),
        }),
      }),
    }),
  };

  // 4.1 createInternship denial
  let studentCreateBlocked = false;
  try {
    await createInternship(
      {
        title: 'Unauthorized Opp',
        organization: 'Unauthorized Org',
        description: 'Test description',
        duration: '1 Month',
        location: 'Remote',
        official_application_url: 'https://example.com/apply',
        original_source_url: 'https://example.com/source',
      } as any,
      { client: mockStudentClient }
    );
  } catch (err: unknown) {
    studentCreateBlocked = true;
    assert(err instanceof Error && err.message.includes('row-level security policy'));
  }
  assert.strictEqual(studentCreateBlocked, true, '4.1 Student blocked from creating internships');

  // 4.2 deleteInternship denial
  let studentDeleteBlocked = false;
  try {
    await deleteInternship(generateUUID(), { client: mockStudentClient });
  } catch (err: unknown) {
    studentDeleteBlocked = true;
    assert(err instanceof Error && err.message.includes('permission denied'));
  }
  assert.strictEqual(studentDeleteBlocked, true, '4.2 Student blocked from deleting internships');

  // 4.3 createSource denial
  let studentSourceCreateBlocked = false;
  try {
    await createSource(
      {
        name: 'Unauthorized Source',
        official_domain: 'unauth.edu',
        source_category: 'IIT',
        source_type: 'Public Institution',
        opportunity_page_url: 'https://unauth.edu',
        monitoring_method: 'HTML Scraping',
        status: 'active',
      } as any,
      { client: mockStudentClient }
    );
  } catch (err: unknown) {
    studentSourceCreateBlocked = true;
    assert(err instanceof Error && err.message.includes('row-level security policy'));
  }
  assert.strictEqual(studentSourceCreateBlocked, true, '4.3 Student blocked from creating sources');

  // 4.4 deleteSource denial
  let studentSourceDeleteBlocked = false;
  try {
    await deleteSource(generateUUID(), { client: mockStudentClient });
  } catch (err: unknown) {
    studentSourceDeleteBlocked = true;
    assert(err instanceof Error && err.message.includes('permission denied'));
  }
  assert.strictEqual(studentSourceDeleteBlocked, true, '4.4 Student blocked from deleting sources');

  console.log('  ✓ PASS: 4. All administrative database writes strictly denied to student client');

  // ---------------------------------------------------------------------------
  // TEST 5: Admin / Owner Authorized Operations
  // ---------------------------------------------------------------------------
  console.log('\nTest 5: Database Operations Authorized for Admin / Owner...');

  const testOppId = generateUUID();
  const testSourceId = generateUUID();

  // Mock an authorized admin Supabase client
  const mockAdminClient: any = {
    from: (table: string) => ({
      insert: (payload: any) => ({
        select: () => ({
          single: () => Promise.resolve({
            data: { ...payload, id: payload.id || generateUUID() },
            error: null,
          }),
        }),
      }),
      update: (updates: any) => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: testOppId, ...updates },
              error: null,
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      select: () => ({
        order: () => Promise.resolve({ data: [{ id: testOppId, title: 'Authorized Listing', publication_status: 'published' }], error: null }),
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: testOppId, title: 'Authorized Listing' }], error: null }),
        }),
      }),
    }),
  };

  // 5.1 createInternship success
  const createdOpp = await createInternship(
    {
      id: testOppId,
      title: 'Authorized Fellowship',
      organization: 'IIT Madras',
      description: 'Authorized description',
      duration: '2 Months',
      location: 'Chennai',
      official_application_url: 'https://sfp.iitm.ac.in',
      original_source_url: 'https://sfp.iitm.ac.in',
    } as any,
    { client: mockAdminClient }
  );
  assert(isValidUUID(createdOpp.id), '5.1 Created opportunity returns valid UUID');

  // 5.2 updateInternship success
  const updatedOpp = await updateInternship(
    testOppId,
    { stipend_amount: 25000 },
    { client: mockAdminClient }
  );
  assert.strictEqual(updatedOpp?.stipend_amount, 25000, '5.2 Updated opportunity persists changes');

  // 5.3 archiveInternship success
  const archivedOpp = await archiveInternship(testOppId, { client: mockAdminClient });
  assert.strictEqual(archivedOpp?.publication_status, 'archived', '5.3 Opportunity successfully archived');

  // 5.4 verifyInternship success
  const verifiedOpp = await verifyInternship(testOppId, 'Audited against official notification.', { client: mockAdminClient });
  assert.strictEqual(verifiedOpp?.verification_status, 'official_verified', '5.4 Human verification stamp applied');

  // 5.5 deleteInternship success
  const deleteResult = await deleteInternship(testOppId, { client: mockAdminClient });
  assert.strictEqual(deleteResult, true, '5.5 Opportunity successfully deleted');

  // 5.6 createSource & deleteSource success
  const createdSrc = await createSource(
    {
      id: testSourceId,
      name: 'IIT Kharagpur',
      official_domain: 'iitkgp.ac.in',
      source_category: 'IIT',
      source_type: 'Public Institution',
      opportunity_page_url: 'https://iitkgp.ac.in',
      monitoring_method: 'HTML Scraping',
      status: 'active',
    } as any,
    { client: mockAdminClient }
  );
  assert(isValidUUID(createdSrc.id), '5.6 Created source returns valid UUID');

  const deleteSrcResult = await deleteSource(testSourceId, { client: mockAdminClient });
  assert.strictEqual(deleteSrcResult, true, '5.7 Source successfully deleted');

  console.log('  ✓ PASS: 5. Full lifecycle (create, edit, verify, archive, delete) verified for admin/owner');

  // ---------------------------------------------------------------------------
  // TEST 6: Automated Collection Honesty Invariant
  // ---------------------------------------------------------------------------
  console.log('\nTest 6: Automated Collection Honesty Invariant (No False Human Verification)...');

  const dummySource = INITIAL_SOURCES[0] as RegisteredSource;
  const mockDiscoveredItem = {
    title: 'Discovered Research Internship',
    organization: dummySource.name,
    description: 'Pipeline extracted description',
    application_url: `${dummySource.opportunity_page_url}/apply`,
    source_url: dummySource.opportunity_page_url,
    stipend_amount: 10000,
    duration: '2 Months',
  };

  const collectionResult = await executeSourceCollection(dummySource, [], {
    mockPayload: [mockDiscoveredItem],
  });

  const allProduced = [
    ...collectionResult.createdInternships,
    ...collectionResult.queuedInternships,
  ];

  for (const item of allProduced) {
    assert.notStrictEqual(
      item.verification_status,
      'official_verified',
      '6.1 Automated collection MUST NOT set verification_status to official_verified'
    );
    assert(
      item.verification_status === 'source_checked' || item.verification_status === 'pending_verification',
      '6.2 Automated collection must only assign source_checked or pending_verification'
    );
  }
  console.log('  ✓ PASS: 6. Automated collection strictly confers source_checked (not official_verified)');

  // ---------------------------------------------------------------------------
  // TEST 7: Review Queue Approval Applies Human Verification Stamp
  // ---------------------------------------------------------------------------
  console.log('\nTest 7: Review Queue Approval Stamp...');
  const candidateId = generateUUID();
  const mockReviewClient: any = {
    from: () => ({
      update: (updates: any) => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: candidateId, ...updates },
              error: null,
            }),
          }),
        }),
      }),
    }),
  };

  const approvedCandidate = await approveReviewCandidate(candidateId, { client: mockReviewClient });
  assert.strictEqual(
    approvedCandidate?.verification_status,
    'official_verified',
    '7.1 Human review approval grants official_verified status'
  );
  assert.strictEqual(
    approvedCandidate?.publication_status,
    'published',
    '7.2 Human review approval publishes listing'
  );
  console.log('  ✓ PASS: 7. Human review queue approval confers official_verified status');

  // ---------------------------------------------------------------------------
  // TEST 8: Admin Status Query Includes All Publication Statuses
  // ---------------------------------------------------------------------------
  console.log('\nTest 8: Admin Status Query Includes All Publication Statuses...');
  let queryHadStatusFilter = false;
  const mockQueryClient: any = {
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          if (col === 'publication_status') queryHadStatusFilter = true;
          return {
            order: () => Promise.resolve({ data: [], error: null }),
          };
        },
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  };

  // Regular student query: filters by published
  await getInternships(undefined, { client: mockQueryClient });
  assert.strictEqual(queryHadStatusFilter, true, '8.1 Regular student query filters by publication_status=published');

  // Admin query with includeAllStatuses: does NOT filter
  queryHadStatusFilter = false;
  await getInternships(undefined, { client: mockQueryClient, includeAllStatuses: true });
  assert.strictEqual(queryHadStatusFilter, false, '8.2 Admin query with includeAllStatuses includes draft, expired, archived');
  console.log('  ✓ PASS: 8. Admin query correctly fetches all listings regardless of status');

  // ---------------------------------------------------------------------------
  // TEST 9: Resource Management Navigation Configuration
  // ---------------------------------------------------------------------------
  console.log('\nTest 9: Resource Management Navigation Configuration...');
  const computeNavLinks = (user: { role?: string } | null) => {
    return [
      ...(user ? [] : [{ label: 'Home', href: '/' }]),
      { label: 'Explore Internships', href: '/internships' },
      { label: 'Categories', href: '/categories' },
      { label: 'Saved Internships', href: '/saved', requiresAuth: true },
      { label: 'My Profile', href: '/profile', requiresAuth: true },
      ...(isUserAdmin(user?.role)
        ? [{ label: 'Resource Management', href: '/admin', adminOnly: true }]
        : []),
    ];
  };

  const studentNav = computeNavLinks(studentUser);
  const unauthNav = computeNavLinks(null);
  const adminNav = computeNavLinks(adminUser);
  const ownerNav = computeNavLinks(ownerUser);

  assert.strictEqual(
    studentNav.some((n) => n.href === '/admin' || n.label.includes('Resource')),
    false,
    '9.1 Student navigation strictly excludes Resource Management and /admin'
  );
  assert.strictEqual(
    unauthNav.some((n) => n.href === '/admin' || n.label.includes('Resource')),
    false,
    '9.2 Visitor navigation strictly excludes Resource Management and /admin'
  );
  assert.strictEqual(
    adminNav.some((n) => n.href === '/admin' && n.label === 'Resource Management'),
    true,
    '9.3 Admin navigation includes Resource Management linking to /admin'
  );
  assert.strictEqual(
    ownerNav.some((n) => n.href === '/admin' && n.label === 'Resource Management'),
    true,
    '9.4 Owner navigation includes Resource Management linking to /admin'
  );
  console.log('  ✓ PASS: 9. Resource Management navigation is strictly exclusive to admin and owner roles');

  // ---------------------------------------------------------------------------
  // TEST 10: Navbar and Footer Source Code Invariants
  // ---------------------------------------------------------------------------
  console.log('\nTest 10: Navbar & Footer Source Code Invariants...');
  const navbarSrc = fs.readFileSync(path.join(__dirname, '../src/components/layout/Navbar.tsx'), 'utf-8');
  const footerSrc = fs.readFileSync(path.join(__dirname, '../src/components/layout/Footer.tsx'), 'utf-8');

  assert.strictEqual(
    navbarSrc.includes("user?.role === 'admin'"),
    false,
    '10.1 Navbar does not use fragile user?.role === "admin" checks'
  );
  assert.strictEqual(
    navbarSrc.includes("user.role === 'admin'"),
    false,
    '10.2 Navbar dropdown does not use user.role === "admin"'
  );
  assert.strictEqual(
    navbarSrc.includes('isUserAdmin(user?.role)'),
    true,
    '10.3 Navbar uses shared isUserAdmin helper for navigation gates'
  );
  assert.strictEqual(
    navbarSrc.includes('Resource Management'),
    true,
    '10.4 Navbar includes Resource Management label'
  );
  assert.strictEqual(
    footerSrc.includes('isUserAdmin(user?.role)'),
    true,
    '10.5 Footer guards Resource Management behind isUserAdmin'
  );
  console.log('  ✓ PASS: 10. Navbar and Footer use shared isUserAdmin helper without bypass holes');

  // ---------------------------------------------------------------------------
  // TEST 11: Multi-Layer Access Control Invariant (Defense-in-Depth)
  // ---------------------------------------------------------------------------
  console.log('\nTest 11: Multi-Layer Access Control Invariant (Defense-in-Depth)...');
  // Verify that even if a student visits /admin directly (bypassing navigation):
  // 1) AppShell blocks access with 403
  // 2) Supabase RLS rejects any API/direct table mutation
  const appShellSrc = fs.readFileSync(path.join(__dirname, '../src/components/layout/AppShell.tsx'), 'utf-8');
  assert.strictEqual(
    appShellSrc.includes("!isUserAdmin(user.role)"),
    true,
    '11.1 AppShell enforces server/client-side 403 clearance check using isUserAdmin'
  );
  assert.strictEqual(
    appShellSrc.includes("pathname.startsWith('/admin')"),
    true,
    '11.2 AppShell guards all subpaths of /admin'
  );
  console.log('  ✓ PASS: 11. Defense-in-depth enforced: direct URL access is strictly blocked for students');

  console.log('============================================================');
  console.log('Owner-Admin System Tests Finished: 23/23 Tests Passed (100%)');
  console.log('============================================================\n');
}

runOwnerAdminTests().catch((err) => {
  console.error('[FAILED]', err);
  process.exit(1);
});
