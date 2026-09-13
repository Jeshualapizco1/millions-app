// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ManualTxModal, { type ManualTxFormState } from "../modals/ManualTxModal";
import AccountModal from "../modals/AccountModal";
import CreditForm from "./CreditForm";
import Modal from "./Modal";
import Money, { MoneyPrivacy, PrivacyButton } from "./Money";
import StoryViewer from "./StoryViewer";
import Preparacion from "../views/Preparacion";
import { CategoriesProvider } from "../lib/categories";
import { setAppearance } from "../lib/appearance";
import type { Account } from "../types";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const account:Account={id:"nu",name:"Nu",balance:1000,currency:"MXN",icon:"🏦",color:"#5678ff"};
let root:Root,host:HTMLDivElement;
beforeEach(()=>{
 Object.defineProperty(window,"matchMedia",{configurable:true,value:vi.fn().mockReturnValue({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})});
 Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(){this.setAttribute("open","");}});
 Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(){this.removeAttribute("open");}});
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();setAppearance({theme:"dark"});});
const button=(label:string)=>Array.from(host.querySelectorAll("button")).find(b=>b.textContent?.trim()===label)!;
const click=async(label:string)=>act(async()=>button(label).click());

it("Manual exige una revisión separada y protege contra confirmar dos veces",async()=>{
 let resolve!:()=>void;const save=vi.fn(()=>new Promise<boolean>(r=>{resolve=()=>r(true);}));
 function Harness(){const [form,update]=useState<ManualTxFormState>({desc:"Comida",amt:"280",type:"gasto",aid:"nu",cat:"Comida"});return <CategoriesProvider categories={[]}><ManualTxModal form={form} update={p=>update(f=>({...f,...p}))} accs={[account]} onSave={save} onClose={vi.fn()}/></CategoriesProvider>;}
 await act(async()=>root.render(<Harness/>));await click("Revisar");expect(save).not.toHaveBeenCalled();expect(host.textContent).toContain("¿Así quedó?");expect(host.textContent).toContain("720.00");
 await act(async()=>{button("Confirmar y guardar").click();button("Confirmar y guardar").click();});expect(save).toHaveBeenCalledTimes(1);await act(async()=>resolve());
});
it("el borrador de cuenta se conserva si el servidor rechaza crearla",async()=>{
 const close=vi.fn(),save=vi.fn().mockRejectedValue(new Error("No se pudo guardar"));
 await act(async()=>root.render(<AccountModal mode="new" form={{name:"Nu",balance:"1000",icon:"🏦"}} update={vi.fn()} onSave={save} onClose={close}/>));await click("Agregar cuenta");
 expect(close).not.toHaveBeenCalled();expect(host.textContent).toContain("No se pudo guardar");expect(host.querySelector<HTMLInputElement>("#accountmodal-1")!.value).toBe("Nu");
});
it("el alta de crédito incluye cinco tipos y no acepta un corte fuera de rango",async()=>{
 const save=vi.fn();await act(async()=>root.render(<CreditForm initial={{name:"Nu",type:"tarjeta",institution:"Nu",total_debt:1000,credit_limit:5000,monthly_payment:null,cut_day:40,payment_day:10,next_payment_date:null,interest_rate:null,notes:null}} onSave={save} onClose={vi.fn()}/>));
 expect(host.querySelectorAll("button[aria-pressed]")).toHaveLength(5);await click("Guardar");expect(save).not.toHaveBeenCalled();expect(host.textContent).toContain("entre 1 y 31");
});
it("ocultar cifras las elimina del DOM accesible, salvo revisión explícita",async()=>{
 await act(async()=>root.render(<MoneyPrivacy><PrivacyButton/><Money value={1234567.89}/><Money value={280} privateValue={false}/></MoneyPrivacy>));
 await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Ocultar cifras"]')!.click());
 expect(host.innerHTML).not.toContain("1,234,567.89");expect(host.textContent).toContain("280.00");expect(host.innerHTML).toContain("Importe oculto");
});
it("Escape afecta solo al diálogo superior y al desmontar recupera el scroll",async()=>{
 const outer=vi.fn(),inner=vi.fn();await act(async()=>root.render(<><Modal onClose={outer}><p>Exterior</p></Modal><Modal onClose={inner}><p>Interior</p></Modal></>));
 await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})));
 expect(inner).toHaveBeenCalledTimes(1);expect(outer).not.toHaveBeenCalled();await act(async()=>root.render(null));expect(document.body.style.overflow).toBe("");
});
it("las historias sin grabaciones son legibles, avanzan y se pueden saltar",async()=>{
 const close=vi.fn();await act(async()=>root.render(<StoryViewer onClose={close}/>));expect(host.querySelector("video")).toBeNull();expect(host.textContent).toContain("Qué bueno tenerte aquí");await click("Siguiente");expect(host.textContent).toContain("Dilo. Revísalo. Guárdalo.");await click("Saltar historias");expect(close).toHaveBeenCalledTimes(1);
});
it("movimiento reducido muestra la guía al instante sin retrasar el CTA",async()=>{
 vi.mocked(window.matchMedia).mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as any);
 await act(async()=>root.render(<Preparacion goal="salir_deudas" onContinue={vi.fn()} onExplore={vi.fn()}/>));expect(host.textContent).toContain("Añade tu tarjeta");expect(button("Ver mis primeros pasos")).toBeDefined();expect(host.textContent).not.toContain("Omitir animación");
});
it("el tema claro actualiza las variables usadas por toda la interfaz",async()=>{
 await act(async()=>setAppearance({theme:"light"}));expect(document.documentElement.dataset.theme).toBe("light");expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#f4f4f1");
});
