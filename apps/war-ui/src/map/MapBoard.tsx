// apps/war-ui/src/map/MapBoard.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadTheatresData,
  withBase,
  type NormalizedData,
} from "../data/theatres";
import { getEffectiveVisibility as getRulesVisibility } from "../data/visibilityRules";
import { visibilityOrder, type VisibilityLevel } from "../data/visibility";
import {
  useCampaignStore,
  type CustomNation,
  type FactionKey,
  type OwnerKey,
} from "../store/useCampaignStore";
import { factionLabel } from "../store/factionLabel";
import { nationLabel } from "../store/nationLabel";
import type { Contest } from "../domain/types";
import { NATION_BY_ID, type BaseNationKey } from "../setup/NationDefinitions";
import { getFactionMembersForNation } from "../setup/factionUtils";

type TerritoryInfo = {
  id: string;
  name: string;
  theatreId: string;
  theatreTitle: string;
  shapeRefs: string[];
};

type ViewBox = { x: number; y: number; w: number; h: number };
type HoverState = { tid: string; x: number; y: number } | null;

const baseFactionColors: Record<"allies" | "axis" | "ussr", string> = {
  allies: "#2563eb",
  axis: "#dc2626",
  ussr: "#f97316",
};
const neutralFactionColor = "#6b7280";

// ✅ borders ALWAYS visible (strategy/planning)
const BORDER_STROKE = "rgba(255,255,255,.55)";
const BORDER_WIDTH = "1.25";

function getOwnerFill(owner: OwnerKey, customNations: CustomNation[]) {
  if (owner === "neutral") return neutralFactionColor;
  if (owner === "contested") return "#a855f7";
  const customNation = owner.startsWith("custom:")
    ? customNations.find((n) => n.id === owner)
    : null;
  const defaultFaction: FactionKey | undefined =
    customNation?.defaultFaction ??
    NATION_BY_ID[owner as BaseNationKey]?.defaultFaction;
  if (customNation?.color) return customNation.color;
  if (defaultFaction && defaultFaction in baseFactionColors) {
    return baseFactionColors[defaultFaction as keyof typeof baseFactionColors];
  }
  return neutralFactionColor;
}

function getDefaultFactionForNation(
  nation: string,
  customNations: CustomNation[],
) {
  return nation.startsWith("custom:")
    ? customNations.find((n) => n.id === nation)?.defaultFaction
    : NATION_BY_ID[nation as BaseNationKey]?.defaultFaction;
}

function getNationAccent(nation: string, customNations: CustomNation[]) {
  const defaultFaction = getDefaultFactionForNation(nation, customNations);
  if (nation.startsWith("custom:")) {
    const customNation = customNations.find((n) => n.id === nation);
    if (customNation?.color) return customNation.color;
  }
  if (defaultFaction && defaultFaction in baseFactionColors) {
    return baseFactionColors[defaultFaction as keyof typeof baseFactionColors];
  }
  return neutralFactionColor;
}

function isGMEffective(mode: "SETUP" | "PLAY", viewerMode: "PLAYER" | "GM") {
  // Setup is effectively GM-authority for map interactions / visibility.
  return mode === "SETUP" || viewerMode === "GM";
}

// v1: what UI elements can be shown at each intel level
function redactByIntel(
  level: VisibilityLevel,
  ownerIsViewer: boolean,
  gmEffective: boolean,
) {
  // GM sees everything, viewer-owned is always FULL.
  if (gmEffective || ownerIsViewer) {
    return { showName: true, showOwner: true, showCombat: true };
  }

  return {
    showName: level !== "NONE",
    showOwner: level === "SCOUTED" || level === "FULL",
    showCombat: level === "FULL",
  };
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
      (Number.isFinite(w) &&
        Number.isFinite(h) &&
        w >= vb.w * 0.95 &&
        h >= vb.h * 0.95);

    const looksLikeTopLeft =
      Math.abs(x - vb.x) < vb.w * 0.05 && Math.abs(y - vb.y) < vb.h * 0.05;

    const looksWhite =
      fill === "#fff" ||
      fill === "#ffffff" ||
      fill === "white" ||
      fill === "rgb(255,255,255)";

    if (looksLikeFull && looksLikeTopLeft && looksWhite) {
      r.setAttribute("fill", "none");
      r.style.fill = "none";
      r.style.pointerEvents = "none";
    }
  }
}

