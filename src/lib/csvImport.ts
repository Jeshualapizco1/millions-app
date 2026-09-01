// ============================================================================
// Lectura de CSV bancario.
//
// Sin librería: un parser que respeta comillas y comas dentro de campos, más
// heurísticas para adivinar qué columna es qué y para detectar duplicados
// contra lo que ya está registrado.
// ============================================================================
import type { Transaction, TxType } from "../types";

/** Parser RFC 4180: comillas, comas dentro de campos y comillas escapadas. */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); if (row.some((c) => c.trim() !== "")) rows.push(row); row = []; };

  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") pushField();
    else if (c === "\n") pushRow();
    else field += c;
  }
  if (field !== "" || row.length) pushRow();
  return rows;
};

/** Interpreta un monto con formato mexicano o inglés: "1,234.56" o "1.234,56". */
export const parseAmount = (raw: string): number | null => {
  let s = (raw ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;
  const negParen = /^\(.*\)$/.test(raw.trim());
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negParen ? -Math.abs(n) : n;
};

/** Acepta ISO, dd/mm/aaaa y mm/dd/aaaa; devuelve fecha LOCAL a mediodía. */
export const parseDate = (raw: string, dayFirst = true): Date | null => {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12);
  const parts = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (parts) {
    let [, a, b, y] = parts;
    const year = y.length === 2 ? 2000 + +y : +y;
    const d = dayFirst ? +a : +b;
    const m = dayFirst ? +b : +a;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(year, m - 1, d, 12);
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
};

export interface ColumnMap {
  date: number;
  description: number;
  /** Columna con el monto (con signo) o el monto de cargo. */
  amount: number;
  /** Opcional: si el banco separa abonos en otra columna. */
  credit?: number;
}

/** Adivina las columnas por el nombre del encabezado. */
export const guessColumns = (header: string[]): Partial<ColumnMap> => {
  const norm = header.map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const find = (...keys: string[]) => {
    const i = norm.findIndex((h) => keys.some((k) => h.includes(k)));
    return i >= 0 ? i : undefined;
  };
  return {
    date: find("fecha", "date", "dia"),
    description: find("descripcion", "concepto", "detalle", "referencia", "description", "memo"),
    amount: find("cargo", "monto", "importe", "amount", "retiro", "debito"),
    credit: find("abono", "deposito", "credito", "credit"),
  };
};

export interface ParsedRow {
  date: Date;
  description: string;
  amount: number;
  kind: TxType;
  /** true si ya existe un movimiento igual: mismo día, monto y descripción. */
  duplicate: boolean;
  /** Se excluye de la importación (duplicado o desmarcado a mano). */
  skip: boolean;
}

/**
 * Id determinista para una fila importada: el mismo archivo, importado dos
 * veces (porque se perdió la respuesta y se volvió a tocar "Importar"),
 * produce los mismos ids y `import_transactions` salta los que ya entraron.
 *
 * Lleva la posición dentro del archivo para que dos cafés iguales el mismo
 * día sigan siendo dos movimientos. SHA-256 recortado a 16 bytes con formato
 * de UUID: Postgres acepta cualquier 128 bits como uuid.
 */
export const importId = async (accountId: string, r: { date: Date; description: string; amount: number; kind: TxType }, index: number): Promise<string> => {
  const clave = [accountId, r.date.toISOString(), r.amount, r.kind, r.description.trim().toLowerCase(), index].join("|");
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clave)));
  const hex = Array.from(hash.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Convierte las filas crudas en movimientos, marcando los que ya existen.
 * El duplicado se detecta por día + monto + descripción: dos compras iguales
 * el mismo día son raras, y es mejor que el usuario desmarque una de más a
 * que la app le duplique el historial en silencio.
 */
export const buildRows = (
  rows: string[][],
  map: ColumnMap,
  existing: Transaction[],
  opts: { hasHeader: boolean; dayFirst: boolean }
): ParsedRow[] => {
  const body = opts.hasHeader ? rows.slice(1) : rows;
  const out: ParsedRow[] = [];

  for (const r of body) {
    const date = parseDate(r[map.date] ?? "", opts.dayFirst);
    if (!date) continue;

    let value = parseAmount(r[map.amount] ?? "");
    // Banco con columnas separadas: si no hay cargo, se busca el abono
    if ((value === null || value === 0) && map.credit !== undefined) {
      const credit = parseAmount(r[map.credit] ?? "");
      if (credit !== null && credit !== 0) value = Math.abs(credit);
    } else if (value !== null && map.credit !== undefined && value !== 0) {
      value = -Math.abs(value); // la columna de cargo siempre resta
    }
    if (value === null || value === 0) continue;

    const description = (r[map.description] ?? "").trim() || "Importado";
    const kind: TxType = value > 0 ? "ingreso" : "gasto";
    const amount = Math.abs(value);

    const duplicate = existing.some(
      (t) => t.amount === amount && sameDay(new Date(t.date), date) && t.description.trim().toLowerCase() === description.toLowerCase()
    );

    out.push({ date, description, amount, kind, duplicate, skip: duplicate });
  }
  return out;
};
