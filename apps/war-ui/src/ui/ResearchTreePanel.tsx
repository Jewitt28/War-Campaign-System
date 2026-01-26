import { useMemo, useState } from "react";
import {
  RESEARCH_NODES,
  RESEARCH_NODES_BY_ID,
  RESEARCH_TREES,
  type NationResearchState,
  type ResearchEffect,
  type ResearchNode,
} from "../data/research";
import { nationLabel } from "../store/nationLabel";
import {
  buildResearchRecommendations,
  useCampaignStore,
} from "../store/useCampaignStore";

const TIER_LABELS: Record<ResearchNode["tier"], string> = {
  1: "Tier I – Foundational",
  2: "Tier II – Advanced",
  3: "Tier III – Strategic",
};

type NodeStatus = "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED";

type NodeCardProps = {
  node: ResearchNode;
  status: NodeStatus;
  selected: boolean;
  onSelect: (id: string) => void;
};

function nodeStatus(
  node: ResearchNode,
  state: NationResearchState,
): NodeStatus {
  if (state.completedResearch.includes(node.id)) return "COMPLETED";
  if (state.activeResearchId === node.id) return "ACTIVE";
  if (state.activeResearchId) return "LOCKED";
  const prereqsMet = node.prerequisites.every((id) =>
    state.completedResearch.includes(id),
  );
  return prereqsMet ? "AVAILABLE" : "LOCKED";
}

function describeEffect(effect: ResearchEffect) {
  switch (effect.type) {
    case "SUPPLY_RANGE_BONUS":
      return `Supply range +${effect.value}`;
    case "SUPPLY_DISRUPTION_REDUCTION":
      return `Supply disruption −${effect.value}%`;
    case "INTEL_DECAY_REDUCTION":
      return `Intel decay reduction ${effect.value}%`;
    case "RECON_ACTION_BONUS":
      return `Recon action bonus +${effect.value}`;
    case "FORT_SLOT_BONUS":
      return `Fort slot bonus +${effect.value}`;
    case "WITHDRAWAL_BONUS":
      return `Withdrawal bonus +${effect.value}`;
    case "DIPLOMACY_ACTION_UNLOCK":
      return `Diplomacy action unlock: ${effect.actionId}`;
    case "UPGRADE_UNLOCK":
      return `Upgrade unlock: ${effect.upgradeId}`;
    default:
      return "Unknown effect";
  }
}

function StrategicNodeCard({
  node,
  status,
  selected,
  onSelect,
}: NodeCardProps) {
  const statusColor =
    status === "ACTIVE"
      ? "#8ad4ff"
      : status === "COMPLETED"
        ? "#8dffb2"
        : status === "AVAILABLE"
          ? "#ffd28a"
          : "rgba(255,255,255,0.2)";

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      style={{
        border: `1px solid ${statusColor}`,
        borderRadius: 10,
        padding: 10,
        textAlign: "left",
        background: selected
          ? "rgba(255,255,255,0.12)"
          : "rgba(0,0,0,0.2)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{node.name}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        {node.costBand} · {node.timeTurns} turns · {node.visibility}
      </div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{node.description}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          opacity: 0.7,
        }}
      >
        {status}
      </div>
    </button>
  );
}

