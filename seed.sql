-- Disable RLS temporarily to allow seeding if needed (or assume user runs this from Supabase Dashboard as admin)
-- Seed Categories
INSERT INTO public.categories (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Dairy & Eggs', 'Milk, eggs, cheese and other dairy products'),
('22222222-2222-2222-2222-222222222222', 'Bakery', 'Bread, pastries, and baked goods'),
('33333333-3333-3333-3333-333333333333', 'Pantry Staples', 'Flour, sugar, rice, cooking oil, and salt'),
('44444444-4444-4444-4444-444444444444', 'Beverages', 'Soft drinks, juices, tea, and coffee'),
('55555555-5555-5555-5555-555555555555', 'Produce', 'Fresh fruits and vegetables')
ON CONFLICT (id) DO NOTHING;

-- Seed Products
INSERT INTO public.products (barcode, name, price, cost_price, stock_quantity, category_id, unit, tax_rate, discount_percent, min_stock_level, is_active) VALUES
('8901234567890', 'Fresh Milk 500ml', 65.00, 50.00, 50, '11111111-1111-1111-1111-111111111111', 'pcs', 16, 0, 10, true),
('8901234567891', 'White Bread 400g', 55.00, 45.00, 30, '22222222-2222-2222-2222-222222222222', 'pcs', 16, 5, 5, true),
('8901234567892', 'Sugar 1kg', 160.00, 140.00, 100, '33333333-3333-3333-3333-333333333333', 'pcs', 16, 0, 20, true),
('8901234567893', 'Cooking Oil 1L', 280.00, 250.00, 40, '33333333-3333-3333-3333-333333333333', 'pcs', 16, 0, 10, true),
('8901234567894', 'Rice 2kg', 320.00, 280.00, 60, '33333333-3333-3333-3333-333333333333', 'pcs', 16, 10, 15, true),
('8901234567895', 'Wheat Flour 2kg', 210.00, 180.00, 45, '33333333-3333-3333-3333-333333333333', 'pcs', 16, 0, 10, true),
('8901234567896', 'Eggs (Tray)', 450.00, 390.00, 20, '11111111-1111-1111-1111-111111111111', 'pcs', 16, 0, 5, true),
('8901234567897', 'Salt 1kg', 35.00, 25.00, 80, '33333333-3333-3333-3333-333333333333', 'pcs', 16, 0, 20, true),
('8901234567898', 'Orange Juice 1L', 150.00, 120.00, 35, '44444444-4444-4444-4444-444444444444', 'pcs', 16, 0, 10, true),
('8901234567899', 'Premium Coffee 250g', 850.00, 700.00, 15, '44444444-4444-4444-4444-444444444444', 'pcs', 16, 0, 5, true),
('8901234567900', 'Apples (1kg)', 300.00, 240.00, 25, '55555555-5555-5555-5555-555555555555', 'kg', 0, 0, 5, true),
('8901234567901', 'Tomatoes (1kg)', 120.00, 90.00, 40, '55555555-5555-5555-5555-555555555555', 'kg', 0, 0, 10, true)
ON CONFLICT (barcode) DO NOTHING;
