import axios from 'axios'
import { pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { createDTA, depackDTAContents, detectDTABufferEncoding, genNumericSongID, genTracksCountArray, isRB3CompatibleDTA, isURL, parseDTA, patchDTAEncodingFromDTAFileObject, sortDTA, stringifyDTA, type PartialDTAFile, type RB3CompatibleDTAFile, type SongDataCreationObject, type SongDataStringifyOptions, type SongSortingTypes } from '../lib.exports'
import { RBTools } from './RBTools'

/**
 * A class with methods related to DTA file parsing.
 *
 * This class only works with DTA files of songs and metadata updates, and must not be used to parse any other type of DTA script.
 */
export class DTAParser {
  /**
   * Parses a DTA file buffer.
   * - - - -
   * @param {Buffer} buffer A `Buffer` object from DTA file contents to be parsed.
   * @returns {DTAParser}
   */
  static fromBuffer(buffer: Buffer): DTAParser {
    const enc = detectDTABufferEncoding(buffer)
    const contents = buffer.toString(enc)
    const depackedSongs = depackDTAContents(contents)
    const songs = depackedSongs.map((val) => parseDTA(val))
    const parser = new DTAParser(songs)
    parser.patchCores()
    parser.patchSongsEncodings()
    parser.patchIDs()
    return parser
  }

  /**
   * Parses a DTA file from a file path.
   * - - - -
   * @param {FilePathLikeTypes} dtaFilePath The path to the DTA file to be parsed.
   * @returns {Promise<DTAParser>}
   */
  static async fromFile(dtaFilePath: FilePathLikeTypes): Promise<DTAParser> {
    const dta = pathLikeToFilePath(dtaFilePath)
    const dtaBuffer = await dta.read()
    return DTAParser.fromBuffer(dtaBuffer)
  }

  /**
   * Parses a DTA file from an URL.
   * - - - -
   * @param {string} url The URL to the DTA file to be parsed.
   * @returns {Promise<DTAParser>}
   */
  static async fromURL(url: string): Promise<DTAParser> {
    if (!isURL(url)) throw new Error(`Provided DTA URL "${url}" is not a valid HTTP/HTTPS URL`)
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' })
    if (response.status !== 200) throw new Error(`GET method fetching DTA file data on URL "${url}" returned with status ${response.status.toString()}: ${response.statusText}`)
    const buf = response.data
    return DTAParser.fromBuffer(Buffer.from(buf))
  }

  /**
   * Creates a `RB3CompatibleDTAFile` object from a parsed song data object.
   * - - - -
   * @param {SongDataCreationObject} songdata An object with values of the song's data.
   * @returns {RB3CompatibleDTAFile}
   */
  static create(songdata: SongDataCreationObject): RB3CompatibleDTAFile {
    return createDTA(songdata)
  }

  /**
   * An array with songs with complete information to work properly on Rock Band 3.
   */
  songs: RB3CompatibleDTAFile[]
  /**
   * An array with updates that will be applied to its respective songs, if the song is found on `this.songs`.
   *
   * Updates are only stringified directly when there's no entries on `this.songs`.
   */
  updates: PartialDTAFile[]
  constructor(songs?: RB3CompatibleDTAFile | PartialDTAFile | (RB3CompatibleDTAFile | PartialDTAFile)[]) {
    this.songs = []
    this.updates = []
    if (songs) {
      if (Array.isArray(songs)) {
        for (const song of songs) {
          if (isRB3CompatibleDTA(song)) this.songs.push(song)
          else this.updates.push(song)
        }
      } else {
        if (isRB3CompatibleDTA(songs)) this.songs.push(songs)
        else this.updates.push(songs)
      }
    }
  }

  private _cleanUpdates() {
    this.updates = []
  }

  /**
   * Gets a song entry by it's ID. Returns `undefined` if the song is not found.
   * - - - -
   * @param {string} id The ID of the song.
   * @returns {RB3CompatibleDTAFile | undefined}
   */
  getSongByID(id: string): RB3CompatibleDTAFile | undefined {
    return this.songs.find((song) => String(song.id) === String(id))
  }

  /**
   * Adds song entries to the `songs` array and returns the updated length of the `songs` array.
   * - - - -
   * @param {RB3CompatibleDTAFile | RB3CompatibleDTAFile[]} songs The song's data that you want to add.
   * @returns {number}
   * @throws {Error} When a provided entry is not compatible with Rock Band 3.
   */
  addSongs(songs: RB3CompatibleDTAFile | RB3CompatibleDTAFile[]): number {
    if (Array.isArray(songs)) {
      for (const song of songs) {
        if (!isRB3CompatibleDTA(song)) throw new Error('Only RB3 compatible song metadata is allowed to insert as songs.')
        this.songs.push(song)
      }
    } else {
      if (!isRB3CompatibleDTA(songs)) throw new Error('Only RB3 compatible song metadata is allowed to insert as songs.')
      this.songs.push(songs)
    }
    return this.songs.length
  }

  /**
   * Adds update entries to the `updates` array and returns the updated length of the `updates` array.
   * - - - -
   * @param {PartialDTAFile | PartialDTAFile[]} updates The updates' data that you want to add.
   * @returns {number}
   */
  addUpdates(updates: PartialDTAFile | PartialDTAFile[]): number {
    if (Array.isArray(updates)) {
      for (const update of updates) {
        const i = this.updates.findIndex((val) => val.id === update.id)
        if (i === -1) this.updates.push(update)
        else this.updates[i] = { ...this.updates[i], ...update }
      }
    } else {
      const i = this.updates.findIndex((val) => val.id === updates.id)
      if (i === -1) this.updates.push(updates)
      else this.updates[i] = { ...this.updates[i], ...updates }
    }
    return this.updates.length
  }

  /**
   * Applies Rock Band 3 Deluxe updates on songs found in the `songs` array and returns an array with IDs of songs where the updated imformations were applied.
   * - - - -
   * @param {boolean} [deleteNonAppliedUpdates] `OPTIONAL` Cleans the `updates` array when finished. Default is `true`.
   * @param {boolean} [fetchUpdates] `OPTIONAL` If true, the function will fetch all updates from the Rock Band 3 Deluxe repository even if there's a local update file and save the new content. Default is `false`.
   * @returns {Promise<string[]>}
   */
  async applyDXUpdatesOnSongs(deleteNonAppliedUpdates = true, fetchUpdates = false): Promise<string[]> {
    const localUpdates = RBTools.dbFolder.gotoFile('updates.json')
    // const links = ['https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/official_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/unofficial_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/metadata_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/harms_and_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/combined_strings_and_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/other_upgrades.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/loading_phrases.dta']
    if (fetchUpdates) {
      const dta = await DTAParser.fromURL('https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla_strings.dta')
      for (const link of ['https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/official_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/unofficial_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/metadata_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/harms_and_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/combined_strings_and_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/other_upgrades.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/loading_phrases.dta']) {
        dta.addUpdates((await DTAParser.fromURL(link)).updates)
      }
      await localUpdates.write(JSON.stringify(dta.updates))
    }
    if (localUpdates.exists) {
      const json = (await localUpdates.readJSON()) as PartialDTAFile[]
      this.addUpdates(json)
    }

    return this.applyUpdatesToExistingSongs(deleteNonAppliedUpdates)
  }

  /**
   * Adds update values to all songs inside the `songs` array and returns an array with IDs of songs where the updated imformations were applied.
   * - - - -
   * @param {Omit<PartialDTAFile, 'id'>} update An object with updated values to be applied on all songs from the `songs` array.
   * @returns {string[]}
   */
  addUpdatesToAllSongs(update: Omit<PartialDTAFile, 'id'>): string[] {
    const allIDs = this.songs.map((song) => song.id)
    for (const id of allIDs) this.addUpdates({ id, ...update })
    return this.applyUpdatesToExistingSongs()
  }

  /**
   * Inserts the updates found in the `updates` array on songs inside the `songs` array directly, if they're found. This function returns an array with IDs of songs where the updated imformations were applied.
   * @param {boolean} [deleteNonAppliedUpdates] `OPTIONAL` Cleans the `updates` array when finished. Default is `true`.
   * @returns {string[]}
   */
  applyUpdatesToExistingSongs(deleteNonAppliedUpdates = true) {
    if (this.updates.length === 0) return [] as string[]
    const appliedUpdSongsIDs: string[] = []
    const unusedUpdates: PartialDTAFile[] = []
    const newSongs: RB3CompatibleDTAFile[] = []

    for (const upd of this.updates) {
      const songIndex = this.songs.findIndex((val) => val.id === upd.id)
      if (songIndex === -1 && isRB3CompatibleDTA(upd)) {
        this.songs.push(upd)
        appliedUpdSongsIDs.push(upd.id)
      } else if (songIndex === -1) unusedUpdates.push(upd)
      else appliedUpdSongsIDs.push(upd.id)
    }
    for (const song of this.songs) {
      const upd = this.updates.find((update) => song.id === update.id)
      if (upd && isRB3CompatibleDTA(upd)) newSongs.push(song)
      else if (upd) newSongs.push({ ...song, ...upd })
      else newSongs.push(song)
    }
    this.songs = newSongs
    if (deleteNonAppliedUpdates) this._cleanUpdates()
    else this.updates = unusedUpdates
    return appliedUpdSongsIDs
  }

  /**
   * Patches song encodings and returns an array with IDs of songs where the encoding patch were applied. This function iterates through all songs' entries inside the `songs` array and searches for non-ASCII characters on every string value of the song. With this, all DTA files used on this class must be imported using `utf-8` encoding, and all characters will be displayed correctly.
   * - - - -
   * @returns {string[]}
   */
  patchSongsEncodings(): string[] {
    const patchedSongsID: string[] = []
    const newSongs: RB3CompatibleDTAFile[] = []
    for (const song of this.songs) {
      const newEnc = patchDTAEncodingFromDTAFileObject(song)
      if (song.encoding === newEnc) newSongs.push(song)
      else {
        patchedSongsID.push(song.id)
        newSongs.push({ ...song, encoding: newEnc })
      }
    }

    this.songs = newSongs
    return patchedSongsID
  }

  /**
   * Patches songs with string songs IDs to a numeric one and returns an array with IDs of songs where the ID patch were applied.
   * - - - -
   * @returns {string[]}
   */
  patchIDs(): string[] {
    const patchedSongsID: string[] = []
    const newSongs: RB3CompatibleDTAFile[] = []
    for (const song of this.songs) {
      if (!isNaN(Number(song.song_id))) newSongs.push(song)
      else {
        patchedSongsID.push(song.id)
        newSongs.push({ ...song, song_id: Math.abs(genNumericSongID(song.song_id)), original_id: song.song_id.toString() })
      }
    }

    this.songs = newSongs
    return patchedSongsID
  }

  /**
   * Patches the `cores` array of each song on the `songs` array and returns an array with IDs of songs where the encoding patch were applied.
   * - - - -
   * @returns {string[]}
   */
  patchCores(): string[] {
    const patchedSongsID: string[] = []
    const newSongs: RB3CompatibleDTAFile[] = []
    for (const song of this.songs) {
      const tracks = genTracksCountArray(song.tracks_count)
      const coresArray = Array<number>(tracks.allTracksCount)
        .fill(-1)
        .map((core, coreI) => {
          if (tracks.guitar?.includes(coreI)) return 1
          return -1
        })
      if (!(song.cores && JSON.stringify(song.cores) === JSON.stringify(coresArray))) newSongs.push(song)
      else {
        patchedSongsID.push(song.id)
        newSongs.push({ ...song, cores: coresArray })
      }
    }

    this.songs = newSongs
    return patchedSongsID
  }

  /**
   * Sorts the `songs` array based on a song data value.
   * - - - -
   * @param {SongSortingTypes} sortBy The sorting type.
   */
  sort(sortBy: SongSortingTypes): void {
    this.songs = sortDTA(this.songs, sortBy)
  }

  stringify(options?: SongDataStringifyOptions) {
    return stringifyDTA(this, options)
  }

  async export(destPath: FilePathLikeTypes, options?: SongDataStringifyOptions) {
    const dest = pathLikeToFilePath(destPath)
    return await dest.write(this.stringify(options), 'utf8')
  }
}
