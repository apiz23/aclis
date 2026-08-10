export interface StatusCount {
  status: string;
  count: number;
}

export interface Stats {
  kampung_count: number;
  leader_count: number;
  pending_reports: number;
  open_issues: number;
  issues_by_status: StatusCount[];
  reports_by_status: StatusCount[];
}

export interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface KampungDetail extends KampungSummary {
  resident_count: number;
}

export interface LeaderSummary {
  id: string;
  name: string;
  ic_no: string | null;
  type: string;
  kampung_id: string | null;
  kampung_name: string | null;
  tarikh_lantikan: string | null;
  photo_url: string | null;
  parti_lantikan: string | null;
  parti_terkini: string | null;
  mukim_name: string | null;
  phone: string | null;
}

export interface LeaderDetail extends LeaderSummary {
  evaluation_count: number;
  address: string | null;
  kampung_rangkaian: string | null;
}

export interface ReportSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
}

export interface ReportDetail extends ReportSummary {
  content: string | null;
}

export interface IssueSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
  coords: string | null;
}

export interface IssueDetail extends IssueSummary {}

export interface EvaluationSummary {
  id: string;
  leader_id: string;
  leader_name: string | null;
  period: string | null;
  total: number | null;
  ulasan: string | null;
}

export interface EvaluationDetail extends EvaluationSummary {
  scores: Record<string, number>;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
