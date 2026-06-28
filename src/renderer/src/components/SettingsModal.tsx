import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/types'
import { loadAlarmSound, startAlarm, stopAlarm } from '../lib/alarm'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.zigzag.settings.get().then(setSettings)
  }, [])

  async function pickAlarm(): Promise<void> {
    const res = await window.zigzag.settings.pickAlarm()
    if (!res.canceled && res.path) {
      setSettings((s) => (s ? { ...s, alarmSoundPath: res.path! } : s))
      await loadAlarmSound()
    }
  }

  async function update(patch: Partial<AppSettings>): Promise<void> {
    const next = await window.zigzag.settings.set(patch)
    setSettings(next)
  }

  async function testAlarm(): Promise<void> {
    await loadAlarmSound()
    startAlarm()
    setTimeout(stopAlarm, 2500)
  }

  if (!settings) return <div className="modal-backdrop" />

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Настройки</h3>

        <label>Звук тревоги (MP3/WAV/OGG)
          <div className="row">
            <input readOnly value={settings.alarmSoundPath ?? 'Стандартный сигнал'} />
            <button onClick={pickAlarm}>Выбрать…</button>
          </div>
        </label>
        <div className="row">
          <button onClick={testAlarm}>▶ Проверить звук</button>
          {settings.alarmSoundPath && (
            <button className="btn-link" onClick={() => update({ alarmSoundPath: null })}>
              Сбросить
            </button>
          )}
        </div>

        <label>SNMP community по умолчанию
          <input
            value={settings.defaultSnmpCommunity}
            onChange={(e) => update({ defaultSnmpCommunity: e.target.value })}
          />
        </label>

        <label>Интервал пинга по умолчанию (мс)
          <input
            type="number"
            min={1000}
            step={500}
            value={settings.defaultPingIntervalMs}
            onChange={(e) => update({ defaultPingIntervalMs: Number(e.target.value) })}
          />
        </label>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  )
}
