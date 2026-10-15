import { promises as fs } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'
import initSqlJs, { type Database } from 'sql.js'
import type {
  ConfigChange,
  HardwareAsset,
  InventoryStats,
  SoftwareLicense,
  UpgradeCriteria,
  UpgradePlanEntry,
  UpgradePlanItem
} from '../../shared/types'

const require = createRequire(import.meta.url)

let db: Database | null = null
let dbPath = ''

const SCHEMA = `
CREATE TABLE IF NOT EXISTS hardware (
  id TEXT PRIMARY KEY, name TEXT, type TEXT, vendor TEXT, model TEXT, serial TEXT,
  location TEXT, ip TEXT, mac TEXT, cpu TEXT, ramGb REAL, diskGb REAL, os TEXT,
  status TEXT, purchaseDate TEXT, warrantyUntil TEXT, notes TEXT, nodeId TEXT,
  createdAt TEXT, updatedAt TEXT, inventoryNumber TEXT
);
CREATE TABLE IF NOT EXISTS software (
  id TEXT PRIMARY KEY, name TEXT, vendor TEXT, version TEXT, licenseKey TEXT,
  seats INTEGER, seatsUsed INTEGER, expiryDate TEXT, assetId TEXT, notes TEXT,
  createdAt TEXT, updatedAt TEXT
);
CREATE TABLE IF NOT EXISTS config_history (
  id TEXT PRIMARY KEY, assetId TEXT, timestamp TEXT, category TEXT, summary TEXT, details TEXT
);
CREATE TABLE IF NOT EXISTS upgrade_plan (
  assetId TEXT PRIMARY KEY, status TEXT, priority TEXT, plannedDate TEXT, budget REAL,
  recommendation TEXT, comment TEXT, manual INTEGER
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY, value TEXT
);
`

export async function initInventory(path: string): Promise<void> {
  dbPath = path
  const wasmFile = await fs.readFile(require.resolve('sql.js/dist/sql-wasm.wasm'))
  const wasmBinary = wasmFile.buffer.slice(
    wasmFile.byteOffset,
    wasmFile.byteOffset + wasmFile.byteLength
  ) as ArrayBuffer
  const SQL = await initSqlJs({ wasmBinary })
  let fileBuffer: Buffer | null = null
  try {
    fileBuffer = await fs.readFile(dbPath)
  } catch {
    fileBuffer = null
  }
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database()
  db.run(SCHEMA)
  migrate(db)
  if (!fileBuffer) {
    seedSampleData()
    persist()
  }
}

function migrate(d: Database): void {
  const cols = d.exec('PRAGMA table_info(hardware)')[0]?.values.map((r) => String(r[1])) ?? []
  if (!cols.includes('inventoryNumber')) d.run("ALTER TABLE hardware ADD COLUMN inventoryNumber TEXT DEFAULT ''")
}

function persist(): void {
  if (!db) return
  const data = Buffer.from(db.export())
  // best-effort async write
  fs.writeFile(dbPath, data).catch((e) => console.error('inventory persist failed', e))
}

function requireDb(): Database {
  if (!db) throw new Error('Inventory DB not initialized')
  return db
}

function rowsFor<T>(sql: string, params: unknown[] = []): T[] {
  const d = requireDb()
  const stmt = d.prepare(sql)
  stmt.bind(params as never)
  const out: T[] = []
  while (stmt.step()) out.push(stmt.getAsObject() as unknown as T)
  stmt.free()
  return out
}

// ---- Hardware ----

export function listHardware(): HardwareAsset[] {
  return rowsFor<HardwareAsset>('SELECT * FROM hardware ORDER BY name')
}

