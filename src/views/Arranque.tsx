import { useState } from "react";
import { ACC_ICONS, C, S } from "../lib/constants";
import { fmt } from "../lib/format";

/** Lo que el arranque entrega de una sola vez, ya validado. */
export interface ArranqueResult {
  cuentas: { name: string; balance: number; icon: string }[];
  ingreso: { name: string; amount: number; cuenta: string; dia: number } | null;
  techo: number | null;
}

/** Bancos comunes en México: teclear menos es la mitad de terminar el arranque. */
const SUGERIDAS: { name: string; icon: string }[] = [
  { name: "Efectivo", icon: "💵" },
  { name: "BBVA", icon: "🏦" },
  { name: "Nu", icon: "💜" },
  { name: "Banorte", icon: "🏦" },
  { name: "Santander", icon: "🏦" },
  { name: "Mercado Pago", icon: "📱" },
  { name: "HSBC", icon: "🏦" },
  { name: "Banamex", icon: "🏦" },
];

interface Fila { name: string; balance: string; icon: string }

/**
 * Arranque guiado: tres preguntas y la app deja de estar vacía.
 *
 * Antes un desconocido entraba a un tablero sin cuentas, y sin cuentas no hay
 * saldo, sin saldo no hay patrimonio y sin movimientos fijos no hay proyección
 * de cierre — media app apagada por falta de configuración, no de funciones.
 *
 * Tres pantallas, no diez. Y se puede saltar: obligar a configurar antes de
 * dejar ver nada es la forma más rápida de que alguien cierre y no vuelva.
 */
