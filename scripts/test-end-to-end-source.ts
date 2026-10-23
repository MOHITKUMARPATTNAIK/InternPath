import { INITIAL_SOURCES, INITIAL_INTERNSHIPS } from '../src/data/seedData';
import { sourceRegistry } from '../src/lib/collection/source-registry';
import { executeSourceCollection } from '../src/lib/collection/pipeline';
import { Internship } from '../src/types';

async function runEndToEndVerification() {
  console.log('====================================================================');
  console.log('InternPath - End-to-End Institutional Source Audit & Trace');
  console.log('====================================================================\n');

  // Select authorized institutional source: IIT Roorkee SPARK
  const source = INITIAL_SOURCES.find((s) => s.id === 'src-iit-roorkee')!;
  console.log('--- 1. SOURCE DETAILS ---');
  console.log(`Source ID:          ${source.id}`);
  console.log(`Institution Name:   ${source.name}`);
  console.log(`Official Domain:    ${source.official_domain}`);
  console.log(`Opportunity URL:    ${source.opportunity_page_url}`);
  console.log(`Monitoring Method:  ${source.monitoring_method}`);
  console.log(`Category:           ${source.source_category} (${source.source_type})\n`);

  const adapter = sourceRegistry.getAdapter(source);
  console.log(`Assigned Adapter:   ${adapter.name} [ID: ${adapter.id}]\n`);

  // Authentic structured opportunity payload representative of IIT Roorkee SPARK
  const institutionalPayload = [
    {
      id: 'spark-summer-2026',
      title: 'SPARK Summer Internship Programme 2026',
      organization: 'Indian Institute of Technology Roorkee',
      department: 'Dean of Resources and Alumni Affairs (DORA)',
      description:
        'SPARK is a premier summer research internship providing undergraduate students an opportunity to work on cutting-edge research projects under IIT Roorkee faculty members.',
      application_url: 'https://spark.iitr.ac.in/apply?cycle=2026&source=portal',
      eligible_disciplines: [
        'Engineering and Technology',
        'Computer Science and IT',
        'Pure Sciences and Research',
      ],
      eligible_degrees: ['B.Tech', 'B.E', 'Integrated M.Tech'],
      eligible_years: ['2nd Year', '3rd Year', '4th Year'],
      min_education_level: 'Undergraduate student',
      stipend_amount: 2500,
      stipend_currency: 'INR',
      stipend_frequency: 'per week',
      stipend_status: 'paid',
      duration: 'Minimum 6 weeks (Summer)',
      application_opening_date: '2026-10-01',
      application_deadline: '2026-12-15',
      min_cgpa: 8.0,
      location: 'Roorkee, Uttarakhand',
      format: 'onsite',
      institution_restrictions: ['open_all'],
      requires_noc: true,
      requires_nomination: false,
    },
  ];

  // 1. Discover candidates
  console.log('--- 2. COLLECTION INVOCATION & SANITIZED RESULT ---');
  const candidates = await adapter.discoverOpportunities(source, {
    mockPayload: institutionalPayload,
  });
  console.log(`Candidates Discovered: ${candidates.length}`);
  console.log('First Candidate Raw Record:');
  console.log(JSON.stringify(candidates[0], null, 2));

  // 2. Normalize candidate
  console.log('\n--- 3. NORMALIZED CANDIDATE RECORD ---');
  const normalized = await adapter.normalizeOpportunity(candidates[0], source);
  console.log(
    JSON.stringify(
      {
        title: normalized.title,
        organization: normalized.organization,
        source_id: normalized.source_id,
        canonical_url: normalized.canonical_url,
        data_fingerprint: normalized.data_fingerprint,
        application_status: normalized.application_status,
        stipend: `${normalized.stipend_currency} ${normalized.stipend_amount} (${normalized.stipend_status})`,
        deadline: normalized.application_deadline,
        opening_date: normalized.application_opening_date,
        min_cgpa: normalized.min_cgpa,
      },
      null,
      2
    )
  );

  // 3. Validation Outcome
  console.log('\n--- 4. VALIDATION OUTCOME ---');
  const validation = await adapter.validateOpportunity(normalized);
  console.log(`Is Valid: ${validation.isValid}`);
  console.log(`Validation Errors:   ${validation.errors.length > 0 ? validation.errors.join(', ') : 'None (Passed)'}`);
  console.log(`Validation Warnings: ${validation.warnings.length > 0 ? validation.warnings.join(', ') : 'None'}`);

  // 4. Deduplication Outcome (Against existing catalog)
  console.log('\n--- 5. DEDUPLICATION OUTCOME ---');
  const catalogCopy: Internship[] = [...INITIAL_INTERNSHIPS];
  const dedup = await adapter.checkDuplicate(normalized, catalogCopy);
  console.log(`Is Duplicate:        ${dedup.isDuplicate}`);
  console.log(`Match Type:          ${dedup.matchType || 'N/A'}`);
  console.log(`Confidence:          ${dedup.confidence}%`);
  console.log(`Matched Record ID:   ${dedup.matchedInternshipId || 'N/A'}`);
  console.log(`Deduplication Reason: ${dedup.reason || 'Distinct new opportunity'}`);

  // 5. Verification Outcome (Mock HTTP 200 on official domain)
  console.log('\n--- 6. VERIFICATION OUTCOME ---');
  const mockFetcher = async (url: string): Promise<Response> => {
    return new Response('OK', { status: 200, statusText: 'OK' });
  };
  const verification = await adapter.verifyOpportunity(normalized, source, {
    fetcher: mockFetcher as any,
  });
  console.log(`Is Authentic Source: ${verification.isAuthenticSource}`);
  console.log(`Is Domain Approved:  ${verification.isDomainApproved}`);
  console.log(`Link Status:         ${verification.linkStatus} (HTTP ${verification.httpStatus})`);
  console.log(`Final Destination:   ${verification.finalUrl || normalized.official_application_url}`);
  console.log(`Verification Notes:  ${verification.verificationNotes}`);

  // 6. Publishing Decision
  console.log('\n--- 7. FINAL PUBLICATION DECISION ---');
  const decision = await adapter.publishOpportunity(
    normalized,
    validation,
    dedup,
    verification
  );
  console.log(`Action:              ${decision.action}`);
  console.log(`Publication Status:  ${decision.publicationStatus}`);
  console.log(`Review Status:       ${decision.reviewStatus}`);
  console.log(`Decision Confidence: ${decision.confidence}%`);
  console.log('Decision Reasons:');
  decision.reasons.forEach((r, idx) => console.log(`  [${idx + 1}] ${r}`));

  console.log('\n====================================================================');
  console.log('End-to-End Institutional Source Audit Complete');
  console.log('====================================================================\n');
}

runEndToEndVerification().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
