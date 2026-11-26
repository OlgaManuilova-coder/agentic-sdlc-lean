import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvoiceError, quoteInvoice } from '../src/invoice.mjs';

test('BL-INV-004: VAT is 5% of the subtotal (FEAT-001)', () => {
  const q = quoteInvoice([{ description: 'Consulting hour', quantity: 2, unitPrice: 450 }]);
  assert.equal(q.subtotal, 900);
  assert.equal(q.vat, 45);
  assert.equal(q.total, 945);
  assert.equal(q.currency, 'AED');
});

test('BL-INV-004: VAT is computed once on the subtotal, not per line (FEAT-001)', () => {
  const q = quoteInvoice([
    { description: 'A', quantity: 1, unitPrice: 0.3 },
    { description: 'B', quantity: 1, unitPrice: 0.3 },
    { description: 'C', quantity: 1, unitPrice: 0.3 },
  ]);
  assert.equal(q.subtotal, 0.9);
  assert.equal(q.vat, 0.05); // 0.045 -> 0.05 half-up; per-line rounding would give 0.03
  assert.equal(q.total, 0.95);
});

test('BL-INV-001: an invoice needs at least one line', () => {
  assert.throws(() => quoteInvoice([]), InvoiceError);
});

test('BL-INV-002/003: line validation', () => {
  assert.throws(() => quoteInvoice([{ description: 'x', quantity: 0, unitPrice: 1 }]), /quantity/);
  assert.throws(() => quoteInvoice([{ description: 'x', quantity: 1.5, unitPrice: 1 }]), /quantity/);
  assert.throws(() => quoteInvoice([{ description: 'x', quantity: 1, unitPrice: -1 }]), /unitPrice/);
  assert.throws(() => quoteInvoice([{ description: 'x', quantity: 1, unitPrice: 1.234 }]), /decimals/);
  assert.throws(() => quoteInvoice([{ description: ' ', quantity: 1, unitPrice: 1 }]), /description/);
});
