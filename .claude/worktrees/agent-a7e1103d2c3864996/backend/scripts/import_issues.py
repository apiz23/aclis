from __future__ import annotations
import openpyxl
from scripts.supabase_writer import SupabaseWriter

# Column name fragments for the issues xlsx (case-insensitive)
_COL_MAP = {
    "kampung": "kampung_name",
    "kg.":     "kampung_name",
    "jenis":   "type",
    "lokasi":  "location",
    "kordinat": "coords",
    "penerangan": "description",
    "status":  "status",
}


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
    return mapping


def parse_issues_file(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)

    header_map: dict[str, int] = {}
    for row in rows_iter:
        m = _map_headers(row)
        if "kampung_name" in m or "type" in m:
            header_map = m
            break

    results = []
    for row in rows_iter:
        if all(v is None or str(v).strip() == "" for v in row):
            continue
        def get(field: str) -> str:
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return ""
            return str(row[idx] or "").strip()
        kampung = get("kampung_name")
        if not kampung:
            continue
        results.append({
            "kampung_name": kampung,
            "type":         get("type"),
            "location":     get("location"),
            "coords":       get("coords"),
            "description":  get("description"),
            "status":       get("status") or "open",
            "ai_category":  None,
        })
    wb.close()
    return results


def import_issues(
    xlsx_path: str,
    writer: SupabaseWriter,
    kampung_id_map: dict[str, str],
) -> int:
    """
    Import issues from xlsx. kampung_id_map: {kampung_name: aclis_kampung.id}.
    Returns count of rows inserted (or dry-run logged).
    """
    rows = parse_issues_file(xlsx_path)
    count = 0
    for row in rows:
        kampung_id = kampung_id_map.get(row["kampung_name"])
        if kampung_id is None:
            print(f"  [skip] issue: unknown kampung {row['kampung_name']!r}")
            continue
        payload = {k: v for k, v in row.items() if k != "kampung_name"}
        payload["kampung_id"] = kampung_id
        if writer._dry_run:
            print(f"  [dry-run] insert aclis_issue kampung_id={kampung_id}")
        else:
            writer._client.table("aclis_issue").insert(payload).execute()
        count += 1
    return count
