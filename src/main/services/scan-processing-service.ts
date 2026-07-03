import log from 'electron-log/main'
import type { StoreApi } from 'zustand/vanilla'
import type { DraftStore } from '../store/draft-store'
import type { DatabaseService } from './database-service'
import type { LayoutService } from './layout-service'
import type { WindowManager } from './window-manager'
import type { MlService } from './ml-service'
import type { ScanResult, OverlayDataPayload } from '@shared/types'
import type { InitialScanResults } from '@shared/types/ml'
import { processScanResults } from '@core/domain/scan-processor'
import { getTopHeroesByWinrate } from '@core/domain/top-heroes-by-winrate'
import {
  detectPickedHeroOrders,
  mapPickedOrdersToHeroIds,
  type ModelSlotBaselines,
} from '@core/domain/model-pick-detector'
import { computeModelSlotStatsMap } from '@core/ml/slot-image-stats'
import {
  applyPickedAbilityFlags,
  buildPickedDisplayNameSet,
} from '@core/domain/picked-ability-enrichment'

// @DEV-GUIDE: Bridges ML scan results to the overlay UI. After the ML worker returns raw
// ability/hero detections, this service:
// 1. Reads current draft state from DraftStore (caches, user selections)
// 2. Queries DB repositories for ability stats, synergies, triplets, and thresholds
// 3. Delegates to the pure domain function processScanResults() in src/core/domain/
// 4. Updates DraftStore with new state (caches, selected hero/spot)
// 5. Broadcasts the enriched OverlayDataPayload to BOTH overlay and control panel windows
//
// The pure domain logic (scoring, synergy filtering, OP/trap detection) lives in src/core/
// and has zero Electron imports. This service is the Electron-aware adapter that feeds it.

const logger = log.scope('scan-processing')

let lastOverlayPayload: OverlayDataPayload | null = null

export interface ScanProcessingService {
  handleScanResults(
    results: InitialScanResults | ScanResult[],
    isInitialScan: boolean,
    resolution: string,
    scaleFactor: number,
    screenshotBuffer?: Buffer,
  ): Promise<void>
  refreshTopHeroesPanel(): void
  rescanPickedHeroes(
    screenshotBuffer: Buffer,
    resolution: string,
  ): Promise<{
    success: boolean
    pickedCount: number
    pickedHeroCount: number
    pickedAbilityCount: number
    error?: string
  }>
}

