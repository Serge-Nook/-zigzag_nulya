import { useEffect, useState } from 'react'
import { useStore, makeNode } from '../store/useStore'
import { DEVICE_ICONS } from '../lib/deviceIcons'
import type { DiscoveredHost, LocalNetwork, TracerouteHop } from '../../../shared/types'

export default function DiscoveryPanel(): JSX.Element {
  const addNode = useStore((s) => s.addNode)
  const nodes = useStore((s) => s.project.nodes)
  const setView = useStore((s) => s.setView)

  const [cidr, setCidr] = useState('192.168.1.0/24')
  const [community, setCommunity] = useState('')
  const [resolve, setResolve] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [hosts, setHosts] = useState<DiscoveredHost[]>([])
  const [error, setError] = useState('')
  const [myNets, setMyNets] = useState<LocalNetwork[]>([])
  const [netNote, setNetNote] = useState('')

  useEffect(() => {
    const off = window.zigzag.net.onScanProgress((p) => setProgress({ done: p.done, total: p.total }))
    return off
  }, [])

  function applyNet(n: LocalNetwork): void {
    setCidr(n.cidr)
    setNetNote(
      `${n.iface}: ${n.address}/${n.prefix}` +
        (n.prefix < 24 ? ` — подсеть велика, сканируется /24 вокруг адреса компьютера` : '')
    )
  }

  async function detectMyNetwork(): Promise<void> {
    setError('')
    const nets = await window.zigzag.net.localNetworks()
    setMyNets(nets)
    if (nets.length === 0) {
      setNetNote('')
      setError('Не найдено активных сетевых подключений IPv4')
      return
    }
    applyNet(nets[0])
  }

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
            <input value={cidr} onChange={(e) => { setCidr(e.target.value); setNetNote('') }} placeholder="192.168.1.0/24" />
          </label>
          <button disabled={scanning} onClick={detectMyNetwork} title="Подставить подсеть, в которой находится этот компьютер">
            Моя сеть
          </button>
          {myNets.length > 1 && (
            <label>Интерфейс
              <select
                value={myNets.findIndex((n) => n.cidr === cidr)}
                onChange={(e) => applyNet(myNets[Number(e.target.value)])}
              >
                {myNets.findIndex((n) => n.cidr === cidr) < 0 && <option value={-1}>—</option>}
                {myNets.map((n, i) => (
                  <option key={`${n.iface}-${n.address}`} value={i}>{n.iface} — {n.cidr}</option>
                ))}
              </select>
            </label>
          )}
          <label>SNMP community
            <input value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="не опрашивать" />
          </label>
          <label className="inline">
            <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} />
            DNS-имена
          </label>
          <button className="btn-primary" disabled={scanning} onClick={runScan}>
            {scanning ? 'Сканирование…' : 'Сканировать'}
          </button>
        </div>
        {netNote && <div className="muted">Моя сеть: {netNote}</div>}
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

      <DiagnosticsTools />
    </div>
  )
}

function DiagnosticsTools(): JSX.Element {
  const [trTarget, setTrTarget] = useState('8.8.8.8')
  const [hops, setHops] = useState<TracerouteHop[]>([])
  const [trBusy, setTrBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function runTrace(): Promise<void> {
    setTrBusy(true); setHops([]); setMsg('')
    try {
      const res = await window.zigzag.net.traceroute(trTarget)
      setHops(res)
      if (res.length === 0) setMsg('Traceroute: нет ответа')
    }
    catch (e) { setMsg('Traceroute: ' + (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')) }
    finally { setTrBusy(false) }
  }

  return (
    <section className="card">
      <h3>Диагностика (Traceroute)</h3>
      {msg && <div className="error">{msg}</div>}
      <div className="form-row">
        <label>Traceroute до
          <input value={trTarget} onChange={(e) => setTrTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !trBusy && runTrace()} />
        </label>
        <button disabled={trBusy} onClick={runTrace}>{trBusy ? 'Трассировка…' : 'Трассировка'}</button>
      </div>
      <ul className="result-list">
        {hops.map((h) => (
          <li key={h.hop}>{h.hop}. {h.ip} {h.rttMs != null ? `(${h.rttMs} мс)` : ''}</li>
        ))}
      </ul>
    </section>
  )
}
