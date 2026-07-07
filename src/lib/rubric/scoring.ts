export interface RubricCriterion {
  id?: string;
  name: string;
  weight: number;
}

export interface RubricThresholds {
  passing_score?: number;
  excellent_score?: number;
  target_compliance_rate?: number;
  min_compliance_rate?: number;
  max_major_unresolved?: number;
}

/** Compute weighted score from rubric criteria and score map */
export function computeWeightedScore(
  criteria: RubricCriterion[],
  scores: Record<string, number>
): number {
  if (!criteria.length) return 0;
  return criteria.reduce((sum, criterion) => {
    const key = criterion.id || criterion.name;
    const score = scores[key] ?? 0;
    const weight = Number(criterion.weight || 0);
    return sum + (score * weight) / 100;
  }, 0);
}

/** Derive pass/fail label from rubric thresholds (no hardcoded values) */
export function deriveScoreLabel(
  score: number,
  thresholds: RubricThresholds
): "excellent" | "passing" | "failing" {
  const passing = thresholds.passing_score ?? 0;
  const excellent = thresholds.excellent_score ?? passing;
  if (score >= excellent) return "excellent";
  if (score >= passing) return "passing";
  return "failing";
}

/** Validate criteria weights sum to 100 */
export function validateCriteriaWeights(criteria: RubricCriterion[]): {
  valid: boolean;
  total: number;
} {
  const total = criteria.reduce((s, c) => s + Number(c.weight || 0), 0);
  return { valid: total >= 99.9 && total <= 100.1, total };
}
