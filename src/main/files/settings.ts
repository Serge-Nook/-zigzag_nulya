import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { app, dialog, BrowserWindow } from 'electron'
import type { AppSettings } from '../../shared/types'

const DEFAULTS: AppSettings = {
  alarmSoundPath: null,
  defaultSnmpCommunity: 'public',
  defaultPingIntervalMs: 5000
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsFile(), 'utf8')
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch }
  await fs.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

export async function pickAlarmSound(
  win: BrowserWindow | null
): Promise<{ canceled: boolean; path?: string }> {
  const res = await dialog.showOpenDialog(win!, {
    title: 'Выберите звук тревоги (MP3)',
    filters: [{ name: 'Аудио', extensions: ['mp3', 'wav', 'ogg'] }],
    properties: ['openFile']
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }
  const path = res.filePaths[0]
  await setSettings({ alarmSoundPath: path })
  return { canceled: false, path }
}

/** Read alarm audio file as a data URL so the renderer can play it. */
export async function readAlarmData(): Promise<string | null> {
  const { alarmSoundPath } = await getSettings()
  if (!alarmSoundPath) return null
  try {
    const buf = await fs.readFile(alarmSoundPath)
    const ext = extname(alarmSoundPath).toLowerCase()
    const mime = ext === '.wav' ? 'audio/wav' : ext === '.ogg' ? 'audio/ogg' : 'audio/mpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
