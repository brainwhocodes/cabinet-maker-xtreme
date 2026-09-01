from pathlib import Path
import sys

from PIL import Image


ASSET_DIRECTORY = Path(__file__).resolve().parents[1] / "public" / "assembly" / "helpers"
ASSET_NAMES = (
    "pointing_guide.png",
    "measuring.png",
    "drill_safety.png",
    "check_square.png",
    "two_person_lift.png",
    "completion_check.png",
)
EXPECTED_SIZE = (1024, 1024)
MINIMUM_COVERAGE = 0.10
MAXIMUM_COVERAGE = 0.65


def fail(path: Path, rule: str) -> None:
    print(f"{path.name}: {rule}", file=sys.stderr)
    raise SystemExit(1)


def validate_asset(path: Path) -> None:
    if not path.is_file():
        fail(path, "file is missing")

    try:
        with Image.open(path) as image:
            image.load()
            if image.size != EXPECTED_SIZE:
                fail(path, f"size is {image.size}, expected {EXPECTED_SIZE}")
            if image.mode != "RGBA":
                fail(path, f"mode is {image.mode}, expected RGBA")

            pixels = list(image.get_flattened_data())
    except (OSError, ValueError) as error:
        fail(path, f"cannot decode PNG ({error})")

    width, height = EXPECTED_SIZE
    corners = (
        pixels[0],
        pixels[width - 1],
        pixels[(height - 1) * width],
        pixels[height * width - 1],
    )
    if any(pixel[3] != 0 for pixel in corners):
        fail(path, "all four corner alpha values must be 0")

    nontransparent = sum(1 for pixel in pixels if pixel[3] > 0)
    coverage = nontransparent / len(pixels)
    if not MINIMUM_COVERAGE <= coverage <= MAXIMUM_COVERAGE:
        fail(
            path,
            f"nontransparent coverage is {coverage:.2%}, expected 10% to 65%",
        )

    if any(
        green > 220 and red < 80 and blue < 80 and alpha > 32
        for red, green, blue, alpha in pixels
    ):
        fail(path, "opaque chroma-key green pixel remains")


def main() -> None:
    for asset_name in ASSET_NAMES:
        validate_asset(ASSET_DIRECTORY / asset_name)
    print(f"Validated {len(ASSET_NAMES)} helper PNG assets.")


if __name__ == "__main__":
    main()
