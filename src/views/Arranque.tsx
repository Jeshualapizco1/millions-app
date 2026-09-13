import { useRef, useState } from "react";
import { C, R, S, T, ACC_ICONS } from "../lib/constants";
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
  const submitting = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validas = filas.filter((f) => f.name.trim());
  const nombresDisponibles = [...cuentasExistentes, ...validas.map((f) => f.name.trim())];

  const agregar = (name: string, icon: string) => setFilas((f) => [...f, { name, balance: "", icon }]);
  const quitar = (i: number) => setFilas((f) => f.filter((_, k) => k !== i));
  const cambiar = (i: number, patch: Partial<Fila>) =>
    setFilas((f) => f.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const terminar = async () => {
    if (submitting.current) return;
    submitting.current = true;
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
      submitting.current = false;
      setGuardando(false);
    }
  };

  const saltar = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setGuardando(true);
    setError(null);
    try {
      if (paso === 1) await onSkip();
      else await onFinish({
        cuentas: validas.map((f) => ({ name: f.name.trim(), balance: parseFloat(f.balance) || 0, icon: f.icon })),
        ingreso: paso > 2 && ingActivo && parseFloat(ingMonto) > 0 && ingCuenta ? { name: ingNombre.trim() || "Nómina", amount: parseFloat(ingMonto), cuenta: ingCuenta, dia: Number(ingDia) || 1 } : null,
        techo: null,
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo continuar. Inténtalo de nuevo.");
      submitting.current = false;
      setGuardando(false);
    }
  };

  const titulo = ["", "Empieza por una cuenta", "¿Cuánto entra al mes?", "¿Cuánto quieres gastar?"][paso];
  const bajada = [
    "",
    "Efectivo o una cuenta de débito. Tus tarjetas y otros créditos van por separado en Mi dinero.",
    "Tu nómina o ingreso fijo. Se registra solo cada mes, y con eso la app puede proyectar tu cierre.",
    "Un techo mensual de gasto. Compara tus gastos registrados con este límite. Puedes ajustarlo después.",
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

        {paso === 1 && <div style={{ fontSize: T.md, color: C.muted, marginBottom: 6 }}>Hola, {nombre} 👋</div>}
        <div style={{ fontSize: T.hero, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>{titulo}</div>
        <div style={{ fontSize: T.md, color: C.muted, lineHeight: 1.5, marginBottom: 22 }}>{bajada}</div>

        <div style={{ flex: 1 }}>
          {paso === 1 && (
            <>
              {cuentasExistentes.length > 0 && (
                <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 12 }}>
                  Ya tienes: {cuentasExistentes.join(", ")}
                </div>
              )}
              {filas.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select
                    aria-label={`Icono de cuenta ${i+1}`} value={f.icon}
                    onChange={(e) => cambiar(i, { icon: e.target.value })}
                    style={{ ...S.inp, width: 62, flex: "0 0 auto", padding: "12px 6px", fontSize: T.xxl, textAlign: "center" }}
                  >
                    {ACC_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input
                    style={{ ...S.inp, flex: 1, minWidth: 0 }}
                    aria-label={`Nombre de cuenta ${i+1}`} placeholder="Nombre"
                    value={f.name}
                    onChange={(e) => cambiar(i, { name: e.target.value })}
                  />
                  <input
                    style={{ ...S.inp, width: 108, flex: "0 0 auto" }}
                    type="number"
                    inputMode="decimal"
                    aria-label={`Saldo de cuenta ${i+1}`} placeholder="Saldo"
                    value={f.balance}
                    onChange={(e) => cambiar(i, { balance: e.target.value })}
                  />
                  <button aria-label={`Quitar cuenta ${i+1}`} onClick={() => quitar(i)} style={{ background: "none", border: "none", color: C.muted, fontSize: T.xl, cursor: "pointer", padding: "0 2px" }}>✕</button>
                </div>
              ))}

              <div style={{ fontSize: T.sm, color: C.muted, margin: "18px 0 10px" }}>Toca para agregar</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SUGERIDAS.filter((s) => !nombresDisponibles.includes(s.name)).map((s) => (
                  <button
                    key={s.name}
                    onClick={() => agregar(s.name, s.icon)}
                    style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}44`, color: C.aLight, borderRadius: R.pill, padding: "8px 14px", fontSize: T.md, fontWeight: 600, cursor: "pointer" }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
                <button
                  onClick={() => agregar("", "🏦")}
                  style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: R.pill, padding: "8px 14px", fontSize: T.md, cursor: "pointer" }}
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
                  <label htmlFor="arranque-1" style={S.lbl}>¿Cómo le llamas?</label>
                  <input id="arranque-1" style={{ ...S.inp, marginBottom: 14 }} value={ingNombre} onChange={(e) => setIngNombre(e.target.value)} placeholder="Nómina" />
                  <label htmlFor="arranque-2" style={S.lbl}>¿Cuánto?</label>
                  <input id="arranque-2" style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={ingMonto} onChange={(e) => setIngMonto(e.target.value)} />
                  <label htmlFor="arranque-3" style={S.lbl}>¿A qué cuenta llega?</label>
                  <select id="arranque-3" style={{ ...S.inp, marginBottom: 14 }} value={ingCuenta} onChange={(e) => setIngCuenta(e.target.value)}>
                    <option value="">Selecciona una cuenta</option>
                    {nombresDisponibles.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <label htmlFor="arranque-4" style={S.lbl}>¿Qué día del mes?</label>
                  <input id="arranque-4" style={{ ...S.inp, marginBottom: 14 }} type="number" min={1} max={28} value={ingDia} onChange={(e) => setIngDia(e.target.value)} />
                  <div style={{ fontSize: T.sm, color: C.muted, lineHeight: 1.5 }}>
                    Si cobras después del 28, pon 28: así nunca se salta un mes corto.
                  </div>
                </>
              )}
            </>
          )}

          {paso === 3 && (
            <>
              <label htmlFor="arranque-budget" style={S.lbl}>Techo mensual de gasto</label>
              {/* Sin autoFocus: abría el teclado al entrar y tapaba la explicación de qué es el techo. */}
              <input id="arranque-budget" style={{ ...S.inp, marginBottom: 14, fontSize: T.xxl, fontWeight: 700 }} type="number" inputMode="decimal" placeholder="0.00" value={techo} onChange={(e) => setTecho(e.target.value)} />
              {parseFloat(ingMonto) > 0 && (
                <button
                  onClick={() => setTecho(String(Math.round(parseFloat(ingMonto) * 0.7)))}
                  style={{ ...S.btnO, width: "100%", marginBottom: 14 }}
                >
                  Usar {fmt(Math.round(parseFloat(ingMonto) * 0.7))} — el 70% de lo que entra
                </button>
              )}
              <div style={{ fontSize: T.sm, color: C.muted, lineHeight: 1.5 }}>
                No es un límite duro: nadie te va a bloquear nada. Es la referencia contra
                la que se mide tu ritmo del mes.
              </div>
            </>
          )}
        </div>

        {error && <div style={{ fontSize: T.md, color: C.red, fontWeight: 600, margin: "14px 0" }}>{error}</div>}

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
          style={{ background: "none", border: "none", color: C.muted, fontSize: T.md, cursor: "pointer", padding: "16px 0 0", textAlign: "center" }}
        >
          {paso === 1 ? "Saltar por ahora" : "Saltar lo que falta"}
        </button>
      </div>
    </div>
  );
}
