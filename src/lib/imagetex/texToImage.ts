import { once } from 'node:events'
import { pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { temporaryFile } from 'tempy'
import { BinaryAPI, type ImageFile, PythonAPI, type ImageFormatTypes } from '../../core.exports'
import { getDDSHeader, getTPLHeader } from '../../lib.exports'

/**
 * Converts a PNG_XBOX or PNG_PS3 texture file to any image format.
 * - - - -
 * @param {FilePathLikeTypes} srcFile The path of the texture file to want to convert.
 * @param {FilePathLikeTypes} destPath The path of the new converted image file.
 * @param {ImageFormatTypes} toFormat The desired image format of the new image file.
 * @returns {Promise<ImageFile>} A new instantiated `ImgFile` class pointing to the new converted image file.
 */
export const texXboxPs3ToImage = async (srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes, toFormat: ImageFormatTypes): Promise<ImageFile> => {
  const src = pathLikeToFilePath(srcFile)
  const dest = pathLikeToFilePath(destPath).changeFileExt(toFormat)
  const dds = pathLikeToFilePath(temporaryFile({ extension: '.dds' }))

  await dest.delete()

  const srcBuffer = await src.read()
  // 32 is the size of the texture file header we need to skip
  // 4 for byte swapping
  const loopIteration = (srcBuffer.length - 32) / 4
  const srcContents = srcBuffer.subarray(32)

  const fullHeader = srcBuffer.subarray(0, 16)
  const shortHeader = srcBuffer.subarray(5, 11)

  const srcHeader = await getDDSHeader(fullHeader, shortHeader)
  const ddsStream = await dds.createWriteStream()
  ddsStream.write(srcHeader.data)

  for (let i = 0; i <= loopIteration; i++) {
    const newBuffer = Buffer.alloc(4)
    srcContents.copy(newBuffer, 0, i * 4, i * 4 + 4)
    const swappedBytes = src.ext === '.png_ps3' ? newBuffer : Buffer.from([newBuffer[1], newBuffer[0], newBuffer[3], newBuffer[2]])
    if (i === loopIteration) ddsStream.end(swappedBytes)
    else ddsStream.write(swappedBytes)
  }

  await once(ddsStream, 'finish')

  try {
    const image = await PythonAPI.imageConverter(dds, dest, toFormat, { width: srcHeader.width, height: srcHeader.height })
    await dds.delete()
    return image
  } catch (error) {
    await dds.delete()
    throw error
  }
}

/**
 * Converts a PNG_WII texture file to any image format.
 * - - - -
 * @param {FilePathLikeTypes} srcFile The path of the texture file to want to convert.
 * @param {FilePathLikeTypes} destPath The path of the new converted image file.
 * @param {ImageFormatTypes} toFormat The desired image format of the new image file.
 * @returns {Promise<ImageFile>} A new instantiated `ImgFile` class pointing to the new converted image file.
 */
export const texWiiToImage = async (srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes, toFormat: ImageFormatTypes): Promise<ImageFile> => {
  const src = pathLikeToFilePath(srcFile)
  const dest = pathLikeToFilePath(destPath).changeFileExt(toFormat)
  const tpl = pathLikeToFilePath(temporaryFile({ extension: '.tpl' }))

  await dest.delete()

  const srcHeader = await getTPLHeader(src)
  // 32 is the size of the texture file header we need to skip
  const srcContents = await src.readOffset(32)

  const tplStream = await tpl.createWriteStream()
  tplStream.write(srcHeader.data)
  tplStream.end(srcContents)

  await once(tplStream, 'finish')

  const image = await BinaryAPI.WimgtDec(tpl, dest)

  await tpl.delete()
  return image
}
