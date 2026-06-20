# backend/tests/scripts/conftest.py
"""Creates in-memory synthetic xlsx fixtures — no PII, safe to commit."""
import base64
from io import BytesIO
import pytest
import openpyxl


# Minimal 1×1 white PNG (base64) — used as a fake leader photo in fixture xlsx
_TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8"
    "z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="
)
TINY_PNG: bytes = base64.b64decode(_TINY_PNG_B64)


@pytest.fixture(scope="session")
def leaders_xlsx(tmp_path_factory) -> str:
    """Synthetic leaders xlsx with two sheets:
    - BENUT: 3 valid rows + 1 reject (bad IC) + 1 embedded photo on row 2
    - SKIP_SHEET: out-of-scope, should be ignored
    """
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "leaders.xlsx"

    wb = openpyxl.Workbook()

    # BENUT sheet
    ws = wb.active
    ws.title = "BENUT"
    headers = ["No.", "Nama", "No. IC", "Kampung", "Tarikh Lantikan",
               "Parti Lantikan", "Parti Terkini"]
    ws.append(headers)
    ws.append([1, "Ahmad bin Ali", "800101-01-1234", "Kg. Bukit Benut",
               "01/01/2020", "UMNO", "UMNO"])      # row 2 — valid
    ws.append([2, "Siti binti Bakar", "9002020 21234", "Kg. Sungai Benut",
               "15/03/2018", "PKR", "PKR"])         # row 3 — valid (spaces in IC)
    ws.append([3, "Reject Row", "12345", "Kg. Test", "", "", ""])   # row 4 — bad IC

    # Embed tiny image anchored at row 2 (same row as Ahmad)
    from openpyxl.drawing.image import Image as XLImage
    img = XLImage(BytesIO(TINY_PNG))
    img.anchor = "H2"
    ws.add_image(img)

    # SKIP_SHEET — out-of-scope, should be filtered
    ws2 = wb.create_sheet("SKIP_SHEET")
    ws2.append(["No.", "Nama", "No. IC", "Kampung"])
    ws2.append([1, "Out Of Scope", "700101011234", "Kg. JB"])

    wb.save(path)
    return str(path)


@pytest.fixture(scope="session")
def issues_xlsx(tmp_path_factory) -> str:
    """Synthetic issues xlsx."""
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "issues.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["Bil", "Kampung", "Jenis", "Lokasi", "Penerangan", "Status"])
    ws.append([1, "Kg. Bukit Benut", "Lampu Jalan", "Jalan Utama", "Lampu rosak", "Baru"])
    ws.append([2, "Kg. Sungai Benut", "Jalan Rosak", "Lorong 2", "Jalan berlubang", "Baru"])
    wb.save(path)
    return str(path)


@pytest.fixture(scope="session")
def evaluations_xlsx(tmp_path_factory) -> str:
    """Synthetic evaluations xlsx."""
    tmp = tmp_path_factory.mktemp("fixtures")
    path = tmp / "evaluations.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["No IC", "Nama", "Tempoh", "Akhlak", "Mutu Kerja", "Minat",
               "Kebolehpercayaan", "Komunikasi", "Inisiatif", "Jumlah", "Ulasan"])
    ws.append(["800101011234", "Ahmad bin Ali", "2024-Q1",
               8, 7, 8, 9, 7, 8, 47, "Baik"])
    wb.save(path)
    return str(path)
