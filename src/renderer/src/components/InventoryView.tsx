import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useInventory } from '../store/useInventory'
import { SortTh, useSort } from '../lib/useSort'
import { UPGRADE_PRIORITY_LABELS, UPGRADE_STATUS_LABELS } from '../lib/upgrade'
import type {
  ConfigChange,
  HardwareAsset,
  InventoryStats,
  SoftwareLicense,
  UpgradeCriteria,
  UpgradePlanEntry,
  UpgradePlanItem,
  UpgradePriority,
  UpgradeStatus
} from '../../../shared/types'

type Tab = 'overview' | 'hardware' | 'software' | 'history' | 'upgrade'

export default function InventoryView(): JSX.Element {
  const editRequest = useStore((s) => s.editRequest)
  const [tab, setTab] = useState<Tab>(editRequest?.kind ?? 'overview')
  useEffect(() => {
    if (editRequest) setTab(editRequest.kind)
  }, [editRequest])
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Обзор' },
    { id: 'hardware', label: 'Оборудование' },
    { id: 'software', label: 'ПО и лицензии' },
    { id: 'history', label: 'История конфигураций' },
    { id: 'upgrade', label: 'План апгрейдов' }
  ]
  return (
    <div className="panel inventory">
      <nav className="subtabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'subtab active' : 'subtab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <Overview />}
      {tab === 'hardware' && <HardwareTab />}
      {tab === 'software' && <SoftwareTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'upgrade' && <UpgradeTab />}
    </div>
  )
}

function Overview(): JSX.Element {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [plan, setPlan] = useState<UpgradePlanItem[]>([])
  useEffect(() => {
    window.zigzag.inventory.stats().then(setStats)
    window.zigzag.inventory.upgradePlan().then(setPlan)
  }, [])
  if (!stats) return <div className="card">Загрузка…</div>
  const open = plan.filter((p) => p.status !== 'done' && p.status !== 'rejected')
  return (
    <section className="card">
      <h3>Сводка инвентаризации</h3>
      <div className="stat-cards">
        <div className="stat"><div className="stat-num">{stats.hardwareCount}</div><div>Единиц техники</div></div>
        <div className="stat"><div className="stat-num">{stats.softwareCount}</div><div>Лицензий ПО</div></div>
        <div className="stat warn"><div className="stat-num">{stats.expiringSoon}</div><div>Истекают (30 дн.)</div></div>
        <div className="stat danger"><div className="stat-num">{open.length}</div><div>Нужен апгрейд</div></div>
      </div>
      <h4>Оборудование по типам</h4>
      <ul className="result-list">
        {stats.byType.map((b) => (
          <li key={b.type}>{b.type}: <b>{b.count}</b></li>
        ))}
      </ul>
    </section>
  )
}

const HW_FIELDS: { key: keyof HardwareAsset; label: string; type?: string }[] = [
  { key: 'inventoryNumber', label: 'Инвентарный №' },
  { key: 'name', label: 'Название' },
  { key: 'type', label: 'Тип' },
  { key: 'vendor', label: 'Производитель' },
  { key: 'model', label: 'Модель' },
  { key: 'serial', label: 'Серийный №' },
  { key: 'location', label: 'Расположение' },
  { key: 'ip', label: 'IP' },
  { key: 'mac', label: 'MAC' },
  { key: 'cpu', label: 'CPU' },
  { key: 'ramGb', label: 'ОЗУ, ГБ', type: 'number' },
  { key: 'diskGb', label: 'Диск, ГБ', type: 'number' },
  { key: 'os', label: 'ОС' },
  { key: 'status', label: 'Статус' },
  { key: 'purchaseDate', label: 'Дата покупки', type: 'date' },
  { key: 'warrantyUntil', label: 'Гарантия до', type: 'date' }
]

type HwCol = 'inventoryNumber' | 'name' | 'type' | 'vendor' | 'model' | 'serial' | 'location' | 'ip' | 'os' | 'ramGb' | 'diskGb' | 'status' | 'warrantyUntil' | 'node'

