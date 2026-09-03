from pydantic import BaseModel, Field, constr

class Stats(BaseModel):
    kampung_count: int
    leader_count: int
    pending_reports: int
    open_issues: int

class KampungSummary(BaseModel):
    id: str
    name: constr(min_length=1, max_length=100)
    mukim_id: str | None
    mukim_name: str | None
    b40_count: int
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class KampungDetail(KampungSummary):
    resident_count: int

class LeaderSummary(BaseModel):
    id: str
    name: constr(min_length=1, max_length=100)
    ic_no: str | None = None
    type: constr(pattern=r'^(ketua_kampung|penghulu|ketua_masyarakat)$')
    kampung_id: str | None
    kampung_name: str | None
    tarikh_lantikan: str | None
    photo_url: str | None
    parti_lantikan: str | None
    parti_terkini: str | None
    mukim_name: str | None = None
    phone: constr(pattern=r'^[\d\s+-]+$') | None = None

class LeaderDetail(LeaderSummary):
    evaluation_count: int = 0
    address: str | None = None
    poskod: str | None = None
    tarikh_lahir: str | None = None
    pekerjaan_utama: str | None = None
    pekerjaan_sampingan: str | None = None
    tahap_pendidikan: str | None = None
    tanggungan: int | None = None
    kegiatan_masyarakat: str | None = None
    pengalaman_kursus: str | None = None
    kampung_rangkaian: str | None = None

class ReportSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    period: constr(min_length=1, max_length=20)
    status: constr(pattern=r'^(draft|submitted|late)$')
    submitted_at: str | None

class ReportDetail(ReportSummary):
    content: str | None

class IssueSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    type: str | None
    location: str | None
    description: str | None
    ai_category: str | None
    status: constr(pattern=r'^(open|in_progress|resolved|closed)$')
    coords: str | None = None

class IssueDetail(IssueSummary):
    pass

class EvaluationSummary(BaseModel):
    id: str
    leader_id: str
    leader_name: str | None
    period: str | None
    total: float | None
    ulasan: str | None

class EvaluationDetail(EvaluationSummary):
    scores: dict
    keupayaan_ulasan: str | None = None
    potensi_ulasan: str | None = None
    penilai_nama: str | None = None
    penilai_no_kad: str | None = None
    penilai_jawatan: str | None = None
    penilai_lama_mengenali: str | None = None
    penilai_tarikh: str | None = None
    penilai_semula_nama: str | None = None
    penilai_semula_no_kad: str | None = None
    penilai_semula_jawatan: str | None = None
    penilai_semula_tarikh: str | None = None

class IssueCreate(BaseModel):
    kampung_id: str
    type: str | None = None
    location: str | None = None
    description: str | None = None
    coords: str | None = None

class IssueUpdate(BaseModel):
    status: constr(pattern=r'^(open|in_progress|resolved|closed)$') | None = None
    type: str | None = None
    location: str | None = None
    description: str | None = None
    ai_category: str | None = None
    coords: str | None = None

class ReportCreate(BaseModel):
    kampung_id: str
    period: constr(min_length=1, max_length=20)
    content: str | None = None

class ReportUpdate(BaseModel):
    content: str | None = None
    status: constr(pattern=r'^(draft|submitted|late)$') | None = None

class StatusCount(BaseModel):
    status: str
    count: int

class StatsExtended(Stats):
    issues_by_status: list[StatusCount]
    reports_by_status: list[StatusCount]

class InsightsResponse(BaseModel):
    insights: list[str]

class ReportSummaryAI(BaseModel):
    summary: str | None

class EvaluationCreate(BaseModel):
    leader_id: str
    period: constr(min_length=1, max_length=20)
    scores: dict[str, float] = {}
    ulasan: str | None = None
    keupayaan_ulasan: str | None = None
    potensi_ulasan: str | None = None
    penilai_nama: str | None = None
    penilai_no_kad: str | None = None
    penilai_jawatan: str | None = None
    penilai_lama_mengenali: str | None = None
    penilai_tarikh: str | None = None
    penilai_semula_nama: str | None = None
    penilai_semula_no_kad: str | None = None
    penilai_semula_jawatan: str | None = None
    penilai_semula_tarikh: str | None = None

class EvaluationUpdate(BaseModel):
    scores: dict[str, float] | None = None
    ulasan: str | None = None
    keupayaan_ulasan: str | None = None
    potensi_ulasan: str | None = None
    penilai_nama: str | None = None
    penilai_no_kad: str | None = None
    penilai_jawatan: str | None = None
    penilai_lama_mengenali: str | None = None
    penilai_tarikh: str | None = None
    penilai_semula_nama: str | None = None
    penilai_semula_no_kad: str | None = None
    penilai_semula_jawatan: str | None = None
    penilai_semula_tarikh: str | None = None

class LeaderCreate(BaseModel):
    name: constr(min_length=1, max_length=100)
    type: constr(pattern=r'^(ketua_kampung|penghulu|ketua_masyarakat)$')
    kampung_id: str | None = None
    ic_no: str | None = None
    tarikh_lantikan: str | None = None
    photo_url: str | None = None
    parti_lantikan: str | None = None
    parti_terkini: str | None = None

