/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadTheatresData, withBase, type TheatreData } from "../data/theatres";
import type { VisibilityLevel } from "../data/visibility";
import { useCampaignStore } from "../store/useCampaignStore";
import type { Contest } from "../domain/types";

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

function stripSvgBackground(svg: SVGSVGElement) {
  svg.style.background = "transparent";

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

    const looksWhite = fill === "#fff" || fill === "#ffffff" || fill === "white" || fill === "rgb(255,255,255)";

    if (looksLikeFull && looksLikeTopLeft && looksWhite) {
      r.setAttribute("fill", "none");
      r.style.fill = "none";
      r.style.pointerEvents = "none";
    }
  }
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

function isGMEffective(mode: "SETUP" | "PLAY", viewerMode: "PLAYER" | "GM") {
  // Setup is effectively GM-authority for map interactions / visibility.
  return mode === "SETUP" || viewerMode === "GM";
}

function redactByIntel(level: VisibilityLevel) {
  return {
    showName: level !== "NONE",
    showOwner: level === "SCOUTED" || level === "FULL",
    showCombat: level === "FULL",
  };
}

export default function MapBoard() {
  const svgHostRef = useRef<HTMLDivElement>(null);

  const [vb, setVb] = useState<ViewBox | null>(null);
  const [hover, setHover] = useState<HoverState>(null);

  const zoomApiRef = useRef<null | {
    reset: () => void;
    fit: () => void;
    zoom: (d: "in" | "out") => void;
    set: (vb: ViewBox) => void;
  }>(null);

  const [data, setData] = useState<TheatreData | null>(null);

  // Tracks the last clicked *shape* for UI display, without storing the whole selection in state.
  const [lastClickedShapeId, setLastClickedShapeId] = useState<string>("");

  // store
  const mode = useCampaignStore((s) => s.mode);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const activeTheatres = useCampaignStore((s) => s.activeTheatres);

  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const selectedRegionId = useCampaignStore((s) => s.selectedRegionId);
  const regions = useCampaignStore((s) => s.regions);

  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);
  // const homelands = useCampaignStore((s) => s.homelands);

  const locksByTerritory = useCampaignStore((s) => s.locksByTerritory);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);

  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);
  const setHomeland = useCampaignStore((s) => s.setHomeland);
  const applyHomeland = useCampaignStore((s) => s.applyHomeland);

  const didDefaultZoomRef = useRef(false);

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

  const gmEffective = isGMEffective(mode, viewerMode);

  const getIntelForTid = useCallback(
    (tid: string): VisibilityLevel => {
      if (gmEffective) return "FULL";
      return intelByTerritory[tid]?.[viewerFaction] ?? "NONE";
    },
    [gmEffective, intelByTerritory, viewerFaction]
  );

  // Derived selection (no setState in effect). We only produce a selection if player has intel.
  const selected: Selection | null = useMemo(() => {
    if (!selectedTerritoryId) return null;

    const terr = territoriesById.get(selectedTerritoryId);
    if (!terr) return null;

    const lvl = getIntelForTid(terr.id);
    if (!gmEffective && lvl === "NONE") return null;

    const clickedShapeId =
      lastClickedShapeId && terr.shapeRefs.includes(lastClickedShapeId) ? lastClickedShapeId : terr.shapeRefs[0] ?? "";

    return {
      territoryId: terr.id,
      territoryName: terr.name,
      theatreId: terr.theatreId,
      theatreTitle: terr.theatreTitle,
      clickedShapeId,
    };
  }, [selectedTerritoryId, territoriesById, gmEffective, getIntelForTid, lastClickedShapeId]);

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
      const { viewerFaction, intelByTerritory, ownerByTerritory, customs, homelands, viewerMode, mode } =
        useCampaignStore.getState();

      const gm = isGMEffective(mode, viewerMode);
      clearSelectionStyles(svg);

      const homelandId = homelands?.[viewerFaction] ?? null;

      allowedShapeIds.forEach((shapeId) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
        if (!p) return;

        if (!p.dataset.baseFill) {
          const attrFill = p.getAttribute("fill");
          p.dataset.baseFill = attrFill && attrFill !== "none" ? attrFill : "#444";
        }

        const territory = shapeToTerritory.get(shapeId);
        if (!territory) return;

        const level: VisibilityLevel = gm ? "FULL" : (intelByTerritory[territory.id]?.[viewerFaction] ?? "NONE");

        const canInteract = gm || level !== "NONE";

        p.style.cursor = canInteract ? "pointer" : "default";
        p.style.pointerEvents = canInteract ? "auto" : "none";

        p.style.stroke = "#1a1a1a";
        p.style.strokeWidth = "0.8";

        if (level === "NONE") {
          p.style.opacity = "0.18";
          p.style.fill = p.dataset.baseFill!;
        } else if (level === "KNOWN") {
          p.style.opacity = "0.55";
          p.style.fill = p.dataset.baseFill!;
        } else if (level === "SCOUTED") {
          const owner = ownerByTerritory[territory.id] ?? "neutral";
          p.style.opacity = "0.72";
          p.style.fill = getOwnerFill(owner, customs);
        } else {
          const owner = ownerByTerritory[territory.id] ?? "neutral";
          p.style.opacity = "0.9";
          p.style.fill = getOwnerFill(owner, customs);
        }

        if (homelandId && territory.id === homelandId) {
          p.style.opacity = "1";
          p.style.stroke = "#ffffff";
          p.style.strokeWidth = "2.6";
          p.style.pointerEvents = "auto";
          p.style.cursor = "pointer";
        }
      });
    },
    [allowedShapeIds, clearSelectionStyles, shapeToTerritory]
  );

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

      const lvl = getIntelForTid(territory.id);
      if (!gmEffective && lvl === "NONE") return;

      territory.shapeRefs.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;
        p.style.opacity = "1";
        p.style.stroke = "#ffffff";
        p.style.strokeWidth = "2";
      });
    },
    [applyFogStyles, getIntelForTid, gmEffective]
  );

  const highlightRegion = useCallback(
    (svg: SVGSVGElement, territoryIds: string[]) => {
      applyFogStyles(svg);

      const ids = new Set(territoryIds);
      for (const info of territoriesById.values()) {
        if (!ids.has(info.id)) continue;

        const lvl = getIntelForTid(info.id);
        if (!gmEffective && lvl === "NONE") continue;

        for (const shapeId of info.shapeRefs) {
          const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
          if (!p) continue;
          p.style.opacity = "1";
          p.style.stroke = "#ffd166";
          p.style.strokeWidth = "1.6";
        }
      }
    },
    [applyFogStyles, territoriesById, getIntelForTid, gmEffective]
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

          const s = useCampaignStore.getState();
          const gm = isGMEffective(s.mode, s.viewerMode);
          const lvl: VisibilityLevel = gm ? "FULL" : (s.intelByTerritory[territory.id]?.[s.viewerFaction] ?? "NONE");

          if (!gm && lvl === "NONE") return;

          setLastClickedShapeId(shapeId);
          setSelectedTerritory(territory.id);

          if (s.mode === "SETUP") {
            const fk = makeFactionKeyFromSetup();
            if (fk) {
              setHomeland(fk, territory.id);
              applyHomeland(fk);
            }
          }

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
        setLastClickedShapeId("");
        setSelectedTerritory(null);
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
  }, [data, applyFogStyles, wireTerritoryEvents, wireZoomPan, fitToAllowed]);

  // External side-effect only: update DOM styles when selection changes (no setState here).
  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    if (selected) {
      const terr = territoriesById.get(selected.territoryId);
      if (terr) highlightTerritory(svg, terr);
      else applyFogStyles(svg);
    } else {
      applyFogStyles(svg);
    }
  }, [selected, territoriesById, applyFogStyles, highlightTerritory]);

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

        {/* Controls */}
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

            const level: VisibilityLevel = gmEffective ? "FULL" : (intelByTerritory[tid]?.[viewerFaction] ?? "NONE");
            const redact = redactByIntel(level);

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
                  color: "#fff",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {redact.showName ? (
                    <>
                      {terr.name} <span style={{ opacity: 0.75 }}>({tid})</span>
                    </>
                  ) : (
                    <>Unknown territory</>
                  )}
                </div>

                <div style={{ opacity: 0.9 }}>
                  <b>Intel:</b> {level}
                </div>

                {redact.showOwner && (
                  <div style={{ opacity: 0.9 }}>
                    <b>Owner:</b> {owner}
                  </div>
                )}

                {redact.showCombat && locked && (
                  <div style={{ opacity: 0.95, marginTop: 4 }}>
                    <b>Locked:</b> COMBAT
                  </div>
                )}

                {redact.showCombat && contest && (
                  <div style={{ opacity: 0.95, marginTop: 4 }}>
                    <b>Contest:</b> {contest.attackerFaction} vs {contest.defenderFaction} ({contest.status})
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
          (() => {
            const tid = selected.territoryId;
            const level: VisibilityLevel = gmEffective ? "FULL" : (intelByTerritory[tid]?.[viewerFaction] ?? "NONE");
            const redact = redactByIntel(level);

            const owner = ownerByTerritory[tid] ?? "neutral";
            const locked = !!locksByTerritory[tid];
            const contest = contestsByTerritory[tid] as Contest | undefined;

            return (
              <div style={{ lineHeight: 1.5 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {redact.showName ? `${selected.territoryName} (${selected.territoryId})` : "Unknown territory"}
                </div>

                <div style={{ opacity: 0.9 }}>
                  <b>Intel:</b> {level}
                </div>

                {redact.showName && (
                  <div style={{ opacity: 0.9 }}>
                    <b>Theatre:</b> {selected.theatreTitle} ({selected.theatreId})
                  </div>
                )}

                {redact.showOwner && (
                  <div style={{ opacity: 0.9, marginTop: 6 }}>
                    <b>Owner:</b> {owner}
                  </div>
                )}

                {redact.showCombat && locked && (
                  <div style={{ opacity: 0.95, marginTop: 6 }}>
                    <b>Locked:</b> COMBAT
                  </div>
                )}

                {redact.showCombat && contest && (
                  <div style={{ opacity: 0.95, marginTop: 6 }}>
                    <b>Contest:</b> {contest.attackerFaction} vs {contest.defenderFaction} ({contest.status})
                  </div>
                )}

                <div style={{ opacity: 0.8, marginTop: 10 }}>
                  <b>Clicked shape:</b> {selected.clickedShapeId}
                </div>

                {useCampaignStore.getState().mode === "SETUP" && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                    Setup mode: click sets homeland for selected faction.
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div>Click a territory (in Player mode you can only click territories you have intel on)</div>
        )}
      </div>
    </div>
  );
}
