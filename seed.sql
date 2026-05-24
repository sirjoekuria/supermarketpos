-- Ensure image_url column exists
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Delete existing products to avoid conflicts during testing
DELETE FROM public.products;

-- Insert products by dynamically looking up the category IDs
INSERT INTO public.products (barcode, name, price, cost_price, stock_quantity, category_id, unit, tax_rate, discount_percent, min_stock_level, is_active, image_url) 
VALUES
('8901234567890', 'Fresh Milk 500ml', 65.00, 50.00, 50, (SELECT id FROM public.categories WHERE name = 'Dairy & Eggs' LIMIT 1), 'pcs', 16, 0, 10, true, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400'),
('8901234567891', 'White Bread 400g', 55.00, 45.00, 30, (SELECT id FROM public.categories WHERE name = 'Bakery' LIMIT 1), 'pcs', 16, 5, 5, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400'),
('8901234567892', 'Sugar 1kg', 160.00, 140.00, 100, (SELECT id FROM public.categories WHERE name = 'Pantry Staples' LIMIT 1), 'pcs', 16, 0, 20, true, 'https://images.unsplash.com/photo-1581428982868-e410dd4b1a6c?auto=format&fit=crop&q=80&w=400'),
('8901234567893', 'Cooking Oil 1L', 280.00, 250.00, 40, (SELECT id FROM public.categories WHERE name = 'Pantry Staples' LIMIT 1), 'pcs', 16, 0, 10, true, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400'),
('8901234567894', 'Rice 2kg', 320.00, 280.00, 60, (SELECT id FROM public.categories WHERE name = 'Pantry Staples' LIMIT 1), 'pcs', 16, 10, 15, true, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400'),
('8901234567895', 'Wheat Flour 2kg', 210.00, 180.00, 45, (SELECT id FROM public.categories WHERE name = 'Pantry Staples' LIMIT 1), 'pcs', 16, 0, 10, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400'),
('8901234567896', 'Eggs (Tray)', 450.00, 390.00, 20, (SELECT id FROM public.categories WHERE name = 'Dairy & Eggs' LIMIT 1), 'pcs', 16, 0, 5, true, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=400'),
('8901234567897', 'Salt 1kg', 35.00, 25.00, 80, (SELECT id FROM public.categories WHERE name = 'Pantry Staples' LIMIT 1), 'pcs', 16, 0, 20, true, 'https://images.unsplash.com/photo-1621252179065-983df5a62bc7?auto=format&fit=crop&q=80&w=400')
ON CONFLICT (barcode) DO NOTHING;
