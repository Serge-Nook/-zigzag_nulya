import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import type {
  ConfigChange,
  HardwareAsset,
  InventoryStats,
  SoftwareLicense,
  UpgradePlanItem
} from '../../../shared/types'

type Tab = 'overview' | 'hardware' | 'software' | 'history' | 'upgrade'

export default function InventoryView(): JSX.Element {
  const [tab, setTab] = useState<Tab>('overview')
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
  return (
    <section className="card">
      <h3>Сводка инвентаризации</h3>
      <div className="stat-cards">
        <div className="stat"><div className="stat-num">{stats.hardwareCount}</div><div>Единиц техники</div></div>
        <div className="stat"><div className="stat-num">{stats.softwareCount}</div><div>Лицензий ПО</div></div>
        <div className="stat warn"><div className="stat-num">{stats.expiringSoon}</div><div>Истекают (30 дн.)</div></div>
        <div className="stat danger"><div className="stat-num">{plan.length}</div><div>Нужен апгрейд</div></div>
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

function HardwareTab(): JSX.Element {
  const nodes = useStore((s) => s.project.nodes)
  const [rows, setRows] = useState<HardwareAsset[]>([])
  const [editing, setEditing] = useState<Partial<HardwareAsset> | null>(null)

  const refresh = useCallback(() => window.zigzag.inventory.listHardware().then(setRows), [])
  useEffect(() => { refresh() }, [refresh])

  async function save(): Promise<void> {
    if (!editing) return
    await window.zigzag.inventory.upsertHardware(editing)
    setEditing(null)
    refresh()
  }
  async function remove(id: string): Promise<void> {
    if (!confirm('Удалить запись?')) return
    await window.zigzag.inventory.deleteHardware(id)
    refresh()
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
      <table className="data-table">
        <thead>
          <tr><th>Название</th><th>Тип</th><th>Модель</th><th>IP</th><th>ОС</th><th>ОЗУ</th><th>Статус</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td><td>{a.type}</td><td>{a.model}</td><td>{a.ip}</td>
              <td>{a.os}</td><td>{a.ramGb ?? '—'}</td><td>{a.status}</td>
              <td className="row">
                <button onClick={() => setEditing(a)}>✎</button>
                <button className="btn-danger" onClick={() => remove(a.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

function SoftwareTab(): JSX.Element {
  const [rows, setRows] = useState<SoftwareLicense[]>([])
  const [editing, setEditing] = useState<Partial<SoftwareLicense> | null>(null)
  const refresh = useCallback(() => window.zigzag.inventory.listSoftware().then(setRows), [])
  useEffect(() => { refresh() }, [refresh])

  async function save(): Promise<void> {
    if (!editing) return
    await window.zigzag.inventory.upsertSoftware(editing)
    setEditing(null)
    refresh()
  }
  async function remove(id: string): Promise<void> {
    if (!confirm('Удалить лицензию?')) return
    await window.zigzag.inventory.deleteSoftware(id)
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
          <tr><th>Название</th><th>Версия</th><th>Активаций</th><th>Действует до</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className={expiringClass(s.expiryDate)} onClick={() => setEditing(s)}>
              <td>{s.name}</td><td>{s.version}</td>
              <td>{s.seatsUsed ?? 0}/{s.seats ?? '∞'}</td>
              <td>{s.expiryDate || 'бессрочно'}</td>
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

function UpgradeTab(): JSX.Element {
  const [plan, setPlan] = useState<UpgradePlanItem[]>([])
  useEffect(() => { window.zigzag.inventory.upgradePlan().then(setPlan) }, [])
  return (
    <section className="card">
      <h3>Планирование апгрейдов ПК</h3>
      <p className="muted">На основе собранных характеристик (ОЗУ &lt; 8 ГБ, диск &lt; 256 ГБ, устаревшая ОС).</p>
      {plan.length === 0 && <div className="muted">Все устройства соответствуют требованиям.</div>}
      <table className="data-table">
        <tbody>
          {plan.length > 0 && (
            <tr><th>Устройство</th><th>CPU</th><th>ОЗУ</th><th>Диск</th><th>Причина</th><th>Рекомендация</th></tr>
          )}
          {plan.map((p) => (
            <tr key={p.assetId}>
              <td>{p.name}</td><td>{p.cpu || '—'}</td><td>{p.ramGb ?? '—'}</td><td>{p.diskGb ?? '—'}</td>
              <td>{p.reason}</td><td><b>{p.recommendation}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
