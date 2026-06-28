import snmp from 'net-snmp'
import type { SnmpVarbind, LldpNeighbor } from '../../shared/types'

const COMMON_OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysObjectID: '1.3.6.1.2.1.1.2.0',
  sysServices: '1.3.6.1.2.1.1.7.0'
}

// LLDP-MIB remote table OIDs
const LLDP = {
  remSysName: '1.0.8802.1.1.2.1.4.1.1.9',
  remPortId: '1.0.8802.1.1.2.1.4.1.1.7',
  remChassisId: '1.0.8802.1.1.2.1.4.1.1.5'
}

function createSession(host: string, community: string, version: '1' | '2c', port: number) {
  return snmp.createSession(host, community, {
    port,
    version: version === '1' ? snmp.Version1 : snmp.Version2c,
    timeout: 3000,
    retries: 1
  })
}

function varbindValue(vb: { type: number; value: unknown }): string {
  if (vb.value instanceof Buffer) return vb.value.toString('utf8')
  return String(vb.value)
}

function typeName(type: number): string {
  const found = Object.entries(snmp.ObjectType).find(([, v]) => v === type)
  return found ? found[0] : String(type)
}

export function snmpGet(
  host: string,
  oids: string[],
  community = 'public',
  version: '1' | '2c' = '2c',
  port = 161
): Promise<SnmpVarbind[]> {
  return new Promise((resolve, reject) => {
    const session = createSession(host, community, version, port)
    session.get(oids, (error, varbinds) => {
      session.close()
      if (error) return reject(error)
      const out: SnmpVarbind[] = varbinds.map((vb) =>
        snmp.isVarbindError(vb)
          ? { oid: vb.oid, type: 'error', value: snmp.varbindError(vb) }
          : { oid: vb.oid, type: typeName(vb.type), value: varbindValue(vb) }
      )
      resolve(out)
    })
  })
}

export function snmpWalk(
  host: string,
  baseOid: string,
  community = 'public',
  version: '1' | '2c' = '2c',
  port = 161,
  maxRows = 500
): Promise<SnmpVarbind[]> {
  return new Promise((resolve, reject) => {
    const session = createSession(host, community, version, port)
    const out: SnmpVarbind[] = []
    session.subtree(
      baseOid,
      (varbinds) => {
        for (const vb of varbinds) {
          if (!snmp.isVarbindError(vb)) {
            out.push({ oid: vb.oid, type: typeName(vb.type), value: varbindValue(vb) })
          }
          if (out.length >= maxRows) break
        }
      },
      (error) => {
        session.close()
        if (error) return reject(error)
        resolve(out)
      }
    )
  })
}

export async function snmpSystemInfo(
  host: string,
  community = 'public',
  version: '1' | '2c' = '2c',
  port = 161
): Promise<{ sysName?: string; sysDescr?: string; sysServices?: number }> {
  const vbs = await snmpGet(
    host,
    [COMMON_OIDS.sysName, COMMON_OIDS.sysDescr, COMMON_OIDS.sysServices],
    community,
    version,
    port
  )
  const byOid = (oid: string) => vbs.find((v) => v.oid === oid && v.type !== 'error')?.value
  const services = byOid(COMMON_OIDS.sysServices)
  return {
    sysName: byOid(COMMON_OIDS.sysName),
    sysDescr: byOid(COMMON_OIDS.sysDescr),
    sysServices: services ? Number(services) : undefined
  }
}

export async function lldpNeighbors(
  host: string,
  community = 'public',
  version: '1' | '2c' = '2c',
  port = 161
): Promise<LldpNeighbor[]> {
  const [names, ports, chassis] = await Promise.all([
    snmpWalk(host, LLDP.remSysName, community, version, port).catch(() => []),
    snmpWalk(host, LLDP.remPortId, community, version, port).catch(() => []),
    snmpWalk(host, LLDP.remChassisId, community, version, port).catch(() => [])
  ])
  const index = (oid: string): string => oid.split('.').slice(-3).join('.')
  const byIndex = new Map<string, LldpNeighbor>()
  for (const n of names) {
    byIndex.set(index(n.oid), {
      localPort: index(n.oid).split('.')[1] ?? '',
      remoteSysName: n.value,
      remotePortId: '',
      remoteChassisId: ''
    })
  }
  for (const p of ports) {
    const e = byIndex.get(index(p.oid))
    if (e) e.remotePortId = p.value
  }
  for (const c of chassis) {
    const e = byIndex.get(index(c.oid))
    if (e) e.remoteChassisId = c.value
  }
  return [...byIndex.values()]
}
