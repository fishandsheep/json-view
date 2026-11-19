import React from "react";
import { LuShieldCheck, LuCopyMinus, LuCopyPlus } from "react-icons/lu";

export const SecureInfo: React.FC = () => (
  <div
    className="icon-btn"
    role="img"
    aria-label="Your data is processed locally on your device."
    data-tip="Your data is processed locally on your device."
    style={{
      position: "absolute",
      bottom: 14,
      right: 14,
      zIndex: 3,
      width: 32,
      height: 32,
      borderRadius: "50%",
      color: "#0ca678",
      background: "color-mix(in oklch, #0ca678 14%, transparent)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 2px 8px rgba(0,0,0,.08), 0 0 0 1px rgba(20,184,166,.15)",
    }}
  >
    <LuShieldCheck size={18} />
  </div>
);

export const NotSupported: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      background: "var(--canvas-bg)",
      color: "var(--text-muted)",
      zIndex: 5,
    }}
  >
    <LuCopyMinus size={42} opacity={0.4} />
    <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-normal)" }}>
      The JSON is too deep to visualize
    </div>
    <div style={{ fontSize: 13 }}>Only up to 1500 elements are supported in the graph view.</div>
    <div style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
      <LuCopyPlus size={14} /> Collapse deeper nodes in the tree view instead.
    </div>
  </div>
);