export function upsertHardware(input: Partial<HardwareAsset>): HardwareAsset {
  const now = new Date().toISOString()
  const existing = input.id ? rowsFor<HardwareAsset>('SELECT * FROM hardware WHERE id=?', [input.id])[0] : undefined
  const a: HardwareAsset = {
    id: input.id ?? randomUUID(),
    name: input.name ?? existing?.name ?? 'Новое устройство',
    inventoryNumber: (input.inventoryNumber ?? existing?.inventoryNumber ?? '').trim(),
    type: input.type ?? existing?.type ?? 'pc',
    vendor: input.vendor ?? existing?.vendor ?? '',
    model: input.model ?? existing?.model ?? '',
    serial: input.serial ?? existing?.serial ?? '',
    location: input.location ?? existing?.location ?? '',
    ip: input.ip ?? existing?.ip ?? '',
    mac: input.mac ?? existing?.mac ?? '',
    cpu: input.cpu ?? existing?.cpu ?? '',
    ramGb: pick(input.ramGb, existing?.ramGb),
    diskGb: pick(input.diskGb, existing?.diskGb),
    os: input.os ?? existing?.os ?? '',
    status: input.status ?? existing?.status ?? 'active',
    purchaseDate: input.purchaseDate ?? existing?.purchaseDate ?? '',
    warrantyUntil: input.warrantyUntil ?? existing?.warrantyUntil ?? '',
    notes: input.notes ?? existing?.notes ?? '',
    nodeId: pick(input.nodeId, existing?.nodeId),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  requireDb().run(
    `INSERT OR REPLACE INTO hardware
     (id,name,inventoryNumber,type,vendor,model,serial,location,ip,mac,cpu,ramGb,diskGb,os,status,purchaseDate,warrantyUntil,notes,nodeId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      a.id, a.name, a.inventoryNumber, a.type, a.vendor, a.model, a.serial, a.location, a.ip, a.mac, a.cpu,
      a.ramGb, a.diskGb, a.os, a.status, a.purchaseDate, a.warrantyUntil, a.notes, a.nodeId,
      a.createdAt, a.updatedAt
    ]
  )
  if (!existing) {
    addConfigChange({ assetId: a.id, category: 'create', summary: `Добавлено: ${a.name}`, details: '' })
  } else {
    addConfigChange({ assetId: a.id, category: 'update', summary: `Изменено: ${a.name}`, details: diffSummary(existing, a) })
  }
  persist()
  return a
}

/** Nullable field merge: `undefined` keeps the existing value, `null` clears it. */
function pick<T>(input: T | null | undefined, existing: T | null | undefined): T | null {
  return input !== undefined ? input : existing ?? null
}

function diffSummary(before: HardwareAsset, after: HardwareAsset): string {
  const fields: (keyof HardwareAsset)[] = ['inventoryNumber', 'cpu', 'ramGb', 'diskGb', 'os', 'ip', 'status', 'location']
  const changes = fields
    .filter((f) => String(before[f] ?? '') !== String(after[f] ?? ''))
    .map((f) => `${f}: ${before[f] ?? '—'} → ${after[f] ?? '—'}`)
  return changes.join('; ')
}

export function deleteHardware(id: string): void {
  requireDb().run('DELETE FROM hardware WHERE id=?', [id])
  requireDb().run('DELETE FROM config_history WHERE assetId=?', [id])
  requireDb().run('DELETE FROM upgrade_plan WHERE assetId=?', [id])
  requireDb().run('UPDATE software SET assetId=NULL WHERE assetId=?', [id])
  persist()
}

// ---- Software ----

export function listSoftware(): SoftwareLicense[] {
  return rowsFor<SoftwareLicense>('SELECT * FROM software ORDER BY name')
}

export function upsertSoftware(input: Partial<SoftwareLicense>): SoftwareLicense {
  const now = new Date().toISOString()
  const existing = input.id ? rowsFor<SoftwareLicense>('SELECT * FROM software WHERE id=?', [input.id])[0] : undefined
  const s: SoftwareLicense = {
    id: input.id ?? randomUUID(),
    name: input.name ?? existing?.name ?? 'Новое ПО',
    vendor: input.vendor ?? existing?.vendor ?? '',
    version: input.version ?? existing?.version ?? '',
    licenseKey: input.licenseKey ?? existing?.licenseKey ?? '',
    seats: pick(input.seats, existing?.seats),
    seatsUsed: pick(input.seatsUsed, existing?.seatsUsed),
    expiryDate: input.expiryDate ?? existing?.expiryDate ?? '',
    assetId: pick(input.assetId, existing?.assetId),
    notes: input.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  requireDb().run(
    `INSERT OR REPLACE INTO software
     (id,name,vendor,version,licenseKey,seats,seatsUsed,expiryDate,assetId,notes,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, s.name, s.vendor, s.version, s.licenseKey, s.seats, s.seatsUsed, s.expiryDate, s.assetId, s.notes, s.createdAt, s.updatedAt]
  )
  persist()
  return s
}

export function deleteSoftware(id: string): void {
  requireDb().run('DELETE FROM software WHERE id=?', [id])
  persist()
}

// ---- Config history ----

export function listConfigHistory(assetId?: string): ConfigChange[] {
  if (assetId) {
    return rowsFor<ConfigChange>('SELECT * FROM config_history WHERE assetId=? ORDER BY timestamp DESC', [assetId])
  }
  return rowsFor<ConfigChange>('SELECT * FROM config_history ORDER BY timestamp DESC LIMIT 500')
}

export function addConfigChange(input: Omit<ConfigChange, 'id' | 'timestamp'>): ConfigChange {
  const c: ConfigChange = { id: randomUUID(), timestamp: new Date().toISOString(), ...input }
  requireDb().run(
    'INSERT INTO config_history (id,assetId,timestamp,category,summary,details) VALUES (?,?,?,?,?,?)',
    [c.id, c.assetId, c.timestamp, c.category, c.summary, c.details]
  )
  persist()
  return c
}

// ---- Reports / stats ----

export function stats(): InventoryStats {
  const hw = listHardware()
  const sw = listSoftware()
  const now = Date.now()
  const soon = now + 30 * 24 * 3600 * 1000
  const expiringSoon = sw.filter((s) => {
    if (!s.expiryDate) return false
    const t = Date.parse(s.expiryDate)
    return !Number.isNaN(t) && t >= now && t <= soon
  }).length
  const byTypeMap = new Map<string, number>()
  for (const a of hw) byTypeMap.set(a.type, (byTypeMap.get(a.type) ?? 0) + 1)
  return {
    hardwareCount: hw.length,
    softwareCount: sw.length,
    expiringSoon,
    byType: [...byTypeMap.entries()].map(([type, count]) => ({ type, count }))
  }
}

// ---- Upgrade planning ----

export const DEFAULT_UPGRADE_CRITERIA: UpgradeCriteria = {
  minRamGb: 8,
  minDiskGb: 256,
  outdatedOs: ['Windows XP', 'Windows 7', 'Windows 8'],
  includeTypes: [],
  checkWarranty: false
}

const CRITERIA_KEY = 'upgradeCriteria'

export function getUpgradeCriteria(): UpgradeCriteria {
  const row = rowsFor<{ value: string }>('SELECT value FROM kv WHERE key=?', [CRITERIA_KEY])[0]
  if (!row) return { ...DEFAULT_UPGRADE_CRITERIA }
  try {
    return { ...DEFAULT_UPGRADE_CRITERIA, ...(JSON.parse(row.value) as Partial<UpgradeCriteria>) }
  } catch {
    return { ...DEFAULT_UPGRADE_CRITERIA }
  }
}

export function setUpgradeCriteria(patch: Partial<UpgradeCriteria>): UpgradeCriteria {
  const next = { ...getUpgradeCriteria(), ...patch }
  requireDb().run('INSERT OR REPLACE INTO kv (key,value) VALUES (?,?)', [CRITERIA_KEY, JSON.stringify(next)])
  persist()
  return next
}

interface UpgradePlanRow extends Omit<UpgradePlanEntry, 'manual'> {
  manual: number
}

function listUpgradeEntries(): Map<string, UpgradePlanEntry> {
  const rows = rowsFor<UpgradePlanRow>('SELECT * FROM upgrade_plan')
  return new Map(rows.map((r) => [r.assetId, { ...r, manual: !!r.manual }]))
}

export function upsertUpgradeEntry(input: Partial<UpgradePlanEntry> & { assetId: string }): UpgradePlanEntry {
  const existing = listUpgradeEntries().get(input.assetId)
  const e: UpgradePlanEntry = {
    assetId: input.assetId,
    status: input.status ?? existing?.status ?? 'proposed',
    priority: input.priority ?? existing?.priority ?? 'medium',
    plannedDate: input.plannedDate ?? existing?.plannedDate ?? '',
    budget: pick(input.budget, existing?.budget),
    recommendation: input.recommendation ?? existing?.recommendation ?? '',
    comment: input.comment ?? existing?.comment ?? '',
    manual: input.manual ?? existing?.manual ?? false
  }
  requireDb().run(
    `INSERT OR REPLACE INTO upgrade_plan
     (assetId,status,priority,plannedDate,budget,recommendation,comment,manual)
     VALUES (?,?,?,?,?,?,?,?)`,
    [e.assetId, e.status, e.priority, e.plannedDate, e.budget, e.recommendation, e.comment, e.manual ? 1 : 0]
  )
  persist()
  return e
}

export function deleteUpgradeEntry(assetId: string): void {
  requireDb().run('DELETE FROM upgrade_plan WHERE assetId=?', [assetId])
  persist()
}

function upgradeReasons(a: HardwareAsset, c: UpgradeCriteria): string[] {
  if (c.includeTypes.length > 0 && !c.includeTypes.includes(a.type)) return []
  const reasons: string[] = []
  if (a.ramGb !== null && a.ramGb < c.minRamGb) reasons.push(`ОЗУ ${a.ramGb} ГБ < ${c.minRamGb} ГБ`)
  if (a.diskGb !== null && a.diskGb < c.minDiskGb) reasons.push(`диск ${a.diskGb} ГБ < ${c.minDiskGb} ГБ`)
  const os = a.os.toLowerCase()
  if (os && c.outdatedOs.some((p) => p.trim() && os.includes(p.trim().toLowerCase()))) {
    reasons.push(`устаревшая ОС: ${a.os}`)
  }
  if (c.checkWarranty && a.warrantyUntil) {
    const t = Date.parse(a.warrantyUntil)
    if (!Number.isNaN(t) && t < Date.now()) reasons.push(`гарантия истекла ${a.warrantyUntil}`)
  }
  return reasons
}

export function upgradePlan(): UpgradePlanItem[] {
  const hw = listHardware()
  const criteria = getUpgradeCriteria()
  const entries = listUpgradeEntries()
  const plan: UpgradePlanItem[] = []
  for (const a of hw) {
    const reasons = upgradeReasons(a, criteria)
    const entry = entries.get(a.id)
    if (reasons.length === 0 && !entry) continue
    const autoRecommendation =
      reasons.length > 1 ? 'Полная замена / апгрейд' : reasons.length === 1 ? 'Частичный апгрейд' : ''
    plan.push({
      assetId: a.id,
      name: a.name,
      type: a.type,
      cpu: a.cpu,
      ramGb: a.ramGb,
      diskGb: a.diskGb,
      os: a.os,
      auto: reasons.length > 0,
      reason: reasons.length ? reasons.join('; ') : entry?.manual ? 'Добавлено вручную' : 'Соответствует критериям',
      status: entry?.status ?? 'proposed',
      priority: entry?.priority ?? (reasons.length > 1 ? 'high' : 'medium'),
      plannedDate: entry?.plannedDate ?? '',
      budget: entry?.budget ?? null,
      recommendation: entry?.recommendation || autoRecommendation,
      comment: entry?.comment ?? '',
      manual: entry?.manual ?? false
    })
  }
  return plan
}

export type CsvTable = 'hardware' | 'software' | 'upgrade'

export function exportCsv(table: CsvTable): string {
  const rows = table === 'hardware' ? listHardware() : table === 'software' ? listSoftware() : upgradePlan()
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows)
    lines.push(headers.map((h) => escape((r as unknown as Record<string, unknown>)[h])).join(','))
  return lines.join('\n')
}

