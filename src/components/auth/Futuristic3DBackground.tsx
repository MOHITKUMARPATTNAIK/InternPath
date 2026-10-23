'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  alpha: number;
  speedY: number;
  speedX: number;
  pulseSpeed: number;
  phase: number;
}

export function Futuristic3DBackground({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 40;
      targetMouseY = (e.clientY / height - 0.5) * 40;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Color palette: Cyan, Electric Blue, Violet
    const colors = [
      'rgba(6, 182, 212, ', // Cyan
      'rgba(59, 130, 246, ', // Electric Blue
      'rgba(139, 92, 246, ', // Violet
      'rgba(168, 85, 247, ', // Purple
      'rgba(34, 211, 238, ', // Light Cyan
    ];

    // Initialize 40 3D spatial particles
    const particleCount = width < 768 ? 25 : 45;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.8 + 0.2, // Depth factor
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.2,
        speedY: (Math.random() * 0.4 + 0.15) * -1,
        speedX: (Math.random() - 0.5) * 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    // Render loop
    const render = () => {
      time += 0.012;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep Midnight Navy Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#030712'); // Darkest midnight
      bgGrad.addColorStop(0.5, '#050c24'); // Navy midnight
      bgGrad.addColorStop(1, '#020617'); // Deep slate
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Liquid Light Flowing Plasma Orbs
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Cyan Liquid Wave Orb
      const cx1 = width * 0.35 + Math.sin(time * 0.8) * 120 + mouseX * 0.5;
      const cy1 = height * 0.38 + Math.cos(time * 0.6) * 100 + mouseY * 0.5;
      const r1 = Math.min(width, height) * 0.55;
      const grad1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
      grad1.addColorStop(0, 'rgba(6, 182, 212, 0.28)'); // Cyan
      grad1.addColorStop(0.4, 'rgba(14, 165, 233, 0.14)');
      grad1.addColorStop(0.8, 'rgba(6, 182, 212, 0.02)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Electric Blue Flow Orb
      const cx2 = width * 0.65 + Math.cos(time * 0.7) * 130 - mouseX * 0.6;
      const cy2 = height * 0.58 + Math.sin(time * 0.9) * 90 - mouseY * 0.6;
      const r2 = Math.min(width, height) * 0.5;
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
      grad2.addColorStop(0, 'rgba(37, 99, 235, 0.25)'); // Electric blue
      grad2.addColorStop(0.45, 'rgba(59, 130, 246, 0.12)');
      grad2.addColorStop(0.85, 'rgba(37, 99, 235, 0.02)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Violet Liquid Orb
      const cx3 = width * 0.5 + Math.sin(time * 0.5) * 90 + mouseX * 0.3;
      const cy3 = height * 0.68 + Math.cos(time * 0.65) * 80 + mouseY * 0.3;
      const r3 = Math.min(width, height) * 0.6;
      const grad3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, r3);
      grad3.addColorStop(0, 'rgba(139, 92, 246, 0.22)'); // Violet
      grad3.addColorStop(0.4, 'rgba(168, 85, 247, 0.10)');
      grad3.addColorStop(0.8, 'rgba(139, 92, 246, 0.01)');
      grad3.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      // 3. Floating 3D Glowing Particles
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y += p.speedY * p.z;
          p.x += p.speedX * p.z;
          p.phase += p.pulseSpeed;

          // Wrap around screen
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        const pulseAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
        const px = p.x + mouseX * p.z;
        const py = p.y + mouseY * p.z;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${pulseAlpha})`;
        ctx.shadowBlur = 12 * p.z;
        ctx.shadowColor = `${p.color}0.8)`;
        ctx.fill();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div
      className={`relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-slate-950 ${className}`}
    >
      {/* Dynamic 3D Liquid Light Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Translucent Futuristic Energy Portal Effect */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Outer Radiant Glow */}
        <div className="absolute w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-violet-600/20 blur-3xl animate-pulse" />

        {/* Outer Rotating Energy Ring */}
        <div
          className="absolute w-[460px] h-[460px] sm:w-[580px] sm:h-[580px] rounded-full border border-cyan-500/25 border-dashed"
          style={{
            animation: 'spin 40s linear infinite',
            boxShadow:
              '0 0 45px rgba(6, 182, 212, 0.18), inset 0 0 35px rgba(139, 92, 246, 0.15)',
          }}
        />

        {/* Middle Counter-Rotating Violet Halo */}
        <div
          className="absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full border border-violet-500/30 border-t-cyan-400/60 border-b-violet-400/60"
          style={{
            animation: 'spin 25s linear infinite reverse',
            filter: 'drop-shadow(0 0 25px rgba(139, 92, 246, 0.35))',
          }}
        />

        {/* Inner Laser-Shimmer Portal Aperture */}
        <div
          className="absolute w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] rounded-full bg-radial from-cyan-400/15 via-blue-500/5 to-transparent border border-cyan-400/40"
          style={{
            boxShadow:
              '0 0 35px rgba(34, 211, 238, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.25)',
          }}
        />
      </div>

      {/* Foreground Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 py-8 flex items-center justify-center">
        {children}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
