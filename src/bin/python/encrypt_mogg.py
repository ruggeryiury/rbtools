#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse
from os import PathLike
from pathlib import Path
from typing import Union, Literal
from .lib.mogg import reencrypt_mogg


def mogg_encrypt(
    dec_path: Union[str, PathLike[str]],
    enc_path: Union[str, PathLike[str]],
    use_ps3: bool = False,
    use_red: bool = False,
    enc_version: Literal[11, 12, 13] = 11,
) -> Path:
    """
    Encrypts a MOGG file.

    Args:
        dec_path (Union[str, PathLike[str]]): The path to the decrypted MOGG file.
        enc_path (Union[str, PathLike[str]]): The path where the encrypted MOGG file will be written.
        use_ps3 (bool): Use PS3 keys for encryption, used only on certain encryption versions. Default is `False`.
        use_red (bool): Use red keys for encryption, used only on certain encryption versions. Default is `False`.
        enc_version (Literal[11, 12, 13]): The encryption version that will be used to encrypt the MOGG file. Default is `11`.

    Returns:
        Path: The path to the encrypted MOGG file.
    """

    dec_path = Path(dec_path)
    enc_path = Path(enc_path)

    if not dec_path.exists():
        raise FileNotFoundError(
            f'Provided MOGG file path "{str(dec_path)}" does not exists.'
        )

    if not dec_path.is_file():
        raise TypeError(f'Provided path "{str(dec_path)}" is not a valid file path.')

    dec_in = open(dec_path, "rb")
    enc_out = open(enc_path, "wb")

    reencrypt_mogg(not use_ps3, use_red, enc_version, dec_in, enc_out)
    return enc_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: MOGG Encryptor",
        epilog="By Ruggery Iury Corrêa, using LocalH's moggulator library.\nhttps://github.com/LocalH/moggulator/tree/master",
    )
    parser.add_argument("dec_path", help="The decrypted MOGG file path.", type=str)
    parser.add_argument("enc_path", help="The encrypted MOGG file path.", type=str)
    parser.add_argument(
        "-p",
        "--ps3",
        help="Use PS3 keys to encrypt.",
        action=argparse.BooleanOptionalAction,
        type=bool,
        default=False,
    )
    parser.add_argument(
        "-r",
        "--red",
        help="Use Red keys to encrypt.",
        action=argparse.BooleanOptionalAction,
        type=bool,
        default=False,
    )
    parser.add_argument(
        "-e",
        "--enc-version",
        help="Use red keys to encrypt.",
        type=int,
        default=11,
        choices=[11, 12, 13],
    )

    arg = parser.parse_args()

    mogg_encrypt(arg.dec_path, arg.enc_path, arg.use_ps3, arg.use_red, arg.enc_version)
