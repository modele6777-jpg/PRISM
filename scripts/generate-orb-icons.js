import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG designed specifically for iOS Safari Apple Touch Icon & PWA Maskable Icon:
// Fully opaque dark space background (#030308 -> #090a1a -> #020206) across the full 512x512 canvas.
// The crystal orb and luminous cosmic orbits sit in the center within Apple's 80% safe zone.
const orbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <!-- Background Canvas Gradient (100% Opaque for iOS Safari) -->
    <radialGradient id="orbBg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#11142e" />
      <stop offset="50%" stop-color="#070814" />
      <stop offset="100%" stop-color="#020206" />
    </radialGradient>

    <!-- Outer Ambient Glow Filters -->
    <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="20" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="purpleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="28" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="coreStarGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Orb Core Spherical Shading -->
    <radialGradient id="glassSphere" cx="36%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
      <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.18" />
      <stop offset="55%" stop-color="#a855f7" stop-opacity="0.10" />
      <stop offset="85%" stop-color="#070716" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#020208" stop-opacity="0.98" />
    </radialGradient>

    <!-- Deep Glowing Nebula Core -->
    <radialGradient id="nebulaCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="20%" stop-color="#67e8f9" stop-opacity="0.85" />
      <stop offset="45%" stop-color="#38bdf8" stop-opacity="0.55" />
      <stop offset="70%" stop-color="#9333ea" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Secondary Violet Nebula Center -->
    <radialGradient id="violetNebula" cx="42%" cy="58%" r="45%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.8" />
      <stop offset="40%" stop-color="#a855f7" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Specular Highlight Glare -->
    <radialGradient id="glareGradient" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#e0f2fe" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
    </radialGradient>

    <!-- Bottom Rim Reflection -->
    <linearGradient id="rimReflection" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
    </linearGradient>

    <!-- Outer Cosmic Rings Gradient -->
    <linearGradient id="ringCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="ringPurple" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.15" />
    </linearGradient>
  </defs>

  <!-- 1. FULL SQUARE BASE CANVAS (Opaque for Apple Touch Icon & PWA) -->
  <rect width="512" height="512" fill="url(#orbBg)" />

  <!-- 2. Ambient Deep Space Halos -->
  <circle cx="256" cy="256" r="180" fill="#7c3aed" opacity="0.22" filter="url(#purpleGlow)" />
  <circle cx="256" cy="256" r="145" fill="#0284c7" opacity="0.30" filter="url(#cyanGlow)" />

  <!-- 3. Futuristic Cosmic Orbital Rings -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="url(#ringCyan)" stroke-width="1.8" stroke-dasharray="6 14" opacity="0.65" />
  <circle cx="256" cy="256" r="165" fill="none" stroke="url(#ringPurple)" stroke-width="1.4" stroke-dasharray="4 8" opacity="0.55" />
  <circle cx="256" cy="256" r="142" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.28" />

  <!-- Small Orbital Spark Starlights -->
  <circle cx="256" cy="66" r="3.5" fill="#38bdf8" filter="url(#coreStarGlow)" />
  <circle cx="446" cy="256" r="3" fill="#c084fc" filter="url(#coreStarGlow)" />
  <circle cx="256" cy="446" r="3.5" fill="#38bdf8" filter="url(#coreStarGlow)" />
  <circle cx="66" cy="256" r="3" fill="#67e8f9" filter="url(#coreStarGlow)" />

  <!-- 4. The Crystal Orb Sphere Core -->
  <g>
    <!-- Dark Glass Volume -->
    <circle cx="256" cy="256" r="126" fill="#04040a" />

    <!-- Interior Nebula Clouds -->
    <circle cx="270" cy="245" r="95" fill="url(#violetNebula)" />
    <circle cx="245" cy="265" r="90" fill="url(#nebulaCore)" filter="url(#cyanGlow)" />

    <!-- Interior Astral Spark Particles -->
    <circle cx="220" cy="230" r="3.2" fill="#ffffff" opacity="0.95" filter="url(#coreStarGlow)" />
    <circle cx="285" cy="225" r="2.5" fill="#67e8f9" opacity="0.9" />
    <circle cx="235" cy="290" r="2.8" fill="#c084fc" opacity="0.85" />
    <circle cx="295" cy="275" r="3.0" fill="#ffffff" opacity="0.95" filter="url(#coreStarGlow)" />
    <circle cx="260" cy="285" r="2.2" fill="#38bdf8" opacity="0.9" />
    <circle cx="210" cy="265" r="2.4" fill="#a855f7" opacity="0.8" />

    <!-- Center Radiant 4-Point Starlight Core -->
    <g transform="translate(256, 256)" filter="url(#coreStarGlow)">
      <path d="M 0,-26 Q 0,0 26,0 Q 0,0 0,26 Q 0,0 -26,0 Q 0,0 0,-26 Z" fill="#ffffff" opacity="0.98" />
      <path d="M 0,-16 Q 0,0 16,0 Q 0,0 0,16 Q 0,0 -16,0 Q 0,0 0,-16 Z" fill="#67e8f9" />
      <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
    </g>

    <!-- 3D Glass Surface Shading & Rim Depth -->
    <circle cx="256" cy="256" r="126" fill="url(#glassSphere)" />

    <!-- Bottom Rim Caustic Light Reflection -->
    <path d="M 175 350 C 220 376, 292 376, 337 350 C 310 366, 202 366, 175 350 Z" fill="url(#rimReflection)" />

    <!-- Top Primary Specular Glare (Realistic Glass Reflection) -->
    <ellipse cx="205" cy="180" rx="55" ry="24" transform="rotate(-32 205 180)" fill="url(#glareGradient)" />
    
    <!-- Secondary Small Glare Dot -->
    <circle cx="165" cy="210" r="7" fill="#ffffff" opacity="0.5" />

    <!-- Fine Glass Outer Edge Ring -->
    <circle cx="256" cy="256" r="126" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1.8" />
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const svgBuffer = Buffer.from(orbSvg);

  // 1. Save SVG
  fs.writeFileSync(path.join(publicDir, 'orb-icon.svg'), orbSvg);
  console.log('Saved orb-icon.svg');

  // 2. apple-touch-icon-orb.png (180x180, 100% opaque for iOS Safari)
  await sharp(svgBuffer)
    .resize(180, 180)
    .flatten({ background: '#020206' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon-orb.png'));
  console.log('Generated apple-touch-icon-orb.png (180x180, opaque)');

  // 3. orb-icon-192.png (192x192, 100% opaque)
  await sharp(svgBuffer)
    .resize(192, 192)
    .flatten({ background: '#020206' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'orb-icon-192.png'));
  console.log('Generated orb-icon-192.png (192x192, opaque)');

  // 4. orb-icon-512.png (512x512, 100% opaque)
  await sharp(svgBuffer)
    .resize(512, 512)
    .flatten({ background: '#020206' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'orb-icon-512.png'));
  console.log('Generated orb-icon-512.png (512x512, opaque)');

  // 5. orb-favicon.png (64x64, 100% opaque)
  await sharp(svgBuffer)
    .resize(64, 64)
    .flatten({ background: '#020206' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'orb-favicon.png'));
  console.log('Generated orb-favicon.png (64x64, opaque)');
}

run().catch(console.error);
