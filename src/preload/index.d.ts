import { ElectronAPI } from '@electron-toolkit/preload'
import type { ZigzagApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    zigzag: ZigzagApi
  }
}
