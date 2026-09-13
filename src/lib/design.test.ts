import { describe, expect, it } from "vitest";
import { moneyParts, monthSummary, homeAttention, dueLabel } from "./presentation";
import { captureDateISO, toLocalDateISO } from "./dates";
import { buildJourney, STORIES, STORY_MEDIA } from "./journey";
import { namesCreditPurchase } from "./captureSource";
import { PALETTES } from "./constants";
import type { Transaction } from "../types";
const transaction = (p: Partial<Transaction>): Transaction => ({ id:"a",description:"Comida",amount:280,kind:"gasto",type:"gasto",category:"Comida",categoryId:null,accountId:"b",accountName:"Nu",toAccountId:null,toAccountName:null,creditId:null,goalId:null,date:new Date(2026,8,7,12).toISOString(),...p });

describe("cifras y períodos del diseño", () => {
  it("conserva centavos, negativos y millones sin abreviar el dato principal", () => {
    expect(moneyParts(128.05).text).toContain("128.05");
    expect(moneyParts(-1234567.89).text).toContain("1,234,567.89");
    expect(moneyParts(-1234567.89).text).toContain("-");
    expect(moneyParts(-1234567.89).long).toBe(true);
    expect(moneyParts(NaN).text).toContain("0.00");
  });
  it("un ingreso o gasto se cuenta una vez, sin incluir pagos ni transferencias", () => {
    const out = monthSummary([transaction({}),transaction({id:"b",kind:"ingreso",type:"ingreso",amount:1000}),transaction({id:"c",kind:"pago_credito",amount:500}),transaction({id:"d",kind:"transferencia",amount:700}),transaction({id:"e",date:new Date(2026,7,31,23,59).toISOString()})],2026,8,[]);
    expect(out.income).toBe(1000); expect(out.spend).toBe(280); expect(out.categories).toHaveLength(1); expect(out.rows).toHaveLength(4);
  });
  it("mantiene el día local capturado incluso al final del día", () => {
    const now = new Date(2026,8,7,23,55);
    expect(toLocalDateISO(captureDateISO("2026-08-31",now))).toBe("2026-08-31");
    expect(() => captureDateISO("2026-02-31",now)).toThrow();
    expect(() => captureDateISO("2026-09-08",now)).toThrow();
    expect(() => captureDateISO("31/08/2026",now)).toThrow();
  });
  it("prioriza saldo negativo y distingue hoy de vencido", () => {
    expect(homeAttention(-5,[],{limit:10,spent:0}).kind).toBe("balance");
    expect(homeAttention(5,[],{limit:10,spent:12})).toEqual({kind:"budget",remaining:-2});
    expect(dueLabel(0)).toBe("Hoy"); expect(dueLabel(-1)).toContain("Vencido");
  });
});

describe("onboarding honesto", () => {
  it("deriva una ruta de la prioridad elegida y una ruta general si se omite", () => {
    expect(buildJourney("salir_deudas").steps[0].title).toContain("tarjeta");
    expect(buildJourney("salir_deudas").personalized).toBe(true);
    expect(buildJourney(null).personalized).toBe(false);
    expect(buildJourney("__proto__").key).toBe("general");
  });
  it("prepara cuatro historias y exige medios con subtítulos, sin inventar videos", () => {
    expect(STORIES).toHaveLength(4); expect(new Set(STORIES.map(s=>s.id)).size).toBe(4);
    expect(STORY_MEDIA.every(m=>!!m.src && !!m.captions && STORIES.some(s=>s.id===m.id))).toBe(true);
  });
});

function luminance(hex:string) { const parts=hex.slice(1).match(/../g)!.map(p=>{const x=parseInt(p,16)/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722; }
function contrast(a:string,b:string) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
it("texto principal, secundario y CTA alcanzan contraste AA en ambos temas", () => {
  for(const palette of Object.values(PALETTES)) {
    for(const surface of [palette.bg,palette.surface,palette.card]) {
      expect(contrast(palette.text,surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.muted,surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#ffffff",palette.accent)).toBeGreaterThanOrEqual(4.5);
  }
});

it("no convierte una compra explícita a crédito en una salida de efectivo", () => {
  const credits=[{name:"Nu crédito",type:"tarjeta"}];
  expect(namesCreditPurchase("Gasté 280 con tarjeta de crédito", "gasto", "Nu", credits)).toBe(true);
  expect(namesCreditPurchase("Gasté con mi tarjeta Nu", "gasto", "Nu", credits)).toBe(true);
  expect(namesCreditPurchase("Gasté con mi tarjeta de débito Nu", "gasto", "Nu", credits)).toBe(false);
  expect(namesCreditPurchase("Gasté con mi cuenta Nu", "gasto", "Nu", credits)).toBe(false);
});
