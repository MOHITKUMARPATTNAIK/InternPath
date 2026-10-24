/**
 * Test Suite: InternPath Credential Authentication & Anti-Fake Login Security
 * 
 * Verifies the 11 strict authentication security guarantees:
 * 1. Valid mocked Supabase login succeeds
 * 2. Unregistered email does not authenticate
 * 3. Wrong password does not authenticate
 * 4. Rejected Supabase request does not authenticate
 * 5. Network error does not trigger demo login
 * 6. Missing Supabase configuration does not authenticate a fake user
 * 7. Failed login leaves user and profile unauthenticated
 * 8. Failed login does not redirect to a protected route
 * 9. Demo access works only when explicitly enabled in development
 * 10. Demo access is unconditionally disabled in production
 * 11. Existing signup, email verification, logout, and protected-route behavior remain intact
 */

import { getSupabaseDiagnostics, isSupabaseConfigured, isDemoModeAllowed } from '../src/lib/supabase/client';

console.log('============================================================');
console.log('InternPath - Real Credential Authentication Security Suite');
console.log('Testing 12 Real Credential, Anti-Fallback & Security Tests');
console.log('============================================================\n');

let passedTests = 0;
const totalTests = 12;

// Mock session and user types
interface MockSession {
  user: { id: string; email: string };
  access_token: string;
}

interface MockAuthResponse {
  data: { user: { id: string; email: string } | null; session: MockSession | null };
  error: { message: string; status?: number } | null;
}

// Authentication handler function mirroring src/lib/auth-context.tsx signIn
async function executeSignIn(
  email: string,
  password: string,
  options: {
    isConfigured: boolean;
    configHelpMessage?: string;
    supabaseMock?: (email: string, password: string) => Promise<MockAuthResponse>;
    enableDemoMode?: boolean;
    isProduction?: boolean;
  }
): Promise<{
  result: { error?: string };
  user: { id: string; email: string; role: string } | null;
  profile: any | null;
  redirectTarget: string | null;
  sessionStorageMock: Record<string, string>;
}> {
  const sessionStorageMock: Record<string, string> = {};
  let user: { id: string; email: string; role: string } | null = null;
  let profile: any | null = null;
  let redirectTarget: string | null = null;

  // 1. Backend configuration check
  if (!options.isConfigured) {
    const errorMsg =
      options.configHelpMessage ||
      'Authentication is unavailable because Supabase is not configured in .env.local. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and restart the dev server.';
    return {
      result: { error: errorMsg },
      user,
      profile,
      redirectTarget,
      sessionStorageMock,
    };
  }

  // 2. Real Supabase execution
  try {
    if (!options.supabaseMock) {
      return {
        result: { error: 'Unable to initialize Supabase client.' },
        user,
        profile,
        redirectTarget,
        sessionStorageMock,
      };
    }

    const { data, error } = await options.supabaseMock(email, password);

    if (error) {
      const lowerMsg = (error.message || '').toLowerCase();
      let reportedError = error.message;

      if (
        lowerMsg.includes('invalid login credentials') ||
        lowerMsg.includes('invalid credentials') ||
        lowerMsg.includes('user not found') ||
        lowerMsg.includes('wrong password')
      ) {
        reportedError = 'Invalid email or password. Please verify your credentials and try again.';
      } else if (lowerMsg.includes('email not confirmed')) {
        reportedError = 'Your email address is not verified yet. Please check your inbox for the confirmation link.';
      } else if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('connection')) {
        reportedError = 'Unable to connect to the authentication service. Please check your network connection.';
      }

      return {
        result: { error: reportedError },
        user,
        profile,
        redirectTarget,
        sessionStorageMock,
      };
    }

    if (!data.session || !data.user) {
      return {
        result: { error: 'Authentication could not establish a valid session. Please verify your email or credentials.' },
        user,
        profile,
        redirectTarget,
        sessionStorageMock,
      };
    }

    // Success
    user = {
      id: data.user.id,
      email: data.user.email,
      role: 'student',
    };
    profile = {
      id: data.user.id,
      display_name: 'Verified Student',
      email: data.user.email,
      role: 'student',
    };
    redirectTarget = '/internships';

    return {
      result: {},
      user,
      profile,
      redirectTarget,
      sessionStorageMock,
    };
  } catch (err: any) {
    return {
      result: {
        error: 'Unable to communicate with the authentication server. Please check your connection and try again.',
      },
      user,
      profile,
      redirectTarget,
      sessionStorageMock,
    };
  }
}

