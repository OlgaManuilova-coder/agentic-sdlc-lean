// Money helpers. Amounts are AED with 2 decimal places (fils).

/** Round to 2 decimals. Business rule BL-INV-005 requires half-up rounding to the fil. */
export function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Format as "AED 1,234.50". */
export function formatAed(value) {
  return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
