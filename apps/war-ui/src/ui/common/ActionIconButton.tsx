// src/ui/common/ActionIconButton.tsx
import React from "react";

type Props = {
  title: string;
  label: string;
  iconSrc?: string; // if you have your own icon images
  icon?: React.ReactNode; // fallback if using emoji/svg
  disabled?: boolean;
  onClick?: () => void;
};

export default function ActionIconButton({ title, label, iconSrc, icon, disabled, onClick }: Props) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 8,
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.14)",
        background: "rgba(0,0,0,.18)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ width: 28, height: 28, display: "grid", placeItems: "center" }}>
        {iconSrc ? <img src={iconSrc} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} /> : icon ?? "•"}
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{label}</div>
      </div>
    </button>
  );
}
