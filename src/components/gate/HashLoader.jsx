import { useState, useEffect } from 'react'

const HASH_CHARS = '0123456789ABCDEF#@$%&!█▓▒░'

export function HashLoader({ onComplete }) {
  const [percent, setPercent] = useState(0)
  const [bar, setBar] = useState('')

  useEffect(() => {
    const id = setInterval(() => {
      setPercent(p => {
        if (p >= 100) { clearInterval(id); setTimeout(onComplete, 500); return 100 }
        return p + 1
      })
    }, 30)
    return () => clearInterval(id)
  }, [onComplete])

  useEffect(() => {
    const filled = Math.floor(percent / 2)
    let result = ''
    for (let i = 0; i < 50; i++) {
      if (i < filled) result += '█'
      else result += HASH_CHARS[Math.floor(Math.random() * HASH_CHARS.length)]
    }
    setBar(result)
  }, [percent])

  return (
    <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center z-50 gap-4">
      <div className="font-mono text-purple-400 text-xs tracking-widest">
        LOADING ARCHIVE
      </div>
      <div className="font-mono text-purple-300 text-sm w-[520px] overflow-hidden">
        [{bar}]
      </div>
      <div className="font-mono text-purple-500 text-xs">
        {percent.toString().padStart(3, '0')}%
      </div>
    </div>
  )
}
