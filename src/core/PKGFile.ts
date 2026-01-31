import { BinaryReader, type DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes, parseReadableBytesSize, getReadableBytesSize } from 'node-lib'
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
}

export interface PKGFileJSONRepresentation extends FilePathJSONRepresentation, PKGData {}

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
   * Returns an object with stats of the PS3 PKG file.
   * - - - -
   * @returns {Promise<PKGData>}
   */
  async stat(): Promise<PKGData> {
    return await parsePKGFileOrBuffer(this.path)
  }

  /**
   * Returns an object with stats of the PS3 PKG file. This method only works for song packages PKG files, otherwise will return an error.
   * - - - -
   * @returns {Promise<PKGFileSongPackageStatObject>}
   * @throws {Error} When the provided PKG file is not a song package file.
   */
  async songPackageStat(): Promise<PKGFileSongPackageStatObject> {
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
    return {
      ...this.path.toJSON(),
      ...(await this.stat()),
    }
  }

  /**
   * Extracts the PKG file contents and returns the folder path where all contents were extracted.
   * - - - -
   * @param {DirPathLikeTypes} destPath The folder path where you want the files to be extracted to.
   * @returns {Promise<DirPath>}
   */
  async extract(destPath: DirPathLikeTypes): Promise<DirPath> {
    await this.checkFileIntegrity()
    const dest = pathLikeToDirPath(destPath)
    if (!dest.exists) await dest.mkDir()
    else {
      await dest.deleteDir(true)
      await dest.mkDir()
    }

    await BinaryAPI.ps3PKGRipper(this.path, dest)
    return dest
    // const parsedData = await parsePKGFileOrBuffer(this.path)
    // const filteredEntries = parsedData.entries.items.filter((val) => val.isFile && val.name !== 'ICON0.PNG' && val.name !== 'PARAM.SFO' && val.name !== 'PS3LOGO.DAT').map((val) => ({ ...val, entryName: val.name, name: val.name.startsWith('USRDIR/') ? val.name.slice(7) : val.name }))
    // for (const entry of filteredEntries) {
    //   let entryPath = dest.gotoFile(entry.name)
    //   if (extractOnRoot) entryPath = dest.gotoFile(entryPath.fullname)

    //   const root = pathLikeToDirPath(entryPath.root)
    //   if (!root.exists) await root.mkDir(true)
    //   const buf = (await processPKGItemEntries(parsedData.header, { ...parsedData.entries, items: [entry] }, this.path))[0]
    //   await entryPath.write(buf)
    // }
    return dest
  }
}
