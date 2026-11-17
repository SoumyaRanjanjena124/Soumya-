import { useEffect, useRef } from 'react';
import { LoginPhase, NeonPreset } from '../types/flipper';

interface NeonBackdropProps {
  preset: NeonPreset;
  phase: LoginPhase;
}

export function NeonBackdrop({ preset, phase }: NeonBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.42 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current = {
        x: e.clientX / Math.max(window.innerWidth, 1),
        y: e.clientY / Math.max(window.innerHeight, 1),
      };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animId = 0;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const drawFrame = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Subtle atmospheric perspective grid in lower half
      const horizonY = h * 0.48;
      const vanishX = w * (0.48 + (pointerRef.current.x - 0.5) * 0.08);

      const intensity =
        phase === 'verifying' || phase === 'granted'
          ? 0.24
          : phase === 'denied'
          ? 0.2
          : 0.12;

      const strokeRgb =
        phase === 'denied' ? '255, 68, 90' : preset.primaryRgb;

      // Horizontal perspective lines
      const rows = 14;
      const scrollOffset = prefersReducedMotion ? 0 : (time * 0.35) % 1;
      for (let i = 0; i < rows; i++) {
        const t = (i + scrollOffset) / rows;
        const eased = Math.pow(t, 2.2);
        const y = horizonY + eased * (h - horizonY + 40);
        const alpha = Math.min(0.28, eased * intensity * 1.4);

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Radiating vertical perspective lines
      const cols = 18;
      for (let i = -cols; i <= cols; i++) {
        const spread = i / cols;
        const bottomX = vanishX + spread * w * 1.45;
        ctx.beginPath();
        ctx.moveTo(vanishX + spread * w * 0.14, horizonY);
        ctx.lineTo(bottomX, h);
        const centerFade = Math.max(0.02, 1 - Math.abs(spread) * 0.85);
        ctx.strokeStyle = `rgba(${strokeRgb}, ${intensity * 0.65 * centerFade})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Horizon neon laser hairline
      const horizonGrad = ctx.createLinearGradient(0, horizonY, w, horizonY);
      horizonGrad.addColorStop(0, `rgba(${strokeRgb}, 0)`);
      horizonGrad.addColorStop(0.25, `rgba(${strokeRgb}, ${intensity * 1.1})`);
      horizonGrad.addColorStop(0.5, `rgba(${preset.secondaryRgb}, ${intensity * 1.4})`);
      horizonGrad.addColorStop(0.75, `rgba(${strokeRgb}, ${intensity * 1.1})`);
      horizonGrad.addColorStop(1, `rgba(${strokeRgb}, 0)`);
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.strokeStyle = horizonGrad;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Floating subtle neon light motes
      if (!prefersReducedMotion) {
        for (let i = 0; i < 22; i++) {
          const seed = i * 1.6180339;
          const px = ((Math.sin(seed * 7.3 + time * 0.12) + 1) * 0.5) * w;
          const py = ((Math.cos(seed * 4.1 + time * 0.08) + 1) * 0.5) * h;
          const r = 1 + (i % 2) * 0.8;
          const a = 0.18 + Math.sin(time * 1.4 + seed * 3) * 0.12;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle =
            i % 3 === 0
              ? `rgba(${preset.secondaryRgb}, ${a})`
              : `rgba(${strokeRgb}, ${a})`;
          ctx.fill();
        }
      }

      if (!prefersReducedMotion) {
        time += 0.016;
        animId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [preset, phase]);

  const bloomRgb = phase === 'denied' ? '255, 68, 90' : preset.primaryRgb;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#05070c]"
    >
      {/* Volumetric radial neon light blooms */}
      <div
        className="absolute -top-44 left-[12%] h-[540px] w-[540px] rounded-full blur-[130px] transition-all duration-700"
        style={{
          background: `radial-gradient(circle, rgba(${bloomRgb}, 0.22) 0%, rgba(${bloomRgb}, 0) 70%)`,
        }}
      />
      <div
        className="absolute -bottom-48 right-[8%] h-[520px] w-[520px] rounded-full blur-[140px] transition-all duration-700"
        style={{
          background: `radial-gradient(circle, rgba(${preset.secondaryRgb}, 0.16) 0%, rgba(${preset.secondaryRgb}, 0) 70%)`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Subtle dark vignette for crisp foreground contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 35%, rgba(4, 6, 11, 0.86) 100%)',
        }}
      />
    </div>
  );
}
