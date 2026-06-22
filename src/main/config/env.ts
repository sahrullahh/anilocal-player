import { config as loadEnv } from 'dotenv'
import { app } from 'electron'
import { dirname, join } from 'path'

const envCandidates = [
  join(process.cwd(), '.env'),
  join(app.getAppPath(), '.env'),
  join(process.resourcesPath, '.env'),
  join(dirname(process.execPath), '.env')
]

for (const envPath of envCandidates) {
  loadEnv({ path: envPath, override: false })
}

export const env = {
  discordClientId: process.env.DISCORD_CLIENT_ID ?? ''
}

/**
 * Resolves the ffmpeg and ffprobe binary paths for the current runtime context.
 *
 * - Development (!app.isPackaged): returns the `.path` values from the
 *   `ffmpeg-static` and `ffprobe-static` npm packages directly.
 * - Packaged build: takes those same paths and replaces `app.asar` with
 *   `app.asar.unpacked` so the executable can be reached outside the asar
 *   archive. Falls back to `process.resourcesPath/ffmpeg[.exe]` and
 *   `process.resourcesPath/ffprobe[.exe]` if the static-package path is null.
 *
 * Requirements: 9.5, 8.5
 */
export function getBinaryPaths(): { ffmpegPath: string; ffprobePath: string } {
  // ffmpeg-static exports the binary path as the module default (a string | null)
  // ffprobe-static exports an object with a `.path` string property
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegStatic: string | null = require('ffmpeg-static')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobeStatic: { path: string } = require('ffprobe-static')

  const isWindows = process.platform === 'win32'

  if (!app.isPackaged) {
    // Development: use the raw node_modules paths directly
    const ffmpegPath = ffmpegStatic ?? join(process.resourcesPath, isWindows ? 'ffmpeg.exe' : 'ffmpeg')
    const ffprobePath = ffprobeStatic.path ?? join(process.resourcesPath, isWindows ? 'ffprobe.exe' : 'ffprobe')
    return { ffmpegPath, ffprobePath }
  }

  // Packaged build: binaries are extracted from the asar via asarUnpack,
  // so we must rewrite the path to point into app.asar.unpacked.
  const rewriteAsarPath = (rawPath: string | null, fallbackName: string): string => {
    if (rawPath && rawPath.includes('app.asar')) {
      return rawPath.replace('app.asar', 'app.asar.unpacked')
    }
    // Fallback: binary was placed in extraResources
    return join(process.resourcesPath, isWindows ? `${fallbackName}.exe` : fallbackName)
  }

  return {
    ffmpegPath: rewriteAsarPath(ffmpegStatic, 'ffmpeg'),
    ffprobePath: rewriteAsarPath(ffprobeStatic.path, 'ffprobe')
  }
}
