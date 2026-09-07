"use client";

import { useEffect, useRef } from "react";

/**
 * Full-screen confetti burst that auto-dismisses after the animation completes.
 * Drop-in: render it whenever a payment succeeds.
 */
export default function ConfettiOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Audio chime ──────────────────────────────────────────────────────────
    const playChime = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        const ac = new AC();
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc  = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.18);
          gain.gain.setValueAtTime(0, ac.currentTime + i * 0.18);
          gain.gain.linearRampToValueAtTime(0.3, ac.currentTime + i * 0.18 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.18 + 0.6);
          osc.start(ac.currentTime + i * 0.18);
          osc.stop(ac.currentTime + i * 0.18 + 0.65);
        });
      } catch {}
    };
    playChime();

    // ── Particle factory ─────────────────────────────────────────────────────
    const COLORS = [
      "#22c55e", "#3b82f6", "#eab308", "#a855f7",
      "#ec4899", "#f97316", "#ffffff", "#06b6d4",
      "#ff4d4d", "#ffd700",
    ];
    type Shape = "square" | "circle" | "strip";
    type Particle = {
      x: number; y: number; size: number; color: string;
      vx: number; vy: number; rot: number; rotV: number;
      gravity: number; friction: number; opacity: number; shape: Shape;
    };

    const makeBurst = (count: number, speed: number): Particle[] =>
      Array.from({ length: count }, (_, i) => {
        const zone = i % 3; // 0=left, 1=right, 2=center-top
        return {
          x: zone === 0 ? 0 : zone === 1 ? canvas.width : canvas.width / 2 + (Math.random() - 0.5) * 80,
          y: zone === 2 ? -10 : canvas.height,
          size:   Math.random() * 9 + 4,
          color:  COLORS[Math.floor(Math.random() * COLORS.length)],
          vx: zone === 0 ?  Math.random() * 9 * speed + 3
            : zone === 1 ? -(Math.random() * 9 * speed + 3)
            : (Math.random() - 0.5) * 12 * speed,
          vy: zone === 2 ?  Math.random() * 8 * speed + 4
            :              -(Math.random() * 15 * speed + 8),
          rot:   Math.random() * 360,
          rotV:  (Math.random() - 0.5) * 14,
          gravity: 0.3,
          friction: 0.98,
          opacity: 1,
          shape: (["square", "circle", "strip"] as Shape[])[Math.floor(Math.random() * 3)],
        };
      });

    let particles: Particle[] = makeBurst(220, 1.0);
    let burst2Done = false;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      // Fire second burst when first wave peaks
      if (!burst2Done && particles.every(p => p.vy > -1)) {
        burst2Done = true;
        particles = [...particles, ...makeBurst(220, 1.3)];
        playChime();
      }

      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot += p.rotV;
        p.opacity -= 0.005;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "strip") {
          ctx.fillRect(-p.size / 4, -p.size * 1.5, p.size / 2, p.size * 3);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      if (alive) raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[200]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
