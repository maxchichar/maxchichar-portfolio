import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

export function PalaceDoor({ isOpen, onOpenComplete }) {
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const tl = gsap.timeline({ onComplete: onOpenComplete })
    tl.to([leftRef.current, rightRef.current], {
      duration: 0,
      transformPerspective: 1200,
      transformOrigin: 'center center',
    })
    tl.to(leftRef.current, {
      rotateY: -110,
      x: '-5%',
      duration: 1.8,
      ease: 'power4.inOut',
    }, 0)
    tl.to(rightRef.current, {
      rotateY: 110,
      x: '5%',
      duration: 1.8,
      ease: 'power4.inOut',
    }, 0)
  }, [isOpen, onOpenComplete])

  return (
    <div className="fixed inset-0 z-40 flex" style={{ perspective: '1200px' }}>
      {/* Left panel */}
      <div ref={leftRef} className="w-1/2 h-full bg-zinc-950 border-r border-purple-500/30 relative overflow-hidden"
        style={{ transformOrigin: 'left center', backfaceVisibility: 'hidden' }}>
        <DoorCircuitry side="left" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[20vw] font-black text-white/5 select-none">
          X
        </div>
      </div>

      {/* Right panel */}
      <div ref={rightRef} className="w-1/2 h-full bg-zinc-950 border-l border-purple-500/30 relative overflow-hidden"
        style={{ transformOrigin: 'right center', backfaceVisibility: 'hidden' }}>
        <DoorCircuitry side="right" />
      </div>
    </div>
  )
}

function DoorCircuitry({ side }) {
  // SVG circuit lines — purple glow traces on door panels
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Generate circuit path lines */}
      <g filter="url(#glow)" stroke="#a855f7" strokeWidth="1" fill="none">
        <line x1="20%" y1="0" x2="20%" y2="100%" opacity="0.3"/>
        <line x1="40%" y1="0" x2="40%" y2="100%" opacity="0.2"/>
        <line x1="0" y1="30%" x2="100%" y2="30%" opacity="0.3"/>
        <line x1="0" y1="60%" x2="100%" y2="60%" opacity="0.2"/>
        <rect x="15%" y="25%" width="70%" height="50%" opacity="0.15" strokeWidth="2"/>
        <circle cx="50%" cy="50%" r="15%" opacity="0.1" strokeWidth="2"/>
      </g>
    </svg>
  )
}
