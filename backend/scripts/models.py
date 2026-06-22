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
    type: str                        # 'ketua_kampung', 'penghulu', 'ketua_masyarakat'
    kampung_name: str
    mukim_name: str
    ic_no: str | None = None         # normalized 12 digits; absent in CSV source
    tarikh_lantikan: str | None = None   # ISO 'YYYY-MM-DD' or None
    parti_lantikan: str = ""
    parti_terkini: str = ""
    phone: str = ""
    address: str = ""
    kampung_rangkaian: str = ""      # comma-separated linked kampung names
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
