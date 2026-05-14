import { app } from 'electron'
import { mkdirSync } from 'fs'
import path from 'path'
import { JSONFilePreset } from 'lowdb/node'

export type ProgressEntry = {
  currentTime: number
  duration: number
  watched: boolean
  updatedAt: string
}

export type SkipEntry = {
  introStart?: number
  introEnd?: number
  outroStart?: number
  outroEnd?: number
}

export type LibraryRecord = {
  id: string
  name: string
  path: string
  episodes: Array<{
    id: string
    title: string
    fileName: string
    filePath: string
    folderPath: string
    extension: string
    size: number
    modifiedAt: string
    subtitles: { label: string; path: string; extension: string }[]
  }>
}

type LibraryDb = { libraries: LibraryRecord[] }
type ProgressDb = Record<string, ProgressEntry>
type SkipDb = Record<string, SkipEntry>

const dataDir = path.join(app.getPath('appData'), 'AniLocal Player')
mkdirSync(dataDir, { recursive: true })

const libraryDbPromise = JSONFilePreset<LibraryDb>(path.join(dataDir, 'library.json'), {
  libraries: []
})
const progressDbPromise = JSONFilePreset<ProgressDb>(path.join(dataDir, 'progress.json'), {})
const skipDbPromise = JSONFilePreset<SkipDb>(path.join(dataDir, 'skip-data.json'), {})

export async function getLibrary() {
  return (await libraryDbPromise).data
}

export async function saveLibrary(libraries: LibraryRecord[]) {
  const db = await libraryDbPromise
  db.data.libraries = libraries
  await db.write()
  return db.data
}

export async function getProgress() {
  return (await progressDbPromise).data
}

export async function saveProgress(data: ProgressDb) {
  const db = await progressDbPromise
  db.data = { ...db.data, ...data }
  await db.write()
  return db.data
}

export async function getSkipData() {
  return (await skipDbPromise).data
}

export async function saveSkipData(data: SkipDb) {
  const db = await skipDbPromise
  db.data = { ...db.data, ...data }
  await db.write()
  return db.data
}
