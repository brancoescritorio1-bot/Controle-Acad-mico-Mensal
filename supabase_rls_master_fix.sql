-- =========================================================================
-- 🛠️ SCRIPT DE CORREÇÃO MASTER: SCHEMAS E POLÍTICAS DE RLS COMPARTILHADAS
-- Projeto: OrganizaAI (Supabase)
-- Data: 2026-07-16
-- Descrição: Este script corrige colunas ausentes de tabelas (como 'user_id' em 'fixed_bills')
--            e implementa a arquitetura de Tenant Compartilhado (Shared Multi-Tenant) RLS.
--            Isso garante que os usuários 'brancoescritorio1@gmail.com' e 'larapecanhag@outlook.com'
--            possam ver e editar com segurança os dados cadastrados pelo Proprietário Primário.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. ADIÇÃO DE COLUNAS FALTANTES E AJUSTE DE INTEGRIDADE
-- -------------------------------------------------------------------------

-- Garantir que a coluna 'user_id' exista na tabela 'fixed_bills'
ALTER TABLE IF EXISTS fixed_bills 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid;

-- Backfill: Forçar todos os registros existentes de 'fixed_bills' a pertencerem ao Proprietário Primário
UPDATE fixed_bills 
SET user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid 
WHERE user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Garantir que a tabela 'fixed_bills' tenha o RLS ativo
ALTER TABLE fixed_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_bill_payments ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------
-- 2. CRIAÇÃO DA FUNÇÃO AUXILIAR DE SEGURANÇA (SECURITY DEFINER)
-- -------------------------------------------------------------------------

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


-- -------------------------------------------------------------------------
-- 3. RECRIAÇÃO DE POLÍTICAS RLS (TENANT COMPARTILHADO)
-- -------------------------------------------------------------------------

-- 3.1 CONTAS FIXAS (fixed_bills & fixed_bill_payments)
DROP POLICY IF EXISTS "Users can manage their own fixed bills" ON fixed_bills;
CREATE POLICY "Users can manage their own fixed bills" ON fixed_bills 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own fixed bill payments" ON fixed_bill_payments;
CREATE POLICY "Users can manage their own fixed bill payments" ON fixed_bill_payments 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM fixed_bills 
    WHERE fixed_bills.id = fixed_bill_payments.bill_id 
    AND (
      fixed_bills.user_id = auth.uid() OR
      (public.is_authorized_tenant_user() AND fixed_bills.user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
    )
  )
);

-- 3.2 FINANCEIRO (Categories, Accounts, Transactions, Responsibles)
DROP POLICY IF EXISTS "Users can manage their own financial categories" ON financial_categories;
CREATE POLICY "Users can manage their own financial categories" ON financial_categories 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own financial accounts" ON financial_accounts;
CREATE POLICY "Users can manage their own financial accounts" ON financial_accounts 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own financial transactions" ON financial_transactions;
CREATE POLICY "Users can manage their own financial transactions" ON financial_transactions 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own financial responsibles" ON financial_responsibles;
CREATE POLICY "Users can manage their own financial responsibles" ON financial_responsibles 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- 3.3 CLIENTES (Clients, Sales, Installments)
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own client sales" ON client_sales;
CREATE POLICY "Users can manage their own client sales" ON client_sales 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own client installments" ON client_installments;
CREATE POLICY "Users can manage their own client installments" ON client_installments 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- 3.4 MARKETING (Clients, Payments, Posts)
DROP POLICY IF EXISTS "Users can manage their own marketing clients" ON marketing_clients;
CREATE POLICY "Users can manage their own marketing clients" ON marketing_clients 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own marketing payments" ON marketing_payments;
CREATE POLICY "Users can manage their own marketing payments" ON marketing_payments 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own marketing posts" ON marketing_posts;
CREATE POLICY "Users can manage their own marketing posts" ON marketing_posts 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- 3.5 ACADÊMICO (Periods, Subjects, Presencas, Notas Atividades,Conteudos Web)
DROP POLICY IF EXISTS "Users can manage their own periods" ON periods;
CREATE POLICY "Users can manage their own periods" ON periods 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own subjects" ON subjects;
CREATE POLICY "Users can manage their own subjects" ON subjects 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own presencas" ON presencas;
CREATE POLICY "Users can manage their own presencas" ON presencas 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = presencas.mes_materia_id 
    AND (
      subjects.user_id = auth.uid() OR
      (public.is_authorized_tenant_user() AND subjects.user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
    )
  )
);

DROP POLICY IF EXISTS "Users can manage their own notas" ON notas_atividades;
CREATE POLICY "Users can manage their own notas" ON notas_atividades 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = notas_atividades.mes_materia_id 
    AND (
      subjects.user_id = auth.uid() OR
      (public.is_authorized_tenant_user() AND subjects.user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
    )
  )
);

DROP POLICY IF EXISTS "Users can manage their own conteudos" ON conteudos_web;
CREATE POLICY "Users can manage their own conteudos" ON conteudos_web 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM subjects 
    WHERE subjects.id = conteudos_web.mes_materia_id 
    AND (
      subjects.user_id = auth.uid() OR
      (public.is_authorized_tenant_user() AND subjects.user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
    )
  )
);

-- 3.6 SEGURANÇA DO TRABALHO (safety_reports & safety_non_conformities)
DROP POLICY IF EXISTS "Users can manage their own safety reports" ON safety_reports;
CREATE POLICY "Users can manage their own safety reports" ON safety_reports 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own safety non conformities" ON safety_non_conformities;
CREATE POLICY "Users can manage their own safety non conformities" ON safety_non_conformities 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM safety_reports 
    WHERE safety_reports.id = safety_non_conformities.report_id 
    AND (
      safety_reports.user_id = auth.uid() OR
      (public.is_authorized_tenant_user() AND safety_reports.user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
    )
  )
);

-- 3.7 CHÁCARA (chacara_users, chacara_bills, chacara_settings)
DROP POLICY IF EXISTS "Users can manage their own chacara users" ON chacara_users;
CREATE POLICY "Users can manage their own chacara users" ON chacara_users 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own chacara bills" ON chacara_bills;
CREATE POLICY "Users can manage their own chacara bills" ON chacara_bills 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

DROP POLICY IF EXISTS "Users can manage their own chacara settings" ON chacara_settings;
CREATE POLICY "Users can manage their own chacara settings" ON chacara_settings 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- 3.8 NOTIFICAÇÕES (notifications)
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
CREATE POLICY "Users can manage their own notifications" ON notifications 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

-- 3.9 PERSONAL TASKS (personal_tasks)
DROP POLICY IF EXISTS "Users can manage their own personal tasks" ON personal_tasks;
CREATE POLICY "Users can manage their own personal tasks" ON personal_tasks 
FOR ALL USING (
  user_id = auth.uid() OR 
  (public.is_authorized_tenant_user() AND user_id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'::uuid)
);

COMMIT;
