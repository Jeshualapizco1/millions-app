// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { MoneyPrivacy } from "./components/Money";
import { api } from "./lib/api";
import { LEGAL_VERSION } from "./lib/legal";
import type { Session } from "@supabase/supabase-js";
vi.mock("./lib/api",()=>({api:{getCategories:vi.fn(),getAccounts:vi.fn(),getTxs:vi.fn(),getCredits:vi.fn(),getBudgets:vi.fn(),getGoals:vi.fn(),getRecurring:vi.fn(),getUpcoming:vi.fn(),getProfile:vi.fn(),getProSubscription:vi.fn(),getFxRates:vi.fn(),contarTxs:vi.fn(),aiUsage:vi.fn(),applyTx:vi.fn(),addAccount:vi.fn()}}));
vi.mock("./lib/errorLog",()=>({logError:vi.fn()}));
vi.mock("./lib/native",()=>({esNativo:()=>false,plataforma:()=>"web",vibrar:vi.fn()}));
vi.mock("./components/charts/MonthlyChart",()=>({default:()=> <p>Gráfico mensual</p>}));
vi.mock("./components/NetWorthChart",()=>({default:()=> <p>Gráfico de patrimonio</p>}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root,host:HTMLDivElement;
const session={user:{id:"qa",email:"sara@example.test",user_metadata:{name:"Sara"}}} as unknown as Session;
const a={id:"nu",name:"Nu",balance:1000,currency:"MXN",icon:"🏦",color:"#5678ff"};
beforeEach(()=>{
 vi.clearAllMocks();window.scrollTo=vi.fn();HTMLElement.prototype.scrollIntoView=vi.fn();window.matchMedia=vi.fn().mockReturnValue({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(){this.setAttribute("open","");}});Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(){this.removeAttribute("open");}});
 vi.mocked(api.getAccounts).mockResolvedValue([a]);for(const k of ["getCategories","getTxs","getCredits","getBudgets","getGoals","getRecurring","getUpcoming"] as const) vi.mocked(api[k]).mockResolvedValue([]);
 vi.mocked(api.getFxRates).mockResolvedValue({});vi.mocked(api.contarTxs).mockResolvedValue(0);vi.mocked(api.aiUsage).mockResolvedValue({hoy:0,tope:10});
 vi.mocked(api.getProSubscription).mockResolvedValue(null);
 vi.mocked(api.getProfile).mockResolvedValue({id:"qa",name:"Sara",base_currency:"MXN",timezone:"America/Mexico_City",monthly_budget:null,legal_version:LEGAL_VERSION,legal_accepted_at:new Date().toISOString(),created_at:new Date().toISOString(),onboarded_at:new Date().toISOString(),deletion_requested_at:null});
 vi.mocked(api.applyTx).mockImplementation(async(p)=>({id:"new-tx",description:p.description,amount:p.amount,kind:p.kind,type:p.kind==="ingreso"?"ingreso":"gasto",category:p.category||"Otros",categoryId:null,accountId:p.accountId,accountName:"Nu",toAccountName:null,toAccountId:null,creditId:null,goalId:null,date:p.date||new Date().toISOString()}));
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const button=(label:string)=>Array.from(host.querySelectorAll("button")).find(b=>b.textContent?.trim()===label || b.getAttribute("aria-label")===label)!;
const click=async(label:string)=>act(async()=>{const b=button(label);expect(b,`Botón ${label}`).toBeTruthy();b.click();});
const mount=()=>act(async()=>root.render(<MoneyPrivacy><App session={session} onSignOut={vi.fn()}/></MoneyPrivacy>));
async function fill(selector:string,value:string){await act(async()=>{const input=host.querySelector<HTMLInputElement|HTMLSelectElement>(selector)!;Object.getOwnPropertyDescriptor(input.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event(input.tagName==="SELECT"?"change":"input",{bubbles:true}));});}
it("la navegación real llega a Análisis, asistente, los cinco créditos y los tres Planes",async()=>{
 await mount();expect(host.querySelector("header")!.textContent).toContain("Hola, Sara");expect(host.querySelector("header")!.textContent).not.toContain("Millions");expect(host.querySelectorAll("nav button")).toHaveLength(4);
 await click("Actividad");await click("Análisis");expect(host.textContent).toContain("Gastos por categoría");await click("Preguntar sobre este mes");expect(host.querySelector<HTMLInputElement>('[aria-label="Pregunta al asistente"]')!.value).toContain("ingresos, gastos y categorías");
 await click("Mi dinero");await click("Créditos");await click("Añadir");expect(host.querySelectorAll("dialog button[aria-pressed]")).toHaveLength(5);await click("Cancelar");
 await click("Planes");await click("Metas");expect(host.textContent).toContain("Metas de ahorro");await click("Fijos");expect(host.querySelector('section:not([hidden])')!.textContent).toContain("Movimientos fijos");
});
it("el formulario manual real se revisa antes de escribir y el saldo se actualiza una vez",async()=>{
 await mount();await click("Añadir un movimiento");await click("Manual");await fill("#manualtxmodal-1","Comida de prueba");await fill("#manualtxmodal-2","280");await fill("#manualtxmodal-4","nu");await click("Revisar");expect(api.applyTx).not.toHaveBeenCalled();await click("Confirmar y guardar");
 expect(api.applyTx).toHaveBeenCalledTimes(1);expect(host.querySelector("dialog")).toBeNull();expect(host.textContent).toContain("Comida de prueba");expect(host.innerHTML).toContain('aria-label="$720.00"');
});
it("se puede añadir una primera cuenta desde el + y retomar la captura",async()=>{
 vi.mocked(api.getAccounts).mockResolvedValue([]);vi.mocked(api.addAccount).mockResolvedValue(a);await mount();await click("Añadir un movimiento");await click("Añadir mi primera cuenta");await fill("#accountmodal-1","Nu");await fill("#accountmodal-2","1000");await click("Agregar cuenta");expect(api.addAccount).toHaveBeenCalledTimes(1);expect(host.querySelector("dialog")!.textContent).toContain("¿Qué registramos?");
});

it("una cuenta con prueba vencida y acceso permanente entra al dashboard y puede registrar", async () => {
 const profile = await api.getProfile();
 vi.mocked(api.getProfile).mockResolvedValue({ ...profile, created_at: "2020-01-01T12:00:00Z" });
 vi.mocked(api.getProSubscription).mockResolvedValue({ entitlement: "pro", status: "active", expires_at: null });
 await mount();
 expect(host.querySelector("header")?.textContent).toContain("Hola, Sara");
 expect(host.textContent).not.toContain("Se terminaron tus");
 expect(host.textContent).not.toContain("Tu prueba termina");
 await click("Añadir un movimiento");
 expect(host.querySelector("dialog")?.textContent).toContain("¿Qué registramos?");
});

it("el acceso vigente suprime el aviso de prueba incluso en su última semana", async () => {
 const profile = await api.getProfile();
 vi.mocked(api.getProfile).mockResolvedValue({ ...profile, created_at: new Date(Date.now() - 10 * 86400000).toISOString() });
 vi.mocked(api.getProSubscription).mockResolvedValue({ entitlement: "pro", status: "active", expires_at: null });
 await mount();
 expect(host.querySelector("header")).not.toBeNull();
 expect(host.textContent).not.toContain("Tu prueba termina");
});

it("una cuenta sin acceso y con prueba vencida conserva el muro y sus opciones de datos", async () => {
 const profile = await api.getProfile();
 vi.mocked(api.getProfile).mockResolvedValue({ ...profile, created_at: "2020-01-01T12:00:00Z" });
 await mount();
 expect(host.textContent).toContain("Se terminaron tus 14 días");
 expect(host.textContent).toContain("Exportar mis movimientos a CSV");
 expect(button("Añadir un movimiento")).toBeUndefined();
});

it("espera la respuesta del acceso antes de decidir entre dashboard y fin de prueba", async () => {
 const profile = await api.getProfile();
 vi.mocked(api.getProfile).mockResolvedValue({ ...profile, created_at: "2020-01-01T12:00:00Z" });
 let resolve!: (value: Awaited<ReturnType<typeof api.getProSubscription>>) => void;
 vi.mocked(api.getProSubscription).mockReturnValue(new Promise(done => { resolve = done; }));
 await mount();
 expect(host.querySelector('[aria-label="Cargando tus finanzas"]')).not.toBeNull();
 expect(host.textContent).not.toContain("Se terminaron tus");
 await act(async () => { resolve({ entitlement: "pro", status: "active", expires_at: null }); });
 expect(host.querySelector("header")?.textContent).toContain("Hola, Sara");
});

it("si no se puede consultar el acceso, muestra error sin regalar acceso ni afirmar vencimiento", async () => {
 const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
 try {
  vi.mocked(api.getProSubscription).mockRejectedValue(new Error("No se pudo verificar el acceso"));
  await mount();
  expect(host.textContent).toContain("No se pudo verificar el acceso");
  expect(host.querySelector("nav")).toBeNull();
  expect(host.textContent).not.toContain("Se terminaron tus");
 } finally { errorLog.mockRestore(); }
});
