/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadTheatresData, withBase, type TheatreData } from "../data/theatres";
import type { VisibilityLevel } from "../data/visibility";
import { useCampaignStore } from "../store/useCampaignStore";
import type { FactionKey, OwnerKey } from "../store/useCampaignStore";
import type { Platoon, PlatoonOrder, Contest } from "../domain/types";

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

type ViewBox = { x: number; y: number; w: number; h: number };
type HoverState = { tid: string; x: number; y: number } | null;

const baseFactionColors: Record<"allies" | "axis" | "ussr", string> = {
  allies: "#2563eb",
  axis: "#dc2626",
  ussr: "#f97316",
};

function getOwnerFill(owner: string, customs: Array<{ id: string; color: string }>) {
  if (owner === "neutral") return "#6b7280";
  if (owner === "contested") return "#a855f7";

  if (owner === "allies" || owner === "axis" || owner === "ussr") return baseFactionColors[owner];

  if (owner.startsWith("custom:")) {
    const id = owner.slice("custom:".length);
    const c = customs.find((x) => x.id === id);
    return c?.color ?? "#22c55e";
  }

  return "#6b7280";
}

function getFactionStroke(f: string, customs: Array<{ id: string; color: string }>) {
  if (f === "allies" || f === "axis" || f === "ussr") return baseFactionColors[f];
  if (f.startsWith("custom:")) {
    const id = f.slice("custom:".length);
    return customs.find((x) => x.id === id)?.color ?? "#22c55e";
  }
  return "#ffffff";
}

function parseViewBox(svg: SVGSVGElement): ViewBox {
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const [x, y, w, h] = vb.split(/\s+/).map(Number);
    if ([x, y, w, h].every(Number.isFinite)) return { x, y, w, h };
  }
  const bb = svg.getBBox();
  return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
}
function stripSvgBackground(svg: SVGSVGElement) {
  // 1) kill common inline white backgrounds
  svg.style.background = "transparent";

  // 2) remove or neutralize any full-canvas rects (most common cause)
  const vb = parseViewBox(svg);
  const rects = Array.from(svg.querySelectorAll("rect"));

  for (const r of rects) {
    const fill = (r.getAttribute("fill") || "").toLowerCase();
    const wAttr = r.getAttribute("width") || "";
    const hAttr = r.getAttribute("height") || "";
    const x = Number(r.getAttribute("x") || "0");
    const y = Number(r.getAttribute("y") || "0");
    const w = Number(wAttr);
    const h = Number(hAttr);

    const looksLikeFull =
      (wAttr === "100%" && hAttr === "100%") ||
      (Number.isFinite(w) && Number.isFinite(h) && w >= vb.w * 0.95 && h >= vb.h * 0.95);

    const looksLikeTopLeft = Math.abs(x - vb.x) < vb.w * 0.05 && Math.abs(y - vb.y) < vb.h * 0.05;

    const looksWhite =
      fill === "#fff" ||
      fill === "#ffffff" ||
      fill === "white" ||
      fill === "rgb(255,255,255)";

    if (looksLikeFull && looksLikeTopLeft && looksWhite) {
      // safest: neutralise rather than delete
      r.setAttribute("fill", "none");
      r.style.fill = "none";
      r.style.pointerEvents = "none";
    }
  }
}

