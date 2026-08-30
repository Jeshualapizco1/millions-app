// Uso puntual: restablecer contraseña de un usuario vía admin API.
import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const email = process.argv[2], password = process.argv[3];
const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
const u = data.users.find((x) => x.email === email);
if (!u) { console.error("no existe:", email); process.exit(1); }
const { error } = await admin.auth.admin.updateUserById(u.id, { password });
if (error) { console.error(error.message); process.exit(1); }
console.log("password actualizado para", email);
process.exit(0);
