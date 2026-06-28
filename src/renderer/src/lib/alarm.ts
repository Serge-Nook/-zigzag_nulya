// Audible alarm playback. Uses a user-provided MP3/WAV/OGG when configured,
// otherwise falls back to a synthesized beep via the WebAudio API.

let audioEl: HTMLAudioElement | null = null
let alarmDataUrl: string | null = null
let ctx: AudioContext | null = null
let beepTimer: number | null = null

export async function loadAlarmSound(): Promise<void> {
  try {
    alarmDataUrl = await window.zigzag.settings.readAlarmData()
  } catch {
    alarmDataUrl = null
  }
}

export function startAlarm(): void {
  if (alarmDataUrl) {
    if (!audioEl) {
      audioEl = new Audio(alarmDataUrl)
      audioEl.loop = true
    } else if (audioEl.src !== alarmDataUrl) {
      audioEl.src = alarmDataUrl
    }
    audioEl.play().catch(() => startBeep())
  } else {
    startBeep()
  }
}

export function stopAlarm(): void {
  if (audioEl) {
    audioEl.pause()
    audioEl.currentTime = 0
  }
  stopBeep()
}

function startBeep(): void {
  if (beepTimer !== null) return
  if (!ctx) ctx = new AudioContext()
  const playTone = (): void => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.value = 0.04
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
  }
  playTone()
  beepTimer = window.setInterval(playTone, 800)
}

function stopBeep(): void {
  if (beepTimer !== null) {
    window.clearInterval(beepTimer)
    beepTimer = null
  }
}
