import type { ReactNode } from "react";
import { C } from "../lib/constants";

export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, animation: "fadeIn 0.15s ease" }}
      onClick={onClose}
    >
      <div
        style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", animation: "slideUp 0.22s ease", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />
        {children}
      </div>
    </div>
  );
}
