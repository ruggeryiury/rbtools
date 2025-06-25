import { BinaryReader, FilePath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { DTAParser } from '../core.exports'
import { createRB3PackageBuffer, DTAIO, mountRPCS3SongExtractionPaths, parseRB3PackageEntries, parseRB3PackageHeader, swapTextureBytes, type RB3CompatibleDTAFile, type RB3PackageCreationOptions, type RB3PackageHeaderObject, type RB3SongEntriesObject } from '../lib.exports'

export interface RB3PackageStats {
  /**
   * An object with parsed values of the RB3 Package file header.
   */
  header: RB3PackageHeaderObject
  /**
   * An array with the RB3 Package's songs entries.
   */
  entries: RB3SongEntriesObject[]
  /**
   * A instantiated `DTAParser` class from the parsed RB3 Package file's DTA file.
   */
  dta: DTAParser
  /**
   * The buffer of the RB3 Package's description file.
   */
  desc: Buffer
  /**
   * The buffer of the RB3 Package's thumbnail file.
   */
  artwork: Buffer
}

export interface RB3PackageJSONRepresentation extends FilePathJSONRepresentation, Omit<RB3PackageStats, 'dta' | 'desc' | 'artwork'> {
  /**
   * An array with the RB3 Package file's parsed song objects.
   */
  dta: RB3CompatibleDTAFile[]
}

export class RB3Package {
  static async createBuffer(options: RB3PackageCreationOptions): Promise<Buffer> {
    return await createRB3PackageBuffer(options)
  }

  static async createFile(destPath: FilePathLikeTypes, options: RB3PackageCreationOptions): Promise<FilePath> {
    const dest = pathLikeToFilePath(destPath)
    const buf = await this.createBuffer(options)
    return await dest.write(buf)
  }

  path: FilePath

  constructor(packageFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(packageFilePath)
  }

  // async checkFileIntegrity() {}

  async stat(): Promise<RB3PackageStats> {
    const reader = await BinaryReader.fromFile(this.path)
    const header = await parseRB3PackageHeader(reader, this.path)
    const entries = await parseRB3PackageEntries(header, reader, this.path)
    reader.seek(176 + header.songsCount * 80)
    const dtaBuffer = await reader.read(header.dtaSize)
    await FilePath.of('dev/test.txt').write(dtaBuffer)
    const desc = await reader.read(header.descSize)
    const artwork = await reader.read(header.artworkSize)
    const dtaParsed = DTAParser.fromBuffer(dtaBuffer)
    await reader.close()
    return { header, entries, dta: dtaParsed, desc, artwork }
  }

  async toJSON(): Promise<RB3PackageJSONRepresentation> {
    const stat = await this.stat()
    return {
      ...this.path.toJSON(),
      header: stat.header,
      entries: stat.entries,
      dta: stat.dta.songs,
    }
  }

  async extractToRPCS3(usrdirPath: DirPathLikeTypes, selectSongs?: string | string[]) {
    const usrdir = pathLikeToDirPath(usrdirPath)
    const reader = await BinaryReader.fromFile(this.path)
    try {
      const { header, entries, dta } = await this.stat()

      const packageFolder = usrdir.gotoDir(header.folderName)
      if (packageFolder.exists) await packageFolder.deleteDir(true)
      await packageFolder.mkDir()

      const songsFolder = packageFolder.gotoDir('songs')
      await songsFolder.mkDir()

      const songsDtaPath = songsFolder.gotoFile('songs.dta')
      const exportDTA = new DTAParser()

      const operators: RB3SongEntriesObject[] = entries.filter((val) => {
        if (Array.isArray(selectSongs) && selectSongs.length === 0) {
          if (selectSongs.includes(val.songname)) return true
        }
        if (typeof selectSongs === 'string' && selectSongs) {
          if (selectSongs === val.songname) return true
        } else return true
      })
      const { binaryBlockOffset } = header

      for (const op of operators) {
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`Internal error: Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        exportDTA.addSongs(songDTAObject)

        const paths = await mountRPCS3SongExtractionPaths(songsFolder, op.songname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(await reader.read(op.moggSize))
        await paths.midi.write(await reader.read(op.midiSize))
        await paths.png.write(await swapTextureBytes(await reader.read(op.pngSize)))
        await paths.milo.write(await reader.read(op.midiSize))
      }

      await songsDtaPath.write(exportDTA.stringify({ addMAGMAValues: true, formatOptions: DTAIO.formatOptions.defaultRB3, omitUnusedValues: true }))
      await reader.close()

      return packageFolder
    } catch (err) {
      await reader.close()
      throw err
    }
  }
}
