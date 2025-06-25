#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import sys, json, base64
from io import BytesIO
from PIL import Image


def image_buffer_processor(
    img_base64: str,
    format: str,
    width: int = 256,
    height: int = 256,
    interpolation: str = "LANCZOS",
    quality: int = 100,
) -> str:
    image_data = BytesIO(base64.b64decode(img_base64))
    try:
        with Image.open(image_data) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")

            if img.width == width and img.height == height:
                with BytesIO() as output:
                    img.save(output, format=format.upper(), quality=quality)
                    img_data = output.getvalue()
                    img_base64_data = base64.b64encode(img_data).decode("utf-8")
                    return img_base64_data
            else:
                x, y = img.size
                size = max(width, x, y)
                new_im = Image.new("RGB", (size, size), 0)
                new_im.paste(img, (int((size - x) / 2), int((size - y) / 2)))
                new_im.thumbnail(
                    (width, height), resample=Image.Resampling[interpolation]
                )
                with BytesIO() as output:
                    new_im.save(output, format=format.upper(), quality=quality)
                    img_data = output.getvalue()
                    img_base64_data = base64.b64encode(img_data).decode("utf-8")
                    return img_base64_data
    except Exception as e:
        raise e


if __name__ == "__main__":
    stdin = sys.stdin.read()
    arg = json.loads(stdin)
    data_url = image_buffer_processor(
        arg["imgBase64"],
        arg["format"],
        arg["width"],
        arg["height"],
        arg["interpolation"],
        arg["quality"],
    )
    if arg["printResults"]:
        print(data_url)
