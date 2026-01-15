import { pathLikeToDirPath, pathLikeToFilePath, type DirPath, type DirPathLikeTypes, type FilePath, type FilePathLikeTypes } from 'node-lib'
import { isDevHDD0PathValid, isRPCS3ExePathValid, rpcs3GetPackagesData, rpcs3GetStats, type RPCS3StatsObject, type RB3SongPackagesData } from '../lib.exports'
import { RB3SaveData, type DifficultyTypes, type InstrumentScoreData, type ParsedRB3SaveData, type ScoreDataInstrumentTypes } from './RB3SaveData'

export interface RPCS3JSONRepresentation {
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPathLikeTypes
  /**
   * The path to the RPCS3 executable.
   */
  rpcs3ExePath: FilePathLikeTypes
}

export interface ParsedRPCS3Paths {
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPath
  /**
   * The path to the RPCS3 executable.
   */
  rpcs3ExePath: FilePath
}

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
   * @param {DirPathLikeTypes} devhdd0Path The path of the user's `dev_hdd0` folder.
   * @param {FilePathLikeTypes} rpcs3ExePath The path to the RPCS3 executable.
   */
  constructor(devhdd0Path: DirPathLikeTypes, rpcs3ExePath: FilePathLikeTypes) {
    this.devhdd0Path = pathLikeToDirPath(devhdd0Path)
    this.rpcs3ExePath = pathLikeToFilePath(rpcs3ExePath)
    this._checkIntegrity()
  }

  // #region Private Methods

  /**
   * Checks the integrity of the provided `dev_hdd0` folder and RPCS3 executable file paths.
   * - - - -
   * @throws {Error}
   * @returns {boolean}
   */
  private _checkIntegrity(): boolean {
    if (RPCS3.isDevHDD0PathValid(this.devhdd0Path) && RPCS3.isRPCS3ExePathValid(this.rpcs3ExePath)) return true
    return false
  }

  // #region Instance Methods

  /**
   * Returns a JSON representation of this `RPCS3` class.
   * - - - -
   * @returns {RPCS3JSONRepresentation}
   */
  toJSON(): RPCS3JSONRepresentation {
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
    return await rpcs3GetStats(this.devhdd0Path, this.rpcs3ExePath)
  }

  async getPackagesStats(): Promise<RB3SongPackagesData> {
    this._checkIntegrity()
    return await rpcs3GetPackagesData(this.devhdd0Path)
  }
  async getSaveData(): Promise<ParsedRB3SaveData | undefined> {
    this._checkIntegrity()
    const saveDataPath = this.devhdd0Path.gotoFile('home/00000001/savedata/BLUS30463-AUTOSAVE/SAVE.DAT')
    if (saveDataPath.exists) {
      return await RB3SaveData.parseFromFile(saveDataPath)
    }
  }

  async getSongData() {}

  getInstrumentScoresData(saveData: ParsedRB3SaveData, instrument?: ScoreDataInstrumentTypes, difficulty: DifficultyTypes = 'expert'): InstrumentScoreData {
    return RB3SaveData.getInstrumentScoreData(saveData, instrument ?? saveData.mostPlayedInstrument ?? 'band', difficulty)
  }
}
