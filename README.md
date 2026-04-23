# MAXCHICHAR // ARCHITECT PROTOCOL
## 5D Spatial Portfolio — World-Class Futuristic Experience

> Control Systems. Print Outcomes. Build. Execute. Scale.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open http://localhost:3000
```

---

## 📁 Project Structure

```
maxchichar-portfolio/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   └── page.tsx                # Main entry — orchestrates all layers
├── components/
│   ├── 3d/
│   │   ├── World3D.tsx         # R3F Canvas, camera rig, post-processing
│   │   └── rooms/
│   │       ├── EntranceRoom.tsx   # Door ritual + avatar materializes
│   │       ├── AboutRoom.tsx      # Identity matrix + skill bars
│   │       ├── SkillsRoom.tsx     # Neural network hologram
│   │       ├── ProjectsRoom.tsx   # Floating interactive case file cubes
│   │       ├── ExperienceRoom.tsx # Crystal levitating timeline
│   │       ├── GalleryRoom.tsx    # Luxury auction room + photo frame
│   │       └── ContactRoom.tsx    # Portal + contact info
│   ├── hud/
│   │   └── HUD.tsx             # Live system overlay, nav dots
│   ├── ui/
│   │   ├── LoadingScreen.tsx   # Cryptographic key + boot sequence
│   │   ├── CommandPalette.tsx  # CMD+K spatial navigator
│   │   ├── Cursor.tsx          # Custom tri-layer cursor
│   │   └── GalleryUploader.tsx # Drag & drop photo upload
│   └── effects/
│       └── ScanLines.tsx       # CRT scanline overlay
├── hooks/
│   └── useScrollNav.ts         # Wheel + keyboard room navigation
├── store/
│   └── worldStore.ts           # Zustand global state
├── lib/
│   └── utils.ts                # Math, color, format helpers
└── styles/
    └── globals.css             # Design system, animations, glassmorphism
```

---

## 🎮 Navigation

| Action              | Method                          |
|---------------------|---------------------------------|
| Move between rooms  | Scroll wheel / Arrow keys       |
| Jump to any room    | Left sidebar dots / CMD+K       |
| Command palette     | CMD+K (or CTRL+K on Windows)    |
| Close palette       | ESC                             |
| Neon mode toggle    | CMD+K → Toggle Neon Mode        |

---

## 🖼️ HOW TO REPLACE THE GALLERY PHOTO

### Method 1 — Static File (Recommended, Best Quality)

1. Copy your photo to `/public/textures/my-photo.jpg`
2. Open `store/worldStore.ts`
3. Find line: `galleryPhotoUrl: '/textures/gallery-placeholder.jpg'`
4. Change to: `galleryPhotoUrl: '/textures/my-photo.jpg'`
5. Save — the gallery room picks it up automatically with:
   - Three-point gallery lighting (warm key, cool fill, purple rim)
   - Clearcoat glossy finish (`MeshPhysicalMaterial`)
   - Reflection plane below the pedestal
   - Neon frame with glow

### Method 2 — Runtime Drag & Drop

1. Press **CMD+K** → select **"Upload Gallery Photo"**
2. Drag any JPG/PNG/WEBP onto the dropzone, or click to browse
3. Photo converts to base64 and instantly updates in 3D

### Method 3 — Programmatic (from any component)

```typescript
import { useWorldStore } from '@/store/worldStore';

// Set from URL
useWorldStore.getState().setGalleryPhoto('https://your-cdn.com/photo.jpg');

// Set from base64
useWorldStore.getState().setGalleryPhoto('data:image/jpeg;base64,...');
```

---

## 👤 HOW TO CUSTOMIZE THE 3D AVATAR

The avatar appears in the Entrance Room doorway after the door opens.

1. Open `components/3d/rooms/EntranceRoom.tsx`
2. Find the `AvatarFloat` component
3. Load your texture:

```typescript
// Add at top of AvatarFloat:
import { useTexture } from '@react-three/drei';

// Inside the component:
const texture = useTexture('/textures/your-avatar.png');

// Apply to the mesh:
<meshStandardMaterial
  map={texture}
  transparent  // if PNG with transparent background
  alphaTest={0.1}
  emissive="#7b00ff"
  emissiveIntensity={0.2}
/>
```

**Best results**: Use a PNG with transparent background (your banner portrait cutout works perfectly).

---

## 🎨 Design System Tokens

All design tokens are in `styles/globals.css` as CSS custom properties:

```css
--purple:        #7b00ff   /* Primary brand */
--cyan:          #00ffff   /* Accent / highlights */
--neon:          #bf00ff   /* Bright glow */
--plasma:        #da70d6   /* Warm accent */
--void:          #000005   /* True black background */
--glow-md:       ...       /* Box shadow glow values */
```

---

## ⚡ Performance Notes

- Three.js canvas uses `dpr={[1, 1.5]}` — limits pixel ratio for 60fps
- Heavy post-processing (Bloom, ChromaticAberration) — reduce on low-end
- Particle count: 3000 stars + 200 field particles — tune in `World3D.tsx`
- All rooms always exist in 3D space but only the active one is camera-facing
- `<Preload all />` ensures textures load before rendering

---

## 🚢 Deployment

```bash
# Vercel (recommended)
npx vercel

# Or build manually
npm run build
npm run start
```

Environment: Works on Node 18+, no environment variables required.

---

## 🔧 Customization Checklist

- [ ] Replace `MAXCHICHAR` with your name throughout
- [ ] Update bio text in `AboutRoom.tsx`
- [ ] Edit skills in `SkillsRoom.tsx` (SKILLS array)
- [ ] Edit projects in `ProjectsRoom.tsx` (PROJECTS array)
- [ ] Edit timeline in `ExperienceRoom.tsx` (TIMELINE array)
- [ ] Update contact info in `ContactRoom.tsx`
- [ ] Replace gallery photo (see above)
- [ ] Add avatar texture to `EntranceRoom.tsx`
- [ ] Update metadata in `app/layout.tsx`

---

*MAXCHICHAR // ARCHITECT PROTOCOL // LEVEL OMEGA*
*No Manual Override. Self-Optimizing Loop. Profit Mode Active.*
