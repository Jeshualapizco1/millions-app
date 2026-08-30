import type { Transaction } from "../types";

const BOM = String.fromCharCode(0xfeff);

export const exportCSV = (txs: Transaction[]) => {
  const rows: (string | number)[][] = [
    ["Fecha", "Descripción", "Tipo", "Categoría", "Cuenta", "Monto"],
    ...txs.map((t) => [
      new Date(t.date).toLocaleDateString("es-MX"),
      `"${t.description}"`,
      t.type,
      t.category,
      t.accountName,
      t.type === "gasto" ? -t.amount : t.amount,
    ]),
  ];
  const csv = BOM + rows.map((r) => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
    download: `millions-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
};
