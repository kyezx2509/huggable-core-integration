CREATE TABLE public.checkout_errors (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_cpf text,
  amount numeric,
  gateway text,
  stage text,
  error_message text,
  error_details jsonb,
  is_upsell boolean not null default false,
  customer_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.checkout_errors TO authenticated;
GRANT ALL ON public.checkout_errors TO service_role;
ALTER TABLE public.checkout_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read checkout errors" ON public.checkout_errors FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()));