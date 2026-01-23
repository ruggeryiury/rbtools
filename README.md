<div align=center>
<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg' width='30px' title='JavaScript'/>
<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg' width='30px' title='TypeScript'/>
<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original-wordmark.svg' width='30px' title='NodeJS'>
<img src='https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' width='30px' title='Python' />
</div>

<div align=center>
<img src='https://img.shields.io/github/last-commit/ruggeryiury/rbtools?color=%23DDD&style=for-the-badge' /> <img src='https://img.shields.io/github/repo-size/ruggeryiury/rbtools?style=for-the-badge' /> <img src='https://img.shields.io/github/issues/ruggeryiury/rbtools?style=for-the-badge' /> <img src='https://img.shields.io/github/package-json/v/ruggeryiury/rbtools?style=for-the-badge' /> <img src='https://img.shields.io/github/license/ruggeryiury/rbtools?style=for-the-badge' />
</div>

- [About](#about)
- [Dependencies](#dependencies)
  - [System](#system)
  - [Python](#python)
- [Package Resources](#package-resources)
- [Special Thanks](#special-thanks)
- [More Rock Band-Related Projects](#more-rock-band-related-projects)

# About

**_RBTools_** is a NodeJS module with classes to manipulate several Rock Band-related files on all available systems. **_RBTools_** also uses _Python_ to manipulate many kinds of files, like image and texture files. The main exports of this package consists on classes that represents a file type to be processed. All secondary methods used on these classes is also available to import from `rbtools/lib`.

# Dependencies

## System

- [Visual Studio Build Tools for C++](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

## Python

| Package name    | Install command             | Description                                                                                                                       | PyPI link                                         |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `aenum`         | `pip install aenum`         | Advanced Enumerations (compatible with Python's stdlib `Enum`), `NamedTuples`, and `NamedConstants`.                              | [[link]](https://pypi.org/project/aenum/)         |
| `audioop-lts`   | `pip install audioop-lts`   | LTS Port of Python `audioop`.                                                                                                     | [[link]](https://pypi.org/project/audioop-lts/)   |
| `cryptography`  | `pip install cryptography`  | A package which provides cryptographic recipes and primitives to Python developers.                                               | [[link]](https://pypi.org/project/cryptography/)  |
| `ecdsa`         | `pip install ecdsa`         | ECDSA cryptographic signature library.                                                                                            | [[link]](https://pypi.org/project/ecdsa/)         |
| `mido`          | `pip install mido`          | MIDI Objects for Python.                                                                                                          | [[link]](https://pypi.org/project/mido/)          |
| `packaging`     | `pip install packaging`     | Core utilities for Python packages.                                                                                               | [[link]](https://pypi.org/project/packaging/)     |
| `puremagic`     | `pip install puremagic`     | Pure python implementation of magic file detection.                                                                               | [[link]](https://pypi.org/project/mido/)          |
| `fastxor`       | `pip install fastxor`       | A C++ fast XOR implementation strongly inspired by [eryksun's StackOverflow post](http://stackoverflow.com/users/205580/eryksun). | [[link]](https://pypi.org/project/fastxor/)       |
| `pillow`        | `pip install pillow`        | Python Imaging Library (fork).                                                                                                    | [[link]](https://pypi.org/project/pillow/)        |
| `PyAudio`       | `pip install PyAudio`       | Cross-platform audio I/O with PortAudio.                                                                                          | [[link]](https://pypi.org/project/PyAudio/)       |
| `pycryptodome`  | `pip install pycryptodome`  | Cryptographic library for Python.                                                                                                 | [[link]](https://pypi.org/project/pycryptodome/)  |
| `pycryptodomex` | `pip install pycryptodomex` | Cryptographic library for Python.                                                                                                 | [[link]](https://pypi.org/project/pycryptodomex/) |
| `pydub`         | `pip install pydub`         | Manipulate audio with an simple and easy high level interface.                                                                    | [[link]](https://pypi.org/project/pydub/)         |
| `requests`      | `pip install requests`      | Python HTTP for Humans.                                                                                                           | [[link]](https://pypi.org/project/requests/)      |

# Package Resources

**_RBTools_** comes with a few binary executables, such as:

- [NVIDIA Texture Tool](https://docs.nvidia.com/texture-tools/index.html)
- [Wiimms Image Tool](https://szs.wiimm.de/wimgt/)
- [MakeMogg](https://github.com/maxton/makemogg)

Also, **_RBTools_** uses modified Python scripts from:

- [MOGG Module (from moggulator)](https://github.com/LocalH/moggulator/tree/master)
- [PKG Module (from PSN_get_pkg_info)](https://github.com/windsurfer1122/PSN_get_pkg_info)
- [STFS Module (from py360)](https://github.com/valmyzk/py360)
- [TPL Module (from Wii.py)](https://github.com/DorkmasterFlek/Wii.py)
- [Swap RB Art Bytes (from RB3DX Dependencies)](https://github.com/hmxmilohax/rock-band-3-deluxe/blob/develop/dependencies/python/swap_rb_art_bytes.py)

At last, **_RBTools_** comes with a few special Node packages made by myself, such as:

- [node-lib](https://github.com/ruggeryiury/node-lib): A path utility suite that gathers several functions related to a specific path.
- [use-default-options](https://github.com/ruggeryiury/use-default-options): Utility function to merge default options with user-defined ones.

# Special Thanks

- [raphaelgoulart](https://github.com/raphaelgoulart): Close friend and always helping me in some sort.
- [Onyxite](https://github.com/mtolly): General helping and for the creation of [Onyx Toolkit](https://github.com/mtolly/onyx)!
- [TrojanNemo](https://github.com/trojannemo): General helping and for the creation of [Nautilus](https://github.com/trojannemo/Nautilus)!
- [LocalH](https://github.com/LocalH): General helping and providing me the [moggulator](https://github.com/LocalH/moggulator/tree/master) python script.
- [Emma](https://github.com/InvoxiPlayGames): General helping!
- Jnack and all the fellow contributors of MiloHax!

# More Rock Band-Related Projects

- [My Customs Projects](https://github.com/ruggeryiury/ruggy-customs-projects): All my customs projects.
- [PRO Guitar/Bass Guide](https://ruggeryiury.github.io/proguitarbass-guide/): My famous PRO Guitar/Bass guide.
