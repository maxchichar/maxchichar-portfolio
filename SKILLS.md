# SKILLS.md — Animation & Component Pattern Library

> Reference manual for all reusable animation patterns, hooks, and component blueprints.
> Every animation used on MAXCHICHAR must come from this file or be added here.

---

## 1. Cursor System

### CustomCursor.jsx
```jsx
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function CustomCursor() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Dot: instant follow
  const dotX = useSpring(mouseX, { stiffness: 1000, damping: 50 })
  const dotY = useSpring(mouseY, { stiffness: 1000, damping: 50 })

  // Ring: lagged follow
  const ringX = useSpring(mouseX, { stiffness: 150, damping: 20 })
  const ringY = useSpring(mouseY, { stiffness: 150, damping: 20 })

  useEffect(() => {
    const move = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY) }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      {/* Glow dot */}
      <motion.div className="fixed top-0 left-0 w-3 h-3 rounded-full bg-purple pointer-events-none z-[9999] mix-blend-screen"
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%',
          boxShadow: '0 0 12px #a855f7, 0 0 24px #a855f760' }} />
      {/* Trailing ring */}
      <motion.div className="fixed top-0 left-0 w-8 h-8 rounded-full border border-purple/40 pointer-events-none z-[9998]"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }} />
    </>
  )
}
```

### Magnetic element hook
```js
// hooks/useMagnetic.js
import { useRef } from 'react'
import { useMotionValue, useSpring, motion } from 'framer-motion'

export function useMagnetic(strength = 0.4) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 200, damping: 20 })
  const springY = useSpring(y, { stiffness: 200, damping: 20 })

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * strength)
    y.set((e.clientY - centerY) * strength)
  }

  const handleMouseLeave = () => { x.set(0); y.set(0) }

  return { ref, springX, springY, handleMouseMove, handleMouseLeave }
}

// Usage:
// const { ref, springX, springY, handleMouseMove, handleMouseLeave } = useMagnetic()
// <motion.button ref={ref} style={{ x: springX, y: springY }}
//   onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
```

---

## 2. Galaxy Particle Background

```jsx
// components/ui/GalaxyBackground.jsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function GalaxyBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    mountRef.current.appendChild(renderer.domElement)

    // Particle geometry
    const count = 80
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
      // Purple to white spectrum
      colors[i * 3]     = 0.5 + Math.random() * 0.5
      colors[i * 3 + 1] = Math.random() * 0.3
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })

    const stars = new THREE.Points(geo, mat)
    scene.add(stars)
    camera.position.z = 5

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      stars.rotation.x += 0.0001
      stars.rotation.y += 0.00015
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      mountRef.current?.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />
}
```

---

## 3. Terminal Typewriter

```jsx
// components/gate/Terminal.jsx
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
    if (lineIndex >= LINES.length) { onComplete(); return }
    const line = LINES[lineIndex]
    if (charIndex < line.length) {
      const id = setTimeout(() => {
        setDisplayed(p => p + line[charIndex])
        setCharIndex(p => p + 1)
        // Play beep
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
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
```

---

## 4. Hash Loading Bar

```jsx
// components/gate/HashLoader.jsx
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
```

---

## 5. Palace Door Animation

```jsx
// components/gate/PalaceDoor.jsx
// Uses GSAP for cinematic perspective transforms

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
```

---

## 6. Text Scramble / Hash Reveal

```js
// lib/textScramble.js
export class TextScramble {
  constructor(el) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEF'
    this.update = this.update.bind(this)
  }

  setText(newText) {
    const length = newText.length
    const old = this.el.innerText
    const promise = new Promise(resolve => this.resolve = resolve)
    this.queue = []
    for (let i = 0; i < Math.max(old.length, length); i++) {
      const from = old[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 10)
      const end = start + Math.floor(Math.random() * 15)
      this.queue.push({ from, to, start, end })
    }
    cancelAnimationFrame(this.raf)
    this.frame = 0
    this.update()
    return promise
  }

  update() {
    let output = ''
    let complete = 0
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)]
          this.queue[i].char = char
        }
        output += `<span style="color:#a855f7">${char}</span>`
      } else { output += from }
    }
    this.el.innerHTML = output
    if (complete === this.queue.length) { this.resolve() }
    else { this.raf = requestAnimationFrame(this.update); this.frame++ }
  }
}
```

