import { ipcMain, shell, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import type {
  AppSettings,
  ConfigChange,
  HardwareAsset,
  ScanOptions,
  SoftwareLicense,
  ZigzagProject
} from '../shared/types'
import { openProject, saveProject } from './files/project'
import { exportPng, exportSvg, exportPdf, saveCsv } from './files/exports'
import { getSettings, setSettings, pickAlarmSound, readAlarmData } from './files/settings'
import { pingHost } from './network/ping'
import { scanNetwork } from './network/scan'
import { snmpGet, snmpWalk, lldpNeighbors } from './network/snmp'
import { traceroute } from './network/traceroute'
import { startTrapReceiver, stopTrapReceiver } from './network/trap'
import * as inv from './db/inventory'

function focusedWin(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

export async function registerIpc(): Promise<void> {
  await inv.initInventory(join(app.getPath('userData'), 'inventory.sqlite'))

  // ---- Project files ----
  ipcMain.handle(IPC.projectOpen, () => openProject(focusedWin()))
  ipcMain.handle(
    IPC.projectSave,
    (_e, project: ZigzagProject, existingPath?: string) =>
      saveProject(focusedWin(), project, existingPath)
  )
  ipcMain.handle(
    IPC.projectSaveAs,
    (_e, project: ZigzagProject) => saveProject(focusedWin(), project)
  )

  // ---- Exports ----
  ipcMain.handle(IPC.exportPng, (_e, dataUrl: string, name: string) =>
    exportPng(focusedWin(), dataUrl, name)
  )
  ipcMain.handle(IPC.exportSvg, (_e, svg: string, name: string) =>
    exportSvg(focusedWin(), svg, name)
  )
  ipcMain.handle(IPC.exportPdf, (_e, bytes: ArrayBuffer, name: string) =>
    exportPdf(focusedWin(), bytes, name)
  )

  // ---- Settings ----
  ipcMain.handle(IPC.settingsGet, () => getSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<AppSettings>) => setSettings(patch))
  ipcMain.handle(IPC.settingsPickAlarm, () => pickAlarmSound(focusedWin()))
  ipcMain.handle(IPC.readAlarmData, () => readAlarmData())

  // ---- Network ----
  ipcMain.handle(IPC.netScan, async (e, opts: ScanOptions) => {
    const sender = e.sender
    return scanNetwork(opts, (done, total, host) => {
      sender.send(IPC.netScanProgress, { done, total, host })
    })
  })
  ipcMain.handle(IPC.netPing, (_e, ip: string) => pingHost(ip))
  ipcMain.handle(
    IPC.netSnmpGet,
    (_e, host: string, oids: string[], community: string) => snmpGet(host, oids, community)
  )
  ipcMain.handle(
    IPC.netSnmpWalk,
    (_e, host: string, oid: string, community: string) => snmpWalk(host, oid, community)
  )
  ipcMain.handle(IPC.netTraceroute, (_e, target: string) => traceroute(target))
  ipcMain.handle(
    IPC.netLldp,
    (_e, host: string, community: string) => lldpNeighbors(host, community)
  )

  // ---- SNMP traps ----
  ipcMain.handle(IPC.trapStart, (e, port: number) => {
    const sender = e.sender
    return startTrapReceiver(port || 162, (trap) => sender.send(IPC.trapReceived, trap))
  })
  ipcMain.handle(IPC.trapStop, () => {
    stopTrapReceiver()
    return { stopped: true }
  })

  // ---- Shell ----
  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url))

  // ---- Inventory ----
  ipcMain.handle(IPC.invStats, () => inv.stats())
  ipcMain.handle(IPC.invListHardware, () => inv.listHardware())
  ipcMain.handle(IPC.invUpsertHardware, (_e, a: Partial<HardwareAsset>) => inv.upsertHardware(a))
  ipcMain.handle(IPC.invDeleteHardware, (_e, id: string) => inv.deleteHardware(id))
  ipcMain.handle(IPC.invListSoftware, () => inv.listSoftware())
  ipcMain.handle(IPC.invUpsertSoftware, (_e, s: Partial<SoftwareLicense>) => inv.upsertSoftware(s))
  ipcMain.handle(IPC.invDeleteSoftware, (_e, id: string) => inv.deleteSoftware(id))
  ipcMain.handle(IPC.invListConfigHistory, (_e, assetId?: string) =>
    inv.listConfigHistory(assetId)
  )
  ipcMain.handle(
    IPC.invAddConfigChange,
    (_e, c: Omit<ConfigChange, 'id' | 'timestamp'>) => inv.addConfigChange(c)
  )
  ipcMain.handle(IPC.invUpgradePlan, () => inv.upgradePlan())
  ipcMain.handle(IPC.invExportCsv, async (_e, table: 'hardware' | 'software') => {
    const csv = inv.exportCsv(table)
    return saveCsv(focusedWin(), csv, `inventory-${table}`)
  })
}
