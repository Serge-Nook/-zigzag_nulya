import { promises as fs } from 'fs'
import { dialog, BrowserWindow } from 'electron'
import { ZIGZAG_FILE_VERSION, type ZigzagProject } from '../../shared/types'

export interface OpenResult {
  canceled: boolean
  path?: string
  project?: ZigzagProject
  error?: string
}

export interface SaveResult {
  canceled: boolean
  path?: string
  error?: string
}

export async function openProject(win: BrowserWindow | null): Promise<OpenResult> {
  const res = await dialog.showOpenDialog(win!, {
    title: 'Открыть проект Зигзаг',
    filters: [{ name: 'Zigzag проект', extensions: ['zigzag'] }],
    properties: ['openFile']
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }
  const path = res.filePaths[0]
  try {
    const raw = await fs.readFile(path, 'utf8')
    const project = JSON.parse(raw) as ZigzagProject
    if (typeof project.fileVersion !== 'number' || !Array.isArray(project.nodes)) {
      return { canceled: false, error: 'Файл не является корректным проектом .zigzag' }
    }
    return { canceled: false, path, project }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}

export async function saveProject(
  win: BrowserWindow | null,
  project: ZigzagProject,
  existingPath?: string
): Promise<SaveResult> {
  let path = existingPath
  if (!path) {
    const res = await dialog.showSaveDialog(win!, {
      title: 'Сохранить проект Зигзаг',
      defaultPath: `${project.meta.name || 'topology'}.zigzag`,
      filters: [{ name: 'Zigzag проект', extensions: ['zigzag'] }]
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    path = res.filePath
  }
  try {
    const toWrite: ZigzagProject = {
      ...project,
      fileVersion: ZIGZAG_FILE_VERSION,
      meta: { ...project.meta, updatedAt: new Date().toISOString() }
    }
    await fs.writeFile(path, JSON.stringify(toWrite, null, 2), 'utf8')
    return { canceled: false, path }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}
