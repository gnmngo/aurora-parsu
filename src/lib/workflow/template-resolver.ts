import type { SupabaseClient } from "@supabase/supabase-js";
import { PARSU_BSIT_ORAL_DEFENSE_CRITERIA } from "@/lib/rubrics/actions";

export interface ResolvedWorkflow {
  id: string;
  name: string;
  description: string | null;
  program_id: string | null;
  college_id: string | null;
  is_default: boolean;
  stages: Array<{
    id: string;
    code: string;
    name: string;
    sequence_order: number;
    description: string | null;
    is_enabled: boolean;
    required_documents?: string[];
    passing_score?: number;
  }>;
}

export interface ResolvedRubric {
  id: string;
  title: string;
  criteria: Array<{
    id: string;
    name: string;
    weight: number;
    category?: string;
    max_score?: number;
    description?: string;
  }>;
  passing_score: number;
  excellent_score: number;
  source: "project" | "program" | "college" | "university_default" | "fallback";
}

/**
 * Standard General University Academic Rubric Criteria (U-CF-04)
 */
export const UNIVERSITY_STANDARD_ACADEMIC_CRITERIA = [
  {
    id: "crit_u1",
    name: "Research Problem, Objectives & Significance",
    category: "problem_formulation",
    weight: 20,
    max_score: 100,
    description: "Clarity of the research problem, alignment of objectives, and institutional/social significance.",
  },
  {
    id: "crit_u2",
    name: "Literature Review & Theoretical/Conceptual Framework",
    category: "literature_review",
    weight: 15,
    max_score: 100,
    description: "Comprehensiveness of current literature, synthesis of related studies, and sound conceptual foundation.",
  },
  {
    id: "crit_u3",
    name: "Research Methodology, Design & Instruments",
    category: "methodology",
    weight: 25,
    max_score: 100,
    description: "Appropriateness of research design, sampling, data gathering procedures, and instrument validity/reliability.",
  },
  {
    id: "crit_u4",
    name: "Data Analysis, Findings & Deliverable Output",
    category: "findings_and_output",
    weight: 25,
    max_score: 100,
    description: "Rigor of data analysis, presentation of results, and quality/readiness of prototype or thesis deliverable.",
  },
  {
    id: "crit_u5",
    name: "Oral Presentation & Defense Mastery",
    category: "oral_presentation",
    weight: 15,
    max_score: 100,
    description: "Clarity of delivery, effective communication, and mastery in answering panel inquiries.",
  },
];

/**
 * 3-Tier Fallback Cascade for Workflow Templates:
 * 1. Program-Specific Template (e.g. BSIT 5-stage workflow)
 * 2. College-Specific Template
 * 3. General University Default Workflow (3-stage workflow: Title -> Proposal -> Final)
 */
export async function resolveWorkflowTemplate(
  supabase: SupabaseClient,
  options: { programId?: string | null; collegeId?: string | null }
): Promise<ResolvedWorkflow | null> {
  const { programId, collegeId } = options;

  let chosenTemplate: any = null;

  // 1. Program-level check
  if (programId) {
    const { data: progTemplate } = await supabase
      .from("workflow_templates")
      .select("id, name, description, program_id, college_id, is_default")
      .eq("program_id", programId)
      .limit(1)
      .maybeSingle();

    if (progTemplate) chosenTemplate = progTemplate;
  }

  // 2. College-level check
  if (!chosenTemplate && collegeId) {
    const { data: colTemplate } = await supabase
      .from("workflow_templates")
      .select("id, name, description, program_id, college_id, is_default")
      .eq("college_id", collegeId)
      .limit(1)
      .maybeSingle();

    if (colTemplate) chosenTemplate = colTemplate;
  }

  // 3. University default check
  if (!chosenTemplate) {
    const { data: defTemplate } = await supabase
      .from("workflow_templates")
      .select("id, name, description, program_id, college_id, is_default")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    if (defTemplate) chosenTemplate = defTemplate;
  }

  // 4. Absolute fallback: BSIT default template
  if (!chosenTemplate) {
    const { data: bsitFallback } = await supabase
      .from("workflow_templates")
      .select("id, name, description, program_id, college_id, is_default")
      .eq("id", "70000000-0000-0000-0000-000000000001")
      .maybeSingle();

    chosenTemplate = bsitFallback;
  }

  if (!chosenTemplate) return null;

  // Fetch stages associated with this workflow template
  const { data: stages } = await supabase
    .from("defense_stages")
    .select("id, code, name, sequence_order, description, is_enabled, required_documents, passing_score")
    .eq("workflow_template_id", chosenTemplate.id)
    .eq("is_enabled", true)
    .order("sequence_order", { ascending: true });

  return {
    ...chosenTemplate,
    stages: stages || [],
  };
}

