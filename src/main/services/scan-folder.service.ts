import { promises as fs } from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi'])
const SUBTITLE_EXTENSIONS = ['.ass', '.ssa', '.srt', '.vtt'] as const

/** Priority for auto-selection: lower = preferred */
const SUBTITLE_FORMAT_PRIORITY: Record<string, number> = {
  '.ass': 0,
  '.ssa': 1,
  '.srt': 2,
  '.vtt': 3
}

const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; language: string }> = [
  { pattern: /\b(indonesia|indonesian|indo|id)\b/i, language: 'Indonesia' },
  { pattern: /\b(english|eng|en)\b/i, language: 'English' },
  { pattern: /\b(japanese|jpn|jp)\b/i, language: 'Japanese' },
  { pattern: /\b(chinese|chs|cht|zh)\b/i, language: 'Chinese' },
  { pattern: /\b(arabic|ara|ar)\b/i, language: 'Arabic' },
  { pattern: /\b(spanish|spa|es)\b/i, language: 'Spanish' },
  { pattern: /\b(french|fre|fr)\b/i, language: 'French' },
  { pattern: /\b(portuguese|por|pt)\b/i, language: 'Portuguese' }
]

// ─── Fansub Detection ────────────────────────────────────────────────────────

/**
 * Parse fansub group, anime title and episode number from a typical fansub filename.
 * Examples:
 *   [SubsPlease] Frieren - 12 (1080p) [ABCD1234].mkv
 *   [EMBER] Dungeon Meshi - 01v2 [720p].mkv
 *   HorribleSubs - Sword Art Online - 24 - 1080p.mkv
 */
export function parseFansubInfo(fileName: string): {
  fansubGroup: string | null
  animeTitle: string | null
  episode: number | null
} {
  const name = path.parse(fileName).name

  // Extract group from leading brackets: [GroupName] or (GroupName)
  let fansubGroup: string | null = null
  const groupMatch = name.match(/^\[([^\]]+)\]/)
  if (groupMatch) {
    fansubGroup = groupMatch[1].trim()
  }

  // Try to parse: [Group] Title - EpNum ...
  const withGroupMatch = name.match(/^\[[^\]]+\]\s*(.+?)\s*[-–]\s*(\d+)/)
  if (withGroupMatch) {
    return {
      fansubGroup,
      animeTitle: withGroupMatch[1].trim() || null,
      episode: parseInt(withGroupMatch[2], 10)
    }
  }

  // Try: Title - EpNum (no group prefix)
  const titleEpMatch = name.match(/^(.+?)\s*[-–]\s*(\d+)/)
  if (titleEpMatch) {
    return {
      fansubGroup,
      animeTitle: titleEpMatch[1].trim() || null,
      episode: parseInt(titleEpMatch[2], 10)
    }
  }

  // Fallback: any number in filename
  const numMatch = name.match(/\b(\d{1,3})\b/)
  return {
    fansubGroup,
    animeTitle: null,
    episode: numMatch ? parseInt(numMatch[1], 10) : null
  }
}

// ─── Language Detection ──────────────────────────────────────────────────────

function detectLanguage(filePath: string): string {
  const name = path.basename(filePath, path.extname(filePath))
  for (const { pattern, language } of LANGUAGE_PATTERNS) {
    if (pattern.test(name)) return language
  }
  return 'Unknown'
}

// ─── Subtitle label builder ───────────────────────────────────────────────────

function buildSubtitleLabel(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const language = detectLanguage(filePath)
  const formatName = ext.replace('.', '').toUpperCase()
  return `${language} (${formatName})`
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubtitleFile = {
  label: string
  path: string
  extension: string
  language: string
  format: string
  source: 'internal' | 'external'
}

export type EpisodeFile = {
  id: string
  title: string
  fileName: string
  filePath: string
  folderPath: string
  extension: string
  size: number
  modifiedAt: string
  subtitles: SubtitleFile[]
  fansubInfo: {
    fansubGroup: string | null
    animeTitle: string | null
    episode: number | null
  }
}

export type ScanResult = {
  name: string
  path: string
  episodes: EpisodeFile[]
}

// ─── File System Helpers ─────────────────────────────────────────────────────

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(fullPath)
      return fullPath
    })
  )
  return files.flat()
}

/**
 * Find all external subtitle files that match the given video file.
 * Match strategy: subtitle basename must start with or equal the video basename.
 * Sorted by format priority (ASS first).
 */
function findSubtitles(videoPath: string, allFiles: string[]): SubtitleFile[] {
  const parsed = path.parse(videoPath)
  const videoBaseLower = parsed.name.toLowerCase()

  const candidates = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase() as (typeof SUBTITLE_EXTENSIONS)[number]
    if (!SUBTITLE_EXTENSIONS.includes(ext)) return false
    const subName = path.basename(f, path.extname(f)).toLowerCase()
    // Exact match or subtitle name starts with video name (e.g. "ep01.indo.ass")
    return subName === videoBaseLower || subName.startsWith(videoBaseLower)
  })

  // Sort by format priority
  candidates.sort((a, b) => {
    const pa = SUBTITLE_FORMAT_PRIORITY[path.extname(a).toLowerCase()] ?? 99
    const pb = SUBTITLE_FORMAT_PRIORITY[path.extname(b).toLowerCase()] ?? 99
    return pa - pb
  })

  return candidates.map((subPath) => {
    const ext = path.extname(subPath).toLowerCase()
    return {
      label: buildSubtitleLabel(subPath),
      path: subPath,
      extension: ext,
      language: detectLanguage(subPath),
      format: ext,
      source: 'external' as const
    }
  })
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export async function scanAnimeFolder(folderPath: string): Promise<ScanResult> {
  const allFiles = await walk(folderPath)
  const videoFiles = allFiles
    .filter((filePath) => VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => naturalCompare(a, b))

  const episodes = await Promise.all(
    videoFiles.map(async (filePath) => {
      const stats = await fs.stat(filePath)
      const subtitles = findSubtitles(filePath, allFiles)
      const fansubInfo = parseFansubInfo(path.basename(filePath))

      return {
        id: filePath,
        title: path.basename(filePath),
        fileName: path.basename(filePath),
        filePath,
        folderPath: path.dirname(filePath),
        extension: path.extname(filePath).toLowerCase(),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        subtitles,
        fansubInfo
      } satisfies EpisodeFile
    })
  )

  return {
    name: path.basename(folderPath),
    path: folderPath,
    episodes
  }
}
