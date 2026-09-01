import { C, S, T, ACC_ICONS } from "../lib/constants";
import type { AccDraft } from "../hooks/useAI";

/**
 * Una cuenta dictada, editable antes de crearla.
 *
 * La captura de movimientos ya pasaba por un borrador; crear una cuenta por
 * voz seguía guardando directo. Es menos dañino —una cuenta mal nombrada se
 * ve de inmediato— pero el saldo inicial no: entra al patrimonio neto tal
 * como el modelo lo haya entendido, y nadie vuelve a mirarlo.
 */
export default function AccDraftChips({
  draft,
  error,
  busy,
  update,
  onConfirm,
  onDiscard,
}: {
  draft: AccDraft;
  error: string | null;
  busy: boolean;
  update: (patch: Partial<AccDraft>) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 10, fontStyle: "italic", lineHeight: 1.4 }}>
        “{draft.dicho}”
      </div>
      <div style={{ fontSize: T.md, fontWeight: 700, color: C.aLight, marginBottom: 12 }}>Nueva cuenta</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <select
          value={draft.icon}
          onChange={(e) => update({ icon: e.target.value })}
          style={{ ...S.inp, width: 62, flex: "0 0 auto", padding: "12px 6px", fontSize: T.xxl, textAlign: "center" }}
        >
          {ACC_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
        </select>
        <input
          style={{ ...S.inp, flex: 1, minWidth: 0 }}
          placeholder="Nombre de la cuenta"
          value={draft.accountName}
          onChange={(e) => update({ accountName: e.target.value })}
        />
      </div>

      <label style={S.lbl}>Saldo con el que empieza</label>
      <input
        style={{ ...S.inp, marginBottom: 14 }}
        type="number"
        inputMode="decimal"
        value={draft.balance}
        onChange={(e) => update({ balance: e.target.value })}
      />

      {error && <div style={{ fontSize: T.md, color: C.red, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onDiscard} disabled={busy} style={{ ...S.btnO, flex: 1 }}>Descartar</button>
        <button onClick={onConfirm} disabled={busy} style={{ ...S.btn(), flex: 2 }}>
          {busy ? "Creando…" : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}
