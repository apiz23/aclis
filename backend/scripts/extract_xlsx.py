"""
Extract all data and embedded photos from ID KKG UBAH BETUL .xlsx.

Output structure:
  extracted/
    data/
      <SheetName>.csv       — one CSV per sheet
      summary.txt           — sheet list + row counts + photo count
    photos/
      image001.jpg          — raw embedded images (original extension)
      image_map.csv         — image index → anchor row (best effort)
"""

import sys
import os
import zipfile
import shutil
import json
from pathlib import Path

import pandas as pd
import openpyxl

XLSX_PATH = Path(__file__).parent.parent.parent / "ID KKG UBAH BETUL .xlsx"
OUT_DIR   = Path(__file__).parent.parent.parent / "extracted"
DATA_DIR  = OUT_DIR / "data"
PHOTO_DIR = OUT_DIR / "photos"


# -- helpers ------------------------------------------------------------------

def clean_sheet_name(name: str) -> str:
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip()


def extract_images(xlsx_path: Path, photo_dir: Path) -> list[dict]:
    """Pull every file from xl/media/ inside the xlsx zip."""
    records = []
    with zipfile.ZipFile(xlsx_path) as z:
        media = [n for n in z.namelist() if n.startswith("xl/media/")]
        for i, name in enumerate(sorted(media), 1):
            ext = Path(name).suffix or ".bin"
            dest_name = f"image{i:03d}{ext}"
            dest = photo_dir / dest_name
            with z.open(name) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)
            records.append({"index": i, "original_zip_path": name, "saved_as": dest_name})
    return records