class LeaderUpdate(BaseModel):
    name: constr(min_length=1, max_length=100) | None = None
    type: constr(pattern=r'^(ketua_kampung|penghulu|ketua_masyarakat)$') | None = None
    kampung_id: str | None = None
    ic_no: str | None = None
    tarikh_lantikan: str | None = None
    photo_url: str | None = None
    parti_lantikan: str | None = None
    parti_terkini: str | None = None
    phone: constr(pattern=r'^[\d\s+-]+$') | None = None
    address: str | None = None
    poskod: str | None = None
    tarikh_lahir: str | None = None
    pekerjaan_utama: str | None = None
    pekerjaan_sampingan: str | None = None
    tahap_pendidikan: str | None = None
    tanggungan: int | None = None
    kegiatan_masyarakat: str | None = None
    pengalaman_kursus: str | None = None
    kampung_rangkaian: str | None = None

class KampungCreate(BaseModel):
    name: constr(min_length=1, max_length=100)
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class KampungUpdate(BaseModel):
    name: constr(min_length=1, max_length=100) | None = None
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class MukimOption(BaseModel):
    id: str
    name: constr(min_length=1, max_length=100)

class RecategorizeResponse(BaseModel):
    status: str
    issue_id: str

class ResidentSummary(BaseModel):
    id: str
    kampung_id: str | None
    name: constr(min_length=1, max_length=100) | None
    ic_no: str | None
    phone: constr(pattern=r'^[\d\s+-]+$') | None
    b40_status: bool
    address: str | None

class ResidentCreate(BaseModel):
    kampung_id: str | None = None  # ignored; kampung_id comes from URL path
    name: constr(min_length=1, max_length=100)
    ic_no: str | None = None
    phone: constr(pattern=r'^[\d\s+-]+$') | None = None
    b40_status: bool = False
    address: str | None = None

class ResidentUpdate(BaseModel):
    name: constr(min_length=1, max_length=100) | None = None
    ic_no: str | None = None
    phone: constr(pattern=r'^[\d\s+-]+$') | None = None
    b40_status: bool | None = None
    address: str | None = None

class AuditLogEntry(BaseModel):
    id: str
    actor_id: str | None
    actor_email: str | None
    actor_role: str | None
    action: str
    entity: str
    entity_id: str | None
    details: dict | None
    created_at: str


# ── JPKK Schemas ──────────────────────────────────────────────────────────────

JPKK_BUREAUS = [
    "Pengerusi", "Setiausaha",
    "Biro Pembangunan Prasarana", "Biro Keselamatan Dan Kesihatan",
    "Biro Pengurusan Kewangan", "Biro Ekonomi Dan Keusahawanan",
    "Biro Kesejahteraan Dan Keceriaan", "Biro Pendidikan Dan Inovasi",
    "Biro Pemantapan Spiritual", "Biro Kebajikan Dan Kesukarelawan",
    "Biro Belia Sukan Dan Ngo", "Biro Infrastruktur Dan Komunikasi",
    "Biro Hal Ehwal Wanita Dan Keluarga",
]

class JpkkBankSummary(BaseModel):
    id: str
    kampung_id: str
    kampung_name: str | None = None
    account_name: str | None = None
    account_no: str | None = None
    bank_name: str | None = None

class JpkkBankUpdate(BaseModel):
    account_name: str | None = None
    account_no: str | None = None
    bank_name: str | None = None

class JpkkMemberSummary(BaseModel):
    id: str
    kampung_id: str
    name: constr(min_length=1, max_length=100)
    ic_no: str | None = None
    bureau: str
    phone: str | None = None
    is_active: bool = True

class JpkkMemberCreate(BaseModel):
    kampung_id: str
    name: constr(min_length=1, max_length=100)
    ic_no: str | None = None
    bureau: str
    phone: str | None = None

class JpkkMemberUpdate(BaseModel):
    name: constr(min_length=1, max_length=100) | None = None
    ic_no: str | None = None
    bureau: str | None = None
    phone: str | None = None
    is_active: bool | None = None

class JpkkMeetingSummary(BaseModel):
    id: str
    kampung_id: str
    kampung_name: str | None = None
    meeting_number: int
    meeting_year: int
    meeting_date: str
    meeting_venue: str | None = None
    status: str
    attendee_count: int = 0

class JpkkMeetingDetail(JpkkMeetingSummary):
    minutes_text: str | None = None
    agenda_json: list[dict] | None = None
    attendees: list[dict] = []

class JpkkMeetingCreate(BaseModel):
    kampung_id: str
    meeting_number: int
    meeting_year: int
    meeting_date: str
    meeting_venue: str | None = None

class JpkkMeetingUpdate(BaseModel):
    meeting_date: str | None = None
    meeting_venue: str | None = None
    minutes_text: str | None = None
    agenda_json: list[dict] | None = None
    status: constr(pattern=r'^(planned|conducted|claimed)$') | None = None

class JpkkAttendanceUpdate(BaseModel):
    member_id: str
    attended: bool

class JpkkClaimSummary(BaseModel):
    id: str
    meeting_id: str
    meeting_date: str | None = None
    kampung_id: str
    kampung_name: str | None = None
    claim_type: str
    total_amount: float
    status: str
    submitted_at: str | None = None

class JpkkClaimDetail(JpkkClaimSummary):
    notes: str | None = None
    approved_at: str | None = None

class JpkkClaimCreate(BaseModel):
    meeting_id: str
    kampung_id: str
    claim_type: constr(pattern=r'^(chairperson|attendance)$')
    notes: str | None = None

class JpkkClaimUpdate(BaseModel):
    status: constr(pattern=r'^(draft|submitted|approved|rejected)$') | None = None
    notes: str | None = None