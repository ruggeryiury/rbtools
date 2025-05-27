import 'dotenv/config'
import type { DirPath } from 'node-lib'
import { thisFilePath } from '../lib.exports'

export type RBToolsDebugLevels = 1 | 2 | 3

export class RBTools {
  /**
   * Gets the root directory path of the _RBTools_ module.
   *
   * Defaults to built `dist` folder unless a `RBTOOLS_USESOURCE` variable environment is set to `1`
   * that sets the folder to `src`.
   * - - - -
   * @returns {DirPath}
   */
  static get moduleRoot(): DirPath {
    return thisFilePath(import.meta.url).gotoDir('../../')
  }

  /**
   * Gets the root of the `bin` folder, where all non-JavaScripts files are found.
   * @returns {DirPath}
   */
  static get binFolder(): DirPath {
    return this.moduleRoot.gotoDir(process.env.RBTOOLS_BIN_PATH ?? 'dist/bin')
  }

  /**
   * Gets the root of the `python` folder, where all Python scripts are found.
   * @returns {DirPath}
   */
  static get pyFolder(): DirPath {
    return this.moduleRoot.gotoDir(process.env.RBTOOLS_BIN_PATH ? `${process.env.RBTOOLS_BIN_PATH}/python` : 'src/bin/python')
  }
}
