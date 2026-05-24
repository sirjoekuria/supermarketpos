-- Create stock receipt table for tracking incoming inventory
CREATE TABLE IF NOT EXISTS public.stock_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('pending', 'received', 'partial', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create stock receipt items table
CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id UUID REFERENCES public.stock_receipts(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create stock adjustment log table for audit trail
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL CHECK (reason IN ('receipt', 'adjustment', 'return', 'loss', 'damage', 'correction')),
    reference_id UUID,
    notes TEXT,
    adjusted_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_receipts_status ON public.stock_receipts(status);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_created_at ON public.stock_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON public.stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON public.stock_adjustments(created_at DESC);

-- Enable RLS
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.stock_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users" ON public.stock_receipt_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON public.stock_receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.stock_receipt_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON public.stock_receipts FOR UPDATE TO authenticated USING (true);
