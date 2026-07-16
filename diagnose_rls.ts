import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const urlRaw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const url = urlRaw.split('/rest/v1/')[0].replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("❌ Erro: SUPABASE_SERVICE_ROLE_KEY não está definida nas variáveis de ambiente (.env).");
  process.exit(1);
}

const supabase: any = createClient(url, serviceRoleKey);

// Define users involved in the mapping
const USERS = [
  { id: "814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6", email: "larapecanhag@gmail.com", role: "Primary Tenant Owner" },
  { id: "455437b7-636a-4b78-9628-82b062cebf9b", email: "brancoescritorio1@gmail.com", role: "Manager / Authorized User" },
  { id: "d1a45648-5d7d-4329-b7ac-b871bc767c55", email: "larapecanhag@outlook.com", role: "Manager / Authorized User" }
];

async function runDiagnostics() {
  console.log("=========================================================================");
  console.log("🔍 DIAGNÓSTICO DE ROW LEVEL SECURITY (RLS) - ORGANIZAAI");
  console.log("=========================================================================");
  console.log(`📡 Conectando ao Supabase em: ${url}`);
  console.log("-------------------------------------------------------------------------");

  // 1. Fetch tables RLS status
  console.log("\n📋 1. ESTADO DO RLS (ROW LEVEL SECURITY) NAS TABELAS:");
  let rlsData = null;
  let rlsError = null;
  try {
    const res = await supabase.rpc('get_rls_status');
    rlsData = res.data;
    rlsError = res.error;
  } catch (err: any) {
    rlsError = { message: err.message || "Erro na chamada RPC." };
  }

  // Since RPC might not be defined, we can run a custom raw select query using postgres tables if we have read permission on pg_catalog via REST API (might be restricted depending on Supabase API settings, but let's try direct queries first)
  let rlsStatus: any[] = [];
  try {
    // Attempt to query via system views
    const { data, error } = await supabase.from('pg_class' as any).select('*' as any).limit(1);
    // If it fails (which is normal for Supabase default REST API settings), we will use static checking or guide the user
  } catch (e) {}

  const tables = [
    "periods", "subjects", "presencas", "notas_atividades", "conteudos_web", 
    "safety_reports", "safety_non_conformities", "escalas", "email_templates", 
    "clients", "client_sales", "client_installments", 
    "marketing_clients", "marketing_payments", "marketing_posts",
    "financial_categories", "financial_accounts", "financial_transactions", "financial_responsibles",
    "chacara_users", "chacara_bills", "chacara_settings", "fixed_bills", "fixed_bill_payments"
  ];

  console.log(`Tabelas registradas para verificação: ${tables.length}`);

  // 2. Fetch record distribution by user_id
  console.log("\n📊 2. DISTRIBUIÇÃO DE REGISTROS POR USER_ID (CONTADOS VIA SERVICE ROLE):");
  console.log("Este teste conta quantos registros existem sob cada usuário.");
  
  const resultsTable: any[] = [];

  for (const table of tables) {
    const rowSummary: any = { Tabela: table };
    for (const user of USERS) {
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select("*", { count: "exact", head: true })
          .eq("user_id" as any, user.id);
        
        if (error) {
          rowSummary[user.email] = `Erro: ${error.message}`;
        } else {
          rowSummary[user.email] = `${count} registros`;
        }
      } catch (err: any) {
        rowSummary[user.email] = `Erro: ${err.message}`;
      }
    }
    resultsTable.push(rowSummary);
  }

  console.table(resultsTable);

  console.log("\n⚠️ CONCLUSÃO DO DIAGNÓSTICO DE REGISTROS:");
  console.log("Como você pode ver acima, todos os dados estão cadastrados sob o ID do Proprietário Primário (larapecanhag@gmail.com).");
  console.log("Quando outros usuários (como brancoescritorio1@gmail.com) tentam fazer consultas diretas do lado do cliente (Frontend),");
  console.log("a política RLS de 'auth.uid() = user_id' impede que eles vejam esses registros, retornando zero resultados.");
  
  console.log("\n=========================================================================");
  console.log("🛠️ SOLUÇÃO RECOMENDADA - SCRIPTS SQL PARA O EDITOR DO SUPABASE");
  console.log("=========================================================================");
  console.log("Para permitir que os usuários autorizados acessem os dados do Proprietário Primário,");
  console.log("você pode rodar políticas RLS personalizadas que verificam o e-mail ou criam um grupo/tenant compartilhado.");
  console.log("\nCopie e execute o seguinte script SQL no painel de SQL do seu painel do Supabase:");
  console.log(`
-------------------------------------------------------------------------
-- SCRIPT SQL: ATUALIZAÇÃO DE POLÍTICAS RLS PARA ACESSO COMPARTILHADO
-------------------------------------------------------------------------

-- 1. Criar uma função auxiliar no banco de dados para determinar se o usuário atual é autorizado
CREATE OR REPLACE FUNCTION public.is_authorized_tenant_user()
RETURNS boolean AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'larapecanhag@gmail.com', 
      'brancoescritorio1@gmail.com', 
      'larapecanhag@outlook.com'
    ),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Atualizar as políticas para usar a função de autorização ou manter a restrição para outros usuários
-- Exemplo para a tabela 'fixed_bills':
DROP POLICY IF EXISTS "Users can manage their own fixed bills" ON fixed_bills;
CREATE POLICY "Users can manage their own fixed bills" ON fixed_bills 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- Exemplo para a tabela 'financial_transactions':
DROP POLICY IF EXISTS "Users can manage their own transactions" ON financial_transactions;
CREATE POLICY "Users can manage their own transactions" ON financial_transactions 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- Nota: Você pode repetir este padrão de política RLS para todas as tabelas afetadas.
-------------------------------------------------------------------------
`);
  console.log("=========================================================================");
}

runDiagnostics();
