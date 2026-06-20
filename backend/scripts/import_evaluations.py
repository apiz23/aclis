from __future__ import annotations
import re
import openpyxl
from scripts.supabase_writer import SupabaseWriter

_SCORE_FIELDS = [
    "Akhlak", "Mutu Kerja", "Minat", "Kebolehpercayaan",
    "Komunikasi", "Inisiatif",
]

_COL_MAP = {
    "no ic":    "ic_no",
    "no. ic":   "ic_no",
    "ic":       "ic_no",
    "tempoh":   "period",
    "jumlah":   "total",
    "ulasan":   "ulasan",
}
# Score columns mapped individually below


def _map_headers(row: tuple) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, cell in enumerate(row):
        if cell is None:
            continue
        text = str(cell).strip().lower()
        for key, field in _COL_MAP.items():
            if key in text and field not in mapping:
                mapping[field] = idx
                break
        # Score columns: exact (case-insensitive) match
        for score in _SCORE_FIELDS:
            if text == score.lower() and f"score_{score}" not in mapping:
                mapping[f"score_{score}"] = idx
    return mapping


def parse_evaluations_file(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)

    header_map: dict[str, int] = {}
    for row in rows_iter:
        m = _map_headers(row)
        if "ic_no" in m:
            header_map = m
            break

    results = []
    for row in rows_iter:
        if all(v is None or str(v).strip() == "" for v in row):
            continue
        def get(field: str):
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return None
            return row[idx]
        ic_raw = str(get("ic_no") or "").strip()
        if not ic_raw:
            continue
        ic_norm = re.sub(r"[\-\s]", "", ic_raw)
        scores = {
            sf: (get(f"score_{sf}") if get(f"score_{sf}") is not None else 0)
            for sf in _SCORE_FIELDS
        }
        results.append({
            "ic_no":  ic_norm,
            "period": str(get("period") or "").strip(),
            "scores": scores,
            "total":  get("total"),
            "ulasan": str(get("ulasan") or "").strip(),
        })
    wb.close()
    return results


def import_evaluations(
    xlsx_path: str,
    writer: SupabaseWriter,
    leader_id_map: dict[str, str],
) -> int:
    """
    Import evaluations from xlsx. leader_id_map: {ic_no: aclis_leader.id}.
    Returns count inserted.
    """
    rows = parse_evaluations_file(xlsx_path)
    count = 0
    for row in rows:
        leader_id = leader_id_map.get(row["ic_no"])
        if leader_id is None:
            print(f"  [skip] eval: unknown leader IC=<redacted>")
            continue
        payload = {
            "leader_id": leader_id,
            "period":    row["period"],
            "scores":    row["scores"],
            "total":     row["total"],
            "ulasan":    row["ulasan"],
        }
        if writer._dry_run:
            print(f"  [dry-run] insert aclis_evaluation leader_id={leader_id}")
        else:
            writer._client.table("aclis_evaluation").insert(payload).execute()
        count += 1
    return count
