import ping from 'ping'
import type { PingResult } from '../../shared/types'

/** Ping a single host using the system ping (no raw sockets / root required). */
export async function pingHost(ip: string, timeoutSec = 2): Promise<PingResult> {
  try {
    const res = await ping.promise.probe(ip, {
      timeout: timeoutSec,
      extra: process.platform === 'win32' ? ['-n', '1'] : ['-c', '1', '-W', String(timeoutSec)]
    })
    return {
      ip,
      alive: res.alive,
      timeMs: res.time === 'unknown' ? undefined : Number(res.time)
    }
  } catch {
    return { ip, alive: false }
  }
}

/** Ping many hosts with bounded concurrency. */
export async function pingSweep(
  ips: string[],
  concurrency = 32,
  onResult?: (r: PingResult) => void
): Promise<PingResult[]> {
  const results: PingResult[] = []
  let idx = 0
  const workers = new Array(Math.min(concurrency, ips.length)).fill(0).map(async () => {
    while (idx < ips.length) {
      const i = idx++
      const r = await pingHost(ips[i])
      results.push(r)
      onResult?.(r)
    }
  })
  await Promise.all(workers)
  return results
}
