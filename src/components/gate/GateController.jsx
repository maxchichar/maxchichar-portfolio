import { useState, useEffect, useRef } from 'react'
import { Terminal } from './Terminal'
import { HashLoader } from './HashLoader'
import { PalaceDoor } from './PalaceDoor'
import { LanguageSelect } from './LanguageSelect'
import { useAudio } from '../../hooks/useAudio'
import { LANG_MAP } from '../../lib/ttsVoices'

const STATES = {
  BOOT: 'BOOT',
  TERMINAL_TYPING: 'TERMINAL_TYPING',
  LOADING_BAR: 'LOADING_BAR',
  DOOR_LOCKED: 'DOOR_LOCKED',
  LANGUAGE_SELECT: 'LANGUAGE_SELECT',
  DOOR_OPENING: 'DOOR_OPENING',
  THRONE_REVEAL: 'THRONE_REVEAL',
  PORTFOLIO: 'PORTFOLIO',
}

export function GateController({ onComplete }) {
  const [state, setState] = useState(STATES.BOOT)
  const [selectedLang, setSelectedLang] = useState('EN')
  const { muted, blocked, setBlocked, register, play, toggleMute } = useAudio()
  const audioInitialized = useRef(false)

  // Start terminal typing on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(STATES.TERMINAL_TYPING)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioInitialized.current) {
        audioInitialized.current = true
        register('terminal-beep', '/audio/terminal-beep.mp3')
        register('tick', '/audio/tick.mp3')
        register('orchestral-swell', '/audio/orchestral-swell.mp3', { volume: 0.8 })
        register('ambient-beat', '/audio/ambient-beat.mp3', { volume: 0.2, loop: true })

        // Start ambient beat
        play('ambient-beat')

        // Check if audio was blocked
        const testAudio = new Audio()
        testAudio.play().then(() => {
          testAudio.pause()
          setBlocked(false)
        }).catch(() => {
          setBlocked(true)
        })
      }
    }

    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [register, play, setBlocked])

  // State machine transitions
  const handleTerminalComplete = () => {
    setState(STATES.LOADING_BAR)
  }

  const handleLoadingComplete = () => {
    setState(STATES.DOOR_LOCKED)
    setTimeout(() => setState(STATES.LANGUAGE_SELECT), 500)
  }

  const handleLanguageSelect = (lang) => {
    setSelectedLang(lang)
    setState(STATES.DOOR_OPENING)
    play('orchestral-swell')
  }

  const handleDoorOpenComplete = () => {
    setState(STATES.THRONE_REVEAL)

    // Speak greeting in selected language
    const utter = new SpeechSynthesisUtterance(LANG_MAP[selectedLang].greeting)
    utter.lang = LANG_MAP[selectedLang].locale
    utter.rate = 0.95
    utter.pitch = 0.9
    window.speechSynthesis.speak(utter)

    // Transition to portfolio after TTS
    setTimeout(() => {
      setState(STATES.PORTFOLIO)
      onComplete?.()
    }, 3000)
  }

  return (
    <>
      {/* Audio blocked badge */}
      {blocked && (
        <div className="fixed top-4 left-4 z-[10000] bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 font-mono text-xs">
          AUDIO BLOCKED — CLICK ANYWHERE
        </div>
      )}

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-[10000] text-white/50 hover:text-white transition-colors"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* State-based rendering */}
      {state === STATES.TERMINAL_TYPING && (
        <Terminal onComplete={handleTerminalComplete} />
      )}

      {state === STATES.LOADING_BAR && (
        <HashLoader onComplete={handleLoadingComplete} />
      )}

      {state === STATES.DOOR_LOCKED && (
        <PalaceDoor isOpen={false} />
      )}

      {state === STATES.LANGUAGE_SELECT && (
        <>
          <PalaceDoor isOpen={false} />
          <LanguageSelect onSelect={handleLanguageSelect} />
        </>
      )}

      {state === STATES.DOOR_OPENING && (
        <PalaceDoor isOpen={true} onOpenComplete={handleDoorOpenComplete} />
      )}

      {state === STATES.THRONE_REVEAL && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#020202]/50">
          <div className="text-center">
            <h1 className="text-white text-6xl font-display mb-4">
              MAXCHICHAR
            </h1>
            <p className="text-zinc text-lg">
              {LANG_MAP[selectedLang].greeting}
            </p>
          </div>
        </div>
      )}

      {/* PORTFOLIO state is handled by parent - gate fades out */}
    </>
  )
}
