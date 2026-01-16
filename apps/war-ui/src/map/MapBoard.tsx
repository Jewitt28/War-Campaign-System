/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedData } from "../data/theatres";

type TheatreData = {
  schemaVersion: string;
  theatres: Array<{
    theatreId: string;
    title: string;
    territories: Array<{
      id: string; // e.g. "WE-01"
      name: string;
      shapeRefs: string[]; // e.g. ["United_Kingdom_UK_1", ...]
    }>;
  }>;
};

type TerritoryInfo = {
  id: string;
  name: string;
  theatreId: string;
  theatreTitle: string;
  shapeRefs: string[];
};

type Selection = {
  territoryId: string;
  territoryName: string;
  theatreId: string;
  theatreTitle: string;
  clickedShapeId: string;
};

type MapBoardProps = {
  data: NormalizedData | null;
};

type ViewBox = { x: number; y: number; w: number; h: number };

function parseViewBox(svg: SVGSVGElement): ViewBox {
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const [x, y, w, h] = vb.split(/\s+/).map(Number);
    if ([x, y, w, h].every(Number.isFinite)) return { x, y, w, h };
  }
  const bb = svg.getBBox();
  return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
}

function setViewBox(svg: SVGSVGElement, vb: ViewBox) {
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

function wireZoomPanImpl(
  svg: SVGSVGElement,
  hostEl: HTMLDivElement,
  setVbState?: (vb: ViewBox) => void
) {
  const base = parseViewBox(svg);
  let current = { ...base };

  (svg as any).__baseViewBox = base;
  (svg as any).__currentViewBox = current;

  const update = (vb: ViewBox) => {
    current = vb;
    (svg as any).__currentViewBox = current;
    setViewBox(svg, current);
    setVbState?.(current);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = hostEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const vx = current.x + (mx / rect.width) * current.w;
    const vy = current.y + (my / rect.height) * current.h;

    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 0.9 : 1.1;

    const newW = current.w * factor;
    const newH = current.h * factor;

    const minW = base.w * 0.25;
    const maxW = base.w * 2.5;
    const clampedW = Math.min(Math.max(newW, minW), maxW);
    const clampedH = (clampedW / newW) * newH;

    const nx = vx - ((vx - current.x) * clampedW) / current.w;
    const ny = vy - ((vy - current.y) * clampedH) / current.h;

    update({ x: nx, y: ny, w: clampedW, h: clampedH });
  };

  hostEl.addEventListener("wheel", onWheel, { passive: false });

  let dragging = false;
  let start = { x: 0, y: 0 };
  let startVB = { ...current };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e as any).shiftKey)) {
      dragging = true;
      start = { x: e.clientX, y: e.clientY };
      startVB = { ...current };
      hostEl.style.cursor = "grabbing";
      e.preventDefault();
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;

    const rect = hostEl.getBoundingClientRect();
    const dxPx = e.clientX - start.x;
    const dyPx = e.clientY - start.y;

    const dx = (dxPx / rect.width) * startVB.w;
    const dy = (dyPx / rect.height) * startVB.h;

    update({ x: startVB.x - dx, y: startVB.y - dy, w: startVB.w, h: startVB.h });
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    hostEl.style.cursor = "default";
  };

  hostEl.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  const api = {
    reset: () => update({ ...base }),
    fit: () => {
      const bb = svg.getBBox();
      update({ x: bb.x, y: bb.y, w: bb.width, h: bb.height });
    },
    zoom: (dir: "in" | "out") => {
      const factor = dir === "in" ? 0.9 : 1.1;
      const cx = current.x + current.w / 2;
      const cy = current.y + current.h / 2;
      update({
        x: cx - (current.w * factor) / 2,
        y: cy - (current.h * factor) / 2,
        w: current.w * factor,
        h: current.h * factor,
      });
    },
  };

  const cleanup = () => {
    hostEl.removeEventListener("wheel", onWheel as any);
    hostEl.removeEventListener("mousedown", onMouseDown as any);
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  };

  return { api, cleanup };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MapBoard({ data: _normalizedData }: MapBoardProps) {
  const svgHostRef = useRef<HTMLDivElement>(null);

  // Keep for debugging if you want to display it later
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_vb, setVb] = useState<ViewBox | null>(null);

  const zoomApiRef = useRef<null | { reset: () => void; fit: () => void; zoom: (d: "in" | "out") => void }>(null);

  const [data, setData] = useState<TheatreData | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  const { allowedShapeIds, shapeToTerritory } = useMemo(() => {
    const allowed = new Set<string>();
    const map = new Map<string, TerritoryInfo>();

    if (data) {
      for (const th of data.theatres) {
        for (const t of th.territories) {
          const info: TerritoryInfo = {
            id: t.id,
            name: t.name,
            theatreId: th.theatreId,
            theatreTitle: th.title,
            shapeRefs: t.shapeRefs ?? [],
          };

          for (const shapeId of info.shapeRefs) {
            allowed.add(shapeId);
            map.set(shapeId, info);
          }
        }
      }
    }

    return { allowedShapeIds: allowed, shapeToTerritory: map };
  }, [data]);

  const clearSelectionStyles = useCallback((svg: SVGSVGElement) => {
    svg.querySelectorAll<SVGPathElement>("path").forEach((p) => {
      p.style.opacity = "0.35";
      p.style.stroke = "#111";
      p.style.strokeWidth = "0.6";
      p.style.cursor = "default";
      p.style.pointerEvents = "none";
    });
  }, []);

  const enableTerritoryShapes = useCallback(
    (svg: SVGSVGElement) => {
      clearSelectionStyles(svg);

      allowedShapeIds.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;

        p.style.opacity = "0.9";
        p.style.cursor = "pointer";
        p.style.pointerEvents = "auto";
        p.style.stroke = "#1a1a1a";
        p.style.strokeWidth = "0.8";
      });
    },
    [allowedShapeIds, clearSelectionStyles]
  );

  const highlightTerritory = useCallback(
    (svg: SVGSVGElement, territory: TerritoryInfo) => {
      allowedShapeIds.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;
        p.style.opacity = "0.35";
        p.style.stroke = "#222";
        p.style.strokeWidth = "0.8";
      });

      territory.shapeRefs.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;
        p.style.opacity = "1";
        p.style.stroke = "#ffffff";
        p.style.strokeWidth = "2";
      });
    },
    [allowedShapeIds]
  );

  const wireTerritoryClicks = useCallback(
    (svg: SVGSVGElement) => {
      const cleanups: Array<() => void> = [];

      allowedShapeIds.forEach((shapeId) => {
        const path = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
        if (!path) return;

        const onClick = (e: MouseEvent) => {
          e.stopPropagation();

          const territory = shapeToTerritory.get(shapeId);
          if (!territory) return;

          setSelected({
            territoryId: territory.id,
            territoryName: territory.name,
            theatreId: territory.theatreId,
            theatreTitle: territory.theatreTitle,
            clickedShapeId: shapeId,
          });

          highlightTerritory(svg, territory);
        };

        path.addEventListener("click", onClick);
        cleanups.push(() => path.removeEventListener("click", onClick));
      });

      const onSvgClick = () => {
        setSelected(null);
        enableTerritoryShapes(svg);
      };

      svg.addEventListener("click", onSvgClick);
      cleanups.push(() => svg.removeEventListener("click", onSvgClick));

      return () => cleanups.forEach((fn) => fn());
    },
    [allowedShapeIds, shapeToTerritory, highlightTerritory, enableTerritoryShapes]
  );

  const wireZoomPan = useCallback(
    (svg: SVGSVGElement, hostEl: HTMLDivElement) => wireZoomPanImpl(svg, hostEl, setVb),
    []
  );

  useEffect(() => {
    fetch("/theatres_all.json")
      .then((r) => r.json())
      .then((j: TheatreData) => setData(j))
      .catch((err) => console.error("Failed to load theatres_all.json", err));
  }, []);

  useEffect(() => {
    if (!data) return;

    let cleanupClicks: null | (() => void) = null;
    let cleanupZoom: null | (() => void) = null;

    fetch("/mapchart_world.svg")
      .then((r) => r.text())
      .then((svgText) => {
        if (!svgHostRef.current) return;

        svgHostRef.current.innerHTML = svgText;

        const svg = svgHostRef.current.querySelector("svg");
        if (!svg) return;

        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";

        enableTerritoryShapes(svg);
        cleanupClicks = wireTerritoryClicks(svg);

        const hostEl = svgHostRef.current!;
        const { api, cleanup } = wireZoomPan(svg, hostEl);
        zoomApiRef.current = api;
        cleanupZoom = cleanup;
      })
      .catch((err) => console.error("Failed to load SVG", err));

    return () => {
      cleanupClicks?.();
      cleanupZoom?.();
      zoomApiRef.current = null;
    };
  }, [data, enableTerritoryShapes, wireTerritoryClicks, wireZoomPan]);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        ref={svgHostRef}
        style={{
          flex: 1,
          background: "#3a372f",
          overflow: "hidden",
        }}
      />

      <div
        style={{
          width: 320,
          padding: 12,
          borderLeft: "1px solid #555",
          background: "#2b2923",
          color: "#eee",
          fontSize: 14,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Selection</h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => zoomApiRef.current?.zoom("in")}>+</button>
          <button onClick={() => zoomApiRef.current?.zoom("out")}>-</button>
          <button onClick={() => zoomApiRef.current?.fit()}>Fit</button>
          <button onClick={() => zoomApiRef.current?.reset()}>Reset</button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Pan: hold <b>Shift</b> + drag (or middle mouse). Wheel to zoom.
        </div>

        {!data && <div>Loading theatres…</div>}

        {selected ? (
          <div style={{ lineHeight: 1.5 }}>
            <div>
              <strong>Territory:</strong> {selected.territoryName} ({selected.territoryId})
            </div>
            <div>
              <strong>Theatre:</strong> {selected.theatreTitle} ({selected.theatreId})
            </div>
            <div style={{ opacity: 0.8, marginTop: 8 }}>
              <strong>Clicked shape:</strong> {selected.clickedShapeId}
            </div>
          </div>
        ) : (
          <div>Click a territory (only your campaign territories are clickable)</div>
        )}
      </div>
    </div>
  );
}
