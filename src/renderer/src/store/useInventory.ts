import { create } from 'zustand'
import type { HardwareAsset, SoftwareLicense, TopologyNode } from '../../../shared/types'

interface InventoryState {
  hardware: HardwareAsset[]
  software: SoftwareLicense[]
  refresh: () => Promise<void>
}

export const useInventory = create<InventoryState>((set) => ({
  hardware: [],
  software: [],
  refresh: async () => {
    const [hardware, software] = await Promise.all([
      window.zigzag.inventory.listHardware(),
      window.zigzag.inventory.listSoftware()
    ])
    set({ hardware, software })
  }
}))

/** Hardware assets bound to a topology node (via asset.nodeId or node.assetId). */
export function assetsForNode(hardware: HardwareAsset[], node: TopologyNode): HardwareAsset[] {
  return hardware.filter((a) => a.nodeId === node.id || a.id === node.assetId)
}
