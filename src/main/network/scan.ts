import { promises as dns } from 'dns'
import type { DeviceType, DiscoveredHost, ScanOptions } from '../../shared/types'
import { expandCidr } from './cidr'
import { pingSweep } from './ping'
import { readArpTable } from './arp'
import { snmpSystemInfo } from './snmp'

/** Guess a device type from SNMP sysServices bitmask and sysDescr text. */
export function guessType(sysServices?: number, sysDescr?: string): DeviceType {
  const d = (sysDescr ?? '').toLowerCase()
  if (/firewall|fortigate|palo alto|asa|pfsense/.test(d)) return 'firewall'
  if (/router|routeros|ios|cisco ios|mikrotik|gateway/.test(d)) return 'router'
  if (/switch|catalyst|procurve|switching/.test(d)) return 'switch'
  if (/access point|wireless|wlan|aironet|unifi/.test(d)) return 'accessPoint'
  if (/printer|jetdirect|laserjet|kyocera|xerox/.test(d)) return 'printer'
  if (/windows server|linux|ubuntu|centos|server/.test(d)) return 'server'
  if (/camera|ipcam|hikvision|dahua|axis|ip cam/.test(d)) return 'camera'
  if (/nas|synology|qnap|truenas|freenas/.test(d)) return 'nas'
  if (/storage|raid|san\b/.test(d)) return 'storage'
  if (typeof sysServices === 'number') {
    // bit 0x04 = internet (L3 routing), 0x02 = datalink (L2 switching)
    if (sysServices & 0x04) return 'router'
    if (sysServices & 0x02) return 'switch'
  }
  return 'pc'
}

export async function scanNetwork(
  opts: ScanOptions,
  onProgress?: (done: number, total: number, host?: DiscoveredHost) => void
): Promise<DiscoveredHost[]> {
  const ips = expandCidr(opts.cidr)
  const total = ips.length
  let done = 0
  const pingResults = await pingSweep(ips, 48, () => {
    done++
    onProgress?.(done, total)
  })
  const alive = pingResults.filter((r) => r.alive)
  const arp = await readArpTable()
  const hosts: DiscoveredHost[] = []
  for (const r of alive) {
    const host: DiscoveredHost = {
      ip: r.ip,
      alive: true,
      mac: arp.get(r.ip),
      responseTimeMs: r.timeMs,
      guessedType: 'pc'
    }
    if (opts.resolveHostnames) {
      try {
        const names = await dns.reverse(r.ip)
        host.hostname = names[0]
      } catch {
        // no PTR record
      }
    }
    if (opts.snmpCommunity) {
      try {
        const info = await snmpSystemInfo(r.ip, opts.snmpCommunity)
        host.guessedType = guessType(info.sysServices, info.sysDescr)
        if (info.sysName && !host.hostname) host.hostname = info.sysName
      } catch {
        // device not SNMP-capable
      }
    }
    hosts.push(host)
    onProgress?.(done, total, host)
  }
  return hosts
}
