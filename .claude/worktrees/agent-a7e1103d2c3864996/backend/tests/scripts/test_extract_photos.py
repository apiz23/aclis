from scripts.extract_photos import extract_photos, attach_photos
from scripts.parse_xlsx import parse_leaders_file


def test_extract_photos_finds_image(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    assert len(photos) == 1, "Should find exactly 1 embedded image in BENUT sheet"


def test_extract_photos_maps_to_row(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    # Image was anchored at H2 → row 2
    assert 2 in photos


def test_extract_photos_returns_bytes(leaders_xlsx):
    photos = extract_photos(leaders_xlsx, "BENUT")
    row2_bytes = photos[2]
    assert isinstance(row2_bytes, bytes)
    assert len(row2_bytes) > 0


def test_extract_photos_empty_sheet(leaders_xlsx):
    # SKIP_SHEET has no images
    photos = extract_photos(leaders_xlsx, "SKIP_SHEET")
    assert photos == {}


def test_attach_photos_sets_photo_bytes(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    updated = attach_photos(leaders, leaders_xlsx, "BENUT")
    # Ahmad (source_row=2) should have photo_bytes; Siti (row 3) should not
    ahmad = next(l for l in updated if l.name == "Ahmad bin Ali")
    siti = next(l for l in updated if l.name == "Siti binti Bakar")
    assert ahmad.photo_bytes is not None
    assert siti.photo_bytes is None
