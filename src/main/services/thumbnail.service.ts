import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { constants as fsConstants, promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import { getBinaryPaths } from '../config/env'

function runProcess(binary: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(binary, args)
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })
    proc.on('close', (code) => resolve({ code: code ?? 1, stderr }))
    proc.on('error', (err) => resolve({ code: 1, stderr: err.message }))
  })
}

class ThumbnailService {
  private thumbDir: string | null = null
  private readonly cache = new Map<string, string>()

  private async ensureDir(): Promise<string> {
    if (this.thumbDir) return this.thumbDir
    const dir = path.join(app.getPath('appData'), 'AniLocal Player', 'thumbnails')
    await fs.mkdir(dir, { recursive: true })
    this.thumbDir = dir
    return dir
  }

  /**
   * Generate a thumbnail JPEG for a video file.
   * Captures a frame at `timeSeconds` (default: 10s or 10% of duration).
   * Returns the absolute path to the cached .jpg file.
   */
  async generate(videoPath: string, timeSeconds?: number): Promise<string | null> {
    const cacheKey = videoPath
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    try {
      await fs.access(videoPath, fsConstants.R_OK)
    } catch {
      return null
    }

    const { ffmpegPath } = getBinaryPaths()
    const dir = await this.ensureDir()

    // Filename: SHA-256 hash of the full path so every distinct video maps to a
    // unique, fixed-length filename (a truncated base64 encoding of long paths
    // could collide when episodes share a long common folder prefix).
    const hash = createHash('sha256').update(videoPath).digest('hex')
    const outPath = path.join(dir, `${hash}.jpg`)

    // Return cached file if it already exists on disk
    try {
      await fs.access(outPath, fsConstants.R_OK)
      this.cache.set(cacheKey, outPath)
      return outPath
    } catch {
      // not cached yet, generate
    }

    const ss = timeSeconds ?? 10
    const args = [
      '-ss', String(ss),
      '-i', videoPath,
      '-frames:v', '1',
      '-q:v', '3',
      '-vf', 'scale=480:-1',
      '-y',
      outPath
    ]

    const { code } = await runProcess(ffmpegPath, args)
    if (code !== 0) return null

    this.cache.set(cacheKey, outPath)
    return outPath
  }
}

export const thumbnailService = new ThumbnailService()
