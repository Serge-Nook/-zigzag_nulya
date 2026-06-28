import { useEffect, useState } from 'react'
import type { SnmpTrap } from '../../../shared/types'

export default function TrapsPanel(): JSX.Element {
  const [port, setPort] = useState(162)
  const [running, setRunning] = useState(false)
  const [traps, setTraps] = useState<SnmpTrap[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const off = window.zigzag.traps.onTrap((t) => setTraps((prev) => [t, ...prev].slice(0, 200)))
    return off
  }, [])

  async function start(): Promise<void> {
    setError('')
    try {
      await window.zigzag.traps.start(port)
      setRunning(true)
    } catch (e) {
      setError(
        'Не удалось запустить приёмник на порту ' +
          port +
          '. Порты <1024 могут требовать прав администратора. ' +
          (e as Error).message
      )
    }
  }

  async function stop(): Promise<void> {
    await window.zigzag.traps.stop()
    setRunning(false)
  }

  return (
    <div className="panel">
      <section className="card">
        <h3>Приём SNMP-trap (асинхронные аварии оборудования)</h3>
        <div className="form-row">
          <label>UDP-порт
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} disabled={running} />
          </label>
          {!running ? (
            <button className="btn-primary" onClick={start}>Запустить приёмник</button>
          ) : (
            <button className="btn-danger" onClick={stop}>Остановить</button>
          )}
          <span className={running ? 'badge on' : 'badge'}>{running ? 'Слушает' : 'Остановлен'}</span>
        </div>
        {error && <div className="error">{error}</div>}
        <p className="muted">
          Подсказка: для теста можно отправить trap утилитой <code>snmptrap -v2c -c public 127.0.0.1:{port} &apos;&apos; 1.3.6.1.4.1.8072.2.3.0.1</code>
        </p>
      </section>

      <section className="card">
        <h3>Полученные события ({traps.length})</h3>
        {traps.length === 0 && <div className="muted">Событий пока нет.</div>}
        <ul className="trap-list">
          {traps.map((t) => (
            <li key={t.id}>
              <div className="trap-head">
                <span className="badge on">{t.source}</span>
                <span className="muted">{new Date(t.receivedAt).toLocaleString()}</span>
              </div>
              <ul>
                {t.varbinds.map((v, i) => (
                  <li key={i}><code>{v.oid}</code> = {v.value}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
