import {
  IsoCharacteristic,
  VerbalInterpretation,
  IsoEvaluationRow,
  IsoEvaluationSummary,
  CharacteristicStatistic,
  SubCriterionStatistic,
  RoleGroupScore,
  RespondentRole,
} from "@/types/research";

/**
 * Official ISO/IEC 25010 Software Quality Model Characteristics & Indicator Questions
 * Standardized for Philippine Academic Capstone / Thesis Software Quality Evaluation.
 */
export const ISO_25010_CHARACTERISTICS: IsoCharacteristic[] = [
  {
    id: "functional_suitability",
    code: "FS",
    name: "Functional Suitability",
    description: "Degree to which the system provides functions that meet stated and implied needs when used under specified conditions.",
    subCriteria: [
      {
        id: "fs_completeness",
        name: "Functional Completeness",
        question: "The system covers all required capstone defense tasks, including submission, pre-defense review, rubric scoring, digital signing, and certificate generation.",
      },
      {
        id: "fs_correctness",
        name: "Functional Correctness",
        question: "The system provides correct and accurate results, such as dynamic rubric weighted computations and consensus verdicts.",
      },
      {
        id: "fs_appropriateness",
        name: "Functional Appropriateness",
        question: "The functions facilitate the accomplishment of institutional defense evaluation objectives and policy compliance.",
      },
    ],
  },
  {
    id: "performance_efficiency",
    code: "PE",
    name: "Performance Efficiency",
    description: "Performance relative to the amount of resources used under stated conditions.",
    subCriteria: [
      {
        id: "pe_time_behavior",
        name: "Time Behavior",
        question: "The system exhibits rapid response times when loading manuscripts, saving annotations, and verifying cryptographic signatures.",
      },
      {
        id: "pe_resource_utilization",
        name: "Resource Utilization",
        question: "The system consumes reasonable bandwidth and device memory during split-screen review and multi-panelist deliberation.",
      },
    ],
  },
  {
    id: "compatibility",
    code: "CO",
    name: "Compatibility",
    description: "Degree to which the system can exchange information with other systems or products and perform required functions while sharing the same hardware or software environment.",
    subCriteria: [
      {
        id: "co_coexistence",
        name: "Co-existence",
        question: "The system operates effectively across modern web browsers (Chrome, Edge, Firefox, Safari) without conflicting with other institutional software.",
      },
      {
        id: "co_interoperability",
        name: "Interoperability",
        question: "The system seamlessly imports standard PDF documents and exports verifiable certificates, dockets, and audit reports.",
      },
    ],
  },
  {
    id: "usability",
    code: "US",
    name: "Usability",
    description: "Degree to which the system can be used by specified users to achieve specified goals with effectiveness, efficiency, and satisfaction.",
    subCriteria: [
      {
        id: "us_recognizability",
        name: "Appropriateness Recognizability",
        question: "Users can readily comprehend whether the software and specific role-based modules are suitable for their academic responsibilities.",
      },
      {
        id: "us_learnability",
        name: "Learnability",
        question: "The system is easy to learn and master with clear navigation, requiring minimal user training or orientation.",
      },
      {
        id: "us_operability",
        name: "Operability",
        question: "The split-screen document viewer, rubric scoring sliders, and defense calendar are easy to operate and control.",
      },
      {
        id: "us_error_protection",
        name: "User Error Protection",
        question: "The system protects users against operational mistakes through confirmation dialogs, input validation, and role guards.",
      },
      {
        id: "us_aesthetics",
        name: "User Interface Aesthetics",
        question: "The user interface displays a pleasing, professional, and visually consistent layout aligned with university branding.",
      },
    ],
  },
  {
    id: "reliability",
    code: "RE",
    name: "Reliability",
    description: "Degree to which the system performs specified functions under specified conditions for a specified period of time.",
    subCriteria: [
      {
        id: "re_maturity",
        name: "Maturity",
        question: "The system operates consistently with low error frequency during active oral defense proceedings.",
      },
      {
        id: "re_availability",
        name: "Availability",
        question: "The platform is consistently operational and accessible whenever candidates and examination committee members require it.",
      },
      {
        id: "re_fault_tolerance",
        name: "Fault Tolerance",
        question: "The system handles unexpected inputs or network delays gracefully with informative toast feedback rather than application crashes.",
      },
      {
        id: "re_recoverability",
        name: "Recoverability",
        question: "In the event of network interruption, evaluation drafts and annotations are safely retained and restorable.",
      },
    ],
  },
  {
    id: "security",
    code: "SE",
    name: "Security",
    description: "Degree to which the system protects information and data so that persons or other products have the degree of data access appropriate to their types and levels of authorization.",
    subCriteria: [
      {
        id: "se_confidentiality",
        name: "Confidentiality",
        question: "Data is accessible only to authorized institutional roles through strict PostgreSQL Row-Level Security (RLS).",
      },
      {
        id: "se_integrity",
        name: "Integrity",
        question: "Manuscript files are protected against unauthorized modification using cryptographic SHA-256 checksum hashes.",
      },
      {
        id: "se_non_repudiation",
        name: "Non-repudiation",
        question: "Deliberation actions, evaluation submissions, and digital signatures are permanently verifiable in compliance with RA 8792.",
      },
      {
        id: "se_authenticity",
        name: "Authenticity",
        question: "User identity and role credentials (e.g. Panelist, Adviser, Dean) are strictly authenticated before access is permitted.",
      },
    ],
  },
  {
    id: "maintainability",
    code: "MA",
    name: "Maintainability",
    description: "Degree of effectiveness and efficiency with which a product or system can be modified by the intended maintainers.",
    subCriteria: [
      {
        id: "ma_modularity",
        name: "Modularity",
        question: "The system is composed of discrete, decoupled modules (RBAC, Manuscript, Scheduling, Grading, Signatures) that facilitate maintenance.",
      },
      {
        id: "ma_reusability",
        name: "Reusability",
        question: "Components and server actions are structured for reuse across multiple academic colleges and defense stages.",
      },
      {
        id: "ma_analyzability",
        name: "Analyzability",
        question: "Diagnostic tools, audit logs, and health status indicators enable coordinators to quickly diagnose and locate issues.",
      },
      {
        id: "ma_modifiability",
        name: "Modifiability",
        question: "Rubric criteria, scoring weights, and defense stages can be customized and reconfigured without system downtime.",
      },
    ],
  },
  {
    id: "portability",
    code: "PO",
    name: "Portability",
    description: "Degree of effectiveness and efficiency with which a system, product or component can be transferred from one hardware, software or other operational or usage environment to another.",
    subCriteria: [
      {
        id: "po_adaptability",
        name: "Adaptability",
        question: "The responsive interface adapts smoothly across desktop monitors, laptops, and mobile tablet viewing screens.",
      },
      {
        id: "po_installability",
        name: "Installability / Cloud Access",
        question: "The web-based platform requires zero client-side installation, functioning instantly via web browser URL access.",
      },
    ],
  },
];

