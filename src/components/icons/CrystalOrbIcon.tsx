import React from "react";

interface CrystalOrbIconProps {
  size?: number;
  className?: string;
}

/**
 * 🔮 CrystalOrbIcon
 * A distinct, hyper-realistic 3D crystal sphere / mystical scrying orb icon
 * Features:
 * - Spherical 3D gradient with specular reflection
 * - Tilted cosmic astral orbit ring
 * - Luminous starlight singularity core
 * - Curved glass specular highlight & bottom rim glow
 */
export function CrystalOrbIcon({ size = 24, className = "" }: CrystalOrbIconProps) {
  const gradId = React.useId().replace(/:/g, "_");
  const sphereGradId = `orb_sphere_${gradId}`;
  const coreGradId = `orb_core_${gradId}`;
  const ringGradId = `orb_ring_${gradId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* 3D Glass Sphere Body Radial Gradient */}
        <radialGradient
          id={sphereGradId}
          cx="36%"
          cy="30%"
          r="68%"
          fx="32%"
          fy="26%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="22%" stopColor="#a5f3fc" stopOpacity="0.85" />
          <stop offset="48%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="76%" stopColor="#818cf8" stopOpacity="0.5" />
          <stop offset="92%" stopColor="#312e81" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#09090b" stopOpacity="0.98" />
        </radialGradient>

        {/* Pulsing Core Singularity Gradient */}
        <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>

        {/* Orbit Ring Gradient */}
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#c084fc" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Back Half of Celestial Orbit Ring */}
      <path
        d="M2.5 14.2 C4.2 18.5 13 19.8 19.5 16.5"
        stroke={`url(#${ringGradId})`}
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
        strokeLinecap="round"
        className="opacity-70"
      />

      {/* Outer Soft Ambient Aura */}
      <circle
        cx="12"
        cy="12"
        r="8.8"
        fill="#38bdf8"
        fillOpacity="0.15"
        className="blur-[1px]"
      />

      {/* 3D Glass Crystal Orb Main Sphere */}
      <circle
        cx="12"
        cy="12"
        r="7.8"
        fill={`url(#${sphereGradId})`}
        stroke="#67e8f9"
        strokeWidth="0.9"
        strokeOpacity="0.7"
      />

      {/* Glowing Inner Nebula Core */}
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill={`url(#${coreGradId})`}
        className="animate-pulse"
      />

      {/* Front Half of Celestial Orbit Ring */}
      <path
        d="M4.5 9.8 C11 6.5 19.8 7.8 21.5 12.1"
        stroke={`url(#${ringGradId})`}
        strokeWidth="1.3"
        strokeLinecap="round"
        className="opacity-90"
      />

      {/* Glossy Top Glass Glare (Curved Crescent Reflection) */}
      <path
        d="M8.5 7.6 C9.8 6.4 12.2 6.3 14 7.2"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />

      {/* Tiny Secondary Specular Sparkle Dot */}
      <circle cx="9.2" cy="9.2" r="0.6" fill="#ffffff" fillOpacity="0.85" />

      {/* Bottom Rim Ambient Light Catch */}
      <path
        d="M9.8 17.2 C11.2 17.9 12.8 17.9 14.2 17.2"
        stroke="#38bdf8"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
    </svg>
  );
}
