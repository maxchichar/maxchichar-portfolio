/**
 * MAXCHICHAR // World State Store
 * Controls which room is active, loading, transitions, and UI state.
 */
import { create } from 'zustand';

export type RoomId =
  | 'entrance'
  | 'about'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'gallery'
  | 'contact';

export interface WorldState {
  /* Loading */
  isLoaded: boolean;
  loadProgress: number;
  sessionKey: string;

  /* Door ritual */
  doorOpen: boolean;
  doorComplete: boolean;

  /* Navigation */
  activeRoom: RoomId;
  previousRoom: RoomId | null;
  isTransitioning: boolean;

  /* UI overlays */
  commandPaletteOpen: boolean;
  hudVisible: boolean;
  neonMode: boolean;

  /* Gallery */
  galleryPhotoUrl: string;

  /* Camera hint */
  cameraTarget: [number, number, number];

  /* Actions */
  setLoaded: () => void;
  setLoadProgress: (p: number) => void;
  openDoor: () => void;
  completeDoor: () => void;
  navigateTo: (room: RoomId) => void;
  toggleCommandPalette: () => void;
  toggleNeonMode: () => void;
  setGalleryPhoto: (url: string) => void;
}

/** Generate a cryptographic-style session key */
function generateSessionKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `MAXCHICHAR-0x${rand(2)}${rand(2)}${rand(2)}_${rand(4)}_${rand(4)}`;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  isLoaded: false,
  loadProgress: 0,
  sessionKey: generateSessionKey(),

  doorOpen: false,
  doorComplete: false,

  activeRoom: 'entrance',
  previousRoom: null,
  isTransitioning: false,

  commandPaletteOpen: false,
  hudVisible: true,
  neonMode: false,

  // Default gallery placeholder — user replaces this
  galleryPhotoUrl: '/textures/gallery-placeholder.jpg',

  cameraTarget: [0, 0, 0],

  setLoaded: () => set({ isLoaded: true }),
  setLoadProgress: (p) => set({ loadProgress: p }),

  openDoor: () => set({ doorOpen: true }),
  completeDoor: () => set({ doorComplete: true }),

  navigateTo: (room) => {
    const { activeRoom, isTransitioning } = get();
    if (isTransitioning || room === activeRoom) return;
    set({ isTransitioning: true, previousRoom: activeRoom, activeRoom: room });
    setTimeout(() => set({ isTransitioning: false }), 1800);
  },

  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  toggleNeonMode: () =>
    set((s) => ({ neonMode: !s.neonMode })),

  setGalleryPhoto: (url) => set({ galleryPhotoUrl: url }),
}));
