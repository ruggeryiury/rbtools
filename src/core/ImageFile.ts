import { fileTypeFromBuffer } from 'file-type'
import { FilePath, PathError, pathLikeToFilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { PythonAPI, type ImgFileStatPythonObject } from '../core.exports'

export interface ImageFileJSONRepresentation extends FilePathJSONRepresentation, ImgFileStatPythonObject {}

export type ImageFormatTypes = 'png' | 'bmp' | 'jpg' | 'webp'
export type ImageInterpolationTypes = 'nearest' | 'box' | 'bilinear' | 'hamming' | 'bicubic' | 'lanczos'

export interface ImageConvertingOptions {
  width?: number
  height?: number
  interpolation?: ImageInterpolationTypes
  quality?: number
}

/**
 * `ImageFile` is a class that represents an image file.
 * - - - -
 */
export class ImageFile {
  path: FilePath
  private buffer = Buffer.alloc(0)

  constructor(imgFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(imgFilePath)
    if (this.path.ext === '.png_xbox' || this.path.ext === '.png_ps3' || this.path.ext === '.png_wii') throw new Error(`Tired to instance a ${this.path.ext.slice(1).toUpperCase()} file on the ImageFile class, use the TextureFile class instead`)
  }

  /**
   * Checks if a path resolves to an existing image file.
   * - - - -
   * @returns {boolean}
   * @throws {PathError} If the instance image file path does not exists.
   */
  private checkExistence(): boolean {
    if (!this.path.exists) throw new PathError(`Provided image file path "${this.path.path}" does not exists`)
    return true
  }

  async stat(): Promise<ImgFileStatPythonObject> {
    this.checkExistence()
    return await PythonAPI.imgFileStat(this.path)
  }

  async toJSON(): Promise<ImageFileJSONRepresentation> {
    const returnValue = {
      ...this.path.toJSON(),
      ...(await this.stat()),
    } as ImageFileJSONRepresentation
    return returnValue
  }

  async convertToImage(destPath: FilePathLikeTypes, toFormat: ImageFormatTypes, options?: ImageConvertingOptions): Promise<ImageFile> {
    const { width: srcWidth, height: srcHeight } = await this.stat()
    const opts = setDefaultOptions(
      {
        width: srcWidth,
        height: srcHeight,
        interpolation: 'lanczos',
        quality: 100,
      },
      options
    )

    const dest = pathLikeToFilePath(destPath).changeFileExt(toFormat)
    if (opts.quality < 1 || opts.quality > 100) throw new TypeError(`Quality value must be a number value from 1 to 100, given ${opts.quality.toString()}`)
    if (this.path.ext === dest.ext && this.path.name === dest.name) throw new TypeError('Source and destination file has the same file name and extension')

    await dest.delete()

    return await PythonAPI.imageConverter(this.path, dest, toFormat, opts)
  }

  async toBuffer(): Promise<Buffer> {
    return await this.path.read()
  }

  async toDataURL(): Promise<string> {
    this.checkExistence()
    const imgBuf = await this.toBuffer()
    const fileType = await fileTypeFromBuffer(imgBuf)
    if (!fileType) throw new Error(`Unknown image file format for provided file "${this.path.path}"`)
    const { mime } = fileType
    const dataURL = `data:${mime};base64,${imgBuf.toString('base64')}`
    return dataURL
  }

  async toThumbnailDataURL(): Promise<string> {
    this.checkExistence()
    const imgBuf = await this.toBuffer()
    const newBuf = await PythonAPI.imageBufferProcessor(imgBuf, 'webp', { height: 256, interpolation: 'lanczos', quality: 100, width: 256 })
    const dataURL = `data:image/webp;base64,${newBuf.toString('base64')}`
    return dataURL
  }
}
