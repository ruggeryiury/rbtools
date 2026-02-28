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

# About

**_RBTools_** is a NodeJS module with classes to manipulate several Rock Band-related files on all available systems. **_RBTools_** also uses _Python_ to manipulate many kinds of files, like image and texture files. The main exports of this package consists on classes that represents a file type to be processed. All secondary methods used on these classes is also available to import from `rbtools/lib`, utilities being available to import from `rbtools/utils`.

# Dependencies

## System

- [FFMPEG](https://www.ffmpeg.org/).
  - The FFMPEG path must also be settled on the system environment variables.

## Python

| Package name   | Install command            | Description                                                                         | PyPI link                                        |
| -------------- | -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `audioop-lts`  | `pip install audioop-lts`  | LTS Port of Python `audioop`.                                                       | [[link]](https://pypi.org/project/audioop-lts/)  |
| `cryptography` | `pip install cryptography` | A package which provides cryptographic recipes and primitives to Python developers. | [[link]](https://pypi.org/project/cryptography/) |
| `mido`         | `pip install mido`         | MIDI Objects for Python.                                                            | [[link]](https://pypi.org/project/mido/)         |
| `puremagic`    | `pip install puremagic`    | Pure python implementation of magic file detection.                                 | [[link]](https://pypi.org/project/mido/)         |
| `pillow`       | `pip install pillow`       | Python Imaging Library (fork).                                                      | [[link]](https://pypi.org/project/pillow/)       |
| `pydub`        | `pip install pydub`        | Manipulate audio with an simple and easy high level interface.                      | [[link]](https://pypi.org/project/pydub/)        |

# Package Resources

**_RBTools_** comes with a few binary executables, such as:

- [NVIDIA Texture Tool](https://docs.nvidia.com/texture-tools/index.html)
- [Wiimms Image Tool](https://szs.wiimm.de/wimgt/)
- [MakeMogg](https://github.com/maxton/makemogg)

Also, **_RBTools_** uses modified Python scripts from:

- [MOGG Module (from moggulator)](https://github.com/LocalH/moggulator/tree/master)
- [STFS Module (from py360)](https://github.com/valmyzk/py360)
- [TPL Module (from Wii.py)](https://github.com/DorkmasterFlek/Wii.py)

At last, **_RBTools_** comes with a few special Node packages made by myself, such as:

- [node-lib](https://github.com/ruggeryiury/node-lib): A path utility suite that gathers several functions related to a specific path.
- [use-default-options](https://github.com/ruggeryiury/use-default-options): Utility function to merge default options with user-defined ones.

# Special Thanks

- [raphaelgoulart](https://github.com/raphaelgoulart), [CarlMylo](https://github.com/carlmylo), and Ganso: Close friends, always helping me in some sort.
- [TrojanNemo](https://github.com/trojannemo): General helping and for the creation of [Nautilus](https://github.com/trojannemo/Nautilus)!
- [Onyxite](https://github.com/mtolly): General helping and for the creation of [Onyx Toolkit](https://github.com/mtolly/onyx)!
- [Emma](https://github.com/InvoxiPlayGames): General helping and providing the RB3E ID creator for installed songs.
- [LocalH](https://github.com/LocalH): General helping and providing the [moggulator](https://github.com/LocalH/moggulator/tree/master) python module.
- [Jnack](https://github.com/jnackmclain) and all the fellow friends and contributors of MiloHax!
