import { BinaryReader, type DirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { DTAParser, ImageFile, type RPCS3 } from '../core.exports'
import { createRB3PackageBuffer, extractRB3PackageRPCS3, parseRB3PackageEntries, parseRB3PackageHeader, removePaddingToBuffer, type RB3CompatibleDTAFile, type RB3PackageCreationOptions, type RB3PackageExtractionOptions, type RB3PackageHeaderObject, type RB3SongEntriesObject } from '../lib.exports'

// #region Types
export interface RB3PackageStats {
  /**
   * An object with parsed values of the RB3 Package file header.
   */
  header: RB3PackageHeaderObject
  /**
   * An array with the RB3 Package songs entries.
   */
  entries: RB3SongEntriesObject[]
  /**
   * A instantiated `DTAParser` class from the parsed RB3 Package file DTA file.
   */
  dta: DTAParser
  /**
   * The buffer of the RB3 Package description file.
   */
  desc: Buffer
  /**
   * The buffer of the RB3 Package thumbnail file.
   */
  artwork: Buffer
  /**
   * The size of the RB3 Package file.
   */
  fileSize: number
}

export interface RB3PackageJSONRepresentation extends FilePathJSONRepresentation, Omit<RB3PackageStats, 'dta' | 'desc' | 'artwork'> {
  /**
   * An array with the RB3 Package file's parsed song objects.
   */
  dta: RB3CompatibleDTAFile[]
  /**
   * The contents of the RB3 Package description file.
   */
  desc: string
  /**
   * A DataURL string of the artwork, or `null` if no artwork thumbnail is embed to the RB3 Package file.
   */
  artwork: string | null
}

/**
 * `RB3Package` is a class that represents a RB3 Package file.
 * - - - -
 * @see {@link https://www.psdevwiki.com/ps3/NPD|RB3 Package File Format Specifications}
 */
export class RB3Package {
  // #region Static Methods

  /**
   * Creates a RB3 Package file buffer.
   * - - - -
   * @param {RB3PackageCreationOptions} options Options values for the creation of the RB3 Package file.
   * @returns {Promise<Buffer>}
   */
  static async createBuffer(options: RB3PackageCreationOptions): Promise<Buffer> {
    return await createRB3PackageBuffer(options)
  }

  /**
   * Creates a RB3 Package file and returns a instantiated `RB3Package` class pointing to the new RB3 Package file.
   * - - - -
   * @param {FilePathLikeTypes} destPath The path where the new RB3 Package file will be saved.
   * @param {RB3PackageCreationOptions} options Options values for the creation of the RB3 Package file.
   * @returns {Promise<RB3Package>}
   */
  static async createFile(destPath: FilePathLikeTypes, options: RB3PackageCreationOptions): Promise<RB3Package> {
    const dest = pathLikeToFilePath(destPath).changeFileExt('.rb3')
    const buf = await this.createBuffer(options)
    await dest.write(buf)
    return new RB3Package(dest)
  }

  // #region Constructor

  /** The path to the RB3 Package file. */
  path: FilePath

  /**
   * `RB3Package` is a class that represents a RB3 Package file.
   * - - - -
   * @param {FilePathLikeTypes} rb3PackageFilePath The path to the RB3 Package file.
   */
  constructor(rb3PackageFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(rb3PackageFilePath)
  }

  // #region Methods

  /**
   * Checks the integrity of the instantiated RB3 Package file by reading its signature (magic bytes).
   * - - - -
   * @returns {Promise<boolean>}
   * @throws {Error} When the file signature is an unknown file format.
   */
  async checkFileIntegrity(): Promise<boolean> {
    if (!this.path.exists) throw new Error(`Provided RB3 Package file "${this.path.path}" does not exists`)
    const magic = (await this.path.readOffset(0, 4)).toString('ascii')
    if (magic === 'RB3P') return true
    throw new Error(`Provided RB3 Package file "${this.path.path}" is not a valid RB3 Package file.`)
  }

  /**
   * Returns an object with stats of the RB3 Package file.
   * - - - -
   * @returns {Promise<RB3PackageStats>}
   */
  async stat(): Promise<RB3PackageStats> {
    await this.checkFileIntegrity()
    const reader = await BinaryReader.fromFile(this.path)
    const fileSize = reader.length
    const header = await parseRB3PackageHeader(reader, this.path)
    const entries = await parseRB3PackageEntries(header, reader, this.path)
    reader.seek(header.headerSize + header.songsCount * 80)
    const dta = DTAParser.fromBuffer(removePaddingToBuffer(await reader.read(header.dtaSize), header.dtaPadding))
    const desc = removePaddingToBuffer(await reader.read(header.descSize), header.descPadding)
    const artwork = removePaddingToBuffer(await reader.read(header.artworkSize), header.artworkPadding)
    await reader.close()
    return { header, entries, dta, desc, artwork, fileSize }
  }

  /**
   * Returns a JSON representation of this `RB3Package` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the RB3 Package file path, the songs objects directly in an array (instead of returning an instantiated `DTAParser` class), and the package artwork as a Data URL string.
   * - - - -
   * @returns {Promise<RB3PackageJSONRepresentation>}
   */
  async toJSON(): Promise<RB3PackageJSONRepresentation> {
    await this.checkFileIntegrity()
    const { artwork, desc, dta, entries, fileSize, header } = await this.stat()
    return {
      ...this.path.toJSON(),
      header,
      entries,
      dta: dta.songs,
      desc: desc.toString(),
      artwork: artwork.length > 0 ? await ImageFile.bufferToDataURL(artwork) : null,
      fileSize,
    }
  }
  /**
   * Extracts songs from a RB3 Package file, formatted to RPCS3 use, and returns the new extracted package folder path.
   * - - - -
   * @param {RPCS3 | DirPathLikeTypes} rpcs3DevHDD0Folder A valid `dev_hdd0` folder destination to the package extraction.
   * @param {RB3PackageExtractionOptions} [options] `OPTIONAL` An object with values that changes the behavior of the extracting process.
   * @returns {Promise<DirPath>}
   */
  async extractForRPCS3(rpcs3DevHDD0Folder: RPCS3 | DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> {
    return await extractRB3PackageRPCS3(this, rpcs3DevHDD0Folder, options)
  }
}
