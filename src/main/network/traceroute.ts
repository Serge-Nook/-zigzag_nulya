import { execFile } from 'child_process'
import type { TracerouteHop } from '../../shared/types'
import { pingHost } from './ping'

const IP_RE = /(\d{1,3}\.){3}\d{1,3}/
const RTT_RE = /([\d.]+)\s*ms/

interface RunResult {
  stdout: string
  missing: boolean
}

function run(cmd: string, args: string[], timeout: number): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout) => {
      const code = (err as NodeJS.ErrnoException | null)?.code
      resolve({ stdout: String(stdout ?? ''), missing: code === 'ENOENT' })
    })
  })
}

/** Parse traceroute / tracert output into hops (one entry per hop number). */
function parseHops(stdout: string): TracerouteHop[] {
  const byHop = new Map<number, TracerouteHop>()
  for (const line of stdout.split('\n')) {
    const hopMatch = line.trim().match(/^(\d+)/)
    if (!hopMatch) continue
    const hop = Number(hopMatch[1])
    const ipMatch = line.match(IP_RE)
    const rttMatch = line.match(RTT_RE)
    const prev = byHop.get(hop)
    if (prev && prev.ip !== '*') continue
    byHop.set(hop, {
      hop,
      ip: ipMatch ? ipMatch[0] : '*',
      rttMs: rttMatch ? Number(rttMatch[1]) : undefined
    })
  }
  return [...byHop.values()].sort((a, b) => a.hop - b.hop)
}

/** Fallback when traceroute is not installed (e.g. SteamOS): parallel pings with TTL 1..maxHops. */
async function pingTrace(target: string, maxHops: number): Promise<TracerouteHop[]> {
  const probes = Array.from({ length: maxHops }, async (_, i) => {
    const ttl = i + 1
    const { stdout, missing } = await run('ping', ['-n', '-c', '1', '-W', '2', '-t', String(ttl), target], 5000)
    if (missing) throw new Error('Не найдены утилиты traceroute и ping')
    const reply = stdout.match(/bytes from[^\d]*((\d{1,3}\.){3}\d{1,3})/)
    const from = stdout.match(/From[^\d]*((\d{1,3}\.){3}\d{1,3})/)
    const rtt = stdout.match(/time[=<]([\d.]+)\s*ms/)
    const hop: TracerouteHop = {
      hop: ttl,
      ip: reply?.[1] ?? from?.[1] ?? '*',
      rttMs: reply && rtt ? Number(rtt[1]) : undefined
    }
    return { hop, reached: Boolean(reply) }
  })
  const results = await Promise.all(probes)
  const end = results.findIndex((r) => r.reached)
  const hops = results.slice(0, end < 0 ? results.length : end + 1).map((r) => r.hop)
  // TTL-exceeded replies carry no timing; measure RTT to each router directly.
  await Promise.all(
    hops
      .filter((h) => h.ip !== '*' && h.rttMs === undefined)
      .map(async (h) => {
        h.rttMs = (await pingHost(h.ip, 1)).timeMs
      })
  )
  return hops
}

/** Trace the route to the target using whatever the OS provides. */
export async function traceroute(target: string, maxHops = 20): Promise<TracerouteHop[]> {
  target = target.trim()
  if (!/^[A-Za-z0-9.\-:]+$/.test(target)) throw new Error(`Некорректный адрес: ${target}`)
  if (process.platform === 'win32') {
    const r = await run('tracert', ['-d', '-h', String(maxHops), '-w', '1500', target], 90000)
    return parseHops(r.stdout)
  }
  const tr = await run('traceroute', ['-n', '-m', String(maxHops), '-w', '2', target], 90000)
  if (!tr.missing) return parseHops(tr.stdout)
  return pingTrace(target, maxHops)
}
