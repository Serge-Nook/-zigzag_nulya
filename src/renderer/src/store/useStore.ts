import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import {
  ZIGZAG_FILE_VERSION,
  type DeviceType,
  type TextLabel,
  type TopologyLink,
  type TopologyNode,
  type ZigzagProject,
  type Zone
} from '../../../shared/types'

export type View = 'topology' | 'discovery' | 'inventory' | 'traps'

export type Tool =
  | { kind: 'select' }
  | { kind: 'placeDevice'; deviceType: DeviceType }
  | { kind: 'addLink' }
  | { kind: 'addZone' }
  | { kind: 'addText' }

export type SelectionKind = 'node' | 'link' | 'zone' | 'label'
export interface Selection {
  kind: SelectionKind
  id: string
}

function emptyProject(): ZigzagProject {
  const now = new Date().toISOString()
  return {
    fileVersion: ZIGZAG_FILE_VERSION,
    meta: { name: 'Без названия', createdAt: now, updatedAt: now },
    nodes: [],
    links: [],
    zones: [],
    labels: []
  }
}

export function makeNode(type: DeviceType, x: number, y: number, partial?: Partial<TopologyNode>): TopologyNode {
  return {
    id: uuid(),
    type,
    label: partial?.label ?? defaultLabel(type),
    x,
    y,
    ip: partial?.ip,
    mac: partial?.mac,
    ping: { enabled: false, ip: partial?.ip ?? '', intervalMs: 5000 },
    web: { enabled: false, url: '' },
    note: { enabled: false, text: '' },
    snmp: { enabled: false, community: 'public', version: '2c', port: 161 },
    assetId: partial?.assetId
  }
}

function defaultLabel(type: DeviceType): string {
  const map: Record<DeviceType, string> = {
    router: 'Маршрутизатор',
    switch: 'Коммутатор',
    firewall: 'Межсетевой экран',
    server: 'Сервер',
    pc: 'ПК',
    laptop: 'Ноутбук',
    printer: 'Принтер',
    accessPoint: 'Точка доступа',
    cloud: 'Облако',
    phone: 'IP-телефон',
    storage: 'Хранилище',
    unknown: 'Устройство'
  }
  return map[type]
}

interface StoreState {
  project: ZigzagProject
  filePath?: string
  dirty: boolean
  view: View
  tool: Tool
  selection?: Selection
  linkSource?: string
  gridVisible: boolean

  setView: (v: View) => void
  setTool: (t: Tool) => void
  select: (s?: Selection) => void
  setLinkSource: (id?: string) => void
  toggleGrid: () => void

  newProject: () => void
  loadProject: (p: ZigzagProject, path?: string) => void
  setFilePath: (p?: string) => void
  markSaved: () => void
  setProjectName: (name: string) => void

  addNode: (n: TopologyNode) => void
  updateNode: (id: string, patch: Partial<TopologyNode>) => void
  moveNode: (id: string, x: number, y: number) => void
  removeNode: (id: string) => void

  addLink: (fromNodeId: string, toNodeId: string, partial?: Partial<TopologyLink>) => void
  updateLink: (id: string, patch: Partial<TopologyLink>) => void
  removeLink: (id: string) => void

  addZone: (z: Zone) => void
  updateZone: (id: string, patch: Partial<Zone>) => void
  removeZone: (id: string) => void

  addLabel: (l: TextLabel) => void
  updateLabel: (id: string, patch: Partial<TextLabel>) => void
  removeLabel: (id: string) => void

  deleteSelection: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  project: emptyProject(),
  dirty: false,
  view: 'topology',
  tool: { kind: 'select' },
  gridVisible: true,

  setView: (v) => set({ view: v }),
  setTool: (t) => set({ tool: t, linkSource: undefined }),
  select: (s) => set({ selection: s }),
  setLinkSource: (id) => set({ linkSource: id }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),

  newProject: () => set({ project: emptyProject(), filePath: undefined, dirty: false, selection: undefined }),
  loadProject: (p, path) => set({ project: p, filePath: path, dirty: false, selection: undefined }),
  setFilePath: (p) => set({ filePath: p }),
  markSaved: () => set({ dirty: false }),
  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, meta: { ...s.project.meta, name } }, dirty: true })),

  addNode: (n) => set((s) => ({ project: { ...s.project, nodes: [...s.project.nodes, n] }, dirty: true })),
  updateNode: (id, patch) =>
    set((s) => ({
      project: { ...s.project, nodes: s.project.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) },
      dirty: true
    })),
  moveNode: (id, x, y) =>
    set((s) => ({
      project: { ...s.project, nodes: s.project.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) },
      dirty: true
    })),
  removeNode: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.filter((n) => n.id !== id),
        links: s.project.links.filter((l) => l.fromNodeId !== id && l.toNodeId !== id)
      },
      dirty: true,
      selection: undefined
    })),

  addLink: (fromNodeId, toNodeId, partial) =>
    set((s) => {
      if (fromNodeId === toNodeId) return s
      const exists = s.project.links.some(
        (l) =>
          (l.fromNodeId === fromNodeId && l.toNodeId === toNodeId) ||
          (l.fromNodeId === toNodeId && l.toNodeId === fromNodeId)
      )
      if (exists) return s
      const link: TopologyLink = {
        id: uuid(),
        fromNodeId,
        toNodeId,
        style: partial?.style ?? 'manual',
        source: partial?.source ?? 'manual',
        label: partial?.label,
        dashed: partial?.dashed,
        color: partial?.color
      }
      return { project: { ...s.project, links: [...s.project.links, link] }, dirty: true }
    }),
  updateLink: (id, patch) =>
    set((s) => ({
      project: { ...s.project, links: s.project.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
      dirty: true
    })),
  removeLink: (id) =>
    set((s) => ({
      project: { ...s.project, links: s.project.links.filter((l) => l.id !== id) },
      dirty: true,
      selection: undefined
    })),

  addZone: (z) => set((s) => ({ project: { ...s.project, zones: [...s.project.zones, z] }, dirty: true })),
  updateZone: (id, patch) =>
    set((s) => ({
      project: { ...s.project, zones: s.project.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) },
      dirty: true
    })),
  removeZone: (id) =>
    set((s) => ({
      project: { ...s.project, zones: s.project.zones.filter((z) => z.id !== id) },
      dirty: true,
      selection: undefined
    })),

  addLabel: (l) => set((s) => ({ project: { ...s.project, labels: [...s.project.labels, l] }, dirty: true })),
  updateLabel: (id, patch) =>
    set((s) => ({
      project: { ...s.project, labels: s.project.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
      dirty: true
    })),
  removeLabel: (id) =>
    set((s) => ({
      project: { ...s.project, labels: s.project.labels.filter((l) => l.id !== id) },
      dirty: true,
      selection: undefined
    })),

  deleteSelection: () => {
    const sel = get().selection
    if (!sel) return
    if (sel.kind === 'node') get().removeNode(sel.id)
    else if (sel.kind === 'link') get().removeLink(sel.id)
    else if (sel.kind === 'zone') get().removeZone(sel.id)
    else if (sel.kind === 'label') get().removeLabel(sel.id)
  }
}))