function NodeDetailPanel({
  node,
  status,
  state,
  onStart,
  onCancel,
}: {
  node: ResearchNode | null;
  status: NodeStatus | null;
  state: NationResearchState;
  onStart: () => void;
  onCancel: () => void;
}) {
  if (!node || !status) {
    return (
      <div style={{ fontSize: 13, opacity: 0.7 }}>
        Select a research node to see details.
      </div>
    );
  }

  const progressText =
    status === "ACTIVE"
      ? `Progress: ${state.progressTurns}/${node.timeTurns} turns`
      : null;

  const cancelBlocked =
    status === "ACTIVE" && node.tier >= 2 && state.progressTurns >= 1;
  const canStart = status === "AVAILABLE";
  const canCancel = status === "ACTIVE" && !cancelBlocked;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <div style={{ fontWeight: 700 }}>{node.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{node.description}</div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        {TIER_LABELS[node.tier]} · {node.costBand} · {node.timeTurns} turns
      </div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Visibility: {node.visibility}
      </div>
      {progressText ? (
        <div style={{ fontSize: 12, opacity: 0.85 }}>{progressText}</div>
      ) : null}
      {node.locksIn ? (
        <div
          style={{
            fontSize: 12,
            color: "#ffd28a",
            fontWeight: 600,
          }}
        >
          Locks in: Tier II+ research cannot be swapped after progress begins.
        </div>
      ) : null}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          Effects
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {node.effects.map((effect, idx) => (
            <li key={`${effect.type}-${idx}`}>{describeEffect(effect)}</li>
          ))}
        </ul>
      </div>

      {node.unlocksUpgrades?.length ? (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Unlocks upgrades: {node.unlocksUpgrades.join(", ")}
        </div>
      ) : null}
      {node.unlocksDoctrineTraits?.length ? (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Unlocks doctrine traits: {node.unlocksDoctrineTraits.join(", ")}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={!canStart} onClick={onStart}>
          Start Research
        </button>
        <button type="button" disabled={!canCancel} onClick={onCancel}>
          Cancel Research
        </button>
        {cancelBlocked ? (
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Cancellation locked after the first turn for Tier II/III projects.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ResearchTreePanel() {
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const customNations = useCampaignStore((s) => s.customNations);
  const researchByNation = useCampaignStore((s) => s.researchByNation);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const suppliesByNation = useCampaignStore((s) => s.suppliesByNation);
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);
  const intelByTerritory = useCampaignStore((s) => s.intelByTerritory);
  const startResearch = useCampaignStore((s) => s.startResearch);
  const cancelResearch = useCampaignStore((s) => s.cancelResearch);
  const recommendations = useMemo(
    () =>
      buildResearchRecommendations(
        {
          researchByNation,
          customNations,
          platoonsById,
          suppliesByNation,
          territoryNameById,
          intelByTerritory,
        },
        viewerNation,
      ),
    [
      researchByNation,
      customNations,
      platoonsById,
      suppliesByNation,
      territoryNameById,
      intelByTerritory,
      viewerNation,
    ],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    RESEARCH_NODES[0]?.id ?? null,
  );

  const researchState =
    researchByNation[viewerNation] ??
    ({ progressTurns: 0, completedResearch: [] } as NationResearchState);

  const selectedNode = selectedNodeId
    ? RESEARCH_NODES_BY_ID[selectedNodeId]
    : null;
  const selectedStatus = selectedNode
    ? nodeStatus(selectedNode, researchState)
    : null;

  const nodesByTree = useMemo(() => {
    const map = new Map<string, ResearchNode[]>();
    for (const tree of RESEARCH_TREES) map.set(tree, []);
    for (const node of RESEARCH_NODES) {
      const list = map.get(node.tree);
      if (list) list.push(node);
      else map.set(node.tree, [node]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    }
    return map;
  }, []);

  const nationDisplayName = nationLabel(viewerNation, customNations);
  const activeNode = researchState.activeResearchId
    ? RESEARCH_NODES_BY_ID[researchState.activeResearchId]
    : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 700 }}>National Research Tree</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {nationDisplayName} · One active research project at a time
        </div>
        {activeNode ? (
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
            Active: {activeNode.name} ({researchState.progressTurns}/
            {activeNode.timeTurns} turns)
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
            No active research selected.
          </div>
        )}
      </div>

      {recommendations.length ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10,
            padding: 10,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Recommendations</div>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {recommendations.map((rec) => {
              const node = RESEARCH_NODES_BY_ID[rec.nodeId];
              if (!node) return null;
              return (
                <div key={rec.nodeId} style={{ fontSize: 12 }}>
                  <strong>{node.name}</strong> · score {rec.score}
                  {rec.reasons.length ? (
                    <div style={{ opacity: 0.75 }}>{rec.reasons.join(" ")}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        {RESEARCH_TREES.map((tree) => {
          const nodes = nodesByTree.get(tree) ?? [];
          const tiers = [1, 2, 3] as const;
          return (
            <div key={tree} style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>{tree}</div>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                {tiers.map((tier) => {
                  const nodesInTier = nodes.filter((n) => n.tier === tier);
                  return (
                    <div key={tier} style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {TIER_LABELS[tier]}
                      </div>
                      {nodesInTier.length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {nodesInTier.map((node) => (
                            <StrategicNodeCard
                              key={node.id}
                              node={node}
                              status={nodeStatus(node, researchState)}
                              selected={selectedNodeId === node.id}
                              onSelect={setSelectedNodeId}
                            />
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.45 }}>
                          No nodes seeded.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Node Details</div>
        <NodeDetailPanel
          node={selectedNode}
          status={selectedStatus}
          state={researchState}
          onStart={() => {
            if (!selectedNode) return;
            startResearch(viewerNation, selectedNode.id);
          }}
          onCancel={() => cancelResearch(viewerNation)}
        />
      </div>
    </div>
  );
}
