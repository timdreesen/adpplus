import { ipcMain } from 'electron'
import log from 'electron-log/main'
import type { StoreApi } from 'zustand/vanilla'
import type { DraftStore } from '../store/draft-store'
import type { WindowManager } from '../services/window-manager'
import type { ScanProcessingService } from '../services/scan-processing-service'
import type { ScreenshotService } from '../services/screenshot-service'
import type { WindowTrackerService } from '../services/window-tracker-service'
import type { AppStore } from '../store/app-store'
import { captureCroppedGameScreenshot } from '../services/game-screenshot'

// @DEV-GUIDE: Draft domain IPC handlers for "My Spot" and "My Model" selection during overlay.
// These are fire-and-forget (ipcMain.on) because the renderer doesn't need a response.
//
// Both handlers implement toggle behavior: clicking the same hero again deselects it.
// After updating the DraftStore, the selection is broadcast to BOTH windows so the overlay
// and control panel stay in sync. The next ML scan will use these selections to personalize
// the synergy/trap suggestions (filtering by the user's hero and model).

const logger = log.scope('ipc:draft')

export function registerDraftHandlers(
  store: StoreApi<DraftStore>,
  windowManager: WindowManager,
  scanProcessingService: ScanProcessingService,
  screenshotService: ScreenshotService,
  windowTracker: WindowTrackerService,
  appStore: AppStore,
): void {
  ipcMain.on(
    'draft:selectMySpot',
    (_event, data: { heroOrder: number; dbHeroId: number }) => {
      const state = store.getState()

      // Toggle: clicking the same hero deselects
      const isDeselecting = state.mySelectedSpotDbId === data.dbHeroId
      const newDbId = isDeselecting ? null : data.dbHeroId
      const newOrder = isDeselecting ? null : data.heroOrder

      state.selectMySpot(newDbId, newOrder)
      logger.info('My Spot selection changed', {
        dbHeroId: newDbId,
        heroOrder: newOrder,
      })

      broadcastToAll(windowManager, 'draft:selectMySpot', {
        selectedHeroOrderForDrafting: newOrder,
      })
    },
  )

  ipcMain.on(
    'draft:selectMyModel',
    (_event, data: { heroOrder: number; dbHeroId: number }) => {
      const state = store.getState()

      // Toggle: clicking the same hero deselects
      const isDeselecting = state.mySelectedModelDbHeroId === data.dbHeroId
      const newDbId = isDeselecting ? null : data.dbHeroId
      const newOrder = isDeselecting ? null : data.heroOrder

      state.selectMyModel(newDbId, newOrder)
      if (!isDeselecting) {
        state.markHeroDrafted(data.dbHeroId)
        scanProcessingService.refreshTopHeroesPanel()
      }
      logger.info('My Model selection changed', {
        dbHeroId: newDbId,
        heroOrder: newOrder,
      })

      broadcastToAll(windowManager, 'draft:selectMyModel', {
        selectedModelHeroOrder: newOrder,
      })
    },
  )

  ipcMain.on('draft:toggleHeroDrafted', (_event, data: { dbHeroId: number }) => {
    const state = store.getState()
    state.toggleHeroDrafted(data.dbHeroId)
    scanProcessingService.refreshTopHeroesPanel()
    logger.info('Hero drafted status toggled', { dbHeroId: data.dbHeroId })
  })

  ipcMain.on('draft:rescanPickedHeroes', async () => {
    const resolution = appStore.getState().activeResolution
    if (!resolution) {
      broadcastRescanResult(windowManager, {
        success: false,
        pickedCount: 0,
        pickedHeroCount: 0,
        pickedAbilityCount: 0,
        error: 'No active resolution — overlay may not be activated',
      })
      return
    }

    try {
      const screenshotBuffer = await captureCroppedGameScreenshot(
        screenshotService,
        windowTracker,
      )
      const result = await scanProcessingService.rescanPickedHeroes(
        screenshotBuffer,
        resolution,
      )
      broadcastRescanResult(windowManager, result)
      logger.info('Rescan picked heroes IPC complete', result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Rescan picked heroes failed', { error: message })
      broadcastRescanResult(windowManager, {
        success: false,
        pickedCount: 0,
        pickedHeroCount: 0,
        pickedAbilityCount: 0,
        error: message,
      })
    }
  })

  logger.info('Draft IPC handlers registered')
}

function broadcastRescanResult(
  wm: WindowManager,
  data: {
    success: boolean
    pickedCount: number
    pickedHeroCount?: number
    pickedAbilityCount?: number
    error?: string
  },
): void {
  broadcastToAll(wm, 'draft:rescanPickedHeroes', data)
}

function broadcastToAll(
  wm: WindowManager,
  channel: string,
  data: unknown,
): void {
  const cp = wm.getControlPanelWindow()
  const overlay = wm.getOverlayWindow()
  if (cp && !cp.isDestroyed()) cp.webContents.send(channel, data)
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send(channel, data)
}
