import { spawn } from 'child_process'
import { constants as fsConstants, promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { getBinaryPaths } from '../config/env'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EmbeddedTrackDescriptor {
  /** Zero-based ffmpeg stream index for this subtitle stream */
  index: number
  /** ISO 639-2 language tag; defaults to "und" when absent in stream metadata */
  language: string
  /** Codec name reported by ffprobe, e.g. "ass", "subrip" */
  codecName: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Shape of a single stream entry in ffprobe's JSON output */
interface FfprobeStream {
  index: number
  codec_type: string
  codec_name?: string
  tags?: {
    language?: string
    [key: string]: string | undefined
  }
}

interface FfprobeOutput {
  streams: FfprobeStream[]
}

/**
 * Spawns a process and collects its stdout/stderr, resolving with exit code.
 * Uses `child_process.spawn` (not `exec`) so stdout is streamed, not buffered
 * through a shell, and to avoid shell-injection risks on arbitrary file paths.
 *
 * @param binary  Path to the executable.
 * @param args    Argument list.
 * @param cwd     Optional working directory for the spawned process.
 */
function runProcess(
  binary: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(binary, args, cwd ? { cwd } : {})
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8')
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })
    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    proc.on('error', (err) => {
      resolve({ stdout, stderr: err.message, code: 1 })
    })
  })
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class EmbeddedSubtitleService {
  private extractionAvailable = true

  /** Absolute path to the per-session temp directory; created on first extraction. */
  private tempDir: string | null = null

  /** Timestamp string used to name the session temp directory. */
  private readonly sessionTimestamp = Date.now().toString()

  /**
   * In-memory extraction cache.
   * Key:   `${videoPath}:${trackIndex}`
   * Value: absolute path of the extracted `.ass` file
   */
  private readonly extractionCache = new Map<string, string>()

  /**
   * Font extraction cache.
   * Key:   videoPath
   * Value: array of absolute paths to extracted font files
   */
  private readonly fontCache = new Map<string, string[]>()

  constructor() {
    // Validate binary executability at startup; mark service unavailable on failure.
    void this._checkBinaries()
  }

  private async _checkBinaries(): Promise<void> {
    const { ffmpegPath, ffprobePath } = getBinaryPaths()

    const checkOne = async (binPath: string, name: string): Promise<boolean> => {
      try {
        await fs.access(binPath, fsConstants.X_OK)
        return true
      } catch {
        console.warn(
          `[EmbeddedSubtitleService] ${name} binary is not executable or not found at "${binPath}". Subtitle extraction will be unavailable.`
        )
        return false
      }
    }

    const [ffmpegOk, ffprobeOk] = await Promise.all([
      checkOne(ffmpegPath, 'ffmpeg'),
      checkOne(ffprobePath, 'ffprobe')
    ])

    if (!ffmpegOk || !ffprobeOk) {
      this.extractionAvailable = false
    }
  }

  // -------------------------------------------------------------------------
  // probeEmbeddedTracks
  // -------------------------------------------------------------------------

  /**
   * Probes an MKV file for embedded subtitle tracks using ffprobe.
   *
   * Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 9.4
   *
   * @param videoPath Absolute path to the video file.
   * @returns Array of track descriptors, or an empty array for non-MKV files.
   */
  async probeEmbeddedTracks(
    videoPath: string
  ): Promise<EmbeddedTrackDescriptor[] | { error: string }> {
    // Requirement 1.6 — skip non-MKV files immediately
    if (path.extname(videoPath).toLowerCase() !== '.mkv') {
      return []
    }

    // Requirement 9.4 — binary unavailable
    if (!this.extractionAvailable) {
      return { error: 'ffprobe is not available: subtitle extraction was disabled at startup' }
    }

    // Requirement 8.3 — validate file existence before spawning
    try {
      await fs.access(videoPath, fsConstants.R_OK)
    } catch {
      return { error: `File not found: ${videoPath}` }
    }

    const { ffprobePath } = getBinaryPaths()
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      videoPath
    ]

    const { stdout, stderr, code } = await runProcess(ffprobePath, args)

    // Requirement 1.4 — non-zero exit → structured error
    if (code !== 0) {
      return { error: `ffprobe failed: ${stderr.trim() || `exit code ${code}`}` }
    }

    let parsed: FfprobeOutput
    try {
      parsed = JSON.parse(stdout) as FfprobeOutput
    } catch {
      return { error: `ffprobe returned invalid JSON: ${stdout.slice(0, 200)}` }
    }

    // Requirements 1.2, 1.3, 1.5 — map subtitle streams to descriptors
    const streams: FfprobeStream[] = parsed.streams ?? []
    const subtitleTracks = streams
      .filter((s) => s.codec_type === 'subtitle')
      .map((s): EmbeddedTrackDescriptor => ({
        index: s.index,
        language: s.tags?.language ?? 'und',
        codecName: s.codec_name ?? 'unknown'
      }))

    return subtitleTracks
  }

  // -------------------------------------------------------------------------
  // extractEmbeddedTrack
  // -------------------------------------------------------------------------

  /**
   * Extracts the specified subtitle track from an MKV file to a `.ass` file in
   * the session temp directory. Results are cached per (videoPath, trackIndex)
   * so ffmpeg is only invoked once per combination within a session.
   *
   * Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   *
   * @param videoPath  Absolute path to the MKV file.
   * @param trackIndex Zero-based ffmpeg stream index of the subtitle track.
   * @returns Absolute path of the extracted `.ass` file, or an error object.
   */
  async extractEmbeddedTrack(
    videoPath: string,
    trackIndex: number
  ): Promise<{ path: string } | { error: string }> {
    // Requirement 9.4 — binary unavailable
    if (!this.extractionAvailable) {
      return { error: 'ffmpeg is not available: subtitle extraction was disabled at startup' }
    }

    // Requirement 8.3 — validate file existence before spawning
    try {
      await fs.access(videoPath, fsConstants.R_OK)
    } catch {
      return { error: `File not found: ${videoPath}` }
    }

    // Requirement 2.4 — return cached path if already extracted
    const cacheKey = `${videoPath}:${trackIndex}`
    const cached = this.extractionCache.get(cacheKey)
    if (cached !== undefined) {
      return { path: cached }
    }

    // Create the session temp directory on first use (Requirement 2.1 / Design D6)
    if (this.tempDir === null) {
      const dirPath = path.join(os.tmpdir(), `anilocal-subs-${this.sessionTimestamp}`)
      try {
        await fs.mkdir(dirPath, { recursive: true })
        this.tempDir = dirPath
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        return { error: `Failed to create temp directory: ${reason}` }
      }
    }

    // Build sanitised output filename (Requirement 2.2 / Design section "Temp directory layout")
    const sanitisedVideoName = path
      .basename(videoPath, path.extname(videoPath))
      .replace(/[^A-Za-z0-9_\-.]/g, '_')
    const outputFilename = `${sanitisedVideoName}_${trackIndex}.ass`
    const outputPath = path.join(this.tempDir, outputFilename)

    // Invoke ffmpeg to extract the track (Requirement 2.1, 2.2)
    const { ffmpegPath } = getBinaryPaths()
    const args = [
      '-i', videoPath,
      '-map', `0:${trackIndex}`,
      '-y',          // overwrite output without prompting
      outputPath
    ]

    const { stderr, code } = await runProcess(ffmpegPath, args)

    // Requirement 2.5 — non-zero exit: delete partial file and return error
    if (code !== 0) {
      try {
        await fs.unlink(outputPath)
      } catch {
        // Partial file may not exist; ignore deletion errors
      }
      return { error: `ffmpeg failed: ${stderr.trim() || `exit code ${code}`}` }
    }

    // Requirement 2.3 — store in cache and return absolute path
    this.extractionCache.set(cacheKey, outputPath)
    return { path: outputPath }
  }

  // -------------------------------------------------------------------------
  // extractFonts
  // -------------------------------------------------------------------------

  /**
   * Extracts all font attachments from an MKV file into a per-video subfolder
   * inside the session temp directory. Results are cached per `videoPath`.
   *
   * Requirements 7.6
   *
   * @param videoPath Absolute path to the MKV file.
   * @returns Array of absolute paths to extracted font files, or an error object.
   */
  async extractFonts(videoPath: string): Promise<string[] | { error: string }> {
    // Requirement 9.4 — binary unavailable
    if (!this.extractionAvailable) {
      return { error: 'ffmpeg is not available: subtitle extraction was disabled at startup' }
    }

    // Requirement 8.3 — validate file existence before spawning
    try {
      await fs.access(videoPath, fsConstants.R_OK)
    } catch {
      return { error: `File not found: ${videoPath}` }
    }

    // Return cached result if fonts were already extracted for this video
    if (this.fontCache.has(videoPath)) {
      return this.fontCache.get(videoPath)!
    }

    // Create the session temp directory on first use
    if (this.tempDir === null) {
      const dirPath = path.join(os.tmpdir(), `anilocal-subs-${this.sessionTimestamp}`)
      try {
        await fs.mkdir(dirPath, { recursive: true })
        this.tempDir = dirPath
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        return { error: `Failed to create temp directory: ${reason}` }
      }
    }

    // Build the per-video fonts subdirectory name
    const sanitisedVideoName = path
      .basename(videoPath, path.extname(videoPath))
      .replace(/[^A-Za-z0-9_\-.]/g, '_')
    const fontsDir = path.join(this.tempDir, `${sanitisedVideoName}_fonts`)

    try {
      await fs.mkdir(fontsDir, { recursive: true })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      return { error: `Failed to create fonts directory: ${reason}` }
    }

    // Spawn ffmpeg with cwd set to fontsDir so attachment files are written there.
    // -dump_attachment:t "" instructs ffmpeg to extract all attachment streams.
    const { ffmpegPath } = getBinaryPaths()
    const args = ['-y', '-dump_attachment:t', '', '-i', videoPath]

    const { code } = await runProcess(ffmpegPath, args, fontsDir)

    // ffmpeg may exit non-zero even when fonts are extracted (e.g. "at least one
    // output file must be specified"). Collect whatever files landed in fontsDir.
    if (code !== 0) {
      // Check whether any files were actually written despite the non-zero exit.
      let entries: string[]
      try {
        entries = await fs.readdir(fontsDir)
      } catch {
        entries = []
      }
      if (entries.length === 0) {
        // No fonts extracted and ffmpeg errored — not a hard failure; cache empty.
        this.fontCache.set(videoPath, [])
        return []
      }
      // Some fonts were written; continue to collect them below.
    }

    // Collect all files written to the fonts directory
    let entries: string[]
    try {
      entries = await fs.readdir(fontsDir)
    } catch {
      entries = []
    }

    const fontPaths = entries.map((filename) => path.join(fontsDir, filename))
    this.fontCache.set(videoPath, fontPaths)
    return fontPaths
  }

  // -------------------------------------------------------------------------
  // cleanup
  // -------------------------------------------------------------------------

  /**
   * Deletes the entire session temp directory and all extracted files within it.
   * Called from the `app.on('before-quit')` handler in `src/main/index.ts`.
   *
   * Requirement 2.6
   */
  async cleanup(): Promise<void> {
    if (this.tempDir === null) return

    try {
      await fs.rm(this.tempDir, { recursive: true, force: true })
    } catch (err) {
      // App is quitting — log but do not throw
      console.warn(
        `[EmbeddedSubtitleService] cleanup failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const embeddedSubtitleService = new EmbeddedSubtitleService()
