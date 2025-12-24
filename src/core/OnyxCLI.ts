import { execAsync, FilePath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { pathLikeToString } from 'node-lib'

export type OnyxCLIOperators = 'import' | 'build' | 'web-player' | 'reaper' | 'pro-keys-hanging' | 'stfs' | 'mogg' | 'encrypt-mogg-rb1' | 'u8' | 'milo' | 'encrypt-gh-fsb' | 'fsb' | 'pak' | 'pkg' | 'edat' | 'port-gh-ps3' | 'extract' | 'unwrap' | 'midi-text' | 'midi-merge' | 'bin-to-dta' | 'dta-to-bin'
export type STFSGameTypes = 'rb3' | 'rb2' | 'gh2'

/**
 * Use Onyx CLI features as an JavaScript API.
 */
export class OnyxCLI {
  /**
   * The path to the Onyx CLI executable.
   */
  readonly path: FilePath

  /**
   * @param {FilePathLikeTypes} onyxCLIExePath The path to the Onyx CLI executable.
   */
  constructor(onyxCLIExePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(onyxCLIExePath)
  }

  /**
   * Checks the integrity of the Onyx CLI extracted folder path.
   * - - - -
   * @returns {void}
   * @throws {Error} When the main Onyx CLI executable does not exists.
   */
  checkIntegrity(): void {
    if (!this.path.exists) throw new Error(`No Onyx CLI executable found on provided path "${this.path.path}"\n\nSTFS creation are only available using Onyx CLI.`)
  }

  /**
   * The structure of the Onyx repack method for creating STFS files.
   */
  static readonly repackSTFSRB3Object = {
    'base-version': 0,
    licenses: [
      { bits: 1, flags: 0, id: -1 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
      { bits: 0, flags: 0, id: 0 },
    ],
    'media-id': 0,
    'package-description': ['Package Description', '', '', '', '', '', '', '', ''],
    'package-name': ['Package Name', '', '', '', '', '', '', '', ''],
    'sign-live': false,
    'title-id': 1161890068,
    'title-name': 'Rock Band 3',
    'transfer-flags': 192,
    version: 0,
  }

  /**
   * Displays the help command on Onyx CLI.
   * - - - -
   * @param {OnyxCLIOperators} command `OPTIONAL` Displays general helping if no argument is provided.
   * @returns {string} The help text.
   */
  async help(command?: OnyxCLIOperators): Promise<string> {
    this.checkIntegrity()
    const cmd = `"${this.path.path}"${command ? ` ${command}` : ''} --help`
    const { stderr, stdout } = await execAsync(cmd, { windowsHide: true })
    if (stderr) throw new Error(stderr)
    return stdout
  }

  /**
   * Compile a folder's contents into an Xbox 360 STFS file (CON file).
   * - - - -
   * @param {DirPathLikeTypes} srcFolder The path to the folder with contents to the CON file.
   * @param {FilePathLikeTypes} destFile The path to the new CON file.
   * @param {STFSGameTypes} game `OPTIONAL`. Change the game that the CON file will be created for. Default is `'rb3'`.
   * @returns {Promise<string>} The printable text from the child process.
   */
  async stfs(srcFolder: DirPathLikeTypes, destFile: FilePathLikeTypes, game: STFSGameTypes = 'rb3'): Promise<string> {
    const src = pathLikeToDirPath(srcFolder)
    const dest = pathLikeToFilePath(destFile).changeFileExt('')
    const cmd = `"${this.path.path}" stfs "${src.path}" --to ${dest.path} --game ${game}`
    const { stderr, stdout } = await execAsync(cmd, { windowsHide: true })
    if (stderr) throw new Error(stderr)
    return stdout
  }

  /**
   * Compile a folder's contents into a PS3 `.pkg` file.
   * - - - -
   * @param {DirPathLikeTypes} srcFolder The path to the folder with contents to the `.pkg` file.
   * @param {FilePathLikeTypes} destFile The path to the new `.pkg` file.
   * @param {string} contentID The content ID. Must be 36 characters long. Ex.: `UP0006-BLUS30050_00-RBSTILLALCCF005D`
   * @returns {Promise<string>} The printable text from the child process.
   */
  async pkg(srcFolder: DirPathLikeTypes, destFile: FilePathLikeTypes, contentID: string): Promise<string> {
    const src = pathLikeToDirPath(srcFolder)
    const dest = pathLikeToFilePath(destFile).changeFileExt('pkg')
    const cmd = `"${this.path.path}" pkg ${contentID} "${src.path}" --to ${dest.path}`
    const { stderr, stdout } = await execAsync(cmd, { windowsHide: true })
    if (stderr) throw new Error(stderr)
    return stdout
  }

  /**
   * Encrypt a file into a PS3 `.edat` file.
   * - - - -
   * @param {FilePathLikeTypes} srcFile The path to the file to be encrypted.
   * @param {FilePathLikeTypes} destFile The path to the new `.edat` file.
   * @param {string} contentID The content ID. Must be 36 characters long. Ex.: `UP0002-BLUS30487_00-MYPACKAGELABEL`
   * @param {string} devKLic A 16-byte HEX string (32 chars). Ex.: `d7f3f90a1f012d844ca557e08ee42391`
   * @returns {Promise<string>} The printable text from the child process.
   */
  async edat(srcFile: FilePathLikeTypes, destFile: FilePathLikeTypes, contentID: string, devKLic: string): Promise<string> {
    const src = FilePath.of(pathLikeToString(srcFile))
    const dest = FilePath.of(pathLikeToString(destFile)).changeFileExt('edat')
    const cmd = `"${this.path.path}" edat ${contentID} ${devKLic} "${src.path}" --to ${dest.path}`
    const { stderr, stdout } = await execAsync(cmd, { windowsHide: true })
    if (stderr) throw new Error(stderr)
    return stdout
  }
}
