from pydantic import BaseModel

class Stats(BaseModel):
    kampung_count: int
    leader_count: int
    pending_reports: int
    open_issues: int

class KampungSummary(BaseModel):
    id: str
    name: str
    mukim_id: str | None
    mukim_name: str | None
    b40_count: int
    profile: str | None
    lat: float | None = None
    lng: float | None = None

class KampungDetail(KampungSummary):
    resident_count: int

class LeaderSummary(BaseModel):
    id: str
    name: str
    ic_no: str | None
    type: str
    kampung_id: str | None
    kampung_name: str | None
    tarikh_lantikan: str | None
    photo_url: str | None
    parti_lantikan: str | None
    parti_terkini: str | None

class LeaderDetail(LeaderSummary):
    mukim_name: str | None = None
    evaluation_count: int = 0
    phone: str | None = None
    address: str | None = None
    kampung_rangkaian: str | None = None

class ReportSummary(BaseModel):
    id: str
    kampung_id: str | None
    kampung_name: str | None
    period: str
    status: str
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
    status: str
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
    status: str | None = None
    type: str | None = None
    location: str | None = None
    description: str | None = None
    ai_category: str | None = None
    coords: str | None = None

class ReportCreate(BaseModel):
    kampung_id: str
    period: str
    content: str | None = None

class ReportUpdate(BaseModel):
    content: str | None = None
    status: str | None = None

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
    period: str
    scores: dict[str, float] = {}
    ulasan: str | None = None

class EvaluationUpdate(BaseModel):
    scores: dict[str, float] | None = None
    ulasan: str | None = None

class LeaderCreate(BaseModel):
    name: str
    type: str
    kampung_id: str | None = None
    ic_no: str | None = None
    tarikh_lantikan: str | None = None
    photo_url: str | None = None
    parti_lantikan: str | None = None
    parti_terkini: str | None = None

class LeaderUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    kampung_id: str | None = None
    ic_no: str | None = None
    tarikh_lantikan: str | None = None
    photo_url: str | None = None
    parti_lantikan: str | None = None
    parti_terkini: str | None = None
    phone: str | None = None
    address: str | None = None
    kampung_rangkaian: str | None = None

class KampungCreate(BaseModel):
    name: str
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class KampungUpdate(BaseModel):
    name: str | None = None
    mukim_id: str | None = None
    b40_count: int | None = None
    profile: str | None = None
    lat: float | None = None
    lng: float | None = None

class MukimOption(BaseModel):
    id: str
    name: str

class RecategorizeResponse(BaseModel):
    status: str
    issue_id: str

class ResidentSummary(BaseModel):
    id: str
    kampung_id: str | None
    name: str | None
    ic_no: str | None
    phone: str | None
    b40_status: bool
    address: str | None

class ResidentCreate(BaseModel):
    kampung_id: str | None = None  # ignored; kampung_id comes from URL path
    name: str
    ic_no: str | None = None
    phone: str | None = None
    b40_status: bool = False
    address: str | None = None

class ResidentUpdate(BaseModel):
    name: str | None = None
    ic_no: str | None = None
    phone: str | None = None
    b40_status: bool | None = None
    address: str | None = None