**Usage in Blockchain section:**
```jsx
useEffect(() => {
  if (inView) {
    const el = titleRef.current
    const fx = new TextScramble(el)
    fx.setText('BLOCKCHAIN')
  }
}, [inView])
```

---

## 7. 3D Card Tilt (Skills)

```jsx
// hooks/use3DTilt.js
import { useRef } from 'react'
import { useMotionValue, useSpring, useTransform } from 'framer-motion'

export function use3DTilt() {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 300, damping: 30 })

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleMouseLeave = () => { x.set(0); y.set(0) }

  return { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave }
}
```

---

## 8. Scroll Reveal (Intersection Observer)

```jsx
// hooks/useScrollReveal.js
import { useEffect, useRef, useState } from 'react'

export function useScrollReveal(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}
```

---

## 9. Blockchain Block Animation

```jsx
// components/sections/Blockchain.jsx — Block animation spec

// State: blocks start scattered off-screen
// On inView: GSAP stagger from({ opacity: 0, x: randomOffset }) to({ opacity: 1, x: 0 })
// Chain links: SVG lines that draw in with strokeDashoffset animation
// Block click: expand panel below showing mock tx data

const MOCK_BLOCK = {
  hash: '0x3f7a...d92c',
  prev: '0x8b2e...f01a',
  nonce: 394821,
  timestamp: Date.now(),
  transactions: 142,
  size: '1.2 MB',
}

// Chain link SVG animation:
// stroke-dasharray: total-length
// stroke-dashoffset: total-length → 0 (on inView, with delay per link)
```

---

## 10. AI Army Formation

```jsx
// components/sections/AIArmy.jsx — Agent spec

const AGENTS = [
  { name: 'Claude',      badge: 'REASONING',   color: '#a855f7' },
  { name: 'GPT-4',       badge: 'LANGUAGE',    color: '#7c3aed' },
  { name: 'Midjourney',  badge: 'VISION',      color: '#6d28d9' },
  { name: 'Gemini',      badge: 'MULTIMODAL',  color: '#5b21b6' },
  { name: 'Sora',        badge: 'VIDEO',       color: '#4c1d95' },
  { name: 'Whisper',     badge: 'AUDIO',       color: '#3b0764' },
]

// Each agent: CSS avatar figure (head + body, purely CSS shapes)
// Formation animation: GSAP stagger from({ y: 100, opacity: 0 }) to({ y: 0, opacity: 1 })
// Hover: agent glows purple, bounces slightly, shows tooltip
// Mouse position: agents subtly tilt toward cursor (requestAnimationFrame)
```

---

## 11. Film Grain Overlay

```css
/* index.css */
@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2%, -2%); }
  30% { transform: translate(2%, 2%); }
  50% { transform: translate(-1%, 1%); }
  70% { transform: translate(1%, -1%); }
  90% { transform: translate(-2%, 1%); }
}

.film-grain::after {
  content: '';
  position: fixed;
  inset: -50%;
  width: 200%;
  height: 200%;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.03;
  animation: grain 0.5s steps(1) infinite;
  pointer-events: none;
  z-index: 9999;
}
```

---

## 12. Audio Hook

```js
// hooks/useAudio.js
import { useRef, useState, useCallback } from 'react'
import { Howl } from 'howler'

export function useAudio() {
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const sounds = useRef({})

  const register = useCallback((id, src, opts = {}) => {
    sounds.current[id] = new Howl({ src: [src], volume: opts.volume ?? 1, loop: opts.loop ?? false })
  }, [])

  const play = useCallback((id) => {
    if (muted) return
    sounds.current[id]?.play()
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted(m => { Howler.mute(!m); return !m })
  }, [])

  return { muted, blocked, setBlocked, register, play, toggleMute }
}
```

---

## 13. Language → TTS Voice Map

