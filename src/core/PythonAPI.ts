import { spawn } from 'node:child_process'
import { execAsync, type FilePath, pathLikeToFilePath, pathLikeToString, type DirPathLikeTypes, type FilePathLikeTypes, type DirPath, pathLikeToDirPath } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { ImageFile, RBTools, type ImageConvertingOptions, type ImageFormatTypes } from '../core.exports'
import type { TPLHeaderParserObject } from '../lib.exports'

// #region Types

export interface ImageFileStatPythonObject {
  /**
   * The extension of the image file.
   */
  ext: string
  /**
   * A description to the image file format.
   */
  extDesc: string
  /**
   * The MIME type of the image file.
   */
  mimeType: string
  /**
   * The width of the image file.
   */
  width: number
  /**
   * The height of the image file.
   */
  height: number
  /**
   * An array with the image file dimensions (width and height).
   */
  dimensions: number[]
  /**
   * The color mode of the image file.
   */
  imageMode: string
}

export interface AudioFileStatPythonObject {
  bitRate: number
  channels: number
  codec: string
  codecDesc: string
  durationSeconds: number
  duration: number
  ext: string
  extDesc: string
  sampleRate: number
  size: number
}

export interface MOGGFileStatPythonObject {
  bitRate: number
  channels: number
  codec: string
  codecDesc: string
  duration: number
  durationSec: number
  ext: string
  extDesc: string
  sampleRate: number
  size: number
  mogg: { size: number; version: number; isEncrypted: boolean; worksInPS3: boolean }
}

export interface MIDIFileStatPythonObject {
  charset: string
  midiType: number
  ticksPerBeat: number
  tracksCount: number
  tracksName: string[]
}

export interface STFSFileStatRawObject {
  /** The name of the package. */
  name: string
  /** The description of the package. */
  desc: string
  /** An array with all files included on the CON file. */
  files: string[]
  /** The contents of the package's DTA file. */
  dta?: string
  /** The contents of the package's upgrades DTA file. */
  upgrades?: string
}

// #region Main Class

export class PythonAPI {
  /**
   * Returns an object with stats of an image file.
   * - - - -
   * @param {FilePathLikeTypes} imgFilePath The path to the image file.
   * @returns {Promise<ImageFileStatPythonObject>}
   */
  static async imageFileStat(imgFilePath: FilePathLikeTypes): Promise<ImageFileStatPythonObject> {
    const pythonScript = 'img_file_stat.py'
    const command = `python "${pythonScript}" "${pathLikeToString(imgFilePath)}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as ImageFileStatPythonObject
    return returnValue
  }

  /**
   * Converts an image file to another image file format.
   *
   * By passing an argument to `options` parameter, you can tweak the dimensions of the new converted file.
   * - - - -
   * @param {FilePathLikeTypes} srcFilePath The source image file to be converted.
   * @param {FilePathLikeTypes} destFilePath The destination path of the new converted image. The new image extension is automatically placed based on the `toFormat` argument.
   * @param {ImageFormatTypes} toFormat The format of the new converted image.
   * @param {ImageConvertingOptions} [options] `OPTIONAL` An object that tweaks the behavior of the image processing and converting.
   * @returns {ImageFile}
   */
  static async imageConverter(srcFilePath: FilePathLikeTypes, destFilePath: FilePathLikeTypes, toFormat: ImageFormatTypes, options?: ImageConvertingOptions): Promise<ImageFile> {
    const opts = setDefaultOptions(
      {
        width: 256,
        height: 256,
        interpolation: 'lanczos',
        quality: 100,
      },
      options
    )
    const dest = pathLikeToFilePath(destFilePath).changeFileExt(toFormat)
    const pythonScript = 'image_converter.py'
    const command = `python "${pythonScript}" "${pathLikeToString(srcFilePath)}" "${pathLikeToString(dest)}" --width ${opts.width.toString()} --height ${opts.height.toString()} --interpolation ${opts.interpolation.toUpperCase()} --quality ${opts.quality.toString()}`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    return new ImageFile(destFilePath)
  }

  /**
   * Processes an image buffer.
   * - - - -
   * @param {Buffer | FilePathLikeTypes} imgPathOrBuffer The path or buffer of an image file.
   * @param {ImageFormatTypes} toFormat The format of the new converted image.
   * @param {ImageConvertingOptions} [options] `OPTIONAL` An object that tweaks the behavior of the image processing and converting.
   * @returns {Promise<Buffer>}
   */
  static async imageBufferProcessor(imgPathOrBuffer: Buffer | FilePathLikeTypes, toFormat: ImageFormatTypes, options?: ImageConvertingOptions): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const opts = setDefaultOptions(
        {
          width: 256,
          height: 256,
          interpolation: 'lanczos',
          quality: 100,
        },
        options
      )
      const pythonScript = 'image_buffer_processor.py'
      const process = spawn('python', [pythonScript], { cwd: RBTools.pyFolder.path, windowsHide: true })
      const imgBase64 = Buffer.isBuffer(imgPathOrBuffer) ? imgPathOrBuffer.toString('base64') : pathLikeToFilePath(imgPathOrBuffer).readSync().toString('base64')

      let stdout = ''
      let stderr = ''

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })
      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.from(stdout, 'base64'))
        } else if (code === null) {
          reject(new Error(`Python script exited with unknown code: ${stderr}`))
        } else {
          reject(new Error(`Python script exited with code ${code.toString()}: ${stderr}`))
        }
      })

      process.stdin.write(JSON.stringify({ imgBase64, format: toFormat.toUpperCase(), width: opts.width, height: opts.height, interpolation: opts.interpolation.toUpperCase(), quality: opts.quality, printResults: true }))
      process.stdin.end() // Close stdin to signal that the input is complete
    })
  }

  /**
   * Returns an object with stats of an audio file.
   * - - - -
   * @param {FilePathLikeTypes} audioFilePath The path to the image file.
   * @returns {Promise<AudioFileStatPythonObject>}
   */
  static async audioFileStat(audioFilePath: FilePathLikeTypes): Promise<AudioFileStatPythonObject> {
    const pythonScript = 'audio_file_stat.py'
    const command = `python "${pythonScript}" "${pathLikeToString(audioFilePath)}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as AudioFileStatPythonObject
    return returnValue
  }

