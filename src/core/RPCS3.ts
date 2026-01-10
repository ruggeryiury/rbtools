import { DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePath, type FilePathLikeTypes } from 'node-lib'
import { getRPCS3SongStats, getRPCS3Stats, isDevHDD0PathValid, isRPCS3ExePathValid, type GamePackagesStats, type RPCS3StatsObject } from '../lib.exports'
import { inspect } from 'node:util'
import { RB3SaveData, type DetailedScoreDataInstrumentTypes, type DetailedScoreDataObject, type DifficultyTypes, type ParsedRB3SaveData } from '../core.exports'

export interface RPCS3Options {
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPathLikeTypes
  /**
   * The path to the RPCS3 executable.
   */
  rpcs3ExePath: FilePathLikeTypes
}

export interface RPCS3Paths {
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPath
  /**
   * The path to the RPCS3 executable.
   */
  rpcs3ExePath: FilePath
}

/**
 * `RPCS3` is a class with methods related of data fetching of the RPCS3 emulator.
 * - - - -
 */
export class RPCS3 {
  // #region Static Methods
  /**
   * Checks if the provided `dev_hdd0` folder path is valid.
   * - - - -
   * @param {DirPathLikeTypes} devhdd0Path The `dev_hdd0` folder path you want to check.
   * @returns {boolean}
   */
  static isDevHDD0PathValid = (devhdd0Path: DirPathLikeTypes): boolean => {
    return isDevHDD0PathValid(devhdd0Path)
  }

  /**
   * Checks if the provided RPCS3 executable file path is valid.
   * - - - -
   * @param {FilePathLikeTypes} rpcs3ExePath The RPCS3 executable file path you want to check.
   * @returns {boolean}
   */
  static isRPCS3ExePathValid = (rpcs3ExePath: FilePathLikeTypes): boolean => {
    return isRPCS3ExePathValid(rpcs3ExePath)
  }

  static getParsedRPCS3Options(options: RPCS3Options): RPCS3Paths {
    const devhdd0 = pathLikeToDirPath(options.devhdd0Path)
    if (!isDevHDD0PathValid(devhdd0)) throw new Error(`Provided dev_hdd0 folder path "${devhdd0.path}" does not exist`)
    const rpcs3Exe = pathLikeToFilePath(options.rpcs3ExePath)
    if (!isRPCS3ExePathValid(rpcs3Exe)) throw new Error(`Provided RPCS3 Executable file path "${rpcs3Exe.path}" does not exist`)

    return {
      devhdd0Path: devhdd0,
      rpcs3ExePath: rpcs3Exe,
    }
  }

  // #region Constructor
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPath
  /**
   * The path to the RPCS3 executable.
   */
  rpcs3ExePath: FilePath

  /**
   * `RPCS3` is a class with methods related of data fetching of the RPCS3 emulator.
   * - - - -
   * @param options An object with the RPCS3 executable and the `dev_hdd0` path.
   */
  constructor(options: RPCS3Options) {
    this.devhdd0Path = pathLikeToDirPath(options.devhdd0Path)
    this.rpcs3ExePath = pathLikeToFilePath(options.rpcs3ExePath)
  }

  // #region Private Methods
  private _checkIntegrity() {
    if (RPCS3.isDevHDD0PathValid(this.devhdd0Path) && RPCS3.isRPCS3ExePathValid(this.rpcs3ExePath)) return true
    return false
  }

  // #region Instance Methods
  /**
   * Returns a JSON representation of this `RPCS3` class.
   * - - - -
   * @returns {RPCS3Options}
   */
  toJSON(): RPCS3Options {
    return {
      devhdd0Path: this.devhdd0Path.path,
      rpcs3ExePath: this.rpcs3ExePath.path,
    }
  }

  /**
   * Returns an object with stats of each supported Rock Band game, if installed.
   * - - - -
   * @returns {Promise<RPCS3StatsObject>}
   */
  async getStats(): Promise<RPCS3StatsObject> {
    this._checkIntegrity()
    return await getRPCS3Stats(this.toJSON())
  }

  /**
   * Returns an object containing information about all installed song packages.
   * - - - -
   * @returns {Promise<GamePackagesStats>}
   */
  async getSongStats(): Promise<GamePackagesStats> {
    this._checkIntegrity()
    return await getRPCS3SongStats(this.toJSON())
  }

  /**
   * Returns the parsed Rock Band 3 save data with profile name and all your scores. If no save data file is found, it will return `undefined`.
   * - - - -
   * @returns {Promise<ParsedRB3SaveData | undefined>}
   */
  async getRB3SaveData(): Promise<ParsedRB3SaveData | undefined> {
    this._checkIntegrity()
    const saveDataPath = this.devhdd0Path.gotoFile('home/00000001/savedata/BLUS30463-AUTOSAVE/SAVE.DAT')
    if (saveDataPath.exists) return await RB3SaveData.parseFromFile(saveDataPath)
  }

  /**
   * Returns  detailed information of saved scores specific for an instrument and difficulty.
   * - - - -
   * @param {DetailedScoreDataInstrumentTypes} instrument The instrument you want to retrieve score data about.
   * @param {DifficultyTypes | undefined} [difficulty] `OPTIONAL` The difficulty of the played songs to calculate scores. Default is `'expert'`.
   * @returns {DetailedScoreDataObject}
   */
  async getRB3DetailedSaveData(instrument: DetailedScoreDataInstrumentTypes, difficulty: DifficultyTypes = 'expert'): Promise<DetailedScoreDataObject | undefined> {
    this._checkIntegrity()
    const saveDataPath = this.devhdd0Path.gotoFile('home/00000001/savedata/BLUS30463-AUTOSAVE/SAVE.DAT')
    if (saveDataPath.exists) {
      const saveData = await RB3SaveData.parseFromFile(saveDataPath)
      return RB3SaveData.getDetailedScoreData(saveData, instrument, difficulty)
    }
  }

  [inspect.custom]() {
    return `RPCS3 ${JSON.stringify(this.toJSON(), null, 4)}`
  }
}
