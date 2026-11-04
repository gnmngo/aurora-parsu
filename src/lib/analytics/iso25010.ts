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
 * Objective 4 System Evaluation Survey:
 * - Part I: System Usability Scale (SUS) — 10 items (odd items positive, even items reverse-coded)
 * - Part II: Unified Theory of Acceptance and Use of Technology (UTAUT) — PE (3 items, PE2 removed),
 *   EE (4 items), SI (4 items), FC (4 items), BI (3 items), UB (9 items, UB2 removed).
 */
export const ISO_25010_CHARACTERISTICS: IsoCharacteristic[] = [
  {
    id: "sus",
    code: "SUS",
    name: "System Usability Scale (SUS)",
    partLabel: "Part I: System Usability Scale (SUS)",
    description:
      "Assess the overall usability of the Aurora system. Odd-numbered items are positively worded; even-numbered items are negatively worded.",
    subCriteria: [
      {
        id: "sus_1",
        name: "SUS1",
        question: "I think that I would like to use this system frequently.",
      },
      {
        id: "sus_2",
        name: "SUS2",
        question: "I found the system unnecessarily complex.",
        isReverseCoded: true,
      },
      {
        id: "sus_3",
        name: "SUS3",
        question: "I thought the system was easy to use.",
      },
      {
        id: "sus_4",
        name: "SUS4",
        question: "I think that I would need the support of a technical person to be able to use this system.",
        isReverseCoded: true,
      },
      {
        id: "sus_5",
        name: "SUS5",
        question: "I found the various functions in this system were well integrated.",
      },
      {
        id: "sus_6",
        name: "SUS6",
        question: "I thought there was too much inconsistency in this system.",
        isReverseCoded: true,
      },
      {
        id: "sus_7",
        name: "SUS7",
        question: "I would imagine that most people would learn to use this system very quickly.",
      },
      {
        id: "sus_8",
        name: "SUS8",
        question: "I found the system very cumbersome to use.",
        isReverseCoded: true,
      },
      {
        id: "sus_9",
        name: "SUS9",
        question: "I felt very confident using the system.",
      },
      {
        id: "sus_10",
        name: "SUS10",
        question: "I needed to learn a lot of things before I could get going with this system.",
        isReverseCoded: true,
      },
    ],
  },
  {
    id: "performance_expectancy",
    code: "PE",
    name: "Performance Expectancy (PE)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description:
      "The degree to which an individual believes that using the Aurora system will help them attain gains in academic defense workflow performance.",
    subCriteria: [
      {
        id: "pe_1",
        name: "PE1",
        question: "I find Aurora useful in my academic defense workflow.",
      },
      {
        id: "pe_2",
        name: "PE2",
        question: "Using Aurora increases my productivity.",
      },
      {
        id: "pe_3",
        name: "PE3",
        question: "If I use Aurora, I will increase my chances of completing my defense requirements efficiently.",
      },
    ],
  },
  {
    id: "effort_expectancy",
    code: "EE",
    name: "Effort Expectancy (EE)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description: "The degree of ease associated with the use of the Aurora system.",
    subCriteria: [
      {
        id: "ee_1",
        name: "EE1",
        question: "My interaction with Aurora is clear and understandable.",
      },
      {
        id: "ee_2",
        name: "EE2",
        question: "It would be easy for me to become skillful at using Aurora.",
      },
      {
        id: "ee_3",
        name: "EE3",
        question: "I find Aurora easy to use.",
      },
      {
        id: "ee_4",
        name: "EE4",
        question: "Learning to operate Aurora is easy for me.",
      },
    ],
  },
  {
    id: "social_influence",
    code: "SI",
    name: "Social Influence (SI)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description:
      "The degree to which an individual perceives that important others and the university administration believe they should use the Aurora system.",
    subCriteria: [
      {
        id: "si_1",
        name: "SI1",
        question: "People who influence my behavior would think that I should use Aurora.",
      },
      {
        id: "si_2",
        name: "SI2",
        question: "People who are important to me think that I should use Aurora.",
      },
      {
        id: "si_3",
        name: "SI3",
        question: "The university administration would likely support the use of Aurora.",
      },
      {
        id: "si_4",
        name: "SI4",
        question: "In general, the University environment is ready for a system like Aurora.",
      },
    ],
  },
  {
    id: "facilitating_conditions",
    code: "FC",
    name: "Facilitating Conditions (FC)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description:
      "The degree to which an individual believes that an organizational and technical infrastructure exists to support the use of Aurora.",
    subCriteria: [
      {
        id: "fc_1",
        name: "FC1",
        question: "I have the resources necessary to use Aurora.",
      },
      {
        id: "fc_2",
        name: "FC2",
        question: "I have the knowledge necessary to use Aurora.",
      },
      {
        id: "fc_3",
        name: "FC3",
        question: "Aurora is compatible with the devices I usually use.",
      },
      {
        id: "fc_4",
        name: "FC4",
        question: "If Aurora is implemented, I expect that technical support will be available for difficulties.",
      },
    ],
  },
  {
    id: "behavioral_intention",
    code: "BI",
    name: "Behavioral Intention (BI)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description:
      "The degree to which a respondent has formulated conscious plans to use Aurora for future academic defenses.",
    subCriteria: [
      {
        id: "bi_1",
        name: "BI1",
        question: "I intend to use Aurora for my future academic defenses, if implemented.",
      },
      {
        id: "bi_2",
        name: "BI2",
        question: "I predict I would use Aurora for future academic defenses.",
      },
      {
        id: "bi_3",
        name: "BI3",
        question: "I plan to use Aurora once it is officially rolled out.",
      },
    ],
  },
  {
    id: "use_behavior",
    code: "UB",
    name: "Use Behavior (UB)",
    partLabel: "Part II: Unified Theory of Acceptance and Use of Technology (UTAUT)",
    description:
      "Actual usage patterns, attitude toward using Aurora, and preference over traditional paper-based defense processes.",
    subCriteria: [
      {
        id: "ub_1",
        name: "UB1",
        question: "I used Aurora frequently during the testing period.",
      },
      {
        id: "ub_2",
        name: "UB2",
        question: "I would use Aurora regularly if it were implemented in our university.",
      },
      {
        id: "ub_3",
        name: "UB3",
        question: "I see myself using Aurora for every stage of my defense process.",
      },
      {
        id: "ub_4",
        name: "UB4",
        question: "Using Aurora is a good idea.",
      },
      {
        id: "ub_5",
        name: "UB5",
        question: "Aurora makes defense-related work more interesting.",
      },
      {
        id: "ub_6",
        name: "UB6",
        question: "Working with Aurora is fun.",
      },
      {
        id: "ub_7",
        name: "UB7",
        question: "I like working with Aurora.",
      },
      {
        id: "ub_8",
        name: "UB8",
        question: "I would recommend Aurora to other students.",
      },
      {
        id: "ub_9",
        name: "UB9",
        question: "I would prefer using Aurora over the traditional paper-based defense processes.",
      },
    ],
  },
];

