#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse, os
from lib.mogg import reencrypt_mogg


def mogg_encrypt(
    dec_path: str, enc_path: str, use_ps3: bool, use_red: bool, enc_version: int
) -> None:
    dec_in = open(dec_path, "rb")
    enc_out = open(enc_path, "wb")

    enc = reencrypt_mogg(not use_ps3, use_red, enc_version, dec_in, enc_out)
    return


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: MOGG Encryptor",
        epilog="By Ruggery Iury Corrêa, using LocalH's moggulator library.\nhttps://github.com/LocalH/moggulator/tree/master",
    )
    parser.add_argument("dec_path", help="The decrypted MOGG file path", type=str)
    parser.add_argument("enc_path", help="The encrypted MOGG file path", type=str)
    parser.add_argument(
        "-ps3",
        "--use-ps3",
        help="Use PS3 keys to encrypt",
        action=argparse.BooleanOptionalAction,
        type=bool,
        default=False,
    )
    parser.add_argument(
        "-red",
        "--use-red",
        help="Use Red keys to encrypt",
        action=argparse.BooleanOptionalAction,
        type=bool,
        default=False,
    )
    parser.add_argument(
        "-v", "--enc-version", help="Use Red keys to encrypt", type=int, default=11
    )

    arg = parser.parse_args()

    mogg_encrypt(arg.dec_path, arg.enc_path, arg.use_ps3, arg.use_red, arg.enc_version)
