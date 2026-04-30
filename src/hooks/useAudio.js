import { useRef, useState, useCallback } from 'react'
import { Howl } from 'howler'

export function useAudio() {
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const sounds = useRef({})

  const register = useCallback((id, src, opts = {}) => {
    try {
      sounds.current[id] = new Howl({
        src: [src],
        volume: opts.volume ?? 1,
        loop: opts.loop ?? false,
        onloaderror: () => {
          console.warn(`Failed to load audio: ${src}`)
        },
      })
    } catch (error) {
      console.warn(`Failed to register audio: ${src}`, error)
    }
  }, [])

  const play = useCallback((id) => {
    if (muted) return
    try {
      sounds.current[id]?.play()
    } catch (error) {
      console.warn(`Failed to play audio: ${id}`, error)
    }
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      Howler.mute(!m)
      return !m
    })
  }, [])

  return { muted, blocked, setBlocked, register, play, toggleMute }
}
