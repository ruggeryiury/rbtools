import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'
import { FilePath, pathLikeToFilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryFile } from 'tempy'
import { PythonAPI, type ImageFileStatPythonObject } from '../core.exports'
import { isURL } from '../lib.exports'

// #region Types

export interface ImageFileJSONRepresentation extends FilePathJSONRepresentation, ImageFileStatPythonObject {}

export type ImageFormatTypes = 'png' | 'bmp' | 'jpg' | 'webp'
export type ImageInterpolationTypes = 'nearest' | 'box' | 'bilinear' | 'hamming' | 'bicubic' | 'lanczos'

export interface ImageConvertingOptions {
  /**
   * The desired width of the image. Default is the source image width.
   */
  width?: number
  /**
   * The desired height of the image. Default is the source image height.
   */
  height?: number
  /**
   * The desired interpolation method used on image resizing. Default is `'lanczos'`.
   */
  interpolation?: ImageInterpolationTypes
  /**
   * The desired quality value of the image. Default is `100`.
   */
  quality?: number
}

// #region Main Class

/**
 * `ImageFile` is a class that represents an image file.
 *
 * This class can process most of the known image files, such as JPEG, PNG, BMP, WEBP. Other formats were not tested.
 */
export class ImageFile {
  /**
   * The path to the image file.
   */
  path: FilePath

  /**
   * `ImageFile` is a class that represents an image file.
   * - - - -
   * @param {FilePathLikeTypes} imgFilePath The path of the image file.
   */
  constructor(imgFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(imgFilePath)
    if (this.path.ext === '.png_xbox' || this.path.ext === '.png_ps3' || this.path.ext === '.png_wii') throw new Error(`Tired to instance a ${this.path.ext.slice(1).toUpperCase()} file on the ImageFile class, use the TextureFile class instead`)
  }

  /**
   * Fetches an image from an URL and return it as a Buffer.
   * - - - -
   * @param {string} url The URL of the image file.
   * @returns {Promise<Buffer>}
   */
  static async urlToBuffer(url: string): Promise<Buffer> {
    if (!isURL(url)) throw new TypeError(`Provided string "${url}" is not a valid URL.`)
    const imgRes = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 4000,
    })

    if (imgRes.status !== 200) throw new Error(`URL returned with error with status ${imgRes.status.toString()}.`)
    return Buffer.from(imgRes.data)
  }

  /**
   * Fetches an image from an URL and save it on your computer, returning an instance of `ImageFile` pointing to the downloaded image.
   * - - - -
   * @param {string} url The URL of the image file.
   * @param {FilePathLikeTypes} destPath The path you want to save the image file.
   * @returns {Promise<ImageFile>}
   */
  static async urlToFile(url: string, destPath: FilePathLikeTypes): Promise<ImageFile> {
    const imgBuf = await this.urlToBuffer(url)
    const temp = new ImageFile(temporaryFile({ extension: 'dat' }))
    await temp.path.write(imgBuf)
    const tempFileStat = await temp.stat()
    const dest = pathLikeToFilePath(destPath).changeFileExt(tempFileStat.ext)
    await temp.path.rename(dest.path, true)
    return new ImageFile(dest.path)
  }

  /**
   * Checks if a path resolves to an existing image file.
   * - - - -
   * @returns {boolean}
   * @throws {Error} If the instance image file path does not exists.
   */
  private checkExistence(): boolean {
    if (!this.path.exists) throw new Error(`Provided image file path "${this.path.path}" does not exists`)
    return true
  }

  /**
   * Returns an object with stats of the image file.
   * - - - -
   * @returns {Promise<ImageFileStatPythonObject>}
   */
  async stat(): Promise<ImageFileStatPythonObject> {
    this.checkExistence()
    return await PythonAPI.imageFileStat(this.path)
  }

  /**
   * Returns a JSON representation of this `ImageFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the image file path.
   * - - - -
   * @returns {Promise<ImageFileJSONRepresentation>}
   */
  async toJSON(): Promise<ImageFileJSONRepresentation> {
    const returnValue = {
      ...this.path.toJSON(),
      ...(await this.stat()),
    } as ImageFileJSONRepresentation
    return returnValue
  }

  /**
   * Convert this image file to another image format, returning an instance of `ImageFile` pointing to the new converted image.
   *
   * By passing an argument to `options` parameter, you can tweak the dimensions of the new converted file.
   * - - - -
   * @param {FilePathLikeTypes} destPath The destination path of the new converted image. The new image extension is automatically placed based on the `toFormat` argument.
   * @param {ImageFormatTypes} toFormat The format of the new converted image.
   * @param {ImageConvertingOptions} [options] `OPTIONAL` An object that tweaks the behavior of the image processing and converting.
   * @returns {Promise<ImageFile>}
   */
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

  /**
   * Reads all the image file contents and returns it as a Buffer.
   * - - - -
   * @returns {Promise<Buffer>}
   */
  async toBuffer(): Promise<Buffer> {
    return await this.path.read()
  }

  /**
   * Converts the image file to Data URL, without processing.
   * - - - -
   * @returns {Promise<string>}
   */
  async toDataURL(): Promise<string> {
    this.checkExistence()
    const imgBuf = await this.toBuffer()
    const fileType = await fileTypeFromBuffer(imgBuf)
    if (!fileType) throw new Error(`Unknown image file format for provided file "${this.path.path}"`)
    const { mime } = fileType
    const dataURL = `data:${mime};base64,${imgBuf.toString('base64')}`
    return dataURL
  }

  /**
   * Converts the image file to Data URL, processing the image to generate a `256x256` version of the image file.
   * - - - -
   * @returns {Promise<string>}
   */
  async toThumbnailDataURL(): Promise<string> {
    this.checkExistence()
    const imgBuf = await this.toBuffer()
    const newBuf = await PythonAPI.imageBufferProcessor(imgBuf, 'webp', { height: 256, interpolation: 'lanczos', quality: 100, width: 256 })
    const dataURL = `data:image/webp;base64,${newBuf.toString('base64')}`
    return dataURL
  }
}
