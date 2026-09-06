import test from 'node:test';
import assert from 'node:assert';
import { calculateCartTotals } from '../src/lib/utils.ts';

test('calculateCartTotals calculates correctly', () => {
  const items = [
    {
      product: { price: 100, tax_rate: 16, discount_percent: 0 },
      quantity: 2
    },
    {
      product: { price: 50, tax_rate: 16, discount_percent: 10 },
      quantity: 2
    }
  ];
  
  // 100 * 2 = 200 (discount 0)
  // 50 * 2 = 100 (discount 10%) = 10 discount
  // Subtotal = 300, Discount = 10, Total = 290
  const totals = calculateCartTotals(items);
  
  assert.strictEqual(totals.subtotal, 300);
  assert.strictEqual(totals.discountAmount, 10);
  assert.strictEqual(totals.total, 290);
});
