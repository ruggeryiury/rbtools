import { spawn } from 'node:child_process'
import { execAsync, pathLikeToFilePath, pathLikeToString, type FilePathLikeTypes } from 'node-lib'
import { ImageFile, type ImageConvertingOptions, type ImageFormatTypes } from './ImageFile'
import { RBTools } from './RBTools'

export interface ImgFileStatPythonObject {
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
   * An array with the image file's width and height.
   */
  size: number[]
  /**
   * The color mode of the image file.
   */
  imageMode: string
}

export class PythonAPI {
  static async imgFileStat(imgFilePath: FilePathLikeTypes): Promise<ImgFileStatPythonObject> {
    const pythonScript = RBTools.pyFolder.gotoFile('img_file_stat.py')
    const command = `python "${pythonScript.path}" "${pathLikeToString(imgFilePath)}" -p`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    const returnValue = JSON.parse(stdout) as ImgFileStatPythonObject
    return returnValue
  }

  static async imageConverter(srcFilePath: FilePathLikeTypes, destFilePath: FilePathLikeTypes, toFormat: ImageFormatTypes, options: Required<ImageConvertingOptions>): Promise<ImageFile> {
    const dest = pathLikeToFilePath(destFilePath).changeFileExt(toFormat)
    const pythonScript = RBTools.pyFolder.gotoFile('image_converter.py')
    const command = `python "${pythonScript.path}" "${pathLikeToString(srcFilePath)}" "${pathLikeToString(dest)}" --width ${options.width.toString()} --height ${options.height.toString()} --interpolation ${options.interpolation.toUpperCase()} --quality ${options.quality.toString()}`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.pyFolder.path })
    if (stderr) throw new Error(stderr)
    return new ImageFile(destFilePath)
  }

  static async imageBufferProcessor(imgBuffer: Buffer, toFormat: ImageFormatTypes, options: Required<ImageConvertingOptions>) {
    return new Promise<Buffer>((resolve, reject) => {
      const pythonScript = RBTools.pyFolder.gotoFile('image_buffer_processor.py')
      const process = spawn('python', [pythonScript.fullname], { cwd: RBTools.pyFolder.path, windowsHide: true })
      const imgBase64 = imgBuffer.toString('base64')

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

      process.stdin.write(JSON.stringify({ imgBase64, format: toFormat.toUpperCase(), width: options.width, height: options.height, interpolation: options.interpolation.toUpperCase(), quality: options.quality, printResults: true }))
      process.stdin.end() // Close stdin to signal that the input is complete
    })
  }
}
