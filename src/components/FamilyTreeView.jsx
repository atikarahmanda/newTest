import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NODE_W, NODE_H } from "../constants";
import { buildFamilyNodes } from "../utils/treeBuilder";
import { computeFullLayout } from "../utils/treeLayout";
import FamilyTreeSVG from "./FamilyTreeSVG";
import { Icons } from "./Icons";

export default function FamilyTreeView({ persons, rels, onClickPerson, highlightId }) {
  const containerRef = useRef(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartTransform, setDragStartTransform] = useState({ x: 0, y: 0 });

  const rootNodes = useMemo(() => buildFamilyNodes(persons, rels), [persons, rels]);
  const positions = useMemo(() => computeFullLayout(rootNodes), [rootNodes]);

  // Center highlighted person
  useEffect(() => {
    if (highlightId && positions[highlightId] && containerRef.current) {
      const pos = positions[highlightId];
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({
        x: rect.width / 2 - pos.x - NODE_W / 2,
        y: rect.height / 2 - pos.y - NODE_H / 2,
        scale: 1,
      });
    }
  }, [highlightId, positions]);

  const fitView = useCallback(() => {
    if (!containerRef.current || !Object.keys(positions).length) return;

    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    Object.values(positions).forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    });

    const tw = maxX - minX + 80;
    const th = maxY - minY + 80;
    const scale = Math.min(1, rect.width / tw, rect.height / th);

    setTransform({
      x: (rect.width - tw * scale) / 2 - minX * scale + 40 * scale,
      y: (rect.height - th * scale) / 2 - minY * scale + 40 * scale,
      scale,
    });
  }, [positions]);

  useEffect(() => {
    fitView();
  }, [persons.length, rels.length, fitView]);

  const onWheel = useCallback((event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;

    setTransform((current) => {
      const newScale = Math.min(3, Math.max(0.1, current.scale * delta));
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) return { ...current, scale: newScale };

      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      return {
        x: mx - (mx - current.x) * (newScale / current.scale),
        y: my - (my - current.y) * (newScale / current.scale),
        scale: newScale,
      };
    });
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      if (event.target.closest("[data-clickable]")) return;

      setDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
      setDragStartTransform({ x: transform.x, y: transform.y });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [transform.x, transform.y]
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!dragging) return;
      setTransform((current) => ({
        ...current,
        x: dragStartTransform.x + (event.clientX - dragStart.x),
        y: dragStartTransform.y + (event.clientY - dragStart.y),
      }));
    },
    [dragging, dragStart, dragStartTransform]
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  const zoom = (factor) => {
    setTransform((current) => ({
      ...current,
      scale: Math.min(3, Math.max(0.1, current.scale * factor)),
    }));
  };

  const isEmpty = persons.length === 0;

  return (
    <div className="relative w-full h-full bg-slate-50/50" ref={containerRef}>
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center">
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
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        >
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            <FamilyTreeSVG
              rootNodes={rootNodes}
              positions={positions}
              persons={persons}
              highlightId={highlightId}
              onClickPerson={onClickPerson}
            />
          </g>
        </svg>
      )}

      {!isEmpty && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoom(1.2)}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomIn}
          </button>
          <button
            type="button"
            onClick={() => zoom(0.8)}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomOut}
          </button>
          <button
            type="button"
            onClick={fitView}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.reset}
          </button>
        </div>
      )}

      {!isEmpty && (
        <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded-lg">
          {Math.round(transform.scale * 100)}%
        </div>
      )}
    </div>
  );
}
