import type { Episode } from '../types/anime'

/** Splits a filesystem path into segments, handling both `\` and `/` separators. */
function splitPath(p: string): string[] {
  return p.split(/[\\/]+/).filter(Boolean)
}

/** Length of the longest common segment prefix shared by all given paths. */
function commonPrefixLength(segmentLists: string[][]): number {
  if (segmentLists.length === 0) return 0
  const maxLen = Math.min(...segmentLists.map((s) => s.length))
  let i = 0
  for (; i < maxLen; i++) {
    const seg = segmentLists[0][i]
    if (!segmentLists.every((s) => s[i] === seg)) break
  }
  return i
}

export type EpisodeTreeNode = {
  /** Sub-folders keyed by folder name, in first-seen order */
  folders: Map<string, EpisodeTreeNode>
  /** Episodes located directly in this folder (non-recursive) */
  episodes: Episode[]
}

function createNode(): EpisodeTreeNode {
  return { folders: new Map(), episodes: [] }
}

/**
 * Groups a flat episode list into a folder tree based on each episode's
 * `folderPath`, relative to the common ancestor folder shared by all
 * episodes. If every episode lives in the same folder, the tree collapses
 * to a single root level with no sub-folders.
 */
export function buildEpisodeTree(episodes: Episode[]): EpisodeTreeNode {
  const root = createNode()
  if (episodes.length === 0) return root

  const segmentLists = episodes.map((ep) => splitPath(ep.folderPath))
  const skip = commonPrefixLength(segmentLists)

  episodes.forEach((ep, i) => {
    const relSegments = segmentLists[i].slice(skip)
    let node = root
    for (const seg of relSegments) {
      let child = node.folders.get(seg)
      if (!child) {
        child = createNode()
        node.folders.set(seg, child)
      }
      node = child
    }
    node.episodes.push(ep)
  })

  return root
}

/** Total episode count under a node, including all sub-folders (used only for a display hint — cheap, no I/O). */
export function countEpisodes(node: EpisodeTreeNode): number {
  let count = node.episodes.length
  for (const child of node.folders.values()) {
    count += countEpisodes(child)
  }
  return count
}

/**
 * Recursively collects all episodes under a node (this folder + every
 * sub-folder). Used for aggregate stats (total duration, subtitle coverage,
 * etc.) that should reflect the whole season/anime — never for the Episode
 * List playlist, which must stay non-recursive to avoid loading every nested
 * video (and spawning a thumbnail job for each) at once.
 */
export function flattenTree(node: EpisodeTreeNode): Episode[] {
  const result: Episode[] = [...node.episodes]
  for (const child of node.folders.values()) {
    result.push(...flattenTree(child))
  }
  return result
}

/**
 * Walks down a tree following a path of folder names and returns the node at
 * that location, or null if the path doesn't exist.
 */
export function getNodeAtPath(root: EpisodeTreeNode, path: string[]): EpisodeTreeNode | null {
  let node = root
  for (const seg of path) {
    const child = node.folders.get(seg)
    if (!child) return null
    node = child
  }
  return node
}