function seedSampleData(): void {
  upsertHardware({ name: 'Core-Router-01', inventoryNumber: 'ИН-0001', type: 'router', vendor: 'Cisco', model: 'ISR 4331', serial: 'CSR-001', location: 'Серверная', ip: '192.168.1.1', cpu: 'QorIQ', ramGb: 4, diskGb: 8, os: 'IOS XE', status: 'active' })
  upsertHardware({ name: 'SW-Floor2', inventoryNumber: 'ИН-0002', type: 'switch', vendor: 'HP', model: 'ProCurve 2530', serial: 'SW-220', location: '2 этаж', ip: '192.168.1.2', ramGb: 1, diskGb: 1, os: 'ArubaOS', status: 'active' })
  upsertHardware({ name: 'PC-Buh-07', inventoryNumber: 'ИН-0003', type: 'pc', vendor: 'Dell', model: 'OptiPlex 3070', serial: 'PC-707', location: 'Бухгалтерия', ip: '192.168.1.107', cpu: 'i3-9100', ramGb: 4, diskGb: 128, os: 'Windows 7', status: 'active' })
  upsertHardware({ name: 'HP-LaserJet-Hall', inventoryNumber: 'ИН-0004', type: 'printer', vendor: 'HP', model: 'LaserJet M404', serial: 'PRN-12', location: 'Холл', ip: '192.168.1.50', os: 'firmware', status: 'active' })
  upsertSoftware({ name: 'Windows 10 Pro', vendor: 'Microsoft', version: '22H2', seats: 50, seatsUsed: 47, expiryDate: '', licenseKey: 'XXXXX-VOLUME' })
  upsertSoftware({ name: 'Антивирус Pro', vendor: 'SecureCorp', version: '12', seats: 60, seatsUsed: 55, expiryDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), licenseKey: 'AV-2024' })
}
