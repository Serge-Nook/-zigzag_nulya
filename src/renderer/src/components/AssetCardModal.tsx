import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useInventory } from '../store/useInventory'
import type { ConfigChange, UpgradePlanItem } from '../../../shared/types'
import {
  cardFileName,
  cardToHtml,
  hardwareCard,
  printHtml,
  softwareCard,
  type AssetCardModel
} from '../lib/assetCard'

export default function AssetCardModal(): JSX.Element | null {
  const card = useStore((s) => s.card)
  const closeCard = useStore((s) => s.closeCard)
  const openCard = useStore((s) => s.openCard)
  const requestEdit = useStore((s) => s.requestEdit)
  const showNode = useStore((s) => s.showNode)
  const nodes = useStore((s) => s.project.nodes)
  const hardware = useInventory((s) => s.hardware)
  const software = useInventory((s) => s.software)
  const [history, setHistory] = useState<ConfigChange[]>([])
  const [plan, setPlan] = useState<UpgradePlanItem[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setMsg('')
    if (card?.kind !== 'hardware') return
    window.zigzag.inventory.listConfigHistory(card.id).then(setHistory)
    window.zigzag.inventory.upgradePlan().then(setPlan)
  }, [card])

  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeCard()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, closeCard])

  if (!card) return null

  let model: AssetCardModel | null = null
  let nodeId: string | undefined
  let hostId: string | undefined
  if (card.kind === 'hardware') {
    const a = hardware.find((x) => x.id === card.id)
    if (a) {
      model = hardwareCard(a, {
        nodes,
        software: software.filter((s) => s.assetId === a.id),
        history,
        upgrade: plan.find((p) => p.assetId === a.id)
      })
      nodeId = nodes.find((n) => a.nodeId === n.id || n.assetId === a.id)?.id
    }
  } else {
    const s = software.find((x) => x.id === card.id)
    if (s) {
      const host = hardware.find((h) => h.id === s.assetId)
      model = softwareCard(s, host)
      hostId = host?.id
    }
  }

  async function savePdf(m: AssetCardModel): Promise<void> {
    const res = await window.zigzag.exports.htmlPdf(cardToHtml(m), cardFileName(m))
    if (res.error) setMsg('Ошибка: ' + res.error)
    else if (!res.canceled && res.path) setMsg('Сохранено: ' + res.path)
  }

  return (
    <div className="modal-backdrop" onClick={closeCard}>
      <div className="modal wide asset-card" onClick={(e) => e.stopPropagation()}>
        {!model ? (
          <>
            <h3>Запись не найдена</h3>
            <div className="modal-actions">
              <button onClick={closeCard}>Закрыть</button>
            </div>
          </>
        ) : (
          <>
            <div className="asset-card-head">
              <div>
                <h3>{model.title}</h3>
                <div className="muted">{model.subtitle}</div>
              </div>
            </div>
            <div className="asset-card-body">
              {model.sections.map((sec) => (
                <section key={sec.title}>
                  <h4>{sec.title}</h4>
                  <table className="kv-table">
                    <tbody>
                      {sec.rows.length === 0 && (
                        <tr>
                          <td colSpan={2} className="muted">{sec.empty ?? '—'}</td>
                        </tr>
                      )}
                      {sec.rows.map(([k, v], i) =>
                        k ? (
                          <tr key={i}>
                            <th>{k}</th>
                            <td>{v}</td>
                          </tr>
                        ) : (
                          <tr key={i}>
                            <td colSpan={2} className="pre">{v}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
            {msg && <div className="muted small">{msg}</div>}
            <div className="modal-actions">
              {nodeId && <button onClick={() => showNode(nodeId!)}>Показать на схеме</button>}
              {hostId && (
                <button onClick={() => openCard({ kind: 'hardware', id: hostId! })}>
                  Карточка оборудования
                </button>
              )}
              <button onClick={() => requestEdit(card)}>Редактировать</button>
              <button onClick={() => savePdf(model!)}>Сохранить в PDF</button>
              <button onClick={() => printHtml(cardToHtml(model!))}>Печать</button>
              <button className="btn-primary" onClick={closeCard}>Закрыть</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
