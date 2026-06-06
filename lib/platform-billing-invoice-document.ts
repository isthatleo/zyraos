export type PlatformBillingInvoiceDocument = {
  id?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  exchangeRateDate: string | null;
  exchangeRateProvider: string;
  exchangeRateStale?: boolean;
  conversionAvailable?: boolean;
  status: string;
  age?: string;
  daysToDue?: number | null;
  issueDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  description: string;
  notes: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PlatformBillingIssuer = {
  name: string;
  displayName?: string;
  logoUrl?: string | null;
  schoolSealUrl?: string | null;
  reportCardWatermarkUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  motto?: string;
  letterhead?: string;
  slug?: string;
  type?: string;
  status?: string;
  currencyCode?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTimestamp(value = new Date()) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeCurrencyFormatter(currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 });
  } catch {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
  }
}

function absoluteAssetUrl(value?: string | null) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (typeof window === "undefined") return value;
  return new URL(value, window.location.origin).toString();
}

function printWhenReady(printWindow: Window) {
  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  const images = Array.from(printWindow.document.images);
  if (!images.length) {
    window.setTimeout(runPrint, 250);
    return;
  }

  let remaining = images.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) window.setTimeout(runPrint, 200);
  };

  for (const image of images) {
    if (image.complete) {
      done();
    } else {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    }
  }

  window.setTimeout(runPrint, 1800);
}

