#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse, json, os
from PIL import Image
import puremagic
from typing import TypedDict


class ImgFileStat(TypedDict):
    dimensions: int
    ext: str
    extDesc: str
    imageMode: str
    height: int
    mimeType: str
    size: int
    width: int


def img_file_stat(img_file_path: str) -> ImgFileStat:
    try:
        magic = None
        with open(img_file_path, "rb") as img:
            magic = puremagic.magic_string(img.read(64))[0]
        with Image.open(img_file_path) as image:
            return {
                "dimensions": image.size,
                "ext": magic.extension,
                "extDesc": magic.name,
                "imageMode": image.mode,
                "height": image.height,
                "mimeType": magic.mime_type,
                "size": os.path.getsize(img_file_path),
                "width": image.width,
            }
    except Exception as e:
        raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: Image File Stat", epilog="By Ruggery Iury Corrêa."
    )
    parser.add_argument("img_file_path", help="The path to the image file", type=str)
    parser.add_argument(
        "-p",
        "--print-results",
        help="Prints the results to stdout",
        action=argparse.BooleanOptionalAction,
        default=False,
    )

    arg = parser.parse_args()

    status = img_file_stat(arg.img_file_path)
    if arg.print_results:
        print(json.dumps(status, ensure_ascii=False))
