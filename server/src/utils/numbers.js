export function nextNumber(prefix, seq) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

export function calcTax(subtotal, rate = 18) {
  const tax = Math.round(subtotal * (rate / 100) * 100) / 100;
  return { tax, total: Math.round((subtotal + tax) * 100) / 100 };
}
