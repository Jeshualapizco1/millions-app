const https = require("https");
const SB_HOST = "jyttvttnzndvqqrghqna.supabase.co";

function sbReq(method, path, body, key) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: SB_HOST, path: `/rest/v1/${path}`, method,
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": "return=representation", ...(data ? {"Content-Length": Buffer.byteLength(data)} : {}) },
    }, (res) => {
      let out = ""; res.on("data", c => out += c);
      res.on("end", () => { try { resolve({status:res.statusCode,data:JSON.parse(out||"[]")}); } catch { resolve({status:res.statusCode,data:[]}); } });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function getUser(token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SB_HOST, path: "/auth/v1/user", method: "GET",
      headers: { "apikey": process.env.SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
    }, (res) => {
      let out = ""; res.on("data", c => out += c);
      res.on("end", () => {
        try { const p = JSON.parse(out); if (res.statusCode===200&&p.id) resolve(p.id); else reject(new Error("Unauthorized")); }
        catch { reject(new Error("Unauthorized")); }
      });
    });
    req.on("error", reject); req.end();
  });
}

function anthropicReq(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let out = ""; res.on("data", c => out += c);
      res.on("end", () => { try{resolve({status:res.statusCode,data:JSON.parse(out)});}catch(e){reject(e);} });
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return {statusCode:405,body:"Method Not Allowed"};
  const h = {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
  try {
    const {action, payload, token} = JSON.parse(event.body);
    const KEY = process.env.SUPABASE_ANON_KEY;

    if (action === "chat") { const r = await anthropicReq(payload); return {statusCode:r.status,headers:h,body:JSON.stringify(r.data)}; }

    const uid = await getUser(token);

    // ── Accounts ──────────────────────────────────────────────────────────
    if (action==="getAccounts")   { const r=await sbReq("GET",`jeshua_accounts?user_id=eq.${uid}&order=created_at.asc`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="addAccount")    { const r=await sbReq("POST","jeshua_accounts",{...payload,user_id:uid},KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="updateAccount") { const{id,...rest}=payload; await sbReq("PATCH",`jeshua_accounts?id=eq.${id}&user_id=eq.${uid}`,rest,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    if (action==="updateBalance") {
      if (payload.delta !== undefined) {
        const cur=await sbReq("GET",`jeshua_accounts?id=eq.${payload.id}&user_id=eq.${uid}&select=balance`,null,KEY);
        const newBal=Number(cur.data?.[0]?.balance||0)+payload.delta;
        await sbReq("PATCH",`jeshua_accounts?id=eq.${payload.id}&user_id=eq.${uid}`,{balance:newBal},KEY);
      } else {
        await sbReq("PATCH",`jeshua_accounts?id=eq.${payload.id}&user_id=eq.${uid}`,{balance:payload.balance},KEY);
      }
      return {statusCode:200,headers:h,body:JSON.stringify({ok:true})};
    }
    // ── Transactions ──────────────────────────────────────────────────────
    if (action==="getTxs")  { const r=await sbReq("GET",`jeshua_transactions?user_id=eq.${uid}&order=date.desc`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="addTx")   { const r=await sbReq("POST","jeshua_transactions",{...payload,user_id:uid},KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="deleteTx"){ await sbReq("DELETE",`jeshua_transactions?id=eq.${payload.id}&user_id=eq.${uid}`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    // ── Credits ───────────────────────────────────────────────────────────
    if (action==="getCredits")   { const r=await sbReq("GET",`jeshua_credits?user_id=eq.${uid}&order=created_at.asc`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="addCredit")    { const r=await sbReq("POST","jeshua_credits",{...payload,user_id:uid},KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="updateCredit") { const{id,...rest}=payload; await sbReq("PATCH",`jeshua_credits?id=eq.${id}&user_id=eq.${uid}`,rest,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    if (action==="deleteCredit") { await sbReq("DELETE",`jeshua_credits?id=eq.${payload.id}&user_id=eq.${uid}`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    // ── Budgets ───────────────────────────────────────────────────────────
    if (action==="getBudgets")   { const r=await sbReq("GET",`jeshua_budgets?user_id=eq.${uid}&order=created_at.asc`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="upsertBudget") {
      const existing=await sbReq("GET",`jeshua_budgets?user_id=eq.${uid}&category=eq.${encodeURIComponent(payload.category)}`,null,KEY);
      if (existing.data?.length>0) {
        await sbReq("PATCH",`jeshua_budgets?id=eq.${existing.data[0].id}&user_id=eq.${uid}`,{amount:payload.amount},KEY);
        return {statusCode:200,headers:h,body:JSON.stringify([{...existing.data[0],amount:payload.amount}])};
      } else {
        const r=await sbReq("POST","jeshua_budgets",{...payload,user_id:uid},KEY);
        return {statusCode:200,headers:h,body:JSON.stringify(r.data)};
      }
    }
    if (action==="deleteBudget") { await sbReq("DELETE",`jeshua_budgets?id=eq.${payload.id}&user_id=eq.${uid}`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    // ── Goals ─────────────────────────────────────────────────────────────
    if (action==="getGoals")    { const r=await sbReq("GET",`jeshua_goals?user_id=eq.${uid}&order=created_at.asc`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="addGoal")     { const r=await sbReq("POST","jeshua_goals",{...payload,user_id:uid},KEY); return {statusCode:200,headers:h,body:JSON.stringify(r.data)}; }
    if (action==="updateGoal")  { const{id,...rest}=payload; await sbReq("PATCH",`jeshua_goals?id=eq.${id}&user_id=eq.${uid}`,rest,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }
    if (action==="deleteGoal")  { await sbReq("DELETE",`jeshua_goals?id=eq.${payload.id}&user_id=eq.${uid}`,null,KEY); return {statusCode:200,headers:h,body:JSON.stringify({ok:true})}; }

    return {statusCode:400,headers:h,body:JSON.stringify({error:"Unknown action"})};
  } catch(e) {
    return {statusCode:e.message==="Unauthorized"?401:500,headers:h,body:JSON.stringify({error:e.message})};
  }
};