function wireZoomPanImpl(
  svg: SVGSVGElement,
  hostEl: HTMLDivElement,
  onVbChange?: (vb: ViewBox) => void,
) {
  const base = parseViewBox(svg);
  let current = { ...base };

  const update = (vb: ViewBox) => {
    current = vb;
    setViewBox(svg, current);
    onVbChange?.(current);
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

    update({
      x: startVB.x - dx,
      y: startVB.y - dy,
      w: startVB.w,
      h: startVB.h,
    });
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
    get: () => ({ ...current }),
    getBase: () => ({ ...base }),
  };

  const cleanup = () => {
    hostEl.removeEventListener("wheel", onWheel as any);
    hostEl.removeEventListener("mousedown", onMouseDown as any);
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  };

  return { api, cleanup };
}

export default function MapBoard() {
  const svgHostRef = useRef<HTMLDivElement>(null);

  const [vb, setVb] = useState<ViewBox | null>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [data, setData] = useState<NormalizedData | null>(null);

  const zoomApiRef = useRef<null | {
    reset: () => void;
    fit: () => void;
    zoom: (d: "in" | "out") => void;
    set: (vb: ViewBox) => void;
    get: () => ViewBox;
    getBase: () => ViewBox;
  }>(null);

  const didDefaultZoomRef = useRef(false);

  // store
  const mode = useCampaignStore((s) => s.mode);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const phase = useCampaignStore((s) => s.phase);
  const activeTheatres = useCampaignStore((s) => s.activeTheatres);

  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);
  const orderDraftType = useCampaignStore((s) => s.orderDraftType);
  const turnNumber = useCampaignStore((s) => s.turnNumber);
  const setPlatoonOrderMove = useCampaignStore((s) => s.setPlatoonOrderMove);
  const setPlatoonOrderHold = useCampaignStore((s) => s.setPlatoonOrderHold);
  const setPlatoonOrderRecon = useCampaignStore((s) => s.setPlatoonOrderRecon);
  const setPlatoonOrderIntel = useCampaignStore((s) => s.setPlatoonOrderIntel);
  const setOrderDraftType = useCampaignStore((s) => s.setOrderDraftType);

  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);
  const ownerByTerritory = useCampaignStore((s) => s.ownerByTerritory);
  const locksByTerritory = useCampaignStore((s) => s.locksByTerritory);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);
  const homelandsByNation = useCampaignStore((s) => s.homelandsByNation);
  const useDefaultFactions = useCampaignStore((s) => s.useDefaultFactions);
  const nationsEnabled = useCampaignStore((s) => s.nationsEnabled);

  const gmEffective = isGMEffective(mode, viewerMode);
  const alliedNations = useMemo(
    () =>
      getFactionMembersForNation({
        nation: viewerNation,
        customNations,
        nationsEnabled,
        useDefaultFactions,
      }),
    [viewerNation, customNations, nationsEnabled, useDefaultFactions],
  );
  const alliedNationSet = useMemo(
    () => new Set(alliedNations),
    [alliedNations],
  );

  const theatresKey = useMemo(
    () =>
      (["WE", "EE", "NA", "PA"] as const)
        .filter((k) => activeTheatres[k])
        .join("|") || "NONE",
    [activeTheatres],
  );

  const vbStorageKey = useMemo(
    () => `war.map.vb.${theatresKey}`,
    [theatresKey],
  );

  const { allowedShapeIds, shapeToTerritory, territoriesById } = useMemo(() => {
    const allowed = new Set<string>();
    const shapeMap = new Map<string, TerritoryInfo>();
    const terrMap = new Map<string, TerritoryInfo>();

    if (data) {
      for (const th of data.raw.theatres) {
        if (!activeTheatres[th.theatreId as keyof typeof activeTheatres])
          continue;

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

    return {
      allowedShapeIds: allowed,
      shapeToTerritory: shapeMap,
      territoriesById: terrMap,
    };
  }, [activeTheatres, data]);
  const regionTerritoriesById = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!data?.raw.regions) return map;
    for (const region of data.raw.regions) {
      for (const tid of region.territories ?? []) {
        map.set(tid, region.territories ?? []);
      }
    }
    return map;
  }, [data]);

  // ✅ adjacency lookup for active theatres (land+sea)
  const adjacencyByTerritory = useMemo(() => {
    const m = new Map<string, Set<string>>();
    if (!data) return m;

    for (const th of data.raw.theatres) {
      if (!activeTheatres[th.theatreId as keyof typeof activeTheatres])
        continue;
      const adj = th.adjacency ?? {};
      for (const [tid, ls] of Object.entries(adj)) {
        const set = m.get(tid) ?? new Set<string>();
        for (const x of ls.land ?? []) set.add(x);
        for (const x of ls.sea ?? []) set.add(x);
        m.set(tid, set);
      }
    }
    return m;
  }, [data, activeTheatres]);

  const isAdjacentToOwned = useCallback(
    (tid: string) => {
      // if any owned territory has tid in its adjacency set => KNOWN
      for (const [ownedTid, owner] of Object.entries(ownerByTerritory)) {
        if (owner === "neutral" || owner === "contested") continue;
        if (!alliedNationSet.has(owner)) continue;
        const adj = adjacencyByTerritory.get(ownedTid);
        if (adj?.has(tid)) return true;
      }
      return false;
    },
    [adjacencyByTerritory, ownerByTerritory, alliedNationSet],
  );

  // ✅ single “effective” visibility:
  // GM => FULL
  // owned => FULL
  // intelByTerritory => that value
  // else adjacent-to-owned => KNOWN
  // else NONE
  const getEffectiveVisibility = useCallback(
    (tid: string): VisibilityLevel => {
      if (gmEffective) return "FULL";

      const owner = ownerByTerritory[tid] ?? "neutral";
      if (owner !== "neutral" && owner !== "contested") {
        if (alliedNationSet.has(owner)) return "FULL";
      }

      let bestIntel: VisibilityLevel = "NONE";
      for (const nation of alliedNations) {
        const intel = intelByTerritory[tid]?.[nation] ?? "NONE";
        if (
          visibilityOrder.indexOf(intel) >
          visibilityOrder.indexOf(bestIntel)
        ) {
          bestIntel = intel;
        }
      }
      if (bestIntel !== "NONE") return bestIntel;

      if (isAdjacentToOwned(tid)) return "KNOWN";

      return "NONE";
    },
    [
      gmEffective,
      ownerByTerritory,
      intelByTerritory,
      isAdjacentToOwned,
      alliedNationSet,
      alliedNations,
    ],
  );

  // ✅ Always keep borders on. Use fill/opacity for fog.
  const clearSelectionStyles = useCallback((svg: SVGSVGElement) => {
    svg.querySelectorAll<SVGPathElement>("path").forEach((p) => {
      p.style.opacity = "1";
      p.style.stroke = BORDER_STROKE;
      p.style.strokeWidth = BORDER_WIDTH;
      (p.style as any).vectorEffect = "non-scaling-stroke";
      p.style.cursor = "default";
      p.style.pointerEvents = "none";
    });
  }, []);

  const applyFogStyles = useCallback(
    (svg: SVGSVGElement) => {
      clearSelectionStyles(svg);

      const homelandId = homelandsByNation?.[viewerNation] ?? null;

      allowedShapeIds.forEach((shapeId) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(shapeId)}`);
        if (!p) return;

        if (!p.dataset.baseFill) {
          const attrFill = p.getAttribute("fill");
          p.dataset.baseFill =
            attrFill && attrFill !== "none" ? attrFill : "#444";
        }

        const territory = shapeToTerritory.get(shapeId);
        if (!territory) return;

        const level = getEffectiveVisibility(territory.id);
        const canInteract = gmEffective || level !== "NONE";
        const owner = ownerByTerritory[territory.id] ?? "neutral";

        // ✅ borders always visible
        p.style.stroke = BORDER_STROKE;
        p.style.strokeWidth = BORDER_WIDTH;
        (p.style as any).vectorEffect = "non-scaling-stroke";

        p.style.cursor = canInteract ? "pointer" : "default";
        p.style.pointerEvents = canInteract ? "auto" : "none";

        // v1 fog fills
        if (level === "NONE") {
          p.style.fillOpacity = "0.78";
          p.style.fill = "#000";
        } else if (level === "KNOWN") {
          p.style.fillOpacity = "0.45";
          p.style.fill =
            owner === "contested" ? getOwnerFill(owner, customNations) : "#111";
        } else if (level === "SCOUTED") {
          p.style.fillOpacity = "0.65";
          p.style.fill =
            owner === "contested"
              ? getOwnerFill(owner, customNations)
              : p.dataset.baseFill!;
        } else {
          p.style.fillOpacity = "0.9";
          p.style.fill = getOwnerFill(owner, customNations);
        }

        // homeland ring (still visible even if fogged)
        if (homelandId && territory.id === homelandId) {
          p.style.opacity = "1";
          p.style.stroke = gmEffective ? "#ffffff" : "rgba(255,255,255,.85)";
          p.style.strokeWidth = "2.6";
          (p.style as any).vectorEffect = "non-scaling-stroke";
          p.style.pointerEvents = "auto";
          p.style.cursor = "pointer";
        }
      });
    },
    [
      allowedShapeIds,
      clearSelectionStyles,
      shapeToTerritory,
      getEffectiveVisibility,
      ownerByTerritory,
      customNations,
      homelandsByNation,
      viewerNation,
      gmEffective,
    ],
  );

  const highlightTerritory = useCallback(
    (svg: SVGSVGElement, territory: TerritoryInfo) => {
      const lvl = getEffectiveVisibility(territory.id);
      if (!gmEffective && lvl === "NONE") return;
      const regionTerritories = regionTerritoriesById.get(territory.id);
      if (regionTerritories?.length) {
        regionTerritories.forEach((tid) => {
          const info = territoriesById.get(tid);
          if (!info) return;
          info.shapeRefs.forEach((id) => {
            const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
            if (!p) return;
            p.style.stroke = "rgba(251,191,36,.85)";
            p.style.strokeWidth = "5.2";
            (p.style as any).vectorEffect = "non-scaling-stroke";
          });
        });
      }

      territory.shapeRefs.forEach((id) => {
        const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
        if (!p) return;
        p.style.opacity = "1";
        p.style.stroke = "#ffffff";
        p.style.strokeWidth = "2";
        (p.style as any).vectorEffect = "non-scaling-stroke";
      });
    },
    [
      getEffectiveVisibility,
      gmEffective,
      regionTerritoriesById,
      territoriesById,
    ],
  );
  const orderTargetTerritories = useMemo(() => {
    if (
      phase !== "ORDERS" ||
      !orderDraftType ||
      !selectedPlatoonId ||
      !platoonsById[selectedPlatoonId]
    ) {
      return [];
    }
    const platoon = platoonsById[selectedPlatoonId];
    if (!platoon) return [];
    const baseTargets =
      orderDraftType === "HOLD"
        ? [platoon.territoryId]
        : Array.from(
            adjacencyByTerritory.get(platoon.territoryId) ?? new Set<string>(),
          );
    return baseTargets
      .map((tid) => territoriesById.get(tid))
      .filter(Boolean) as TerritoryInfo[];
  }, [
    adjacencyByTerritory,
    orderDraftType,
    phase,
    platoonsById,
    selectedPlatoonId,
    territoriesById,
  ]);
  const orderTargetIds = useMemo(() => {
    return new Set(orderTargetTerritories.map((t) => t.id));
  }, [orderTargetTerritories]);

  const orderStateRef = useRef({
    phase,
    orderDraftType,
    selectedPlatoonId,
    orderTargetIds,
    turnNumber,
    platoonsById,
  });

  useEffect(() => {
    orderStateRef.current = {
      phase,
      orderDraftType,
      selectedPlatoonId,
      orderTargetIds,
      turnNumber,
      platoonsById,
    };
  }, [
    phase,
    orderDraftType,
    selectedPlatoonId,
    orderTargetIds,
    turnNumber,
    platoonsById,
  ]);

  const applyOrderTargets = useCallback(
    (svg: SVGSVGElement) => {
      if (!orderTargetTerritories.length || !orderDraftType) return;
      const color =
        orderDraftType === "MOVE"
          ? "#38bdf8"
          : orderDraftType === "HOLD"
            ? "#f59e0b"
            : orderDraftType === "RECON"
              ? "#34d399"
              : "#a855f7";
      orderTargetTerritories.forEach((territory) => {
        territory.shapeRefs.forEach((id) => {
          const p = svg.querySelector<SVGPathElement>(`#${CSS.escape(id)}`);
          if (!p) return;
          p.style.stroke = color;
          p.style.strokeWidth = "2.2";
          (p.style as any).vectorEffect = "non-scaling-stroke";
        });
      });
    },
    [orderDraftType, orderTargetTerritories],
  );

  const applyHighlightState = useCallback(
    (svg: SVGSVGElement, territoryId: string | null) => {
      applyFogStyles(svg);
      applyOrderTargets(svg);
      if (territoryId) {
        const info = territoriesById.get(territoryId);
        if (info) highlightTerritory(svg, info);
      }
    },
    [applyFogStyles, applyOrderTargets, highlightTerritory, territoriesById],
  );
  const ensureOverlayLayer = useCallback((svg: SVGSVGElement, id: string) => {
    let layer = svg.querySelector<SVGGElement>(`#${CSS.escape(id)}`);
    if (!layer) {
      layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.setAttribute("id", id);
      layer.style.pointerEvents = "none";
      svg.appendChild(layer);
    }
    return layer;
  }, []);

  const centroidCacheRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const getTerritoryCentroid = useCallback(
    (svg: SVGSVGElement, territory: TerritoryInfo) => {
      const cached = centroidCacheRef.current.get(territory.id);
      if (cached) return cached;
      const boxes: DOMRect[] = [];
      territory.shapeRefs.forEach((shapeId) => {
        const el = svg.querySelector<SVGGraphicsElement>(
          `#${CSS.escape(shapeId)}`,
        );
        if (el) boxes.push(el.getBBox());
      });
      if (!boxes.length) return null;
      const sum = boxes.reduce(
        (acc, box) => ({
          x: acc.x + box.x + box.width / 2,
          y: acc.y + box.y + box.height / 2,
        }),
        { x: 0, y: 0 },
      );
      const centroid = { x: sum.x / boxes.length, y: sum.y / boxes.length };
      centroidCacheRef.current.set(territory.id, centroid);
      return centroid;
    },
    [],
  );

  const buildSupplyPath = useCallback(
    (start: string, target: string) => {
      if (start === target) return [start];
      const queue: string[] = [start];
      const prev = new Map<string, string | null>([[start, null]]);
      while (queue.length) {
        const node = queue.shift() as string;
        const neighbors = adjacencyByTerritory.get(node);
        if (!neighbors) continue;
        for (const next of neighbors) {
          if (prev.has(next)) continue;
          prev.set(next, node);
          if (next === target) {
            const path = [target];
            let cur: string | null = node;
            while (cur) {
              path.push(cur);
              cur = prev.get(cur) ?? null;
            }
            return path.reverse();
          }
          queue.push(next);
        }
      }
      return null;
    },
    [adjacencyByTerritory],
  );

  const updatePlatoonOverlays = useCallback(
    (svg: SVGSVGElement) => {
      const markerLayer = ensureOverlayLayer(svg, "platoon-markers");
      const lineLayer = ensureOverlayLayer(svg, "supply-lines");
      const homelandLayer = ensureOverlayLayer(svg, "homeland-markers");
      markerLayer.innerHTML = "";
      lineLayer.innerHTML = "";
      homelandLayer.innerHTML = "";
      centroidCacheRef.current.clear();

      const grouped = new Map<string, string[]>();
      const visiblePlatoons = Object.values(platoonsById).filter((platoon) => {
        if (gmEffective) return true;
        if (platoon.nation === viewerNation) return true;
        const visibility = getRulesVisibility({
          viewerMode,
          viewerNation,
          alliedNations,
          territoryId: platoon.territoryId,
          ownerByTerritory,
          intelByTerritory,
          data,
        });
        return visibility === "SCOUTED" || visibility === "FULL";
      });

      visiblePlatoons.forEach((platoon) => {
        const list = grouped.get(platoon.territoryId) ?? [];
        list.push(platoon.nation);
        grouped.set(platoon.territoryId, list);
      });

      const homeland = homelandsByNation?.[viewerNation] ?? null;
      const selectedPlatoonTerritory = selectedPlatoonId
        ? (platoonsById[selectedPlatoonId]?.territoryId ?? null)
        : null;

      if (homeland) {
        const territory = territoriesById.get(homeland);
        if (territory) {
          const centroid = getTerritoryCentroid(svg, territory);
          if (centroid) {
            const accent = getNationAccent(viewerNation, customNations);
            const ring = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            ring.setAttribute("cx", centroid.x.toString());
            ring.setAttribute("cy", centroid.y.toString());
            ring.setAttribute("r", "6");
            ring.setAttribute("fill", accent);
            ring.setAttribute("stroke", "rgba(15,23,42,.9)");
            ring.setAttribute("stroke-width", "1.2");
            homelandLayer.appendChild(ring);

            const icon = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text",
            );
            icon.setAttribute("x", centroid.x.toString());
            icon.setAttribute("y", (centroid.y + 2).toString());
            icon.setAttribute("text-anchor", "middle");
            icon.setAttribute("font-size", "5");
            icon.setAttribute("font-weight", "700");
            icon.setAttribute("fill", "#0f172a");
            icon.textContent = "H";
            homelandLayer.appendChild(icon);
          }
        }
      }

      grouped.forEach((factions, tid) => {
        const territory = territoriesById.get(tid);
        if (!territory) return;
        const centroid = getTerritoryCentroid(svg, territory);
        if (!centroid) return;
        if (selectedPlatoonTerritory && selectedPlatoonTerritory === tid) {
          const highlight = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
          );
          highlight.setAttribute("cx", centroid.x.toString());
          highlight.setAttribute("cy", centroid.y.toString());
          highlight.setAttribute("r", "6");
          highlight.setAttribute("fill", "none");
          highlight.setAttribute("stroke", "#facc15");
          highlight.setAttribute("stroke-width", "1.2");
          markerLayer.appendChild(highlight);
        }

        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        circle.setAttribute("cx", centroid.x.toString());
        circle.setAttribute("cy", centroid.y.toString());
        circle.setAttribute("r", "3");
        circle.setAttribute(
          "fill",
          getOwnerFill(factions[0] as OwnerKey, customNations),
        );
        circle.setAttribute("stroke", "#111827");
        circle.setAttribute("stroke-width", "0.5");
        markerLayer.appendChild(circle);

        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        label.setAttribute("x", centroid.x.toString());
        label.setAttribute("y", (centroid.y + 1).toString());
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "3");
        label.setAttribute("fill", "#f8fafc");
        label.textContent = String(factions.length);
        markerLayer.appendChild(label);

        if (homeland && factions.includes(viewerNation)) {
          const path = buildSupplyPath(tid, homeland);
          if (path && path.length > 1) {
            const points = path
              .map((pid) => {
                const terr = territoriesById.get(pid);
                if (!terr) return null;
                return getTerritoryCentroid(svg, terr);
              })
              .filter(Boolean) as Array<{ x: number; y: number }>;
            if (points.length > 1) {
              const poly = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "polyline",
              );
              poly.setAttribute(
                "points",
                points.map((p) => `${p.x},${p.y}`).join(" "),
              );
              poly.setAttribute("fill", "none");
              poly.setAttribute("stroke", "rgba(145, 224, 162, 0.94)");
              poly.setAttribute("stroke-width", "1.4");
              poly.setAttribute("stroke-dasharray", "4 4");
              lineLayer.appendChild(poly);
            }
          }
        }
      });
    },
    [
      buildSupplyPath,
      customNations,
      data,
      alliedNations,
      ensureOverlayLayer,
      getTerritoryCentroid,
      gmEffective,
      homelandsByNation,
      intelByTerritory,
      ownerByTerritory,
      platoonsById,
      selectedPlatoonId,
      territoriesById,
      viewerMode,
      viewerNation,
    ],
  );
  const fitToAllowed = useCallback(
    (svg: SVGSVGElement) => {
      const els = Array.from(allowedShapeIds)
        .map((id) =>
          svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`),
        )
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

      zoomApiRef.current?.set(next);
    },
    [allowedShapeIds],
  );

  // Load theatres data
  useEffect(() => {
    loadTheatresData()
      .then((nd) => setData(nd))
      .catch((err) => console.error("Failed to load theatres_all.json", err));
  }, []);

  // Load and wire SVG
  useEffect(() => {
    if (!data) return;

    const hostEl = svgHostRef.current;
    if (!hostEl) return;

    const svgUrl = withBase("mapchart_world.svg");
    let cleanupZoom: null | (() => void) = null;

    fetch(svgUrl)
      .then((r) => r.text())
      .then((svgText) => {
        if (!hostEl) return;

        hostEl.innerHTML = svgText;
        const svg = hostEl.querySelector("svg") as SVGSVGElement | null;
        if (!svg) return;

        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.display = "block";

        stripSvgBackground(svg);
        applyFogStyles(svg);
        updatePlatoonOverlays(svg);

        // zoom/pan wiring
        const { api, cleanup } = wireZoomPanImpl(svg, hostEl, (nextVb) => {
          setVb(nextVb);
          try {
            localStorage.setItem(vbStorageKey, JSON.stringify(nextVb));
          } catch {
            // ignore
          }
        });
        zoomApiRef.current = api;
        cleanupZoom = cleanup;

        // restore persisted viewbox
        const saved = (() => {
          try {
            const raw = localStorage.getItem(vbStorageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as ViewBox;
            if (
              parsed &&
              [parsed.x, parsed.y, parsed.w, parsed.h].every(
                (n) => typeof n === "number" && Number.isFinite(n),
              )
            ) {
              return parsed;
            }
            return null;
          } catch {
            return null;
          }
        })();

        if (saved) {
          api.set(saved);
        } else {
          fitToAllowed(svg);
          if (!didDefaultZoomRef.current) {
            didDefaultZoomRef.current = true;
            api.zoom("in");
            api.zoom("in");
          }
        }

        // wire click + hover for allowed territories
        allowedShapeIds.forEach((shapeId) => {
          const path = svg.querySelector<SVGPathElement>(
            `#${CSS.escape(shapeId)}`,
          );
          if (!path) return;

          const onClick = (e: MouseEvent) => {
            e.stopPropagation();
            const territory = shapeToTerritory.get(shapeId);
            if (!territory) return;

            const lvl = getEffectiveVisibility(territory.id);
            if (!gmEffective && lvl === "NONE") return;

            const orderState = orderStateRef.current;
            if (
              orderState.phase === "ORDERS" &&
              orderState.orderDraftType &&
              orderState.selectedPlatoonId &&
              orderState.orderTargetIds.has(territory.id)
            ) {
              const platoon =
                orderState.platoonsById[orderState.selectedPlatoonId];
              if (platoon) {
                if (orderState.orderDraftType === "HOLD") {
                  setPlatoonOrderHold(
                    orderState.turnNumber,
                    platoon.faction,
                    platoon.id,
                  );
                } else if (orderState.orderDraftType === "RECON") {
                  setPlatoonOrderRecon(
                    orderState.turnNumber,
                    platoon.faction,
                    platoon.id,
                    [territory.id],
                  );
                } else if (orderState.orderDraftType === "INTEL") {
                  setPlatoonOrderIntel(
                    orderState.turnNumber,
                    platoon.faction,
                    platoon.id,
                    territory.id,
                  );
                } else if (orderState.orderDraftType === "MOVE") {
                  setPlatoonOrderMove(
                    orderState.turnNumber,
                    platoon.faction,
                    platoon.id,
                    [territory.id],
                    false,
                  );
                }
                setOrderDraftType(null);
              }
            }
            setSelectedTerritory(territory.id);
            applyHighlightState(svg, territory.id);
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

          (path as any).__cleanup = () => {
            path.removeEventListener("click", onClick);
            path.removeEventListener("mouseenter", onEnter);
            path.removeEventListener("mousemove", onMove);
            path.removeEventListener("mouseleave", onLeave);
          };
        });

        const onSvgClick = () => {
          setSelectedTerritory(null);
          applyHighlightState(svg, null);
        };
        svg.addEventListener("click", onSvgClick);

        (svg as any).__cleanupAll = () => {
          svg.removeEventListener("click", onSvgClick);
          svg.querySelectorAll("path").forEach((p) => {
            const fn = (p as any).__cleanup;
            if (typeof fn === "function") fn();
          });
        };
      })
      .catch((err) => console.error("Failed to load SVG", err));

    return () => {
      const svg = hostEl.querySelector("svg") as any;
      if (svg?.__cleanupAll) svg.__cleanupAll();

      cleanupZoom?.();
      zoomApiRef.current = null;
    };
  }, [
    data,
    theatresKey,
    vbStorageKey,
    allowedShapeIds,
    shapeToTerritory,
    gmEffective,
    applyFogStyles,
    fitToAllowed,
    updatePlatoonOverlays,
    getEffectiveVisibility,
    setPlatoonOrderHold,
    setPlatoonOrderIntel,
    setPlatoonOrderMove,
    setPlatoonOrderRecon,
    setOrderDraftType,
    setSelectedTerritory,
    applyHighlightState,
  ]);

  // When selection changes externally, update highlight
  useEffect(() => {
    const svg = svgHostRef.current?.querySelector(
      "svg",
    ) as SVGSVGElement | null;
    if (!svg) return;
    applyHighlightState(svg, selectedTerritoryId);
  }, [selectedTerritoryId, applyHighlightState]);
  useEffect(() => {
    const svg = svgHostRef.current?.querySelector(
      "svg",
    ) as SVGSVGElement | null;
    if (!svg) return;
    updatePlatoonOverlays(svg);
  }, [platoonsById, homelandsByNation, updatePlatoonOverlays]);

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
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

      {/* Map controls */}
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
          <div
            style={{
              marginLeft: 10,
              fontSize: 11,
              opacity: 0.85,
              color: "#fff",
            }}
          >
            VB {vb.w.toFixed(0)}×{vb.h.toFixed(0)}
          </div>
        )}
      </div>

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

      {/* Hover tooltip (effective intel) */}
      {hover &&
        (() => {
          const tid = hover.tid;
          const terr = territoriesById.get(tid);
          if (!terr) return null;

          const owner = ownerByTerritory[tid] ?? "neutral";
          const ownerIsViewer = owner === viewerNation;
          const locked = !!locksByTerritory[tid];
          const contest = contestsByTerritory[tid] as Contest | undefined;

          const level: VisibilityLevel = getEffectiveVisibility(tid);
          const redact = redactByIntel(level, ownerIsViewer, gmEffective);

          const isHomeland =
            (homelandsByNation?.[viewerNation] ?? null) === tid;
          const accent = getNationAccent(viewerNation, customNations);

          return (
            <div
              style={{
                position: "fixed",
                left: hover.x + 12,
                top: hover.y + 12,
                zIndex: 20,
                background: "rgba(0,0,0,.80)",
                border: `1px solid ${isHomeland ? accent : "rgba(255,255,255,.18)"}`,
                boxShadow: isHomeland ? `0 0 0 2px rgba(0,0,0,.2)` : undefined,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 12,
                maxWidth: 300,
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
                  <b>Owner:</b> {nationLabel(owner, customNations)}
                </div>
              )}

              {redact.showCombat && locked && (
                <div style={{ opacity: 0.95, marginTop: 4 }}>
                  <b>Locked:</b> COMBAT
                </div>
              )}

              {redact.showCombat && contest && (
                <div style={{ opacity: 0.95, marginTop: 4 }}>
                  <b>Contest:</b>{" "}
                  {factionLabel(contest.attackerFaction, customs)} vs{" "}
                  {factionLabel(contest.defenderFaction, customs)} (
                  {contest.status})
                </div>
              )}

              {isHomeland && (
                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.9 }}>
                  <b style={{ color: accent }}>Homeland</b>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
