const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.trim().startsWith('"') && value.trim().endsWith('"')) {
        value = value.trim().slice(1, -1);
      } else if (value.trim().startsWith("'") && value.trim().endsWith("'")) {
        value = value.trim().slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const CAMPUS_ID = '00000000-0000-0000-0000-000000000001';

const COLLEGES = {
  COE: '10000000-0000-0000-0000-000000000001',
  COB: '10000000-0000-0000-0000-000000000002',
  CEC: '10000000-0000-0000-0000-000000000003',
  CAH: '10000000-0000-0000-0000-000000000004',
  COS: '10000000-0000-0000-0000-000000000005',
};

const WORKFLOW_SEEDS = [
  {
    id: '10000000-0000-0000-0000-000000000011',
    name: 'College of Education Action Research & Thesis Workflow',
    description: 'Pedagogical action research and educational thesis pipeline (Topic/Concept Formulation -> Action Proposal Colloquium -> Final Oral Defense & Teaching Demonstration) for BSEd, BEEd, and graduate MAEd/PhD programs.',
    college_id: COLLEGES.COE,
    is_default: false,
    stages: [
      {
        id: '10000001-0001-0000-0000-000000000001',
        code: 'title',
        name: 'Action Research Topic Formulation',
        sequence_order: 1,
        description: 'Formulation and evaluation of classroom-based action research topic, teaching problem statement, and pedagogical intervention framework.',
        passing_score: 75.0,
        required_documents: ['action_research_concept', 'classroom_problem_statement'],
      },
      {
        id: '10000001-0001-0000-0000-000000000002',
        code: 'proposal',
        name: 'Action Research Proposal Colloquium',
        sequence_order: 2,
        description: 'Defense of Chapters 1-3 including instructional strategies, lesson plans, learning assessment instruments, and statistical evaluation plans.',
        passing_score: 75.0,
        required_documents: ['chapters_1_3', 'lesson_plans', 'learning_assessment_tools'],
      },
      {
        id: '10000001-0001-0000-0000-000000000003',
        code: 'final',
        name: 'Final Oral Defense & Teaching Demo',
        sequence_order: 3,
        description: 'Final defense of complete action research manuscript (Chapters 1-5), learner achievement gains, and teaching demonstration evaluation.',
        passing_score: 75.0,
        required_documents: ['complete_manuscript', 'teaching_demo_rubric', 'statistical_clearance'],
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000012',
    name: 'College of Business Feasibility & Defense Workflow',
    description: 'Business research, market feasibility, and enterprise capstone pipeline (Title & Market Concept -> Feasibility Defense -> Final Enterprise & Strategic Plan Defense) for Accountancy, Business Administration, Entrepreneurship, and MBA programs.',
    college_id: COLLEGES.COB,
    is_default: false,
    stages: [
      {
        id: '10000002-0001-0000-0000-000000000001',
        code: 'title',
        name: 'Business Concept & Opportunity Formulation',
        sequence_order: 1,
        description: 'Identification of market opportunity, industry gap analysis, proposed venture model, and commercial viability overview.',
        passing_score: 75.0,
        required_documents: ['business_concept_paper', 'market_gap_analysis'],
      },
      {
        id: '10000002-0001-0000-0000-000000000002',
        code: 'proposal',
        name: 'Feasibility Study Proposal Defense',
        sequence_order: 2,
        description: 'Defense of comprehensive feasibility study Chapters 1-3 covering market feasibility, technical/operational design, and management structure.',
        passing_score: 75.0,
        required_documents: ['feasibility_chapters_1_3', 'survey_instruments', 'operations_manual'],
      },
      {
        id: '10000002-0001-0000-0000-000000000003',
        code: 'final',
        name: 'Final Enterprise Feasibility Defense',
        sequence_order: 3,
        description: 'Final evaluation of complete enterprise study (Chapters 1-5), 5-year financial statements, cash flow viability, ROI, and socio-economic impact.',
        passing_score: 75.0,
        required_documents: ['complete_feasibility_study', 'financial_statements', 'turnitin_report'],
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000013',
    name: 'College of Engineering & Computational Sciences Capstone Workflow',
    description: 'Engineering systems, software architecture, and technological innovation pipeline (Concept & Title -> System Proposal & Architecture -> Final Engineering Prototype Defense) for Engineering, Architecture, and Technology programs.',
    college_id: COLLEGES.CEC,
    is_default: false,
    stages: [
      {
        id: '10000003-0001-0000-0000-000000000001',
        code: 'title',
        name: 'Engineering Concept & Problem Formulation',
        sequence_order: 1,
        description: 'Engineering problem definition, technical feasibility analysis, and preliminary hardware/software system specifications.',
        passing_score: 75.0,
        required_documents: ['engineering_concept_sheet', 'technical_problem_statement'],
      },
      {
        id: '10000003-0001-0000-0000-000000000002',
        code: 'proposal',
        name: 'System Architecture & Proposal Defense',
        sequence_order: 2,
        description: 'Oral defense of technical proposal (Chapters 1-3) including circuit diagrams, architectural blueprints, database schemas, and BOM.',
        passing_score: 75.0,
        required_documents: ['proposal_chapters_1_3', 'system_architecture_diagrams', 'bom_estimate'],
      },
      {
        id: '10000003-0001-0000-0000-000000000003',
        code: 'final',
        name: 'Final Prototype & Deliverable Defense',
        sequence_order: 3,
        description: 'Rigorous oral defense of complete technical manuscript (Chapters 1-5), fully operational prototype demonstration, and stress testing results.',
        passing_score: 75.0,
        required_documents: ['complete_manuscript', 'functional_prototype', 'test_results_log'],
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000014',
    name: 'College of Arts and Humanities Research & Creative Capstone Workflow',
    description: 'Scholarly inquiry, communication research, and creative portfolio defense pipeline (Prospectus & Concept Paper -> Comprehensive Proposal Defense -> Final Manuscript & Creative Portfolio Defense) for Communication and Public Administration programs.',
    college_id: COLLEGES.CAH,
    is_default: false,
    stages: [
      {
        id: '10000004-0001-0000-0000-000000000001',
        code: 'title',
        name: 'Research Prospectus & Creative Concept',
        sequence_order: 1,
        description: 'Formulation of research inquiry or creative production concept, societal context, and theoretical/artistic framework.',
        passing_score: 75.0,
        required_documents: ['research_prospectus', 'creative_concept_brief'],
      },
      {
        id: '10000004-0001-0000-0000-000000000002',
        code: 'proposal',
        name: 'Comprehensive Proposal Defense',
        sequence_order: 2,
        description: 'Defense of Chapters 1-3 including qualitative/mixed methodology, narrative discourse analysis, ethics protocols, and production plan.',
        passing_score: 75.0,
        required_documents: ['chapters_1_3', 'interview_protocols', 'ethics_clearance'],
      },
      {
        id: '10000004-0001-0000-0000-000000000003',
        code: 'final',
        name: 'Final Manuscript & Portfolio Defense',
        sequence_order: 3,
        description: 'Final oral defense of complete thesis manuscript (Chapters 1-5), creative artifact / documentary / media exhibition, and critical analysis.',
        passing_score: 75.0,
        required_documents: ['complete_manuscript', 'creative_deliverable_portfolio', 'turnitin_report'],
      },
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000015',
    name: 'College of Science Empirical Thesis Defense Workflow',
    description: 'Pure and applied science research pipeline (Scientific Rationale & Topic Formulation -> Experimental Design & Proposal Defense -> Final Empirical Defense & Scientific Deliverables) for Biology, Geology, and environmental research.',
    college_id: COLLEGES.COS,
    is_default: false,
    stages: [
      {
        id: '10000005-0001-0000-0000-000000000001',
        code: 'title',
        name: 'Scientific Topic & Hypotheses Formulation',
        sequence_order: 1,
        description: 'Scientific research question, testable hypotheses, environmental/biological significance, and preliminary lab feasibility.',
        passing_score: 75.0,
        required_documents: ['scientific_topic_rationale', 'hypotheses_statement'],
      },
      {
        id: '10000005-0001-0000-0000-000000000002',
        code: 'proposal',
        name: 'Experimental Design & Proposal Defense',
        sequence_order: 2,
        description: 'Defense of scientific proposal (Chapters 1-3) including laboratory/field sampling design, biosafety/environmental protocols, and biostatistics.',
        passing_score: 75.0,
        required_documents: ['scientific_chapters_1_3', 'sampling_methodology_protocol', 'biosafety_permit'],
      },
      {
        id: '10000005-0001-0000-0000-000000000003',
        code: 'final',
        name: 'Final Empirical Thesis Defense',
        sequence_order: 3,
        description: 'Final defense of complete empirical thesis (Chapters 1-5), laboratory assays, statistical data models, specimen archives, and peer review clearance.',
        passing_score: 75.0,
        required_documents: ['complete_thesis_manuscript', 'raw_dataset_archive', 'statistical_clearance'],
      },
    ],
  },
];

const RUBRIC_SEEDS = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    college_id: COLLEGES.COE,
    title: 'College of Education Action Research & Thesis Defense Rubric (COE-CF-04)',
    passing_score: 75.0,
    excellent_score: 85.0,
    target_compliance_rate: 85.0,
    min_compliance_rate: 70.0,
    max_major_unresolved: 2,
    is_published: true,
    is_active: true,
    is_default: false,
    version: 1,
    criteria: [
      {
        id: 'coe_c1',
        name: 'Classroom Problem Identification & Educational Significance',
        category: 'problem_formulation',
        weight: 20,
        max_score: 100,
        description: 'Clarity of the teaching-learning problem, pedagogical context, and relevance to the DepEd/CHED curriculum framework.',
      },
      {
        id: 'coe_c2',
        name: 'Theoretical & Pedagogical Literature Foundation',
        category: 'literature_review',
        weight: 20,
        max_score: 100,
        description: 'Synthesis of educational theories (Constructivism, Multiple Intelligences, etc.) and related studies in instructional design.',
      },
      {
        id: 'coe_c3',
        name: 'Instructional Intervention & Action Research Methodology',
        category: 'methodology',
        weight: 25,
        max_score: 100,
        description: 'Soundness of the intervention design, teaching modules, lesson plans, learning assessment instruments, and ethical considerations.',
      },
      {
        id: 'coe_c4',
        name: 'Learning Outcomes Assessment & Data Analysis',
        category: 'findings_and_output',
        weight: 20,
        max_score: 100,
        description: 'Rigor of pre-test/post-test analysis, statistical treatment of learning gains, and empirical pedagogical evidence.',
      },
      {
        id: 'coe_c5',
        name: 'Oral Presentation & Teaching Mastery',
        category: 'oral_presentation',
        weight: 15,
        max_score: 100,
        description: 'Clarity, voice projection, pedagogical articulation, and scholarly response to defense inquiries and instructional demonstration.',
      },
    ],
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    college_id: COLLEGES.COB,
    title: 'College of Business Feasibility & Strategic Capstone Rubric (COB-CF-04)',
    passing_score: 75.0,
    excellent_score: 85.0,
    target_compliance_rate: 85.0,
    min_compliance_rate: 70.0,
    max_major_unresolved: 2,
    is_published: true,
    is_active: true,
    is_default: false,
    version: 1,
    criteria: [
      {
        id: 'cob_c1',
        name: 'Market Opportunity & Industry Gap Analysis',
        category: 'problem_formulation',
        weight: 20,
        max_score: 100,
        description: 'Identification of market demand, target customer segmentation, competitive analysis, and strategic positioning.',
      },
      {
        id: 'cob_c2',
        name: 'Management & Organizational Structure Feasibility',
        category: 'organization',
        weight: 15,
        max_score: 100,
        description: 'Form of business ownership, organizational hierarchy, staffing requirements, legal compliance, and corporate governance.',
      },
      {
        id: 'cob_c3',
        name: 'Technical, Operational & Marketing Strategy',
        category: 'methodology',
        weight: 25,
        max_score: 100,
        description: 'Product/service design, operational workflow, supply chain logistics, pricing strategy, and promotional mix.',
      },
      {
        id: 'cob_c4',
        name: 'Financial Modeling, Viability & Economic Feasibility',
        category: 'findings_and_output',
        weight: 25,
        max_score: 100,
        description: '5-year financial projections, cash flow statements, break-even analysis, ROI, Net Present Value (NPV), and internal rate of return (IRR).',
      },
      {
        id: 'cob_c5',
        name: 'Executive Defense & Business Communication Mastery',
        category: 'oral_presentation',
        weight: 15,
        max_score: 100,
        description: 'Professional executive presentation, data visual design, persuasive articulation, and defensibility of commercial assumptions.',
      },
    ],
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    college_id: COLLEGES.CEC,
    title: 'College of Engineering & Computational Sciences Capstone Rubric (CECS-CF-04)',
    passing_score: 75.0,
    excellent_score: 85.0,
    target_compliance_rate: 85.0,
    min_compliance_rate: 70.0,
    max_major_unresolved: 2,
    is_published: true,
    is_active: true,
    is_default: false,
    version: 1,
    criteria: [
      {
        id: 'cec_c1',
        name: 'Technical Problem Formulation & System Objectives',
        category: 'problem_formulation',
        weight: 20,
        max_score: 100,
        description: 'Significance of technical engineering/computing problem, functional objectives, and scope constraints.',
      },
      {
        id: 'cec_c2',
        name: 'Architectural Blueprint & Engineering Methodology',
        category: 'methodology',
        weight: 25,
        max_score: 100,
        description: 'Soundness of SDLC / engineering design process, system architecture, database schema, circuit schematics, and tech stack.',
      },
      {
        id: 'cec_c3',
        name: 'Prototype Implementation, Completeness & Code Quality',
        category: 'findings_and_output',
        weight: 25,
        max_score: 100,
        description: 'Readiness of functional prototype, code modularity, hardware integration, user experience, and ISO/IEC 25010 standards.',
      },
      {
        id: 'cec_c4',
        name: 'Testing, System Validation & Security Hardening',
        category: 'validation',
        weight: 15,
        max_score: 100,
        description: 'Test cases coverage (unit, integration, load), security vulnerability assessment, stress testing, and empirical evaluation results.',
      },
      {
        id: 'cec_c5',
        name: 'Technical Oral Defense & Live Demonstration',
        category: 'oral_presentation',
        weight: 15,
        max_score: 100,
        description: 'Live system execution without fatal errors, architectural defense mastery, and precise handling of technical panel critiques.',
      },
    ],
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    college_id: COLLEGES.CAH,
    title: 'College of Arts and Humanities Thesis & Creative Defense Rubric (CAH-CF-04)',
    passing_score: 75.0,
    excellent_score: 85.0,
    target_compliance_rate: 85.0,
    min_compliance_rate: 70.0,
    max_major_unresolved: 2,
    is_published: true,
    is_active: true,
    is_default: false,
    version: 1,
    criteria: [
      {
        id: 'cah_c1',
        name: 'Inquiry Rationale, Cultural Relevance & Problem Grounding',
        category: 'problem_formulation',
        weight: 20,
        max_score: 100,
        description: 'Originality of topic, sociocultural impact in the Bicol region, and theoretical justification of the inquiry or creative work.',
      },
      {
        id: 'cah_c2',
        name: 'Critical Discourse & Theoretical Synthesis',
        category: 'literature_review',
        weight: 20,
        max_score: 100,
        description: 'Breadth of multidisciplinary literature, critical engagement with scholarly debates, and contextualization of key concepts.',
      },
      {
        id: 'cah_c3',
        name: 'Qualitative / Creative Methodology & Ethical Framework',
        category: 'methodology',
        weight: 25,
        max_score: 100,
        description: 'Appropriateness of qualitative/mixed methods (semiotics, discourse analysis, ethnography) and creative production ethics.',
      },
      {
        id: 'cah_c4',
        name: 'Thematic Rigor & Creative Artifact Execution',
        category: 'findings_and_output',
        weight: 20,
        max_score: 100,
        description: 'Depth of thematic findings, narrative quality, aesthetic coherence of creative outputs (documentary, media, publications), and scholarly reflection.',
      },
      {
        id: 'cah_c5',
        name: 'Scholarly Argumentation & Defense Articulation',
        category: 'oral_presentation',
        weight: 15,
        max_score: 100,
        description: 'Eloquence, command of academic rhetoric, defensibility of creative decisions, and mastery in panel dialogue.',
      },
    ],
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    college_id: COLLEGES.COS,
    title: 'College of Science Empirical Thesis Defense Rubric (COS-CF-04)',
    passing_score: 75.0,
    excellent_score: 85.0,
    target_compliance_rate: 85.0,
    min_compliance_rate: 70.0,
    max_major_unresolved: 2,
    is_published: true,
    is_active: true,
    is_default: false,
    version: 1,
    criteria: [
      {
        id: 'cos_c1',
        name: 'Scientific Rationale, Problem Formulation & Hypotheses',
        category: 'problem_formulation',
        weight: 20,
        max_score: 100,
        description: 'Clarity of the scientific problem, testability of hypotheses, environmental/biological significance, and sound conceptual boundaries.',
      },
      {
        id: 'cos_c2',
        name: 'Scientific Literature & Empirical Background',
        category: 'literature_review',
        weight: 15,
        max_score: 100,
        description: 'Critical analysis of peer-reviewed empirical studies, taxonomic/laboratory foundations, and identification of scientific knowledge gaps.',
      },
      {
        id: 'cos_c3',
        name: 'Experimental Design, Fieldwork Protocols & Laboratory Rigor',
        category: 'methodology',
        weight: 30,
        max_score: 100,
        description: 'Rigor of sampling design, replication, control groups, instrument calibration, biosafety/ethical clearances, and quantitative reproducibility.',
      },
      {
        id: 'cos_c4',
        name: 'Biostatistical Analysis, Findings & Scientific Interpretation',
        category: 'findings_and_output',
        weight: 20,
        max_score: 100,
        description: 'Correctness of statistical tests (ANOVA, regression, diversity indices), clarity of scientific figures/tables, and empirical discussion.',
      },
      {
        id: 'cos_c5',
        name: 'Scientific Defense & Technical Q&A Mastery',
        category: 'oral_presentation',
        weight: 15,
        max_score: 100,
        description: 'Precision of scientific terminology, data-driven defense of findings, and authoritative response to empirical panel inquiries.',
      },
    ],
  },
];

async function seed() {
  console.log("=== Seeding College-Specific Workflows, Stages, and Rubrics ===");

  // 1. Seed Workflows and Stages
  for (const wf of WORKFLOW_SEEDS) {
    console.log(`Processing Workflow: ${wf.name}...`);
    const { error: wfErr } = await supabase
      .from('workflow_templates')
      .upsert({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        college_id: wf.college_id,
        is_default: wf.is_default,
      }, { onConflict: 'id' });

    if (wfErr) {
      console.error(`Error upserting workflow ${wf.name}:`, wfErr);
      continue;
    }

    // Seed Stages
    for (const stage of wf.stages) {
      const { error: stgErr } = await supabase
        .from('defense_stages')
        .upsert({
          id: stage.id,
          campus_id: CAMPUS_ID,
          code: stage.code,
          name: stage.name,
          sequence_order: stage.sequence_order,
          description: stage.description,
          is_enabled: true,
          passing_score: stage.passing_score,
          required_documents: stage.required_documents,
          workflow_template_id: wf.id,
          requires_submission: true,
          requires_schedule: true,
          requires_panel: true,
          requires_rubric: true,
          requires_signature: true,
          allows_revision: true,
        }, { onConflict: 'id' });

      if (stgErr) {
        console.error(`Error upserting stage ${stage.name}:`, stgErr);
      } else {
        console.log(`  ✓ Stage: [Seq ${stage.sequence_order}] ${stage.name}`);
      }
    }
  }

  // 2. Seed College Rubric Templates
  for (const rubric of RUBRIC_SEEDS) {
    console.log(`Processing Rubric: ${rubric.title}...`);
    const { error: rubErr } = await supabase
      .from('rubric_templates')
      .upsert({
        id: rubric.id,
        college_id: rubric.college_id,
        title: rubric.title,
        passing_score: rubric.passing_score,
        excellent_score: rubric.excellent_score,
        target_compliance_rate: rubric.target_compliance_rate,
        min_compliance_rate: rubric.min_compliance_rate,
        max_major_unresolved: rubric.max_major_unresolved,
        is_published: rubric.is_published,
        is_active: rubric.is_active,
        is_default: rubric.is_default,
        version: rubric.version,
        criteria: rubric.criteria,
      }, { onConflict: 'id' });

    if (rubErr) {
      console.error(`Error upserting rubric ${rubric.title}:`, rubErr);
    } else {
      console.log(`  ✓ Rubric: ${rubric.title}`);
    }
  }

  console.log("=== Seeding Completed Successfully! ===");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
