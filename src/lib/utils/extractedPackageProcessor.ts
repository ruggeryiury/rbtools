import { FilePath, isFile, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryFile } from 'tempy'
import { MOGGFile, PythonAPI, TextureFile, type MOGGFileEncryptionVersion, type TextureSizeTypes } from '../../core.exports'

export interface ExtractedPackageProcessorOptions {
  /**
   * Tells if the MOGG files must be encrypted or decrypted. If `true`, the MOGG files will be encrypted using the 0B encryption. Other encrypted MOGGs that encrypted using other encryption version will be decrypted and reencrypted using 0B. Default is `false` (no encryption).
   */
  moggEncrypted?: boolean | MOGGFileEncryptionVersion
  moggXbox?: boolean
  moggRedKeys?: boolean
  /**
   * Tells which console version of the texture files will be processed into. Default is `png_xbox`.
   */
  png?: 'png_xbox' | 'png_ps3' | 'png_wii'
  /**
   * Tells which console version of the MILO files will be processed into. Default is `milo_xbox`.
   */
  milo?: 'milo_xbox' | 'milo_ps3' | 'milo_wii'
}

/**
 * Processes all songs files from a folder of extracted packages and returns the song package folder.
 * 
 * Works on extracted CON files, extracted PKG files, and extracted RB3 Package file.
 * - - - -
 * @param {DirPathLikeTypes} extractedPackageFolderPath The folder where the extracted package contents are into.
 * @param {ExtractedPackageProcessorOptions} [options] `OPTIONAL` Changes specific behaviors of the process.
 * @returns {Promise<FilePath[]>}
 */
export const extractedPackageProcessor = async (extractedPackageFolderPath: DirPathLikeTypes, options?: ExtractedPackageProcessorOptions): Promise<FilePath[]> => {
  const folder = pathLikeToDirPath(extractedPackageFolderPath)
  if (!folder.exists) throw new Error(`Provided extract package folder "${folder.path}" does not exists.`)
  const { moggEncrypted, moggXbox, moggRedKeys, png, milo } = setDefaultOptions(
    {
      moggEncrypted: false,
      moggXbox: true,
      moggRedKeys: false,
      png: 'png_xbox',
      milo: 'milo_xbox',
    },
    options
  )

  const filteredFolderContents = (await folder.readDir(true, true))
    .filter((val) => isFile(val))
    .map((val) => pathLikeToFilePath(val))
    .filter((val) => val.ext !== '.dta')
  const newFiles: FilePath[] = []
  for (const file of filteredFolderContents) {
    const ext = file.ext.slice(1)
    switch (ext) {
      case 'milo_xbox':
      case 'milo_ps3':
      case 'milo_wii': {
        if (ext !== milo) newFiles.push(await file.rename(file.changeFileExt(milo)))
        else newFiles.push(file)
        break
      }
      case 'png_xbox':
      case 'png_ps3':
      case 'png_wii': {
        if (ext !== png) {
          const tempPng = pathLikeToFilePath(temporaryFile({ extension: '.png' }))
          const tex = new TextureFile(file)
          const img = await tex.convertToImage(tempPng, 'png')
          const { width } = await img.stat()
          await img.convertToTexture(file.changeFileExt(png), png, width as TextureSizeTypes)
          if (file.exists) await file.delete()
          if (tempPng.exists) await tempPng.delete()
        }
        newFiles.push(file)
        break
      }
      case 'mogg': {
        const desiredMOGGEnc = moggEncrypted === true ? 11 : moggEncrypted === false ? 10 : moggEncrypted
        const mustBeEncrypted = desiredMOGGEnc > 10
        const mogg = new MOGGFile(file)
        const sourceEncVersion = await mogg.checkFileIntegrity()
        if (mustBeEncrypted) {
          if (sourceEncVersion === 10) {
            // Encrypt decrypted MOGGs
            const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
            await PythonAPI.encryptMOGG(file, tempMogg, desiredMOGGEnc, moggXbox, moggRedKeys)
            await tempMogg.rename(file, true)
          } else if (sourceEncVersion !== desiredMOGGEnc) {
            // Decrypt then reencrypt
            const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
            await PythonAPI.decryptMOGG(file, tempMogg)
            await PythonAPI.encryptMOGG(tempMogg, file, desiredMOGGEnc, moggXbox, moggRedKeys)
            await tempMogg.delete()
          }
        } else {
          if (sourceEncVersion > 10) {
            // Decrypt MOGG
            const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
            await PythonAPI.decryptMOGG(file, tempMogg)
            await tempMogg.rename(file, true)
          }
        }
        newFiles.push(file)
        break
      }
      case 'mid':
      case 'edat': {
        newFiles.push(file)
        break
      }
      default:
        break
    }
  }

  return newFiles
}
