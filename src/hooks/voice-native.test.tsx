// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useVoice } from "./useVoice";
const { speech, handlers }=vi.hoisted(()=>({handlers:new Map<string,Function>(),speech:{available:vi.fn(),requestPermissions:vi.fn(),isListening:vi.fn(),stop:vi.fn(),removeAllListeners:vi.fn(),addListener:vi.fn(),start:vi.fn()}}));
vi.mock("../lib/native",()=>({esNativo:()=>true,plataforma:()=>"ios"}));
vi.mock("@capacitor-community/speech-recognition",()=>({SpeechRecognition:speech}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let host:HTMLDivElement,root:Root,voice:ReturnType<typeof useVoice>;
const result=vi.fn(),final=vi.fn(),error=vi.fn();
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
function Harness(){voice=useVoice({onResult:result,onFinal:final,onStop:vi.fn(),onError:error});return null;}
beforeEach(()=>{
 vi.clearAllMocks();handlers.clear();speech.available.mockResolvedValue({available:true});speech.requestPermissions.mockResolvedValue({speechRecognition:"granted"});speech.isListening.mockResolvedValue({listening:false});speech.stop.mockResolvedValue(undefined);speech.removeAllListeners.mockImplementation(async()=>handlers.clear());speech.addListener.mockImplementation(async(name,fn)=>{handlers.set(name,fn);return{remove:vi.fn()};});speech.start.mockResolvedValue({});
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>{root.unmount();await tick();});host.remove();});
it("cerrar mientras se pide permiso evita arrancar el micrófono al concederlo",async()=>{
 const permission=deferred<{speechRecognition:string}>();speech.requestPermissions.mockReturnValue(permission.promise);
 await act(async()=>root.render(<Harness/>));await act(async()=>{voice.startMic();await tick();});expect(voice.starting).toBe(true);expect(speech.requestPermissions).toHaveBeenCalledTimes(1);
 await act(async()=>{voice.stopMic();permission.resolve({speechRecognition:"granted"});await tick();});expect(speech.start).not.toHaveBeenCalled();expect(voice.starting).toBe(false);expect(final).not.toHaveBeenCalled();
});
it("cancelar start pendiente deja iniciar una nueva sesión y descarta parciales viejos",async()=>{
 const first=deferred<{}>();speech.start.mockReturnValueOnce(first.promise).mockResolvedValue({});
 await act(async()=>root.render(<Harness/>));await act(async()=>{voice.startMic();await tick();});expect(speech.start).toHaveBeenCalledTimes(1);const oldPartial=handlers.get("partialResults")!;
 await act(async()=>{voice.stopMic();voice.startMic();await tick();});expect(speech.start).toHaveBeenCalledTimes(2);
 await act(async()=>{oldPartial({matches:["viejo"]});first.resolve({matches:["viejo"]});await tick();});expect(result).not.toHaveBeenCalled();expect(final).not.toHaveBeenCalled();
 await act(async()=>{handlers.get("partialResults")!({matches:["nuevo"]});handlers.get("listeningState")!({status:"stopped"});await tick();});expect(final).toHaveBeenCalledExactlyOnceWith("nuevo");
});
it("dos toques mientras espera el motor crean una sola sesión",async()=>{
 await act(async()=>root.render(<Harness/>));await act(async()=>{voice.startMic();voice.startMic();await tick();});expect(speech.start).toHaveBeenCalledTimes(1);
});
