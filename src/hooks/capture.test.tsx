// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAI } from "./useAI";
import { useVoice } from "./useVoice";
import { api } from "../lib/api";
import type { ActionContext } from "../lib/actions";
vi.mock("../lib/api",()=>({api:{aiUsage:vi.fn().mockResolvedValue(null),aiCapture:vi.fn()}}));
vi.mock("../lib/native",()=>({esNativo:()=>false,plataforma:()=>"web"}));
vi.mock("../lib/actions",()=>({describeAction:vi.fn(),runAction:vi.fn()}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.clearAllMocks(); host=document.createElement("div");document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();delete (window as any).SpeechRecognition;});
function deferred<T>() {let resolve!:(value:T)=>void; const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
const raw = {text:JSON.stringify({action:"transaccion",description:"Comida",amount:280,type:"gasto",category:"Comida",accountName:"Nu"}),uso:{hoy:1,tope:10}};
let ai:ReturnType<typeof useAI>;
function mountAI(save=vi.fn().mockResolvedValue({ok:true})) {
  function Harness(){ai=useAI({applyTx:save,applyNewAcc:vi.fn(),setTxInput:vi.fn(),setLive:vi.fn(),categoryNames:()=>["Comida"],actionContext:()=>({accs:[{id:"nu",name:"Nu"}]}) as ActionContext,onActionDone:vi.fn(),onActionDoneError:vi.fn()});return null;}
  return act(async()=>root.render(<Harness/>));
}
describe("captura: la confirmación controla las escrituras",()=>{
  it("interpretar nunca guarda y dos confirmaciones simultáneas escriben una vez",async()=>{
    const write=deferred<{ok:boolean}>(),save=vi.fn(()=>write.promise);vi.mocked(api.aiCapture).mockResolvedValue(raw);
    await mountAI(save);await act(async()=>{await ai.sendTx("280 en comida con Nu");});
    expect(ai.draft?.amount).toBe(280);expect(save).not.toHaveBeenCalled();
    let first!:Promise<boolean>;await act(async()=>{first=ai.confirmDraft();expect(await ai.confirmDraft()).toBe(false);});
    expect(save).toHaveBeenCalledTimes(1);await act(async()=>{write.resolve({ok:true});await first;});expect(ai.draft).toBeNull();
  });
  it("conserva el borrador y la corrección cuando falla el guardado",async()=>{
    const save=vi.fn().mockRejectedValue(new Error("Sin conexión"));vi.mocked(api.aiCapture).mockResolvedValue(raw);
    await mountAI(save);await act(async()=>{await ai.sendTx("Comida");});await act(async()=>ai.updateDraft({amount:281}));
    await act(async()=>{expect(await ai.confirmDraft()).toBe(false);});expect(ai.draft?.amount).toBe(281);expect(ai.draftError).toBe("Sin conexión");
  });
  it("cerrar durante la interpretación ignora el resultado que llega después",async()=>{
    const response=deferred<typeof raw>();vi.mocked(api.aiCapture).mockReturnValue(response.promise);
    await mountAI();let request!:Promise<void>;await act(async()=>{request=ai.sendTx("Comida");});
    await act(async()=>ai.cancelCapture());await act(async()=>{response.resolve(raw);await request;});
    expect(ai.draft).toBeNull();expect(ai.txLoading).toBe(false);
  });
  it("un resultado antiguo no reemplaza la captura reabierta",async()=>{
    const old=deferred<typeof raw>();vi.mocked(api.aiCapture).mockReturnValueOnce(old.promise).mockResolvedValueOnce({...raw,text:raw.text.replace('280','90')});
    await mountAI();let first!:Promise<void>;await act(async()=>{first=ai.sendTx("primera");});await act(async()=>ai.cancelCapture());await act(async()=>{await ai.sendTx("segunda");});
    await act(async()=>{old.resolve(raw);await first;});expect(ai.draft?.amount).toBe(90);
  });
  it("dos solicitudes simultáneas consumen una sola interpretación",async()=>{
    const response=deferred<typeof raw>();vi.mocked(api.aiCapture).mockReturnValue(response.promise);await mountAI();let first!:Promise<void>;
    await act(async()=>{first=ai.sendTx("Comida");await ai.sendTx("Comida");});expect(api.aiCapture).toHaveBeenCalledTimes(1);
    await act(async()=>{response.resolve(raw);await first;});
  });
  it("monto no finito y fecha futura no llegan al guardado",async()=>{
    const save=vi.fn();vi.mocked(api.aiCapture).mockResolvedValue(raw);await mountAI(save);await act(async()=>{await ai.sendTx("Comida");});await act(async()=>ai.updateDraft({amount:Infinity}));
    await act(async()=>{expect(await ai.confirmDraft()).toBe(false);});await act(async()=>ai.updateDraft({amount:280,date:"2999-01-01"}));
    await act(async()=>{expect(await ai.confirmDraft()).toBe(false);});expect(save).not.toHaveBeenCalled();
  });
});

describe("micrófono web",()=>{
  let voice:ReturnType<typeof useVoice>,instance:any;
  const final=vi.fn();
  function Harness(){voice=useVoice({onResult:vi.fn(),onFinal:final,onStop:vi.fn(),onError:vi.fn()});return null;}
  beforeEach(()=>{(window as any).SpeechRecognition=class{onstart:any;onresult:any;onend:any;onerror:any;start=vi.fn();abort=vi.fn();constructor(){instance=this;}};});
  it("no inicia al montar y bloquea dobles toques antes de onstart",async()=>{
    await act(async()=>root.render(<Harness/>));expect(instance).toBeUndefined();await act(async()=>{voice.startMic();voice.startMic();});expect(instance.start).toHaveBeenCalledTimes(1);
  });
  it("cierra y desconecta resultados tardíos; una transcripción final se entrega una vez",async()=>{
    await act(async()=>root.render(<Harness/>));await act(async()=>voice.startMic());const handler=instance.onresult;
    const result=Object.assign([{transcript:"280 en comida"}],{isFinal:true});await act(async()=>{handler({resultIndex:0,results:[result]});handler({resultIndex:0,results:[result]});});expect(final).toHaveBeenCalledTimes(1);
    await act(async()=>voice.stopMic());expect(instance.abort).toHaveBeenCalledTimes(1);expect(instance.onresult).toBeNull();await act(async()=>handler({resultIndex:0,results:[result]}));expect(final).toHaveBeenCalledTimes(1);
  });
});
