import snmp from 'net-snmp'
import { randomUUID } from 'crypto'
import type { SnmpTrap, SnmpVarbind } from '../../shared/types'

type TrapHandler = (trap: SnmpTrap) => void

let receiver: ReturnType<typeof snmp.createReceiver> | null = null

export function startTrapReceiver(port: number, onTrap: TrapHandler): { port: number } {
  if (receiver) stopTrapReceiver()
  receiver = snmp.createReceiver({ port, disableAuthorization: true }, (error, notification) => {
    if (error) {
      console.error('SNMP trap receiver error:', error)
      return
    }
    const pdu = notification?.pdu
    const rinfo = notification?.rinfo
    if (!pdu) return
    const varbinds: SnmpVarbind[] = (pdu.varbinds ?? []).map(
      (vb: { oid: string; type: number; value: unknown }) => ({
        oid: vb.oid,
        type: String(vb.type),
        value: vb.value instanceof Buffer ? vb.value.toString('utf8') : String(vb.value)
      })
    )
    onTrap({
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      source: rinfo?.address ?? 'unknown',
      varbinds
    })
  })
  // Accept community "public" by default.
  const authorizer = receiver.getAuthorizer()
  authorizer.addCommunity('public')
  return { port }
}

export function stopTrapReceiver(): void {
  if (receiver) {
    try {
      receiver.close()
    } catch {
      // ignore
    }
    receiver = null
  }
}

export function isTrapReceiverRunning(): boolean {
  return receiver !== null
}
