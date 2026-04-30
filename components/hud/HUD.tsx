'use client';

/**
 * MAXCHICHAR // HUD Overlay
 * Live system stats, navigation controls, depth indicator.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorldStore, type RoomId } from '@/store/worldStore';
import { formatTime } from '@/lib/utils';

const ROOMS: { id: RoomId; label: string; key: string }[] = [
  { id: 'entrance',   label: 'ENTRANCE',   key: 'D-00' },
  { id: 'about',      label: 'ABOUT',      key: 'D-01' },
  { id: 'skills',     label: 'SKILLS',     key: 'D-03' },
  { id: 'projects',   label: 'CASE FILES', key: 'D-02' },
  { id: 'experience', label: 'TIMELINE',   key: 'D-05' },
  { id: 'gallery',    label: 'GALLERY',    key: 'D-06' },
  { id: 'contact',    label: 'CONTACT',    key: 'D-04' },
];

export default function HUD() {
  const { activeRoom, navigateTo, isTransitioning, neonMode, toggleNeonMode, toggleCommandPalette } = useWorldStore();
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(formatTime());
    const t = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[500]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 1 }}
    >
      {/* ── TOP LEFT ── */}
      <div className="absolute top-5 left-5 font-mono text-[10px] leading-6 text-purple">
        <div>SYS-ID: <span className="text-cyan">MXCH-001</span></div>
        <div>ARCH: <span className="text-cyan">v3.8.2</span></div>
        <div className="flex items-center gap-1">
          STATUS:
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
          <span className="text-cyan">ONLINE</span>
        </div>
      </div>

      {/* ── TOP RIGHT ── */}
      <div className="absolute top-5 right-5 font-mono text-[10px] leading-6 text-purple text-right">
        <div>PROTOCOL: <span className="text-cyan">ENCRYPTED</span></div>
        <div>LEVEL: <span className="text-cyan">OMEGA</span></div>
        <div>TIME: <span className="text-cyan">{time}</span></div>
      </div>

      {/* ── BOTTOM LEFT ── */}
      <div className="absolute bottom-5 left-5 font-mono text-[10px] leading-6 text-purple">
        <div>DIM: <span className="text-cyan">{activeRoom.toUpperCase()}</span></div>
        <div>MODE: <span className="text-cyan">CONTROL</span></div>
        <div>EFFICIENCY: <span className="text-cyan">99.9%</span></div>
      </div>

      {/* ── BOTTOM RIGHT ── */}
      <div className="absolute bottom-5 right-5 font-mono text-[10px] leading-6 text-purple text-right">
        <div>NO MANUAL OVERRIDE</div>
        <div>SELF-OPTIMIZING LOOP</div>
        <div>PROFIT MODE: <span className="text-cyan">ACTIVE</span></div>
      </div>

      {/* ── SIDE NAV (left, vertical) ── */}
      <nav className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            onClick={() => navigateTo(r.id)}
            disabled={isTransitioning}
            className="group flex items-center gap-2 text-left"
          >
            <div className={`w-2 h-2 rounded-full border transition-all duration-300
              ${activeRoom === r.id
                ? 'bg-cyan border-cyan shadow-glow-cyan scale-125'
                : 'border-purple group-hover:border-cyan group-hover:bg-purple/40'
              }`}
            />
            <span className={`font-mono text-[9px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200
              ${activeRoom === r.id ? 'opacity-100 text-cyan' : 'text-purple'}`}>
              {r.label}
            </span>
          </button>
        ))}
      </nav>

      {/* ── CMD+K hint ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-purple/50 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-1.5 hover:text-cyan transition-colors"
        >
          <kbd className="border border-purple/40 rounded px-1 py-0.5">⌘</kbd>
          <kbd className="border border-purple/40 rounded px-1 py-0.5">K</kbd>
          <span>COMMAND PALETTE</span>
        </button>
        <span className="text-purple/30">|</span>
        <button onClick={toggleNeonMode} className="hover:text-cyan transition-colors">
          {neonMode ? 'NEON MODE ON' : 'NEON MODE OFF'}
        </button>
        <span className="text-purple/30">|</span>
        <span>SCROLL TO NAVIGATE</span>
      </div>

      {/* ── Transition flash ── */}
      {isTransitioning && (
        <motion.div
          className="absolute inset-0 bg-purple/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}
