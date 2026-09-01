import { useState } from "react";
import ErrorBox from "../components/ErrorBox";
import Modal from "../components/Modal";
import { S, T } from "../lib/constants";
import { api } from "../lib/api";

/** Cambio de contraseña del usuario autenticado. */
export default function PasswordModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (p1.length < 8) { setError("Mínimo 8 caracteres"); return; }
    if (p1 !== p2) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError("");
    try {
      await api.changePassword(p1);
      onDone();
    } catch (e: any) {
      setError(e?.message || "No se pudo cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>Cambiar contraseña</div>
      <label style={S.lbl}>Nueva contraseña</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 12 }} type="password" placeholder="Mínimo 8 caracteres" value={p1} onChange={(e) => setP1(e.target.value)} />
      <label style={S.lbl}>Confírmala</label>
      <input style={{ ...S.inp, marginBottom: 16 }} type="password" placeholder="••••••••" value={p2} onChange={(e) => setP2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Guardar"}</button>
      </div>
    </Modal>
  );
}
