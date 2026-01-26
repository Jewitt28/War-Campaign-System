import type { ReactNode } from "react";

export type StrategicNodeStatus = "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED";

type Props = {
  title: string;
  subtitle?: string;
  description: string;
  status: StrategicNodeStatus;
  selected?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
};

const STATUS_COLORS: Record<StrategicNodeStatus, string> = {
  ACTIVE: "#8ad4ff",
  COMPLETED: "#8dffb2",
  AVAILABLE: "#ffd28a",
  LOCKED: "rgba(255,255,255,0.2)",
};

export default function StrategicNodeCard({
  title,
  subtitle,
  description,
  status,
  selected,
  onSelect,
  children,
}: Props) {
  const statusColor = STATUS_COLORS[status];
  return (
    <div
      style={{
        border: `1px solid ${statusColor}`,
        borderRadius: 10,
        padding: 10,
        background: selected ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div>
          ) : null}
        </div>
        {onSelect ? (
          <button type="button" onClick={onSelect}>
            Select
          </button>
        ) : null}
      </div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{description}</div>
      {children ? <div style={{ display: "grid", gap: 6 }}>{children}</div> : null}
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          opacity: 0.7,
        }}
      >
        {status}
      </div>
    </div>
  );
}