export default function Arranque({
  nombre,
  cuentasExistentes,
  onFinish,
  onSkip,
}: {
  nombre: string;
  /** Nombres ya creados: si se abandonó a medias, no se vuelven a proponer. */
  cuentasExistentes: string[];
  onFinish: (r: ArranqueResult) => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [paso, setPaso] = useState(1);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [ingActivo, setIngActivo] = useState(true);
  const [ingNombre, setIngNombre] = useState("Nómina");
  const [ingMonto, setIngMonto] = useState("");
  const [ingCuenta, setIngCuenta] = useState("");
  const [ingDia, setIngDia] = useState("1");
  const [techo, setTecho] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validas = filas.filter((f) => f.name.trim());
  const nombresDisponibles = [...cuentasExistentes, ...validas.map((f) => f.name.trim())];

  const agregar = (name: string, icon: string) => setFilas((f) => [...f, { name, balance: "", icon }]);
  const quitar = (i: number) => setFilas((f) => f.filter((_, k) => k !== i));
  const cambiar = (i: number, patch: Partial<Fila>) =>
    setFilas((f) => f.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const terminar = async () => {
    setGuardando(true);
    setError(null);
    const monto = parseFloat(ingMonto);
    try {
      await onFinish({
        cuentas: validas.map((f) => ({ name: f.name.trim(), balance: parseFloat(f.balance) || 0, icon: f.icon })),
        ingreso:
          ingActivo && monto > 0 && ingCuenta
            ? { name: ingNombre.trim() || "Nómina", amount: monto, cuenta: ingCuenta, dia: Number(ingDia) || 1 }
            : null,
        techo: parseFloat(techo) > 0 ? parseFloat(techo) : null,
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar. Inténtalo de nuevo.");
      setGuardando(false);
    }
  };

  const saltar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await onSkip();
    } catch (e: any) {
      setError(e?.message || "No se pudo continuar. Inténtalo de nuevo.");
      setGuardando(false);
    }
  };

  const titulo = ["", "¿Qué cuentas tienes?", "¿Cuánto entra al mes?", "¿Cuánto quieres gastar?"][paso];
  const bajada = [
    "",
    "Con esto ya tienes saldo total y patrimonio neto. Puedes agregar más después.",
    "Tu nómina o ingreso fijo. Se registra solo cada mes, y con eso la app puede proyectar tu cierre.",
    "Un techo mensual de gasto. Te avisamos antes de rebasarlo, no después.",
  ][paso];

  const sinCuentas = validas.length === 0 && cuentasExistentes.length === 0;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 520, width: "100%", margin: "0 auto", padding: "calc(env(safe-area-inset-top,0px) + 28px) 20px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Tres puntos: saber cuánto falta es la diferencia entre terminar y cerrar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= paso ? C.accent : C.border }} />
          ))}
        </div>

        {paso === 1 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Hola, {nombre} 👋</div>}
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>{titulo}</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginBottom: 22 }}>{bajada}</div>

        <div style={{ flex: 1 }}>
          {paso === 1 && (
            <>
              {cuentasExistentes.length > 0 && (
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                  Ya tienes: {cuentasExistentes.join(", ")}
                </div>
              )}
              {filas.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select
                    value={f.icon}
                    onChange={(e) => cambiar(i, { icon: e.target.value })}
                    style={{ ...S.inp, width: 62, flex: "0 0 auto", padding: "12px 6px", fontSize: 20, textAlign: "center" }}
                  >
                    {ACC_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input
                    style={{ ...S.inp, flex: 1, minWidth: 0 }}
                    placeholder="Nombre"
                    value={f.name}
                    onChange={(e) => cambiar(i, { name: e.target.value })}
                  />
                  <input
                    style={{ ...S.inp, width: 108, flex: "0 0 auto" }}
                    type="number"
                    inputMode="decimal"
                    placeholder="Saldo"
                    value={f.balance}
                    onChange={(e) => cambiar(i, { balance: e.target.value })}
                  />
                  <button onClick={() => quitar(i)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 2px" }}>✕</button>
                </div>
              ))}

              <div style={{ fontSize: 12, color: C.muted, margin: "18px 0 10px" }}>Toca para agregar</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SUGERIDAS.filter((s) => !nombresDisponibles.includes(s.name)).map((s) => (
                  <button
                    key={s.name}
                    onClick={() => agregar(s.name, s.icon)}
                    style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}44`, color: C.aLight, borderRadius: 999, padding: "8px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
                <button
                  onClick={() => agregar("", "🏦")}
                  style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 999, padding: "8px 14px", fontSize: 13.5, cursor: "pointer" }}
                >
                  ＋ Otra
                </button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              {!ingActivo ? (
                <button onClick={() => setIngActivo(true)} style={{ ...S.btnO, width: "100%" }}>Sí tengo un ingreso fijo</button>
              ) : (
                <>
                  <label style={S.lbl}>¿Cómo le llamas?</label>
                  <input style={{ ...S.inp, marginBottom: 14 }} value={ingNombre} onChange={(e) => setIngNombre(e.target.value)} placeholder="Nómina" />
                  <label style={S.lbl}>¿Cuánto?</label>
                  <input style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={ingMonto} onChange={(e) => setIngMonto(e.target.value)} />
                  <label style={S.lbl}>¿A qué cuenta llega?</label>
                  <select style={{ ...S.inp, marginBottom: 14 }} value={ingCuenta} onChange={(e) => setIngCuenta(e.target.value)}>
                    <option value="">Selecciona una cuenta</option>
                    {nombresDisponibles.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <label style={S.lbl}>¿Qué día del mes?</label>
                  <input style={{ ...S.inp, marginBottom: 14 }} type="number" min={1} max={28} value={ingDia} onChange={(e) => setIngDia(e.target.value)} />
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
                    Si cobras después del 28, pon 28: así nunca se salta un mes corto.
                  </div>
                </>
              )}
            </>
          )}

          {paso === 3 && (
            <>
              <label style={S.lbl}>Techo mensual de gasto</label>
              {/* Sin autoFocus: abría el teclado al entrar y tapaba la explicación de qué es el techo. */}
              <input style={{ ...S.inp, marginBottom: 14, fontSize: 20, fontWeight: 700 }} type="number" inputMode="decimal" placeholder="0.00" value={techo} onChange={(e) => setTecho(e.target.value)} />
              {parseFloat(ingMonto) > 0 && (
                <button
                  onClick={() => setTecho(String(Math.round(parseFloat(ingMonto) * 0.7)))}
                  style={{ ...S.btnO, width: "100%", marginBottom: 14 }}
                >
                  Usar {fmt(Math.round(parseFloat(ingMonto) * 0.7))} — el 70% de lo que entra
                </button>
              )}
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
                No es un límite duro: nadie te va a bloquear nada. Es la referencia contra
                la que se mide tu ritmo del mes.
              </div>
            </>
          )}
        </div>

        {error && <div style={{ fontSize: 13, color: C.red, fontWeight: 600, margin: "14px 0" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {paso > 1 && <button style={{ ...S.btnO, flex: "0 0 auto" }} onClick={() => setPaso((p) => p - 1)} disabled={guardando}>Atrás</button>}
          {paso < 3 ? (
            <button
              style={{ ...S.btn(), flex: 1, opacity: paso === 1 && sinCuentas ? 0.5 : 1 }}
              onClick={() => setPaso((p) => p + 1)}
              disabled={paso === 1 && sinCuentas}
            >
              Continuar
            </button>
          ) : (
            <button style={{ ...S.btn(), flex: 1 }} onClick={terminar} disabled={guardando}>
              {guardando ? "Guardando…" : "Listo"}
            </button>
          )}
        </div>

        <button
          onClick={saltar}
          disabled={guardando}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: "16px 0 0", textAlign: "center" }}
        >
          {paso === 1 ? "Saltar por ahora" : "Saltar lo que falta"}
        </button>
      </div>
    </div>
  );
}
