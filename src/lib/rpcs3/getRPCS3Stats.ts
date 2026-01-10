import { MyObject, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { parse as parseYAMLBuffer } from 'yaml'
import { isRPCS3ExePathValid } from './isRPCS3ExePathValid'
import { isDevHDD0PathValid } from './isDevHDD0PathValid'
import { RPCS3, type RPCS3Options } from '../../core.exports'

export interface RockBand3SpecificStats {
  /**
   * The path where the game is installed.
   */
  gamePath: string
  /**
   * The name of the game.
   */
  gameName: string
  /**
   * The catalog ID of the game.
   */
  gameID: string
  /**
   * The path to the game save data file.
   */
  saveDataPath: string
  /**
   * Tells if the game has a save data file.
   */
  hasSaveData: boolean
  /**
   * Tells if the game has any update (official or MiloHax's Deluxe) installed.
   */
  hasUpdate: boolean
  /**
   * Tells if the game has any MiloHax Deluxe patch installed.
   */
  hasDeluxe: boolean
  /**
   * The type of the update installed.
   */
  updateType: 'milohaxDX' | 'tu5' | 'unknown'
  /**
   * The Rock Band 3 Deluxe version installed.
   */
  deluxeVersion: string | null
  /**
   * Tells if the Teleport Glitch Patch is installed.
   */
  hasTeleportGlitchPatch: boolean
  /**
   * Tells if the High Memory Patch is installed.
   */
  hasHighMemoryPatch: boolean
}

export interface RPCS3StatsObject {
  /**
   * Stats from Rock Band 3.
   */
  rb3?: RockBand3SpecificStats
}

/**
 * Returns an object with stats of each supported Rock Band game, if installed.
 * - - - -
 * @param {RPCS3Options} options An object with the RPCS3 executable and `dev_hdd0` folder path.
 * @returns {Promise<RPCS3StatsObject>}
 */
export const getRPCS3Stats = async (options: RPCS3Options): Promise<RPCS3StatsObject> => {
  const { devhdd0Path, rpcs3ExePath } = RPCS3.getParsedRPCS3Options(options)
  const map = new MyObject<RPCS3StatsObject>()
  const games = parseYAMLBuffer(await rpcs3ExePath.gotoFile('config/games.yml').read('utf-8')) as Record<'BLUS30463' | 'BLUS30147', string>

  const ROCKBAND3_ID = 'BLUS30463'
  if (ROCKBAND3_ID in games) {
    // Rock Band 3 (USA)
    const rb3 = new MyObject<RockBand3SpecificStats>()
    const rb3GamePath = pathLikeToDirPath(games.BLUS30463)
    rb3.set('gamePath', rb3GamePath.path)
    rb3.set('gameName', 'Rock Band 3')
    rb3.set('gameID', ROCKBAND3_ID)

    const saveDataPath = devhdd0Path.gotoFile('home/00000001/savedata/BLUS30463-AUTOSAVE/SAVE.DAT')
    rb3.set('saveDataPath', saveDataPath.path)
    rb3.set('hasSaveData', saveDataPath.exists)

    const gen = devhdd0Path.gotoDir('game/BLUS30463/USRDIR/gen')
    const hdr = gen.gotoFile('patch_ps3.hdr')
    const ark = gen.gotoFile('patch_ps3_0.ark')
    rb3.set('hasUpdate', gen.exists && hdr.exists && ark.exists)
    rb3.set('hasDeluxe', false)
    rb3.set('updateType', 'unknown')
    rb3.set('deluxeVersion', 'null')
    rb3.set('hasTeleportGlitchPatch', false)
    rb3.set('hasHighMemoryPatch', false)

    if (hdr.exists && ark.exists) {
      const arkStats = await ark.stat()
      const hdrStats = await hdr.stat()

      // Only RB3DX update can be bigger than 500mb
      if (arkStats.size > 0x1f400000) {
        rb3.set('hasDeluxe', true)
        rb3.set('updateType', 'milohax_dx')
        rb3.set('deluxeVersion', 'unknown')
      }

      // CHECK: Title Update 5?
      else if (hdrStats.size === 0x8d69) rb3.set('updateType', 'tu5')
    }

    if (rb3GamePath.gotoFile('PS3_GAME/USRDIR/gen/main_ps3_vanilla.hdr').exists && rb3GamePath.gotoFile('PS3_GAME/USRDIR/gen/main_ps3_10.ark').exists) rb3.set('hasTeleportGlitchPatch', true)
    if (gen.gotoFile('../dx_high_memory.dta').exists) rb3.set('hasHighMemoryPatch', true)

    map.set('rb3', rb3.toObject())
  }

  return map.toObject()
}
