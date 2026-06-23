CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_name TEXT,
    contact_number TEXT,
    service_details TEXT,
    address TEXT,
    area_pin_code TEXT,
    service_date TEXT,
    service_timing TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert new booking leads
CREATE POLICY "Allow anonymous inserts" ON public.leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow anonymous users to view booking leads (so they appear on your dashboard)
CREATE POLICY "Allow anonymous select" ON public.leads
    FOR SELECT
    TO anon
    USING (true);
