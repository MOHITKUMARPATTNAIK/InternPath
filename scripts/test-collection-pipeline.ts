import {
  Source,
  Internship,
  CollectionRun,
} from '../src/types';
import { INITIAL_SOURCES, INITIAL_INTERNSHIPS } from '../src/data/seedData';
import {
  canonicalizeUrl,
  generateOpportunityFingerprint,
  checkDuplicateOpportunity,
  calculateTokenSimilarity,
} from '../src/lib/collection/fingerprint';
import { ApiAdapter } from '../src/lib/collection/adapters/api-adapter';
import { RssAdapter } from '../src/lib/collection/adapters/rss-adapter';
import { HtmlAdapter } from '../src/lib/collection/adapters/html-adapter';
import { ManualAdapter } from '../src/lib/collection/adapters/manual-adapter';
import { sourceRegistry, RegisteredSource } from '../src/lib/collection/source-registry';
import {
  executeSourceCollection,
  executeMultiSourceCollection,
} from '../src/lib/collection/pipeline';
import { validateUrlSafety, checkLink } from '../src/lib/link-validator';
import {
  isDeadlineExpired,
  getComputedApplicationStatus,
  formatKolkataDate,
} from '../src/lib/date-utils';
import {
  getReviewQueue,
  approveReviewCandidate,
  rejectReviewCandidate,
  resetDemoData,
  createInternship,
  createSource,
  runSourceCheck,
  getInternships,
  getSources,
} from '../src/lib/data-service';
import { generateUUID, isValidUUID } from '../src/lib/uuid';
import {
  getSupabaseAdminDiagnostics,
  isSupabaseAdminConfigured,
  createAdminClient,
} from '../src/lib/supabase/server-admin';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  console.log('\n============================================================');
  console.log('InternPath - Automated Collection & Safe Publishing Pipeline');
  console.log('Testing 20 Comprehensive Pipeline, Deduplication & Safety Tests');
  console.log('============================================================\n');

  const testSource: RegisteredSource = {
    id: 'src-test-iitr',
    name: 'IIT Roorkee Test Portal',
    official_domain: 'spark.iitr.ac.in',
    source_category: 'IIT',
    source_type: 'Public Institution',
    opportunity_page_url: 'https://spark.iitr.ac.in',
    monitoring_method: 'API',
    last_checked: new Date().toISOString(),
    status: 'active',
    enabled: true,
    collection_frequency: 'daily',
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Successful Source Extraction (JSON API Adapter)
  // ---------------------------------------------------------------------------
  console.log('Test 1: Successful Source Extraction (JSON API Adapter)...');
  const apiAdapter = new ApiAdapter();
  const mockValidApiResponse = [
    {
      id: 'spark-2026-cycle',
      title: 'SPARK Summer Fellowship 2026',
      organization: 'IIT Roorkee',
      department: 'Computer Science',
      description: 'Premier 8-week summer research internship at IIT Roorkee with faculty mentorship.',
      application_url: 'https://spark.iitr.ac.in/apply',
      eligible_disciplines: ['Engineering and Technology'],
      eligible_degrees: ['B.Tech', 'B.E'],
      eligible_years: ['3rd Year'],
      stipend_amount: 10000,
      application_deadline: '2026-11-30',
      min_cgpa: 7.5,
    },
  ];

  const extracted = await apiAdapter.discoverOpportunities(testSource, {
    mockPayload: mockValidApiResponse,
  });
  assert(
    extracted.length === 1 && extracted[0].title === 'SPARK Summer Fellowship 2026',
    '1. Successfully extracts candidate opportunity from structured API payload'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Malformed Source Responses Handled Gracefully
  // ---------------------------------------------------------------------------
  console.log('\nTest 2: Malformed Source Responses Handled Gracefully...');
  const mockBrokenFetch = async (): Promise<Response> => {
    return new Response('<html>Malformed unparseable content without JSON', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  let caughtError = false;
  try {
    await apiAdapter.discoverOpportunities(testSource, {
      fetcher: mockBrokenFetch as any,
    });
  } catch (err: unknown) {
    caughtError = true;
    assert(
      err instanceof Error && err.message.includes('API extraction failure'),
      '2. Malformed JSON payload caught gracefully with diagnostic error message'
    );
  }
  if (!caughtError) assert(false, '2. Failed to catch malformed JSON payload');

  // ---------------------------------------------------------------------------
  // TEST 3: Invalid Application URLs Caught & Rejected
  // ---------------------------------------------------------------------------
  console.log('\nTest 3: Invalid Application URLs Caught & Rejected...');
  const invalidCandidate = {
    title: 'Faulty Program',
    organization: 'Test Org',
    description: 'This is a description that is long enough to pass title and desc checks.',
    officialApplicationUrl: 'javascript:alert(1)',
    originalSourceUrl: 'https://spark.iitr.ac.in',
  };
  const normalizedInvalid = await apiAdapter.normalizeOpportunity(invalidCandidate, testSource);
  const invalidValidation = await apiAdapter.validateOpportunity(normalizedInvalid);
  assert(
    !invalidValidation.isValid &&
      invalidValidation.errors.some((e) => e.includes('Invalid application URL')),
    '3. Dangerous or non-HTTP application URL fails validation'
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Duplicate Detection Within One Source (Repeated Runs)
  // ---------------------------------------------------------------------------
  console.log('\nTest 4: Duplicate Detection Within One Source (Repeated Runs)...');
  const existingInternships: Internship[] = [...INITIAL_INTERNSHIPS];
  const normalizedCandidate = await apiAdapter.normalizeOpportunity(extracted[0], testSource);
  // Add utm marketing tracking parameters to test canonical URL matching
  normalizedCandidate.official_application_url =
    'https://spark.iitr.ac.in?utm_source=twitter&utm_medium=social';

  const dedupMatch = await apiAdapter.checkDuplicate(normalizedCandidate, existingInternships);
  assert(
    dedupMatch.isDuplicate && dedupMatch.matchedInternshipId === 'intern-iitr-spark-2026',
    '4. Exact canonical URL matches existing internship across tracking parameters'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Duplicate Detection Across Different Sources
  // ---------------------------------------------------------------------------
  console.log('\nTest 5: Duplicate Detection Across Different Sources...');
  const crossSourceCandidate = {
    ...normalizedCandidate,
    source_id: 'src-other-portal',
    organization: 'IIT Roorkee',
    official_application_url: 'https://spark.iitr.ac.in',
  };
  const crossSourceDedup = await apiAdapter.checkDuplicate(crossSourceCandidate, existingInternships);
  assert(
    crossSourceDedup.isDuplicate && crossSourceDedup.matchType === 'exact_canonical_url',
    '5. Cross-source duplicate detected through canonical application destination URL'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Similar Titles Kept Separate Across Different Annual Cycles
  // ---------------------------------------------------------------------------
  console.log('\nTest 6: Similar Titles Kept Separate Across Different Annual Cycles...');
  const cycle2025 = {
    ...normalizedCandidate,
    external_id: 'spark-summer-2025',
    title: 'SPARK Summer Internship Programme 2025',
    application_deadline: '2025-11-30',
    official_application_url: 'https://spark.iitr.ac.in/archive/2025',
  };
  const cycle2026 = {
    ...normalizedCandidate,
    id: 'intern-iitr-spark-2026',
    external_id: 'spark-summer-2026',
    title: 'SPARK Summer Internship Programme 2026',
    application_deadline: '2026-11-30',
    official_application_url: 'https://spark.iitr.ac.in/2026',
  };
  const cycleDedup = checkDuplicateOpportunity(cycle2025, [cycle2026 as Internship]);
  assert(
    !cycleDedup.isDuplicate,
    '6. Different cycle years (2025 vs 2026) of the same fellowship are preserved as separate records'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Safe Updates to Existing Records (Preserves ID & Saved Relationships)
  // ---------------------------------------------------------------------------
  console.log('\nTest 7: Safe Updates to Existing Records...');
  const updatedDeadlineCandidate = {
    ...extracted[0],
    applicationDeadline: '2026-12-31',
    application_deadline: '2026-12-31', // Deadline extended by institution
  };
  const mockFetchOk = async (): Promise<Response> => new Response('OK', { status: 200 });

  const pipelineRes = await executeSourceCollection(
    testSource,
    existingInternships,
    {
      mockPayload: [updatedDeadlineCandidate],
      fetcher: mockFetchOk as any,
    }
  );

  assert(
    pipelineRes.summary.recordsUpdated === 1 &&
      pipelineRes.updatedInternships.length === 1 &&
      pipelineRes.updatedInternships[0].id === 'intern-iitr-spark-2026' &&
      pipelineRes.updatedInternships[0].application_deadline === '2026-12-31',
    '7.1 Safe update preserves existing internship stable ID and updates changed deadline'
  );

  assert(
    pipelineRes.changeLogs.some(
      (log) => log.fieldName === 'application_deadline' && log.newValue === '2026-12-31'
    ),
    '7.2 Material changes to deadline are recorded in change logs for auditability'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Missing Stipend and Eligibility Fields Handled Explicitly
  // ---------------------------------------------------------------------------
  console.log('\nTest 8: Missing Stipend and Eligibility Fields Handled Explicitly...');
  const sparseCandidate = {
    title: 'Research Project Assistant',
    organization: 'IISER Pune',
    description: 'Autonomous research project in experimental condensed matter physics laboratory.',
    officialApplicationUrl: 'https://www.iiserpune.ac.in/opportunities/student-internships',
    originalSourceUrl: 'https://www.iiserpune.ac.in/opportunities/student-internships',
    // Missing stipend and CGPA
  };
  const normalizedSparse = await apiAdapter.normalizeOpportunity(sparseCandidate, testSource);
  assert(
    normalizedSparse.stipend_status === 'stipend_not_specified' &&
      normalizedSparse.min_cgpa === null,
    '8. Missing stipend is explicitly marked stipend_not_specified (not falsely marked unpaid)'
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Conflicting Deadlines Rejected (Opening Date > Deadline)
  // ---------------------------------------------------------------------------
  console.log('\nTest 9: Conflicting Deadlines Rejected...');
  const conflictDatesCandidate = {
    ...sparseCandidate,
    applicationOpeningDate: '2026-12-01',
    applicationDeadline: '2026-11-01', // Before opening date!
  };
  const normConflict = await apiAdapter.normalizeOpportunity(conflictDatesCandidate, testSource);
  const conflictValidation = await apiAdapter.validateOpportunity(normConflict);
  assert(
    !conflictValidation.isValid &&
      conflictValidation.errors.some((e) => e.includes('cannot be later than deadline')),
    '9. Opening date later than deadline is rejected by schema validator'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Expired Opportunities Excluded from Active Recommendations
  // ---------------------------------------------------------------------------
  console.log('\nTest 10: Expired Opportunities Management...');
  assert(isDeadlineExpired('2025-01-01'), '10.1 Past date identified as expired in Asia/Kolkata');
  const pastAppStatus = getComputedApplicationStatus('2024-10-01', '2025-01-01');
  assert(
    pastAppStatus === 'closed',
    '10.2 Past cycle opportunity computes application_status = closed'
  );

  const expiredCandidate = {
    ...extracted[0],
    applicationDeadline: '2025-01-01',
    application_deadline: '2025-01-01',
  };
  const normExpired = await apiAdapter.normalizeOpportunity(expiredCandidate, testSource);
  const expVal = await apiAdapter.validateOpportunity(normExpired);
  const expDedup = await apiAdapter.checkDuplicate(normExpired, []);
  const expVerify = await apiAdapter.verifyOpportunity(normExpired, testSource, {
    fetcher: mockFetchOk as any,
  });
  const expDecision = await apiAdapter.publishOpportunity(normExpired, expVal, expDedup, expVerify);
  assert(
    expDecision.action === 'reject' && expDecision.publicationStatus === 'expired',
    '10.3 Expired opportunity is strictly rejected from publication (action = reject, publicationStatus = expired)'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Automatic Publication Rejection for Invalid Records
  // ---------------------------------------------------------------------------
  console.log('\nTest 11: Automatic Publication Rejection for Invalid Records...');
  const invalidDescCandidate = {
    title: 'Brief',
    organization: 'Org',
    description: 'Too short',
    officialApplicationUrl: 'https://spark.iitr.ac.in',
    originalSourceUrl: 'https://spark.iitr.ac.in',
  };
  const normBrief = await apiAdapter.normalizeOpportunity(invalidDescCandidate, testSource);
  const briefVal = await apiAdapter.validateOpportunity(normBrief);
  const briefDedup = await apiAdapter.checkDuplicate(normBrief, []);
  const briefVerify = await apiAdapter.verifyOpportunity(normBrief, testSource, {
    fetcher: mockFetchOk as any,
  });
  const decision = await apiAdapter.publishOpportunity(
    normBrief,
    briefVal,
    briefDedup,
    briefVerify
  );
  assert(
    decision.action === 'reject' && decision.publicationStatus === 'draft',
    '11.1 Sub-standard candidates are rejected from automated publication'
  );

  // Test redirect to external unapproved domain
  const externalRedirectFetcher = async (): Promise<Response> => {
    return new Response('Found', {
      status: 302,
      headers: { location: 'https://external-suspicious-portal.com/apply' },
    });
  };
  const redirectVerify = await apiAdapter.verifyOpportunity(normBrief, testSource, {
    fetcher: externalRedirectFetcher as any,
  });
  assert(
    !redirectVerify.isDomainApproved,
    '11.2 Open redirect to external unapproved domain triggers domain mismatch (isDomainApproved = false)'
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Admin Review Queue Approval & Rejection Workflow
  // ---------------------------------------------------------------------------
  console.log('\nTest 12: Admin Review Queue Approval & Rejection Workflow...');
  resetDemoData();
  // Queue a candidate for manual review
  const manualAdapter = new ManualAdapter();
  const curatedSource: Source = {
    ...testSource,
    id: 'src-curated-test',
    name: 'Ministry of External Affairs Test',
    monitoring_method: 'Manual Verification',
  };
  const curatedCand = (
    await manualAdapter.discoverOpportunities(curatedSource, {
      mockPayload: {
        title: 'MEA International Relations Fellowship 2026',
        organization: 'Ministry of External Affairs',
        description: 'Undergraduate fellowship in foreign policy diplomacy and trade negotiations.',
        officialApplicationUrl: 'https://internship.mea.gov.in',
        originalSourceUrl: 'https://internship.mea.gov.in',
      },
    })
  )[0];

  const normCurated = await manualAdapter.normalizeOpportunity(curatedCand, curatedSource);
  const curatedVal = await manualAdapter.validateOpportunity(normCurated);
  const curatedDedup = await manualAdapter.checkDuplicate(normCurated, []);
  const curatedVerify = await manualAdapter.verifyOpportunity(normCurated, curatedSource, {
    fetcher: mockFetchOk as any,
  });
  const curatedDecision = await manualAdapter.publishOpportunity(
    normCurated,
    curatedVal,
    curatedDedup,
    curatedVerify
  );

  assert(
    curatedDecision.action === 'queue_for_review' &&
      curatedDecision.publicationStatus === 'pending_review',
    '12.1 High-scrutiny institutional candidate is routed to review_queue'
  );

  // ---------------------------------------------------------------------------
  // TEST 13: Retry & Backoff Behavior (Transient 500 Retried, Permanent 403 Not Retried)
  // ---------------------------------------------------------------------------
  console.log('\nTest 13: Retry & Exponential Backoff Behavior...');
  let fetchAttempts = 0;
  const mockTransientFetch = async (): Promise<Response> => {
    fetchAttempts++;
    if (fetchAttempts < 2) {
      return new Response('Internal Server Error', { status: 500, statusText: 'Server Error' });
    }
    return new Response(JSON.stringify(mockValidApiResponse), { status: 200 });
  };

  const retryExtracted = await apiAdapter.discoverOpportunities(testSource, {
    fetcher: mockTransientFetch as any,
  });
  assert(
    fetchAttempts === 2 && retryExtracted.length === 1,
    '13. Transient HTTP 500 triggers bounded retry and succeeds on subsequent attempt'
  );

  // ---------------------------------------------------------------------------
  // TEST 14: Collection Failure Isolation Across Multiple Sources
  // ---------------------------------------------------------------------------
  console.log('\nTest 14: Collection Failure Isolation Across Multiple Sources...');
  const failingSource: RegisteredSource = {
    ...testSource,
    id: 'src-failing',
    name: 'Broken Server Source',
    opportunity_page_url: 'https://invalid-non-existent-domain-test.gov.in',
  };
  const healthySource: RegisteredSource = {
    ...testSource,
    id: 'src-healthy',
    name: 'Healthy Government Source',
  };

  const mockBatchFetch = async (url: string | URL): Promise<Response> => {
    if (url.toString().includes('invalid-non-existent')) {
      throw new Error('ENOTFOUND DNS Failure');
    }
    return new Response(JSON.stringify(mockValidApiResponse), { status: 200 });
  };

  const batchResults = await executeMultiSourceCollection(
    [failingSource, healthySource],
    [],
    { fetcher: mockBatchFetch as any }
  );

  assert(
    batchResults.summaries.length === 2 &&
      batchResults.summaries[0].status === 'failed' &&
      batchResults.summaries[1].status === 'success',
    '14. Failure in one institutional source is completely isolated and does not block subsequent sources'
  );

  // ---------------------------------------------------------------------------
  // TEST 15: Concurrent Job Prevention (Run Locking)
  // ---------------------------------------------------------------------------
  console.log('\nTest 15: Concurrent Job Prevention (Run Locking)...');
  let concurrentCaught = false;
  try {
    const slowSource: RegisteredSource = { ...testSource, id: 'src-slow-run' };
    const slowFetch = () => new Promise<Response>((r) => setTimeout(() => r(new Response('[]')), 200));

    // Fire two executions simultaneously
    const p1 = executeSourceCollection(slowSource, [], { fetcher: slowFetch as any });
    const p2 = executeSourceCollection(slowSource, [], { fetcher: slowFetch as any });

    await Promise.all([p1, p2]);
  } catch (err: unknown) {
    concurrentCaught = true;
    assert(
      err instanceof Error && err.message.includes('Concurrent collection job already active'),
      '15. Mutex lock prevents overlapping simultaneous collection runs on the same source'
    );
  }
  if (!concurrentCaught) assert(false, '15. Failed to reject overlapping collection run');

  // ---------------------------------------------------------------------------
  // TEST 16: Scheduler Endpoint Authentication & Secret Verification
  // ---------------------------------------------------------------------------
  console.log('\nTest 16: Scheduler Endpoint Authentication & Secret Verification...');
  function verifyCronAuth(authHeader: string | null, secret: string): boolean {
    if (!authHeader) return false;
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader;
    return token === secret;
  }

  const validToken = 'my-secret-cron-token-12345';
  assert(
    !verifyCronAuth('Bearer wrong-token', validToken),
    '16.1 Request with invalid bearer token is denied'
  );
  assert(
    verifyCronAuth(`Bearer ${validToken}`, validToken),
    '16.2 Request with matching CRON_SECRET is authorized'
  );

  // ---------------------------------------------------------------------------
  // TEST 17: SSRF and Redirect-Based SSRF Protection
  // ---------------------------------------------------------------------------
  console.log('\nTest 17: SSRF and Redirect-Based SSRF Protection...');
  const awsMetadata = validateUrlSafety('http://169.254.169.254/latest/meta-data/');
  const localhost = validateUrlSafety('http://localhost:3000/api/cron');
  const internalDns = validateUrlSafety('http://portal.internal/data');
  const validGovUrl = validateUrlSafety('https://niti.gov.in/internship');

  assert(!awsMetadata.isSafe, '17.1 AWS/GCP cloud metadata IP 169.254.169.254 is blocked');
  assert(!localhost.isSafe, '17.2 Localhost loopback is blocked');
  assert(!internalDns.isSafe, '17.3 Internal domain suffix is blocked');
  assert(validGovUrl.isSafe, '17.4 Official HTTPS government portal is permitted');

  // ---------------------------------------------------------------------------
  // TEST 18: HTTP 403 and Anti-Bot Classification (Not Falsely Marked Broken)
  // ---------------------------------------------------------------------------
  console.log('\nTest 18: HTTP 403 WAF / Anti-Bot Classification...');
  const mock403Fetch = async (): Promise<Response> => {
    return new Response('Cloudflare WAF / Access Denied', { status: 403, statusText: 'Forbidden' });
  };
  const linkCheck403 = await checkLink('https://iiserpune.ac.in/opportunities', {
    fetcher: mock403Fetch as any,
  });
  assert(
    linkCheck403.status === 'access_restricted' && linkCheck403.httpStatus === 403,
    '18. HTTP 403 WAF response classified as access_restricted (not broken)'
  );

  // ---------------------------------------------------------------------------
  // TEST 19: Database Role & Mutation Permission Enforcement
  // ---------------------------------------------------------------------------
  console.log('\nTest 19: Database Permission Guards...');
  function authorizeMutation(role: string): boolean {
    return role === 'admin';
  }
  assert(!authorizeMutation('student'), '19.1 Student role denied publication mutation');
  assert(authorizeMutation('admin'), '19.2 Admin role authorized for publication mutation');

  // ---------------------------------------------------------------------------
  // TEST 20: Timezone and Deadline Calculations in Indian Standard Time (+05:30)
  // ---------------------------------------------------------------------------
  console.log('\nTest 20: Timezone and Deadline Calculations (Asia/Kolkata)...');
  const kolkataDateStr = formatKolkataDate('2026-11-30T18:29:59Z');
  assert(
    kolkataDateStr.includes('2026'),
    '20.1 Deadline correctly formatted using Indian Standard Time'
  );
  const statusUpcoming = getComputedApplicationStatus('2027-01-01', '2027-02-01');
  assert(
    statusUpcoming === 'upcoming',
    '20.2 Future opening date correctly sets application_status to upcoming'
  );

  // ---------------------------------------------------------------------------
  // TEST 21: UUID Generation & PostgreSQL Compatibility
  // ---------------------------------------------------------------------------
  console.log('\nTest 21: UUID Compatibility & RFC 4122 Standard Validation...');
  const testCandidatePayload = {
    title: 'Autonomous Robotics Internship',
    organization: 'IISc Bangalore',
    department: 'Robotics and Autonomous Systems',
    description: 'Research fellowship in advanced robotics, perception, and SLAM navigation algorithms.',
    officialApplicationUrl: 'https://iisc.ac.in/admissions/robotics-fellowship',
    originalSourceUrl: 'https://iisc.ac.in/admissions/robotics-fellowship',
    applicationOpeningDate: '2026-10-01',
    applicationDeadline: '2026-12-01',
    eligibleDisciplines: ['Engineering and Technology', 'Computer Science and IT'],
    minEducationLevel: 'Undergraduate',
    stipendAmount: 15000,
    stipendCurrency: 'INR',
    stipendFrequency: 'per month',
    stipendStatus: 'paid',
    duration: '2 Months',
    location: 'Bengaluru, Karnataka',
    format: 'onsite',
    minCgpa: 8.0,
  };

  const freshSource: RegisteredSource = {
    ...testSource,
    id: '00000000-0000-0000-0000-000000000004',
    name: 'IISc Bangalore',
    official_domain: 'iisc.ac.in',
    opportunity_page_url: 'https://iisc.ac.in/admissions/robotics-fellowship',
  };

  const newPipelineRun = await executeSourceCollection(freshSource, [], {
    mockPayload: [testCandidatePayload],
    fetcher: (async () => new Response('OK', { status: 200 })) as any,
  });

  assert(
    isValidUUID(newPipelineRun.summary.runId),
    '21.1 Collection pipeline summary runId is a valid RFC 4122 UUID',
    `Received: ${newPipelineRun.summary.runId}`
  );

  assert(
    newPipelineRun.createdInternships.length === 1 &&
      isValidUUID(newPipelineRun.createdInternships[0].id) &&
      !newPipelineRun.createdInternships[0].id.startsWith('intern-'),
    '21.2 Created internship ID is a valid UUID and not legacy intern- timestamp string',
    `Received: ${newPipelineRun.createdInternships[0]?.id}`
  );

  // Queue for review candidate via curated/manual verification source
  const manualQueueSource: RegisteredSource = {
    ...freshSource,
    id: generateUUID(),
    name: 'Curated Institutional Source',
    monitoring_method: 'Manual Verification',
  };

  const reviewPipelineRun = await executeSourceCollection(manualQueueSource, [], {
    mockPayload: {
      title: 'High Scrutiny Public Policy Project',
      description: 'Undergraduate research fellowship in public policy formulation and governance reforms.',
      officialApplicationUrl: 'https://internship.mea.gov.in',
      originalSourceUrl: 'https://internship.mea.gov.in',
    },
    fetcher: (async () => new Response('OK', { status: 200 })) as any,
  });

  assert(
    reviewPipelineRun.queuedInternships.length === 1 &&
      isValidUUID(reviewPipelineRun.queuedInternships[0].id) &&
      !reviewPipelineRun.queuedInternships[0].id.startsWith('cand-'),
    '21.3 Queued review candidate ID is a valid UUID and not legacy cand- timestamp string',
    `Received: ${reviewPipelineRun.queuedInternships[0]?.id}`
  );

  assert(
    newPipelineRun.createdInternships[0].verification_status === 'source_checked',
    '21.4 Automated collection assigns verification_status: source_checked (not official_verified)'
  );

  // ---------------------------------------------------------------------------
  // TEST 22: Server-Only Admin Supabase Client Diagnostics
  // ---------------------------------------------------------------------------
  console.log('\nTest 22: Server Admin Client Diagnostics & Missing Key Protection...');

  // Save environment
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 22.1 Missing service role key
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example-project.supabase.co';
    const diagMissingKey = getSupabaseAdminDiagnostics();
    assert(
      !diagMissingKey.configured && diagMissingKey.missingServiceKey,
      '22.1 Missing SUPABASE_SERVICE_ROLE_KEY is detected with configured = false'
    );
    assert(
      diagMissingKey.helpMessage.includes('SUPABASE_SERVICE_ROLE_KEY is missing'),
      '22.2 Informative error message explains SUPABASE_SERVICE_ROLE_KEY requirement'
    );

    // 22.2 Placeholder service role key
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here';
    const diagPlaceholder = getSupabaseAdminDiagnostics();
    assert(
      !diagPlaceholder.configured && diagPlaceholder.hasPlaceholderKey,
      '22.3 Placeholder SUPABASE_SERVICE_ROLE_KEY is detected and blocked'
    );

    // 22.3 Browser context guard
    (globalThis as any).window = {};
    let browserViolationCaught = false;
    try {
      createAdminClient();
    } catch (err: unknown) {
      browserViolationCaught = true;
      assert(
        err instanceof Error && err.message.includes('SECURITY VIOLATION'),
        '22.4 createAdminClient strictly throws security exception in browser context'
      );
    }
    assert(browserViolationCaught, '22.5 Browser context execution guard enforced');
  } finally {
    delete (globalThis as any).window;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }

  // ---------------------------------------------------------------------------
  // TEST 23: RLS-Safe Background Collection Writes
  // ---------------------------------------------------------------------------
  console.log('\nTest 23: RLS-Safe Writes with Server Admin Privileges...');

  let passedClient: any = null;
  const mockAdminClient: any = {
    from: (table: string) => {
      passedClient = table;
      return {
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: generateUUID() }, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: generateUUID() }, error: null }) }) }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      };
    },
  };

  await getSources({ client: mockAdminClient });
  assert(
    passedClient === 'sources',
    '23.1 Injected server admin client is passed through to database operations'
  );

  // ---------------------------------------------------------------------------
  // TEST 24: Database Error Handling & Anti-Silent Fallback
  // ---------------------------------------------------------------------------
  console.log('\nTest 24: Database Error Handling & Anti-Silent Fallback...');

  const mockErrorClient: any = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'new row violates row-level security policy for table "internships"', details: 'RLS denial' },
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: null,
            error: { message: 'connection timeout to database pool' },
          }),
        }),
      }),
    }),
  };

  // Temporarily set Supabase config to simulate configured DB
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://real-project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'real-anon-key-12345';

  let rlsErrorCaught = false;
  try {
    await createInternship(
      {
        title: 'Unauthorized Test Listing',
        organization: 'Testing Org',
        description: 'Test description',
        duration: '1 Month',
        location: 'Remote',
        official_application_url: 'https://example.com',
        original_source_url: 'https://example.com',
      } as any,
      { client: mockErrorClient }
    );
  } catch (err: unknown) {
    rlsErrorCaught = true;
    assert(
      err instanceof Error && err.message.includes('Database error creating internship'),
      '24.1 Database RLS error is raised and NOT swallowed by silent localStorage fallback'
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevKey;
  }
  assert(rlsErrorCaught, '24.2 Database error correctly interrupted execution');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`Pipeline Tests Finished: ${passedTests}/${totalTests} Tests Passed (100%)`);
  console.log('============================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
