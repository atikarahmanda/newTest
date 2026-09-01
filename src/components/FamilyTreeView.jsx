import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NODE_W, NODE_H } from "../backend/constants";
import { buildFamilyNodes } from "../backend/treeBuilder";
import { computeFullLayout } from "../backend/treeLayout";
import FamilyTreeSVG from "./FamilyTreeSVG";
import { Icons } from "./Icons";

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;

function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export default function FamilyTreeView({ persons, rels, onClickPerson, viewKey }) {
  const containerRef = useRef(null);

  // Track active pointers for pinch-zoom
  const activePointers = useRef(new Map()); // pointerId → {x, y}
  const lastPinchDist = useRef(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartTransform, setDragStartTransform] = useState({ x: 0, y: 0 });

  const rootNodes = useMemo(() => buildFamilyNodes(persons, rels), [persons, rels]);
  const positions = useMemo(() => computeFullLayout(rootNodes), [rootNodes]);

  // ────────────────────────────────────────────────────────────
  // CENTER VIEW — zoom 100%, fokus ke generasi teratas (kakek/nenek)
  // ────────────────────────────────────────────────────────────
  const centerView = useCallback(() => {
    const el = containerRef.current;
    if (!el || !Object.keys(positions).length) return;

    const rect = el.getBoundingClientRect();
    const pts = Object.values(positions);

    // Baris paling atas = generasi tertua
    const minY = Math.min(...pts.map((p) => p.y));
    const topRow = pts.filter((p) => p.y <= minY + NODE_H / 2);

    // Tengahkan horizontal pada kakek/nenek di baris teratas
    const topMinX = Math.min(...topRow.map((p) => p.x));
    const topMaxX = Math.max(...topRow.map((p) => p.x + NODE_W));
    const topCenterX = (topMinX + topMaxX) / 2;

    const padTop = 48;

    setTransform({
      scale: 1,
      x: rect.width / 2 - topCenterX,
      y: padTop - minY,
    });
  }, [positions]);

  // Default & saat data berubah: zoom 100% di tengah
  useEffect(() => { centerView(); }, [persons.length, rels.length, centerView]);

  // Saat ranji fokus berganti (viewKey: ID orang atau "full")
  useEffect(() => { centerView(); }, [viewKey, centerView]);

  // ────────────────────────────────────────────────────────────
  // WHEEL ZOOM — must be non-passive so preventDefault() works
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e) => {
      e.preventDefault();
      // Normalize cross-browser deltaY (some trackpads send small values)
      const raw = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      const factor = raw > 0 ? 0.92 : 1 / 0.92;

      setTransform((cur) => {
        const newScale = clampScale(cur.scale * factor);
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        return {
          x: mx - (mx - cur.x) * (newScale / cur.scale),
          y: my - (my - cur.y) * (newScale / cur.scale),
          scale: newScale,
        };
      });
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []); // no deps — setTransform is always stable

  // ────────────────────────────────────────────────────────────
  // POINTER EVENTS — drag (1 pointer) + pinch zoom (2 pointers)
  // ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (event) => {
      activePointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activePointers.current.size === 1) {
        if (event.target.closest("[data-clickable]")) return;
        setDragging(true);
        setDragStart({ x: event.clientX, y: event.clientY });
        setDragStartTransform({ x: transform.x, y: transform.y });
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (activePointers.current.size === 2) {
        // Switch to pinch mode — cancel ongoing drag
        setDragging(false);
        const pts = [...activePointers.current.values()];
        lastPinchDist.current = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
      }
    },
    [transform.x, transform.y]
  );

  const onPointerMove = useCallback(
    (event) => {
      activePointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activePointers.current.size === 2) {
        const pts = [...activePointers.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

        if (lastPinchDist.current) {
          const factor = dist / lastPinchDist.current;
          const cx = (pts[0].x + pts[1].x) / 2;
          const cy = (pts[0].y + pts[1].y) / 2;
          const rect = containerRef.current?.getBoundingClientRect();

          setTransform((cur) => {
            const newScale = clampScale(cur.scale * factor);
            if (!rect) return { ...cur, scale: newScale };
            const mx = cx - rect.left;
            const my = cy - rect.top;
            return {
              x: mx - (mx - cur.x) * (newScale / cur.scale),
              y: my - (my - cur.y) * (newScale / cur.scale),
              scale: newScale,
            };
          });
        }

        lastPinchDist.current = dist;
        return;
      }

      if (!dragging) return;
      setTransform((cur) => ({
        ...cur,
        x: dragStartTransform.x + (event.clientX - dragStart.x),
        y: dragStartTransform.y + (event.clientY - dragStart.y),
      }));
    },
    [dragging, dragStart, dragStartTransform]
  );

  const onPointerUp = useCallback((event) => {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (activePointers.current.size === 0) setDragging(false);
  }, []);

  // ────────────────────────────────────────────────────────────
  // BUTTON ZOOM
  // ────────────────────────────────────────────────────────────
  const zoomBy = (factor) => {
    setTransform((cur) => ({ ...cur, scale: clampScale(cur.scale * factor) }));
  };

  const isEmpty = persons.length === 0;

  return (
    <div className="relative w-full h-full bg-slate-50/50 overflow-hidden" ref={containerRef}>
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <div className="text-center">
            <div className="text-5xl mb-3 opacity-30">🌳</div>
            <p className="text-slate-400 text-sm">Belum ada anggota keluarga</p>
            <p className="text-slate-300 text-xs mt-1">
              Tambahkan anggota untuk mulai membangun silsilah
            </p>
          </div>
        </div>
      ) : (
        <svg
          width="100%"
          height="100%"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
            display: "block",
            userSelect: "none",
          }}
        >
          <g
            transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}
          >
            <FamilyTreeSVG
              rootNodes={rootNodes}
              positions={positions}
              persons={persons}
              onClickPerson={onClickPerson}
            />
          </g>
        </svg>
      )}

      {/* ── Zoom controls (bottom-right) ── */}
      {!isEmpty && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            title="Perbesar"
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomIn}
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            title="Perkecil"
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomOut}
          </button>
          {/* Reset — zoom 100%, fokus kakek/nenek di tengah */}
          <button
            type="button"
            onClick={centerView}
            title="Reset ke 100% di tengah"
            className="w-9 h-9 rounded-xl bg-slate-700 shadow-md flex items-center justify-center text-white hover:bg-slate-600 transition-colors"
          >
            {Icons.reset}
          </button>
        </div>
      )}

      {/* ── Zoom % badge — click also fits view ── */}
      {!isEmpty && (
        <button
          type="button"
          onClick={centerView}
          title="Reset ke 100% di tengah"
          className="absolute bottom-4 left-4 text-xs text-slate-500 bg-white/90 border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors select-none"
        >
          {Math.round(transform.scale * 100)}%
        </button>
      )}
    </div>
  );
}