/**
 * Standard 5-Point Likert Verbal Interpretation Scale used in Philippine Academic Research
 */
export function getVerbalInterpretation(score: number): VerbalInterpretation {
  if (score >= 4.50) return "Highly Acceptable (HA)";
  if (score >= 3.50) return "Acceptable (A)";
  if (score >= 2.50) return "Moderately Acceptable (MA)";
  if (score >= 1.50) return "Slightly Acceptable (SA)";
  return "Not Acceptable (NA)";
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(2));
}

export function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

/**
 * Computes descriptive statistics (Mean, SD, Interpretation) across all ISO 25010 characteristics
 * and produces role-based cross-tabulation for academic Chapter 5 presentation.
 */
export function computeIsoStatistics(
  evaluations: IsoEvaluationRow[],
  currentUserId?: string
): IsoEvaluationSummary {
  if (evaluations.length === 0) {
    return {
      totalRespondents: 0,
      grandMean: 0,
      grandStandardDeviation: 0,
      overallInterpretation: "Not Acceptable (NA)",
      characteristics: ISO_25010_CHARACTERISTICS.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        mean: 0,
        standardDeviation: 0,
        interpretation: "Not Acceptable (NA)",
        subCriteria: c.subCriteria.map((s) => ({
          id: s.id,
          name: s.name,
          question: s.question,
          mean: 0,
          standardDeviation: 0,
          interpretation: "Not Acceptable (NA)",
        })),
      })),
      roleBreakdown: [],
      hasUserEvaluated: false,
      userExistingRating: null,
    };
  }

  const userEval = currentUserId
    ? evaluations.find((e) => e.respondent_id === currentUserId)
    : null;

  // 1. Compute per-characteristic and per-subcriterion statistics
  const characteristicStats: CharacteristicStatistic[] = ISO_25010_CHARACTERISTICS.map((char) => {
    const charScores: number[] = [];

    const subCriteriaStats: SubCriterionStatistic[] = char.subCriteria.map((sub) => {
      const subScores = evaluations
        .map((e) => e.ratings?.[sub.id])
        .filter((val): val is number => typeof val === "number" && val >= 1 && val <= 5);

      const mean = calculateMean(subScores);
      const sd = calculateStandardDeviation(subScores, mean);

      charScores.push(...subScores);

      return {
        id: sub.id,
        name: sub.name,
        question: sub.question,
        mean,
        standardDeviation: sd,
        interpretation: getVerbalInterpretation(mean),
      };
    });

    const charMean = calculateMean(charScores);
    const charSd = calculateStandardDeviation(charScores, charMean);

    return {
      id: char.id,
      code: char.code,
      name: char.name,
      mean: charMean,
      standardDeviation: charSd,
      interpretation: getVerbalInterpretation(charMean),
      subCriteria: subCriteriaStats,
    };
  });

  // 2. Grand Mean & Grand SD across all characteristics
  const allRatings: number[] = [];
  evaluations.forEach((e) => {
    Object.values(e.ratings || {}).forEach((score) => {
      if (typeof score === "number" && score >= 1 && score <= 5) {
        allRatings.push(score);
      }
    });
  });

  const grandMean = calculateMean(allRatings);
  const grandSd = calculateStandardDeviation(allRatings, grandMean);

  // 3. Role Group Breakdown (Cross-tabulation: Students vs Faculty vs Coordinators vs IT Experts)
  const roleGroups: Record<string, { label: string; evals: IsoEvaluationRow[] }> = {
    student: { label: "Student Proponents", evals: [] },
    adviser: { label: "Research Advisers", evals: [] },
    panelist: { label: "Defense Panelists", evals: [] },
    coordinator: { label: "Research Coordinators / Dean", evals: [] },
    it_expert: { label: "IT / Technical Experts", evals: [] },
  };

  evaluations.forEach((e) => {
    const r = e.respondent_role;
    if (r === "student") roleGroups.student.evals.push(e);
    else if (r === "adviser") roleGroups.adviser.evals.push(e);
    else if (r === "panelist") roleGroups.panelist.evals.push(e);
    else if (r === "coordinator" || r === "college_dean") roleGroups.coordinator.evals.push(e);
    else roleGroups.it_expert.evals.push(e);
  });

  const roleBreakdown: RoleGroupScore[] = Object.entries(roleGroups).map(([roleKey, group]) => {
    const scores: number[] = [];
    const charMeans: Record<string, number> = {};

    ISO_25010_CHARACTERISTICS.forEach((char) => {
      const thisCharScores: number[] = [];
      group.evals.forEach((e) => {
        char.subCriteria.forEach((sub) => {
          const val = e.ratings?.[sub.id];
          if (typeof val === "number") thisCharScores.push(val);
        });
      });
      const meanForChar = calculateMean(thisCharScores);
      charMeans[char.id] = meanForChar;
      scores.push(...thisCharScores);
    });

    const mean = calculateMean(scores);
    const sd = calculateStandardDeviation(scores, mean);

    return {
      role: roleKey as RespondentRole,
      roleLabel: group.label,
      respondentCount: group.evals.length,
      mean,
      standardDeviation: sd,
      interpretation: getVerbalInterpretation(mean),
      characteristicMeans: charMeans,
    };
  });

  return {
    totalRespondents: evaluations.length,
    grandMean,
    grandStandardDeviation: grandSd,
    overallInterpretation: getVerbalInterpretation(grandMean),
    characteristics: characteristicStats,
    roleBreakdown,
    hasUserEvaluated: !!userEval,
    userExistingRating: userEval?.ratings || null,
  };
}

