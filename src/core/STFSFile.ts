import { BinaryReader, type DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePath, type FilePathLikeTypes, type FilePathJSONRepresentation } from 'node-lib'
import { DTAParser, PythonAPI, type STFSFileStatRawObject } from '../core.exports'
import { detectDTABufferEncoding, type PartialDTAFile, type RB3CompatibleDTAFile } from '../lib.exports'

// #region Types

export type STFSFileStatObject = Omit<STFSFileStatRawObject, 'dta' | 'upgrades'> & {
  /**
   * The contents of the package's DTA file.
   */
  dta: DTAParser
  /**
   * The contents of the package's upgrades DTA file.
   */
  upgrades?: DTAParser
  /**
   * A boolean value that tells if the package has two or more songs.
   */
  isPack: boolean
  /**
   * A boolean value that tells if the package has PRO Guitar/Bass upgrades.
   */
  hasUpgrades: boolean
}

export interface STFSFileJSONRepresentation extends FilePathJSONRepresentation, Omit<STFSFileStatObject, 'dta' | 'upgrades'> {
  /**
   * The contents of the package's DTA file.
   */
  dta?: RB3CompatibleDTAFile[]
  /**
   * The contents of the package's upgrades DTA file.
   */
  upgrades?: PartialDTAFile[]
}

/**
 * `STFSFile` is a class that represents a Xbox 360 CON file.
 */
export class STFSFile {
  // #region Constructor

  /** The path to the CON file. */
  path: FilePath

  /**
   * `STFSFile` is a class that represents a Xbox 360 CON file.
   * - - - -
   * @param {FilePathLikeTypes} stfsFilePath The path to the Xbox 360 CON file.
   */
  constructor(stfsFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(stfsFilePath)
  }

  // #region Methods

  /**
   * Checks the integrity of the STFS by reading the file signature (magic).
   * - - - -
   * @returns {Promise<string>}
   * @throws {Error} When it identifies file signature of any unknown file format.
   */
  async checkFileIntegrity(): Promise<string> {
    if (!this.path.exists) throw new Error(`Provided STFS file "${this.path.path}" does not exists`)
    const magic = await BinaryReader.fromBuffer(await this.path.readOffset(0, 4)).readUInt32BE()

    // CON
    if (magic === 0x434f4e20) return 'CON'
    // PIRS
    else if (magic === 0x50495253) return 'PIRS'
    // LIVE
    else if (magic === 0x4c495645) return 'LIVE'
    throw new Error(`Provided STFS file "${this.path.path}" is not a valid STFS file.`)
  }

  /**
   * Returns an object with stats of the STFS file.
   * - - - -
   * @returns {Promise<STFSFileStatObject>}
   */
  async stat(): Promise<STFSFileStatObject> {
    await this.checkFileIntegrity()
    const stat = await PythonAPI.stfsFileStat(this.path)

    let isPack = false
    const hasUpgrades = stat.files.includes('/songs_upgrades/upgrades.dta')

    let upgrades: DTAParser | undefined
    if (!stat.dta) throw new Error(`Provided STFS file "${this.path.path}" doesn't have a songs.dta file.`)
    const enc = detectDTABufferEncoding(stat.dta)
    const dta = DTAParser.fromBuffer(Buffer.from(stat.dta, enc))
    if (dta.songs.length > 1) isPack = true
    if (stat.upgrades) {
      const enc = detectDTABufferEncoding(stat.upgrades)
      upgrades = DTAParser.fromBuffer(Buffer.from(stat.upgrades, enc))
    }

    return { ...stat, dta, upgrades, isPack, hasUpgrades }
  }

  /**
   * Returns a JSON representation of this `STFSFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the STFS file path.
   * - - - -
   * @returns {Promise<STFSFileJSONRepresentation>}
   */
  async toJSON(): Promise<STFSFileJSONRepresentation> {
    const rawStats = await this.stat()
    const stats = { ...rawStats, dta: rawStats.dta.songs, upgrades: rawStats.upgrades?.updates ?? undefined }
    return {
      ...this.path.toJSON(),
      ...stats,
    }
  }

  /**
   * Extracts the CON file contents and returns the folder path where all contents were extracted.
   * - - - -
   * @param {DirPathLikeTypes} destPath The folder path where you want the files to be extracted to.
   * @param {boolean} [extractOnRoot] `OPTIONAL` Extract all files on the root rather than recreate the entire STFS file system recursively. Default is `false`.
   * @returns {Promise<DirPath>}
   */
  async extract(destPath: DirPathLikeTypes, extractOnRoot = false): Promise<DirPath> {
    await this.checkFileIntegrity()
    const dest = pathLikeToDirPath(destPath)
    if (!dest.exists) await dest.mkDir()
    else {
      await dest.deleteDir(true)
      await dest.mkDir()
    }
    return await PythonAPI.stfsExtract(this.path, destPath, extractOnRoot)
  }
}
