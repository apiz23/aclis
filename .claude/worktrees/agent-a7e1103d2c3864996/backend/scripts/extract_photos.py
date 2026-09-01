from __future__ import annotations
import openpyxl
from scripts.models import LeaderRow


def extract_photos(xlsx_path: str, sheet_name: str) -> dict[int, bytes]:
    """
    Return {1-indexed row number: raw image bytes} for all embedded images
    in the given sheet. Row index from the image anchor (_from.row is 0-indexed).
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    if sheet_name not in wb.sheetnames:
        wb.close()
        return {}

    ws = wb[sheet_name]
    result: dict[int, bytes] = {}

    for img in getattr(ws, "_images", []):
        try:
            # Both OneCellAnchor and TwoCellAnchor expose ._from.row (0-indexed)
            row_0based: int = img.anchor._from.row
            data: bytes = img._data()
            result[row_0based + 1] = data   # convert to 1-indexed
        except AttributeError:
            pass  # unrecognized anchor type — skip

    wb.close()
    return result


def attach_photos(
    leaders: list[LeaderRow],
    xlsx_path: str,
    sheet_name: str,
) -> list[LeaderRow]:
    """
    Mutate each LeaderRow.photo_bytes in-place by matching source_row to
    the extracted photo map. Returns the same list for chaining.
    """
    photos = extract_photos(xlsx_path, sheet_name)
    for leader in leaders:
        leader.photo_bytes = photos.get(leader.source_row)
    return leaders
