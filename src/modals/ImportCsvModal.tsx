import { useMemo, useState } from "react";
import { clickable } from "../lib/a11y";
import ErrorBox from "../components/ErrorBox";
import Modal from "../components/Modal";
import { C, R, S, T } from "../lib/constants";
import { fmt } from "../lib/format";
import { buildRows, guessColumns, parseCSV, type ColumnMap, type ParsedRow } from "../lib/csvImport";
import type { Account, Transaction } from "../types";

/**
 * Importa el estado de cuenta del banco. Tres pasos: pegar o subir el archivo,
 * confirmar qué columna es qué, y revisar antes de escribir nada.
 */
export default function ImportCsvModal({
  accs,
  txs,
  onImport,
  onClose,
}: {
  accs: Account[];
  txs: Transaction[];
  onImport: (rows: ParsedRow[], accountId: string) => Promise<number>;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [dayFirst, setDayFirst] = useState(true);
  const [accountId, setAccountId] = useState(accs[0]?.id ?? "");
  const [map, setMap] = useState<Partial<ColumnMap>>({});
  const [touched, setTouched] = useState(false);
  const [skips, setSkips] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const grid = useMemo(() => (raw.trim() ? parseCSV(raw) : []), [raw]);
  const header = grid[0] ?? [];

  // Al cargar el archivo se adivinan las columnas; después manda el usuario.
  const effectiveMap = useMemo<Partial<ColumnMap>>(
    () => (touched ? map : { ...guessColumns(header), ...map }),
    [header, map, touched]
  );

  const ready = effectiveMap.date !== undefined && effectiveMap.description !== undefined && effectiveMap.amount !== undefined;

  const rows = useMemo(() => {
    if (!ready || !grid.length) return [];
    return buildRows(grid, effectiveMap as ColumnMap, txs, { hasHeader, dayFirst });
  }, [grid, effectiveMap, ready, txs, hasHeader, dayFirst]);

  const willImport = rows.filter((_, i) => !(skips[i] ?? rows[i].skip));
  const dupes = rows.filter((r) => r.duplicate).length;
  const neto = willImport.reduce((s, r) => s + (r.kind === "ingreso" ? r.amount : -r.amount), 0);

  const readFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => { setRaw(String(reader.result ?? "")); setTouched(false); setMap({}); setSkips({}); };
    reader.readAsText(f, "utf-8");
  };

  const run = async () => {
    if (!accountId) { setError("Elige a qué cuenta pertenecen estos movimientos"); return; }
    if (!willImport.length) { setError("No hay movimientos por importar"); return; }
    setLoading(true);
    setError("");
    try {
      await onImport(willImport, accountId);
    } catch (e: any) {
      setError(e?.message || "No se pudo importar");
      setLoading(false);
    }
  };

  const colSelect = (key: keyof ColumnMap, label: string, optional = false) => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <label htmlFor="importcsvmodal-1" style={S.lbl}>{label}</label>
      <select id="importcsvmodal-1"
        style={{ ...S.inp, padding: "9px 11px" }}
        value={effectiveMap[key] ?? ""}
        onChange={(e) => { setTouched(true); setMap((m) => ({ ...effectiveMap, ...m, [key]: e.target.value === "" ? undefined : Number(e.target.value) })); }}
      >
        <option value="">{optional ? "(ninguna)" : "Elegir…"}</option>
        {header.map((h, i) => <option key={i} value={i}>{h.trim() || `Columna ${i + 1}`}</option>)}
      </select>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 4 }}>Importar del banco</div>
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 16 }}>
        Sube el CSV de tu estado de cuenta o pega su contenido. Nada se guarda hasta que revises la vista previa.
      </div>

      <label htmlFor="importcsvmodal-2" style={S.lbl}>Archivo CSV</label>
      <input id="importcsvmodal-2"
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
        style={{ ...S.inp, marginBottom: 10, padding: "9px 11px" }}
      />
      <textarea
        style={{ ...S.inp, marginBottom: 12, minHeight: 70, fontFamily: "monospace", fontSize: T.sm, resize: "vertical" }}
        placeholder="…o pega aquí las filas"
        value={raw}
        onChange={(e) => { setRaw(e.target.value); setTouched(false); setMap({}); setSkips({}); }}
      />

      {grid.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button onClick={() => setHasHeader(!hasHeader)} style={{ padding: "6px 12px", borderRadius: R.pill, border: `1px solid ${hasHeader ? C.accent : C.border}`, background: hasHeader ? C.accent + "22" : "transparent", color: hasHeader ? C.aLight : C.muted, fontSize: T.sm, cursor: "pointer" }}>
              {hasHeader ? "☑" : "⬜"} Primera fila son títulos
            </button>
            <button onClick={() => setDayFirst(!dayFirst)} style={{ padding: "6px 12px", borderRadius: R.pill, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: T.sm, cursor: "pointer" }}>
              Fechas: {dayFirst ? "día/mes" : "mes/día"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {colSelect("date", "Fecha")}
            {colSelect("description", "Descripción")}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {colSelect("amount", "Cargo o monto")}
            {colSelect("credit", "Abono (si va aparte)", true)}
          </div>

          <label htmlFor="importcsvmodal-3" style={S.lbl}>Cuenta</label>
          <select id="importcsvmodal-3" style={{ ...S.inp, marginBottom: 12 }} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Elige la cuenta</option>
            {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </>
      )}

      {ready && rows.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: T.md, fontWeight: 700 }}>{willImport.length} de {rows.length} movimientos</span>
            <span style={{ fontSize: T.sm, color: neto >= 0 ? C.green : C.red, fontWeight: 700 }}>{neto >= 0 ? "+" : ""}{fmt(neto)}</span>
          </div>
          {dupes > 0 && (
            <div style={{ fontSize: T.xs, color: C.amber, marginBottom: 8 }}>
              {dupes} {dupes === 1 ? "parece repetido" : "parecen repetidos"} y {dupes === 1 ? "viene" : "vienen"} desmarcado{dupes === 1 ? "" : "s"}. Puedes incluirlos si de verdad ocurrieron dos veces.
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.border}44`, borderRadius: R.md, marginBottom: 16 }}>
            {rows.map((r, i) => {
              const skip = skips[i] ?? r.skip;
              return (
                <div key={i} {...clickable(() => setSkips((s) => ({ ...s, [i]: !skip })))} aria-pressed={!skip} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${C.border}22`, cursor: "pointer", opacity: skip ? 0.4 : 1 }}>
                  <span style={{ fontSize: T.md }}>{skip ? "⬜" : "☑️"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                    <div style={{ fontSize: T.xs, color: r.duplicate ? C.amber : C.muted }}>
                      {r.date.toLocaleDateString("es-MX")}{r.duplicate ? " · ya existe uno igual" : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: r.kind === "ingreso" ? C.green : C.red }}>
                    {r.kind === "ingreso" ? "+" : "-"}{fmt(r.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {grid.length > 0 && !ready && (
        <div style={{ fontSize: T.sm, color: C.amber, marginBottom: 16 }}>Indica qué columna tiene la fecha, la descripción y el monto.</div>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 2, opacity: loading || !willImport.length ? 0.6 : 1 }} disabled={loading || !willImport.length} onClick={run}>
          {loading ? "Importando…" : `Importar ${willImport.length || ""}`.trim()}
        </button>
      </div>
    </Modal>
  );
}
