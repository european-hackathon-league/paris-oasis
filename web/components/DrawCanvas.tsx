"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Pt } from "../lib/straighten";

export type DrawCanvasHandle = {
  getStrokes: () => Pt[][];
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
};

const SIZE = 512;

const DrawCanvas = forwardRef<DrawCanvasHandle, { className?: string; lineWidth?: number }>(
  function DrawCanvas({ className = "", lineWidth = 6 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const strokes = useRef<Pt[][]>([]);
    const drawing = useRef(false);
    const [, force] = useState(0);
    const lw = useRef(lineWidth);
    lw.current = lineWidth;

    const ctx = () => canvasRef.current?.getContext("2d") || null;

    const redraw = () => {
      const c = ctx();
      if (!c) return;
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, SIZE, SIZE);
      c.strokeStyle = "#111111";
      c.lineCap = "round";
      c.lineJoin = "round";
      c.lineWidth = lw.current;
      for (const s of strokes.current) {
        if (s.length < 2) { // a dot
          if (s.length === 1) { c.beginPath(); c.arc(s[0].x, s[0].y, lw.current / 2, 0, 7); c.fillStyle = "#111"; c.fill(); }
          continue;
        }
        c.beginPath();
        c.moveTo(s[0].x, s[0].y);
        for (let i = 1; i < s.length; i++) c.lineTo(s[i].x, s[i].y);
        c.stroke();
      }
    };

    useEffect(() => { redraw(); /* eslint-disable-next-line */ }, []);
    useEffect(() => { redraw(); /* eslint-disable-next-line */ }, [lineWidth]);

    const pos = (e: React.PointerEvent): Pt => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
    };

    const down = (e: React.PointerEvent) => {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      drawing.current = true;
      strokes.current.push([pos(e)]);
    };

    const move = (e: React.PointerEvent) => {
      if (!drawing.current) return;
      const c = ctx();
      if (!c) return;
      const s = strokes.current[strokes.current.length - 1];
      const prev = s[s.length - 1];
      const p = pos(e);
      s.push(p);
      c.strokeStyle = "#111111";
      c.lineWidth = lw.current;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(prev.x, prev.y);
      c.lineTo(p.x, p.y);
      c.stroke();
    };

    const up = (e: React.PointerEvent) => {
      if (!drawing.current) return;
      drawing.current = false;
      try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      force((n) => n + 1);
    };

    useImperativeHandle(ref, () => ({
      getStrokes: () => strokes.current.map((s) => s.map((p) => ({ ...p }))),
      clear: () => { strokes.current = []; redraw(); force((n) => n + 1); },
      undo: () => { strokes.current.pop(); redraw(); force((n) => n + 1); },
      isEmpty: () => strokes.current.length === 0,
    }));

    return (
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        className={`touch-none bg-white ${className}`}
        style={{ touchAction: "none" }}
      />
    );
  },
);

export default DrawCanvas;
