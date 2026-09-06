-- Database Indexing Migration
-- These indexes will dramatically improve read-performance and querying speed 
-- across high-traffic operations (Sales filtering, MPESA checks, Customer lookup).

-- 1. Index on sales created_at to speed up reporting dates and shift closure filtering
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- 2. Index on sales cashier_id to speed up cashier-specific shifts
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);

-- 3. Index on mpesa_transactions receipt_number for fast duplication checks during webhook callbacks
CREATE INDEX IF NOT EXISTS idx_mpesa_receipt_number ON mpesa_transactions(mpesa_receipt_number);

-- 4. Index on mpesa_transactions status and sale_id for the UI to quickly fetch "unlinked" transactions
CREATE INDEX IF NOT EXISTS idx_mpesa_unlinked ON mpesa_transactions(status, sale_id);

-- 5. Index on branch_stock product_id for fast inventory loading per branch
CREATE INDEX IF NOT EXISTS idx_branch_stock_product_id ON branch_stock(product_id);

-- 6. Index on branch_stock branch_id
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_id ON branch_stock(branch_id);

-- 7. Index on customers phone number to speed up POS customer search during checkout
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 8. Index on customers points_balance for fast top-customer reporting
CREATE INDEX IF NOT EXISTS idx_customers_points ON customers(points_balance DESC);