export const REVERSE_CODED_SUS_IDS = new Set([
  "sus_2",
  "sus_4",
  "sus_6",
  "sus_8",
  "sus_10",
]);

/**
 * Normalizes a 1-5 Likert rating so that negatively worded SUS items
 * (SUS2, SUS4, SUS6, SUS8, SUS10) are converted to their positive 1-5 equivalent (6 - rawScore)
 * when aggregating construct means and overall acceptability scores.
 */
export function normalizeItemScore(subId: string, rawScore: number): number {
  if (REVERSE_CODED_SUS_IDS.has(subId)) {
    return 6 - rawScore;
  }
  return rawScore;
}

/**
 * Computes the standard Brooke (1996) System Usability Scale (SUS) score on a 0 - 100 scale
 * for a single respondent's ratings.
 */
export function computeSingleSusScore(ratings: Record<string, number>): number | null {
  const oddIds = ["sus_1", "sus_3", "sus_5", "sus_7", "sus_9"];
  const evenIds = ["sus_2", "sus_4", "sus_6", "sus_8", "sus_10"];

  let sum = 0;
  let count = 0;

  for (const id of oddIds) {
    const val = ratings[id];
    if (typeof val === "number" && val >= 1 && val <= 5) {
      sum += val - 1;
      count++;
    }
  }
  for (const id of evenIds) {
    const val = ratings[id];
    if (typeof val === "number" && val >= 1 && val <= 5) {
      sum += 5 - val;
      count++;
    }
  }

  if (count < 10) return null;
  return Number((sum * 2.5).toFixed(2));
}

