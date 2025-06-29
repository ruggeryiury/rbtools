import { BinaryReader, type DirPath, type FilePath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { DTAParser, ImageFile, OnyxCLI } from '../core.exports'
import { createRB3PackageBuffer, parseRB3PackageEntries, parseRB3PackageHeader, type RB3CompatibleDTAFile, type RB3PackageCreationOptions, type RB3PackageHeaderObject, type RB3SongEntriesObject, extractRB3PackageToRPCS3, extractRB3PackageToYARG, type RB3PackageExtractionOptions, extractRB3PackageToSTFS, type RB3PackageToSTFSExtractionOptions } from '../lib.exports'

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

export class RB3Package {
  // #region Static Methods
  static async createBuffer(options: RB3PackageCreationOptions): Promise<Buffer> {
    return await createRB3PackageBuffer(options)
  }

  static async createFile(destPath: FilePathLikeTypes, options: RB3PackageCreationOptions): Promise<RB3Package> {
    const dest = pathLikeToFilePath(destPath).changeFileExt('.rb3')
    const buf = await this.createBuffer(options)
    await dest.write(buf)
    return new RB3Package(dest)
  }

  path: FilePath

  constructor(packageFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(packageFilePath)
  }

  // #region Methods
  async checkFileIntegrity() {
    if (!this.path.exists) throw new Error(`Provided RB3 Package file "${this.path.path}" does not exists`)
    const magic = (await this.path.readOffset(0, 4)).toString('ascii')
    if (magic === 'RB3 ') return true
    throw new Error(`Provided RB3 Package file "${this.path.path}" is not a valid RB3 Package file.`)
  }

  async stat(): Promise<RB3PackageStats> {
    await this.checkFileIntegrity()
    const reader = await BinaryReader.fromFile(this.path)
    const fileSize = reader.length
    const header = await parseRB3PackageHeader(reader, this.path)
    const entries = await parseRB3PackageEntries(header, reader, this.path)
    reader.seek(176 + header.songsCount * 80)
    const dtaBuffer = await reader.read(header.dtaSize)
    reader.padding(header.dtaPadding)
    const desc = await reader.read(header.descSize)
    reader.padding(header.descPadding)
    const artwork = await reader.read(header.artworkSize)
    reader.padding(header.artworkPadding)
    const dtaParsed = DTAParser.fromBuffer(dtaBuffer)
    await reader.close()
    return { header, entries, dta: dtaParsed, desc, artwork, fileSize }
  }

  async toJSON(): Promise<RB3PackageJSONRepresentation> {
    await this.checkFileIntegrity()
    const stat = await this.stat()
    return {
      ...this.path.toJSON(),
      header: stat.header,
      entries: stat.entries,
      dta: stat.dta.songs,
      desc: stat.desc.toString(),
      artwork: stat.artwork.length > 0 ? await ImageFile.bufferToDataURL(stat.artwork) : null,
      fileSize: stat.fileSize,
    }
  }

  async toRPCS3(usrdirPath: DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> {
    return await extractRB3PackageToRPCS3(this.path, usrdirPath, options)
  }

  async toYARG(extractedPackageRootPath: DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> {
    return await extractRB3PackageToYARG(this.path, extractedPackageRootPath, options)
  }

  async toSTFS(onyxCLIExePath: OnyxCLI | FilePathLikeTypes, destSTFSFilePath: FilePathLikeTypes, options?: RB3PackageToSTFSExtractionOptions) {
    return await extractRB3PackageToSTFS(onyxCLIExePath, this.path, destSTFSFilePath, options)
  }
}
