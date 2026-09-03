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
  poskod: string | null;
  tarikh_lahir: string | null;
  pekerjaan_utama: string | null;
  pekerjaan_sampingan: string | null;
  tahap_pendidikan: string | null;
  tanggungan: number | null;
  kegiatan_masyarakat: string | null;
  pengalaman_kursus: string | null;
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
  keupayaan_ulasan: string | null;
  potensi_ulasan: string | null;
  penilai_nama: string | null;
  penilai_no_kad: string | null;
  penilai_jawatan: string | null;
  penilai_lama_mengenali: string | null;
  penilai_tarikh: string | null;
  penilai_semula_nama: string | null;
  penilai_semula_no_kad: string | null;
  penilai_semula_jawatan: string | null;
  penilai_semula_tarikh: string | null;
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

// JPKK Types
export interface JpkkBankSummary {
  id: string;
  kampung_id: string;
  kampung_name: string | null;
  account_name: string | null;
  account_no: string | null;
  bank_name: string | null;
}

export interface JpkkMemberSummary {
  id: string;
  kampung_id: string;
  name: string;
  ic_no: string | null;
  bureau: string;
  phone: string | null;
  is_active: boolean;
}

export interface JpkkMeetingSummary {
  id: string;
  kampung_id: string;
  kampung_name: string | null;
  meeting_number: number;
  meeting_year: number;
  meeting_date: string;
  meeting_venue: string | null;
  status: string;
  attendee_count: number;
}

export interface JpkkMeetingDetail extends JpkkMeetingSummary {
  minutes_text: string | null;
  agenda_json: Array<{ item: string; action: string }> | null;
  attendees: Array<{
    id: string;
    member_id: string;
    attended: boolean;
    name: string | null;
    bureau: string | null;
    ic_no: string | null;
  }>;
}

export interface JpkkClaimSummary {
  id: string;
  meeting_id: string;
  meeting_date: string | null;
  kampung_id: string;
  kampung_name: string | null;
  claim_type: string;
  total_amount: number;
  status: string;
  submitted_at: string | null;
}

export interface JpkkClaimDetail extends JpkkClaimSummary {
  notes: string | null;
  approved_at: string | null;
}

export interface JpkkStats {
  member_count: number;
  meeting_count: number;
  pending_claims: number;
}