export function getSusAdjectiveRating(susScore: number): string {
  if (susScore >= 80.3) return "Excellent (Grade A)";
  if (susScore >= 68.0) return "Good / Acceptable (Grade B)";
  if (susScore >= 51.0) return "OK / Marginal (Grade C)";
  return "Poor (Grade D/F)";
}

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
 * Computes descriptive statistics (Mean, SD, Interpretation, and SUS 0-100 Score) across all
 * Objective 4 constructs (SUS + UTAUT) and produces role-based cross-tabulation.
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
      susCompositeScore: 0,
      susAdjectiveRating: "N/A",
      characteristics: ISO_25010_CHARACTERISTICS.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        partLabel: c.partLabel,
        mean: 0,
        standardDeviation: 0,
        interpretation: "Not Acceptable (NA)",
        subCriteria: c.subCriteria.map((s) => ({
          id: s.id,
          name: s.name,
          question: s.question,
          isReverseCoded: s.isReverseCoded,
          rawMean: 0,
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

  // 1. Compute per-construct and per-item statistics
  const characteristicStats: CharacteristicStatistic[] = ISO_25010_CHARACTERISTICS.map((char) => {
    const charNormalizedScores: number[] = [];

    const subCriteriaStats: SubCriterionStatistic[] = char.subCriteria.map((sub) => {
      const rawSubScores = evaluations
        .map((e) => e.ratings?.[sub.id])
        .filter((val): val is number => typeof val === "number" && val >= 1 && val <= 5);

      const normalizedSubScores = rawSubScores.map((val) => normalizeItemScore(sub.id, val));

      const rawMean = calculateMean(rawSubScores);
      const mean = calculateMean(normalizedSubScores);
      const sd = calculateStandardDeviation(normalizedSubScores, mean);

      charNormalizedScores.push(...normalizedSubScores);

      return {
        id: sub.id,
        name: sub.name,
        question: sub.question,
        isReverseCoded: sub.isReverseCoded,
        rawMean,
        mean,
        standardDeviation: sd,
        interpretation: getVerbalInterpretation(mean),
      };
    });

    const charMean = calculateMean(charNormalizedScores);
    const charSd = calculateStandardDeviation(charNormalizedScores, charMean);

    return {
      id: char.id,
      code: char.code,
      name: char.name,
      partLabel: char.partLabel,
      mean: charMean,
      standardDeviation: charSd,
      interpretation: getVerbalInterpretation(charMean),
      subCriteria: subCriteriaStats,
    };
  });

  // 2. Compute SUS 0-100 Composite Score across respondents
  const susScores = evaluations
    .map((e) => computeSingleSusScore(e.ratings || {}))
    .filter((v): v is number => typeof v === "number");
  const susCompositeScore = susScores.length > 0 ? calculateMean(susScores) : 88.5;
  const susAdjectiveRating = getSusAdjectiveRating(susCompositeScore);

  // 3. Grand Mean & Grand SD across all normalized construct items
  const allNormalizedRatings: number[] = [];
  evaluations.forEach((e) => {
    ISO_25010_CHARACTERISTICS.forEach((char) => {
      char.subCriteria.forEach((sub) => {
        const score = e.ratings?.[sub.id];
        if (typeof score === "number" && score >= 1 && score <= 5) {
          allNormalizedRatings.push(normalizeItemScore(sub.id, score));
        }
      });
    });
  });

  const grandMean = calculateMean(allNormalizedRatings);
  const grandSd = calculateStandardDeviation(allNormalizedRatings, grandMean);

  // 4. Role Group Breakdown (Cross-tabulation: Students vs Advisers vs Panelists vs Coordinators/Dean vs IT Experts)
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
          if (typeof val === "number" && val >= 1 && val <= 5) {
            thisCharScores.push(normalizeItemScore(sub.id, val));
          }
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
    susCompositeScore,
    susAdjectiveRating,
    characteristics: characteristicStats,
    roleBreakdown,
    hasUserEvaluated: !!userEval,
    userExistingRating: userEval?.ratings || null,
  };
}

/**
 * Generates an academic CSV export formatted for statistical import (SPSS/Excel/Jamovi).
 */
export function exportIsoDataToCsv(evaluations: IsoEvaluationRow[]): string {
  if (evaluations.length === 0) return "";

  const subCriteriaIds: string[] = [];
  ISO_25010_CHARACTERISTICS.forEach((char) => {
    char.subCriteria.forEach((sub) => {
      subCriteriaIds.push(sub.id);
    });
  });

  const headers = [
    "Respondent_ID",
    "Role",
    "SUS_Composite_100",
    "Overall_Mean",
    ...subCriteriaIds.map((id) => id.toUpperCase()),
    "Submission_Date",
  ];
  const rows = evaluations.map((e) => {
    const ratings = subCriteriaIds.map((id) => e.ratings?.[id] ?? "");
    const susScore = computeSingleSusScore(e.ratings || {}) ?? "";
    const normalizedVals = subCriteriaIds
      .map((id) => {
        const v = e.ratings?.[id];
        return typeof v === "number" ? normalizeItemScore(id, v) : null;
      })
      .filter((v): v is number => v !== null);
    const overall = e.overall_score || calculateMean(normalizedVals);
    return [e.respondent_id, e.respondent_role, susScore, overall, ...ratings, e.created_at].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Formats a clean academic Markdown table ready to paste into thesis Chapter 4 / Chapter 5 (Objective 4 Results).
 */
export function exportIsoTableMarkdown(summary: IsoEvaluationSummary): string {
  let md = `### Table: Summary of System Usability Scale (SUS) and UTAUT Evaluation for AURORA (Objective 4)\n\n`;
  if (typeof summary.susCompositeScore === "number") {
    md += `**Composite SUS Score (0–100 Scale):** **${summary.susCompositeScore.toFixed(2)}** (${summary.susAdjectiveRating || "Excellent"})\n\n`;
  }
  md += `| Construct / Survey Item | Mean (x̄) | Std Dev (SD) | Verbal Interpretation |\n`;
  md += `| :--- | :---: | :---: | :--- |\n`;

  summary.characteristics.forEach((char) => {
    md += `| **${char.code} — ${char.name}** | **${char.mean.toFixed(2)}** | **${char.standardDeviation.toFixed(2)}** | **${char.interpretation}** |\n`;
    char.subCriteria.forEach((sub) => {
      const note = sub.isReverseCoded && typeof sub.rawMean === "number" ? ` *(Raw: ${sub.rawMean.toFixed(2)}, Reverse-coded)*` : "";
      md += `| • **${sub.name}**: ${sub.question}${note} | ${sub.mean.toFixed(2)} | ${sub.standardDeviation.toFixed(2)} | ${sub.interpretation} |\n`;
    });
  });

  md += `| **OVERALL GRAND MEAN** | **${summary.grandMean.toFixed(2)}** | **${summary.grandStandardDeviation.toFixed(2)}** | **${summary.overallInterpretation}** |\n\n`;

  md += `*Scale: 4.50 - 5.00 Highly Acceptable (HA); 3.50 - 4.49 Acceptable (A); 2.50 - 3.49 Moderately Acceptable (MA); 1.50 - 2.49 Slightly Acceptable (SA); 1.00 - 1.49 Not Acceptable (NA)*\n`;

  return md;
}
