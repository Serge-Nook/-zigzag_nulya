import { useEffect, useState } from 'react'
import { useStore, makeNode } from '../store/useStore'
import { DEVICE_ICONS } from '../lib/deviceIcons'
import type {
  DiscoveredHost,
  LldpNeighbor,
  SnmpVarbind,
  TracerouteHop
} from '../../../shared/types'

export default function DiscoveryPanel(): JSX.Element {
  const addNode = useStore((s) => s.addNode)
  const nodes = useStore((s) => s.project.nodes)
  const setView = useStore((s) => s.setView)

  const [cidr, setCidr] = useState('192.168.1.0/24')
  const [community, setCommunity] = useState('public')
  const [resolve, setResolve] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [hosts, setHosts] = useState<DiscoveredHost[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    window.zigzag.settings.get().then((s) => setCommunity(s.defaultSnmpCommunity))
    const off = window.zigzag.net.onScanProgress((p) => setProgress({ done: p.done, total: p.total }))
    return off
  }, [])

  async function runScan(): Promise<void> {
    setError('')
    setScanning(true)
    setHosts([])
    setProgress({ done: 0, total: 0 })
    try {
      const res = await window.zigzag.net.scan({ cidr, snmpCommunity: community, resolveHostnames: resolve })
      setHosts(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setScanning(false)
    }
  }

  function placeHost(h: DiscoveredHost, index: number): void {
    const cols = 6
    const baseX = 160 + (index % cols) * 140
    const baseY = 140 + Math.floor(index / cols) * 130
    const n = makeNode(h.guessedType, baseX, baseY, {
      label: h.hostname || h.ip,
      ip: h.ip,
      mac: h.mac
    })
    n.ping = { enabled: true, ip: h.ip, intervalMs: 5000 }
    addNode(n)
  }

  function addAll(): void {
    const start = nodes.length
    hosts.forEach((h, i) => {
      if (!nodes.some((n) => n.ip === h.ip)) placeHost(h, start + i)
    })
    setView('topology')
  }

  return (
    <div className="panel discovery">
      <section className="card">
        <h3>Автоматическое сканирование сети</h3>
        <div className="form-row">
          <label>Подсеть (CIDR)
            <input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="192.168.1.0/24" />
          </label>
          <label>SNMP community
            <input value={community} onChange={(e) => setCommunity(e.target.value)} />
          </label>
          <label className="inline">
            <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} />
            DNS-имена
          </label>
          <button className="btn-primary" disabled={scanning} onClick={runScan}>
            {scanning ? 'Сканирование…' : 'Сканировать'}
          </button>
        </div>
        {scanning && progress.total > 0 && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            <span>{progress.done}/{progress.total}</span>
          </div>
        )}
        {error && <div className="error">{error}</div>}

        {hosts.length > 0 && (
          <>
            <div className="row spread">
              <span className="muted">Найдено устройств: {hosts.length}</span>
              <button className="btn-primary" onClick={addAll}>Добавить все на схему</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>IP</th><th>Имя</th><th>MAC</th><th>Тип</th><th>Отклик</th><th></th></tr>
              </thead>
              <tbody>
                {hosts.map((h, i) => (
                  <tr key={h.ip}>
                    <td>{h.ip}</td>
                    <td>{h.hostname ?? '—'}</td>
                    <td>{h.mac ?? '—'}</td>
                    <td>{DEVICE_ICONS[h.guessedType].name}</td>
                    <td>{h.responseTimeMs != null ? `${h.responseTimeMs} мс` : '—'}</td>
                    <td>
                      <button onClick={() => { placeHost(h, nodes.length + i); }}>+ На схему</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <DiagnosticsTools defaultCommunity={community} />
    </div>
  )
}

function DiagnosticsTools({ defaultCommunity }: { defaultCommunity: string }): JSX.Element {
  const [trTarget, setTrTarget] = useState('8.8.8.8')
  const [hops, setHops] = useState<TracerouteHop[]>([])
  const [trBusy, setTrBusy] = useState(false)

  const [snmpHost, setSnmpHost] = useState('192.168.1.1')
  const [oid, setOid] = useState('1.3.6.1.2.1.1')
  const [vbs, setVbs] = useState<SnmpVarbind[]>([])
  const [snmpBusy, setSnmpBusy] = useState(false)

  const [lldpHost, setLldpHost] = useState('192.168.1.1')
  const [neighbors, setNeighbors] = useState<LldpNeighbor[]>([])
  const [lldpBusy, setLldpBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function runTrace(): Promise<void> {
    setTrBusy(true); setHops([]); setMsg('')
    try { setHops(await window.zigzag.net.traceroute(trTarget)) }
    catch (e) { setMsg('Traceroute: ' + (e as Error).message) }
    finally { setTrBusy(false) }
  }
  async function runWalk(): Promise<void> {
    setSnmpBusy(true); setVbs([]); setMsg('')
    try { setVbs(await window.zigzag.net.snmpWalk(snmpHost, oid, defaultCommunity)) }
    catch (e) { setMsg('SNMP: ' + (e as Error).message) }
    finally { setSnmpBusy(false) }
  }
  async function runLldp(): Promise<void> {
    setLldpBusy(true); setNeighbors([]); setMsg('')
    try { setNeighbors(await window.zigzag.net.lldp(lldpHost, defaultCommunity)) }
    catch (e) { setMsg('LLDP: ' + (e as Error).message) }
    finally { setLldpBusy(false) }
  }

  return (
    <section className="card">
      <h3>Диагностика и опрос (Traceroute / SNMP / LLDP)</h3>
      {msg && <div className="error">{msg}</div>}
      <div className="diag-grid">
        <div>
          <div className="form-row">
            <label>Traceroute до
              <input value={trTarget} onChange={(e) => setTrTarget(e.target.value)} />
            </label>
            <button disabled={trBusy} onClick={runTrace}>{trBusy ? '…' : 'Трассировка'}</button>
          </div>
          <ul className="result-list">
            {hops.map((h) => (
              <li key={h.hop}>{h.hop}. {h.ip} {h.rttMs != null ? `(${h.rttMs} мс)` : ''}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="form-row">
            <label>SNMP walk хост
              <input value={snmpHost} onChange={(e) => setSnmpHost(e.target.value)} />
            </label>
            <label>OID
              <input value={oid} onChange={(e) => setOid(e.target.value)} />
            </label>
            <button disabled={snmpBusy} onClick={runWalk}>{snmpBusy ? '…' : 'Walk'}</button>
          </div>
          <ul className="result-list">
            {vbs.map((v) => (
              <li key={v.oid}><code>{v.oid}</code> = {v.value}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="form-row">
            <label>LLDP соседи хоста
              <input value={lldpHost} onChange={(e) => setLldpHost(e.target.value)} />
            </label>
            <button disabled={lldpBusy} onClick={runLldp}>{lldpBusy ? '…' : 'Опросить'}</button>
          </div>
          <ul className="result-list">
            {neighbors.map((n, i) => (
              <li key={i}>{n.remoteSysName} ← порт {n.localPort} ({n.remotePortId})</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
