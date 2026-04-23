'use client';

/**
 * MAXCHICHAR // Command Palette (CMD+K)
 * Fly camera to any room, toggle modes, search.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore, type RoomId } from '@/store/worldStore';

const COMMANDS = [
  { label: 'Navigate → Entrance',   action: 'nav',    room: 'entrance' as RoomId,   icon: '⊞' },
  { label: 'Navigate → About',      action: 'nav',    room: 'about' as RoomId,      icon: '◈' },
  { label: 'Navigate → Skills',     action: 'nav',    room: 'skills' as RoomId,     icon: '⬡' },
  { label: 'Navigate → Case Files', action: 'nav',    room: 'projects' as RoomId,   icon: '◧' },
  { label: 'Navigate → Timeline',   action: 'nav',    room: 'experience' as RoomId, icon: '◎' },
  { label: 'Navigate → Gallery',    action: 'nav',    room: 'gallery' as RoomId,    icon: '▣' },
  { label: 'Navigate → Contact',    action: 'nav',    room: 'contact' as RoomId,    icon: '⊕' },
  { label: 'Toggle Neon Mode',      action: 'neon',   icon: '◉' },
  { label: 'Upload Gallery Photo',  action: 'gallery', icon: '⬆' },
];

export default function CommandPalette() {
  const { navigateTo, toggleCommandPalette, toggleNeonMode } = useWorldStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null!);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setSelected(0); }, [query]);

  const run = (cmd: typeof COMMANDS[0]) => {
    if (cmd.action === 'nav' && cmd.room) { navigateTo(cmd.room); toggleCommandPalette(); }
    if (cmd.action === 'neon') { toggleNeonMode(); toggleCommandPalette(); }
    if (cmd.action === 'gallery') { toggleCommandPalette(); document.getElementById('gallery-upload')?.click(); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, filtered.length - 1));
    if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0));
    if (e.key === 'Enter' && filtered[selected]) run(filtered[selected]);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={toggleCommandPalette}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

      <motion.div
        className="relative z-10 w-[520px] glass-card clip-hex overflow-hidden"
        initial={{ scale: 0.92, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-purple/30">
          <span className="text-purple font-mono text-sm">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="COMMAND SEARCH..."
            className="flex-1 bg-transparent font-mono text-sm text-ghost placeholder:text-purple/40 outline-none tracking-widest"
          />
          <span className="font-mono text-[9px] text-purple/50 tracking-widest">ESC TO CLOSE</span>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-5 py-4 font-mono text-xs text-purple/40 tracking-widest">
              NO COMMANDS FOUND
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.label}
              onClick={() => run(cmd)}
              className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors
                ${i === selected ? 'bg-purple/20 text-white' : 'text-ghost/70 hover:bg-purple/10'}`}
            >
              <span className="text-cyan font-mono text-base w-5">{cmd.icon}</span>
              <span className="font-mono text-xs tracking-widest">{cmd.label}</span>
              {i === selected && (
                <span className="ml-auto font-mono text-[9px] text-purple/60 tracking-widest">ENTER</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-purple/20 flex gap-4 font-mono text-[9px] text-purple/40">
          <span>↑↓ NAVIGATE</span>
          <span>↵ EXECUTE</span>
          <span>ESC CLOSE</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
