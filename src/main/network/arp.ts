import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/** Read the system ARP cache and return an ip -> mac map. */
export async function readArpTable(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const cmd = process.platform === 'win32' ? 'arp -a' : 'arp -a -n'
    const { stdout } = await execAsync(cmd, { timeout: 5000 })
    const macRe = /([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i
    const ipRe = /(\d{1,3}\.){3}\d{1,3}/
    for (const line of stdout.split('\n')) {
      const macMatch = line.match(macRe)
      const ipMatch = line.match(ipRe)
      if (macMatch && ipMatch) {
        map.set(ipMatch[0], normalizeMac(macMatch[0]))
      }
    }
  } catch {
    // ARP not available; return empty map
  }
  return map
}

export function normalizeMac(mac: string): string {
  return mac.replace(/-/g, ':').toLowerCase()
}
