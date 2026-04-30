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
