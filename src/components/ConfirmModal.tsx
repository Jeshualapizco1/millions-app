import Modal from "./Modal";
import { C, S } from "../lib/constants";

/** Confirmación para acciones destructivas que no tienen deshacer. */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, marginBottom: 22 }}>{message}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button
          style={{ flex: 1, background: C.red, color: "#fff", border: "none", borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
