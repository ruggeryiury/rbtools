import { FilePath, pathLikeToDirPath, type DirPathLikeTypes } from 'node-lib'

export interface SongExtractionPathObject {
  /**
   * The path to the song's MOGG file.
   */
  mogg: FilePath
  /**
   * The path to the song's MIDI file.
   */
  midi: FilePath
  /**
   * The path to the song's texture file.
   */
  png: FilePath
  /**
   * The path to the song's MILO file.
   */
  milo: FilePath
}

/**
 * Mounts the paths to a song's files for RPCS3 environment.
 * - - - -
 * @param {DirPathLikeTypes} songFolder The folder to the song's files.
 * @param {string} songname The songname (shortname) of the song.
 * @returns {Promise<SongExtractionPathObject>}
 */
export const mountRPCS3SongExtractionPaths = async (songFolder: DirPathLikeTypes, songname: string): Promise<SongExtractionPathObject> => {
  const song = pathLikeToDirPath(songFolder).gotoDir(songname)
  if (!song.exists) await song.mkDir()
  const gen = song.gotoDir('gen')
  if (!gen.exists) await gen.mkDir()
  const mogg = song.gotoFile(`${songname}.mogg`)
  const midi = song.gotoFile(`${songname}.mid.edat`)
  const png = gen.gotoFile(`${songname}_keep.png_ps3`)
  const milo = gen.gotoFile(`${songname}.milo_ps3`)

  return { mogg, midi, png, milo }
}
