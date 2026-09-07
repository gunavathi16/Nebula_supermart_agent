/**
 * GST calculation utility for intra-state Indian retail (CGST + SGST split)
 */

export function calculateLineGst(qty, unitPrice, gstSlab) {
  const lineGross = Number(qty) * Number(unitPrice);
  const slab = Number(gstSlab) || 0;

  if (slab === 0) {
    return {
      qty: Number(qty),
      unitPrice: Number(unitPrice),
      gstSlab: 0,
      taxableValue: round2(lineGross),
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      lineTotal: round2(lineGross)
    };
  }

  // MRP inclusive calculation (standard retail kirana practice)
  const rateFraction = slab / 100;
  const taxableValue = lineGross / (1 + rateFraction);
  const totalTax = lineGross - taxableValue;
  
  const cgstRate = slab / 2;
  const sgstRate = slab / 2;
  const cgstAmount = totalTax / 2;
  const sgstAmount = totalTax / 2;

  return {
    qty: Number(qty),
    unitPrice: Number(unitPrice),
    gstSlab: slab,
    taxableValue: round2(taxableValue),
    cgstRate,
    cgstAmount: round2(cgstAmount),
    sgstRate,
    sgstAmount: round2(sgstAmount),
    lineTotal: round2(lineGross)
  };
}

export function calculateBillSummary(items) {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let gross = 0;

  const processedItems = items.map(item => {
    const calc = calculateLineGst(item.qty, item.unit_price, item.gst_slab);
    subtotal += calc.taxableValue;
    totalCgst += calc.cgstAmount;
    totalSgst += calc.sgstAmount;
    gross += calc.lineTotal;
    return {
      ...item,
      ...calc
    };
  });

  const rawTotal = subtotal + totalCgst + totalSgst;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = round2(roundedTotal - rawTotal);

  return {
    items: processedItems,
    subtotal: round2(subtotal),
    cgstAmount: round2(totalCgst),
    sgstAmount: round2(totalSgst),
    roundOff,
    totalAmount: roundedTotal
  };
}

export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}
