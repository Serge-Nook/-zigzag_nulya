import { networkInterfaces } from 'os'
import type { LocalNetwork } from '../../shared/types'
import { intToIp, ipToInt } from './cidr'

const VIRTUAL_IFACE = /^(docker|br-|veth|virbr|vmnet|vboxnet|vethernet|tun|tap|wg|zt|tailscale|lo)/i
const MIN_SCAN_PREFIX = 24

function score(iface: string, address: string): number {
  let s = 0
  if (VIRTUAL_IFACE.test(iface) || /virtual|vmware|virtualbox|hyper-v|wsl/i.test(iface)) s -= 100
  if (address.startsWith('192.168.')) s += 30
  else if (address.startsWith('10.')) s += 20
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) s += 10
  return s
}

/** IPv4 networks the computer is attached to, most likely LAN first. */
export function localNetworks(): LocalNetwork[] {
  const out: (LocalNetwork & { score: number })[] = []
  for (const [iface, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue
      const prefix = Number(a.cidr?.split('/')[1] ?? maskToPrefix(a.netmask))
      const scanPrefix = Math.max(prefix, MIN_SCAN_PREFIX)
      const mask = scanPrefix === 0 ? 0 : (0xffffffff << (32 - scanPrefix)) >>> 0
      const network = (ipToInt(a.address) & mask) >>> 0
      out.push({
        iface,
        address: a.address,
        cidr: `${intToIp(network)}/${scanPrefix}`,
        prefix,
        score: score(iface, a.address)
      })
    }
  }
  out.sort((x, y) => y.score - x.score)
  return out.map(({ score: _s, ...n }) => n)
}

function maskToPrefix(mask: string): number {
  return ipToInt(mask).toString(2).replace(/0/g, '').length
}
