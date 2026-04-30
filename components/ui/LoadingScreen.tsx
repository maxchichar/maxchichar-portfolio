'use client';

/**
 * MAXCHICHAR // Loading Screen
 * Cryptographic session key + particle scanning + progress bar.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '@/store/worldStore';
import { formatTime } from '@/lib/utils';

const BOOT_LINES = [
  '▸ INITIALIZING ARCHITECT PROTOCOL...',
  '▸ LOADING QUANTUM DIMENSION MATRIX...',
  '▸ CALIBRATING 5D SPATIAL ENGINE...',
  '▸ DEPLOYING NEURAL INTERFACE LAYER...',
  '▸ SCANNING VISION CORE...',
  '▸ ACTIVATING PROFIT MODE...',
  '▸ LEVEL OMEGA CLEARANCE GRANTED.',
  '▸ SYSTEM ONLINE. NO MANUAL OVERRIDE.',
];

export default function LoadingScreen() {
  const { isLoaded, sessionKey, setLoaded, setLoadProgress, loadProgress } = useWorldStore();
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTime(formatTime());
    const clock = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (isLoaded) return;

    // Simulate loading progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 14 + 4;
      if (progress >= 100) { progress = 100; clearInterval(interval); }
      setLoadProgress(Math.min(100, progress));
    }, 180);

    // Boot lines
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines((prev) => [...prev, line]), i * 260 + 400);
    });

    // Scanning animation
    setTimeout(() => setScanning(true), 1000);

    // Complete
    setTimeout(() => {
      setDone(true);
      setTimeout(setLoaded, 600);
    }, BOOT_LINES.length * 260 + 800);

    return () => clearInterval(interval);
  }, [isLoaded, setLoaded, setLoadProgress]);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-void overflow-hidden"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Background grid */}
          <div className="absolute inset-0 grid-bg opacity-20" />

          {/* Scan line sweep */}
          {scanning && (
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan to-transparent opacity-60"
              animate={{ top: ['-2%', '102%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Corner brackets */}
          {[['top-6 left-6 border-t border-l', 'tl'], ['top-6 right-6 border-t border-r', 'tr'],
            ['bottom-6 left-6 border-b border-l', 'bl'], ['bottom-6 right-6 border-b border-r', 'br']]
            .map(([cls]) => (
              <div key={cls} className={`absolute w-8 h-8 border-purple ${cls}`} />
            ))}

          {/* Session key */}
          <motion.div
            className="font-mono text-xs text-purple-dim tracking-[0.3em] mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            SESSION: <span className="text-cyan">{sessionKey}</span>
          </motion.div>

          {/* Main name */}
          <motion.h1
            className="font-display text-5xl font-black tracking-[0.25em] text-white mb-2"
            style={{ textShadow: '0 0 40px #7b00ff, 0 0 80px #7b00ff44' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            MAXCHICHAR
          </motion.h1>

          <motion.p
            className="font-mono text-xs text-purple tracking-[0.4em] mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            ARCHITECT PROTOCOL // LEVEL OMEGA
          </motion.p>

          {/* Progress bar */}
          <div className="w-80 mb-6">
            <div className="flex justify-between font-mono text-[9px] text-purple-dim mb-1">
              <span>LOADING DIMENSIONS</span>
              <span className="text-cyan">{Math.round(loadProgress)}%</span>
            </div>
            <div className="h-0.5 bg-purple-dim/30 overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: 'linear-gradient(90deg, #7b00ff, #00ffff)',
                  boxShadow: '0 0 12px #bf00ff',
                  width: `${loadProgress}%`,
                }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Boot lines */}
          <div className="w-96 h-44 overflow-hidden font-mono">
            {visibleLines.map((line, i) => (
              <motion.div
                key={i}
                className="text-[10px] tracking-widest py-0.5"
                style={{ color: i === visibleLines.length - 1 ? '#00ffff' : 'rgba(123,0,255,0.7)' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {line}
              </motion.div>
            ))}
            {!done && <span className="text-cyan text-[10px] blink">█</span>}
          </div>

          {/* Status bar */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 font-mono text-[9px] text-purple-dim">
            <span>STATUS: <span className="text-cyan">ONLINE</span></span>
            <span>MODE: CONTROL</span>
            <span>TIME: <span className="text-cyan">{time}</span></span>
            <span>UPTIME: 99.99%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
