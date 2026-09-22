/**
 * AURORA Research Instrumentation Types
 * 
 * Specifically structured to support:
 * - Research Objective 2: System Architecture, Modules, and Technical Performance Benchmarks
 * - Research Objective 3: ISO/IEC 25010 Software Quality Evaluation & Operational Workflow Metrics
 */

// ─── Research Objective 2: Technical Performance & Telemetry Types ───────────

export type TelemetryTransactionType =
  | "pdf_sha256_hashing"
  | "split_screen_render"
  | "annotation_save_broadcast"
  | "rubric_weighted_calculation"
  | "digital_signature_verification"
  | "defense_schedule_conflict_check"
  | "certificate_generation"
  | "database_action_latency";

export interface TelemetryLogEntry {
  id: string;
  transaction_type: TelemetryTransactionType | string;
  duration_ms: number;
  status: "success" | "error";
  payload_size_bytes?: number | null;
  route?: string | null;
  client_ip?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  sampleCount: number;
}

export interface TransactionBenchmarkResult {
  transactionType: string;
  label: string;
  percentiles: LatencyPercentiles;
  successRate: number;
  avgPayloadBytes?: number;
}

export interface Objective2TelemetrySummary {
  totalProbesLogged: number;
  avgSystemLatencyMs: number;
  systemReliabilityRate: number; // percentage (e.g. 99.8%)
  benchmarks: TransactionBenchmarkResult[];
  hashingBenchmarks: Array<{
    fileSizeMb: number;
    durationMs: number;
    throughputMbps: number;
  }>;
  recentProbes: TelemetryLogEntry[];
}

// ─── Research Objective 3: ISO/IEC 25010 Evaluation Types ─────────────────────

export type RespondentRole =
  | "student"
  | "adviser"
  | "panelist"
  | "coordinator"
  | "college_dean"
  | "it_expert"
  | "sys_admin";

export interface IsoSubCriterion {
  id: string;
  name: string;
  question: string;
}

export interface IsoCharacteristic {
  id: string;
  code: string;
  name: string;
  description: string;
  subCriteria: IsoSubCriterion[];
}

export type LikertRating = 1 | 2 | 3 | 4 | 5;

export interface IsoEvaluationSubmission {
  ratings: Record<string, LikertRating>; // key is subCriterion id (e.g. 'fs_completeness': 5)
  comments?: string;
}

export interface IsoEvaluationRow {
  id: string;
  respondent_id: string;
  respondent_role: RespondentRole;
  college_id?: string | null;
  ratings: Record<string, number>;
  overall_score?: number | null;
  comments?: string | null;
  created_at: string;
  updated_at: string;
}

export type VerbalInterpretation =
  | "Highly Acceptable (HA)"
  | "Acceptable (A)"
  | "Moderately Acceptable (MA)"
  | "Slightly Acceptable (SA)"
  | "Not Acceptable (NA)";

export interface SubCriterionStatistic {
  id: string;
  name: string;
  question: string;
  mean: number;
  standardDeviation: number;
  interpretation: VerbalInterpretation;
}

export interface CharacteristicStatistic {
  id: string;
  code: string;
  name: string;
  mean: number;
  standardDeviation: number;
  interpretation: VerbalInterpretation;
  subCriteria: SubCriterionStatistic[];
}

export interface RoleGroupScore {
  role: RespondentRole | "overall";
  roleLabel: string;
  respondentCount: number;
  mean: number;
  standardDeviation: number;
  interpretation: VerbalInterpretation;
  characteristicMeans: Record<string, number>;
}

export interface IsoEvaluationSummary {
  totalRespondents: number;
  grandMean: number;
  grandStandardDeviation: number;
  overallInterpretation: VerbalInterpretation;
  characteristics: CharacteristicStatistic[];
  roleBreakdown: RoleGroupScore[];
  hasUserEvaluated: boolean;
  userExistingRating?: Record<string, number> | null;
}

// ─── Objective 3: Operational Workflow Metrics Types ─────────────────────────

export interface WorkflowOperationalMetrics {
  avgManuscriptTurnaroundDays: number;
  avgRevisionsBeforePass: number;
  totalAnnotationsLogged: number;
  annotationResolutionRate: number; // percentage (e.g. 94.5%)
  panelConsensusVariance: number;
  totalVerdictsReleased: number;
}
