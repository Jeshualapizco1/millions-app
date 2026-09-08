import { createContext, useContext, useMemo, useState } from "react";
import { moneyParts } from "../lib/presentation";
import Icon from "./Icon";

const Privacy = createContext({ hidden: false, toggle: () => {} });
export function MoneyPrivacy({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, toggle: () => setHidden((v) => !v) }), [hidden]);
  return <Privacy.Provider value={value}>{children}</Privacy.Provider>;
}
export const useMoneyPrivacy = () => useContext(Privacy);
export function PrivacyButton() {
  const { hidden, toggle } = useMoneyPrivacy();
  return <button type="button" title="Ocultar importes en resúmenes y listas. Los formularios y el asistente mantienen sus datos para revisarlos." className="icon-button" onClick={toggle} aria-label={hidden ? "Mostrar cifras" : "Ocultar cifras"} aria-pressed={hidden}><Icon name={hidden ? "ojo-cerrado" : "ojo"} /></button>;
}
export default function Money({ value, currency = "MXN", size = "body", signed = false, privateValue = true }: {
  value: number | string | null | undefined; currency?: string; size?: "hero" | "stat" | "body"; signed?: boolean; privateValue?: boolean;
}) {
  const { hidden } = useMoneyPrivacy();
  const data = moneyParts(value, currency, signed);
  // Ocultar elimina también el importe del árbol accesible, no solo sus píxeles.
  if (hidden && privateValue) return <span className={`money money-${size}`} aria-label="Importe oculto">••••</span>;
  return <span className={`money money-${size}${data.long ? " money-long" : ""}`} aria-label={data.text}>
    <span aria-hidden="true">{data.parts.map((p, i) => <span className={`money-${p.type}`} key={i}>{p.value}</span>)}</span>
  </span>;
}