```js
// lib/ttsVoices.js
export const LANG_MAP = {
  EN: { locale: 'en-US', greeting: 'Welcome to the MAXCHICHAR archive. I am your system guide.' },
  ES: { locale: 'es-ES', greeting: 'Bienvenido al archivo MAXCHICHAR. Soy tu guía del sistema.' },
  FR: { locale: 'fr-FR', greeting: 'Bienvenue dans l\'archive MAXCHICHAR. Je suis votre guide système.' },
  DE: { locale: 'de-DE', greeting: 'Willkommen im MAXCHICHAR-Archiv. Ich bin Ihr Systemführer.' },
  JP: { locale: 'ja-JP', greeting: 'MAXCHICHARアーカイブへようこそ。私はあなたのシステムガイドです。' },
  CN: { locale: 'zh-CN', greeting: '欢迎来到 MAXCHICHAR 档案馆。我是您的系统向导。' },
  RU: { locale: 'ru-RU', greeting: 'Добро пожаловать в архив MAXCHICHAR. Я ваш системный гид.' },
}
```

---

## 14. Projects — Hierarchy Layout Pattern

```jsx
// components/sections/Projects.jsx

// FLAGSHIP BLOCK
<section className="min-h-screen flex flex-col justify-center gap-12 px-8 md:px-20">
  <div className="text-xs font-mono text-purple tracking-[0.3em] uppercase">
    Flagship Project
  </div>
  <h2 className="text-7xl font-display font-black text-white leading-none">
    {flagship.name}
  </h2>
  {/* Full-width screenshot — 16:9 crop, slight parallax on scroll */}
  <div className="relative w-full aspect-video overflow-hidden rounded-sm">
    <img src={flagship.screenshot} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent" />
  </div>
  <p className="text-zinc-light text-lg max-w-2xl">{flagship.description}</p>
  <div className="flex gap-2 flex-wrap">
    {flagship.stack.map(s => (
      <span key={s} className="font-mono text-xs px-3 py-1 border border-purple/30 text-purple rounded-sm">
        {s}
      </span>
    ))}
  </div>
  <div className="flex gap-6">
    <a href={flagship.live} className="text-white border-b border-white/30 pb-1 hover:border-purple hover:text-purple transition-colors">
      Live Site →
    </a>
    <a href={flagship.github} className="text-zinc hover:text-white transition-colors">
      GitHub ↗
    </a>
  </div>
</section>

// LEADERBOARD
<section className="py-24 px-8 md:px-20">
  <div className="text-xs font-mono text-purple tracking-[0.3em] uppercase mb-12">
    Other Work
  </div>
  <div className="divide-y divide-white/5">
    {projects.map((p, i) => (
      <div key={p.id}
        className="flex items-center gap-8 py-6 group cursor-pointer relative overflow-hidden"
        onClick={() => window.open(p.link)}>
        {/* Purple sweep on hover */}
        <div className="absolute inset-0 bg-purple/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />
        <span className="font-mono text-4xl font-black text-white/10 group-hover:text-purple/20 transition-colors w-16 shrink-0">
          {String(i + 1).padStart(2, '0')}
        </span>
        <div className="flex-1">
          <h3 className="text-white text-xl font-medium group-hover:text-purple transition-colors">
            {p.name}
          </h3>
          <p className="text-zinc text-sm mt-1">{p.description}</p>
        </div>
        <div className="hidden md:flex gap-2">
          {p.stack.slice(0, 3).map(s => (
            <span key={s} className="font-mono text-xs text-zinc/60">{s}</span>
          ))}
        </div>
        <span className="text-zinc group-hover:text-purple group-hover:translate-x-2 transition-all">→</span>
      </div>
    ))}
  </div>
</section>
```

---

## 15. Performance Checklist

- [ ] `will-change: transform` on animated elements only (remove after animation completes)
- [ ] Three.js: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- [ ] GSAP: use `gsap.context()` for cleanup in useEffect
- [ ] Images: `<img loading="lazy" decoding="async" />`
- [ ] Framer Motion: `AnimatePresence` for unmount animations only
- [ ] Audio: preload `"metadata"` not `"auto"` for large files
- [ ] Font: `font-display: swap` in @font-face

---

_Add new patterns here as they're built. Never duplicate — reference this file._
