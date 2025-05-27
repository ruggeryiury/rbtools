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
- [Installation](#installation)
  - [Requirements](#requirements)
  - [Installation steps](#installation-steps)
- [Package resources](#package-resources)
- [Special thanks](#special-thanks)
- [More Rock Band related projects](#more-rock-band-related-projects)

# About

**_RBTools_** is a highly-typed NodeJS module with methods to manipulate several Rock Band game files, joining several functions that might help you processing these files. **_RBTools_** also uses _Python scripts_ to manipulate many kinds of files, like image and texture files. The main exports of this package consists on classes that represents a file type to be processed. All secondary methods used on these classes is also available to import from `rbtools/lib`.

# Installation

## Requirements

- [NodeJS](https://nodejs.org/en/download)
- [Python v3 & PIP](https://www.python.org/downloads/): **_RBTools_** uses _Python scripts_ to manipulate many kinds of files, like image and texture files.

## Installation steps

Follow the steps below to install and set up the project on your local machine:

- Install Python v3 with PIP.

- Execute the `scripts/install_python_packages.py` script to install necessary Python packages:

```bash
python scripts/install_python_packages.py
```

- Clone the repository: If you have `git` installed, se the following command to clone the repository to your local machine:

```bash
git clone https://github.com/ruggeryiury/rbtools.git
```

- Install project dependencies: Navigate to the project directory and install the necessary packages by running:

```bash
npm install
```

_Make sure that the `packages` folder are in the project's root folder to install all packages correctly. The reason for this is because there are some packages that is made by me and they're not uploaded to the NPM server, existing only locally._

- Config your environment file (OPTIONAL): Create a `env` file in the root of where you downloaded/cloned this repository and put these values:

  - `RBTOOLS_USESOURCE`: Setting this variable to `1` changes the root path of the package to use `src` rather than the `dist` folder. This value is only need in development when doing new scripts to avoid building and copying the scripts to the `dist` folder.
  - `RBTOOLS_BIN_PATH`: Changes the path used as the `bin` directory path for the module. Default is the module `dist/bin` (or `src/bin` if `RBTOOLS_USESOURCE` is set to 1) folder.
  - `MAGMA_PATH`: The path where you extracted MAGMA. This variable can be used by `MAGMAProject` class.
  - `SONGS_PROJECT_ROOT_PATH`: The path where you can find the project files for all your customs. This variable can be used by `MAGMAProject` class.

# Package resources

**_RBTools_** comes with a few binary executables, such as:

- [NVIDIA Texture Tool](https://docs.nvidia.com/texture-tools/index.html)
- [Wiimms Image Tool](https://szs.wiimm.de/wimgt/)
- [MakeMogg](https://github.com/maxton/makemogg)
- EDATTool

Also, **_RBTools_** uses modified Python scripts from:

- [MOGG Module (from moggulator)](https://github.com/LocalH/moggulator/tree/master)
- [PKG Module (from PSN_get_pkg_info)](https://github.com/windsurfer1122/PSN_get_pkg_info)
- [STFS Module (from py360)](https://github.com/valmyzk/py360)
- [TPL Module (from Wii.py)](https://github.com/DorkmasterFlek/Wii.py)
- [Swap RB Art Bytes (from RB3DX Dependencies)](https://github.com/hmxmilohax/rock-band-3-deluxe/blob/develop/dependencies/python/swap_rb_art_bytes.py)

At last, **_RBTools_** comes with a few special Node packages made by myself, such as:

- [Path-JS](https://github.com/ruggeryiury/path-js): A path utility suite that gathers several functions related to a specific path.
- [Set Default Options](https://github.com/ruggeryiury/set-default-options): Utility function to merge default options with user-defined ones.

# Special thanks

- [raphaelgoulart](https://github.com/raphaelgoulart): Close friend and always helping me in some sort.
- [Onyxite](https://github.com/mtolly): General helping and for the creation of [Onyx Toolkit](https://github.com/mtolly/onyx)!
- [TrojanNemo](https://github.com/trojannemo): General helping and for the creation of [Nautilus](https://github.com/trojannemo/Nautilus)!
- [LocalH](https://github.com/LocalH): General helping and providing me the [moggulator](https://github.com/LocalH/moggulator/tree/master) python script.
- [Emma](https://github.com/InvoxiPlayGames): General helping!

# More Rock Band related projects

- [My Customs Projects](https://github.com/ruggeryiury/ruggy-customs-projects): All my customs projects.
- [PRO Guitar/Bass Guide](https://ruggeryiury.github.io/proguitarbass-guide/): My famous PRO Guitar/Bass guide.
