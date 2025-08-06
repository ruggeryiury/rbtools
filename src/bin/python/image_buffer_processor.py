#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import sys, json, base64
from io import BytesIO
from typing import Literal
from PIL import Image


def image_buffer_processor(
    img_base64: str,
    format: str,
    width: int = 256,
    height: int = 256,
    interpolation: Literal[
        "NEAREST", "BOX", "BILINEAR", "HAMMING", "BICUBIC", "LANCZOS"
    ] = "LANCZOS",
    quality: int = 100,
) -> str:
    """
    Process a Base64-encoded image "buffer".

    Args:
        img_base64 (str): An image "buffer" encoded as Base64 string.
        format (str): The image format where the processed "buffer" will be encoded.
        width (int): The output width of the image "buffer". Default is `256`.
        height (int): The output height of the image "buffer". Default is `256`.
        interpolation (Literal["NEAREST", "BOX", "BILINEAR", "HAMMING", "BICUBIC", "LANCZOS"]): The interpolation method that will be used if the image should be resized. Default is `"LANCZOS"`.
        quality (int): The output quality of the image "buffer", used with lossy image formats. Default is `100` (highest quality possible).

    Returns:
        str: A processed image "buffer" encoded as a Base64 string.
    """
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
