export interface Period {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
}

export interface Subject {
  id: number;
  month_year: string;
  subject_name: string;
  professor?: string;
  workload?: number;
  period_id: number;
  act1_end?: string;
  act2_end?: string;
  exam_end?: string;
}

export interface Attendance {
  id: number;
  mes_materia_id: number;
  periodo_id: number;
  data_aula_1: string;
  aula_1: boolean;
  data_aula_2: string;
  aula_2: boolean;
  data_aula_3: string;
  aula_3: boolean;
  data_aula_4: string;
  aula_4: boolean;
}

export interface Activities {
  id: number;
  mes_materia_id: number;
  periodo_id: number;
  atividade_1_nota: number;
  atividade_2_nota: number;
  prova_nota: number;
  atividade_1_status: string;
  atividade_2_status: string;
  atividade_1_prazo?: string;
  atividade_2_prazo?: string;
  prova_data?: string;
  atividade_1_inicio?: string;
  atividade_2_inicio?: string;
  prova_inicio?: string;
}

export interface WebContent {
  id: number;
  mes_materia_id: number;
  periodo_id: number;
  conteudo_1_assistido: boolean;
  data_1: string;
  conteudo_2_assistido: boolean;
  data_2: string;
  conteudo_3_assistido: boolean;
  data_3: string;
  conteudo_4_assistido: boolean;
  data_4: string;
}

export interface DashboardData {
  id: number;
  month_year: string;
  subject_name: string;
  period_id: number;
  aula1_present: number;
  aula2_present: number;
  aula3_present: number;
  aula4_present: number;
  act1_status: string;
  act1_grade: number;
  act2_status: string;
  act2_grade: number;
  exam_grade: number;
  c1_watched: number;
  c2_watched: number;
  c3_watched: number;
  c4_watched: number;
  act1_deadline?: string;
  act2_deadline?: string;
  exam_date?: string;
  act1_start?: string;
  act2_start?: string;
  exam_start?: string;
}

export interface FinancialCategory {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
}

export interface FinancialAccount {
  id: number;
  name: string;
  initial_balance: number;
  type: 'corrente' | 'credito' | 'dinheiro';
  closing_day?: number;
  due_day?: number;
}

export interface FinancialTransaction {
  id: number;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category_id: number;
  account_id: number;
  date: string;
  status: 'pago' | 'pendente';
  is_installment?: boolean;
  installment_number?: number;
  total_installments?: number;
  splits?: { name: string; amount: number }[];
}

export interface Client {
  id: number;
  name: string;
  phone?: string;
}

export interface ClientSale {
  id: number;
  client_id: number;
  description: string;
  total_amount: number;
  installment_count: number;
  purchase_date: string;
  due_day: number;
}

export interface ClientInstallment {
  id: number;
  sale_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pendente' | 'pago';
  payment_date?: string;
  client_sales?: {
    description: string;
    clients: {
      name: string;
      phone?: string;
    }
  }
}
