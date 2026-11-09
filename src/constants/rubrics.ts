export interface RubricCriterionInput {
  id?: string;
  name: string;
  weight: number;
  category?: string;
  max_score?: number;
  description?: string;
}

/**
 * Official Partido State University Department of Computational Sciences (BSIT)
 * Oral Defense Evaluation Criteria (Form DCS-CF-04 / DCS-CF-05)
 */
export const PARSU_BSIT_ORAL_DEFENSE_CRITERIA: RubricCriterionInput[] = [
  {
    id: "crit_substance_originality",
    category: "1. Substance / Context of the Proposal (50%)",
    name: "Originality / Inventiveness",
    weight: 30,
    max_score: 100,
  },
  {
    id: "crit_substance_manuscript",
    category: "1. Substance / Context of the Proposal (50%)",
    name: "Quality of Proposal Manuscript",
    weight: 20,
    max_score: 100,
  },
  {
    id: "crit_tech_contribution",
    category: "2. Technological Impact (30%)",
    name: "Contribution to Technology",
    weight: 15,
    max_score: 100,
  },
  {
    id: "crit_tech_productivity",
    category: "2. Technological Impact (30%)",
    name: "Impact to Productivity and Cost Effectiveness",
    weight: 15,
    max_score: 100,
  },
  {
    id: "crit_pres_quality",
    category: "3. Presentation Delivery (20%)",
    name: "Quality of Presentation",
    weight: 10,
    max_score: 100,
  },
  {
    id: "crit_pres_inquiries",
    category: "3. Presentation Delivery (20%)",
    name: "Ability to Respond to Inquiries",
    weight: 10,
    max_score: 100,
  },
];
