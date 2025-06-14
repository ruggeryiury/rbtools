import { type FilePath, pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { temporaryFile } from 'tempy'
import { BinaryAPI, MOGGFile, PythonAPI } from '../core.exports'

/**
 * A class that can create multitrack OGG files to use on Rock Band games.
 */
export class MOGGMaker {
  /**
   * An array with file paths of the individual audio files that will be the channels of the new MOGG file.
   */
  private tracks: FilePath[]
  /**
   * The quantity of channels.
   */
  private channelsCount: number
  /**
   * The duration of the audio (in milliseconds).
   */
  private audioDuration: number
  /**
   * The sample rate used on this MOGG file.
   */
  private audioSampleRate: number

  constructor() {
    this.tracks = []
    this.channelsCount = 0
    this.audioDuration = 0
    this.audioSampleRate = 0
  }

  /**
   * Gets the amount of channels of the the new MOGG file.
   * @returns {number}
   */
  get channels(): number {
    return this.channelsCount
  }

  /**
   * Appends an audio file to the MOGG file audio array.
   * - - - -
   * @param {FilePathLikeTypes} audioFilePath The path to the audio file.
   */
  async addTrack(audioFilePath: FilePathLikeTypes): Promise<void> {
    const audioPath = pathLikeToFilePath(audioFilePath)
    const { channels, duration, sampleRate } = await PythonAPI.audioFileStat(audioFilePath)

    if (!channels || !duration || !sampleRate) throw new Error(`Provided file "${audioPath.path}" is not a compatible audio file.`)

    if (this.audioDuration === 0) this.audioDuration = duration
    if (this.audioDuration !== duration) throw new Error(`Provided file "${audioPath.path}" doesn't have the same duration from the first audio file added to this class\n\nClass audio duration: ${this.audioDuration.toString()}\nProvided file duration: ${duration.toString()}`)

    if (this.audioSampleRate === 0) this.audioSampleRate = sampleRate
    if (this.audioSampleRate !== sampleRate) throw new Error(`Provided file "${audioPath.path}" doesn't have the same sample rate from the first audio file added to this class\n\nClass sample rate: ${this.audioSampleRate.toString()}\nProvided file sample rate: ${sampleRate.toString()}`)

    this.channelsCount += channels
    this.tracks.push(audioPath)
  }

  /**
   * Creates a multitrack OGG file and adds the MOGG header, returning a `MOGGFile` class pointing to the new MOGG file.
   * - - - -
   * @param {FilePathLikeTypes} destPath The destination path to the new MOGG file.
   * @param {boolean} [encrypt] `OPTIONAL` Encrypts the MOGG file. The encryption works on all systems. Default is `false`.
   * @returns {Promise<MOGGFile>}
   */
  async create(destPath: FilePathLikeTypes, encrypt = false): Promise<MOGGFile> {
    if (this.channelsCount === 6) throw new Error('Tried to create a MOGG file with six channels, which is known to cause glitches on the audio, possible due to surround.')
    const dest = pathLikeToFilePath(destPath).changeFileExt('mogg')
    const tempOggFile = await PythonAPI.multitrackOGGCreator(this.tracks, temporaryFile({ extension: '.ogg' }))
    try {
      await BinaryAPI.makeMoog(tempOggFile, dest, encrypt)
      await tempOggFile.delete()
      return new MOGGFile(dest)
    } catch (error) {
      await tempOggFile.delete()
      throw error
    }
  }
}
