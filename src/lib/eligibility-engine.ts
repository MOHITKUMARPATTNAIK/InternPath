import { Internship, UserProfile, EligibilityEvaluation, EligibilityMatchStatus } from '@/types';

/**
 * Strict, explainable eligibility evaluation engine.
 * Separates interest relevance from hard eligibility.
 * Evaluates mandatory academic criteria, CGPA, undergraduate standing, institution restrictions, and documents.
 */
export function evaluateEligibility(
  internship: Internship,
  profile: UserProfile | null
): EligibilityEvaluation {
  // If student profile is missing or minimal
  if (!profile || !profile.academic_background) {
    return {
      status: 'eligibility_unknown',
      score: 10,
      isEligible: false,
      isPotentialMatch: false,
      isNotEligible: false,
      isUnknown: true,
      matchedCriteria: [],
      unconfirmedCriteria: [
        'Complete your student profile (degree, year, CGPA, and discipline) to evaluate verified eligibility.',
      ],
      conflictingCriteria: [],
      interestMatchReason: 'General institutional opportunity.',
      verificationAdvice: 'Check official portal requirements to verify eligibility.',
      profileMissingFields: ['academic_background', 'degree', 'academic_year', 'cgpa'],
    };
  }

  const matchedCriteria: string[] = [];
  const unconfirmedCriteria: string[] = [];
  const conflictingCriteria: string[] = [];
  const profileMissingFields: string[] = [];

  let score = 0;

  // ---------------------------------------------------------------------------
  // 1. Mandatory Academic Discipline Check
  // ---------------------------------------------------------------------------
  if (internship.eligible_disciplines && internship.eligible_disciplines.length > 0) {
    const hasDisciplineMatch = internship.eligible_disciplines.some(
      (disc) =>
        disc.toLowerCase().includes(profile.academic_background.toLowerCase()) ||
        profile.academic_background.toLowerCase().includes(disc.toLowerCase()) ||
        disc.toLowerCase() === 'all disciplines'
    );

    if (hasDisciplineMatch) {
      matchedCriteria.push(`Academic discipline matches (${profile.academic_background})`);
      score += 40;
    } else {
      conflictingCriteria.push(
        `Academic discipline "${profile.academic_background}" is not included under official eligible fields (${internship.eligible_disciplines.join(
          ', '
        )}).`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Degree / Program Check
  // ---------------------------------------------------------------------------
  if (internship.eligible_degrees && internship.eligible_degrees.length > 0) {
    if (!profile.degree || profile.degree.trim() === '') {
      unconfirmedCriteria.push(
        `Requires specific degree: ${internship.eligible_degrees.join(' / ')} (degree not specified in your profile)`
      );
      profileMissingFields.push('degree');
    } else {
      const studentDeg = profile.degree.toLowerCase();
      const degMatch = internship.eligible_degrees.some((reqDeg) => {
        const lowerReq = reqDeg.toLowerCase();
        return studentDeg.includes(lowerReq) || lowerReq.includes(studentDeg);
      });

      if (degMatch) {
        matchedCriteria.push(`Enrolled in eligible degree program (${profile.degree})`);
        score += 20;
      } else {
        conflictingCriteria.push(
          `Requires ${internship.eligible_degrees.join(' or ')} degree, which conflicts with your declared degree (${profile.degree}).`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Undergraduate Year Standing Check
  // ---------------------------------------------------------------------------
  if (internship.eligible_years && internship.eligible_years.length > 0) {
    if (!profile.academic_year) {
      unconfirmedCriteria.push(
        `Requires enrollment in: ${internship.eligible_years.join(', ')} (academic year missing in your profile)`
      );
      profileMissingFields.push('academic_year');
    } else {
      const yearMatches = internship.eligible_years.some((y) =>
        y.toLowerCase().includes(profile.academic_year?.toLowerCase() || '')
      );

      if (yearMatches) {
        matchedCriteria.push(`Academic standing matches (${profile.academic_year})`);
        score += 25;
      } else {
        conflictingCriteria.push(
          `Official eligibility is limited to ${internship.eligible_years.join(
            ', '
          )}, but your profile indicates ${profile.academic_year}.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Minimum CGPA Requirement
  // ---------------------------------------------------------------------------
  if (internship.min_cgpa !== undefined && internship.min_cgpa !== null) {
    if (profile.cgpa === undefined || profile.cgpa === null || isNaN(profile.cgpa)) {
      unconfirmedCriteria.push(
        `Requires minimum CGPA of ${internship.min_cgpa} / ${
          internship.cgpa_scale || 10
        } (CGPA not provided in your profile)`
      );
      profileMissingFields.push('cgpa');
    } else {
      if (profile.cgpa >= internship.min_cgpa) {
        matchedCriteria.push(
          `Your CGPA (${profile.cgpa}) meets or exceeds the minimum required threshold (${internship.min_cgpa})`
        );
        score += 15;
      } else {
        conflictingCriteria.push(
          `Requires minimum CGPA of ${internship.min_cgpa}, but your declared CGPA is ${profile.cgpa}.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Minimum Percentage Requirement (e.g. Class 12 / Degree %)
  // ---------------------------------------------------------------------------
  if (internship.min_percentage !== undefined && internship.min_percentage !== null) {
    if (
      profile.class_12_percentage === undefined ||
      profile.class_12_percentage === null ||
      isNaN(profile.class_12_percentage)
    ) {
      unconfirmedCriteria.push(
        `Requires minimum ${internship.min_percentage}% marks in Class 12 / previous exam (not specified in your profile)`
      );
      profileMissingFields.push('class_12_percentage');
    } else {
      if (profile.class_12_percentage >= internship.min_percentage) {
        matchedCriteria.push(
          `Class 12 marks (${profile.class_12_percentage}%) satisfy the >= ${internship.min_percentage}% requirement`
        );
        score += 10;
      } else {
        conflictingCriteria.push(
          `Requires minimum ${internship.min_percentage}% marks, but your declared score is ${profile.class_12_percentage}%.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Institution Restrictions (e.g. Non-IIT only, Medical College only)
  // ---------------------------------------------------------------------------
  if (internship.institution_restrictions && internship.institution_restrictions.length > 0) {
    for (const restriction of internship.institution_restrictions) {
      if (restriction === 'non_iit_only') {
        if (profile.institution_type === 'iit') {
          conflictingCriteria.push(
            'This fellowship is strictly reserved for students outside IITs (candidates from IITs are not eligible).'
          );
        } else if (!profile.institution_type) {
          unconfirmedCriteria.push(
            'Open strictly to students studying outside IITs (college type not verified in profile)'
          );
          profileMissingFields.push('institution_type');
        } else {
          matchedCriteria.push('Institution type satisfies non-IIT eligibility requirement');
        }
      }

      if (restriction === 'medical_college_only') {
        if (
          profile.institution_type !== 'medical_college' &&
          profile.academic_background !== 'Medical and Healthcare'
        ) {
          conflictingCriteria.push('Must be enrolled in an NMC/MCI recognized medical college.');
        } else {
          matchedCriteria.push('Medical institution affiliation confirmed');
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Citizenship / Residency Check
  // ---------------------------------------------------------------------------
  if (internship.citizenship_required && internship.citizenship_required.length > 0) {
    const studentCitizen = profile.citizenship || 'Indian';
    const isCitizenEligible = internship.citizenship_required.some(
      (c) => c.toLowerCase() === studentCitizen.toLowerCase()
    );

    if (isCitizenEligible) {
      matchedCriteria.push(`Citizenship requirement satisfied (${studentCitizen})`);
    } else {
      conflictingCriteria.push(
        `Requires citizenship of ${internship.citizenship_required.join(
          ', '
        )}, conflicting with ${studentCitizen}.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Mandatory Permissions & Nominations Check
  // ---------------------------------------------------------------------------
  if (internship.requires_noc) {
    unconfirmedCriteria.push(
      'Requires institutional No Objection Certificate (NOC) on official letterhead signed by Head of Institution.'
    );
  }

  if (internship.requires_nomination) {
    unconfirmedCriteria.push(
      'Requires official nomination from college Principal or Dean in prescribed format.'
    );
  }

  // ---------------------------------------------------------------------------
  // 9. Interest & Skills Relevance Evaluation (Separate from Eligibility)
  // ---------------------------------------------------------------------------
  let interestMatchReason = 'Matches your general undergraduate academic background.';

  if (profile.primary_interest) {
    const pInterest = profile.primary_interest.toLowerCase();
    const inTitle = internship.title.toLowerCase().includes(pInterest);
    const inDesc = internship.description.toLowerCase().includes(pInterest);
    const inDept = internship.department?.toLowerCase().includes(pInterest);

    if (inTitle || inDesc || inDept) {
      score += 20;
      interestMatchReason = `Aligns with your primary interest in "${profile.primary_interest}".`;
    }
  }

  if (profile.skills && profile.skills.length > 0 && internship.required_skills) {
    const matchedSkills = internship.required_skills.filter((reqSkill) =>
      profile.skills.some(
        (userSkill) =>
          reqSkill.toLowerCase().includes(userSkill.toLowerCase()) ||
          userSkill.toLowerCase().includes(reqSkill.toLowerCase())
      )
    );

    if (matchedSkills.length > 0) {
      score += Math.min(matchedSkills.length * 10, 25);
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Status Determination & Final Verdict
  // ---------------------------------------------------------------------------
  let status: EligibilityMatchStatus;

  if (conflictingCriteria.length > 0) {
    status = 'not_eligible';
  } else if (profileMissingFields.length > 0) {
    status = 'potential_match';
  } else if (matchedCriteria.length > 0) {
    status = 'eligible';
  } else {
    status = 'eligibility_unknown';
  }

  // Dynamic verification advice
  let verificationAdvice = 'Please review official notification PDF before submitting your application.';
  if (status === 'potential_match') {
    verificationAdvice =
      'You appear relevant for this role, but some mandatory criteria (such as CGPA, college type, or NOC) must be checked against your college records.';
  } else if (status === 'not_eligible') {
    verificationAdvice =
      'Official criteria for this fellowship strictly conflict with your current profile background or degree.';
  } else if (status === 'eligible') {
    verificationAdvice =
      'All declared criteria match. Verify the active portal link and required documents before applying on the official site.';
  }

  return {
    status,
    score,
    isEligible: status === 'eligible',
    isPotentialMatch: status === 'potential_match',
    isNotEligible: status === 'not_eligible',
    isUnknown: status === 'eligibility_unknown',
    matchedCriteria,
    unconfirmedCriteria,
    conflictingCriteria,
    interestMatchReason,
    verificationAdvice,
    profileMissingFields,
  };
}
