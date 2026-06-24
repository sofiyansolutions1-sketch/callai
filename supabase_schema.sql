-- Supabase SQL schema for the "leads" table.
-- You can run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT,
    contact_number TEXT,
    service_details TEXT,
    address TEXT,
    area_pin_code TEXT,
    service_date TEXT,
    service_timing TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to insert rows (since you are using an anon key)
CREATE POLICY "Allow public insert to leads" 
ON public.leads 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Create a policy to allow authenticated users or public to view leads (depending on your preference)
-- Currently setting up to allow public to view, for testing purposes, but you may want to restrict this later.
CREATE POLICY "Allow public select on leads" 
ON public.leads 
FOR SELECT 
TO public 
USING (true);
