#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse, json, os, struct, tempfile
from lib.mogg import decrypt_mogg_bytes
from pydub.utils import mediainfo
from typing import TypedDict


class MOGGStatObject(TypedDict):
    size: int
    version: int
    isEncrypted: bool
    worksInPS3: bool


class MOGGFileStat(TypedDict):
    bitRate: int
    channels: int
    codec: str
    codecDesc: str
    duration: int
    durationSec: float
    ext: str
    extDesc: str
    sampleRate: int
    size: int
    mogg: MOGGStatObject


def mogg_file_stat(mogg_file_path: str) -> MOGGFileStat:
    with open(mogg_file_path, "rb") as fin:
        version = struct.unpack("<I", fin.read(4))[0]
        fin.seek(0)
        ogg_bytes = decrypt_mogg_bytes(True, False, fin.read())
        temp_ogg = tempfile.NamedTemporaryFile(delete=False, suffix=".ogg")
        try:
            temp_ogg.write(ogg_bytes)
            temp_ogg.flush()
            audio = mediainfo(temp_ogg.name)

            return {
                "bitRate": int(audio["bit_rate"]),
                "channels": int(audio["channels"]),
                "codec": audio["codec_name"],
                "codecDesc": audio["codec_long_name"],
                "duration": int(float(audio["duration"]) * 1000),
                "durationSec": float(audio["duration"]),
                "ext": audio["format_name"],
                "extDesc": audio["format_long_name"],
                "sampleRate": int(audio["sample_rate"]),
                "size": int(audio["size"]),
                "mogg": {
                    "size": os.path.getsize(mogg_file_path),
                    "version": version,
                    "isEncrypted": version != 10,
                    "worksInPS3": version == 11,
                },
            }
        except Exception as e:
            temp_ogg.close()
            os.unlink(temp_ogg.name)
            raise e
        finally:
            temp_ogg.close()
            os.unlink(temp_ogg.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: MOGG File Stat", epilog="By Ruggery Iury Corrêa."
    )
    parser.add_argument("mogg_file_path", help="The path to the MOGG file", type=str)
    parser.add_argument(
        "-p",
        "--print-results",
        help="Prints the results to stdout",
        action=argparse.BooleanOptionalAction,
        default=False,
    )

    arg = parser.parse_args()

    status = mogg_file_stat(arg.mogg_file_path)
    if arg.print_results:
        print(json.dumps(status, ensure_ascii=False))
