-- Migration for fixed_bills and fixed_bill_payments isolation and RLS
ALTER TABLE IF EXISTS fixed_bills ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE IF EXISTS fixed_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own fixed bills" ON fixed_bills;
CREATE POLICY "Users can manage their own fixed bills" ON fixed_bills FOR ALL USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS fixed_bill_payments ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE IF EXISTS fixed_bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own fixed bill payments" ON fixed_bill_payments;
CREATE POLICY "Users can manage their own fixed bill payments" ON fixed_bill_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM fixed_bills WHERE fixed_bills.id = fixed_bill_payments.bill_id AND fixed_bills.user_id = auth.uid()));
