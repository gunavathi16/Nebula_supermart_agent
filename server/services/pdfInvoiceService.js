import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));
const LOGO_PNG = path.join(dir, '..', 'assets', 'brand-logo.png');
const LOGO_JPG = path.join(dir, '..', 'assets', 'brand-logo.jpg');
const LOGO_PATH = fs.existsSync(LOGO_PNG) ? LOGO_PNG : LOGO_JPG;

// Color palettes for branded invoice templates
const THEMES = {
  nebula_indigo: {
    primary: '#1E293B',     // Slate/Indigo 800
    dark: '#0F172A',        // Midnight 900
    accent: '#D97706',      // Brass Gold
    tableHeader: '#0F172A', // Deep Midnight
    tableZebra: '#F8FAFC',  // Canvas white / Slate 50
    badgeBg: '#FEF3C7',     // Amber 100
    badgeText: '#92400E',   // Amber 900
    totalBox: '#0F172A',    // Midnight 900
    border: '#CBD5E1'
  },
  modern_emerald: {
    primary: '#059669',     // Emerald 600
    dark: '#064E3B',        // Emerald 900
    accent: '#10B981',      // Emerald 500
    tableHeader: '#047857', // Emerald 700
    tableZebra: '#F0FDF4',  // Emerald 50
    badgeBg: '#D1FAE5',     // Emerald 100
    badgeText: '#065F46',   // Emerald 800
    totalBox: '#064E3B',    // Dark emerald
    border: '#A7F3D0'
  },
  royal_navy: {
    primary: '#2563EB',     // Blue 600
    dark: '#1E3A8A',        // Blue 900
    accent: '#3B82F6',      // Blue 500
    tableHeader: '#1D4ED8', // Blue 700
    tableZebra: '#EFF6FF',  // Blue 50
    badgeBg: '#DBEAFE',     // Blue 100
    badgeText: '#1E40AF',   // Blue 800
    totalBox: '#1E3A8A',    // Dark navy
    border: '#BFDBFE'
  },
  classic_kirana: {
    primary: '#EA580C',     // Orange 600
    dark: '#7C2D12',        // Orange 900
    accent: '#F97316',      // Orange 500
    tableHeader: '#C2410C', // Orange 700
    tableZebra: '#FFF7ED',  // Orange 50
    badgeBg: '#FFEDD5',     // Orange 100
    badgeText: '#9A3412',   // Orange 800
    totalBox: '#7C2D12',    // Dark orange
    border: '#FED7AA'
  },
  slate_pro: {
    primary: '#334155',     // Slate 700
    dark: '#0F172A',        // Slate 900
    accent: '#64748B',      // Slate 500
    tableHeader: '#1E293B', // Slate 800
    tableZebra: '#F8FAFC',  // Slate 50
    badgeBg: '#E2E8F0',     // Slate 200
    badgeText: '#0F172A',   // Slate 900
    totalBox: '#0F172A',    // Slate 900
    border: '#CBD5E1'
  }
};

/**
 * Generate a GST-compliant, branded Tax Invoice PDF with UPI QR Code
 */
