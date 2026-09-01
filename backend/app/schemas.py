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

class EvaluationUpdate(BaseModel):
    scores: dict[str, float] | None = None
    ulasan: str | None = None

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