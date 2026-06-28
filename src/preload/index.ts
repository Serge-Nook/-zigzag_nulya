import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc'
import type {
  AppSettings,
  ConfigChange,
  DiscoveredHost,
  HardwareAsset,
  InventoryStats,
  LldpNeighbor,
  PingResult,
  ScanOptions,
  SnmpTrap,
  SnmpVarbind,
  SoftwareLicense,
  TracerouteHop,
  UpgradePlanItem,
  ZigzagProject
} from '../shared/types'

export interface ScanProgress {
  done: number
  total: number
  host?: DiscoveredHost
}

const api = {
  project: {
    open: () => ipcRenderer.invoke(IPC.projectOpen),
    save: (project: ZigzagProject, path?: string) =>
      ipcRenderer.invoke(IPC.projectSave, project, path),
    saveAs: (project: ZigzagProject) => ipcRenderer.invoke(IPC.projectSaveAs, project)
  },
  exports: {
    png: (dataUrl: string, name: string) => ipcRenderer.invoke(IPC.exportPng, dataUrl, name),
    svg: (svg: string, name: string) => ipcRenderer.invoke(IPC.exportSvg, svg, name),
    pdf: (bytes: ArrayBuffer, name: string) => ipcRenderer.invoke(IPC.exportPdf, bytes, name)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.settingsSet, patch),
    pickAlarm: (): Promise<{ canceled: boolean; path?: string }> =>
      ipcRenderer.invoke(IPC.settingsPickAlarm),
    readAlarmData: (): Promise<string | null> => ipcRenderer.invoke(IPC.readAlarmData)
  },
  net: {
    scan: (opts: ScanOptions): Promise<DiscoveredHost[]> => ipcRenderer.invoke(IPC.netScan, opts),
    onScanProgress: (cb: (p: ScanProgress) => void) => {
      const listener = (_e: unknown, p: ScanProgress) => cb(p)
      ipcRenderer.on(IPC.netScanProgress, listener)
      return () => {
        ipcRenderer.removeListener(IPC.netScanProgress, listener)
      }
    },
    ping: (ip: string): Promise<PingResult> => ipcRenderer.invoke(IPC.netPing, ip),
    snmpGet: (host: string, oids: string[], community: string): Promise<SnmpVarbind[]> =>
      ipcRenderer.invoke(IPC.netSnmpGet, host, oids, community),
    snmpWalk: (host: string, oid: string, community: string): Promise<SnmpVarbind[]> =>
      ipcRenderer.invoke(IPC.netSnmpWalk, host, oid, community),
    traceroute: (target: string): Promise<TracerouteHop[]> =>
      ipcRenderer.invoke(IPC.netTraceroute, target),
    lldp: (host: string, community: string): Promise<LldpNeighbor[]> =>
      ipcRenderer.invoke(IPC.netLldp, host, community)
  },
  traps: {
    start: (port: number): Promise<{ port: number }> => ipcRenderer.invoke(IPC.trapStart, port),
    stop: (): Promise<{ stopped: boolean }> => ipcRenderer.invoke(IPC.trapStop),
    onTrap: (cb: (t: SnmpTrap) => void) => {
      const listener = (_e: unknown, t: SnmpTrap) => cb(t)
      ipcRenderer.on(IPC.trapReceived, listener)
      return () => {
        ipcRenderer.removeListener(IPC.trapReceived, listener)
      }
    }
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke(IPC.openExternal, url)
  },
  inventory: {
    stats: (): Promise<InventoryStats> => ipcRenderer.invoke(IPC.invStats),
    listHardware: (): Promise<HardwareAsset[]> => ipcRenderer.invoke(IPC.invListHardware),
    upsertHardware: (a: Partial<HardwareAsset>): Promise<HardwareAsset> =>
      ipcRenderer.invoke(IPC.invUpsertHardware, a),
    deleteHardware: (id: string): Promise<void> => ipcRenderer.invoke(IPC.invDeleteHardware, id),
    listSoftware: (): Promise<SoftwareLicense[]> => ipcRenderer.invoke(IPC.invListSoftware),
    upsertSoftware: (s: Partial<SoftwareLicense>): Promise<SoftwareLicense> =>
      ipcRenderer.invoke(IPC.invUpsertSoftware, s),
    deleteSoftware: (id: string): Promise<void> => ipcRenderer.invoke(IPC.invDeleteSoftware, id),
    listConfigHistory: (assetId?: string): Promise<ConfigChange[]> =>
      ipcRenderer.invoke(IPC.invListConfigHistory, assetId),
    addConfigChange: (c: Omit<ConfigChange, 'id' | 'timestamp'>): Promise<ConfigChange> =>
      ipcRenderer.invoke(IPC.invAddConfigChange, c),
    upgradePlan: (): Promise<UpgradePlanItem[]> => ipcRenderer.invoke(IPC.invUpgradePlan),
    exportCsv: (table: 'hardware' | 'software'): Promise<{ canceled: boolean; path?: string }> =>
      ipcRenderer.invoke(IPC.invExportCsv, table)
  }
}

export type ZigzagApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('zigzag', api)
  } catch (error) {
    console.error(error)
  }
} else {
  const w = window as unknown as { electron: typeof electronAPI; zigzag: ZigzagApi }
  w.electron = electronAPI
  w.zigzag = api
}