function setViewBox(svg: SVGSVGElement, vb: ViewBox) {
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

function territoryCenter(svg: SVGSVGElement, shapeIds: string[]) {
  let n = 0;
  let sx = 0;
  let sy = 0;

  for (const id of shapeIds) {
    const el = svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`);
    if (!el) continue;
    const bb = el.getBBox();
    sx += bb.x + bb.width / 2;
    sy += bb.y + bb.height / 2;
    n++;
  }
  if (!n) return null;
  return { x: sx / n, y: sy / n };
}

function wireZoomPanImpl(svg: SVGSVGElement, hostEl: HTMLDivElement, setVbState?: (vb: ViewBox) => void) {
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
    set: (vb: ViewBox) => update(vb),
  };

  const cleanup = () => {
    hostEl.removeEventListener("wheel", onWheel as any);
    hostEl.removeEventListener("mousedown", onMouseDown as any);
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  };

  return { api, cleanup };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function MapBoard() {
  const svgHostRef = useRef<HTMLDivElement>(null);

  // We keep vb because we project SVG coords -> screen coords for overlays.
  const [vb, setVb] = useState<ViewBox | null>(null);

  const [hover, setHover] = useState<HoverState>(null);

  const zoomApiRef = useRef<null | {
    reset: () => void;
    fit: () => void;
    zoom: (d: "in" | "out") => void;
    set: (vb: ViewBox) => void;
  }>(null);

  const [data, setData] = useState<TheatreData | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  // store
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);

  const customs = useCampaignStore((s) => s.customs);

  const activeTheatres = useCampaignStore((s) => s.activeTheatres);

  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const selectedRegionId = useCampaignStore((s) => s.selectedRegionId);
  const regions = useCampaignStore((s) => s.regions);

  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);
  const homelands = useCampaignStore((s) => s.homelands);

  const platoonsById = useCampaignStore((s) => s.platoonsById);

  const locksByTerritory = useCampaignStore((s) => s.locksByTerritory);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);

  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const ordersByTurn = useCampaignStore((s) => s.ordersByTurn);

  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);
  const setHomeland = useCampaignStore((s) => s.setHomeland);
  const applyHomeland = useCampaignStore((s) => s.applyHomeland);

  const didDefaultZoomRef = useRef(false);

  // derive territories visible in current theatre selection
  const { allowedShapeIds, shapeToTerritory, territoriesById } = useMemo(() => {
    const allowed = new Set<string>();
    const shapeMap = new Map<string, TerritoryInfo>();
    const terrMap = new Map<string, TerritoryInfo>();

    if (data) {
      for (const th of data.theatres) {
        if (!activeTheatres[th.theatreId as keyof typeof activeTheatres]) continue;

        for (const t of th.territories) {
          const info: TerritoryInfo = {
            id: t.id,
            name: t.name,
            theatreId: th.theatreId,
            theatreTitle: th.title,
            shapeRefs: t.shapeRefs ?? [],
          };

          terrMap.set(info.id, info);

          for (const shapeId of info.shapeRefs) {
            allowed.add(shapeId);
            shapeMap.set(shapeId, info);
          }
        }
      }
    }

    return { allowedShapeIds: allowed, shapeToTerritory: shapeMap, territoriesById: terrMap };
  }, [activeTheatres, data]);

  // Visible platoons rules (GM sees all; player sees own + intel-eligible enemies)
  const visiblePlatoons = useMemo(() => {
    const gm = viewerMode === "GM";
    const platoons = Object.values(platoonsById) as Platoon[];
    if (!platoons.length) return [];

    if (gm) return platoons;

    return platoons.filter((p) => {
      if (p.faction === viewerFaction) return true;
      const lvl = intelByTerritory[p.territoryId]?.[viewerFaction] ?? "NONE";
      return lvl === "SCOUTED" || lvl === "FULL";
    });
  }, [viewerMode, platoonsById, viewerFaction, intelByTerritory]);

  const platoonsByTerritory = useMemo(() => {
    const m = new Map<string, Platoon[]>();
    for (const p of visiblePlatoons) {
      const list = m.get(p.territoryId) ?? [];
      list.push(p);
      m.set(p.territoryId, list);
    }
    return m;
  }, [visiblePlatoons]);

  const clearSelectionStyles = useCallback((svg: SVGSVGElement) => {
    svg.querySelectorAll<SVGPathElement>("path").forEach((p) => {
      p.style.opacity = "0.20";
      p.style.stroke = "#111";
      p.style.strokeWidth = "0.6";
      p.style.cursor = "default";
      p.style.pointerEvents = "none";
    });
  }, []);

  const applyFogStyles = useCallback(
    (svg: SVGSVGElement) => {
      const { viewerFaction, intelByTerritory, ownerByTerritory, customs, homelands, viewerMode } =
        useCampaignStore.getState();

      const gm = viewerMode === "GM";
      clearSelectionStyles(svg);

      const homelandId = homelands?.[viewerFaction] ?? null;

      allowedShapeIds.forEach((shapeId) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
        if (!p) return;

        if (!p.dataset.baseFill) {
          const attrFill = p.getAttribute("fill");
          p.dataset.baseFill = attrFill && attrFill !== "none" ? attrFill : "#444";
        }

        p.style.cursor = "pointer";
        p.style.pointerEvents = "auto";
        p.style.stroke = "#1a1a1a";
        p.style.strokeWidth = "0.8";

        const territory = shapeToTerritory.get(shapeId);
        if (!territory) return;

        const level: VisibilityLevel = gm ? "FULL" : (intelByTerritory[territory.id]?.[viewerFaction] ?? "NONE");

        if (level === "NONE") {
          p.style.opacity = "0.25";
          p.style.fill = p.dataset.baseFill!;
        } else if (level === "KNOWN") {
          p.style.opacity = "0.65";
          p.style.fill = p.dataset.baseFill!;
        } else {
          const owner = ownerByTerritory[territory.id] ?? "neutral";
          p.style.opacity = "0.85";
          p.style.fill = getOwnerFill(owner, customs);
        }

        if (homelandId && territory.id === homelandId) {
          p.style.opacity = "1";
          p.style.stroke = "#ffffff";
          p.style.strokeWidth = "2.6";
        }
      });
    },
    [clearSelectionStyles, allowedShapeIds, shapeToTerritory]
  );

  // theatre key for refit
  const theatresKey = useMemo(
    () => (["WE", "EE", "NA", "PA"] as const).filter((k) => activeTheatres[k]).join("|"),
    [activeTheatres]
  );

  const fitToAllowed = useCallback(
    (svg: SVGSVGElement) => {
      const els = Array.from(allowedShapeIds)
        .map((id) => svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`))
        .filter(Boolean) as SVGGraphicsElement[];

      if (els.length === 0) return;

      let bb = els[0].getBBox();
      let minX = bb.x,
        minY = bb.y,
        maxX = bb.x + bb.width,
        maxY = bb.y + bb.height;

      for (let i = 1; i < els.length; i++) {
        bb = els[i].getBBox();
        minX = Math.min(minX, bb.x);
        minY = Math.min(minY, bb.y);
        maxX = Math.max(maxX, bb.x + bb.width);
        maxY = Math.max(maxY, bb.y + bb.height);
      }

      const pad = 20;
      const next: ViewBox = {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      };

      if (zoomApiRef.current?.set) zoomApiRef.current.set(next);
      else setViewBox(svg, next);
    },
    [allowedShapeIds]
  );

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    applyFogStyles(svg);
    fitToAllowed(svg);
  }, [theatresKey, applyFogStyles, fitToAllowed]);

  const highlightTerritory = useCallback(
    (svg: SVGSVGElement, territory: TerritoryInfo) => {
      applyFogStyles(svg);

      territory.shapeRefs.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;
        p.style.opacity = "1";
        p.style.stroke = "#ffffff";
        p.style.strokeWidth = "2";
      });
    },
    [applyFogStyles]
  );

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    if (!selectedTerritoryId) return;

    const territory = territoriesById.get(selectedTerritoryId);
    if (!territory) return;

    setSelected({
      territoryId: territory.id,
      territoryName: territory.name,
      theatreId: territory.theatreId,
      theatreTitle: territory.theatreTitle,
      clickedShapeId: territory.shapeRefs[0] ?? "",
    });

    highlightTerritory(svg, territory);
  }, [territoriesById, highlightTerritory, selectedTerritoryId]);

  const highlightRegion = useCallback(
    (svg: SVGSVGElement, territoryIds: string[]) => {
      applyFogStyles(svg);

      const ids = new Set(territoryIds);
      for (const info of territoriesById.values()) {
        if (!ids.has(info.id)) continue;

        for (const shapeId of info.shapeRefs) {
          const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
          if (!p) continue;
          p.style.opacity = "1";
          p.style.stroke = "#ffd166";
          p.style.strokeWidth = "1.6";
        }
      }
    },
    [applyFogStyles, territoriesById]
  );

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    if (!selectedRegionId) return;

    const region = regions.find((r) => r.id === selectedRegionId);
    if (!region) return;

    highlightRegion(svg, region.territories);
  }, [highlightRegion, regions, selectedRegionId]);

  const wireTerritoryEvents = useCallback(
    (svg: SVGSVGElement) => {
      const cleanups: Array<() => void> = [];

      const makeFactionKeyFromSetup = () => {
        const { selectedSetupFaction, selectedCustomId } = useCampaignStore.getState();
        if (selectedSetupFaction === "custom") {
          return selectedCustomId ? (`custom:${selectedCustomId}` as const) : null;
        }
        if (selectedSetupFaction) return selectedSetupFaction;
        return null;
      };

      allowedShapeIds.forEach((shapeId) => {
        const path = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
        if (!path) return;

        const onClick = (e: MouseEvent) => {
          e.stopPropagation();

          const territory = shapeToTerritory.get(shapeId);
          if (!territory) return;

          setSelectedTerritory(territory.id);

          const { mode } = useCampaignStore.getState();
          if (mode === "SETUP") {
            const fk = makeFactionKeyFromSetup();
            if (fk) {
              setHomeland(fk, territory.id);
              applyHomeland(fk);
            }
          }

          setSelected({
            territoryId: territory.id,
            territoryName: territory.name,
            theatreId: territory.theatreId,
            theatreTitle: territory.theatreTitle,
            clickedShapeId: shapeId,
          });

          highlightTerritory(svg, territory);
        };

        const onEnter = (e: MouseEvent) => {
          const territory = shapeToTerritory.get(shapeId);
          if (!territory) return;
          setHover({ tid: territory.id, x: e.clientX, y: e.clientY });
        };

        const onMove = (e: MouseEvent) => {
          setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : null));
        };

        const onLeave = () => setHover(null);

        path.addEventListener("click", onClick);
        path.addEventListener("mouseenter", onEnter);
        path.addEventListener("mousemove", onMove);
        path.addEventListener("mouseleave", onLeave);

        cleanups.push(() => {
          path.removeEventListener("click", onClick);
          path.removeEventListener("mouseenter", onEnter);
          path.removeEventListener("mousemove", onMove);
          path.removeEventListener("mouseleave", onLeave);
        });
      });

      const onSvgClick = () => {
        setSelected(null);
        applyFogStyles(svg);
      };

      svg.addEventListener("click", onSvgClick);
      cleanups.push(() => svg.removeEventListener("click", onSvgClick));

      return () => cleanups.forEach((fn) => fn());
    },
    [allowedShapeIds, shapeToTerritory, setSelectedTerritory, setHomeland, applyHomeland, highlightTerritory, applyFogStyles]
  );

  const wireZoomPan = useCallback(
    (svg: SVGSVGElement, hostEl: HTMLDivElement) => wireZoomPanImpl(svg, hostEl, setVb),
    []
  );

  useEffect(() => {
    loadTheatresData()
      .then((nd) => setData(nd.raw))
      .catch((err) => console.error("Failed to load theatres_all.json", err));
  }, []);

  // Territory centers in SVG coordinates
  const [territoryCenters, setTerritoryCenters] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!data) return;

    const svgUrl = withBase("mapchart_world.svg");

    let cleanupClicks: null | (() => void) = null;
    let cleanupZoom: null | (() => void) = null;

    fetch(svgUrl)
      .then((r) => r.text())
      .then((svgText) => {
        if (!svgHostRef.current) return;

        svgHostRef.current.innerHTML = svgText;

        const svg = svgHostRef.current.querySelector("svg");
        if (!svg) return;

        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.display = "block";
        
        stripSvgBackground(svg);
        applyFogStyles(svg);
        cleanupClicks = wireTerritoryEvents(svg);

        const hostEl = svgHostRef.current!;
        const { api, cleanup } = wireZoomPan(svg, hostEl);
        zoomApiRef.current = api;
        cleanupZoom = cleanup;

        fitToAllowed(svg);

        // compute centers for visible territories
        const nextCenters: Record<string, { x: number; y: number }> = {};
        for (const t of territoriesById.values()) {
          const c = territoryCenter(svg, t.shapeRefs);
          if (c) nextCenters[t.id] = c;
        }
        setTerritoryCenters(nextCenters);

        if (!didDefaultZoomRef.current) {
          didDefaultZoomRef.current = true;
          api.zoom("in");
          api.zoom("in");
        }
      })
      .catch((err) => console.error("Failed to load SVG", err));

    return () => {
      cleanupClicks?.();
      cleanupZoom?.();
      zoomApiRef.current = null;
    };
  }, [data, applyFogStyles, wireTerritoryEvents, wireZoomPan, fitToAllowed, territoriesById]);

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    if (selected) {
      const territory = territoriesById.get(selected.territoryId);
      if (territory) highlightTerritory(svg, territory);
      else applyFogStyles(svg);
    } else {
      applyFogStyles(svg);
    }
  }, [viewerFaction, intelByTerritory, ownerByTerritory, homelands, selected, territoriesById, applyFogStyles, highlightTerritory]);

  // project SVG point -> screen pixel within host
  const project = useCallback(
    (pt: { x: number; y: number }) => {
      const host = svgHostRef.current;
      if (!host || !vb) return null;

      const rect = host.getBoundingClientRect();
      return {
        x: ((pt.x - vb.x) / vb.w) * rect.width,
        y: ((pt.y - vb.y) / vb.h) * rect.height,
      };
    },
    [vb]
  );

  // which territory IDs get overlay markers (GM: all visible; Player: >= KNOWN)
  const markerTerritoryIds = useMemo(() => {
    const gm = viewerMode === "GM";
    const ids: string[] = [];

    for (const tid of territoriesById.keys()) {
      if (gm) {
        ids.push(tid);
        continue;
      }
      const lvl = intelByTerritory[tid]?.[viewerFaction] ?? "NONE";
      if (lvl === "NONE") continue;
      ids.push(tid);
    }
    return ids;
  }, [viewerMode, territoriesById, intelByTerritory, viewerFaction]);

  // --- Movement overlays (current turn) ---
  type MoveRender = {
    orderId: string;
    faction: FactionKey;
    submitted: boolean;
    pointsSvg: Array<{ x: number; y: number }>;
  };

  const moveRenders = useMemo<MoveRender[]>(() => {
    const byTurn = ordersByTurn[turnNumber] ?? {};

    const factions: FactionKey[] =
      viewerMode === "GM" ? (Object.keys(byTurn) as FactionKey[]) : ([viewerFaction] as FactionKey[]);

    const renders: MoveRender[] = [];

    for (const f of factions) {
      const list = (byTurn[f] ?? []) as PlatoonOrder[];
      for (const o of list) {
        if (o.type !== "MOVE") continue;

        const path = o.path ?? [];
        if (!path.length) continue;

        // from can be missing; fall back to current platoon location
        const fromTid = o.from ?? platoonsById[o.platoonId]?.territoryId;
        if (!fromTid) continue;

        const chain = [fromTid, ...path];

        // Require centers for all points (otherwise skip)
        const pointsSvg: Array<{ x: number; y: number }> = [];
        let ok = true;
        for (const tid of chain) {
          const c = territoryCenters[tid];
          if (!c) {
            ok = false;
            break;
          }
          pointsSvg.push(c);
        }
        if (!ok) continue;

        renders.push({
          orderId: o.id,
          faction: f,
          submitted: !!o.submittedAt,
          pointsSvg,
        });
      }
    }

    return renders;
  }, [ordersByTurn, turnNumber, viewerMode, viewerFaction, platoonsById, territoryCenters]);

  // convert movement lines to screen-space paths (fast + stable)
  const movementPaths = useMemo(() => {
    if (!vb || !svgHostRef.current) return [];

    const hostRect = svgHostRef.current.getBoundingClientRect();

    const toPx = (p: { x: number; y: number }) => ({
      x: ((p.x - vb.x) / vb.w) * hostRect.width,
      y: ((p.y - vb.y) / vb.h) * hostRect.height,
    });

    return moveRenders
      .map((m) => {
        const pts = m.pointsSvg.map(toPx);
        if (pts.length < 2) return null;

        const d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} ` + pts
          .slice(1)
          .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");

        return {
          key: `${m.faction}:${m.orderId}`,
          faction: m.faction,
          submitted: m.submitted,
          d,
          end: pts[pts.length - 1],
        };
      })
      .filter(Boolean) as Array<{ key: string; faction: FactionKey; submitted: boolean; d: string; end: { x: number; y: number } }>;
  }, [moveRenders, vb]);

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* MAP */}
      <div style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        <div
          ref={svgHostRef}
          style={{
            height: "100%",
            minHeight: 0,
            background: "#3a372f",
            overflow: "hidden",
            position: "relative",
          }}
        />

        {/* Movement overlay (screen-space SVG on top) */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          {movementPaths.map((p) => {
            const stroke = getFactionStroke(p.faction, customs);
            return (
              <g key={p.key}>
                <path
                  d={p.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2.2}
                  strokeOpacity={p.submitted ? 0.9 : 0.55}
                  strokeDasharray={p.submitted ? undefined : "6 6"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* endpoint dot */}
                <circle
                  cx={p.end.x}
                  cy={p.end.y}
                  r={3.4}
                  fill={stroke}
                  opacity={p.submitted ? 0.95 : 0.6}
                />
              </g>
            );
          })}
        </svg>

        {/* Marker overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          {markerTerritoryIds.map((tid) => {
            const c = territoryCenters[tid];
            if (!c) return null;

            const p = project(c);
            if (!p || !svgHostRef.current) return null;

            const rect = svgHostRef.current.getBoundingClientRect();
            const x = clamp(p.x, 10, rect.width - 10);
            const y = clamp(p.y, 10, rect.height - 10);

            const owner = (ownerByTerritory[tid] ?? "neutral") as OwnerKey;
            const ownerColor = getOwnerFill(owner, customs);

            const locked = !!locksByTerritory[tid];
            const contest = contestsByTerritory[tid] as Contest | undefined;

            const homelandId = homelands?.[viewerFaction] ?? null;
            const isHomeland = homelandId === tid;

            const platoons = platoonsByTerritory.get(tid) ?? [];
            const friendlyCount = platoons.filter((pl) => pl.faction === viewerFaction).length;
            const enemyCount = platoons.length - friendlyCount;

            return (
              <div
                key={tid}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {/* Owner dot */}
                <div
                  title={`Owner: ${owner}`}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: ownerColor,
                    border: isHomeland ? "2px solid #fff" : "1px solid rgba(0,0,0,.45)",
                    boxShadow: "0 1px 6px rgba(0,0,0,.45)",
                  }}
                />

                {/* Status icons */}
                {(locked || contest) && (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {locked && (
                      <div
                        title="Locked (combat)"
                        style={{
                          fontSize: 11,
                          padding: "1px 5px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,.55)",
                          border: "1px solid rgba(255,255,255,.18)",
                          color: "#fff",
                          lineHeight: 1.2,
                        }}
                      >
                        🔒
                      </div>
                    )}

                    {contest && (
                      <div
                        title={`Contest: ${contest.attackerFaction} vs ${contest.defenderFaction} (${contest.status})`}
                        style={{
                          fontSize: 11,
                          padding: "1px 5px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,.55)",
                          border: "1px solid rgba(255,255,255,.18)",
                          color: "#fff",
                          lineHeight: 1.2,
                        }}
                      >
                        ⚔
                      </div>
                    )}
                  </div>
                )}

                {/* Platoon counts */}
                {platoons.length > 0 && (
                  <div
                    title={
                      viewerMode === "GM"
                        ? `Platoons: ${platoons.length}`
                        : `Platoons (visible): friendly ${friendlyCount}, enemy ${enemyCount}`
                    }
                    style={{
                      fontSize: 11,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,.55)",
                      border: "1px solid rgba(255,255,255,.18)",
                      color: "#fff",
                      lineHeight: 1.2,
                    }}
                  >
                    {viewerMode === "GM" ? platoons.length : `${friendlyCount}${enemyCount ? `+${enemyCount}` : ""}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay controls */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            gap: 6,
            padding: 8,
            background: "rgba(0,0,0,.35)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 8,
            zIndex: 5,
          }}
        >
          <button onClick={() => zoomApiRef.current?.zoom("in")}>+</button>
          <button onClick={() => zoomApiRef.current?.zoom("out")}>-</button>
          <button onClick={() => zoomApiRef.current?.fit()}>Fit</button>
          <button onClick={() => zoomApiRef.current?.reset()}>Reset</button>

          {vb && (
            <div style={{ marginLeft: 10, fontSize: 11, opacity: 0.85, color: "#fff" }}>
              VB {vb.w.toFixed(0)}×{vb.h.toFixed(0)}
            </div>
          )}
        </div>

        {/* Hover tooltip */}
        {hover &&
          (() => {
            const tid = hover.tid;
            const terr = territoriesById.get(tid);
            if (!terr) return null;

            const owner = ownerByTerritory[tid] ?? "neutral";
            const locked = !!locksByTerritory[tid];
            const contest = contestsByTerritory[tid] as Contest | undefined;

            const gm = viewerMode === "GM";
            const level: VisibilityLevel = gm ? "FULL" : (intelByTerritory[tid]?.[viewerFaction] ?? "NONE");

            const platoons = platoonsByTerritory.get(tid) ?? [];

            return (
              <div
                style={{
                  position: "fixed",
                  left: hover.x + 12,
                  top: hover.y + 12,
                  zIndex: 20,
                  background: "rgba(0,0,0,.78)",
                  border: "1px solid rgba(255,255,255,.18)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  maxWidth: 280,
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {terr.name} <span style={{ opacity: 0.75 }}>({tid})</span>
                </div>
                <div style={{ opacity: 0.9 }}>
                  <b>Owner:</b> {owner}
                </div>
                <div style={{ opacity: 0.9 }}>
                  <b>Intel:</b> {level}
                </div>
                {locked && (
                  <div style={{ opacity: 0.95, marginTop: 4 }}>
                    <b>Locked:</b> COMBAT
                  </div>
                )}
                {contest && (
                  <div style={{ opacity: 0.95, marginTop: 4 }}>
                    <b>Contest:</b> {contest.attackerFaction} vs {contest.defenderFaction} ({contest.status})
                  </div>
                )}

                {platoons.length > 0 && (
                  <div style={{ marginTop: 6, opacity: 0.95 }}>
                    <b>Platoons:</b>
                    <div style={{ marginTop: 2, opacity: 0.9 }}>
                      {platoons.slice(0, 6).map((p) => (
                        <div key={p.id}>
                          • {p.name} ({p.faction})
                        </div>
                      ))}
                      {platoons.length > 6 && <div>… +{platoons.length - 6} more</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Hint */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "6px 8px",
            background: "rgba(0,0,0,.35)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 8,
            fontSize: 12,
            opacity: 0.9,
            zIndex: 5,
            pointerEvents: "none",
            color: "#fff",
          }}
        >
          Pan: hold <b>Shift</b> + drag (or middle mouse). Wheel to zoom.
        </div>
      </div>

      {/* INFO PANEL */}
      <div
        style={{
          width: 340,
          minWidth: 340,
          maxWidth: 340,
          padding: 12,
          borderLeft: "1px solid rgba(255,255,255,.12)",
          overflow: "auto",
        }}
      >
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
            {useCampaignStore.getState().mode === "SETUP" && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Setup mode: click sets homeland for selected faction.
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
              <div>
                <b>Turn:</b> {turnNumber}
              </div>
              <div>
                <b>Viewer:</b> {viewerMode} ({viewerFaction})
              </div>
            </div>
          </div>
        ) : (
          <div>Click a territory (only your campaign territories are clickable)</div>
        )}
      </div>
    </div>
  );
}
