import sharp from 'sharp'
import type { ScreenshotService } from './screenshot-service'
import type { WindowTrackerService } from './window-tracker-service'

/**
 * Captures a screenshot and crops it to the Dota 2 game window when in windowed mode.
 */
export async function captureCroppedGameScreenshot(
  screenshotService: ScreenshotService,
  windowTracker: WindowTrackerService,
): Promise<Buffer> {
  let screenshotBuffer = await screenshotService.capture(true)

  const gameBounds = windowTracker.getGameWindowPhysicalBounds()
  if (!gameBounds) return screenshotBuffer

  const meta = await sharp(screenshotBuffer).metadata()
  const screenW = meta.width ?? 0
  const screenH = meta.height ?? 0

  if (gameBounds.width < screenW || gameBounds.height < screenH) {
    screenshotBuffer = await sharp(screenshotBuffer)
      .extract({
        left: gameBounds.x,
        top: gameBounds.y,
        width: gameBounds.width,
        height: gameBounds.height,
      })
      .toBuffer()
  }

  return screenshotBuffer
}
