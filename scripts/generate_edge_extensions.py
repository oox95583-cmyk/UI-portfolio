from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def build_horizontal(
    image: Image.Image,
    crop_box: tuple[int, int, int, int],
    output_width: int,
    blur_radius: int,
    color_factor: float,
    brightness_factor: float,
) -> Image.Image:
    _, _, _, height = crop_box
    sample = image.crop(crop_box)
    stretched = sample.resize((output_width, height), Image.Resampling.LANCZOS)
    stretched = ImageEnhance.Color(stretched).enhance(color_factor)
    stretched = ImageEnhance.Brightness(stretched).enhance(brightness_factor)
    return stretched.filter(ImageFilter.GaussianBlur(radius=blur_radius))


def build_vertical(
    image: Image.Image,
    edge: str,
    sample_height: int,
    output_height: int,
    blur_radius: int,
    color_factor: float,
    brightness_factor: float,
) -> Image.Image:
    width, height = image.size
    if edge == "top":
        sample = image.crop((0, 0, width, sample_height))
    else:
        sample = image.crop((0, height - sample_height, width, height))

    stretched = sample.resize((width, output_height), Image.Resampling.LANCZOS)
    stretched = ImageEnhance.Color(stretched).enhance(color_factor)
    stretched = ImageEnhance.Brightness(stretched).enhance(brightness_factor)
    return stretched.filter(ImageFilter.GaussianBlur(radius=blur_radius))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="assets/cover.png")
    parser.add_argument("--prefix", default="")
    args = parser.parse_args()

    source = ROOT / args.source
    prefix = f"{args.prefix}-" if args.prefix else ""

    image = Image.open(source).convert("RGB")
    width, height = image.size

    left = build_horizontal(
        image=image,
        crop_box=(0, 0, 44, height),
        output_width=900,
        blur_radius=24,
        color_factor=0.82,
        brightness_factor=0.965,
    )
    right = build_horizontal(
        image=image,
        crop_box=(width - 44, 0, width, height),
        output_width=900,
        blur_radius=26,
        color_factor=0.8,
        brightness_factor=0.96,
    )
    top = build_vertical(
        image=image,
        edge="top",
        sample_height=int(height * 0.11),
        output_height=700,
        blur_radius=18,
        color_factor=0.88,
        brightness_factor=0.975,
    )
    bottom = build_vertical(
        image=image,
        edge="bottom",
        sample_height=int(height * 0.14),
        output_height=700,
        blur_radius=20,
        color_factor=0.84,
        brightness_factor=0.96,
    )

    left.save(ASSETS / f"{prefix}extend-left.png", optimize=True)
    right.save(ASSETS / f"{prefix}extend-right.png", optimize=True)
    top.save(ASSETS / f"{prefix}extend-top.png", optimize=True)
    bottom.save(ASSETS / f"{prefix}extend-bottom.png", optimize=True)


if __name__ == "__main__":
    main()