export async function generateInvoicePdf(bill, items, settings = {}) {
  // Select theme template
  const templateName = settings.invoice_template || 'nebula_indigo';
  const theme = THEMES[templateName] || THEMES.nebula_indigo;

  const shopName = (settings.shop_name || 'NEBULA SUPERMARKET').toUpperCase();
  const shopTagline = settings.shop_tagline || 'Daily Provisions • Honest Measures • Lasting Trust';
  const shopAddress = settings.shop_address || 'Shop No. 12, Main Market Road, Near Gandhi Circle, Bengaluru, Karnataka — 560001';
  const shopPhone = settings.shop_phone || '+91 98450 12345';
  const shopGstin = settings.shop_gstin || '29AAAAA0000A1Z5';
  const shopState = settings.shop_state_code || '29 (Karnataka)';
  const upiId = settings.shop_upi_id || 'nebulasupermarket@upi';

  // Generate UPI QR Code PNG Buffer for Scan-to-Pay
  let qrCodeBuffer = null;
  try {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${Number(bill.total_amount).toFixed(2)}&cu=INR&tn=Bill-${bill.bill_number}`;
    qrCodeBuffer = await QRCode.toBuffer(upiUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: theme.dark,
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.warn('UPI QR code generation skipped:', err.message);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: `Tax Invoice - ${bill.bill_number}`,
          Author: shopName,
          Subject: 'GST Tax Invoice',
          Creator: 'Nebula Supermarket Ops Engine'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Helper: Draw subtle diagonal watermark with supermarket name in background
      const drawWatermark = () => {
        doc.save();
        doc.opacity(0.06);
        doc.fillColor(theme.dark);
        doc.fontSize(40);
        doc.font('Helvetica-Bold');
        doc.rotate(-30, { origin: [297.64, 420.94] });
        doc.text(shopName, 0, 400, {
          width: 595.28,
          align: 'center'
        });
        doc.restore();
      };

      // Draw watermark on page
      drawWatermark();

      // --- BRAND TOP BAR ACCENT ---
      doc.rect(0, 0, 595.28, 8).fill(theme.primary);

      // --- STORE BRAND HEADER ---
      let curY = 24;

      // Brand Logo Emblem
      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, 36, curY, { width: 38, height: 38 });
        } catch (e) {
          doc.roundedRect(36, curY, 38, 38, 6).fill(theme.primary);
          doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
            .text('🏪', 43, curY + 6, { width: 24, align: 'center' });
        }
      } else {
        doc.roundedRect(36, curY, 38, 38, 6).fill(theme.primary);
        doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
          .text('🏪', 43, curY + 6, { width: 24, align: 'center' });
      }

      // Store Titles & Details
      doc.fillColor(theme.dark).fontSize(15).font('Helvetica-Bold')
        .text(shopName, 82, curY);

      doc.fontSize(7).font('Helvetica-Oblique').fillColor(theme.accent)
        .text(shopTagline, 82, curY + 16);

      doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
        .text(shopAddress, 82, curY + 25)
        .text(`Phone: ${shopPhone}  |  State: ${shopState}`, 82, curY + 34);

      // Invoice Type Pill Banner (Top Right)
      const bannerX = 425;
      doc.roundedRect(bannerX, curY, 134, 38, 4).fill(theme.badgeBg);
      doc.fillColor(theme.badgeText).font('Helvetica-Bold').fontSize(10)
        .text('GST TAX INVOICE', bannerX, curY + 7, { width: 134, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor(theme.badgeText)
        .text('ORIGINAL FOR RECIPIENT', bannerX, curY + 20, { width: 134, align: 'center' })
        .text('(Intra-State Supply)', bannerX, curY + 28, { width: 134, align: 'center' });

      curY += 46;

      // Divider line
      doc.strokeColor(theme.border).lineWidth(1).moveTo(36, curY).lineTo(559, curY).stroke();
      curY += 8;

      // --- INVOICE & CUSTOMER METADATA (2-Column Card) ---
      const metaCardTop = curY;
      const cardHeight = 50;

      // Left Box: Invoice Info
      doc.roundedRect(36, metaCardTop, 255, cardHeight, 4).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(36, metaCardTop, 255, cardHeight, 4).stroke();

      const billDate = new Date(bill.finalized_at || bill.created_at || Date.now()).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8);
      doc.text('Invoice Number: ', 44, metaCardTop + 7, { continued: true })
        .font('Helvetica').fillColor(theme.dark).text(bill.bill_number);

      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('Date & Time: ', 44, metaCardTop + 18, { continued: true })
        .font('Helvetica').fillColor('#334155').text(billDate);

      const payMode = (bill.payment_mode || 'CASH').toUpperCase();
      const payRef = bill.payment_ref ? ` (Ref: ${bill.payment_ref})` : '';
      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('Payment Mode: ', 44, metaCardTop + 29, { continued: true })
        .font('Helvetica').fillColor(theme.primary).text(`${payMode}${payRef}`);

      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('GSTIN: ', 44, metaCardTop + 40, { continued: true })
        .font('Helvetica').fillColor('#334155').text(shopGstin);

      // Right Box: Customer Info
      doc.roundedRect(304, metaCardTop, 255, cardHeight, 4).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(304, metaCardTop, 255, cardHeight, 4).stroke();

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8)
        .text('Billed To Customer: ', 312, metaCardTop + 7, { continued: true })
        .font('Helvetica').fillColor(theme.dark).text(bill.customer_name || 'Walk-in Retail Customer');

      const phoneText = bill.customer_phone || 'Unregistered / Counter Sale';
      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('Contact Phone: ', 312, metaCardTop + 18, { continued: true })
        .font('Helvetica').fillColor('#334155').text(phoneText);

      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('Place of Supply: ', 312, metaCardTop + 29, { continued: true })
        .font('Helvetica').fillColor('#334155').text(`${shopState} (State Code 29)`);

      doc.fillColor('#0F172A').font('Helvetica-Bold')
        .text('Reverse Charge: ', 312, metaCardTop + 40, { continued: true })
        .font('Helvetica').fillColor('#334155').text('No (Regular Taxable Supply)');

      curY = metaCardTop + cardHeight + 10;

      // --- TABLE HEADER ---
      const tableTop = curY;
      doc.rect(36, tableTop, 523, 20).fill(theme.tableHeader);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);

      const col = {
        sno: 40,
        desc: 62,
        hsn: 215,
        qty: 260,
        rate: 308,
        taxable: 352,
        cgst: 408,
        sgst: 458,
        total: 512
      };

      doc.text('S.N', col.sno, tableTop + 6);
      doc.text('Item Description', col.desc, tableTop + 6);
      doc.text('HSN', col.hsn, tableTop + 6);
      doc.text('Qty / Unit', col.qty, tableTop + 6);
      doc.text('Rate', col.rate, tableTop + 6);
      doc.text('Taxable', col.taxable, tableTop + 6);
      doc.text('CGST', col.cgst, tableTop + 6);
      doc.text('SGST', col.sgst, tableTop + 6);
      doc.text('Total (Rs)', col.total, tableTop + 6);

      let currentY = tableTop + 23;
      doc.font('Helvetica').fontSize(7.5);

      // --- TABLE ROWS ---
      items.forEach((item, index) => {
        if (currentY > 670) {
          doc.addPage();
          drawWatermark();
          doc.rect(0, 0, 595.28, 8).fill(theme.primary);
          currentY = 36;
        }

        const isAlt = index % 2 === 1;
        if (isAlt) {
          doc.rect(36, currentY - 2, 523, 16).fill(theme.tableZebra);
        }

        doc.fillColor('#334155');
        doc.text(String(index + 1), col.sno, currentY);
        doc.text(item.product_name.substring(0, 32), col.desc, currentY, { width: 150 });
        doc.text(item.hsn_code || '1901', col.hsn, currentY);
        doc.text(`${item.qty} ${item.unit || ''}`, col.qty, currentY);
        doc.text(Number(item.unit_price).toFixed(2), col.rate, currentY);
        doc.text(Number(item.taxable_value).toFixed(2), col.taxable, currentY);
        doc.text(`${item.cgst_rate}%: ${Number(item.cgst_amount).toFixed(2)}`, col.cgst, currentY);
        doc.text(`${item.sgst_rate}%: ${Number(item.sgst_amount).toFixed(2)}`, col.sgst, currentY);
        doc.font('Helvetica-Bold').fillColor(theme.dark)
          .text(Number(item.line_total).toFixed(2), col.total, currentY);
        doc.font('Helvetica');

        currentY += 16;
      });

      // Divider below items
      currentY = Math.max(currentY, doc.y + 4);
      doc.strokeColor(theme.border).lineWidth(1).moveTo(36, currentY).lineTo(559, currentY).stroke();
      currentY += 8;

      // --- TOTALS & DYNAMIC UPI QR CODE SECTION ---
      const blockTop = currentY;

      // Left Column: UPI QR Code & Scan to Pay
      if (qrCodeBuffer) {
        doc.roundedRect(36, blockTop, 190, 85, 4).fill('#F8FAFC');
        doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(36, blockTop, 190, 85, 4).stroke();

        // Embed QR Code
        doc.image(qrCodeBuffer, 44, blockTop + 6, { width: 72, height: 72 });

        // Scan Instructions
        doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.dark)
          .text('Instant UPI Payment', 122, blockTop + 14);
        doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
          .text('Scan via PhonePe,', 122, blockTop + 27)
          .text('Google Pay, Paytm,', 122, blockTop + 36)
          .text('or BHIM app to pay.', 122, blockTop + 45);

        doc.font('Helvetica-Oblique').fontSize(6).fillColor(theme.primary)
          .text(`VPA: ${upiId}`, 122, blockTop + 60, { width: 95 });
      }

      // Middle Column: GST Slab Breakup Box
      const slabLeft = qrCodeBuffer ? 236 : 36;
      const slabWidth = qrCodeBuffer ? 120 : 190;
      doc.roundedRect(slabLeft, blockTop, slabWidth, 85, 4).fill('#F8FAFC');
      doc.strokeColor('#E2E8F0').lineWidth(0.5).roundedRect(slabLeft, blockTop, slabWidth, 85, 4).stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(theme.dark)
        .text('GST Rate Summary', slabLeft + 8, blockTop + 7);

      const slabs = {};
      items.forEach(i => {
        const slab = i.gst_slab || 0;
        if (!slabs[slab]) slabs[slab] = { taxable: 0, tax: 0 };
        slabs[slab].taxable += Number(i.taxable_value);
        slabs[slab].tax += Number(i.cgst_amount) + Number(i.sgst_amount);
      });

      let slabY = blockTop + 20;
      doc.font('Helvetica').fontSize(6.5).fillColor('#475569');
      Object.keys(slabs).forEach(slab => {
        const s = slabs[slab];
        doc.text(`${slab}% Slab: ₹${s.taxable.toFixed(1)} (Tax: ₹${s.tax.toFixed(1)})`, slabLeft + 8, slabY);
        slabY += 11;
      });

      // Right Column: Summary & Grand Total
      const summaryLeft = 368;
      doc.fontSize(8).fillColor('#334155');

      let sumY = blockTop + 2;
      doc.text('Total Taxable Value:', summaryLeft, sumY);
      doc.text(`₹${Number(bill.subtotal).toFixed(2)}`, 490, sumY, { align: 'right' });
      sumY += 13;

      doc.text('Total CGST (Intra-State):', summaryLeft, sumY);
      doc.text(`₹${Number(bill.cgst_amount).toFixed(2)}`, 490, sumY, { align: 'right' });
      sumY += 13;

      doc.text('Total SGST (Intra-State):', summaryLeft, sumY);
      doc.text(`₹${Number(bill.sgst_amount).toFixed(2)}`, 490, sumY, { align: 'right' });
      sumY += 13;

      if (bill.round_off) {
        doc.text('Round Off:', summaryLeft, sumY);
        doc.text(`₹${Number(bill.round_off).toFixed(2)}`, 490, sumY, { align: 'right' });
        sumY += 13;
      }

      // Grand Total Highlight Banner
      doc.roundedRect(summaryLeft - 4, sumY, 195, 24, 4).fill(theme.totalBox);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
      doc.text('GRAND TOTAL:', summaryLeft + 4, sumY + 7);
      doc.text(`₹${Number(bill.total_amount).toFixed(2)}`, 490, sumY + 7, { align: 'right' });

      // --- FOOTER SECTION ---
      const footerY = 760;
      doc.strokeColor(theme.border).lineWidth(0.5).moveTo(36, footerY).lineTo(559, footerY).stroke();

      doc.fontSize(6.5).font('Helvetica').fillColor('#64748B')
        .text(settings.invoice_footer_note || 'Thank you for shopping with us! Please visit again.', 36, footerY + 6)
        .text('Declaration: Computer-generated GST tax invoice. No signature required.', 36, footerY + 16)
        .text('Subject to Bengaluru jurisdiction. Returns accepted within 48 hours with original bill.', 36, footerY + 25);

      // Authorized Signatory Stamp Box
      doc.roundedRect(425, footerY + 4, 134, 40, 2).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor(theme.dark)
        .text(`For ${shopName}`, 425, footerY + 7, { width: 134, align: 'center' });
      doc.font('Helvetica-Oblique').fontSize(6).fillColor('#94A3B8')
        .text('(Authorized Signatory)', 425, footerY + 30, { width: 134, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
