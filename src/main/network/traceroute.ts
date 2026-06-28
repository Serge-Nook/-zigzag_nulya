import { exec } from 'child_process'
import { promisify } from 'util'
import type { TracerouteHop } from '../../shared/types'

const execAsync = promisify(exec)

/** Run a traceroute/tracert to the target and parse hops. */
export async function traceroute(target: string, maxHops = 20): Promise<TracerouteHop[]> {
  const isWin = process.platform === 'win32'
  const cmd = isWin
    ? `tracert -d -h ${maxHops} -w 1500 ${target}`
    : `traceroute -n -m ${maxHops} -w 2 ${target}`
  const { stdout } = await execAsync(cmd, { timeout: 60000 })
  const hops: TracerouteHop[] = []
  const ipRe = /(\d{1,3}\.){3}\d{1,3}/
  const rttRe = /([\d.]+)\s*ms/
  for (const line of stdout.split('\n')) {
    const hopMatch = line.trim().match(/^(\d+)/)
    if (!hopMatch) continue
    const ipMatch = line.match(ipRe)
    const rttMatch = line.match(rttRe)
    hops.push({
      hop: Number(hopMatch[1]),
      ip: ipMatch ? ipMatch[0] : '*',
      rttMs: rttMatch ? Number(rttMatch[1]) : undefined
    })
  }
  return hops
}