  static async multitrackOGGCreator(tracks: FilePathLikeTypes[], destPath: FilePathLikeTypes): Promise<FilePath> {
    const pythonScript = 'multitrack_ogg_creator.py'

    let audioFilesInput = ''
    for (const track of tracks) {
      audioFilesInput += `"${pathLikeToString(track)}" `
    }
    const command = `python "${pythonScript}" ${audioFilesInput} -o "${pathLikeToString(destPath)}"`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    return pathLikeToFilePath(destPath)
  }

  /**
   * Returns an object with stats of a MOGG file.
   * - - - -
   * @param {FilePathLikeTypes} moggFilePath The path to the MOGG file.
   * @returns {Promise<MOGGFileStatPythonObject>}
   */
  static async moggFileStat(moggFilePath: FilePathLikeTypes): Promise<MOGGFileStatPythonObject> {
    const pythonScript = 'mogg_file_stat.py'
    const command = `python "${pythonScript}" "${pathLikeToString(moggFilePath)}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as MOGGFileStatPythonObject
    return returnValue
  }

  /**
   * Returns an object with stats of a MIDI file.
   * - - - -
   * @param {FilePathLikeTypes} midiFilePath The path to the MOGG file.
   * @returns {Promise<MIDIFileStatPythonObject>}
   */
  static async midiFileStat(midiFilePath: FilePathLikeTypes): Promise<MIDIFileStatPythonObject> {
    const pythonScript = 'midi_file_stat.py'
    const command = `python "${pythonScript}" "${pathLikeToString(midiFilePath)}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as MIDIFileStatPythonObject
    return returnValue
  }

  /**
   * Converts a PNG_WII file Buffer to a WEBP Base64-encoded string.
   * - - - -
   * @param {FilePathLikeTypes} texWiiPath The path to the `.png_wii` file.
   * @param {TPLHeaderParserObject} texHeader The header of the PNG_WII file.
   * @returns {Promise<string>}
   */
  static async texWiiToBase64Buffer(texWiiPath: FilePathLikeTypes, texHeader: TPLHeaderParserObject): Promise<string> {
    const tex = pathLikeToFilePath(texWiiPath)
    const base64Header = texHeader.data.toString('base64')
    const pythonScript = 'texwii_to_base64_buffer.py'
    const command = `python "${pythonScript}" "${tex.path}" -tpl "${base64Header}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const [dataURL] = stdout.split('\r\n')
    return dataURL
  }

  /**
   * Returns an object with stats of a STFS file.
   * - - - -
   * @param {FilePathLikeTypes} stfsFilePath The path of the CON file.
   * @returns {Promise<STFSFileStatRawObject>}
   */
  static async stfsFileStat(stfsFilePath: FilePathLikeTypes): Promise<STFSFileStatRawObject> {
    const stfs = pathLikeToFilePath(stfsFilePath)
    const pythonScript = 'stfs_file_stat.py'
    const command = `python "${pythonScript}" "${stfs.path}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as STFSFileStatRawObject
    return returnValue
  }

  /**
   * Extracts the CON file contents and returns the folder path where all contents were extracted.
   * - - - -
   * @param {FilePathLikeTypes} stfsFilePath The path of the CON file.
   * @param {DirPathLikeTypes} destPath The folder path where you want the files to be extracted to.
   * @param {boolean} [extractOnRoot] `OPTIONAL` Extract all files on the root rather than recreate the entire STFS file system recursively. Default is `false`.
   * @returns {Promise<DirPath>}
   */
  static async stfsExtract(stfsFilePath: FilePathLikeTypes, destPath: DirPathLikeTypes, extractOnRoot = false) {
    const stfs = pathLikeToFilePath(stfsFilePath)
    const dest = pathLikeToDirPath(destPath)
    const pythonScript = 'stfs_extract.py'
    let command = `python "${pythonScript}" "${stfs.path}" "${dest.path}"`
    if (extractOnRoot) command += ' --extract-on-root'
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    return dest
  }
}
