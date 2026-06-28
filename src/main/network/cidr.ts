/** Expand an IPv4 CIDR (e.g. 192.168.1.0/24) into a list of host addresses. */
export function expandCidr(cidr: string, maxHosts = 1024): string[] {
  const [base, prefixStr] = cidr.trim().split('/')
  const prefix = Number(prefixStr ?? '32')
  if (!isValidIp(base) || prefix < 0 || prefix > 32) {
    throw new Error(`Некорректный CIDR: ${cidr}`)
  }
  const baseInt = ipToInt(base)
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (baseInt & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const hosts: string[] = []
  const start = prefix >= 31 ? network : network + 1
  const end = prefix >= 31 ? broadcast : broadcast - 1
  for (let i = start; i <= end && hosts.length < maxHosts; i++) {
    hosts.push(intToIp(i >>> 0))
  }
  return hosts
}

export function isValidIp(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => {
    const n = Number(p)
    return p !== '' && Number.isInteger(n) && n >= 0 && n <= 255
  })
}

export function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => ((acc << 8) + Number(oct)) >>> 0, 0) >>> 0
}

export function intToIp(int: number): string {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.')
}
