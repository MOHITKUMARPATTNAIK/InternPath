/**
 * Test Suite: InternPath Signup-First & Futuristic 3D Authentication Verification
 * Verifies validation schemas, password strength logic, terms requirement, and role safety.
 */

import { signupSchema, signupFormSchema } from '../src/lib/validations';

console.log('============================================================');
console.log('InternPath - Signup-First & Futuristic Auth Test Suite');
console.log('Testing 8 Registration, Validation & Security Guarantees');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 8;

// Test 1: Complete and valid student registration payload
console.log('Test 1: Valid Student Registration Payload...');
const validPayload = {
  displayName: 'Priya Sundaram',
  email: 'priya.s@nitk.edu.in',
  password: 'SecurePassword123!',
  confirmPassword: 'SecurePassword123!',
  agreeTerms: true,
};
const validResult = signupFormSchema.safeParse(validPayload);
if (validResult.success) {
  console.log('  ✓ PASS: 1. Complete valid student payload successfully passes validation');
  passedTests++;
} else {
  console.error('  ✗ FAIL: 1. Valid payload failed:', validResult.error);
}

// Test 2: Password Mismatch Detection
console.log('\nTest 2: Password Confirmation Mismatch Detection...');
const mismatchPayload = {
  ...validPayload,
  confirmPassword: 'DifferentPassword123!',
};
const mismatchResult = signupFormSchema.safeParse(mismatchPayload);
if (!mismatchResult.success) {
  const confirmIssue = mismatchResult.error.issues.find(
    (i) => i.path.includes('confirmPassword') && i.message.includes('Passwords do not match')
  );
  if (confirmIssue) {
    console.log('  ✓ PASS: 2. Password mismatch detected with explicit inline error on confirmPassword');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 2. Mismatch issue not found on confirmPassword:', mismatchResult.error.issues);
  }
} else {
  console.error('  ✗ FAIL: 2. Password mismatch was erroneously allowed');
}

// Test 3: Mandatory Terms of Service & Privacy Acceptance
console.log('\nTest 3: Mandatory Terms and Privacy Policy Acceptance...');
const noTermsPayload = {
  ...validPayload,
  agreeTerms: false,
};
const noTermsResult = signupFormSchema.safeParse(noTermsPayload);
if (!noTermsResult.success) {
  const termsIssue = noTermsResult.error.issues.find((i) => i.path.includes('agreeTerms'));
  if (termsIssue && termsIssue.message.includes('Terms of Service')) {
    console.log('  ✓ PASS: 3. Unchecked terms agreement is strictly rejected with explicit policy requirement');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 3. Terms error message mismatch:', termsIssue);
  }
} else {
  console.error('  ✗ FAIL: 3. Unchecked terms was erroneously allowed');
}

// Test 4: Weak Password Length Rejection (< 6 chars)
console.log('\nTest 4: Minimum Password Length Enforcement...');
const shortPassPayload = {
  ...validPayload,
  password: '123',
  confirmPassword: '123',
};
const shortPassResult = signupFormSchema.safeParse(shortPassPayload);
if (!shortPassResult.success) {
  const passIssue = shortPassResult.error.issues.find(
    (i) => i.path.includes('password') && i.message.includes('at least 6 characters')
  );
  if (passIssue) {
    console.log('  ✓ PASS: 4. Passwords under 6 characters are strictly rejected');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 4. Password length issue mismatch:', passIssue);
  }
} else {
  console.error('  ✗ FAIL: 4. Short password was erroneously allowed');
}

// Test 5: Invalid Email Format Rejection
console.log('\nTest 5: Malformed Email Address Rejection...');
const invalidEmailPayload = {
  ...validPayload,
  email: 'not-an-email',
};
const invalidEmailResult = signupFormSchema.safeParse(invalidEmailPayload);
if (!invalidEmailResult.success) {
  const emailIssue = invalidEmailResult.error.issues.find((i) => i.path.includes('email'));
  if (emailIssue) {
    console.log('  ✓ PASS: 5. Invalid email address format is rejected');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 5. Email error not flagged on email path');
  }
} else {
  console.error('  ✗ FAIL: 5. Invalid email was erroneously allowed');
}

// Test 6: Display Name Validation
console.log('\nTest 6: Display Name Length Validation...');
const shortNamePayload = {
  ...validPayload,
  displayName: 'A',
};
const shortNameResult = signupFormSchema.safeParse(shortNamePayload);
if (!shortNameResult.success) {
  const nameIssue = shortNameResult.error.issues.find((i) => i.path.includes('displayName'));
  if (nameIssue) {
    console.log('  ✓ PASS: 6. Single character name rejected (minimum 2 characters enforced)');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 6. Name issue not found:', nameIssue);
  }
} else {
  console.error('  ✗ FAIL: 6. Short name was erroneously allowed');
}

// Test 7: Backwards Compatibility of Base signupSchema
console.log('\nTest 7: Base signupSchema Backwards Compatibility...');
const basePayload = {
  displayName: 'Rohan Gupta',
  email: 'rohan.g@iitb.ac.in',
  password: 'StrongPassword99!',
};
const baseResult = signupSchema.safeParse(basePayload);
if (baseResult.success) {
  console.log('  ✓ PASS: 7. Legacy 3-field signup payload remains fully valid for backward compatibility');
  passedTests++;
} else {
  console.error('  ✗ FAIL: 7. Base schema failed on standard 3-field payload:', baseResult.error);
}

// Test 8: Privilege Escalation Prevention on Signup
console.log('\nTest 8: Privilege Escalation Prevention during Registration...');
const privilegeExploitPayload = {
  ...validPayload,
  role: 'admin',
  is_admin: true,
};
const parsedExploit = signupFormSchema.safeParse(privilegeExploitPayload);
if (parsedExploit.success) {
  // Strip unknown properties: schema does not expose role in output
  const outputData = parsedExploit.data as any;
  if (outputData.role === undefined && outputData.is_admin === undefined) {
    console.log('  ✓ PASS: 8. Extra administrative role fields are stripped/ignored from client submission');
    passedTests++;
  } else {
    console.error('  ✗ FAIL: 8. Administrative role was retained in parsed data:', outputData);
  }
} else {
  console.error('  ✗ FAIL: 8. Unexpected failure:', parsedExploit.error);
}

console.log('\n============================================================');
console.log(`Auth & Signup Tests Finished: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