export function buildPlatformBillingInvoiceHtml(invoice: PlatformBillingInvoiceDocument, issuer: PlatformBillingIssuer) {
  const money = safeCurrencyFormatter(invoice.currency);
  const original = safeCurrencyFormatter(invoice.originalCurrency);
  const platformName = issuer.displayName || issuer.name || "Roxan Education System";
  const primaryColor = issuer.primaryColor || "#f97316";
  const secondaryColor = issuer.secondaryColor || "#111827";
  const logoUrl = absoluteAssetUrl(issuer.logoUrl || issuer.schoolSealUrl);
  const watermarkUrl = absoluteAssetUrl(issuer.reportCardWatermarkUrl || issuer.schoolSealUrl || issuer.logoUrl);
  const contactItems = [issuer.address, issuer.phone, issuer.email, issuer.website].filter(Boolean);
  const amountDue = invoice.status === "paid" || invoice.status === "void" ? 0 : invoice.amount;
  const conversionNote = invoice.conversionAvailable === false
    ? "Currency conversion was unavailable when this invoice was generated."
    : `Converted from ${escapeHtml(invoice.originalCurrency)} using ${escapeHtml(invoice.exchangeRateProvider || "configured exchange rates")}.`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(invoice.invoiceNumber)} - Platform Invoice</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e9eef5; color: #111827; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    .print-actions { position: fixed; top: 20px; right: 20px; z-index: 10; display: flex; gap: 8px; }
    .print-actions button { border: 0; border-radius: 999px; background: ${primaryColor}; color: #fff; padding: 10px 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 30px rgba(15, 23, 42, .18); }
    .sheet { position: relative; width: 210mm; min-height: 297mm; margin: 18px auto; overflow: hidden; background: #fff; box-shadow: 0 24px 80px rgba(15, 23, 42, .16); }
    .topbar { height: 7px; background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}); }
    .page { position: relative; z-index: 1; padding: 12mm 13mm 18mm; }
    .watermark { position: absolute; inset: 36% 22%; z-index: 0; opacity: .045; pointer-events: none; }
    .watermark img { width: 100%; height: 100%; object-fit: contain; }
    .letterhead { display: grid; grid-template-columns: 1fr auto; gap: 22px; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
    .brand { display: flex; gap: 15px; align-items: center; min-width: 0; }
    .brand img, .brandmark { width: 72px; height: 72px; border-radius: 18px; border: 1px solid #d8e0eb; background: #fff; object-fit: contain; padding: 7px; }
    .brandmark { display: flex; align-items: center; justify-content: center; padding: 0; background: ${primaryColor}; color: #fff; font-size: 23px; font-weight: 900; letter-spacing: .04em; }
    h1, h2, h3, p { margin: 0; }
    .brand h1 { color: ${primaryColor}; font-size: 26px; line-height: 1.07; letter-spacing: -.03em; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.45; }
    .brand .muted { margin-top: 6px; max-width: 450px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { margin-top: 7px; color: #0f172a; font-size: 28px; letter-spacing: .08em; }
    .invoice-title .number { margin-top: 4px; color: #475569; font-size: 12.5px; font-weight: 700; }
    .badge { display: inline-flex; align-items: center; border: 1px solid ${primaryColor}40; border-radius: 999px; background: ${primaryColor}16; color: ${primaryColor}; padding: 6px 11px; font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .section { margin-top: 15px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .box { border: 1px solid #dbe3ef; border-radius: 15px; background: #f8fafc; padding: 12px; }
    .box.white { background: #fff; }
    .box h3, .label { margin-bottom: 6px; color: #64748b; font-size: 10.5px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
    .box strong { color: #111827; }
    .amount { margin-top: 3px; color: #0f172a; font-size: 25px; font-weight: 950; letter-spacing: -.04em; }
    .small { color: #64748b; font-size: 11.5px; line-height: 1.5; }
    table { width: 100%; margin-top: 8px; border: 1px solid #dbe3ef; border-collapse: separate; border-spacing: 0; border-radius: 14px; overflow: hidden; }
    th, td { padding: 10px 11px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 11.5px; vertical-align: top; }
    th { background: #111827; color: #fff; font-size: 10px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    .right { text-align: right; }
    .totals { width: 340px; max-width: 100%; margin-top: 11px; margin-left: auto; border: 1px solid #dbe3ef; border-radius: 15px; overflow: hidden; background: #fff; }
    .totals div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 11px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .totals div:last-child { border-bottom: 0; background: ${primaryColor}14; color: ${primaryColor}; font-weight: 950; }
    .notes { border-left: 3px solid ${primaryColor}; border-radius: 14px; background: #f8fafc; padding: 10px 12px; color: #475569; font-size: 11.5px; line-height: 1.5; }
    .payment-box { display: grid; grid-template-columns: 1.05fr .95fr; gap: 11px; }
    footer { position: absolute; left: 13mm; right: 13mm; bottom: 8mm; display: flex; justify-content: space-between; gap: 14px; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #64748b; font-size: 10px; line-height: 1.35; }
    @media print {
      body { background: #fff; }
      .print-actions { display: none; }
      .sheet { width: auto; min-height: 277mm; margin: 0; box-shadow: none; page-break-after: avoid; }
      .page { padding: 0 0 14mm; }
      .topbar { margin: -10mm -10mm 8mm; }
      .section, .box, table, .totals, .notes { break-inside: avoid; page-break-inside: avoid; }
      footer { left: 0; right: 0; bottom: 0; }
    }
  </style>
</head>
<body>
  <div class="print-actions"><button type="button" onclick="window.print()">Print invoice</button></div>
  <main class="sheet">
    <div class="topbar"></div>
    ${watermarkUrl ? `<div class="watermark"><img src="${watermarkUrl}" alt=""></div>` : ""}
    <section class="page">
      <header class="letterhead">
        <div class="brand">
          ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(platformName)} logo">` : `<div class="brandmark">RX</div>`}
          <div>
            <h1>${escapeHtml(platformName)}</h1>
            <p class="muted">${escapeHtml(issuer.letterhead || issuer.motto || "Roxan Education System platform billing")}</p>
            ${contactItems.length ? `<p class="muted">${contactItems.map(escapeHtml).join(" &bull; ")}</p>` : ""}
          </div>
        </div>
        <div class="invoice-title">
          <span class="badge">${escapeHtml(invoice.status.replace(/_/g, " "))}</span>
          <h2>INVOICE</h2>
          <p class="number">${escapeHtml(invoice.invoiceNumber)}</p>
        </div>
      </header>

      <section class="section grid">
        <div class="box">
          <h3>Issued by</h3>
          <strong>${escapeHtml(platformName)}</strong>
          <p class="small">${escapeHtml(issuer.email || "Platform billing office")}${issuer.phone ? `<br>${escapeHtml(issuer.phone)}` : ""}</p>
        </div>
        <div class="box">
          <h3>Bill to</h3>
          <strong>${escapeHtml(issuer.name)}</strong>
          <p class="small">Tenant platform subscription account${issuer.slug ? `<br>Tenant slug: ${escapeHtml(issuer.slug)}` : ""}</p>
        </div>
      </section>

      <section class="section metrics">
        <div class="box white">
          <p class="label">Tenant amount</p>
          <p class="amount">${money.format(invoice.amount)}</p>
          <p class="small">${escapeHtml(invoice.currency)} invoice value</p>
        </div>
        <div class="box white">
          <p class="label">Platform amount</p>
          <p class="amount">${original.format(invoice.originalAmount)}</p>
          <p class="small">${escapeHtml(invoice.originalCurrency)} master invoice value</p>
        </div>
        <div class="box white">
          <p class="label">Amount due</p>
          <p class="amount">${money.format(amountDue)}</p>
          <p class="small">${invoice.status === "paid" ? "Invoice has been settled" : "Outstanding balance"}</p>
        </div>
      </section>

      <section class="section grid">
        <div class="box">
          <h3>Invoice dates</h3>
          <p class="small"><strong>Issued:</strong> ${formatDate(invoice.issueDate)}<br><strong>Due:</strong> ${formatDate(invoice.dueDate)}<br><strong>Paid:</strong> ${formatDate(invoice.paidDate)}</p>
        </div>
        <div class="box">
          <h3>Currency conversion</h3>
          <p class="small"><strong>Rate:</strong> ${escapeHtml(invoice.exchangeRate)}<br><strong>Provider:</strong> ${escapeHtml(invoice.exchangeRateProvider || "Not set")}<br><strong>Rate date:</strong> ${formatDate(invoice.exchangeRateDate)}${invoice.exchangeRateStale ? "<br><strong>Warning:</strong> rate marked stale" : ""}</p>
        </div>
      </section>

      <section class="section">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Status</th>
              <th>Currency</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(invoice.description || "Roxan platform subscription")}</strong><br><span class="small">${conversionNote}</span></td>
              <td>${escapeHtml(invoice.status.replace(/_/g, " "))}</td>
              <td>${escapeHtml(invoice.currency)}</td>
              <td class="right">${money.format(invoice.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><strong>${money.format(invoice.amount)}</strong></div>
          <div><span>Paid / credited</span><strong>${money.format(invoice.amount - amountDue)}</strong></div>
          <div><span>Total due</span><strong>${money.format(amountDue)}</strong></div>
        </div>
      </section>

      <section class="section payment-box">
        <div class="notes"><strong>Payment instructions.</strong> Use the platform billing reference ${escapeHtml(invoice.invoiceNumber)} when making payment. Gateway receipts and manual payment confirmations should match this invoice number.</div>
        <div class="notes"><strong>Notes.</strong> ${escapeHtml(invoice.notes || "This invoice is issued by the Roxan platform billing office. Keep it for accounting and reconciliation records.")}</div>
      </section>

      <footer>
        <span>Generated by ${escapeHtml(platformName)} for platform billing records.</span>
        <span>${escapeHtml(formatTimestamp())}</span>
      </footer>
    </section>
  </main>
</body>
</html>`;
}

export function openPlatformBillingInvoiceDocument(invoice: PlatformBillingInvoiceDocument, issuer: PlatformBillingIssuer, print = false) {
  const printWindow = window.open("", "_blank", "width=980,height=1200");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildPlatformBillingInvoiceHtml(invoice, issuer));
  printWindow.document.close();

  if (print) {
    printWhenReady(printWindow);
  } else {
    printWindow.focus();
  }

  return true;
}

export function downloadPlatformBillingInvoiceHtml(invoice: PlatformBillingInvoiceDocument, issuer: PlatformBillingIssuer) {
  const blob = new Blob([buildPlatformBillingInvoiceHtml(invoice, issuer)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.invoiceNumber || "platform-invoice"}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
