#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
from os import PathLike
from typing import Union


def byte_swapper(
    pathIn: Union[str, PathLike[str]], pathOut: Union[str, PathLike[str]]
) -> None:
    fin = open(pathIn, "rb")
    fout = open(pathOut, "wb")

    size = fin.seek(0, 2)

    fin.seek(0, 0)
    fout.seek(0, 0)

    buffer = fin.read(32)
    fout.write(buffer)

    # Shuffles bytes after header.
    while fin.tell() < size:
        buf1 = fin.read(1)
        buf2 = fin.read(1)

        fout.write(buf2)
        fout.write(buf1)

    fin.seek(0, 0)
    fin.close()
    fout.close()
    pass
