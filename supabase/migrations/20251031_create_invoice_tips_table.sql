-- Create invoice_tips table for tracking tips associated with invoices
CREATE TABLE IF NOT EXISTS public.invoice_tips (
  tip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
  tip_amount DECIMAL(10, 2) NOT NULL CHECK (tip_amount >= 0),
  tip_percentage DECIMAL(5, 2) CHECK (tip_percentage >= 0 AND tip_percentage <= 100),
  tip_reason TEXT,
  guest_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  commission_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_tips_invoice_id ON public.invoice_tips(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tips_recipient_user_id ON public.invoice_tips(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tips_status ON public.invoice_tips(status);
CREATE INDEX IF NOT EXISTS idx_invoice_tips_created_at ON public.invoice_tips(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.invoice_tips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.invoice_tips ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view tips
CREATE POLICY "Allow all authenticated users to view invoice tips"
  ON public.invoice_tips
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and ops to insert tips
CREATE POLICY "Allow admins and ops to insert invoice tips"
  ON public.invoice_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Policy: Allow admins and ops to update tips
CREATE POLICY "Allow admins and ops to update invoice tips"
  ON public.invoice_tips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Policy: Allow admins and ops to delete tips
CREATE POLICY "Allow admins and ops to delete invoice tips"
  ON public.invoice_tips
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.user_type IN ('admin', 'ops')
    )
  );

-- Create a view for tips summary
CREATE OR REPLACE VIEW public.tips_summary AS
SELECT
  recipient_user_id,
  COUNT(*) as total_tips,
  SUM(tip_amount) as total_amount,
  SUM(CASE WHEN status = 'pending' THEN tip_amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN status = 'processed' THEN tip_amount ELSE 0 END) as processed_amount,
  SUM(CASE WHEN status = 'paid' THEN tip_amount ELSE 0 END) as paid_amount,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_count,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
FROM public.invoice_tips
GROUP BY recipient_user_id;

-- Grant access to the view
GRANT SELECT ON public.tips_summary TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.invoice_tips IS 'Stores tips associated with invoices that can be allocated to staff members';