export function createScanProcessingService(
  store: StoreApi<DraftStore>,
  dbService: DatabaseService,
  layoutService: LayoutService,
  windowManager: WindowManager,
  mlService: MlService,
): ScanProcessingService {
  return {
    async handleScanResults(results, isInitialScan, resolution, scaleFactor, screenshotBuffer) {
      const start = performance.now()

      try {
        const state = store.getState()

        const coords = layoutService.getLayout(resolution)
        if (!coords) {
          logger.error('No layout coordinates for resolution', { resolution })
          return
        }

        if (isInitialScan && screenshotBuffer && coords.models_coords?.length) {
          await storeModelSlotBaselines(
            store,
            screenshotBuffer,
            coords.models_coords,
          )
        }

        if (isInitialScan) {
          store.getState().setPickedAbilityNames([])
        } else {
          const pickedNames = (results as ScanResult[])
            .map((slot) => slot.name)
            .filter((name): name is string => name !== null)
          store.getState().setPickedAbilityNames(pickedNames)
        }

        const output = processScanResults({
          rawResults: results,
          isInitialScan,
          state: {
            initialPoolAbilitiesCache: state.initialPoolAbilitiesCache,
            identifiedHeroModelsCache: state.identifiedHeroModelsCache,
            draftedHeroModelIds: state.draftedHeroModelIds,
            mySelectedSpotDbId: state.mySelectedSpotDbId,
            mySelectedSpotHeroOrder: state.mySelectedSpotHeroOrder,
            mySelectedModelDbHeroId: state.mySelectedModelDbHeroId,
            mySelectedModelHeroOrder: state.mySelectedModelHeroOrder,
          },
          deps: {
            heroes: dbService.heroes,
            abilities: dbService.abilities,
            synergies: dbService.synergies,
            triplets: dbService.triplets,
            settings: dbService.metadata,
          },
          modelCoords: coords.models_coords ?? [],
          heroesCoords: coords.heroes_coords ?? [],
          heroesParams: coords.heroes_params ?? { width: 0, height: 0 },
          targetResolution: resolution,
          scaleFactor,
        })

        // Update store with new state
        store.setState({
          initialPoolAbilitiesCache:
            output.updatedState.initialPoolAbilitiesCache,
          identifiedHeroModelsCache:
            output.updatedState.identifiedHeroModelsCache,
          draftedHeroModelIds: output.updatedState.draftedHeroModelIds,
          mySelectedSpotDbId: output.updatedState.mySelectedSpotDbId,
          mySelectedSpotHeroOrder: output.updatedState.mySelectedSpotHeroOrder,
          mySelectedModelDbHeroId: output.updatedState.mySelectedModelDbHeroId,
          mySelectedModelHeroOrder:
            output.updatedState.mySelectedModelHeroOrder,
        })

        const pickedDisplayNames = buildPickedDisplayNameSet(
          store.getState().pickedAbilityNames,
          dbService.abilities.getDetails(store.getState().pickedAbilityNames),
        )
        const enrichedPayload = applyPickedAbilityFlags(
          output.overlayPayload,
          pickedDisplayNames,
        )

        // Broadcast enriched data to both windows
        lastOverlayPayload = enrichedPayload
        broadcastOverlayPayload(windowManager, enrichedPayload)

        const durationMs = Math.round(performance.now() - start)
        logger.info('Scan processing complete', { durationMs, isInitialScan })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Scan processing failed', { error: message })
      }
    },

    refreshTopHeroesPanel() {
      if (!lastOverlayPayload) return

      const state = store.getState()
      const topHeroesByWinrate = getTopHeroesByWinrate(
        state.identifiedHeroModelsCache,
        new Set(state.draftedHeroModelIds),
      )

      const pickedDisplayNames = buildPickedDisplayNameSet(
        state.pickedAbilityNames,
        dbService.abilities.getDetails(state.pickedAbilityNames),
      )

      lastOverlayPayload = applyPickedAbilityFlags(
        {
          ...lastOverlayPayload,
          topHeroesByWinrate,
        },
        pickedDisplayNames,
      )
      broadcastOverlayPayload(windowManager, lastOverlayPayload)
    },

    async rescanPickedHeroes(screenshotBuffer, resolution) {
      const state = store.getState()
      const baselines = state.modelSlotBaselines
      const scaleFactor = layoutService.getScaleFactor()

      if (Object.keys(baselines).length === 0) {
        return {
          success: false,
          pickedCount: 0,
          pickedHeroCount: 0,
          pickedAbilityCount: 0,
          error: 'No hero model baseline — run Initial Scan first',
        }
      }

      if (state.identifiedHeroModelsCache.length === 0) {
        return {
          success: false,
          pickedCount: 0,
          pickedHeroCount: 0,
          pickedAbilityCount: 0,
          error: 'No identified heroes — run Initial Scan first',
        }
      }

      const coords = layoutService.getLayout(resolution)
      if (!coords?.models_coords?.length) {
        return {
          success: false,
          pickedCount: 0,
          pickedHeroCount: 0,
          pickedAbilityCount: 0,
          error: `No model slot coordinates for resolution: ${resolution}`,
        }
      }

      try {
        let pickedAbilityCount = 0

        if (mlService.isReady() && coords.selected_abilities_coords?.length) {
          const mlResult = await mlService.scan(
            screenshotBuffer,
            coords,
            false,
          )
          const pickedAbilities = mlResult.results as ScanResult[]
          await this.handleScanResults(
            pickedAbilities,
            false,
            resolution,
            scaleFactor,
            screenshotBuffer,
          )
          pickedAbilityCount = store.getState().pickedAbilityNames.length
        }

        const currentStats = await computeModelSlotStatsMap(
          screenshotBuffer,
          coords.models_coords,
        )
        const pickedOrders = detectPickedHeroOrders(baselines, currentStats)
        const pickedHeroIds = mapPickedOrdersToHeroIds(
          pickedOrders,
          store.getState().identifiedHeroModelsCache,
        )

        if (store.getState().mySelectedModelDbHeroId !== null) {
          pickedHeroIds.push(store.getState().mySelectedModelDbHeroId!)
        }

        const uniquePickedHeroIds = [...new Set(pickedHeroIds)]
        store.getState().setDraftedHeroModelIds(uniquePickedHeroIds)
        this.refreshTopHeroesPanel()

        const pickedHeroCount = uniquePickedHeroIds.length
        logger.info('Picked draft rescan complete', {
          pickedHeroCount,
          pickedAbilityCount,
          pickedOrders,
        })

        return {
          success: true,
          pickedCount: pickedHeroCount + pickedAbilityCount,
          pickedHeroCount,
          pickedAbilityCount,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('Picked draft rescan failed', { error: message })
        return {
          success: false,
          pickedCount: 0,
          pickedHeroCount: 0,
          pickedAbilityCount: 0,
          error: message,
        }
      }
    },
  }
}

async function storeModelSlotBaselines(
  store: StoreApi<DraftStore>,
  screenshotBuffer: Buffer,
  modelCoords: import('@shared/types').SlotCoordinate[],
): Promise<void> {
  const statsMap = await computeModelSlotStatsMap(screenshotBuffer, modelCoords)
  const baselines: ModelSlotBaselines = {}

  for (const [heroOrder, stats] of statsMap) {
    baselines[heroOrder] = stats
  }

  store.getState().setModelSlotBaselines(baselines)
}

function broadcastOverlayPayload(
  windowManager: WindowManager,
  payload: OverlayDataPayload,
): void {
  const overlay = windowManager.getOverlayWindow()
  if (overlay && !overlay.isDestroyed()) {
    overlay.webContents.send('overlay:data', payload)
  }

  const cp = windowManager.getControlPanelWindow()
  if (cp && !cp.isDestroyed()) {
    cp.webContents.send('overlay:data', payload)
  }
}
