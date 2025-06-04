import { once } from 'node:events'
import { pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { temporaryFile } from 'tempy'
import { BinaryAPI, PythonAPI, TextureFile, type TextureFormatTypes, type TextureSizeTypes } from '../../core.exports'
import { imageHeaders } from '../../lib.exports'

export const imageToTexXboxPs3 = async (srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes, toFormat: TextureFormatTypes, size: TextureSizeTypes = 256) => {
  const src = pathLikeToFilePath(srcFile)
  const dest = pathLikeToFilePath(destPath).changeFileExt(toFormat)

  if (src.ext === dest.ext) throw new Error('Source and destination file has the same file extension.')

  const tga = pathLikeToFilePath(temporaryFile({ extension: '.tga' }))
  const dds = pathLikeToFilePath(temporaryFile({ extension: '.dds' }))

  await dest.delete()

  await PythonAPI.imageConverter(src, tga, 'tga', {
    width: size,
    height: size,
    interpolation: 'lanczos',
    quality: 100,
  })

  await BinaryAPI.NVCompress(tga, dds)
  await tga.delete()

  const ddsHeaderName = `${size.toString()}pDTX5` as keyof typeof imageHeaders
  const ddsHeaderUint8 = imageHeaders[ddsHeaderName] as readonly number[] | undefined
  if (ddsHeaderUint8 === undefined) throw new Error('Provided file path is not recognizable as a DDS file.')
  const ddsHeader = Buffer.from(ddsHeaderUint8)

  const ddsBuffer = await dds.read()
  const texStream = await dest.createWriteStream()

  // 128 is the size of the DDS file header we need to skip
  // 4 for byte swapping
  const loopIteration = (ddsBuffer.length - 128) / 4
  const ddsContents = ddsBuffer.subarray(128)

  texStream.write(ddsHeader)
  for (let i = 0; i <= loopIteration; i++) {
    const newBuffer = Buffer.alloc(4)
    ddsContents.copy(newBuffer, 0, i * 4, i * 4 + 4)
    const swappedBytes = src.ext === '.png_ps3' ? newBuffer : Buffer.from([newBuffer[1], newBuffer[0], newBuffer[3], newBuffer[2]])
    if (i === loopIteration) texStream.end(swappedBytes)
    else texStream.write(swappedBytes)
  }

  await once(texStream, 'finish')
  await dds.delete()
  return new TextureFile(dest)
}

export const imageToTexWii = async (srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes) => {
  const src = pathLikeToFilePath(srcFile)
  const dest = pathLikeToFilePath(destPath).changeFileExt('.png_wii')

  if (src.ext === dest.ext) throw new Error('Source and destination file has the same texture format.')

  const png = pathLikeToFilePath(temporaryFile({ extension: '.png' }))
  const tpl = pathLikeToFilePath(temporaryFile({ extension: '.tpl' }))

  await dest.delete()

  await PythonAPI.imageConverter(src, png, 'png', { height: 256, width: 256 })

  await BinaryAPI.WimgtEnc(png, tpl)

  await png.delete()

  const tplBuffer = await tpl.read()
  const texStream = await dest.createWriteStream()

  // 64 is the size of the TPL file header we need to skip
  const tplContents = tplBuffer.subarray(64)
  texStream.write(Buffer.from(imageHeaders.WII256x256))
  texStream.end(tplContents)
  await once(texStream, 'finish')
  await tpl.delete()
  return new TextureFile(dest)
}
