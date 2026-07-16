import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const urlRaw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const url = urlRaw.split('/rest/v1/')[0].replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-";

console.log("Checking Supabase at:", url);
const supabase = createClient(url, key);

const targetTables = [
  "presencas", "notas_atividades", "conteudos_web", "safety_non_conformities",
  "escalas", "email_templates", "fixed_bills", "fixed_bill_payments"
];

async function test() {
  for (const table of targetTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table ${table} Error:`, error.message);
    } else {
      console.log(`✅ Table ${table} works! Column keys:`, Object.keys(data[0] || {}));
    }
  }
}
test();