def extract_image_anchors(xlsx_path: Path) -> dict[str, list[dict]]:
    """
    For each sheet, collect image anchor info (row/col of top-left cell).
    Uses openpyxl's internal _images list.
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    anchors: dict[str, list[dict]] = {}
    for ws in wb.worksheets:
        sheet_anchors = []
        for img in getattr(ws, "_images", []):
            anchor = getattr(img, "anchor", None)
            row, col = None, None
            if hasattr(anchor, "_from"):
                row = anchor._from.row + 1   # 0-indexed → 1-indexed
                col = anchor._from.col + 1
            elif hasattr(anchor, "row"):
                row = anchor.row
                col = anchor.col
            sheet_anchors.append({
                "sheet": ws.title,
                "anchor_row": row,
                "anchor_col": col,
            })
        if sheet_anchors:
            anchors[ws.title] = sheet_anchors
    wb.close()
    return anchors


def _find_header_row(df_raw: pd.DataFrame) -> int:
    """
    Find the 0-indexed row where real column headers live.
    Looks for a row where any cell contains 'BIL' or 'NAMA' (case-insensitive).
    Falls back to 0.
    """
    for i, row in df_raw.iterrows():
        vals = [str(v).strip().upper() for v in row if pd.notna(v)]
        if any(v in ("BIL", "NAMA", "NO.") for v in vals):
            return int(i)
    return 0


def extract_data(xlsx_path: Path, data_dir: Path) -> list[dict]:
    """
    Read every sheet with pandas and save two versions per sheet:
      - <Sheet>.csv      — raw full sheet (all rows)
      - <Sheet>_clean.csv — data-only with real column headers, empty rows dropped
    """
    xl = pd.ExcelFile(xlsx_path)
    sheet_info = []
    for sheet_name in xl.sheet_names:
        try:
            safe = clean_sheet_name(sheet_name)

            # Raw — keep everything
            df_raw = xl.parse(sheet_name, header=None)
            csv_path = data_dir / f"{safe}.csv"
            df_raw.to_csv(csv_path, index=False, header=False, encoding="utf-8-sig")

            # Clean — detect real header row, skip preamble
            hdr = _find_header_row(df_raw)
            if hdr > 0:
                df_clean = xl.parse(sheet_name, skiprows=hdr)
                # Drop fully-empty rows and columns
                df_clean.dropna(how="all", inplace=True)
                df_clean.dropna(axis=1, how="all", inplace=True)
                # Drop rows where the first meaningful column is NaN or blank
                first_col = df_clean.columns[0]
                df_clean = df_clean[df_clean[first_col].notna()]
                clean_path = data_dir / f"{safe}_clean.csv"
                df_clean.to_csv(clean_path, index=False, encoding="utf-8-sig")
                data_rows = len(df_clean)
                note = f"header row {hdr}, {data_rows} data rows"
            else:
                clean_path = None
                data_rows = len(df_raw)
                note = "no clear header detected"

            sheet_info.append({
                "sheet": sheet_name,
                "rows": data_rows,
                "cols": len(df_raw.columns),
                "header_row": hdr,
                "saved_as": csv_path.name,
                "clean": clean_path.name if clean_path else None,
            })
            print(f"  [data] {sheet_name!r:40s}  {data_rows:>4} rows  ({note}) → {csv_path.name}")
        except Exception as e:
            print(f"  [WARN] {sheet_name!r}: {e}")
            sheet_info.append({"sheet": sheet_name, "error": str(e)})
    return sheet_info


# -- main --------------------------------------------------------------------─

def main():
    if not XLSX_PATH.exists():
        print(f"ERROR: file not found: {XLSX_PATH}")
        sys.exit(1)

    print(f"Source : {XLSX_PATH} ({XLSX_PATH.stat().st_size / 1_048_576:.1f} MB)")

    # Fresh output dir
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    DATA_DIR.mkdir(parents=True)
    PHOTO_DIR.mkdir(parents=True)

    # 1. Extract sheet data
    print("\n-- Extracting sheet data --")
    sheet_info = extract_data(XLSX_PATH, DATA_DIR)

    # 2. Extract raw images
    print("\n-- Extracting embedded photos --")
    images = extract_images(XLSX_PATH, PHOTO_DIR)
    print(f"  Found {len(images)} embedded media file(s)")

    # 3. Image anchor map (best-effort row correlation)
    print("\n-- Reading image anchor positions --")
    # Build actual filename list from extracted photos (in zip order)
    actual_files = sorted([f.name for f in PHOTO_DIR.iterdir()])

    # Sheet header offsets (Excel 1-indexed): data_row 1 = anchor_row (header_excel_row + 1)
    # header_row from extract_data is 0-indexed pandas row → Excel row = header_row + 1
    sheet_header_excel: dict[str, int] = {s["sheet"]: s.get("header_row", 0) + 1
                                           for s in sheet_info if "header_row" in s}

    try:
        anchors = extract_image_anchors(XLSX_PATH)
        anchor_rows: list[dict] = []
        img_seq = 1
        for sheet, entries in anchors.items():
            hdr_excel = sheet_header_excel.get(sheet, 5)  # default to 5 (Excel row 6 header)
            for entry in entries:
                fname = actual_files[img_seq - 1] if img_seq - 1 < len(actual_files) else f"image{img_seq:03d}.?"
                ar = entry["anchor_row"]
                # BIL = how many data rows below the header the image is anchored
                bil = (ar - hdr_excel) if (ar is not None and ar > hdr_excel) else None
                anchor_rows.append({
                    "image_index": img_seq,
                    "image_file": fname,
                    "sheet": entry["sheet"],
                    "anchor_row_excel": ar,
                    "anchor_col_excel": entry["anchor_col"],
                    "bil_estimate": bil,   # matches BIL column in clean CSV
                })
                img_seq += 1
        if anchor_rows:
            import csv
            map_path = DATA_DIR / "image_map.csv"
            with open(map_path, "w", newline="", encoding="utf-8-sig") as f:
                w = csv.DictWriter(f, fieldnames=anchor_rows[0].keys())
                w.writeheader()
                w.writerows(anchor_rows)
            print(f"  image_map.csv written ({len(anchor_rows)} entries)")
        else:
            print("  No anchor data found (images may use absolute positioning)")
    except Exception as e:
        print(f"  [WARN] anchor extraction failed: {e}")
        anchor_rows = []

    # 4. Summary
    summary_lines = [
        f"Source: {XLSX_PATH.name}",
        f"Size:   {XLSX_PATH.stat().st_size / 1_048_576:.1f} MB",
        "",
        f"Sheets ({len(sheet_info)}):",
    ]
    for s in sheet_info:
        if "error" in s:
            summary_lines.append(f"  [ERROR] {s['sheet']}: {s['error']}")
        else:
            clean_note = f"  (clean: {s['clean']})" if s.get("clean") else ""
            summary_lines.append(
                f"  {s['sheet']:40s}  {s['rows']:>4} rows  →  {s['saved_as']}{clean_note}"
            )
    summary_lines += [
        "",
        f"Photos extracted: {len(images)}",
        f"Output: {OUT_DIR}",
    ]
    summary_text = "\n".join(summary_lines)

    (DATA_DIR / "summary.txt").write_text(summary_text, encoding="utf-8")
    print("\n-- Summary --")
    print(summary_text)
    print(f"\nDone. Output folder: {OUT_DIR}")


if __name__ == "__main__":
    main()
