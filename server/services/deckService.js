import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));
const LOGO_PNG = path.join(dir, '..', 'assets', 'brand-logo.png');
const LOGO_JPG = path.join(dir, '..', 'assets', 'brand-logo.jpg');
const LOGO_PATH = fs.existsSync(LOGO_PNG) ? LOGO_PNG : LOGO_JPG;

/**
 * Generate a professional business-analysis PowerPoint (.pptx) deck
 * with real charts and insights based on live store data.
 */
export async function generateAnalysisDeck(reportData, settings = {}) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  const shopName = settings.shop_name || 'Nebula Supermarket';
  const shopTagline = settings.shop_tagline || 'Daily Provisions • Honest Measures • Lasting Trust';

  // --- SLIDE 1: Title Slide ---
  const slide1 = pptx.addSlide();
  slide1.background = { color: '0F172A' }; // Deep Midnight Indigo

  if (fs.existsSync(LOGO_PATH)) {
    try {
      slide1.addImage({ path: LOGO_PATH, x: 10.2, y: 1.4, w: 1.8, h: 1.8 });
    } catch (_) {}
  }

  slide1.addText(shopName.toUpperCase(), {
    x: 1.0,
    y: 1.6,
    w: 8.8,
    fontSize: 28,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial'
  });

  slide1.addText(shopTagline, {
    x: 1.0,
    y: 2.2,
    w: 11.3,
    fontSize: 13,
    italic: true,
    color: 'D97706', // Kirana Brass Gold
    fontFace: 'Arial'
  });

  slide1.addText('STORE OPERATIONS & WEEKLY SALES ANALYSIS DECK', {
    x: 1.0,
    y: 2.7,
    w: 11.3,
    fontSize: 16,
    bold: true,
    color: '94A3B8',
    fontFace: 'Arial'
  });

  slide1.addText(`Generated on: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}\nIntra-State GST Compliant Retail Intelligence • Munimji Operations Engine`, {
    x: 1.0,
    y: 3.6,
    w: 11.3,
    fontSize: 11,
    color: '64748B',
    fontFace: 'Arial'
  });

  // --- SLIDE 2: Sales Performance & Revenue ---
  const slide2 = pptx.addSlide();
  slide2.addText('Daily Sales Revenue & Tax Performance', {
    x: 0.8,
    y: 0.5,
    w: 11.5,
    fontSize: 20,
    bold: true,
    color: '0F172A'
  });

  const salesTrend = reportData.salesTrend || [];
  if (salesTrend.length > 0) {
    const chartLabels = salesTrend.map(s => s.sale_date);
    const chartSales = salesTrend.map(s => s.total_sales);
    const chartGst = salesTrend.map(s => s.total_gst);

    const chartData = [
      { name: 'Gross Sales (INR)', labels: chartLabels, values: chartSales },
      { name: 'GST Tax (INR)', labels: chartLabels, values: chartGst }
    ];

    slide2.addChart(pptx.ChartType.bar, chartData, {
      x: 0.8,
      y: 1.3,
      w: 11.5,
      h: 4.8,
      showLegend: true,
      legendPos: 't',
      barDir: 'col',
      chartColors: ['D97706', '0D9488']
    });
  } else {
    slide2.addText('No transactions recorded during this timeframe.', {
      x: 1.0,
      y: 2.5,
      fontSize: 14,
      color: '64748B'
    });
  }

  // --- SLIDE 3: Top Selling SKUs ---
  const slide3 = pptx.addSlide();
  slide3.addText('Top-Selling Products by Revenue', {
    x: 0.8,
    y: 0.5,
    w: 11.5,
    fontSize: 20,
    bold: true,
    color: '0F172A'
  });

  const topProducts = (reportData.topProducts || []).slice(0, 6);
  if (topProducts.length > 0) {
    const prodLabels = topProducts.map(p => p.product_name.substring(0, 22));
    const prodRevenues = topProducts.map(p => p.total_revenue);

    const prodChartData = [
      { name: 'Revenue (INR)', labels: prodLabels, values: prodRevenues }
    ];

    slide3.addChart(pptx.ChartType.bar, prodChartData, {
      x: 0.8,
      y: 1.3,
      w: 11.5,
      h: 4.8,
      barDir: 'bar', // Horizontal bar
      chartColors: ['D97706']
    });
  } else {
    slide3.addText('Catalog sales data will appear as orders are cut.', {
      x: 1.0,
      y: 2.5,
      fontSize: 14,
      color: '64748B'
    });
  }

  // --- SLIDE 4: Inventory & Stock Health ---
  const slide4 = pptx.addSlide();
  slide4.addText('Inventory Valuation & Stock Health Overview', {
    x: 0.8,
    y: 0.5,
    w: 11.5,
    fontSize: 20,
    bold: true,
    color: '0F172A'
  });

  const health = reportData.stockHealth || {};
  const tableRows = [
    [
      { text: 'Metric', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'Value', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'Store Insight', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } }
    ],
    ['Total Catalog SKUs', String(health.total_skus || 0), 'Managed active catalog products'],
    ['Well-Stocked SKUs', String(health.healthy_stock || 0), 'Above minimum safety reorder thresholds'],
    ['Low Stock / Reorder Needed', String(health.low_stock || 0), 'Approaching stockout threshold'],
    ['Out of Stock SKUs', String(health.out_of_stock || 0), 'Immediate purchase order replenishment required'],
    ['Total Inventory Cost Basis', `INR ${health.total_inventory_cost_value || 0}`, 'Total working capital invested in stock'],
    ['Total Retail MRP Realization', `INR ${health.total_inventory_retail_value || 0}`, 'Gross revenue potential upon full sale']
  ];

  slide4.addTable(tableRows, {
    x: 0.8,
    y: 1.4,
    w: 11.5,
    rowH: 0.55,
    fontSize: 11,
    border: { pt: 1, color: 'E2E8F0' }
  });

  // --- SLIDE 5: GST Compliance Summary ---
  const slide5 = pptx.addSlide();
  slide5.addText('GST Tax Collection by Slab (Intra-State CGST + SGST)', {
    x: 0.8,
    y: 0.5,
    w: 11.5,
    fontSize: 20,
    bold: true,
    color: '0F172A'
  });

  const gstBreakup = reportData.gstBreakup || [];
  const gstRows = [
    [
      { text: 'GST Slab', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'Taxable Turnover', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'CGST (50%)', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'SGST (50%)', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
      { text: 'Total Tax', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } }
    ]
  ];

  if (gstBreakup.length === 0) {
    gstRows.push(['All Slabs', 'INR 0.00', 'INR 0.00', 'INR 0.00', 'INR 0.00']);
  } else {
    gstBreakup.forEach(g => {
      gstRows.push([
        `${g.gst_slab}% Slab`,
        `INR ${g.taxable_value.toFixed(2)}`,
        `INR ${g.cgst_collected.toFixed(2)}`,
        `INR ${g.sgst_collected.toFixed(2)}`,
        `INR ${g.total_gst.toFixed(2)}`
      ]);
    });
  }

  slide5.addTable(gstRows, {
    x: 0.8,
    y: 1.4,
    w: 11.5,
    rowH: 0.6,
    fontSize: 11,
    border: { pt: 1, color: 'E2E8F0' }
  });

  // Return generated buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer;
}