/**
 * Generates an academic CSV export formatted for statistical import (SPSS/Excel).
 */
export function exportIsoDataToCsv(evaluations: IsoEvaluationRow[]): string {
  if (evaluations.length === 0) return "";

  const subCriteriaIds: string[] = [];
  ISO_25010_CHARACTERISTICS.forEach((char) => {
    char.subCriteria.forEach((sub) => {
      subCriteriaIds.push(sub.id);
    });
  });

  const headers = ["Respondent_ID", "Role", "Overall_Mean", ...subCriteriaIds, "Submission_Date"];
  const rows = evaluations.map((e) => {
    const ratings = subCriteriaIds.map((id) => e.ratings?.[id] || "");
    const overall = e.overall_score || calculateMean(Object.values(e.ratings || {}));
    return [e.respondent_id, e.respondent_role, overall, ...ratings, e.created_at].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Formats a clean academic Markdown table ready to paste into thesis Chapter 5 (Results and Discussions).
 */
export function exportIsoTableMarkdown(summary: IsoEvaluationSummary): string {
  let md = `### Table: Summary of ISO/IEC 25010 Software Quality Evaluation for AURORA\n\n`;
  md += `| Characteristic / Indicator | Mean (x̄) | Std Dev (SD) | Verbal Interpretation |\n`;
  md += `| :--- | :---: | :---: | :--- |\n`;

  summary.characteristics.forEach((char) => {
    md += `| **${char.code}. ${char.name}** | **${char.mean.toFixed(2)}** | **${char.standardDeviation.toFixed(2)}** | **${char.interpretation}** |\n`;
    char.subCriteria.forEach((sub) => {
      md += `| • ${sub.name} | ${sub.mean.toFixed(2)} | ${sub.standardDeviation.toFixed(2)} | ${sub.interpretation} |\n`;
    });
  });

  md += `| **OVERALL GRAND MEAN** | **${summary.grandMean.toFixed(2)}** | **${summary.grandStandardDeviation.toFixed(2)}** | **${summary.overallInterpretation}** |\n\n`;

  md += `*Scale: 4.50 - 5.00 Highly Acceptable (HA); 3.50 - 4.49 Acceptable (A); 2.50 - 3.49 Moderately Acceptable (MA); 1.50 - 2.49 Slightly Acceptable (SA); 1.00 - 1.49 Not Acceptable (NA)*\n`;

  return md;
}
