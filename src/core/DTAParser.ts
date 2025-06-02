import { pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { createDTA, depackDTAContents, detectDTABufferEncoding, isDTAFile, parseDTA, type PartialDTAFile, type RB3CompatibleDTAFile, type SongDataCreationObject } from '../lib.exports'

export type AllParsedDTATypes = RB3CompatibleDTAFile | PartialDTAFile | (RB3CompatibleDTAFile | PartialDTAFile)[]

/**
 * A class with methods related to DTA file parsing.
 *
 * This class only works with DTA files of songs and metadata updates, and must not be used to parse any other type of DTA script.
 */
export class DTAParser {
  static fromBuffer(buffer: Buffer): DTAParser {
    const enc = detectDTABufferEncoding(buffer)
    const contents = buffer.toString(enc)
    const depackedSongs = depackDTAContents(contents)
    const songs = depackedSongs.map((val) => parseDTA(val))
    return new DTAParser(songs)
  }

  static async fromFile(dtaFilePath: FilePathLikeTypes): Promise<DTAParser> {
    const dta = pathLikeToFilePath(dtaFilePath)
    const dtaBuffer = await dta.read()
    return DTAParser.fromBuffer(dtaBuffer)
  }

  songs: RB3CompatibleDTAFile[]
  updates: PartialDTAFile[]
  constructor(songs: AllParsedDTATypes) {
    this.songs = []
    this.updates = []
    if (Array.isArray(songs)) {
      for (const song of songs) {
        if (isDTAFile(song)) this.songs.push(song)
        else this.updates.push(song)
      }
    }
  }

  /**
   * Creates a complete `DTAFile` object from a song's data.
   * - - - -
   * @param {SongDataCreationObject} songdata An object with values of the song.
   * @returns {RB3CompatibleDTAFile}
   */
  static create(songdata: SongDataCreationObject): RB3CompatibleDTAFile {
    return createDTA(songdata)
  }
}