/**
 * 4-Tier Fallback Cascade for Rubric Templates:
 * 1. Project-Specific Rubric (Chairman Customization)
 * 2. Program-Specific Rubric (e.g. ParSU BSIT Progress Report Rubric)
 * 3. College-Specific Rubric
 * 4. General University Standard Rubric (U-CF-04)
 */
export async function resolveRubricTemplate(
  supabase: SupabaseClient,
  options: {
    projectId?: string | null;
    programId?: string | null;
    collegeId?: string | null;
    stageId?: string | null;
  }
): Promise<ResolvedRubric> {
  const { projectId, programId, collegeId } = options;

  // 1. Project-level Chairman Customization
  if (projectId) {
    const { data: projectRubric } = await supabase
      .from("rubric_templates")
      .select("id, title, criteria, passing_score, excellent_score")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projectRubric && Array.isArray(projectRubric.criteria) && projectRubric.criteria.length > 0) {
      return {
        id: projectRubric.id,
        title: projectRubric.title,
        criteria: projectRubric.criteria,
        passing_score: Number(projectRubric.passing_score ?? 75),
        excellent_score: Number(projectRubric.excellent_score ?? 85),
        source: "project",
      };
    }
  }

  // 2. Program-level Rubric
  if (programId) {
    const { data: progRubric } = await supabase
      .from("rubric_templates")
      .select("id, title, criteria, passing_score, excellent_score")
      .eq("program_id", programId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progRubric && Array.isArray(progRubric.criteria) && progRubric.criteria.length > 0) {
      return {
        id: progRubric.id,
        title: progRubric.title,
        criteria: progRubric.criteria,
        passing_score: Number(progRubric.passing_score ?? 75),
        excellent_score: Number(progRubric.excellent_score ?? 85),
        source: "program",
      };
    }
  }

  // 3. College-level Rubric
  if (collegeId) {
    const { data: colRubric } = await supabase
      .from("rubric_templates")
      .select("id, title, criteria, passing_score, excellent_score")
      .eq("college_id", collegeId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (colRubric && Array.isArray(colRubric.criteria) && colRubric.criteria.length > 0) {
      return {
        id: colRubric.id,
        title: colRubric.title,
        criteria: colRubric.criteria,
        passing_score: Number(colRubric.passing_score ?? 75),
        excellent_score: Number(colRubric.excellent_score ?? 85),
        source: "college",
      };
    }
  }

  // 4. University Default Rubric
  const { data: defRubric } = await supabase
    .from("rubric_templates")
    .select("id, title, criteria, passing_score, excellent_score")
    .eq("is_default", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (defRubric && Array.isArray(defRubric.criteria) && defRubric.criteria.length > 0) {
    return {
      id: defRubric.id,
      title: defRubric.title,
      criteria: defRubric.criteria,
      passing_score: Number(defRubric.passing_score ?? 75),
      excellent_score: Number(defRubric.excellent_score ?? 85),
      source: "university_default",
    };
  }

  // 5. Final fallback
  return {
    id: "20000000-0000-0000-0000-000000000000",
    title: "Standard University Thesis & Capstone Defense Rubric (U-CF-04)",
    criteria: UNIVERSITY_STANDARD_ACADEMIC_CRITERIA,
    passing_score: 75,
    excellent_score: 85,
    source: "fallback",
  };
}

/**
 * Returns document branding and metadata tailored to the program / college
 */
export function getProgramFormMetadata(options: {
  programCode?: string | null;
  programName?: string | null;
  collegeCode?: string | null;
  collegeName?: string | null;
  departmentName?: string | null;
}) {
  const code = (options.programCode || "").toUpperCase().trim();
  const name = (options.programName || "").toLowerCase().trim();
  const isBsit = code === "BSIT" || name.includes("information technology");

  if (isBsit) {
    return {
      isBsit: true,
      collegeHeader: options.collegeName || "College of Engineering and Computational Sciences",
      departmentHeader: options.departmentName || "Department of Computational Sciences",
      programName: "BS Information Technology",
      formCodeApplication: "DCS-CF-03",
      formCodeEvaluation: "DCS-CF-04",
      formCodeSummary: "DCS-CF-05",
      addresseeTitle: "THE DEPARTMENT CHAIRPERSON",
      chairpersonName: "KENNEDY C. CUYA, DIT",
    };
  }

  return {
    isBsit: false,
    collegeHeader: options.collegeName || "Academic Unit / College",
    departmentHeader: options.departmentName || options.programName || "Academic Department",
    programName: options.programName || "Degree Program",
    formCodeApplication: "U-CF-03",
    formCodeEvaluation: "U-CF-04",
    formCodeSummary: "U-CF-05",
    addresseeTitle: "THE DEAN / PROGRAM CHAIRPERSON",
    chairpersonName: "PROGRAM CHAIRPERSON / DEAN",
  };
}
