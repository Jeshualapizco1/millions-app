/** Solo para revisión local. Vite no incluye qa/ en dist ni importa este archivo desde src/. */
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { api } from "../src/lib/api";
import { MoneyPrivacy } from "../src/components/Money";
import { useAppearance } from "../src/lib/appearance";
import { LEGAL_VERSION } from "../src/lib/legal";
import { toLocalDateISO } from "../src/lib/dates";
import "../src/design.css";
const screen=new URLSearchParams(location.search).get("screen"),now=new Date(),iso=now.toISOString();
let accounts=[{id:"cuenta-1",name:"Nu",balance:screen==="large"?1278400.50:screen==="negative"?-14260:12840.50,currency:"MXN",icon:"🏦",color:"#5678ff"},{id:"cuenta-2",name:"Efectivo",balance:1400,currency:"MXN",icon:"💵",color:"#9faed9"}];
let transactions=[{id:"tx-1",description:"Comida con amigos",amount:280,kind:"gasto",type:"gasto",category:"Comida",categoryId:"comida",accountId:"cuenta-1",accountName:"Nu",toAccountName:null,toAccountId:null,creditId:null,goalId:null,date:iso},{id:"tx-2",description:"Supermercado",amount:1540.35,kind:"gasto",type:"gasto",category:"Supermercado",categoryId:"super",accountId:"cuenta-1",accountName:"Nu",toAccountName:null,toAccountId:null,creditId:null,goalId:null,date:new Date(now.getFullYear(),now.getMonth(),2,12).toISOString()},{id:"tx-3",description:"Nómina",amount:26000,kind:"ingreso",type:"ingreso",category:"Nómina",categoryId:"nomina",accountId:"cuenta-1",accountName:"Nu",toAccountName:null,toAccountId:null,creditId:null,goalId:null,date:new Date(now.getFullYear(),now.getMonth(),1,12).toISOString()}];
const categories=[{id:"comida",name:"Comida",icon:"🍜",color:"#5678ff",kind:"gasto",hidden:false,sort_order:0},{id:"super",name:"Supermercado",icon:"🛒",color:"#9faed9",kind:"gasto",hidden:false,sort_order:1},{id:"nomina",name:"Nómina",icon:"💼",color:"#9faed9",kind:"ingreso",hidden:false,sort_order:2},{id:"otros",name:"Otros",icon:"📦",color:"#8a91bb",kind:"ambos",hidden:false,sort_order:3}];
let credits=[{id:"credito-1",name:"Nu crédito",type:"tarjeta",total_debt:6200,credit_limit:25000,institution:"Nu",interest_rate:49.9,monthly_payment:1800,minimum_payment:360,cut_day:15,payment_day:now.getDate()+2>28?28:now.getDate()+2,next_payment_date:null,start_date:null,end_date:null,total_payments:null,paid_payments:null,notes:null,color:"#839ade",created_at:iso}];
const goals=[{id:"meta-1",name:"Fondo de emergencia",target_amount:30000,current_amount:7200,target_date:toLocalDateISO(new Date(now.getFullYear(),now.getMonth()+6,1)),icon:"☂️",color:"#839ade",notes:null,account_id:null,completed_at:null,created_at:iso}];
const recurring=[{id:"fijo-1",name:"Renta",kind:"gasto",amount:8500,accountId:"cuenta-1",accountName:"Nu",categoryId:"otros",category:"Otros",frequency:"mensual",next_run:toLocalDateISO(new Date(now.getFullYear(),now.getMonth(),now.getDate()+4)),last_run:null,active:true}];
let profile={id:"qa-user",name:"Sara",base_currency:"MXN",timezone:"America/Mexico_City",monthly_budget:16000,legal_accepted_at:iso,legal_version:LEGAL_VERSION,deletion_requested_at:null,onboarded_at:screen==="onboarding"?null:iso,created_at:iso};
if(screen==="empty"||screen==="onboarding"){accounts=[];transactions=[];credits=[];}
// Todas las operaciones se sustituyen; una operación no preparada falla en vez de ir a Supabase.
Object.keys(api).forEach(k=>{(api as any)[k]=async()=>{throw new Error(`Operación ${k} no simulada en QA local`);};});
Object.assign(api,{
 getProSubscription:async()=>null,
 getAccounts:async()=>accounts,getTxs:async()=>transactions,getCredits:async()=>credits,getCategories:async()=>categories,getBudgets:async()=>(screen==="empty"||screen==="onboarding")?[]:[{id:"b-1",category:"Comida",categoryId:"comida",amount:3000,rollover:false}],getGoals:async()=>(screen==="empty"||screen==="onboarding")?[]:goals,getRecurring:async()=>(screen==="empty"||screen==="onboarding")?[]:recurring,getUpcoming:async()=>(screen==="empty"||screen==="onboarding")?[]:recurring.map(r=>({ruleId:r.id,name:r.name,kind:r.kind,amount:r.amount,accountId:r.accountId,due:r.next_run})),getProfile:async()=>profile,getFxRates:async()=>({}),contarTxs:async()=>transactions.length,aiUsage:async()=>({hoy:2,tope:30}),getOnboarding:async()=>null,saveOnboarding:async()=>{},completeOnboarding:async()=>{profile={...profile,onboarded_at:iso};return iso;},
 applyTx:async(p:any)=>{const a=accounts.find(a=>a.id===p.accountId)!;const t={id:p.clientId||crypto.randomUUID(),description:p.description,amount:p.amount,kind:p.kind,type:p.kind,category:p.category,categoryId:null,accountId:a.id,accountName:a.name,toAccountName:null,toAccountId:null,creditId:null,goalId:null,date:p.date||iso};transactions=[t,...transactions];accounts=accounts.map(a=>a.id===p.accountId?{...a,balance:a.balance+(p.kind==="gasto"?-p.amount:p.amount)}:a);return t;},
 addAccount:async(p:any)=>{const a={...p,id:crypto.randomUUID(),currency:p.currency||"MXN"};accounts=[...accounts,a];return a;},
 aiCapture:async()=>({text:JSON.stringify({action:"transaccion",description:"Comida",amount:280,type:"gasto",accountName:"Nu",category:"Comida"}),uso:{hoy:3,tope:30}}),
 aiAdvise:async()=>({text:"En este ejemplo registraste $1,820.35 de gastos este mes. Supermercado es tu categoría principal. ¿Quieres revisar sus movimientos?",uso:{hoy:3,tope:30}}),
});
const session={access_token:"qa-local",refresh_token:"qa-local",expires_in:3600,token_type:"bearer",user:{id:"qa-user",email:"sara@example.test",app_metadata:{},user_metadata:{name:"Sara"},aud:"authenticated",created_at:iso}};
function Review(){useAppearance();return <MoneyPrivacy><App session={session as any} onSignOut={()=>location.reload()}/></MoneyPrivacy>;}
createRoot(document.getElementById("root")!).render(<Review/>);
