#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse, os
from lib.mogg import decrypt_mogg


def mogg_decrypt(enc_path: str, dec_path: str):
    enc_in = open(enc_path, "rb")
    dec_out = open(dec_path, "wb")

    xbox_green_failed = decrypt_mogg(True, False, enc_in, dec_out)
    # Might need PS3 and red keys implementation
    return


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: MOGG Decryptor",
        epilog="By Ruggery Iury Corrêa, using LocalH's moggulator library.\nhttps://github.com/LocalH/moggulator/tree/master",
    )
    parser.add_argument("enc_path", help="The encrypted MOGG file path", type=str)
    parser.add_argument("dec_path", help="The decrypted MOGG file path", type=str)

    arg = parser.parse_args()

    mogg_decrypt(arg.enc_path, arg.dec_path)
