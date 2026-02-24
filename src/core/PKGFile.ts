import { BinaryReader, DirPath, FilePath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { BinaryAPI, DTAParser } from '../core.exports'
import { parsePKGFileOrBuffer, processPKGItemEntries, type PartialDTAFile, type PKGData, type RB3CompatibleDTAFile } from '../lib.exports'

export interface PKGFileSongPackageStatObject {
  /**
   * The Content ID of the PKG file.
   */
  contentID: string
  /**
   * The Title ID of the PKG file.
   */
  titleID: string
  /**
   * The folder name where the PKG contents will be installed.
   */
  folderName: string
  /**
   * An array with all files included on the PKG file.
   */
  files: string[]
  /**
   * The contents of the PKG DTA file.
   */
  dta: DTAParser
  /**
   * The contents of the PKG upgrades DTA file.
   */
  upgrades: DTAParser | undefined
  /**
   * A boolean value that tells if the package has two or more songs.
   */
  isPack: boolean
  /**
   * A boolean value that tells if the package has PRO Guitar/Bass upgrades.
   */
  hasUpgrades: boolean
  /**
   * The size of the PKG file.
   */
  fileSize: number
  /**
   * The header contents SHA1 hash of the STFS file.
   */
  contentHash: string
}

export interface PKGFileJSONRepresentation extends FilePathJSONRepresentation, Omit<PKGFileSongPackageStatObject, 'dta' | 'upgrades'> {
  /**
   * The contents of the package's DTA file.
   */
  dta: RB3CompatibleDTAFile[]
  /**
   * The contents of the package's upgrades DTA file.
   */
  upgrades?: PartialDTAFile[]
}

/**
 * `PKGFile` is a class that represents a PS3 PKG file.
 */
export class PKGFile {
  // #region Constructor

  /** The path to the PKG file. */
  path: FilePath

  /**
   * `PKGFile` is a class that represents a PS3 PKG file.
   * - - - -
   * @param {FilePathLikeTypes} pkgFilePath The path to the PKG file.
   */
  constructor(pkgFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(pkgFilePath)
  }

  // #region Methods

  /**
   * Checks the integrity of the PS3 PKG by reading the file signature (magic).
   * - - - -
   * @returns {Promise<string>}
   * @throws {Error} When it identifies file signature of any unknown file format.
   */
  async checkFileIntegrity(): Promise<string> {
    if (!this.path.exists) throw new Error(`Provided PS3 PKG file "${this.path.path}" does not exists`)
    const magic = await BinaryReader.fromBuffer(await this.path.readOffset(0, 4)).readUInt32BE()

    // PKG
    if (magic === 0x7f504b47) return 'PKG'
    throw new Error(`Provided PS3 PKG file "${this.path.path}" is not a valid PS3 PKG.`)
  }

  /**
   * Returns an object with stats of the PS3 PKG file. This method only works for song packages PKG files, otherwise will return an error.
   * - - - -
   * @returns {Promise<PKGFileSongPackageStatObject>}
   * @throws {Error} When the provided PKG file is not a song package file.
   */
  async stat(): Promise<PKGFileSongPackageStatObject> {
    await this.checkFileIntegrity()
    const data = await parsePKGFileOrBuffer(this.path)
    let isPack = false
    let hasUpgrades = false
    const dtaEntry = (await processPKGItemEntries(data.header, data.entries, this.path, /songs\.(dta|DTA)$/))[0] as Buffer | undefined
    const upgradesEntry = (await processPKGItemEntries(data.header, data.entries, this.path, /upgrades\.(dta|DTA)$/))[0] as Buffer | undefined
    if (!dtaEntry) throw new Error(`Provided PS3 PKG file "${this.path.path}" doesn't have a songs.dta file.`)
    const dta = DTAParser.fromBuffer(dtaEntry)
    if (dta.songs.length > 1) isPack = true
    let upgrades: DTAParser | undefined
    if (upgradesEntry) {
      hasUpgrades = true
      upgrades = DTAParser.fromBuffer(upgradesEntry)
    }
    return {
      contentID: data.header.contentID,
      titleID: data.header.cidTitle1,
      folderName: data.entries.dlcFolderName,
      files: data.entries.items.map((item) => item.name),
      dta,
      upgrades,
      isPack,
      hasUpgrades,
      fileSize: data.fileSize,
      contentHash: data.entries.sha256,
    }
  }

  /**
   * Returns a JSON representation of this `PKGFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the PS3 PKG file path.
   * - - - -
   * @returns {Promise<PKGFileJSONRepresentation>}
   */
  async toJSON(): Promise<PKGFileJSONRepresentation> {
    const songPackageStat = await this.stat()
    return {
      ...this.path.toJSON(),
      ...songPackageStat,
      dta: songPackageStat.dta.songs,
      upgrades: songPackageStat.upgrades ? songPackageStat.upgrades.updates : undefined,
    }
  }

  /**
   * Extracts the PKG file contents and returns the folder path where all contents were extracted.
   * - - - -
   * @param {DirPathLikeTypes} destPath The folder path where you want the files to be extracted to.
   * @param {boolean} [extractOnRoot] `OPTIONAL` Extract all files on the root rather than recreate the entire PKG file system recursively. Default is `false`.
   * @param {string[]} [songs] `OPTIONAL` An array of string of internal songnames to be extracted. If not provided, all songs will be extracted normally.
   * @returns {Promise<DirPath>}
   */
  async extract(destPath: DirPathLikeTypes, extractOnRoot: boolean = false, songs: string[] = []): Promise<DirPath> {
    await this.checkFileIntegrity()
    const dest = pathLikeToDirPath(destPath)
    if (!dest.exists) await dest.mkDir()
    else {
      await dest.deleteDir(true)
      await dest.mkDir()
    }

    const stat = await this.toJSON()

    const parser = new DTAParser(stat.dta)
    const files: string[] = []
    if (songs.length > 0) {
      parser.songs = parser.songs.filter((s) => songs.includes(s.songname))
      if (parser.songs.length === 0) throw new Error('None of the provided internal songnames were found on the provided PKG file.')

      files.push(`USRDIR/${stat.folderName}/songs/songs.dta`)
      for (const song of parser.songs) {
        files.push(`USRDIR/${stat.folderName}/songs/${song.songname}`)
      }
    }
    await BinaryAPI.ps3pPKGRipper(this.path, dest, songs.length > 0 ? files : undefined)

    if (extractOnRoot) {
      const paths = await dest.readDir(true)
      const allFiles = paths.filter((p) => p instanceof FilePath)
      const allDirs = paths.filter((p) => p instanceof DirPath)

      for (const file of allFiles) {
        const rootFile = dest.gotoFile(file.fullname)
        if (!rootFile.exists) await file.move(rootFile)
      }

      for (const dir of allDirs) {
        if (dir.exists) await dir.deleteDir(true)
      }
    }

    const newDTAPath = extractOnRoot ? dest.gotoFile('songs.dta') : dest.gotoFile(`USRDIR/${stat.folderName}/songs/songs.dta`)
    await parser.export(newDTAPath)
    return dest
  }
}
