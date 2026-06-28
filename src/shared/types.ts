// Shared domain types used by both the Electron main process and the renderer.

export const ZIGZAG_FILE_VERSION = 1

export type DeviceType =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'pc'
  | 'laptop'
  | 'printer'
  | 'accessPoint'
  | 'cloud'
  | 'phone'
  | 'storage'
  | 'unknown'

export interface PingWidget {
  enabled: boolean
  ip: string
  intervalMs: number
}

export interface WebWidget {
  enabled: boolean
  url: string
}

export interface NoteWidget {
  enabled: boolean
  text: string
}

export interface SnmpConfig {
  enabled: boolean
  community: string
  version: '1' | '2c'
  port: number
}

export interface TopologyNode {
  id: string
  type: DeviceType
  label: string
  x: number
  y: number
  ip?: string
  mac?: string
  ping: PingWidget
  web: WebWidget
  note: NoteWidget
  snmp: SnmpConfig
  /** Linked inventory asset id, if any. */
  assetId?: string
}

export type LinkStyle = 'auto' | 'manual'

export interface TopologyLink {
  id: string
  fromNodeId: string
  toNodeId: string
  label?: string
  style: LinkStyle
  /** Discovery source: snmp/lldp/traceroute/manual. */
  source: 'manual' | 'snmp' | 'lldp' | 'traceroute'
  dashed?: boolean
  color?: string
}

export interface Zone {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  fill: string
  opacity: number
  pattern: 'solid' | 'hatch' | 'dots'
}

export interface TextLabel {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

export interface ProjectMeta {
  name: string
  createdAt: string
  updatedAt: string
}

export interface ZigzagProject {
  fileVersion: number
  meta: ProjectMeta
  nodes: TopologyNode[]
  links: TopologyLink[]
  zones: Zone[]
  labels: TextLabel[]
}

export interface AppSettings {
  alarmSoundPath: string | null
  defaultSnmpCommunity: string
  defaultPingIntervalMs: number
}

// ---- Network discovery ----

export interface DiscoveredHost {
  ip: string
  alive: boolean
  mac?: string
  hostname?: string
  vendor?: string
  guessedType: DeviceType
  responseTimeMs?: number
}

export interface ScanOptions {
  cidr: string
  snmpCommunity?: string
  resolveHostnames?: boolean
}

export interface PingResult {
  ip: string
  alive: boolean
  timeMs?: number
}

export interface SnmpVarbind {
  oid: string
  type: string
  value: string
}

export interface TracerouteHop {
  hop: number
  ip: string
  rttMs?: number
}

export interface LldpNeighbor {
  localPort: string
  remoteSysName: string
  remotePortId: string
  remoteChassisId: string
}

export interface SnmpTrap {
  id: string
  receivedAt: string
  source: string
  enterprise?: string
  varbinds: SnmpVarbind[]
}

// ---- Inventory ----

export interface HardwareAsset {
  id: string
  name: string
  type: string
  vendor: string
  model: string
  serial: string
  location: string
  ip: string
  mac: string
  cpu: string
  ramGb: number | null
  diskGb: number | null
  os: string
  status: string
  purchaseDate: string
  warrantyUntil: string
  notes: string
  nodeId: string | null
  createdAt: string
  updatedAt: string
}

export interface SoftwareLicense {
  id: string
  name: string
  vendor: string
  version: string
  licenseKey: string
  seats: number | null
  seatsUsed: number | null
  expiryDate: string
  assetId: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ConfigChange {
  id: string
  assetId: string
  timestamp: string
  category: string
  summary: string
  details: string
}

export interface UpgradePlanItem {
  assetId: string
  name: string
  cpu: string
  ramGb: number | null
  diskGb: number | null
  reason: string
  recommendation: string
}

export interface InventoryStats {
  hardwareCount: number
  softwareCount: number
  expiringSoon: number
  byType: { type: string; count: number }[]
}
