from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class MukimRow:
    name: str
    parlimen: str = ""
    dun: str = ""


@dataclass
class KampungRow:
    name: str
    mukim_name: str
    profile: str = ""
    b40_count: int = 0


@dataclass
class LeaderRow:
    name: str
    ic_no: str                       # normalized: exactly 12 digits, no hyphens
    type: str                        # 'ketua_kampung' or 'penghulu'
    kampung_name: str
    mukim_name: str
    tarikh_lantikan: str | None = None   # ISO 'YYYY-MM-DD' or None
    parti_lantikan: str = ""
    parti_terkini: str = ""
    photo_bytes: bytes | None = None
    photo_url: str | None = None     # set after Storage upload; written to DB
    source_row: int = 0              # 1-indexed xlsx row, used for photo matching


@dataclass
class RejectRow:
    source_file: str
    sheet: str
    row_num: int
    reason: str
    raw_data: str
