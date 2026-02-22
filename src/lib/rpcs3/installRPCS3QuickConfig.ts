import { FilePath, pathLikeToFilePath } from 'node-lib'
import { RBTools } from '../../core.exports'
import { isRPCS3ExePathValid } from './isRPCS3ExePathValid'

export type QuickConfigType = 'recommended' | 'minimum' | 'potato'

/**
 *
 * @param rpcs3ExePath
 * @param configType
 * @returns
 */
export const installRPCS3QuickConfig = async (rpcs3ExePath: string, configType: QuickConfigType): Promise<FilePath> => {
  const rpcs3Exe = isRPCS3ExePathValid(rpcs3ExePath)
  const configYmlFile = RBTools.resFolder.gotoFile(`${configType}.yml`)
  const configFolder = pathLikeToFilePath(rpcs3ExePath).gotoDir('config/custom_configs/')
  const rb3ConfigFile = configFolder.gotoFile('config_BLUS30463.yml')
  if (!configFolder.exists) await configFolder.mkDir(true)
  await configYmlFile.copy(rb3ConfigFile, true)

  return configYmlFile
}
