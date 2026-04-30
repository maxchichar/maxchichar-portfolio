import { useState, useEffect, useRef } from 'react'

const LINES = [
  '> INITIALIZING MAXCHICHAR.SYSTEM...',
  '> LOADING DESIGN PROTOCOLS...',
  '> CALIBRATING VISUAL ENGINE...',
  '> AUTHENTICATION REQUIRED.',
]

export function Terminal({ onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const audioRef = useRef(null)

  // Blink cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor(p => !p), 530)
    return () => clearInterval(id)
  }, [])

  // Type characters
  useEffect(() => {
    if (lineIndex >= LINES.length) {
      onComplete()
      return
    }
    const line = LINES[lineIndex]
    if (charIndex < line.length) {
      const id = setTimeout(() => {
        setDisplayed(p => p + line[charIndex])
        setCharIndex(p => p + 1)
        // Play beep (with error handling)
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {
            // Audio failed, continue without sound
          })
        }
      }, 35 + Math.random() * 25)
      return () => clearTimeout(id)
    } else {
      const id = setTimeout(() => {
        setDisplayed(p => p + '\n')
        setLineIndex(p => p + 1)
        setCharIndex(0)
      }, 400)
      return () => clearTimeout(id)
    }
  }, [charIndex, lineIndex, onComplete])

  return (
    <div className="fixed inset-0 bg-[#020202] flex items-center justify-center z-50">
      <audio ref={audioRef} src="/audio/terminal-beep.mp3" preload="auto" />
      <div className="font-mono text-sm text-purple-400 max-w-2xl w-full px-8">
        <pre className="whitespace-pre-wrap leading-7">
          {displayed}
          <span className={`inline-block w-2 h-4 bg-purple-400 ml-0.5 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
        </pre>
      </div>
    </div>
  )
}
