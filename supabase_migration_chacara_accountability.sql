-- Create chacara_accountability table
CREATE TABLE IF NOT EXISTS chacara_accountability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month_reference VARCHAR(7) NOT NULL,
  prev_balance_reserve_fund NUMERIC DEFAULT 0,
  prev_balance_main_account NUMERIC DEFAULT 0,
  prev_balance_services NUMERIC DEFAULT 0,
  prev_balance_energy NUMERIC DEFAULT 0,
  prev_balance_water NUMERIC DEFAULT 0,
  total_collected NUMERIC DEFAULT 0,
  closing_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_reference)
);

-- Create chacara_expenses table
CREATE TABLE IF NOT EXISTS chacara_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountability_id UUID REFERENCES chacara_accountability(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chacara_receipts', 'chacara_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chacara_receipts');

CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chacara_receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'chacara_receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'chacara_receipts' AND auth.role() = 'authenticated');
