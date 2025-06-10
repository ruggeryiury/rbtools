import axios from 'axios'
import { pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { createDTA, depackDTAContents, detectDTABufferEncoding, genNumericSongID, genTracksCountArray, isRB3CompatibleDTA, isURL, parseDTA, patchDTAEncodingFromDTAFileObject, sortDTA, stringifyDTA, type PartialDTAFile, type RB3CompatibleDTAFile, type SongDataCreationObject, type SongDataStringifyOptions, type SongSortingTypes } from '../lib.exports'

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
    const parser = new DTAParser(songs)
    parser.patchCores()
    parser.patchSongsEncodings()
    return parser
  }

  static async fromFile(dtaFilePath: FilePathLikeTypes): Promise<DTAParser> {
    const dta = pathLikeToFilePath(dtaFilePath)
    const dtaBuffer = await dta.read()
    return DTAParser.fromBuffer(dtaBuffer)
  }

  static async fromURL(url: string) {
    if (!isURL(url)) throw new Error(`Provided DTA URL "${url}" is not a valid HTTP/HTTPS URL`)
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' })
    if (response.status !== 200) throw new Error(`GET method fetching DTA file data on URL "${url}" returned with status ${response.status.toString()}: ${response.statusText}`)
    const buf = response.data
    return DTAParser.fromBuffer(Buffer.from(buf))
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

  songs: RB3CompatibleDTAFile[]
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
      }
    }
  }

  get length(): number {
    return this.songs.length
  }

  get updatesLength(): number {
    return this.updates.length
  }

  getSongByID(id: string): RB3CompatibleDTAFile | undefined {
    return this.songs.find((song) => String(song.id) === String(id))
  }

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

  addUpdates(updates: PartialDTAFile | PartialDTAFile[]): void {
    if (Array.isArray(updates)) {
      for (const update of updates) {
        const i = this.updates.findIndex((val) => val.id === update.id)
        if (i === -1) this.updates.push(update)
        else this.updates[i] = { ...this.updates[i], ...update }
      }
      this.updates.push(...updates)
    } else {
      const i = this.updates.findIndex((val) => val.id === updates.id)
      if (i === -1) this.updates.push(updates)
      else this.updates[i] = { ...this.updates[i], ...updates }
    }
  }

  async addDXUpdates(): Promise<void> {
    const links = ['https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/official_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/unofficial_additional_metadata.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/metadata_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/harms_and_updates.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rbhp_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_strings.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/combined_strings_and_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/rb3_plus_keys.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/vanilla.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/other_upgrades.dta', 'https://raw.githubusercontent.com/hmxmilohax/rock-band-3-deluxe/refs/heads/develop/_ark/dx/song_updates/loading_phrases.dta']

    for (const link of links) {
      const dta = await DTAParser.fromURL(link)
      this.addUpdates(dta.updates)
    }

    this.applyUpdatesToExistingSongs()
  }

  applyUpdatesToExistingSongs(deleteNonAppliedUpdates = true) {
    if (this.updates.length === 0) return
    const appliedUpdSongsIDs: string[] = []
    const unusedUpdates: PartialDTAFile[] = []
    const newSongs: RB3CompatibleDTAFile[] = []

    for (const upd of this.updates) {
      const updID = upd.id
      const song = this.songs.find((song) => song.id === updID)
      if (song) appliedUpdSongsIDs.push(upd.id)
      else unusedUpdates.push(upd)
    }
    for (const song of this.songs) {
      const upd = this.updates.find((up) => song.id === up.id)
      if (upd) newSongs.push({ ...song, ...upd })
      else newSongs.push(song)
    }
    this.songs = newSongs
    if (deleteNonAppliedUpdates) this.updates = []
    else this.updates = unusedUpdates
    return appliedUpdSongsIDs
  }

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

  patchIDs(): string[] {
    const patchedSongsID: string[] = []
    const newSongs: RB3CompatibleDTAFile[] = []
    for (const song of this.songs) {
      if (!isNaN(Number(song.song_id))) newSongs.push(song)
      else {
        patchedSongsID.push(song.id)
        newSongs.push({ ...song, song_id: Math.abs(genNumericSongID(song.song_id)) })
      }
    }

    this.songs = newSongs
    return patchedSongsID
  }

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

  sort(sortBy: SongSortingTypes): void {
    this.songs = sortDTA(this.songs, sortBy)
  }

  stringify(options?: SongDataStringifyOptions) {
    this.applyUpdatesToExistingSongs()
    return stringifyDTA(this, options)
  }
}
