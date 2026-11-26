// Invoice quoting for a UAE business. Rules: .claude/knowledge/business-rules.md (BL-INV-*).

import { round2 } from './money.mjs';

export const VAT_RATE = 0.05; // BL-INV-004: UAE standard VAT rate

export class InvoiceError extends Error {}

/** Validate one line: { description, quantity, unitPrice }. */
function validateLine(line, index) {
  const at = `line ${index + 1}`;
  if (!line || typeof line.description !== 'string' || !line.description.trim()) throw new InvoiceError(`${at}: description is required`);
  if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new InvoiceError(`${at}: quantity must be a positive integer`);
  if (typeof line.unitPrice !== 'number' || !Number.isFinite(line.unitPrice) || line.unitPrice < 0) throw new InvoiceError(`${at}: unitPrice must be a non-negative number`);
  if (round2(line.unitPrice) !== line.unitPrice) throw new InvoiceError(`${at}: unitPrice has more than 2 decimals`);
}

/**
 * Quote an invoice.
 * @param {{description:string, quantity:number, unitPrice:number}[]} lines
 * @returns {{ lines: object[], subtotal:number, vat:number, total:number, currency:'AED' }}
 */
export function quoteInvoice(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new InvoiceError('an invoice needs at least one line'); // BL-INV-001
  lines.forEach(validateLine);
  const priced = lines.map((l) => ({ ...l, amount: round2(l.quantity * l.unitPrice) }));
  const subtotal = round2(priced.reduce((sum, l) => sum + l.amount, 0));
  const vat = round2(subtotal * VAT_RATE); // BL-INV-004 + BL-INV-005: VAT on the subtotal, rounded once
  const total = round2(subtotal + vat);
  return { lines: priced, subtotal, vat, total, currency: 'AED' };
}