const HW_COLUMNS: { key: HwCol; label: string }[] = [
  { key: 'inventoryNumber', label: 'Инв. №' },
  { key: 'name', label: 'Название' },
  { key: 'type', label: 'Тип' },
  { key: 'vendor', label: 'Производитель' },
  { key: 'model', label: 'Модель' },
  { key: 'serial', label: 'Серийный №' },
  { key: 'location', label: 'Расположение' },
  { key: 'ip', label: 'IP' },
  { key: 'os', label: 'ОС' },
  { key: 'ramGb', label: 'ОЗУ' },
  { key: 'diskGb', label: 'Диск' },
  { key: 'status', label: 'Статус' },
  { key: 'warrantyUntil', label: 'Гарантия до' },
  { key: 'node', label: 'На схеме' }
]

function HardwareTab(): JSX.Element {
  const nodes = useStore((s) => s.project.nodes)
  const openCard = useStore((s) => s.openCard)
  const editRequest = useStore((s) => s.editRequest)
  const clearEditRequest = useStore((s) => s.clearEditRequest)
  const rows = useInventory((s) => s.hardware)
  const refresh = useInventory((s) => s.refresh)
  const [editing, setEditing] = useState<Partial<HardwareAsset> | null>(null)

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (editRequest?.kind !== 'hardware') return
    const a = rows.find((r) => r.id === editRequest.id)
    if (a) {
      setEditing(a)
      clearEditRequest()
    }
  }, [editRequest, rows, clearEditRequest])

  const nodeLabel = useCallback(
    (a: HardwareAsset): string =>
      nodes.find((n) => n.id === a.nodeId || n.assetId === a.id)?.label ?? '',
    [nodes]
  )

  const { sorted, sort, toggle } = useSort<HardwareAsset, HwCol>(rows, 'name', (a, k) =>
    k === 'node' ? nodeLabel(a) : a[k]
  )

  async function save(): Promise<void> {
    if (!editing) return
    const inv = editing.inventoryNumber?.trim().toLowerCase()
    const dup = inv ? rows.find((r) => r.id !== editing.id && r.inventoryNumber?.trim().toLowerCase() === inv) : undefined
    if (dup && !confirm(`Инвентарный № «${editing.inventoryNumber}» уже присвоен «${dup.name}». Сохранить всё равно?`)) return
    await window.zigzag.inventory.upsertHardware(editing)
    setEditing(null)
    refresh()
  }
  async function remove(id: string): Promise<void> {
    if (!confirm('Удалить запись?')) return
    await window.zigzag.inventory.deleteHardware(id)
    refresh()
  }

  const cell = (a: HardwareAsset, k: HwCol): string => {
    if (k === 'node') return nodeLabel(a) || '—'
    const v = a[k]
    return v === null || v === undefined || v === '' ? '—' : String(v)
  }

  return (
    <section className="card">
      <div className="row spread">
        <h3>Учёт оборудования</h3>
        <div className="row">
          <button onClick={() => setEditing({})}>+ Добавить</button>
          <button onClick={() => window.zigzag.inventory.exportCsv('hardware')}>Экспорт CSV</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {HW_COLUMNS.map((c) => (
                <SortTh key={c.key} k={c.key} sort={sort} onSort={toggle}>{c.label}</SortTh>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className="clickable" onClick={() => openCard({ kind: 'hardware', id: a.id })}>
                {HW_COLUMNS.map((c) => (
                  <td key={c.key}>{cell(a, c.key)}</td>
                ))}
                <td className="row nowrap" onClick={(e) => e.stopPropagation()}>
                  <button title="Карточка" onClick={() => openCard({ kind: 'hardware', id: a.id })}>📄</button>
                  <button title="Изменить" onClick={() => setEditing(a)}>✎</button>
                  <button title="Удалить" className="btn-danger" onClick={() => remove(a.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? 'Изменить' : 'Новое'} оборудование</h3>
            <div className="form-grid">
              {HW_FIELDS.map((f) => (
                <label key={f.key}>{f.label}
                  <input
                    type={f.type ?? 'text'}
                    value={(editing[f.key] as string | number | null) ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [f.key]: f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value
                      })
                    }
                  />
                </label>
              ))}
              <label>Привязка к устройству на схеме
                <select value={editing.nodeId ?? ''} onChange={(e) => setEditing({ ...editing, nodeId: e.target.value || null })}>
                  <option value="">—</option>
                  {nodes.map((n) => <option key={n.id} value={n.id}>{n.label} ({n.ip || 'без IP'})</option>)}
                </select>
              </label>
              <label className="full">Заметки
                <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setEditing(null)}>Отмена</button>
              <button className="btn-primary" onClick={save}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const SW_FIELDS: { key: keyof SoftwareLicense; label: string; type?: string }[] = [
  { key: 'name', label: 'Название' },
  { key: 'vendor', label: 'Производитель' },
  { key: 'version', label: 'Версия' },
  { key: 'licenseKey', label: 'Лицензионный ключ' },
  { key: 'seats', label: 'Активаций всего', type: 'number' },
  { key: 'seatsUsed', label: 'Использовано', type: 'number' },
  { key: 'expiryDate', label: 'Действует до', type: 'date' }
]

type SwCol = 'name' | 'vendor' | 'version' | 'seats' | 'expiryDate' | 'asset'

function SoftwareTab(): JSX.Element {
  const openCard = useStore((s) => s.openCard)
  const editRequest = useStore((s) => s.editRequest)
  const clearEditRequest = useStore((s) => s.clearEditRequest)
  const rows = useInventory((s) => s.software)
  const hardware = useInventory((s) => s.hardware)
  const refresh = useInventory((s) => s.refresh)
  const [editing, setEditing] = useState<Partial<SoftwareLicense> | null>(null)

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (editRequest?.kind !== 'software') return
    const s = rows.find((r) => r.id === editRequest.id)
    if (s) {
      setEditing(s)
      clearEditRequest()
    }
  }, [editRequest, rows, clearEditRequest])

  const assetName = useCallback(
    (s: SoftwareLicense): string => hardware.find((h) => h.id === s.assetId)?.name ?? '',
    [hardware]
  )

  const { sorted, sort, toggle } = useSort<SoftwareLicense, SwCol>(rows, 'name', (s, k) =>
    k === 'asset' ? assetName(s) : s[k]
  )

  async function save(): Promise<void> {
    if (!editing) return
    await window.zigzag.inventory.upsertSoftware(editing)
    setEditing(null)
    refresh()
  }
  async function remove(id: string): Promise<void> {
    if (!confirm('Удалить лицензию?')) return
    await window.zigzag.inventory.deleteSoftware(id)
    setEditing(null)
    refresh()
  }

  const expiringClass = (d: string): string => {
    if (!d) return ''
    const t = Date.parse(d)
    if (Number.isNaN(t)) return ''
    const days = (t - Date.now()) / 86400000
    return days < 0 ? 'expired' : days < 30 ? 'soon' : ''
  }

  return (
    <section className="card">
      <div className="row spread">
        <h3>Учёт ПО и лицензий</h3>
        <div className="row">
          <button onClick={() => setEditing({})}>+ Добавить</button>
          <button onClick={() => window.zigzag.inventory.exportCsv('software')}>Экспорт CSV</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <SortTh k="name" sort={sort} onSort={toggle}>Название</SortTh>
            <SortTh k="vendor" sort={sort} onSort={toggle}>Производитель</SortTh>
            <SortTh k="version" sort={sort} onSort={toggle}>Версия</SortTh>
            <SortTh k="seats" sort={sort} onSort={toggle}>Активаций</SortTh>
            <SortTh k="expiryDate" sort={sort} onSort={toggle}>Действует до</SortTh>
            <SortTh k="asset" sort={sort} onSort={toggle}>Оборудование</SortTh>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.id}
              className={`clickable ${expiringClass(s.expiryDate)}`}
              onClick={() => openCard({ kind: 'software', id: s.id })}
            >
              <td>{s.name}</td><td>{s.vendor || '—'}</td><td>{s.version || '—'}</td>
              <td>{s.seatsUsed ?? 0}/{s.seats ?? '∞'}</td>
              <td>{s.expiryDate || 'бессрочно'}</td>
              <td>{assetName(s) || '—'}</td>
              <td className="row nowrap" onClick={(e) => e.stopPropagation()}>
                <button title="Карточка" onClick={() => openCard({ kind: 'software', id: s.id })}>📄</button>
                <button title="Изменить" onClick={() => setEditing(s)}>✎</button>
                <button title="Удалить" className="btn-danger" onClick={() => remove(s.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? 'Изменить' : 'Новая'} лицензия</h3>
            <div className="form-grid">
              {SW_FIELDS.map((f) => (
                <label key={f.key}>{f.label}
                  <input
                    type={f.type ?? 'text'}
                    value={(editing[f.key] as string | number | null) ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [f.key]: f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value
                      })
                    }
                  />
                </label>
              ))}
              <label>Установлено на оборудование
                <select value={editing.assetId ?? ''} onChange={(e) => setEditing({ ...editing, assetId: e.target.value || null })}>
                  <option value="">—</option>
                  {hardware.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="full">Заметки
                <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              {editing.id && <button className="btn-danger" onClick={() => editing.id && remove(editing.id)}>Удалить</button>}
              <button onClick={() => setEditing(null)}>Отмена</button>
              <button className="btn-primary" onClick={save}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function HistoryTab(): JSX.Element {
  const [rows, setRows] = useState<ConfigChange[]>([])
  const [assets, setAssets] = useState<HardwareAsset[]>([])
  useEffect(() => {
    window.zigzag.inventory.listConfigHistory().then(setRows)
    window.zigzag.inventory.listHardware().then(setAssets)
  }, [])
  const nameFor = (id: string): string => assets.find((a) => a.id === id)?.name ?? id.slice(0, 8)
  return (
    <section className="card">
      <h3>История изменений конфигураций</h3>
      {rows.length === 0 && <div className="muted">История пуста.</div>}
      <ul className="history-list">
        {rows.map((c) => (
          <li key={c.id}>
            <span className={`tag ${c.category}`}>{c.category}</span>
            <b>{nameFor(c.assetId)}</b> — {c.summary}
            {c.details && <div className="muted">{c.details}</div>}
            <div className="muted small">{new Date(c.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CriteriaEditor({ onSaved }: { onSaved: () => void }): JSX.Element {
  const hardware = useInventory((s) => s.hardware)
  const [c, setC] = useState<UpgradeCriteria | null>(null)
  const [osText, setOsText] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback((v: UpgradeCriteria) => {
    setC(v)
    setOsText(v.outdatedOs.join(', '))
  }, [])

  useEffect(() => {
    window.zigzag.inventory.getUpgradeCriteria().then(load)
  }, [load])

  const types = useMemo(() => {
    const set = new Set(hardware.map((h) => h.type).filter(Boolean))
    c?.includeTypes.forEach((t) => set.add(t))
    return [...set].sort()
  }, [hardware, c])

  if (!c) return <div className="muted">Загрузка…</div>

  async function save(reset = false): Promise<void> {
    if (!c) return
    const patch: UpgradeCriteria = reset
      ? { minRamGb: 8, minDiskGb: 256, outdatedOs: ['Windows XP', 'Windows 7', 'Windows 8'], includeTypes: [], checkWarranty: false }
      : { ...c, outdatedOs: osText.split(',').map((s) => s.trim()).filter(Boolean) }
    load(await window.zigzag.inventory.setUpgradeCriteria(patch))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onSaved()
  }

  const toggleType = (t: string): void =>
    setC({
      ...c,
      includeTypes: c.includeTypes.includes(t) ? c.includeTypes.filter((x) => x !== t) : [...c.includeTypes, t]
    })

  return (
    <fieldset className="criteria">
      <legend>Критерии автоматического отбора</legend>
      <div className="form-row">
        <label>Мин. ОЗУ, ГБ
          <input type="number" min={0} value={c.minRamGb} onChange={(e) => setC({ ...c, minRamGb: Number(e.target.value) })} />
        </label>
        <label>Мин. диск, ГБ
          <input type="number" min={0} value={c.minDiskGb} onChange={(e) => setC({ ...c, minDiskGb: Number(e.target.value) })} />
        </label>
        <label className="grow">Устаревшие ОС (через запятую)
          <input value={osText} onChange={(e) => setOsText(e.target.value)} placeholder="Windows XP, Windows 7" />
        </label>
      </div>
      <div className="criteria-types">
        <span className="muted small">Типы оборудования{c.includeTypes.length === 0 ? ' (все)' : ''}:</span>
        {types.map((t) => (
          <label key={t} className="inline">
            <input type="checkbox" checked={c.includeTypes.includes(t)} onChange={() => toggleType(t)} />
            {t}
          </label>
        ))}
        <label className="inline">
          <input type="checkbox" checked={c.checkWarranty} onChange={(e) => setC({ ...c, checkWarranty: e.target.checked })} />
          Учитывать истёкшую гарантию
        </label>
      </div>
      <div className="row">
        <button className="btn-primary" onClick={() => save()}>Применить критерии</button>
        <button onClick={() => save(true)}>По умолчанию</button>
        {saved && <span className="muted small">Сохранено</span>}
      </div>
    </fieldset>
  )
}

function PlanRow({ item, onChange }: { item: UpgradePlanItem; onChange: () => void }): JSX.Element {
  const openCard = useStore((s) => s.openCard)
  const [draft, setDraft] = useState(item)
  useEffect(() => setDraft(item), [item])

  async function commit(patch: Partial<UpgradePlanEntry>): Promise<void> {
    const next = { ...draft, ...patch }
    setDraft(next)
    await window.zigzag.inventory.upsertUpgradeEntry({
      assetId: item.assetId,
      status: next.status,
      priority: next.priority,
      plannedDate: next.plannedDate,
      budget: next.budget,
      recommendation: next.recommendation,
      comment: next.comment,
      manual: next.manual
    })
    onChange()
  }

  async function remove(): Promise<void> {
    await window.zigzag.inventory.deleteUpgradeEntry(item.assetId)
    onChange()
  }

  return (
    <tr className={`prio-${draft.priority} status-${draft.status}`}>
      <td>
        <button className="btn-link" onClick={() => openCard({ kind: 'hardware', id: item.assetId })}>{item.name}</button>
        <div className="muted small">{item.type}</div>
      </td>
      <td className="small">{item.reason}</td>
      <td>
        <input value={draft.recommendation} onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })}
          onBlur={() => draft.recommendation !== item.recommendation && commit({})} />
      </td>
      <td>
        <select value={draft.priority} onChange={(e) => commit({ priority: e.target.value as UpgradePriority })}>
          {Object.entries(UPGRADE_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td>
        <select value={draft.status} onChange={(e) => commit({ status: e.target.value as UpgradeStatus })}>
          {Object.entries(UPGRADE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td>
        <input type="date" value={draft.plannedDate} onChange={(e) => commit({ plannedDate: e.target.value })} />
      </td>
      <td>
        <input type="number" min={0} className="num" value={draft.budget ?? ''}
          onChange={(e) => setDraft({ ...draft, budget: e.target.value === '' ? null : Number(e.target.value) })}
          onBlur={() => draft.budget !== item.budget && commit({})} />
      </td>
      <td>
        <input value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          onBlur={() => draft.comment !== item.comment && commit({})} />
      </td>
      <td>
        {(item.manual || !item.auto || item.status !== 'proposed' || item.plannedDate || item.comment || item.budget !== null) && (
          <button title={item.auto ? 'Сбросить настройки пункта' : 'Убрать из плана'} onClick={remove}>
            {item.auto ? '↺' : '✕'}
          </button>
        )}
      </td>
    </tr>
  )
}

type PlanCol = 'name' | 'reason' | 'priority' | 'status' | 'plannedDate' | 'budget'
const PRIORITY_ORDER: Record<UpgradePriority, number> = { high: 0, medium: 1, low: 2 }
const STATUS_ORDER: Record<UpgradeStatus, number> = { proposed: 0, planned: 1, inProgress: 2, done: 3, rejected: 4 }

function UpgradeTab(): JSX.Element {
  const hardware = useInventory((s) => s.hardware)
  const refreshInventory = useInventory((s) => s.refresh)
  const [plan, setPlan] = useState<UpgradePlanItem[]>([])
  const [statusFilter, setStatusFilter] = useState<UpgradeStatus | ''>('')
  const refresh = useCallback(() => window.zigzag.inventory.upgradePlan().then(setPlan), [])
  useEffect(() => {
    refresh()
    refreshInventory()
  }, [refresh, refreshInventory])

  const visible = useMemo(
    () => (statusFilter ? plan.filter((p) => p.status === statusFilter) : plan),
    [plan, statusFilter]
  )
  const { sorted, sort, toggle } = useSort<UpgradePlanItem, PlanCol>(visible, 'priority', (p, k) =>
    k === 'priority' ? PRIORITY_ORDER[p.priority] : k === 'status' ? STATUS_ORDER[p.status] : p[k]
  )

  const candidates = hardware.filter((h) => !plan.some((p) => p.assetId === h.id))
  const budget = visible.reduce((sum, p) => sum + (p.status !== 'rejected' ? p.budget ?? 0 : 0), 0)

  async function addManual(assetId: string): Promise<void> {
    await window.zigzag.inventory.upsertUpgradeEntry({ assetId, manual: true, status: 'planned' })
    refresh()
  }

  return (
    <section className="card">
      <div className="row spread">
        <h3>План апгрейдов</h3>
        <div className="row">
          <button onClick={() => window.zigzag.inventory.exportCsv('upgrade')}>Экспорт CSV</button>
        </div>
      </div>

      <CriteriaEditor onSaved={refresh} />

      <div className="row spread">
        <div className="row">
          <label className="inline">Статус:
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UpgradeStatus | '')}>
              <option value="">все</option>
              {Object.entries(UPGRADE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <span className="muted small">Пунктов: {visible.length} · Бюджет: {budget.toLocaleString('ru-RU')}</span>
        </div>
        {candidates.length > 0 && (
          <label className="inline">Добавить вручную:
            <select value="" onChange={(e) => e.target.value && addManual(e.target.value)}>
              <option value="">— выберите оборудование —</option>
              {candidates.map((h) => <option key={h.id} value={h.id}>{h.name}{h.model ? ` (${h.model})` : ''}</option>)}
            </select>
          </label>
        )}
      </div>

      {plan.length === 0 && <div className="muted">Все устройства соответствуют критериям.</div>}
      {plan.length > 0 && (
        <div className="table-scroll">
          <table className="data-table plan-table">
            <thead>
              <tr>
                <SortTh k="name" sort={sort} onSort={toggle}>Устройство</SortTh>
                <SortTh k="reason" sort={sort} onSort={toggle}>Причина</SortTh>
                <th>Рекомендация</th>
                <SortTh k="priority" sort={sort} onSort={toggle}>Приоритет</SortTh>
                <SortTh k="status" sort={sort} onSort={toggle}>Статус</SortTh>
                <SortTh k="plannedDate" sort={sort} onSort={toggle}>Срок</SortTh>
                <SortTh k="budget" sort={sort} onSort={toggle}>Бюджет</SortTh>
                <th>Комментарий</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => <PlanRow key={p.assetId} item={p} onChange={refresh} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
