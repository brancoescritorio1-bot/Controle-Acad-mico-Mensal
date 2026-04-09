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
  act1_grade: number | null;
  act2_status: string;
  act2_grade: number | null;
  exam_grade: number | null;
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
  splits?: { name: string; amount: number; status?: 'pago' | 'pendente' }[];
}

export interface Client {
  id: number;
  name: string;
  phone?: string;
  last_purchase?: string | null;
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
    installment_count: number;
    clients: {
      name: string;
      phone?: string;
    }
  }
}

export interface ChacaraUser {
  id: number;
  name: string;
  phone: string;
  last_reading: number;
  last_water_reading?: number;
  has_energy?: boolean;
  has_water?: boolean;
  energy_meters_count?: number;
  water_meters_count?: number;
  last_reading_2?: number;
  last_water_reading_2?: number;
  energy_active?: boolean;
  water_active?: boolean;
  energy_readings?: { prev: number; curr: number }[];
  water_readings?: { prev: number; curr: number }[];
}

export interface ChacaraBill {
  id: number;
  user_id: string; // This is the owner UUID
  chacara_user_id: number; // This is the resident ID
  month_reference: string;
  reading_date: string;
  due_date: string;
  // Energy
  prev_reading: number;
  curr_reading: number;
  prev_reading_2?: number;
  curr_reading_2?: number;
  kwh_value: number;
  // Water
  water_prev_reading: number;
  water_curr_reading: number;
  water_prev_reading_2?: number;
  water_curr_reading_2?: number;
  water_value: number;
  water_service_fee?: number;
  energy_readings?: { prev: number; curr: number }[];
  water_readings?: { prev: number; curr: number }[];
  // Apportionment
  apportionment_value: number;
  include_apportionment: boolean;
  
  reserve_fund: number;
  total: number;
  include_reserve_fund: boolean;
  status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  amount_paid?: number;
  paid_categories?: Record<string, boolean>;
  created_at?: string;
}

export interface ChacaraSettings {
  id: number;
  default_kwh: number;
  default_water_value: number;
  default_water_service_fee?: number;
  default_apportionment_value: number;
  default_due_day: number;
  default_reading_day: number;
  reserve_fund_value: number;
  default_month_reference?: string;
  whatsapp_observation?: string;
}

export interface ChacaraAccountability {
  id: string;
  user_id: string;
  month_reference: string;
  initial_reserve_fund: number;
  initial_apportionment: number;
  initial_services: number;
  created_at?: string;
}

export interface ChacaraExpense {
  id: string;
  accountability_id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  receipt_url?: string;
  created_at?: string;
}

export interface PersonalTask {
  id: number;
  user_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  eisenhower_quadrant?: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important';
  created_at?: string;
}
