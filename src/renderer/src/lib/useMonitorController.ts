import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useMonitor } from '../store/useMonitor'
import { loadAlarmSound, startAlarm, stopAlarm } from './alarm'

/** Drives ICMP ping polling for every node whose ping widget is enabled. */
export function useMonitorController(): void {
  const nodes = useStore((s) => s.project.nodes)
  const setStatus = useMonitor((s) => s.setStatus)
  const clearStatus = useMonitor((s) => s.clearStatus)

  // Re-evaluate timers whenever the ping configuration of any node changes.
  const signature = nodes
    .filter((n) => n.ping.enabled && n.ping.ip)
    .map((n) => `${n.id}:${n.ping.ip}:${n.ping.intervalMs}`)
    .join('|')

  useEffect(() => {
    loadAlarmSound()
  }, [])

  useEffect(() => {
    const monitored = useStore
      .getState()
      .project.nodes.filter((n) => n.ping.enabled && n.ping.ip)
    const monitoredIds = new Set(monitored.map((n) => n.id))

    // Drop statuses for nodes no longer monitored.
    for (const id of Object.keys(useMonitor.getState().statuses)) {
      if (!monitoredIds.has(id)) clearStatus(id)
    }

    const timers: number[] = []
    for (const node of monitored) {
      const run = async (): Promise<void> => {
        try {
          const res = await window.zigzag.net.ping(node.ping.ip)
          setStatus(node.id, {
            state: res.alive ? 'up' : 'down',
            lastMs: res.timeMs,
            ts: Date.now()
          })
        } catch {
          setStatus(node.id, { state: 'down', ts: Date.now() })
        }
      }
      run()
      timers.push(window.setInterval(run, Math.max(1000, node.ping.intervalMs)))
    }
    return () => timers.forEach((t) => window.clearInterval(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // Alarm orchestration.
  const statuses = useMonitor((s) => s.statuses)
  const muted = useMonitor((s) => s.muted)
  const setAlarmActive = useMonitor((s) => s.setAlarmActive)

  useEffect(() => {
    const anyDown = Object.values(statuses).some((s) => s.state === 'down')
    setAlarmActive(anyDown)
    if (anyDown && !muted) startAlarm()
    else stopAlarm()
  }, [statuses, muted, setAlarmActive])
}