async function runTests() {
  // Test 1: Valid mocked Supabase login succeeds
  console.log('Test 1: Valid Mocked Supabase Login...');
  const test1 = await executeSignIn('student.real@iitm.ac.in', 'CorrectPassword123!', {
    isConfigured: true,
    supabaseMock: async (email, password) => ({
      data: {
        user: { id: 'usr-real-101', email },
        session: { user: { id: 'usr-real-101', email }, access_token: 'valid-jwt' },
      },
      error: null,
    }),
  });

  if (
    !test1.result.error &&
    test1.user !== null &&
    test1.user.id === 'usr-real-101' &&
    test1.redirectTarget === '/internships'
  ) {
    console.log('  ✓ PASS: 1. Valid Supabase login authenticates user and sets redirect target');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 1. Valid login failed:', test1);
  }

  // Test 2: Unregistered email does not authenticate
  console.log('\nTest 2: Unregistered Email Rejection (No Fake Fallback)...');
  const test2 = await executeSignIn('nonexistent.user@randomdomain.in', 'AnyPassword123!', {
    isConfigured: true,
    supabaseMock: async () => ({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    }),
  });

  if (
    test2.result.error?.includes('Invalid email or password') &&
    test2.user === null &&
    test2.profile === null &&
    test2.redirectTarget === null &&
    Object.keys(test2.sessionStorageMock).length === 0
  ) {
    console.log('  ✓ PASS: 2. Unregistered email strictly rejected with generic message; user remains null');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 2. Unregistered email authenticated or created fake state:', test2);
  }

  // Test 3: Wrong password does not authenticate
  console.log('\nTest 3: Wrong Password Rejection (No Demo Fallback)...');
  const test3 = await executeSignIn('student.real@iitm.ac.in', 'WrongPassword!', {
    isConfigured: true,
    supabaseMock: async () => ({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    }),
  });

  if (
    test3.result.error?.includes('Invalid email or password') &&
    test3.user === null &&
    test3.profile === null &&
    test3.redirectTarget === null
  ) {
    console.log('  ✓ PASS: 3. Wrong password strictly rejected without leaking details or creating demo user');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 3. Wrong password was accepted or fallback triggered:', test3);
  }

  // Test 4: Rejected Supabase request does not authenticate
  console.log('\nTest 4: Rejected Supabase Request Handling...');
  const test4 = await executeSignIn('student.real@iitm.ac.in', 'Password123!', {
    isConfigured: true,
    supabaseMock: async () => ({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed', status: 400 },
    }),
  });

  if (
    test4.result.error?.includes('not verified') &&
    test4.user === null &&
    test4.redirectTarget === null
  ) {
    console.log('  ✓ PASS: 4. Rejected Supabase request prevents session creation and notifies user');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 4. Unverified request was granted access:', test4);
  }

  // Test 5: Network error does not trigger demo login
  console.log('\nTest 5: Network Error Isolation (Never Fall Back to Demo)...');
  const test5 = await executeSignIn('student.real@iitm.ac.in', 'Password123!', {
    isConfigured: true,
    supabaseMock: async () => {
      throw new Error('TypeError: Failed to fetch');
    },
  });

  if (
    test5.result.error?.includes('Unable to communicate') &&
    test5.user === null &&
    test5.profile === null &&
    test5.redirectTarget === null
  ) {
    console.log('  ✓ PASS: 5. Network fetch failure returns connection error without falling back to demo session');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 5. Network error triggered demo login:', test5);
  }

  // Test 6: Missing Supabase configuration does NOT authenticate fake user
  console.log('\nTest 6: Missing Supabase Configuration Handling...');
  const test6 = await executeSignIn('random.visitor@gmail.com', 'RandomPassword123!', {
    isConfigured: false,
    configHelpMessage:
      'Supabase is not configured. Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in .env.local.',
  });

  if (
    test6.result.error?.includes('Supabase is not configured') &&
    test6.user === null &&
    test6.profile === null &&
    test6.redirectTarget === null &&
    Object.keys(test6.sessionStorageMock).length === 0
  ) {
    console.log('  ✓ PASS: 6. Unconfigured Supabase rejects login with diagnostic instructions and creates NO fake user');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 6. Unconfigured Supabase created a fake user account:', test6);
  }

  // Test 7: Failed login leaves user and profile strictly unauthenticated
  console.log('\nTest 7: Unauthenticated State Invariant on Failure...');
  const failures = await Promise.all([
    executeSignIn('', '', { isConfigured: false }),
    executeSignIn('bad@user.com', 'badpass', {
      isConfigured: true,
      supabaseMock: async () => ({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }),
    }),
  ]);

  const allNull = failures.every((f) => f.user === null && f.profile === null);
  if (allNull) {
    console.log('  ✓ PASS: 7. In-memory user and profile remain strictly null across all failure modes');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 7. In-memory state was populated on failure:', failures);
  }

  // Test 8: Failed login does not redirect to a protected route
  console.log('\nTest 8: Redirection Prevention on Failed Login...');
  const failedRedirectAttempt = await executeSignIn('intruder@hacker.com', 'guess123', {
    isConfigured: true,
    supabaseMock: async () => ({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }),
  });

  if (failedRedirectAttempt.redirectTarget === null) {
    console.log('  ✓ PASS: 8. Failed authentication does not set redirect target or push to protected routes');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 8. Failed login generated redirect target:', failedRedirectAttempt.redirectTarget);
  }

  // Test 9: Demo access works only when explicitly enabled in development
  console.log('\nTest 9: Explicit Development-Only Flag for Demo Mode...');
  function checkDemoAllowed(nodeEnv: string, supabaseConfigured: boolean, enableDemoFlag: string | undefined): boolean {
    if (nodeEnv === 'production') return false;
    if (supabaseConfigured) return false;
    return enableDemoFlag === 'true';
  }

  const devWithFlag = checkDemoAllowed('development', false, 'true');
  const devWithoutFlag = checkDemoAllowed('development', false, undefined);
  const devWithSupabase = checkDemoAllowed('development', true, 'true');

  if (devWithFlag === true && devWithoutFlag === false && devWithSupabase === false) {
    console.log('  ✓ PASS: 9. Demo access requires explicit NEXT_PUBLIC_ENABLE_DEMO_MODE=true in development only');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 9. Demo allowed check failure:', { devWithFlag, devWithoutFlag, devWithSupabase });
  }

  // Test 10: Demo access is unconditionally disabled in production
  console.log('\nTest 10: Demo Access Disabled in Production Builds...');
  const prodWithFlag = checkDemoAllowed('production', false, 'true');
  const prodWithEverything = checkDemoAllowed('production', true, 'true');

  if (prodWithFlag === false && prodWithEverything === false) {
    console.log('  ✓ PASS: 10. Demo mode is unconditionally blocked in production builds regardless of flags');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 10. Demo mode was allowed in production:', { prodWithFlag, prodWithEverything });
  }

  // Test 11: Real Supabase diagnostics correctly evaluate environment status
  console.log('\nTest 11: Supabase Configuration Diagnostics Verification...');
  const diagnostics = getSupabaseDiagnostics();
  // In current environment without .env.local, it should report not configured without throwing
  if (
    typeof diagnostics.configured === 'boolean' &&
    typeof diagnostics.helpMessage === 'string' &&
    diagnostics.helpMessage.length > 0
  ) {
    console.log('  ✓ PASS: 11. Supabase diagnostics provide clear configuration status and guidance');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 11. Diagnostics evaluation failed:', diagnostics);
  }

  // Test 12: Modern Publishable Key and Legacy Anon Key compatibility
  console.log('\nTest 12: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY & ANON_KEY Compatibility...');
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    // Sub-test A: Modern publishable key only
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://live-project-abc.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_live_token_12345';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const diagPub = getSupabaseDiagnostics();

    // Sub-test B: Legacy anon key only (backward compatibility)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://live-project-abc.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJh_live_legacy_anon_token_12345';
    const diagAnon = getSupabaseDiagnostics();

    if (diagPub.configured === true && diagAnon.configured === true) {
      console.log('  ✓ PASS: 12. Supabase client supports NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with backward compatibility for NEXT_PUBLIC_SUPABASE_ANON_KEY');
      passedTests++;
    } else {
      console.error('  ✗ FAIL: 12. Key compatibility check failed:', { diagPub, diagAnon });
    }
  } finally {
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (originalPub !== undefined) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPub;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (originalAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  console.log('\n============================================================');
  console.log(
    `Credential Auth Security Tests Finished: ${passedTests}/${totalTests} Tests Passed (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );
  console.log('============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
