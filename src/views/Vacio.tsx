import { C, S } from "../lib/constants";

/**
 * Lo que ve quien saltó el arranque y todavía no tiene ni una cuenta.
 *
 * Antes aterrizaba en el tablero de siempre: un "Saldo Total $0", un
 * patrimonio en cero, una gráfica de seis meses vacía y una dona sin datos.
 * Seis tarjetas diciendo "no hay nada" no le dicen a nadie qué hacer.
 *
 * Tres salidas y nada más. Sin cuenta no se puede capturar ni importar, así
 * que la cuenta va primero; el arranque es para quien se arrepintió de
 * saltarlo; y el crédito es para quien vino por las fechas de corte, que es
 * el diferenciador de la app y no necesita cuenta.
 */
export default function Vacio({
  nombre,
  onNewAcc,
  onArranque,
  onAddCredit,
}: {
  nombre: string;
  onNewAcc: () => void;
  onArranque: () => void;
  onAddCredit: () => void;
}) {
  return (
    <div className="fadeUp">
      <div style={{ ...S.card, padding: "28px 20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🌱</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.3, marginBottom: 8 }}>
          Hola, {nombre}
        </div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginBottom: 22 }}>
          Millions todavía no sabe nada de tu dinero. Con una sola cuenta ya
          puedes capturar gastos por voz y ver tu saldo.
        </div>

        <Opcion
          icon="🏦"
          titulo="Crear mi primera cuenta"
          detalle="Banco, efectivo o app de pagos, con lo que tenga hoy"
          principal
          onClick={onNewAcc}
        />
        <Opcion
          icon="🚀"
          titulo="Hacer el arranque guiado"
          detalle="Cuentas, cuánto te entra al mes y tu techo de gasto. Dos minutos"
          onClick={onArranque}
        />
        <Opcion
          icon="💳"
          titulo="Registrar un crédito"
          detalle="Para que te avise antes del corte y del pago"
          onClick={onAddCredit}
        />
      </div>

      <div style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5, padding: "0 16px" }}>
        También puedes tocar ＋ y decir algo como “gasté 200 en el Ley”, pero
        primero hace falta una cuenta donde cargarlo.
      </div>
    </div>
  );
}

function Opcion({
  icon,
  titulo,
  detalle,
  principal,
  onClick,
}: {
  icon: string;
  titulo: string;
  detalle: string;
  principal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        background: principal ? `linear-gradient(135deg,${C.accent},#9333ea)` : C.surface,
        border: principal ? "none" : `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        cursor: "pointer",
        color: principal ? "#fff" : C.text,
        boxShadow: principal ? "0 6px 18px #7c6af744" : "none",
      }}
    >
      <span style={{ fontSize: 24, width: 32, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{titulo}</span>
        <span style={{ display: "block", fontSize: 12, marginTop: 2, lineHeight: 1.4, color: principal ? "#ffffffcc" : C.muted }}>{detalle}</span>
      </span>
      <span style={{ fontSize: 18, color: principal ? "#ffffffcc" : C.muted, flexShrink: 0 }}>›</span>
    </button>
  );
}
