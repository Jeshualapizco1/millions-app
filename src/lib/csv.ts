import type { Transaction } from "../types";
import { toLocalDateISO } from "./dates";

const BOM = String.fromCharCode(0xfeff);

/** Escapado RFC 4180: comillas dobladas y campo entrecomillado si hace falta. */
const esc = (v: string | number): string => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Signo para el CSV: solo el ingreso suma; todo lo demás sale de la cuenta origen. */
const signed = (t: Transaction) => (t.kind === "ingreso" ? t.amount : -t.amount);

export const exportCSV = (txs: Transaction[]) => {
  const rows: (string | number)[][] = [
    ["Fecha", "FechaISO", "Descripción", "Movimiento", "Categoría", "Cuenta", "Monto"],
    ...txs.map((t) => [
      new Date(t.date).toLocaleDateString("es-MX"),
      toLocalDateISO(t.date),
      t.description,
      t.kind,
      t.category,
      t.toAccountName ? `${t.accountName} → ${t.toAccountName}` : t.accountName,
      signed(t),
    ]),
  ];
  const csv = BOM + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
    download: `millions-${toLocalDateISO()}.csv`,
  });
  a.click();
};
