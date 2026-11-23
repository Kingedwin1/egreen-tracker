/* Egom Business: invoices, quotes, payments, customers and reports.
   Loaded by index.html before the main app. The main app hands over shared helpers on window.EGOM
   and calls EgomBusiness.render() whenever the Business side is showing. */
(function () {
  "use strict";
  const E = () => window.EGOM;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const NGN2 = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const K = (kobo) => NGN.format(Math.round((Number(kobo) || 0) / 100));
  const K2 = (kobo) => NGN2.format((Number(kobo) || 0) / 100);
  const shortK = (kobo) => { const n = (Number(kobo) || 0) / 100, a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e6) return s + "₦" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "m";
    if (a >= 1e3) return s + "₦" + Math.round(a / 1e3) + "k"; return s + "₦" + Math.round(a); };
  // "2.5k", "1,200,000", "45000.50" → kobo
  const toKobo = (v) => { const m = String(v ?? "").toLowerCase().replace(/[₦,\s]/g, "").match(/^(\d+(?:\.\d+)?)(k|m)?$/);
    if (!m) return 0; return Math.round(Number(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1) * 100); };
  const nairaInput = (kobo) => (kobo ? String(Math.round(kobo) / 100) : "");
  const pad2 = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
  const niceDate = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: s.slice(0, 4) === today().slice(0, 4) ? undefined : "numeric" }) : "";
  const icon = (n) => (E() && E().icon ? E().icon(n) : "");
  const svg = (d, w = 20) => `<svg class="ico" width="${w}" height="${w}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const P = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    copy: "M9 9h11v11H9z M5 15H4V4h11v1",
    check: "M20 6 9 17l-5-5",
    cart: "M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2 M9 20.5h.01 M17 20.5h.01",
    doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
    docPlus: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 12v6 M9 15h6",
    quote: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5",
    people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    chart: "M3 3v18h18 M7 15l4-4 3 3 6-6",
    down: "M12 5v14 M5 12l7 7 7-7", up: "M12 19V5 M5 12l7-7 7 7",
    bank: "M3 21h18 M3 10h18 M5 6l7-3 7 3 M4 10v11 M20 10v11 M8 14v3 M12 14v3 M16 14v3",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 7v5l3 2",
    wa: "M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20.5l1.7-5.3A8.4 8.4 0 1 1 21 11.5z",
    pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 18v-6 M9 15l3 3 3-3",
    pen: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    plus: "M12 5v14M5 12h14", minus: "M5 12h14", x: "M18 6 6 18M6 6l12 12", back: "m15 18-6-6 6-6", check: "M20 6 9 17l-5-5",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
    box: "M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6M9 12h6",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6",
    userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M16 11h6",
    trash: "M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14",
    grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01",
    chev: "m9 18 6-6-6-6",
  };

  /* ---------------- state ---------------- */
  const S = {
    ready: false, loading: null, error: null, bizId: null, biz: null,
    customers: [], items: [], invoices: [], quotes: [], payments: [], allocations: [], vendors: [], purchases: [], vpays: [],
    report: null, reportKey: "", owed: null,
    tab: "home", docMode: "invoices", filter: "all", period: "month", spendBy: "job", custQuery: "",
    active: false, hiddenTabs: [],
  };
  try { const u = JSON.parse(localStorage.getItem("egom.biz.ui") || "{}"); Object.assign(S, { tab: u.tab || "home", docMode: u.docMode || "invoices", period: u.period || "month" }); } catch (e) { /* first visit */ }
  const saveUi = () => { try { localStorage.setItem("egom.biz.ui", JSON.stringify({ tab: S.tab, docMode: S.docMode, period: S.period })); } catch (e) { /* private mode */ } };

  /* ---------------- data ---------------- */
  const sb = () => E().sb;
  async function rpc(name, args) {
    const { data, error } = await sb().rpc(name, args);
    if (error) throw new Error(cleanErr(error.message));
    return data;
  }
  const cleanErr = (m) => String(m || "Something went wrong").replace(/^.*?ERROR:\s*/, "");
  async function rows(q) { const { data, error } = await q; if (error) throw new Error(cleanErr(error.message)); return data || []; }

  async function loadAll() {
    if (!S.bizId) S.bizId = await rpc("biz_ensure_business", { p_name: null });
    const b = S.bizId;
    const [biz, customers, items, invoices, quotes, payments, allocations, vendors, purchases, vpays] = await Promise.all([
      rows(sb().from("businesses").select("*").eq("id", b)),
      rows(sb().from("biz_customers").select("*").eq("business_id", b).order("name")),
      rows(sb().from("biz_items").select("*").eq("business_id", b).eq("active", true).order("name")),
      rows(sb().from("biz_invoices").select("*").eq("business_id", b).order("date", { ascending: false }).order("number", { ascending: false }).limit(2000)),
      rows(sb().from("biz_quotes").select("*").eq("business_id", b).order("date", { ascending: false }).order("number", { ascending: false }).limit(1000)),
      rows(sb().from("biz_payments").select("*").eq("business_id", b).order("date", { ascending: false }).limit(2000)),
      rows(sb().from("biz_allocations").select("*").eq("business_id", b).limit(5000)),
      rows(sb().from("biz_vendors").select("*").eq("business_id", b).order("name")),
      rows(sb().from("biz_purchases").select("*").eq("business_id", b).order("date", { ascending: false }).limit(2000)),
      rows(sb().from("biz_vendor_payments").select("*").eq("business_id", b).order("date", { ascending: false }).limit(5000)),
    ]);
    Object.assign(S, { biz: biz[0], customers, items, invoices, quotes, payments, allocations, vendors, purchases, vpays });
    S.report = null; S.reportKey = "";
    await loadReport();
    S.ready = true;
  }
  function periodRange() {
    const ym = (E() && E().ym) || today().slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const end = (yy, mm) => iso(new Date(yy, mm, 0));
    if (S.tab !== "reports" || S.period === "month") return [ym + "-01", end(y, m)];
    if (S.period === "quarter") { const q0 = Math.floor((m - 1) / 3) * 3 + 1; return [y + "-" + pad2(q0) + "-01", end(y, q0 + 2)]; }
    return [y + "-01-01", y + "-12-31"];
  }
  async function loadReport() {
    const [from, to] = periodRange(), key = from + to;
    if (S.report && S.reportKey === key) return;
    S.report = await rpc("biz_report", { p_business: S.bizId, p_from: from, p_to: to });
    S.reportKey = key;
  }
  async function refresh(msg) {
    try { await loadAll(); } catch (e) { E().toast(e.message); }
    if (S.active) draw();
    if (msg) E().toast(msg);
  }

  /* ---------------- helpers on records ---------------- */
  const cust = (id) => S.customers.find((c) => c.id === id) || { name: "Customer" };
  const balance = (inv) => Math.max(0, inv.total_kobo - inv.paid_kobo);
  const isOpen = (inv) => inv.status === "sent" || inv.status === "partially_paid";
  const isLate = (inv) => isOpen(inv) && inv.due_date < today();
  function invStatus(inv) {
    if (inv.status === "draft") return ["Draft", "draft"];
    if (inv.status === "void") return ["Void", "void"];
    if (inv.status === "paid") return ["Paid", "paid"];
    if (isLate(inv)) return ["Overdue", "late"];
    if (inv.status === "partially_paid") return ["Part paid", "part"];
    return ["Sent", "sent"];
  }
  function quoteStatus(q) {
    return ({ draft: ["Draft", "draft"], sent: ["Sent", "sent"], accepted: ["Accepted", "paid"], declined: ["Declined", "void"], invoiced: ["Invoiced", "part"] })[q.status] || [q.status, "sent"];
  }
  const pill = ([t, c]) => `<span class="bz-pill ${c}">${esc(t)}</span>`;
  function invSub(inv) {
    if (inv.status === "draft") return "Draft";
    if (inv.status === "void") return "Void";
    if (inv.status === "paid") { const p = lastPaid(inv); return p ? "Paid " + niceDate(p) : "Paid"; }
    const late = daysBetween(inv.due_date, today());
    if (late > 0) return `${late} day${late === 1 ? "" : "s"} late`;
    const left = inv.status === "partially_paid" ? K(balance(inv)) + " left · " : "";
    return left + (late === 0 ? "Due today" : "Due " + niceDate(inv.due_date));
  }
  function lastPaid(inv) {
    const ps = S.allocations.filter((a) => a.invoice_id === inv.id).map((a) => (S.payments.find((p) => p.id === a.payment_id) || {}).date).filter(Boolean).sort();
    return ps[ps.length - 1];
  }
  const waNumber = (phone) => { let d = String(phone || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "234" + d.slice(1); return d.length >= 10 ? d : ""; };
  const shareUrl = (token) => (E().shareBase || location.origin + location.pathname.replace(/[^/]*$/, "")) + "?doc=" + token;
  // WhatsApp: open a blank tab at the tap (phones block tabs opened after a wait), then point it at the chat.
  const waStart = () => (E().preview ? null : window.open("about:blank", "_blank"));
  function waGo(w, phone, text) {
    if (E().preview) return showWaPreview(phone, text);
    const url = "https://wa.me/" + waNumber(phone) + "?text=" + encodeURIComponent(text);
    if (w) w.location = url; else window.open(url, "_blank", "noopener");
  }
  const waStop = (w) => { if (w) w.close(); };
  function openWhatsApp(phone, text) { waGo(waStart(), phone, text); }
  function showWaPreview(phone, text) {
    setTimeout(() => {
      const close = sheet("bzw", "WhatsApp message", `<p class="fine">In the real app this opens WhatsApp${waNumber(phone) ? " to +" + waNumber(phone) : ""} with this message ready to send:</p>
        <div class="bz-wa">${esc(text).replace(/\n/g, "<br>")}</div><button class="bz-btn primary wide big" id="bzwOk" type="button">OK</button>`);
      $("bzwOk").onclick = close;
    }, 50);
  }

  // Same arithmetic as the database, for the live preview only. The database keeps the real totals.
  function totals(doc) {
    const subtotal = (doc.lines || []).reduce((a, l) => a + Math.round((Number(l.quantity) || 0) * (Number(l.rate_kobo) || 0)), 0);
    let discount = doc.discount_type === "percent" ? Math.round(subtotal * (Number(doc.discount_value) || 0) / 100)
      : doc.discount_type === "flat" ? Math.round(Number(doc.discount_value) || 0) : 0;
    discount = Math.max(0, Math.min(discount, subtotal));
    const shipping = Math.max(0, Number(doc.shipping_kobo) || 0);
    return { subtotal, discount, shipping, total: subtotal - discount + shipping + (Number(doc.adjustment_kobo) || 0) };
  }

  /* ---------------- frame: tabs and the Add button ---------------- */
  const TABS = [["home", "Home", P.home], ["expenses", "Expenses", P.receipt], ["docs", "Invoices", P.doc], ["quotes", "Quotes", P.quote], ["more", "More", P.grid]];
  // Pages reached from More keep the More tab lit
  const tabOf = (t) => (["customers", "items", "reports", "banks", "more", "purchases", "vendors"].includes(t) ? "more" : t);
  function enter() {
    if (S.active) return;
    S.active = true;
    const bar = $("tabbar");
    S.hiddenTabs = [...bar.querySelectorAll("button[data-t]")];
    S.hiddenTabs.forEach((b) => b.classList.add("hidden"));
    TABS.forEach(([k, label, d]) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.bt = k; b.className = "bz-tab";
      b.innerHTML = `<svg class="ico g" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>${label}`;
      b.onclick = () => { if (S.tab === k) return; S.tab = k; S.filter = "all"; saveUi(); draw(); window.scrollTo(0, 0); };
      bar.appendChild(b);
    });
    $("addBtn").addEventListener("click", onAdd, true);
    document.body.classList.add("bz-on");
  }
  function leave() {
    if (!S.active) return;
    S.active = false;
    document.querySelectorAll("#tabbar .bz-tab").forEach((b) => b.remove());
    S.hiddenTabs.forEach((b) => b.classList.remove("hidden"));
    $("addBtn").removeEventListener("click", onAdd, true);
    document.body.classList.remove("bz-on");
  }
  function onAdd(e) { e.stopImmediatePropagation(); e.preventDefault(); openAddSheet(); }

  /* ---------------- main entry ---------------- */
  function render() {
    injectCss(); enter();
    document.querySelectorAll("#tabbar .bz-tab").forEach((b) => b.classList.toggle("on", b.dataset.bt === tabOf(S.tab)));
    if (!S.ready) {
      $("view").innerHTML = `<div class="bz"><div class="bz-empty">${S.error ? esc(S.error) + `<br><button class="bz-btn" id="bzRetry" type="button">Try again</button>` : "Opening your business books…"}</div></div>`;
      if ($("bzRetry")) $("bzRetry").onclick = () => { S.error = null; S.loading = null; render(); };
      if (!S.loading && !S.error) {
        S.loading = loadAll().then(() => { S.loading = null; if (S.active) draw(); })
          .catch((e) => { S.loading = null; S.error = e.message; if (S.active) render(); });
      }
      return;
    }
    // The month picker in the top bar changes the period; fetch the report again when it does.
    const [from, to] = periodRange();
    if (S.reportKey !== from + to) { loadReport().then(() => S.active && draw()).catch((e) => E().toast(e.message)); }
    draw();
  }
  function draw() {
    if (!S.active) return;
    if (!["home", "expenses", "docs", "quotes", "more", "customers", "items", "reports", "banks", "purchases", "vendors"].includes(S.tab)) S.tab = "home";
    document.querySelectorAll("#tabbar .bz-tab").forEach((b) => b.classList.toggle("on", b.dataset.bt === tabOf(S.tab)));
    const v = $("view");
    // Expenses: Egom's own calendar and records (receipts, WhatsApp, statements), for the business ledger
    if (S.tab === "expenses") { v.dataset.tab = "tx"; return E().renderExpenses(); }
    // Banks: Egom's own accounts page (balances, moves between accounts), for the business ledger
    if (S.tab === "banks") {
      v.dataset.tab = "accounts"; E().renderBanks();
      v.insertAdjacentHTML("afterbegin", `<button class="bz-back" id="bzBack" type="button" style="margin-bottom:8px">${svg(P.back, 18)} More</button>`);
      $("bzBack").onclick = () => { S.tab = "more"; saveUi(); draw(); window.scrollTo(0, 0); };
      return;
    }
    v.dataset.tab = "biz-" + S.tab;
    S.docMode = S.tab === "quotes" ? "quotes" : "invoices";
    const sub = ["customers", "items", "reports", "purchases", "vendors"].includes(S.tab);
    const backTo = S.tab === "vendors" ? "purchases" : "more";
    v.innerHTML = `<div class="bz">${sub ? `<button class="bz-back" id="bzBack" type="button">${svg(P.back, 18)} ${backTo === "more" ? "More" : "Purchases"}</button>` : ""}${({ home: homeView, docs: docsView, quotes: docsView, more: moreView, customers: customersView, items: itemsView, reports: reportsView, purchases: purchasesView, vendors: vendorsView })[S.tab]()}</div>`;
    if (sub) $("bzBack").onclick = () => { S.tab = backTo; saveUi(); draw(); window.scrollTo(0, 0); };
    ({ home: wireHome, docs: wireDocs, quotes: wireDocs, more: wireMore, customers: wireCustomers, items: wireItems, reports: wireReports, purchases: wirePurchases, vendors: wireVendors })[S.tab]();
  }

  /* ---------------- HOME ---------------- */
  function homeView() {
    const r = S.report || {}, open = S.invoices.filter(isOpen), late = open.filter(isLate);
    const owed = open.reduce((a, i) => a + balance(i), 0), lateAmt = late.reduce((a, i) => a + balance(i), 0);
    const oldest = late.reduce((a, i) => Math.max(a, daysBetween(i.due_date, today())), 0);
    // Money in and out as Egom records it (Got paid, receipts, WhatsApp, vendor payments), so the hero matches the line under it
    const ymNow = (E() && E().ym) || today().slice(0, 7);
    const io = E().monthIO ? E().monthIO(ymNow) : null;
    const mIn = io ? Math.round(io.in * 100) : (r.sales || 0), mOut = io ? Math.round(io.out * 100) : (r.spent || 0);
    const profit = mIn - mOut;
    // Same numbers as the Banks page (naira from the app, shown here in kobo)
    const bs = (E().bankSummary && E().bankSummary()) || { known: 0, names: 0, total: 0, bank: 0, cash: 0 };
    const money = Math.round(bs.total * 100), bank = Math.round(bs.bank * 100), cash = Math.round(bs.cash * 100);
    const neg = !bs.known;
    let prevProfit = null;
    if (io) { const [yy, mm] = ymNow.split("-").map(Number), d = new Date(yy, mm - 2, 1), pym = d.getFullYear() + "-" + pad2(d.getMonth() + 1), pio = E().monthIO(pym); prevProfit = Math.round((pio.in - pio.out) * 100); }
    else { const months = r.months || [], prev = months.length >= 2 ? months[months.length - 2] : null; prevProfit = prev ? prev.in - prev.out : null; }
    const spentOnly = !mIn && mOut > 0;
    const delta = !spentOnly && prevProfit && prevProfit > 0 ? Math.round((profit - prevProfit) / prevProfit * 100) : null;
    return `
      <div class="bz-row bz-head"><span class="bz-row bz-gap bz-grow"><h2>${esc(S.biz.name)}</h2></span><button class="bz-icon" id="bzSettings" type="button" aria-label="Business details">${svg(P.gear)}</button></div>
      <section class="g-hero">
        <div class="gh-top"><div><p class="gl">${spentOnly ? "Spent this month" : profit < 0 ? "Loss this month" : "Profit this month"}</p><p class="gbig">${profit < 0 && !spentOnly ? "−" : ""}${K(Math.abs(profit))}</p></div>
          ${delta !== null ? `<p class="bz-delta ${delta < 0 ? "dn" : ""}">${delta < 0 ? "▼" : "▲"} ${Math.abs(delta)}% vs last month</p>` : ""}</div>
        ${(() => { const sp = E().heroSpark ? E().heroSpark() : ""; return sp ? `<div class="gspark">${sp}</div>` : ""; })()}
        <div class="gh-io"><div><p class="gl">Money in</p><p class="gv" style="color:#C6F432">+${K(mIn)}</p></div><div><p class="gl">Money out</p><p class="gv">−${K(mOut)}</p></div></div>
      </section>
      <div class="bz-grid2">
        <button class="gt solid bz-amber" id="bzOwed" type="button">
          <div class="gtr"><span class="gchip dark">${svg(P.doc, 17)}</span><span class="bz-small">${open.length} invoice${open.length === 1 ? "" : "s"}</span></div>
          <div><p class="gn">Owed to you</p><p class="gamt xl">${K(owed)}</p></div></button>
        <button class="gt" id="bzMoney" type="button">
          <div class="gtr"><span class="gchip" style="background:rgba(95,211,190,.18);color:#5FD3BE">${svg(P.bank, 17)}</span></div>
          <div><p class="gn">Cash and bank</p><p class="gamt xl">${neg ? "—" : (money < 0 ? "−" : "") + K(Math.abs(money))}</p>
          <p class="gs">${neg ? (bs.names ? "Set your balances" : "Add your banks") : `Bank ${shortK(bank)} · Cash ${shortK(cash)}`}</p></div></button>
      </div>
      <div class="bz-quick">
        ${[["qInv", "Invoice", P.docPlus, ""], ["qQuote", "Quote", P.quote, ""], ["qPaid", "Got paid", P.down, "lime"], ["qSpent", "Spent", P.up, ""]]
          .map(([id, l, d, c]) => `<button type="button" id="${id}"><span class="bz-qc ${c}">${svg(d, 22)}</span><span>${l}</span></button>`).join("")}
      </div>
      ${!S.invoices.length && !S.quotes.length ? `<section class="gcard bz-card bz-start"><h3>Start with your first invoice</h3>
        <p class="fine">Add a customer and what you sold. Egom works out the totals, numbers it, and gives you a link to send on WhatsApp.</p>
        <button class="bz-btn primary" id="bzFirst" type="button">New invoice</button></section>` : ""}
      ${homeMore(late, lateAmt, oldest)}`;
  }
  // Under the quick buttons: what needs doing, where the money went, and the latest records
  function homeMore(late, lateAmt, oldest) {
    const todo = [];
    if (late.length) todo.push(["bzLate", "late", P.clock, `${late.length} invoice${late.length === 1 ? " is" : "s are"} late`, `${K(lateAmt)} · oldest ${oldest} day${oldest === 1 ? "" : "s"}`, late.length === 1 ? "Remind" : "See"]);
    const lp = S.purchases.filter(pLate), soon = S.purchases.filter((p) => pOpen(p) && p.due_date && !pLate(p) && daysBetween(today(), p.due_date) <= 7);
    if (lp.length) todo.push(["bzOwe", "late", P.cart, `${lp.length} bill${lp.length === 1 ? "" : "s"} overdue`, `${K(lp.reduce((a, p) => a + pBal(p), 0))} to pay vendors`, "See"]);
    else if (soon.length) todo.push(["bzOwe", "amber", P.cart, `${soon.length} bill${soon.length === 1 ? "" : "s"} due this week`, `${K(soon.reduce((a, p) => a + pBal(p), 0))} to pay vendors`, "See"]);
    else if (owedOut()) todo.push(["bzOwe", "amber", P.cart, `You owe vendors ${K(owedOut())}`, `${S.purchases.filter(pOpen).length} to pay`, "See"]);
    const drafts = S.invoices.filter((i) => i.status === "draft");
    if (drafts.length) todo.push(["bzDrafts", "", P.doc, `${drafts.length} draft invoice${drafts.length === 1 ? "" : "s"} not sent`, `${K(drafts.reduce((a, i) => a + i.total_kobo, 0))} waiting to go out`, "See"]);
    const waitQ = S.quotes.filter((q) => q.status === "sent");
    if (waitQ.length) todo.push(["bzWaitQ", "", P.quote, `${waitQ.length} quote${waitQ.length === 1 ? "" : "s"} waiting for a reply`, `${K(waitQ.reduce((a, q) => a + q.total_kobo, 0))} in all`, "See"]);
    const top = E().topSpend ? E().topSpend(4) : [], topMax = top.length ? top[0].naira : 1;
    const recent = E().recentHTML ? E().recentHTML(6) : "";
    return `<div class="bz-homegrid">
      <section class="gcard bz-card bz-hsec bz-hrecent"><div class="bz-row"><h3>Latest</h3><button class="bz-link" id="bzSeeAll" type="button">See all</button></div>
        ${recent ? `<div class="bz-hlist">${recent}</div>` : `<p class="fine">Nothing recorded yet. Forward a receipt on WhatsApp, or tap Spent or Got paid.</p>`}</section>
      <div class="bz-hside">
        <section class="gcard bz-card bz-hsec"><h3>Needs attention</h3>
          ${todo.length ? todo.map(([id, tone, d, t, sm, btn]) => `<button class="bz-todo ${tone}" id="${id}" type="button"><span class="bz-todo-ic">${svg(d, 17)}</span>
            <span class="bz-grow"><b>${t}</b><small>${sm}</small></span><span class="bz-todo-btn">${btn}</span></button>`).join("")
            : `<p class="fine bz-ok">${svg(P.check, 16)} All caught up. Nothing late, nothing waiting.</p>`}</section>
        <section class="gcard bz-card bz-hsec bz-hspend"><div class="bz-row"><h3>Where the money went</h3><span class="fine" style="margin:0">this month</span></div>
          ${top.length ? top.map((c) => `<div class="bz-catbar"><span class="bz-catic" style="background:${c.color[0]};color:${c.color[1]}">${c.icon}</span>
            <span class="bz-grow"><span class="bz-row"><b>${esc(c.name)}</b><b>${K(Math.round(c.naira * 100))}</b></span><i class="bz-track"><i style="width:${Math.max(4, c.naira / topMax * 100)}%;background:${c.color[1]}"></i></i></span></div>`).join("")
            : `<p class="fine">No spending recorded this month.</p>`}</section>
      </div></div>`;
  }
  function wireHome() {
    $("bzSettings").onclick = openSettings;
    $("bzOwed").onclick = () => { S.tab = "docs"; S.docMode = "invoices"; S.filter = "unpaid"; saveUi(); draw(); };
    $("bzMoney").onclick = () => { S.tab = "banks"; saveUi(); draw(); window.scrollTo(0, 0); };
    if ($("bzOwe")) $("bzOwe").onclick = () => { S.tab = "purchases"; S.filter = S.purchases.some(pLate) ? "late" : "unpaid"; saveUi(); draw(); window.scrollTo(0, 0); };
    if ($("bzDrafts")) $("bzDrafts").onclick = () => { S.tab = "docs"; S.filter = "draft"; saveUi(); draw(); window.scrollTo(0, 0); };
    if ($("bzWaitQ")) $("bzWaitQ").onclick = () => { S.tab = "quotes"; S.filter = "open"; saveUi(); draw(); window.scrollTo(0, 0); };
    if ($("bzSeeAll")) $("bzSeeAll").onclick = () => { S.tab = "expenses"; saveUi(); draw(); window.scrollTo(0, 0); };
    document.querySelectorAll(".bz-hlist .tx").forEach((el) => el.onclick = () => E().openTx && E().openTx(el.dataset.id));
    if ($("bzLate")) $("bzLate").onclick = () => {
      const late = S.invoices.filter(isLate);
      if (late.length === 1) return remind(late[0]);
      S.tab = "docs"; S.docMode = "invoices"; S.filter = "late"; saveUi(); draw();
    };
    $("qInv").onclick = () => openEditor("invoice");
    $("qQuote").onclick = () => openEditor("quote");
    $("qPaid").onclick = () => openPayment();
    $("qSpent").onclick = () => E().openAdd();
    if ($("bzFirst")) $("bzFirst").onclick = () => openEditor("invoice");
  }
  function openMoney() {
    const r = S.report || {}, list = r.money || [];
    const close = sheet("bzm", "Cash and bank", `
      <p class="fine">Balances come from what Egom has recorded. If a number looks wrong, it usually means the starting balance is missing.</p>
      <div class="bz-list">${list.length ? list.map((m) => `<div class="bz-li"><span class="bz-grow"><b>${esc(m.name)}</b><small>${m.kind === "cash" ? "Cash" : "Bank or wallet"}</small></span><b class="${m.kobo < 0 ? "bz-neg" : ""}">${m.kobo < 0 ? "−" : ""}${K(Math.abs(m.kobo))}</b></div>`).join("") : `<p class="fine">Nothing recorded yet.</p>`}</div>
      <h5 class="bz-h5">Set a starting balance</h5>
      <p class="fine">What was in the account on the day you started using Egom for this business.</p>
      <label for="bzsbAcc">Account</label><input id="bzsbAcc" list="bzsbAccL" placeholder="e.g. GTBank, Moniepoint, Cash" autocomplete="off">
      <datalist id="bzsbAccL">${[...new Set([...list.map((m) => m.name), ...accountNames(), "Cash"])].map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <div class="bz-2col"><div><label for="bzsbAmt">Amount</label><div class="bz-naira"><span>₦</span><input id="bzsbAmt" inputmode="decimal" placeholder="0"></div></div>
      <div><label for="bzsbDate">On</label><input id="bzsbDate" type="date" value="${today().slice(0, 7)}-01" max="${today()}"></div></div>
      <button class="bz-btn primary wide" id="bzsbSave" type="button">Save starting balance</button>`);
    $("bzsbSave").onclick = async () => {
      const acc = $("bzsbAcc").value.trim(), amt = toKobo($("bzsbAmt").value.replace(/^-/, "")) * ($("bzsbAmt").value.trim().startsWith("-") ? -1 : 1);
      if (!acc) return E().toast("Type the account");
      busy("bzsbSave", true);
      try {
        await rpc("biz_set_starting_balance", { p_business: S.bizId, p_account: acc, p_amount_kobo: amt, p_date: $("bzsbDate").value || today() });
        close(); await refresh("Starting balance saved");
      } catch (e) { busy("bzsbSave", false); E().toast(e.message); }
    };
  }
  const accountNames = () => { try { return (E().accountNames && E().accountNames()) || []; } catch (e) { return []; } };

  /* ---------------- INVOICES & QUOTES ---------------- */
  function docsView() {
    const inv = S.docMode === "invoices";
    const list = inv ? S.invoices : S.quotes;
    const open = S.invoices.filter(isOpen), late = open.filter(isLate);
    const ym = (E() && E().ym) || today().slice(0, 7);
    const paidMonth = S.payments.filter((p) => p.date.slice(0, 7) === ym).reduce((a, p) => a + p.amount_kobo, 0);
    const openQuotes = S.quotes.filter((q) => q.status === "sent" || q.status === "draft" || q.status === "accepted").length;
    const F = inv ? [["all", "All"], ["unpaid", "Unpaid"], ["late", "Overdue"], ["paid", "Paid"], ["draft", "Drafts"]]
      : [["all", "All"], ["open", "Open"], ["accepted", "Accepted"], ["invoiced", "Invoiced"], ["declined", "Declined"]];
    if (!F.some(([k]) => k === S.filter)) S.filter = "all";
    const shown = list.filter((d) => inv
      ? ({ all: true, unpaid: isOpen(d), late: isLate(d), paid: d.status === "paid", draft: d.status === "draft" })[S.filter]
      : ({ all: true, open: d.status === "draft" || d.status === "sent", accepted: d.status === "accepted", invoiced: d.status === "invoiced", declined: d.status === "declined" })[S.filter]);
    return `
      <div class="bz-row bz-head"><h2>${inv ? "Invoices" : "Quotes"}</h2><button class="bz-btn primary sm" id="bzNewDoc" type="button">${svg(P.plus, 16)} New ${inv ? "invoice" : "quote"}</button></div>
      ${!inv ? `<div class="bz-stats two">
        <div class="gcard"><p>Open</p><b>${openQuotes}</b></div>
        <div class="gcard"><p>Open value</p><b>${shortK(S.quotes.filter((q) => ["draft", "sent", "accepted"].includes(q.status)).reduce((a, q) => a + q.total_kobo, 0))}</b></div></div>` : ""}
      ${inv ? `<div class="bz-stats">
        <div class="gcard"><p>Unpaid</p><b>${shortK(open.reduce((a, i) => a + balance(i), 0))}</b></div>
        <div class="gcard"><p>Overdue</p><b class="${late.length ? "bz-late" : ""}">${shortK(late.reduce((a, i) => a + balance(i), 0))}</b></div>
        <div class="gcard"><p>Paid · ${esc(new Date(ym + "-15").toLocaleDateString("en-GB", { month: "short" }))}</p><b class="${paidMonth ? "bz-paid" : ""}">${shortK(paidMonth)}</b></div></div>` : ""}
      <div class="bz-chips" role="group" aria-label="Filter">${F.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${S.filter === k}" class="${S.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${shown.length ? `<section class="gcard bz-card bz-docs">${shown.map((d) => inv ? invRow(d) : quoteRow(d)).join("")}</section>`
        : `<div class="bz-empty">${list.length ? "Nothing here." : inv ? "No invoices yet. Tap New to make your first one." : "No quotes yet. A quote turns into an invoice in one tap."}</div>`}`;
  }
  function invRow(i) {
    const late = isLate(i);
    return `<button class="bz-doc" type="button" data-inv="${i.id}"><span class="bz-grow"><b>${esc(cust(i.customer_id).name)}</b>
      <small class="${late ? "bz-late" : ""}">${esc(i.number)} · ${esc(invSub(i))}${i.recurring_id ? " · repeats" : ""}</small></span>
      <span class="bz-end"><b>${K(i.total_kobo)}</b>${pill(invStatus(i))}</span></button>`;
  }
  function quoteRow(q) {
    return `<button class="bz-doc" type="button" data-q="${q.id}"><span class="bz-grow"><b>${esc(cust(q.customer_id).name)}</b>
      <small>${esc(q.number)} · ${niceDate(q.date)}${q.expiry_date ? " · valid to " + niceDate(q.expiry_date) : ""}</small></span>
      <span class="bz-end"><b>${K(q.total_kobo)}</b>${pill(quoteStatus(q))}</span></button>`;
  }
  function wireDocs() {
    $("bzNewDoc").onclick = () => openEditor(S.docMode === "invoices" ? "invoice" : "quote");
    document.querySelectorAll(".bz-chips [data-f]").forEach((b) => b.onclick = () => { S.filter = b.dataset.f; draw(); });
    document.querySelectorAll("[data-inv]").forEach((b) => b.onclick = () => openInvoice(b.dataset.inv));
    document.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => openQuote(b.dataset.q));
  }

  async function lines(kind, id) {
    return rows(sb().from("biz_lines").select("*").eq(kind === "invoice" ? "invoice_id" : "quote_id", id).order("position"));
  }

  async function openInvoice(id) {
    const inv = S.invoices.find((x) => x.id === id); if (!inv) return;
    const c = cust(inv.customer_id), st = invStatus(inv), open = isOpen(inv);
    const close = sheet("bzi", esc(inv.number), `<div class="bz-loading">Loading…</div>`);
    let ls = [];
    try { ls = await lines("invoice", id); } catch (e) { E().toast(e.message); }
    const pays = S.allocations.filter((a) => a.invoice_id === id).map((a) => ({ ...a, p: S.payments.find((p) => p.id === a.payment_id) })).filter((x) => x.p)
      .sort((a, b) => b.p.date.localeCompare(a.p.date));
    const pct = inv.total_kobo ? Math.min(100, Math.round(inv.paid_kobo / inv.total_kobo * 100)) : 0;
    const owner = true;
    const body = `
      <div class="bz-sumcard g-hero">
        <div class="bz-row"><b>${esc(c.name)}</b>${pill(st)}</div>
        <p class="gl">${inv.status === "paid" ? "Paid in full" : inv.status === "void" ? "Void" : inv.status === "draft" ? "Draft total" : "Still to pay"}</p>
        <p class="gbig">${K(inv.status === "draft" || inv.status === "void" || inv.status === "paid" ? inv.total_kobo : balance(inv))}</p>
        <p class="bz-sub">${inv.status === "draft" ? "Not sent yet · " : open || inv.status === "paid" ? `of ${K(inv.total_kobo)} · ` : ""}${inv.status === "paid" ? "" : "due " + niceDate(inv.due_date)}${isLate(inv) ? ` · ${daysBetween(inv.due_date, today())} days late` : ""}</p>
        ${open || inv.status === "paid" ? `<div class="bz-bar" role="img" aria-label="${K(inv.paid_kobo)} of ${K(inv.total_kobo)} paid"><i style="width:${pct}%"></i></div>
        <div class="bz-row bz-fine"><span class="bz-paid">${K(inv.paid_kobo)} paid</span><span>${pct}%</span></div>` : ""}
      </div>
      ${open ? `<button class="bz-btn primary wide big" id="bziPay" type="button">${svg(P.down, 20)} Record a payment</button>` : ""}
      ${inv.status === "draft" ? `<button class="bz-btn primary wide big" id="bziSend" type="button">${svg(P.wa, 20)} Send on WhatsApp</button>` : ""}
      <div class="bz-acts">
        ${inv.status !== "draft" && inv.status !== "void" ? `<button type="button" id="bziWa">${svg(P.wa)}<span>${open ? "Remind" : "WhatsApp"}</span></button>` : ""}
        ${inv.status !== "void" ? `<button type="button" id="bziPdf">${svg(P.pdf)}<span>PDF</span></button>` : ""}
        ${inv.status !== "void" ? `<button type="button" id="bziEdit">${svg(P.pen)}<span>Edit</span></button>` : ""}
        <button type="button" id="bziCopy">${svg(P.copy)}<span>Copy</span></button>
        ${inv.status === "draft" ? `<button type="button" id="bziDel">${svg(P.trash)}<span>Delete</span></button>` : ""}
        ${owner && inv.status !== "void" && inv.status !== "draft" && !inv.paid_kobo ? `<button type="button" id="bziVoid">${svg(P.x)}<span>Void</span></button>` : ""}
      </div>
      <section class="bz-panel"><h5 class="bz-h5">What it's for</h5>
        ${ls.map((l) => `<div class="bz-li"><span class="bz-grow"><b>${esc(l.name)}</b><small>${esc(l.description ? l.description + " · " : "")}${Number(l.quantity)}${l.unit ? " " + esc(l.unit) : ""} × ${K2(l.rate_kobo)}</small></span><b>${K(l.amount_kobo)}</b></div>`).join("")}
        ${totalsBlock(inv)}
      </section>
      <section class="bz-panel"><h5 class="bz-h5">History</h5>
        ${pays.map((x) => `<div class="bz-li"><span class="bz-dot lime"></span><span class="bz-grow"><b>Paid ${K(x.amount_kobo)}</b><small>${niceDate(x.p.date)} · ${esc(modeLabel(x.p.mode))}${x.p.reference ? " · " + esc(x.p.reference) : ""}</small></span>
          <button class="bz-link danger" type="button" data-delpay="${x.p.id}">Remove</button></div>`).join("")}
        ${inv.sent_at ? `<div class="bz-li"><span class="bz-dot"></span><span class="bz-grow"><b>Sent</b><small>${niceDate(inv.sent_at.slice(0, 10))}</small></span></div>` : ""}
        <div class="bz-li"><span class="bz-dot hollow"></span><span class="bz-grow"><b>${inv.quote_id ? "Made from quote " + esc((S.quotes.find((q) => q.id === inv.quote_id) || {}).number || "") : inv.source === "recurring" ? "Raised by a repeating invoice" : "Created"}</b><small>${niceDate(inv.created_at.slice(0, 10))}</small></span></div>
      </section>
      ${inv.notes ? `<p class="fine">${esc(inv.notes)}</p>` : ""}`;
    $("bzisheetbody").innerHTML = body;
    const on = (id2, fn) => { if ($(id2)) $(id2).onclick = fn; };
    on("bziPay", () => { close(); openPayment(inv.customer_id, inv.id); });
    on("bziSend", () => sendInvoice(inv, close));
    on("bziWa", () => remind(inv));
    on("bziPdf", () => printDoc("invoice", inv, ls));
    on("bziEdit", () => { close(); openEditor("invoice", inv, ls); });
    on("bziCopy", () => { close(); openEditor("invoice", cloneOf(inv), ls); });
    on("bziDel", () => confirmBox("Delete this draft?", "It hasn't been sent, so nothing else changes.", "Delete", async () => {
      await rpc("biz_delete_invoice", { p_invoice: inv.id }); close(); await refresh("Draft deleted"); }));
    on("bziVoid", () => confirmBox("Void " + esc(inv.number) + "?", "It stays in your list marked Void and stops counting as money owed. This can't be undone.", "Void invoice", async () => {
      await rpc("biz_void_invoice", { p_invoice: inv.id }); close(); await refresh("Invoice voided"); }));
    document.querySelectorAll("[data-delpay]").forEach((b) => b.onclick = () => confirmBox("Remove this payment?", "The invoice will show as owed again, and the money-in record goes too.", "Remove payment", async () => {
      await rpc("biz_delete_payment", { p_payment: b.dataset.delpay }); close(); await refresh("Payment removed"); }));
  }
  const modeLabel = (m) => ({ bank_transfer: "Bank transfer", cash: "Cash", pos: "POS", card: "Card", online: "Online", other: "Other" })[m] || m;
  function totalsBlock(d) {
    return `<div class="bz-tot">
      ${d.discount_kobo || d.shipping_kobo || d.adjustment_kobo ? `<div class="bz-row"><span>Subtotal</span><span>${K(d.subtotal_kobo)}</span></div>` : ""}
      ${d.discount_kobo ? `<div class="bz-row"><span>Discount${d.discount_type === "percent" ? " (" + Number(d.discount_value) + "%)" : ""}</span><span>−${K(d.discount_kobo)}</span></div>` : ""}
      ${d.shipping_kobo ? `<div class="bz-row"><span>Delivery</span><span>${K(d.shipping_kobo)}</span></div>` : ""}
      ${d.adjustment_kobo ? `<div class="bz-row"><span>Adjustment</span><span>${K(d.adjustment_kobo)}</span></div>` : ""}
      <div class="bz-row bz-total"><span>Total</span><span>${K(d.total_kobo)}</span></div></div>`;
  }

  async function sendInvoice(inv, close) {
    const c = cust(inv.customer_id);
    // Open the chat first: phones block pop-ups that open after a wait.
    const w = waStart();
    try {
      await rpc("biz_send_invoice", { p_invoice: inv.id });
      if (close) close();
      await refresh("Invoice sent");
      waGo(w, c.phone, `Hello ${c.name}, here is invoice ${inv.number} from ${S.biz.name} for ${K(inv.total_kobo)}, due ${niceDate(inv.due_date)}.\n\nView it here: ${shareUrl(inv.share_token)}`);
    } catch (e) { waStop(w); E().toast(e.message); }
  }
  function remind(inv) {
    const c = cust(inv.customer_id), late = isLate(inv), bal = balance(inv);
    const text = isOpen(inv)
      ? `Hello ${c.name}, a reminder that ${K(bal)} is ${late ? "now overdue" : "due " + niceDate(inv.due_date)} on invoice ${inv.number} from ${S.biz.name}.${S.biz.bank_details ? "\n\nPay to: " + S.biz.bank_details : ""}\n\nView it here: ${shareUrl(inv.share_token)}`
      : `Hello ${c.name}, here is invoice ${inv.number} from ${S.biz.name}.\n\nView it here: ${shareUrl(inv.share_token)}`;
    openWhatsApp(c.phone, text);
  }

  async function openQuote(id) {
    const q = S.quotes.find((x) => x.id === id); if (!q) return;
    const c = cust(q.customer_id);
    const close = sheet("bzi", esc(q.number), `<div class="bz-loading">Loading…</div>`);
    let ls = [];
    try { ls = await lines("quote", id); } catch (e) { E().toast(e.message); }
    $("bzisheetbody").innerHTML = `
      <div class="bz-sumcard g-hero"><div class="bz-row"><b>${esc(c.name)}</b>${pill(quoteStatus(q))}</div>
        <p class="gl">Quote total</p><p class="gbig">${K(q.total_kobo)}</p>
        <p class="bz-sub">${niceDate(q.date)}${q.expiry_date ? " · valid to " + niceDate(q.expiry_date) : ""}</p></div>
      ${q.status === "invoiced" ? `<button class="bz-btn wide big" id="bzqOpen" type="button">${svg(P.doc, 20)} Open the invoice</button>`
        : `<button class="bz-btn primary wide big" id="bzqConv" type="button">${svg(P.docPlus, 20)} Turn into an invoice</button>`}
      <div class="bz-acts">
        ${q.status !== "invoiced" ? `<button type="button" id="bzqWa">${svg(P.wa)}<span>WhatsApp</span></button>` : ""}
        <button type="button" id="bzqPdf">${svg(P.pdf)}<span>PDF</span></button>
        ${q.status !== "invoiced" ? `<button type="button" id="bzqEdit">${svg(P.pen)}<span>Edit</span></button>` : ""}
        ${q.status === "sent" || q.status === "draft" ? `<button type="button" id="bzqYes">${svg(P.check)}<span>Accepted</span></button><button type="button" id="bzqNo">${svg(P.x)}<span>Declined</span></button>` : ""}
        <button type="button" id="bzqCopy">${svg(P.copy)}<span>Copy</span></button>
        ${q.status !== "invoiced" ? `<button type="button" id="bzqDel">${svg(P.trash)}<span>Delete</span></button>` : ""}
      </div>
      <section class="bz-panel"><h5 class="bz-h5">What it's for</h5>
        ${ls.map((l) => `<div class="bz-li"><span class="bz-grow"><b>${esc(l.name)}</b><small>${Number(l.quantity)}${l.unit ? " " + esc(l.unit) : ""} × ${K2(l.rate_kobo)}</small></span><b>${K(l.amount_kobo)}</b></div>`).join("")}
        ${totalsBlock(q)}</section>`;
    const on = (i, fn) => { if ($(i)) $(i).onclick = fn; };
    on("bzqOpen", () => { close(); openInvoice(q.invoice_id); });
    on("bzqConv", async () => { busy("bzqConv", true);
      try { const invId = await rpc("biz_convert_quote", { p_quote: q.id }); close(); await refresh("Draft invoice made from " + q.number);
        S.tab = "docs"; S.docMode = "invoices"; S.filter = "all"; saveUi(); draw(); openInvoice(invId);
      } catch (e) { busy("bzqConv", false); E().toast(e.message); } });
    on("bzqWa", async () => {
      const w = waStart();
      try {
        if (q.status === "draft") await rpc("biz_set_quote_status", { p_quote: q.id, p_status: "sent" });
        close(); await refresh();
        waGo(w, c.phone, `Hello ${c.name}, here is quote ${q.number} from ${S.biz.name} for ${K(q.total_kobo)}.\n\nView it here: ${shareUrl(q.share_token)}`);
      } catch (e) { waStop(w); E().toast(e.message); } });
    on("bzqPdf", () => printDoc("quote", q, ls));
    on("bzqEdit", () => { close(); openEditor("quote", q, ls); });
    on("bzqCopy", () => { close(); openEditor("quote", cloneOf(q), ls); });
    on("bzqYes", async () => { await rpc("biz_set_quote_status", { p_quote: q.id, p_status: "accepted" }); close(); await refresh("Marked accepted"); });
    on("bzqNo", async () => { await rpc("biz_set_quote_status", { p_quote: q.id, p_status: "declined" }); close(); await refresh("Marked declined"); });
    on("bzqDel", () => confirmBox("Delete this quote?", "This can't be undone.", "Delete", async () => { await rpc("biz_delete_quote", { p_quote: q.id }); close(); await refresh("Quote deleted"); }));
  }

  // A copy keeps who it's for, the items, discount, delivery and notes; it gets today's date, a new number and starts as a draft
  function cloneOf(d) {
    const c = { customer_id: d.customer_id, date: today(), discount_type: d.discount_type, discount_value: d.discount_value,
      shipping_kobo: d.shipping_kobo, notes: d.notes || "", terms: d.terms || "", copied: true };
    if (d.due_date) c.due_date = addDays(today(), daysBetween(d.date, d.due_date));
    return c;
  }

  /* ---------------- EDITOR (invoice or quote) ---------------- */
  function openEditor(kind, existing, existingLines, preset) {
    const isInv = kind === "invoice";
    const ex = existing || {};
    const st = {
      customer_id: ex.customer_id || (preset && preset.customer_id) || "",
      number: ex.number || "", date: ex.date || today(),
      payDays: ex.due_date ? daysBetween(ex.date, ex.due_date) : 14,
      expiry: ex.expiry_date || "",
      lines: (existingLines || []).map((l) => ({ item_id: l.item_id, name: l.name, description: l.description || "", quantity: Number(l.quantity), unit: l.unit || "", rate_kobo: Number(l.rate_kobo) })),
      discount_type: ex.discount_type || "", discount_value: ex.discount_value != null ? Number(ex.discount_value) : "",
      shipping_kobo: ex.shipping_kobo || 0, notes: ex.notes ?? (ex.id ? "" : S.biz.default_note || ""), terms: ex.terms ?? (ex.id ? "" : S.biz.default_terms || ""),
      repeat: false, every: "monthly",
    };
    if (!st.lines.length) st.lines.push({ name: "", quantity: 1, rate_kobo: 0, unit: "", description: "" });
    const title = (ex.id ? "Edit " : ex.copied ? "Copy of " : "New ") + (isInv ? "invoice" : "quote");
    const close = sheet("bze", title, `<div id="bzeBody"></div>`, null, true);
    const paint = () => {
      const t = totals(st), c = S.customers.find((x) => x.id === st.customer_id);
      $("bzeBody").innerHTML = `
        <label for="bzeCust">Bill to</label>
        <div class="bz-row bz-gap"><select id="bzeCust" class="bz-grow"><option value="">Choose a customer</option>${S.customers.filter((x) => !x.archived || x.id === st.customer_id)
          .map((x) => `<option value="${x.id}" ${x.id === st.customer_id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
          <button class="bz-btn sm" id="bzeNewCust" type="button">${svg(P.plus, 15)} New</button></div>
        <div class="bz-2col">
          <div><label for="bzeNum">${isInv ? "Invoice" : "Quote"} number</label><input id="bzeNum" value="${esc(st.number)}" placeholder="${esc(nextNumberHint(kind))}" autocomplete="off"></div>
          <div><label for="bzeDate">Date</label><input id="bzeDate" type="date" value="${st.date}"></div></div>
        ${isInv ? `<label>Pay within</label><div class="bz-chips small" role="group" aria-label="Pay within">${[0, 7, 14, 30].map((d) => `<button type="button" data-pd="${d}" class="${st.payDays === d ? "on" : ""}" aria-pressed="${st.payDays === d}">${d ? d + " days" : "On receipt"}</button>`).join("")}
            ${[0, 7, 14, 30].includes(st.payDays) ? "" : `<button type="button" class="on" aria-pressed="true">${st.payDays} days</button>`}</div>
            <p class="fine">Due ${niceDate(addDays(st.date, st.payDays))}</p>`
          : `<label for="bzeExp">Valid until <span class="opt">optional</span></label><input id="bzeExp" type="date" value="${st.expiry}">`}
        <h5 class="bz-h5">Items</h5>
        ${st.lines.map((l, i) => `<div class="bz-line" data-i="${i}">
          <div class="bz-row bz-gap"><input class="bz-grow" data-k="name" value="${esc(l.name)}" placeholder="What you sold" list="bzeItems" autocomplete="off" aria-label="Item ${i + 1} name">
            ${st.lines.length > 1 ? `<button class="bz-icon sm" type="button" data-rm="${i}" aria-label="Remove item ${i + 1}">${svg(P.x, 16)}</button>` : ""}</div>
          <div class="bz-row bz-gap">
            <div class="bz-step" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Less">${svg(P.minus, 16)}</button><input data-k="quantity" inputmode="decimal" value="${l.quantity}" aria-label="Quantity"><button type="button" data-q="1" aria-label="More">${svg(P.plus, 16)}</button></div>
            <span class="bz-x">×</span><div class="bz-naira bz-grow"><span>₦</span><input data-k="rate" inputmode="decimal" value="${nairaInput(l.rate_kobo)}" placeholder="Price" aria-label="Price each"></div>
          </div>
          <div class="bz-row"><input class="bz-desc bz-grow" data-k="description" value="${esc(l.description || "")}" placeholder="Details (optional)" aria-label="Item ${i + 1} details"><b class="bz-amt" data-amt="${i}">${K(Math.round((Number(l.quantity) || 0) * (l.rate_kobo || 0)))}</b></div>
        </div>`).join("")}
        <datalist id="bzeItems">${S.items.map((it) => `<option value="${esc(it.name)}">`).join("")}</datalist>
        <button class="bz-dashed" id="bzeAdd" type="button">${svg(P.plus, 16)} Add an item</button>
        <p class="fine">Pick a saved item to fill in its price. New items are saved for next time.</p>
        <section class="bz-panel">
          <div class="bz-row"><span>Subtotal</span><b id="bzeSub">${K(t.subtotal)}</b></div>
          <div class="bz-row bz-gap"><span>Discount</span><span class="bz-row bz-gap">
            <select id="bzeDt" aria-label="Discount type"><option value="">None</option><option value="percent" ${st.discount_type === "percent" ? "selected" : ""}>%</option><option value="flat" ${st.discount_type === "flat" ? "selected" : ""}>₦</option></select>
            ${st.discount_type ? `<input id="bzeDv" class="bz-short" inputmode="decimal" value="${st.discount_type === "flat" ? nairaInput(st.discount_value) : st.discount_value}" aria-label="Discount amount">` : ""}</span></div>
          <div class="bz-row bz-gap"><span>Delivery</span><div class="bz-naira bz-short"><span>₦</span><input id="bzeShip" inputmode="decimal" value="${nairaInput(st.shipping_kobo)}" placeholder="0" aria-label="Delivery charge"></div></div>
          <div class="bz-row bz-total"><span>Total</span><span id="bzeTot">${K(t.total)}</span></div>
        </section>
        <label for="bzeNotes">Note to customer <span class="opt">optional</span></label><textarea id="bzeNotes" rows="2">${esc(st.notes)}</textarea>
        ${isInv && !ex.id ? `<div class="bz-row bz-toggle"><span><b>Repeat this invoice</b><small>Egom raises it again automatically</small></span>
          <button type="button" role="switch" aria-checked="${st.repeat}" aria-label="Repeat this invoice" id="bzeRep" class="bz-switch ${st.repeat ? "on" : ""}"><i></i></button></div>
          ${st.repeat ? `<div class="bz-chips small">${[["monthly", "Monthly"], ["quarterly", "Every 3 months"], ["yearly", "Yearly"]].map(([k, l]) => `<button type="button" data-ev="${k}" class="${st.every === k ? "on" : ""}" aria-pressed="${st.every === k}">${l}</button>`).join("")}</div>` : ""}` : ""}
        <div class="bz-foot">
          <button class="bz-btn" id="bzeDraft" type="button">${ex.id && ex.status !== "draft" ? "Save changes" : "Save draft"}</button>
          ${!ex.id || ex.status === "draft" ? `<button class="bz-btn primary" id="bzeSend" type="button">${svg(P.wa, 18)} Send on WhatsApp</button>` : ""}
        </div>`;
      wire();
    };
    const keep = () => {   // read every field before a repaint so typing is never lost
      const v = (id) => ($(id) ? $(id).value : undefined);
      if (v("bzeCust") !== undefined) st.customer_id = v("bzeCust");
      if (v("bzeNum") !== undefined) st.number = v("bzeNum").trim();
      if (v("bzeDate")) st.date = v("bzeDate");
      if (v("bzeExp") !== undefined) st.expiry = v("bzeExp");
      if (v("bzeNotes") !== undefined) st.notes = v("bzeNotes");
      if (v("bzeDt") !== undefined) st.discount_type = v("bzeDt");
      if ($("bzeDv")) st.discount_value = st.discount_type === "flat" ? toKobo(v("bzeDv")) : (Number(v("bzeDv")) || 0);
      if ($("bzeShip")) st.shipping_kobo = toKobo(v("bzeShip"));
      document.querySelectorAll(".bz-line").forEach((row) => {
        const l = st.lines[+row.dataset.i]; if (!l) return;
        l.name = row.querySelector('[data-k="name"]').value;
        l.description = row.querySelector('[data-k="description"]').value;
        l.quantity = Number(row.querySelector('[data-k="quantity"]').value) || 0;
        l.rate_kobo = toKobo(row.querySelector('[data-k="rate"]').value);
      });
    };
    const numbers = () => {
      keep(); const t = totals(st);
      st.lines.forEach((l, i) => { const el = document.querySelector(`[data-amt="${i}"]`); if (el) el.textContent = K(Math.round((Number(l.quantity) || 0) * (l.rate_kobo || 0))); });
      if ($("bzeSub")) $("bzeSub").textContent = K(t.subtotal);
      if ($("bzeTot")) $("bzeTot").textContent = K(t.total);
    };
    const repaint = () => { keep(); const y = $("bzesheet") ? $("bzesheet").scrollTop : 0; paint(); if ($("bzesheet")) $("bzesheet").scrollTop = y; };
    function wire() {
      $("bzeNewCust").onclick = () => { keep(); openCustomerForm(null, (c) => { st.customer_id = c.id; paint(); }); };
      document.querySelectorAll("[data-pd]").forEach((b) => b.onclick = () => { st.payDays = +b.dataset.pd; repaint(); });
      if ($("bzeDate")) $("bzeDate").onchange = repaint;
      document.querySelectorAll("[data-ev]").forEach((b) => b.onclick = () => { st.every = b.dataset.ev; repaint(); });
      if ($("bzeRep")) $("bzeRep").onclick = () => { st.repeat = !st.repeat; repaint(); };
      $("bzeDt").onchange = () => { keep(); if (!st.discount_type) st.discount_value = ""; paint(); };
      // Typing never redraws the form (that would steal the cursor); it only updates the numbers.
      [$("bzeDv"), $("bzeShip")].forEach((el) => el && (el.oninput = numbers));
      document.querySelectorAll(".bz-line").forEach((row) => {
        const i = +row.dataset.i;
        row.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => { keep(); const l = st.lines[i]; l.quantity = Math.max(0, Math.round((l.quantity + Number(b.dataset.q)) * 100) / 100);
          row.querySelector('[data-k="quantity"]').value = l.quantity; numbers(); });
        row.querySelector('[data-k="quantity"]').oninput = numbers;
        row.querySelector('[data-k="rate"]').oninput = numbers;
        row.querySelector('[data-k="name"]').onchange = (e) => {
          const it = S.items.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
          const l = st.lines[i]; if (!it) { l.item_id = null; return; }
          l.item_id = it.id;
          const rate = row.querySelector('[data-k="rate"]'), desc = row.querySelector('[data-k="description"]');
          if (!toKobo(rate.value) && it.rate_kobo) rate.value = nairaInput(Number(it.rate_kobo));
          if (!desc.value && it.description) desc.value = it.description;
          if (!l.unit) l.unit = it.unit || "";
          numbers();
        };
      });
      document.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { keep(); st.lines.splice(+b.dataset.rm, 1); paint(); });
      $("bzeAdd").onclick = () => { keep(); st.lines.push({ name: "", quantity: 1, rate_kobo: 0, unit: "", description: "" }); paint();
        const rowsEl = document.querySelectorAll(".bz-line"); const last = rowsEl[rowsEl.length - 1]; if (last) last.querySelector('[data-k="name"]').focus(); };
      $("bzeDraft").onclick = () => save(false);
      if ($("bzeSend")) $("bzeSend").onclick = () => save(true);
    }
    async function save(send) {
      keep();
      const used = st.lines.filter((l) => l.name.trim() || l.rate_kobo);
      if (!st.customer_id) return E().toast("Choose who it's for");
      if (!used.length) return E().toast("Add at least one item");
      if (used.some((l) => !l.name.trim())) return E().toast("Every item needs a name");
      const doc = {
        customer_id: st.customer_id, number: st.number || null, date: st.date,
        discount_type: st.discount_type || null, discount_value: st.discount_type ? st.discount_value : null,
        shipping_kobo: st.shipping_kobo || 0, notes: st.notes || null, terms: st.terms || null,
        lines: used.map((l) => ({ item_id: l.item_id || null, name: l.name.trim(), description: l.description || null, quantity: l.quantity, unit: l.unit || null, rate_kobo: l.rate_kobo })),
      };
      if (isInv) doc.due_date = addDays(st.date, st.payDays); else doc.expiry_date = st.expiry || null;
      const w = send ? waStart() : null;
      busy(send ? "bzeSend" : "bzeDraft", true);
      try {
        await rememberItems(used);
        const id = await rpc(isInv ? "biz_save_invoice" : "biz_save_quote", isInv ? { p_business: S.bizId, p_invoice: ex.id || null, p_doc: doc } : { p_business: S.bizId, p_quote: ex.id || null, p_doc: doc });
        if (isInv && st.repeat && !ex.id) {
          const step = { monthly: 1, quarterly: 3, yearly: 12 }[st.every];
          const d = new Date(st.date + "T12:00:00"); d.setMonth(d.getMonth() + step);
          await rows(sb().from("biz_recurring").insert({ business_id: S.bizId, customer_id: st.customer_id, every: st.every, next_run: iso(d), pay_within_days: st.payDays,
            auto_send: false, name: used[0].name, template: { lines: doc.lines, discount_type: doc.discount_type, discount_value: doc.discount_value, shipping_kobo: doc.shipping_kobo, notes: doc.notes, terms: doc.terms } }));
        }
        close();
        await loadAll();
        if (send) {
          const c = cust(st.customer_id);
          if (isInv) {
            await rpc("biz_send_invoice", { p_invoice: id });
            await loadAll();
            const inv = S.invoices.find((x) => x.id === id);
            S.pendingWa = [w, c.phone, `Hello ${c.name}, here is invoice ${inv.number} from ${S.biz.name} for ${K(inv.total_kobo)}, due ${niceDate(inv.due_date)}.\n\nView it here: ${shareUrl(inv.share_token)}`];
          } else {
            await rpc("biz_set_quote_status", { p_quote: id, p_status: "sent" });
            await loadAll();
            const q = S.quotes.find((x) => x.id === id);
            S.pendingWa = [w, c.phone, `Hello ${c.name}, here is quote ${q.number} from ${S.biz.name} for ${K(q.total_kobo)}.\n\nView it here: ${shareUrl(q.share_token)}`];
          }
        }
        S.tab = isInv ? "docs" : "quotes"; S.filter = "all"; saveUi(); draw();
        E().toast(send ? (isInv ? "Invoice sent" : "Quote sent") : ex.id ? "Saved" : "Draft saved");
        if (S.pendingWa) { const [pw, ph, tx] = S.pendingWa; S.pendingWa = null; waGo(pw, ph, tx); }
      } catch (e) { waStop(w); busy(send ? "bzeSend" : "bzeDraft", false); E().toast(e.message); }
    }
    paint();
  }
  function nextNumberHint(kind) {
    const b = S.biz; if (!b) return "";
    return kind === "invoice" ? b.invoice_prefix + String(b.invoice_next).padStart(b.number_pad, "0") : b.quote_prefix + String(b.quote_next).padStart(b.number_pad, "0");
  }
  async function rememberItems(used) {
    const fresh = used.filter((l) => !l.item_id && l.name.trim() && !S.items.some((it) => it.name.toLowerCase() === l.name.trim().toLowerCase()));
    if (!fresh.length) return;
    try {
      const made = await rows(sb().from("biz_items").insert(fresh.map((l) => ({ business_id: S.bizId, name: l.name.trim(), rate_kobo: l.rate_kobo || 0, unit: l.unit || null, description: l.description || null }))).select());
      made.forEach((it) => { const l = fresh.find((x) => x.name.trim().toLowerCase() === it.name.toLowerCase()); if (l) l.item_id = it.id; });
      S.items.push(...made);
    } catch (e) { /* items are a convenience; the invoice still saves */ }
  }

  /* ---------------- PAYMENT ---------------- */
  function openPayment(customerId, invoiceId) {
    const st = { customer_id: customerId || "", amount: "", date: today(), mode: "bank_transfer", account: "", reference: "", picked: invoiceId ? [invoiceId] : null };
    const close = sheet("bzp", "Record a payment", `<div id="bzpBody"></div>`);
    const openFor = () => S.invoices.filter((i) => i.customer_id === st.customer_id && isOpen(i)).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const plan = () => {   // apply the money to the picked invoices, oldest first
      let left = toKobo(st.amount); const out = [];
      const list = openFor().filter((i) => !st.picked || st.picked.includes(i.id));
      list.forEach((i) => { const part = Math.min(left, balance(i)); if (part > 0) { out.push({ invoice_id: i.id, amount_kobo: part }); left -= part; } });
      return { out, extra: left };
    };
    const paint = () => {
      const inv = openFor();
      if (st.picked === null && inv.length) st.picked = inv.map((i) => i.id);
      if (!st.amount && st.picked && st.picked.length) st.amount = nairaInput(inv.filter((i) => st.picked.includes(i.id)).reduce((a, i) => a + balance(i), 0));
      const p = plan();
      $("bzpBody").innerHTML = `
        <label for="bzpCust">From</label>
        <select id="bzpCust"><option value="">Choose a customer</option>${S.customers.map((c) => `<option value="${c.id}" ${c.id === st.customer_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
        ${st.customer_id ? (inv.length ? `<label>For</label><div class="bz-picks">${inv.map((i) => `<label class="bz-pick"><input type="checkbox" data-pk="${i.id}" ${st.picked && st.picked.includes(i.id) ? "checked" : ""}>
            <span class="bz-grow"><b>${esc(i.number)}</b><small class="${isLate(i) ? "bz-late" : ""}">${esc(invSub(i))}</small></span><b>${K(balance(i))}</b></label>`).join("")}</div>`
          : `<p class="fine">No unpaid invoices for this customer. The payment is kept as credit for their next invoice.</p>`) : ""}
        <div class="bz-2col"><div><label for="bzpAmt">Amount</label><div class="bz-naira"><span>₦</span><input id="bzpAmt" inputmode="decimal" value="${esc(st.amount)}" placeholder="0"></div></div>
          <div><label for="bzpDate">Date</label><input id="bzpDate" type="date" value="${st.date}" max="${today()}"></div></div>
        <label>How</label><div class="bz-chips small" role="group" aria-label="How they paid">${[["bank_transfer", "Transfer"], ["cash", "Cash"], ["pos", "POS"], ["card", "Card"]].map(([k, l]) => `<button type="button" data-md="${k}" class="${st.mode === k ? "on" : ""}" aria-pressed="${st.mode === k}">${l}</button>`).join("")}</div>
        ${st.mode !== "cash" ? `<label for="bzpAcc">Into <span class="opt">optional</span></label><input id="bzpAcc" list="bzpAccL" value="${esc(st.account)}" placeholder="e.g. GTBank, Moniepoint" autocomplete="off">
          <datalist id="bzpAccL">${accountNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>` : ""}
        <label for="bzpRef">Reference <span class="opt">optional</span></label><input id="bzpRef" value="${esc(st.reference)}" placeholder="From the transfer alert">
        <p class="fine" id="bzpPlan">${planText(p)}</p>
        <button class="bz-btn primary wide big" id="bzpSave" type="button">Save payment</button>`;
      $("bzpCust").onchange = () => { st.customer_id = $("bzpCust").value; st.picked = null; st.amount = ""; paint(); };
      document.querySelectorAll("[data-pk]").forEach((c) => c.onchange = () => { keep(); st.picked = [...document.querySelectorAll("[data-pk]:checked")].map((x) => x.dataset.pk);
        st.amount = nairaInput(openFor().filter((i) => st.picked.includes(i.id)).reduce((a, i) => a + balance(i), 0)); paint(); });
      document.querySelectorAll("[data-md]").forEach((b) => b.onclick = () => { keep(); st.mode = b.dataset.md; paint(); });
      // Typing the amount only updates the line under it; a full repaint here would swallow the tap on Save
      $("bzpAmt").oninput = () => { keep(); $("bzpPlan").innerHTML = planText(plan()); };
      $("bzpSave").onclick = saveIt;
    };
    const planText = (p) => !toKobo(st.amount) ? "" : (p.out.length ? "Pays " + p.out.map((a) => { const i = S.invoices.find((x) => x.id === a.invoice_id); return `${esc(i.number)} (${K(a.amount_kobo)}${a.amount_kobo < balance(i) ? ", part" : ""})`; }).join(", ") : "")
      + (p.extra > 0 ? `${p.out.length ? ". " : ""}${K(p.extra)} kept as credit for this customer` : "") + ".";
    const keep = () => { st.amount = $("bzpAmt").value; st.date = $("bzpDate").value; st.reference = $("bzpRef").value; if ($("bzpAcc")) st.account = $("bzpAcc").value; };
    async function saveIt() {
      keep();
      if (!st.customer_id) return E().toast("Choose who paid");
      const amt = toKobo(st.amount); if (!amt) return E().toast("Enter the amount");
      busy("bzpSave", true);
      try {
        await rpc("biz_record_payment", { p_business: S.bizId, p_doc: { customer_id: st.customer_id, date: st.date, amount_kobo: amt, mode: st.mode,
          account: st.mode === "cash" ? "Cash" : st.account.trim() || null, reference: st.reference.trim() || null, allocations: plan().out } });
        close(); await refresh(`${K(amt)} recorded`);
        if (E().reload) E().reload();   // the payment also shows as money in on the Egom dashboard
      } catch (e) { busy("bzpSave", false); E().toast(e.message); }
    }
    paint();
  }

  /* ---------------- CUSTOMERS ---------------- */
  function customersView() {
    const q = S.custQuery.trim().toLowerCase();
    const owedBy = new Map(); S.invoices.filter(isOpen).forEach((i) => owedBy.set(i.customer_id, (owedBy.get(i.customer_id) || 0) + balance(i)));
    const lateBy = new Set(S.invoices.filter(isLate).map((i) => i.customer_id));
    const list = S.customers.filter((c) => !c.archived && (!q || (c.name + " " + (c.phone || "") + " " + (c.company || "")).toLowerCase().includes(q)))
      .sort((a, b) => (owedBy.get(b.id) || 0) - (owedBy.get(a.id) || 0) || a.name.localeCompare(b.name));
    return `
      <div class="bz-row bz-head"><h2>Customers</h2><button class="bz-btn primary sm" id="bzNewCust" type="button">${svg(P.plus, 16)} New</button></div>
      ${S.customers.length > 6 ? `<div class="bz-search">${svg(P.search, 18)}<input id="bzcQ" value="${esc(S.custQuery)}" placeholder="Search by name or phone" aria-label="Search customers"></div>` : ""}
      ${list.length ? `<section class="gcard bz-card bz-docs">${list.map((c) => `<button class="bz-doc" type="button" data-c="${c.id}"><span class="bz-av">${esc(initials(c.name))}</span>
        <span class="bz-grow"><b>${esc(c.name)}</b><small>${esc([c.company, c.phone].filter(Boolean).join(" · ") || "No phone yet")}</small></span>
        <span class="bz-end">${owedBy.get(c.id) ? `<b class="${lateBy.has(c.id) ? "bz-late" : ""}">${K(owedBy.get(c.id))}</b><small>owes you</small>` : ""}</span></button>`).join("")}</section>`
        : `<div class="bz-empty">${S.customers.length ? "No one matches that." : "No customers yet. Add the people and companies you bill."}</div>`}`;
  }
  const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  function wireCustomers() {
    $("bzNewCust").onclick = () => openCustomerForm(null, () => draw());
    if ($("bzcQ")) $("bzcQ").oninput = (e) => { S.custQuery = e.target.value; const pos = e.target.selectionStart; draw(); const el = $("bzcQ"); el.focus(); el.setSelectionRange(pos, pos); };
    document.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => openCustomer(b.dataset.c));
  }
  function openCustomer(id) {
    const c = S.customers.find((x) => x.id === id); if (!c) return;
    const inv = S.invoices.filter((i) => i.customer_id === id), owed = inv.filter(isOpen).reduce((a, i) => a + balance(i), 0);
    const paid = S.payments.filter((p) => p.customer_id === id).reduce((a, p) => a + p.amount_kobo, 0);
    const credit = S.payments.filter((p) => p.customer_id === id).reduce((a, p) => a + p.unapplied_kobo, 0);
    const close = sheet("bzc", esc(c.name), `
      <div class="bz-stats two"><div class="gcard"><p>Owes you</p><b class="${inv.some(isLate) ? "bz-late" : ""}">${K(owed)}</b></div><div class="gcard"><p>Paid you</p><b class="bz-paid">${K(paid)}</b></div></div>
      ${credit ? `<p class="fine">${K(credit)} paid in advance is kept as credit.</p>` : ""}
      <div class="bz-acts">
        <button type="button" id="bzcInv">${svg(P.docPlus)}<span>Invoice</span></button>
        <button type="button" id="bzcPay">${svg(P.down)}<span>Got paid</span></button>
        ${c.phone ? `<button type="button" id="bzcWa">${svg(P.wa)}<span>WhatsApp</span></button>` : ""}
        <button type="button" id="bzcEdit">${svg(P.pen)}<span>Edit</span></button></div>
      ${[c.phone, c.email, c.address].filter(Boolean).length ? `<p class="fine">${esc([c.phone, c.email, c.address].filter(Boolean).join(" · "))}</p>` : ""}
      <section class="bz-panel"><h5 class="bz-h5">Invoices</h5>${inv.length ? inv.map(invRow).join("") : `<p class="fine">None yet.</p>`}</section>`);
    $("bzcInv").onclick = () => { close(); openEditor("invoice", null, null, { customer_id: id }); };
    $("bzcPay").onclick = () => { close(); openPayment(id); };
    if ($("bzcWa")) $("bzcWa").onclick = () => openWhatsApp(c.phone, `Hello ${c.name},`);
    $("bzcEdit").onclick = () => { close(); openCustomerForm(c, () => draw()); };
    document.querySelectorAll("#bzcsheet [data-inv]").forEach((b) => b.onclick = () => { close(); openInvoice(b.dataset.inv); });
  }
  function openCustomerForm(c, done) {
    const ex = c || {};
    const prevRoot = $("sheetRoot").innerHTML ? stashSheet() : null;
    const close = sheet("bzcf", c ? "Edit customer" : "New customer", `
      <label for="bzcfN">Name</label><input id="bzcfN" value="${esc(ex.name || "")}" placeholder="Person or company" autocomplete="off">
      <label for="bzcfP">WhatsApp or phone <span class="opt">optional</span></label><input id="bzcfP" value="${esc(ex.phone || "")}" inputmode="tel" placeholder="0803 000 0000">
      <label for="bzcfC">Company <span class="opt">optional</span></label><input id="bzcfC" value="${esc(ex.company || "")}">
      <label for="bzcfE">Email <span class="opt">optional</span></label><input id="bzcfE" value="${esc(ex.email || "")}" inputmode="email">
      <label for="bzcfA">Address <span class="opt">optional</span></label><textarea id="bzcfA" rows="2">${esc(ex.address || "")}</textarea>
      <button class="bz-btn primary wide big" id="bzcfSave" type="button">${c ? "Save" : "Add customer"}</button>
      ${c ? `<button class="bz-link danger wide" id="bzcfArch" type="button">${c.archived ? "Show in the list again" : "Hide from the list"}</button>` : ""}`, () => { if (prevRoot) prevRoot(); });
    setTimeout(() => $("bzcfN") && $("bzcfN").focus(), 60);
    $("bzcfSave").onclick = async () => {
      const row = { name: $("bzcfN").value.trim(), phone: $("bzcfP").value.trim() || null, company: $("bzcfC").value.trim() || null, email: $("bzcfE").value.trim() || null, address: $("bzcfA").value.trim() || null };
      if (!row.name) return E().toast("Type the customer's name");
      busy("bzcfSave", true);
      try {
        let saved;
        if (c) { saved = (await rows(sb().from("biz_customers").update({ ...row, updated_at: new Date().toISOString() }).eq("id", c.id).select()))[0]; Object.assign(c, saved); }
        else { saved = (await rows(sb().from("biz_customers").insert({ ...row, business_id: S.bizId }).select()))[0]; S.customers.push(saved); S.customers.sort((a, b) => a.name.localeCompare(b.name)); }
        close(); E().toast(c ? "Saved" : "Customer added"); if (done) done(saved);
      } catch (e) { busy("bzcfSave", false); E().toast(e.message); }
    };
    if ($("bzcfArch")) $("bzcfArch").onclick = async () => {
      try { await rows(sb().from("biz_customers").update({ archived: !c.archived }).eq("id", c.id)); c.archived = !c.archived; close(); draw(); } catch (e) { E().toast(e.message); }
    };
  }

  /* ---------------- MORE ---------------- */
  function moreView() {
    const owed = S.invoices.filter(isOpen).reduce((a, i) => a + balance(i), 0);
    const bs = (E().bankSummary && E().bankSummary()) || { known: 0, names: 0, total: 0 };
    const rows = [
      ["banks", P.bank, "Banks", bs.known ? `${K(Math.round(bs.total * 100))} across ${bs.names} account${bs.names === 1 ? "" : "s"}` : bs.names ? `${bs.names} account${bs.names === 1 ? "" : "s"} · set balances` : "Add your business banks and cash"],
      ["purchases", P.cart, "Purchases and vendors", S.purchases.length ? `${S.purchases.filter(pOpen).length} to pay${owedOut() ? " · you owe " + shortK(owedOut()) : ""}` : "What you buy from suppliers, and paying them"],
      ["customers", P.people, "Customers", `${S.customers.filter((c) => !c.archived).length} customer${S.customers.length === 1 ? "" : "s"}${owed ? " · " + shortK(owed) + " owed" : ""}`],
      ["items", P.tag, "Items", `${S.items.length} item${S.items.length === 1 ? "" : "s"} and prices you sell`],
      ["reports", P.chart, "Reports", "Profit, who owes you, where the money went"],
      ["settings", P.gear, "Business details", "Name, logo, bank details, invoice numbers"],
    ];
    return `<div class="bz-row bz-head"><h2>More</h2></div>
      <section class="gcard bz-card bz-docs">${rows.map(([k, d, t, sm]) => `<button class="bz-doc" type="button" data-more="${k}">
        <span class="bz-qc" style="width:40px;height:40px">${svg(d, 19)}</span>
        <span class="bz-grow"><b>${t}</b><small>${esc(sm)}</small></span><span class="bz-x">${svg(P.chev, 18)}</span></button>`).join("")}</section>`;
  }
  function wireMore() {
    document.querySelectorAll("[data-more]").forEach((b) => b.onclick = () => {
      const k = b.dataset.more;
      if (k === "settings") return openSettings();
      S.tab = k; saveUi(); draw(); window.scrollTo(0, 0);
    });
  }

  /* ---------------- ITEMS: what you sell, with prices ---------------- */
  function itemsView() {
    const q = (S.itemQuery || "").trim().toLowerCase();
    const list = S.items.filter((i) => !q || (i.name + " " + (i.description || "")).toLowerCase().includes(q));
    return `
      <div class="bz-row bz-head"><h2>Items</h2><button class="bz-btn primary sm" id="bzNewItem" type="button">${svg(P.plus, 16)} New item</button></div>
      <p class="fine" style="margin:-4px 4px 0">Save what you sell once. Pick it on an invoice or quote and the price fills in.</p>
      ${S.items.length > 6 ? `<div class="bz-search">${svg(P.search, 18)}<input id="bziQ" value="${esc(S.itemQuery || "")}" placeholder="Search items" aria-label="Search items"></div>` : ""}
      ${list.length ? `<section class="gcard bz-card bz-docs">${list.map((i) => `<button class="bz-doc" type="button" data-item="${i.id}">
        <span class="bz-qc" style="width:40px;height:40px">${svg(P.box, 19)}</span>
        <span class="bz-grow"><b>${esc(i.name)}</b><small>${esc(i.description || (i.unit ? "Per " + i.unit : "No description"))}</small></span>
        <span class="bz-end"><b>${K2(i.rate_kobo)}</b>${i.unit ? `<small>per ${esc(i.unit)}</small>` : ""}</span></button>`).join("")}</section>`
        : `<div class="bz-empty">${S.items.length ? "Nothing matches that." : "No items yet. Add the products and services you sell, with their prices."}</div>`}`;
  }
  function wireItems() {
    $("bzNewItem").onclick = () => openItemForm(null);
    if ($("bziQ")) $("bziQ").oninput = (e) => { S.itemQuery = e.target.value; const pos = e.target.selectionStart; draw(); const el = $("bziQ"); el.focus(); el.setSelectionRange(pos, pos); };
    document.querySelectorAll("[data-item]").forEach((b) => b.onclick = () => openItemForm(S.items.find((x) => x.id === b.dataset.item)));
  }
  function openItemForm(it) {
    const ex = it || {};
    const close = sheet("bzit", it ? "Edit item" : "New item", `
      <label for="bzitN">Name</label><input id="bzitN" value="${esc(ex.name || "")}" placeholder="e.g. Painting, per room" autocomplete="off">
      <label for="bzitD">Description <span class="opt">optional</span></label><input id="bzitD" value="${esc(ex.description || "")}" placeholder="Shows under the name on invoices">
      <div class="bz-2col">
        <div><label for="bzitR">Price</label><div class="bz-naira"><span>₦</span><input id="bzitR" inputmode="decimal" value="${esc(nairaInput(ex.rate_kobo))}" placeholder="0"></div></div>
        <div><label for="bzitU">Unit <span class="opt">optional</span></label><input id="bzitU" value="${esc(ex.unit || "")}" placeholder="e.g. room, bag, hour"></div>
      </div>
      <button class="bz-btn primary wide big" id="bzitSave" type="button">${it ? "Save" : "Add item"}</button>
      ${it ? `<button class="bz-link danger wide" id="bzitDel" type="button">Remove this item</button>` : ""}`);
    setTimeout(() => $("bzitN") && $("bzitN").focus(), 60);
    $("bzitSave").onclick = async () => {
      const row = { name: $("bzitN").value.trim(), description: $("bzitD").value.trim() || null, rate_kobo: toKobo($("bzitR").value), unit: $("bzitU").value.trim() || null };
      if (!row.name) return E().toast("Type the item's name");
      if ($("bzitR").value.trim() && !row.rate_kobo) return E().toast("Check the price, e.g. 25000 or 25k");
      busy("bzitSave", true);
      try {
        if (it) { const saved = (await rows(sb().from("biz_items").update({ ...row, updated_at: new Date().toISOString() }).eq("id", it.id).select()))[0]; Object.assign(it, saved); }
        else { const saved = (await rows(sb().from("biz_items").insert({ ...row, business_id: S.bizId }).select()))[0]; S.items.push(saved); }
        S.items.sort((a, b) => a.name.localeCompare(b.name));
        close(); E().toast(it ? "Saved" : "Item added"); draw();
      } catch (e) { busy("bzitSave", false); E().toast(e.message); }
    };
    if ($("bzitDel")) $("bzitDel").onclick = async () => {
      const b = $("bzitDel");
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to remove"; return; }
      try {
        await rows(sb().from("biz_items").update({ active: false, updated_at: new Date().toISOString() }).eq("id", it.id));
        S.items = S.items.filter((x) => x.id !== it.id);
        close(); E().toast("Item removed. Old invoices keep it."); draw();
      } catch (e) { E().toast(e.message); }
    };
  }

  /* ---------------- PURCHASES: what you bought from vendors, and paying them ---------------- */
  const ven = (id) => S.vendors.find((v) => v.id === id) || { name: "Vendor" };
  const pBal = (p) => Math.max(0, p.total_kobo - p.paid_kobo);
  const pOpen = (p) => p.status !== "paid";
  const pLate = (p) => pOpen(p) && !!p.due_date && p.due_date < today();
  const owedOut = () => S.purchases.filter(pOpen).reduce((a, p) => a + pBal(p), 0);
  function pStatus(p) {
    if (p.status === "paid") return ["Paid", "paid"];
    if (pLate(p)) return ["Overdue", "late"];
    if (p.status === "partly_paid") return ["Part paid", "part"];
    return ["To pay", "sent"];
  }
  function pSub(p) {
    const bits = [p.number ? p.number : niceDate(p.date)];
    if (p.status === "paid") { const last = S.vpays.filter((x) => x.purchase_id === p.id).map((x) => x.date).sort().pop(); bits.push(last ? "Paid " + niceDate(last) : "Paid"); }
    else if (p.due_date) { const late = daysBetween(p.due_date, today()); bits.push(late > 0 ? `${late} day${late === 1 ? "" : "s"} late` : late === 0 ? "Due today" : "Due " + niceDate(p.due_date)); }
    if (p.status === "partly_paid") bits.push(K(pBal(p)) + " left");
    return bits.join(" · ");
  }
  function purchaseRow(p) {
    return `<button class="bz-doc" type="button" data-pu="${p.id}"><span class="bz-grow"><b>${esc(ven(p.vendor_id).name)}</b>
      <small class="${pLate(p) ? "bz-late" : ""}">${esc(pSub(p))}</small></span>
      <span class="bz-end"><b>${K(p.total_kobo)}</b>${pill(pStatus(p))}</span></button>`;
  }
  function purchasesView() {
    const open = S.purchases.filter(pOpen), late = open.filter(pLate);
    const ym = (E() && E().ym) || today().slice(0, 7);
    const paidMonth = S.vpays.filter((x) => x.date.slice(0, 7) === ym).reduce((a, x) => a + x.amount_kobo, 0);
    const F = [["all", "All"], ["unpaid", "To pay"], ["late", "Overdue"], ["paid", "Paid"]];
    if (!F.some(([k]) => k === S.filter)) S.filter = "all";
    const shown = S.purchases.filter((p) => ({ all: true, unpaid: pOpen(p), late: pLate(p), paid: p.status === "paid" })[S.filter]);
    return `
      <div class="bz-row bz-head"><h2>Purchases</h2><button class="bz-btn primary sm" id="bzNewPu" type="button">${svg(P.plus, 16)} New</button></div>
      <p class="fine" style="margin:-4px 4px 0">What you bought from vendors. Paying shows in Expenses and comes off the account you paid from.</p>
      <div class="bz-stats">
        <div class="gcard"><p>You owe</p><b>${shortK(owedOut())}</b></div>
        <div class="gcard"><p>Overdue</p><b class="${late.length ? "bz-late" : ""}">${shortK(late.reduce((a, p) => a + pBal(p), 0))}</b></div>
        <div class="gcard"><p>Paid · ${esc(new Date(ym + "-15").toLocaleDateString("en-GB", { month: "short" }))}</p><b>${shortK(paidMonth)}</b></div></div>
      <div class="bz-chips" role="group" aria-label="Filter">${F.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${S.filter === k}" class="${S.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${shown.length ? `<section class="gcard bz-card bz-docs">${shown.map(purchaseRow).join("")}</section>`
        : `<div class="bz-empty">${S.purchases.length ? "Nothing here." : "No purchases yet. Record what you buy from suppliers, paid now or on credit."}</div>`}
      <button class="bz-dashed" id="bzToVen" type="button">${svg(P.people, 16)} Vendors (${S.vendors.filter((v) => !v.archived).length})</button>`;
  }
  function wirePurchases() {
    $("bzNewPu").onclick = () => openPurchaseEditor();
    $("bzToVen").onclick = () => { S.tab = "vendors"; saveUi(); draw(); window.scrollTo(0, 0); };
    document.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { S.filter = b.dataset.f; draw(); });
    document.querySelectorAll("[data-pu]").forEach((b) => b.onclick = () => openPurchase(b.dataset.pu));
  }
  const loadPLines = (id) => rows(sb().from("biz_purchase_lines").select("*").eq("purchase_id", id).order("position"));
  async function openPurchase(id) {
    const p = S.purchases.find((x) => x.id === id); if (!p) return;
    const close = sheet("bzpu", esc(ven(p.vendor_id).name), `<div id="bzpubody"><p class="fine">Opening…</p></div>`);
    let ls = [];
    try { ls = await loadPLines(id); } catch (e) { E().toast(e.message); }
    if (!$("bzpubody")) return;
    const pays = S.vpays.filter((x) => x.purchase_id === id).sort((a, b) => b.date.localeCompare(a.date));
    const pct = p.total_kobo ? Math.round(p.paid_kobo / p.total_kobo * 100) : 0;
    $("bzpubody").innerHTML = `
      <div class="bz-sumcard g-hero">
        <div class="bz-row"><b>${esc(p.number || "Purchase")}</b>${pill(pStatus(p))}</div>
        <p class="gl">${p.status === "paid" ? "Paid in full" : "Still to pay"}</p>
        <p class="gbig">${K(p.status === "paid" ? p.total_kobo : pBal(p))}</p>
        <p class="bz-sub">${p.status === "paid" ? "" : `of ${K(p.total_kobo)} · `}bought ${niceDate(p.date)}${p.due_date && pOpen(p) ? " · due " + niceDate(p.due_date) : ""}</p>
        ${p.paid_kobo ? `<div class="bz-bar" role="img" aria-label="${K(p.paid_kobo)} of ${K(p.total_kobo)} paid"><i style="width:${pct}%"></i></div>
        <div class="bz-row bz-fine"><span class="bz-paid">${K(p.paid_kobo)} paid</span><span>${pct}%</span></div>` : ""}
      </div>
      ${pOpen(p) ? `<button class="bz-btn primary wide big" id="bzpuPay" type="button">${svg(P.up, 20)} Pay vendor</button>` : ""}
      <div class="bz-acts">
        <button type="button" id="bzpuEdit">${svg(P.pen)}<span>Edit</span></button>
        <button type="button" id="bzpuCopy">${svg(P.copy)}<span>Copy</span></button>
        <button type="button" id="bzpuDel">${svg(P.trash)}<span>Delete</span></button></div>
      <section class="bz-panel"><h5 class="bz-h5">What you bought · ${esc(p.category)}</h5>
        ${ls.map((l) => `<div class="bz-li"><span class="bz-grow"><b>${esc(l.name)}</b><small>${Number(l.quantity)}${l.unit ? " " + esc(l.unit) : ""} × ${K2(l.rate_kobo)}</small></span><b>${K(l.amount_kobo)}</b></div>`).join("")}
        <div class="bz-row bz-total"><span>Total</span><span>${K(p.total_kobo)}</span></div></section>
      <section class="bz-panel"><h5 class="bz-h5">Payments</h5>
        ${pays.length ? pays.map((x) => `<div class="bz-li"><span class="bz-dot"></span><span class="bz-grow"><b>Paid ${K(x.amount_kobo)}</b><small>${niceDate(x.date)}${x.account ? " · from " + esc(x.account) : ""}</small></span>
          <button class="bz-link danger" type="button" data-delvp="${x.id}">Remove</button></div>`).join("") : `<p class="fine">Nothing paid yet.</p>`}</section>
      ${p.notes ? `<p class="fine">${esc(p.notes)}</p>` : ""}`;
    const on = (i, fn) => { if ($(i)) $(i).onclick = fn; };
    on("bzpuPay", () => { close(); openVendorPay(p); });
    on("bzpuEdit", () => { close(); openPurchaseEditor(p, ls); });
    on("bzpuCopy", () => { close(); openPurchaseEditor({ vendor_id: p.vendor_id, category: p.category, notes: p.notes, copied: true,
      due_date: p.due_date ? addDays(today(), daysBetween(p.date, p.due_date)) : null }, ls); });
    on("bzpuDel", () => confirmBox("Delete this purchase?", p.paid_kobo ? `Its ${pays.length} payment${pays.length === 1 ? "" : "s"} (${K(p.paid_kobo)}) will also be removed from Expenses.` : "Nothing has been paid on it, so nothing else changes.", "Delete", async () => {
      await rpc("biz_delete_purchase", { p_purchase: p.id }); close(); await refresh("Purchase deleted"); if (E().reload) E().reload(); }));
    document.querySelectorAll("[data-delvp]").forEach((b) => b.onclick = () => confirmBox("Remove this payment?", "It also comes out of Expenses and goes back on the account.", "Remove", async () => {
      await rpc("biz_delete_vendor_payment", { p_payment: b.dataset.delvp }); close(); await refresh("Payment removed"); if (E().reload) E().reload(); }));
  }
  const accList = (id) => `<datalist id="${id}">${[...new Set([...accountNames(), "Cash"])].map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
  const defaultAcc = () => accountNames()[0] || "";
  function openVendorPay(p) {
    const close = sheet("bzvp", "Pay " + esc(ven(p.vendor_id).name), `
      <p class="fine" style="margin-top:0">${esc(p.number || "Purchase")} · ${K(pBal(p))} left to pay</p>
      <div class="bz-2col"><div><label for="bzvpAmt">Amount</label><div class="bz-naira"><span>₦</span><input id="bzvpAmt" inputmode="decimal" value="${esc(nairaInput(pBal(p)))}"></div></div>
        <div><label for="bzvpDate">Date</label><input id="bzvpDate" type="date" value="${today()}" max="${today()}"></div></div>
      <label for="bzvpAcc">Paid from</label><input id="bzvpAcc" list="bzvpL" value="${esc(defaultAcc())}" placeholder="Bank, wallet, Cash or Petty cash" autocomplete="off">${accList("bzvpL")}
      <p class="fine">Shows in Expenses as ${esc(p.category)} and comes off this account.</p>
      <button class="bz-btn primary wide big" id="bzvpSave" type="button">Save payment</button>`);
    $("bzvpSave").onclick = async () => {
      const amt = toKobo($("bzvpAmt").value); if (!amt) return E().toast("Enter the amount");
      busy("bzvpSave", true);
      try {
        await rpc("biz_pay_vendor", { p_purchase: p.id, p_pay: { amount_kobo: amt, date: $("bzvpDate").value, account: $("bzvpAcc").value.trim() || null } });
        close(); await refresh(`${K(amt)} paid`); if (E().reload) E().reload();
      } catch (e) { busy("bzvpSave", false); E().toast(e.message); }
    };
  }
  function openPurchaseEditor(existing, existingLines) {
    const ex = existing || {};
    const cats = (E().categories && E().categories()) || ["Other"];
    const defCat = cats.find((c) => /material|stock|suppl|inventory|equipment/i.test(c)) || cats[0];
    const st = {
      vendor_id: ex.vendor_id || "", number: ex.id ? ex.number || "" : "", date: ex.id ? ex.date : today(), due: ex.due_date || "",
      category: ex.category || defCat, notes: ex.notes || "",
      lines: (existingLines || []).map((l) => ({ name: l.name, quantity: Number(l.quantity), unit: l.unit || "", rate_kobo: Number(l.rate_kobo) })),
      paid: "no", paidAmt: "", acc: defaultAcc(),
    };
    if (!st.lines.length) st.lines.push({ name: "", quantity: 1, rate_kobo: 0, unit: "" });
    const close = sheet("bzpe", ex.id ? "Edit purchase" : "New purchase", `<div id="bzpeBody"></div>`, null, true);
    const total = () => st.lines.reduce((a, l) => a + Math.round((Number(l.quantity) || 0) * (l.rate_kobo || 0)), 0);
    const paint = () => {
      $("bzpeBody").innerHTML = `
        <label for="bzpeVen">Vendor</label>
        <div class="bz-row bz-gap"><select id="bzpeVen" class="bz-grow"><option value="">Choose a vendor</option>${S.vendors.filter((v) => !v.archived || v.id === st.vendor_id)
          .map((v) => `<option value="${v.id}" ${v.id === st.vendor_id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
          <button class="bz-btn sm" id="bzpeNewVen" type="button">${svg(P.plus, 15)} New</button></div>
        <div class="bz-2col">
          <div><label for="bzpeNum">Their bill no. <span class="opt">optional</span></label><input id="bzpeNum" value="${esc(st.number)}" autocomplete="off"></div>
          <div><label for="bzpeDate">Date</label><input id="bzpeDate" type="date" value="${st.date}" max="${today()}"></div></div>
        <label for="bzpeCat">Category</label><select id="bzpeCat">${(cats.includes(st.category) ? cats : [st.category, ...cats]).map((c) => `<option ${c === st.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <h5 class="bz-h5">Items</h5>
        ${st.lines.map((l, i) => `<div class="bz-line" data-i="${i}">
          <div class="bz-row bz-gap"><input class="bz-grow" data-k="name" value="${esc(l.name)}" placeholder="What you bought" autocomplete="off" aria-label="Item ${i + 1} name">
            ${st.lines.length > 1 ? `<button class="bz-icon sm" type="button" data-rm="${i}" aria-label="Remove item ${i + 1}">${svg(P.x, 16)}</button>` : ""}</div>
          <div class="bz-row bz-gap">
            <div class="bz-step" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Less">${svg(P.minus, 16)}</button><input data-k="quantity" inputmode="decimal" value="${l.quantity}" aria-label="Quantity"><button type="button" data-q="1" aria-label="More">${svg(P.plus, 16)}</button></div>
            <span class="bz-x">×</span><div class="bz-naira bz-grow"><span>₦</span><input data-k="rate" inputmode="decimal" value="${nairaInput(l.rate_kobo)}" placeholder="Price" aria-label="Price each"></div>
          </div>
          <div class="bz-row" style="justify-content:flex-end"><b class="bz-amt" data-amt="${i}">${K(Math.round((Number(l.quantity) || 0) * (l.rate_kobo || 0)))}</b></div>
        </div>`).join("")}
        <button class="bz-dashed" id="bzpeAdd" type="button">${svg(P.plus, 16)} Add an item</button>
        <section class="bz-panel"><div class="bz-row bz-total"><span>Total</span><span id="bzpeTot">${K(total())}</span></div></section>
        ${ex.id ? "" : `<label>Paid already?</label><div class="bz-chips small" role="group" aria-label="Paid already">${[["no", "Not yet"], ["full", "Paid in full"], ["part", "Part"]].map(([k, l]) => `<button type="button" data-pd="${k}" class="${st.paid === k ? "on" : ""}" aria-pressed="${st.paid === k}">${l}</button>`).join("")}</div>
          ${st.paid === "part" ? `<label for="bzpeAmt">Amount paid</label><div class="bz-naira"><span>₦</span><input id="bzpeAmt" inputmode="decimal" value="${esc(st.paidAmt)}" placeholder="0"></div>` : ""}
          ${st.paid !== "no" ? `<label for="bzpeAcc">Paid from</label><input id="bzpeAcc" list="bzpeL" value="${esc(st.acc)}" placeholder="Bank, wallet, Cash or Petty cash" autocomplete="off">${accList("bzpeL")}` : ""}`}
        ${ex.id || st.paid !== "full" ? `<label for="bzpeDue">Pay by <span class="opt">optional</span></label><input id="bzpeDue" type="date" value="${st.due}">` : ""}
        <label for="bzpeNotes">Note <span class="opt">optional</span></label><input id="bzpeNotes" value="${esc(st.notes)}" placeholder="e.g. For the Lekki job">
        <button class="bz-btn primary wide big" id="bzpeSave" type="button">${ex.id ? "Save changes" : "Save purchase"}</button>`;
      wire();
    };
    const keep = () => {
      const v = (id) => ($(id) ? $(id).value : undefined);
      if (v("bzpeVen") !== undefined) st.vendor_id = v("bzpeVen");
      if (v("bzpeNum") !== undefined) st.number = v("bzpeNum").trim();
      if (v("bzpeDate") !== undefined) st.date = v("bzpeDate") || today();
      if (v("bzpeCat") !== undefined) st.category = v("bzpeCat");
      if (v("bzpeDue") !== undefined) st.due = v("bzpeDue");
      if (v("bzpeNotes") !== undefined) st.notes = v("bzpeNotes");
      if (v("bzpeAmt") !== undefined) st.paidAmt = v("bzpeAmt");
      if (v("bzpeAcc") !== undefined) st.acc = v("bzpeAcc");
      document.querySelectorAll("#bzpeBody .bz-line").forEach((row) => {
        const l = st.lines[+row.dataset.i];
        l.name = row.querySelector('[data-k="name"]').value;
        l.quantity = Number(row.querySelector('[data-k="quantity"]').value) || 0;
        l.rate_kobo = toKobo(row.querySelector('[data-k="rate"]').value);
      });
    };
    const numbers = () => { keep(); st.lines.forEach((l, i) => { const el = document.querySelector(`#bzpeBody [data-amt="${i}"]`); if (el) el.textContent = K(Math.round((Number(l.quantity) || 0) * (l.rate_kobo || 0))); }); $("bzpeTot").textContent = K(total()); };
    function wire() {
      $("bzpeNewVen").onclick = () => { keep(); openVendorForm(null, (v) => { st.vendor_id = v.id; paint(); }); };
      document.querySelectorAll("#bzpeBody .bz-line input").forEach((inp) => inp.oninput = numbers);
      document.querySelectorAll("#bzpeBody [data-q]").forEach((b) => b.onclick = () => {
        keep(); const l = st.lines[+b.closest(".bz-line").dataset.i]; l.quantity = Math.max(1, (Number(l.quantity) || 0) + Number(b.dataset.q)); paint(); });
      document.querySelectorAll("#bzpeBody [data-rm]").forEach((b) => b.onclick = () => { keep(); st.lines.splice(+b.dataset.rm, 1); paint(); });
      document.querySelectorAll("#bzpeBody [data-pd]").forEach((b) => b.onclick = () => { keep(); st.paid = b.dataset.pd; paint(); });
      $("bzpeAdd").onclick = () => { keep(); st.lines.push({ name: "", quantity: 1, rate_kobo: 0, unit: "" }); paint();
        const rs = document.querySelectorAll("#bzpeBody .bz-line"); rs[rs.length - 1].querySelector('[data-k="name"]').focus(); };
      $("bzpeSave").onclick = save;
    }
    async function save() {
      keep();
      const used = st.lines.filter((l) => l.name.trim() || l.rate_kobo);
      if (!st.vendor_id) return E().toast("Choose who you bought from");
      if (!used.length) return E().toast("Add at least one item");
      if (used.some((l) => !l.name.trim())) return E().toast("Every item needs a name");
      if (!total()) return E().toast("Add the prices");
      const doc = { vendor_id: st.vendor_id, number: st.number || null, date: st.date, due_date: st.paid === "full" && !ex.id ? null : st.due || null,
        category: st.category, notes: st.notes.trim() || null,
        lines: used.map((l) => ({ name: l.name.trim(), quantity: l.quantity || 1, unit: l.unit || null, rate_kobo: l.rate_kobo })) };
      if (!ex.id && st.paid !== "no") {
        const amt = st.paid === "full" ? total() : toKobo(st.paidAmt);
        if (!amt) return E().toast("Enter how much you paid");
        if (amt > total()) return E().toast("That's more than the total");
        doc.paid_now = { amount_kobo: amt, account: st.acc.trim() || null, date: st.date };
      }
      busy("bzpeSave", true);
      try {
        await rpc("biz_save_purchase", { p_business: S.bizId, p_purchase: ex.id || null, p_doc: doc });
        close(); await refresh(ex.id ? "Purchase saved" : doc.paid_now ? "Purchase saved and paid" : "Purchase saved");
        if (doc.paid_now || ex.id) { if (E().reload) E().reload(); }
      } catch (e) { busy("bzpeSave", false); E().toast(e.message); }
    }
    paint();
  }

  /* ---------------- VENDORS ---------------- */
  function vendorsView() {
    const owedTo = new Map(); S.purchases.filter(pOpen).forEach((p) => owedTo.set(p.vendor_id, (owedTo.get(p.vendor_id) || 0) + pBal(p)));
    const lateTo = new Set(S.purchases.filter(pLate).map((p) => p.vendor_id));
    const list = S.vendors.filter((v) => !v.archived).sort((a, b) => (owedTo.get(b.id) || 0) - (owedTo.get(a.id) || 0) || a.name.localeCompare(b.name));
    return `
      <div class="bz-row bz-head"><h2>Vendors</h2><button class="bz-btn primary sm" id="bzNewVen" type="button">${svg(P.plus, 16)} New</button></div>
      <p class="fine" style="margin:-4px 4px 0">The suppliers and shops you buy from.</p>
      ${list.length ? `<section class="gcard bz-card bz-docs">${list.map((v) => `<button class="bz-doc" type="button" data-ven="${v.id}"><span class="bz-av">${esc(initials(v.name))}</span>
        <span class="bz-grow"><b>${esc(v.name)}</b><small>${esc(v.phone || "No phone yet")}</small></span>
        <span class="bz-end">${owedTo.get(v.id) ? `<b class="${lateTo.has(v.id) ? "bz-late" : ""}">${K(owedTo.get(v.id))}</b><small>you owe</small>` : ""}</span></button>`).join("")}</section>`
        : `<div class="bz-empty">No vendors yet. Add the suppliers you buy from.</div>`}`;
  }
  function wireVendors() {
    $("bzNewVen").onclick = () => openVendorForm(null, () => draw());
    document.querySelectorAll("[data-ven]").forEach((b) => b.onclick = () => openVendor(b.dataset.ven));
  }
  function openVendor(id) {
    const v = S.vendors.find((x) => x.id === id); if (!v) return;
    const pu = S.purchases.filter((p) => p.vendor_id === id), owe = pu.filter(pOpen).reduce((a, p) => a + pBal(p), 0);
    const paid = S.vpays.filter((x) => pu.some((p) => p.id === x.purchase_id)).reduce((a, x) => a + x.amount_kobo, 0);
    const close = sheet("bzv", esc(v.name), `
      <div class="bz-stats two"><div class="gcard"><p>You owe</p><b class="${pu.some(pLate) ? "bz-late" : ""}">${K(owe)}</b></div><div class="gcard"><p>Paid them</p><b>${K(paid)}</b></div></div>
      <div class="bz-acts">
        <button type="button" id="bzvPu">${svg(P.cart)}<span>Purchase</span></button>
        ${v.phone ? `<button type="button" id="bzvWa">${svg(P.wa)}<span>WhatsApp</span></button>` : ""}
        <button type="button" id="bzvEdit">${svg(P.pen)}<span>Edit</span></button></div>
      ${[v.phone, v.email].filter(Boolean).length ? `<p class="fine">${esc([v.phone, v.email].filter(Boolean).join(" · "))}</p>` : ""}
      <section class="bz-panel"><h5 class="bz-h5">Purchases</h5>${pu.length ? pu.map(purchaseRow).join("") : `<p class="fine">None yet.</p>`}</section>`);
    $("bzvPu").onclick = () => { close(); openPurchaseEditor({ vendor_id: id }); };
    if ($("bzvWa")) $("bzvWa").onclick = () => openWhatsApp(v.phone, `Hello ${v.name},`);
    $("bzvEdit").onclick = () => { close(); openVendorForm(v, () => draw()); };
    document.querySelectorAll("#bzvsheet [data-pu]").forEach((b) => b.onclick = () => { close(); openPurchase(b.dataset.pu); });
  }
  function openVendorForm(v, done) {
    const ex = v || {};
    const prevRoot = $("sheetRoot").innerHTML ? stashSheet() : null;
    const close = sheet("bzvf", v ? "Edit vendor" : "New vendor", `
      <label for="bzvfN">Name</label><input id="bzvfN" value="${esc(ex.name || "")}" placeholder="Supplier, shop or person" autocomplete="off">
      <label for="bzvfP">WhatsApp or phone <span class="opt">optional</span></label><input id="bzvfP" value="${esc(ex.phone || "")}" inputmode="tel" placeholder="0803 000 0000">
      <label for="bzvfE">Email <span class="opt">optional</span></label><input id="bzvfE" value="${esc(ex.email || "")}" inputmode="email">
      <button class="bz-btn primary wide big" id="bzvfSave" type="button">${v ? "Save" : "Add vendor"}</button>
      ${v ? `<button class="bz-link danger wide" id="bzvfArch" type="button">${v.archived ? "Show in the list again" : "Hide from the list"}</button>` : ""}`, () => { if (prevRoot) prevRoot(); });
    setTimeout(() => $("bzvfN") && $("bzvfN").focus(), 60);
    $("bzvfSave").onclick = async () => {
      const row = { name: $("bzvfN").value.trim(), phone: $("bzvfP").value.trim() || null, email: $("bzvfE").value.trim() || null };
      if (!row.name) return E().toast("Type the vendor's name");
      busy("bzvfSave", true);
      try {
        let saved;
        if (v) { saved = (await rows(sb().from("biz_vendors").update(row).eq("id", v.id).select()))[0]; Object.assign(v, saved); }
        else { saved = (await rows(sb().from("biz_vendors").insert({ ...row, business_id: S.bizId }).select()))[0]; S.vendors.push(saved); S.vendors.sort((a, b) => a.name.localeCompare(b.name)); }
        close(); E().toast(v ? "Saved" : "Vendor added"); if (done) done(saved);
      } catch (e) { busy("bzvfSave", false); E().toast(e.message); }
    };
    if ($("bzvfArch")) $("bzvfArch").onclick = async () => {
      try { await rows(sb().from("biz_vendors").update({ archived: !v.archived }).eq("id", v.id)); v.archived = !v.archived; close(); draw(); } catch (e) { E().toast(e.message); }
    };
  }

  /* ---------------- for Egom's Expenses calendar: invoices falling due ---------------- */
  function calendarExtras(ym) {
    if (!S.ready) return [];
    return [...S.invoices.filter((i) => isOpen(i) && i.due_date && i.due_date.slice(0, 7) === ym).map((i) => ({
      id: i.id, kind: "invoice", date: i.due_date, kobo: balance(i), late: isLate(i),
      title: cust(i.customer_id).name, sub: i.number + (isLate(i) ? " · overdue" : " · due"),
    })), ...S.purchases.filter((p) => pOpen(p) && p.due_date && p.due_date.slice(0, 7) === ym).map((p) => ({
      id: p.id, kind: "bill", date: p.due_date, kobo: pBal(p), late: pLate(p),
      title: ven(p.vendor_id).name, sub: (p.number ? p.number + " · " : "") + (pLate(p) ? "bill overdue" : "bill due"),
    }))];
  }

  /* ---------------- REPORTS ---------------- */
  function reportsView() {
    const r = S.report || {}, sales = r.sales || 0, spent = r.spent || 0, profit = sales - spent;
    const months = (r.months || []).slice(-6), max = Math.max(1, ...months.map((m) => Math.max(m.in, m.out)));
    const notDue = r.not_due_kobo || 0, l30 = r.late_1_30_kobo || 0, l60 = r.late_31_60_kobo || 0, l90 = r.late_60_kobo || 0, owed = notDue + l30 + l60 + l90;
    const by = S.spendBy === "job" ? (r.spent_by_job || []) : (r.spent_by_category || []);
    const top = by.reduce((a, x) => Math.max(a, x.kobo), 1);
    const kept = sales > 0 ? Math.round(profit / sales * 100) : null;
    const label = { month: "This month", quarter: "This quarter", year: "This year" };
    return `
      <div class="bz-row bz-head"><h2>Reports</h2><button class="bz-btn sm" id="bzCsv" type="button">${svg(P.pdf, 16)} For my accountant</button></div>
      <div class="bz-seg three" role="group" aria-label="Period">${Object.entries(label).map(([k, l]) => `<button type="button" data-p="${k}" class="${S.period === k ? "on" : ""}" aria-pressed="${S.period === k}">${l}</button>`).join("")}</div>
      <section class="g-hero"><p class="gl" style="margin-bottom:12px">Did we make money?</p>
        <div class="bz-row"><span class="gl">Sales</span><b class="gv" style="color:#C6F432">${K(sales)}</b></div>
        <div class="bz-row" style="margin-top:8px"><span class="gl">Spent</span><b class="gv">−${K(spent)}</b></div>
        <div class="bz-row bz-total light"><span>${profit < 0 ? "Loss" : "Profit"}</span><span class="bz-big">${profit < 0 ? "−" : ""}${K(Math.abs(profit))}</span></div>
        ${kept !== null && profit > 0 ? `<p class="bz-sub">You kept ₦${kept} of every ₦100 you made.</p>` : ""}</section>
      <section class="gcard bz-card"><div class="bz-row"><h3>Last 6 months</h3><span class="bz-legend"><i class="lime"></i>In <i></i>Out</span></div>
        ${months.length ? `<div class="bz-bars" role="img" aria-label="Money in and out by month">${months.map((m) => `<div><div class="bz-bb"><i class="lime" style="height:${Math.round(m.in / max * 120)}px"></i><i style="height:${Math.round(m.out / max * 120)}px"></i></div>
          <span>${new Date(m.month + "-15").toLocaleDateString("en-GB", { month: "short" })}</span></div>`).join("")}</div>` : `<p class="fine">Nothing recorded yet.</p>`}</section>
      <section class="gcard bz-card"><div class="bz-row"><h3>Who owes you</h3><b>${K(owed)}</b></div>
        ${owed ? `<div class="bz-split" role="img" aria-label="Money owed by how late it is">${[[notDue, "nd"], [l30, "l1"], [l60, "l2"], [l90, "l3"]].filter(([v]) => v > 0).map(([v, c]) => `<i class="${c}" style="flex:${v}"></i>`).join("")}</div>
          ${[[notDue, "Not due yet", "nd"], [l30, "Up to 30 days late", "l1"], [l60, "31 to 60 days late", "l2"], [l90, "Over 60 days late", "l3"]].map(([v, l, c]) => `<div class="bz-li"><span class="bz-sw ${c}"></span><span class="bz-grow">${l}</span><b>${K(v)}</b></div>`).join("")}`
          : `<p class="fine">No one owes you right now.</p>`}</section>
      <section class="gcard bz-card"><h3>Where the money went</h3>
        <div class="bz-chips small" role="group" aria-label="Group spending by"><button type="button" data-sb="job" class="${S.spendBy === "job" ? "on" : ""}" aria-pressed="${S.spendBy === "job"}">By job</button><button type="button" data-sb="cat" class="${S.spendBy === "cat" ? "on" : ""}" aria-pressed="${S.spendBy === "cat"}">By category</button></div>
        ${by.length ? by.slice(0, 8).map((x) => `<div class="bz-spend"><div class="bz-row"><span>${esc(x.name)}</span><b>${K(x.kobo)}</b></div><div class="bz-thin"><i style="width:${Math.max(2, Math.round(x.kobo / top * 100))}%"></i></div></div>`).join("")
          : `<p class="fine">No spending in this period.</p>`}
        ${S.spendBy === "job" ? `<p class="fine">Tag a business expense to a customer and it shows up here as that job.</p>` : ""}</section>`;
  }
  function wireReports() {
    document.querySelectorAll("[data-p]").forEach((b) => b.onclick = async () => { S.period = b.dataset.p; saveUi(); try { await loadReport(); } catch (e) { E().toast(e.message); } draw(); });
    document.querySelectorAll("[data-sb]").forEach((b) => b.onclick = () => { S.spendBy = b.dataset.sb; draw(); });
    $("bzCsv").onclick = exportCsv;
  }
  function exportCsv() {
    if (E().preview) return E().toast("In the real app this downloads a spreadsheet for your accountant.");
    const [from, to] = periodRange(), r = S.report || {};
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const n = (k) => ((Number(k) || 0) / 100).toFixed(2);
    const out = [[`${S.biz.name}: ${from} to ${to}`], [], ["Profit and loss"], ["Line", "Amount (NGN)"]];
    (r.income_by_account || []).forEach((x) => out.push([x.name, n(x.kobo)]));
    out.push(["Total income", n(r.sales)]);
    (r.spent_by_category || []).forEach((x) => out.push([x.name, n(-x.kobo)]));
    out.push(["Total spent", n(-(r.spent || 0))], ["Profit", n((r.sales || 0) - (r.spent || 0))], []);
    out.push(["Invoices"], ["Number", "Date", "Due", "Customer", "Status", "Total", "Paid", "Balance"]);
    S.invoices.filter((i) => i.date >= from && i.date <= to && i.status !== "draft").forEach((i) => out.push([i.number, i.date, i.due_date, cust(i.customer_id).name, invStatus(i)[0], n(i.total_kobo), n(i.paid_kobo), n(i.status === "void" ? 0 : balance(i))]));
    out.push([], ["Payments received"], ["Date", "Customer", "Amount", "How", "Reference"]);
    S.payments.filter((p) => p.date >= from && p.date <= to).forEach((p) => out.push([p.date, cust(p.customer_id).name, n(p.amount_kobo), modeLabel(p.mode), p.reference || ""]));
    const blob = new Blob(["﻿" + out.map((row) => row.map(q).join(",")).join("\r\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${S.biz.name.replace(/[^\w]+/g, "-")}-${from}-to-${to}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------------- ADD sheet ---------------- */
  function openAddSheet() {
    const close = sheet("bza", "Add", `
      <div class="bz-addgrid">
        <button type="button" id="bzaInv" class="lime">${svg(P.docPlus, 24)}<span><b>New invoice</b><small>Bill a customer</small></span></button>
        <button type="button" id="bzaQuote">${svg(P.quote, 24)}<span><b>New quote</b><small>Turns into an invoice</small></span></button>
        <button type="button" id="bzaPaid"><span class="bz-limeic">${svg(P.down, 24)}</span><span><b>I got paid</b><small>Against an invoice</small></span></button>
        <button type="button" id="bzaSpent">${svg(P.up, 24)}<span><b>I spent money</b><small>Receipt, statement or type it</small></span></button>
      </div>
      <div class="bz-panel">
        <button type="button" class="bz-li btn-li" id="bzaPu">${svg(P.cart)}<span class="bz-grow"><b>Record a purchase</b><small>Bought from a vendor, paid now or later</small></span></button>
        <button type="button" class="bz-li btn-li" id="bzaCust">${svg(P.userPlus)}<span class="bz-grow"><b>Add a customer</b></span></button>
        <button type="button" class="bz-li btn-li" id="bzaSet">${svg(P.gear)}<span class="bz-grow"><b>Business details and numbering</b><small>Shown on your invoices</small></span></button>
      </div>`);
    $("bzaInv").onclick = () => { close(); openEditor("invoice"); };
    $("bzaQuote").onclick = () => { close(); openEditor("quote"); };
    $("bzaPaid").onclick = () => { close(); openPayment(); };
    $("bzaSpent").onclick = () => { close(); E().openAdd(); };
    $("bzaCust").onclick = () => { close(); openCustomerForm(null, () => draw()); };
    $("bzaPu").onclick = () => { close(); openPurchaseEditor(); };
    $("bzaSet").onclick = () => { close(); openSettings(); };
  }

  /* ---------------- SETTINGS ---------------- */
  function openSettings() {
    const b = S.biz;
    const close = sheet("bzs", "Business details", `
      <p class="fine">These show on every invoice and quote you send.</p>
      <h5 class="bz-h5">Logo and colour</h5>
      <div class="bz-brand">
        <div class="bz-logobox" id="bzsLogoBox">${b.logo_path ? `<img src="${esc(b.logo_path)}" alt="Your logo">` : `<span>No logo yet</span>`}</div>
        <div class="bz-brandbtns"><label class="bz-btn sm" for="bzsLogo">${svg(P.plus, 15)} ${b.logo_path ? "Change logo" : "Upload logo"}</label>
          <input type="file" id="bzsLogo" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          <button class="bz-link danger" id="bzsLogoX" type="button" ${b.logo_path ? "" : "hidden"}>Remove</button></div>
      </div>
      <div id="bzsSizeRow" ${b.logo_path ? "" : "hidden"}><label>Logo size on invoices</label>
        <div class="bz-chips small" role="group" aria-label="Logo size" id="bzsSize"></div></div>
      <p class="fine">A PNG with a clear background looks best. Egom trims empty space around it and shrinks it to fit.</p>
      <label>Brand colour</label>
      <div class="bz-swatches" role="radiogroup" aria-label="Brand colour" id="bzsSw"></div>
      <div class="bz-row bz-gap" style="margin-top:8px"><input type="color" id="bzsCol" value="${esc(b.brand_color || "#C6F432")}" aria-label="Pick any colour"><span class="fine" id="bzsColTxt" style="margin:0"></span>
        <button class="bz-link" id="bzsFromLogo" type="button" ${b.logo_path ? "" : "hidden"}>Use my logo's colour</button></div>
      <div class="bz-mini" id="bzsMini"></div>
      <label for="bzsN">Business name</label><input id="bzsN" value="${esc(b.name)}">
      <label for="bzsP">Phone</label><input id="bzsP" value="${esc(b.phone || "")}" inputmode="tel">
      <label for="bzsE">Email</label><input id="bzsE" value="${esc(b.email || "")}" inputmode="email">
      <label for="bzsA">Address</label><textarea id="bzsA" rows="2">${esc(b.address || "")}</textarea>
      <label for="bzsB">How customers pay you</label><textarea id="bzsB" rows="3" placeholder="Bank name, account name and account number">${esc(b.bank_details || "")}</textarea>
      <label for="bzsNote">Note on every invoice <span class="opt">optional</span></label><textarea id="bzsNote" rows="2" placeholder="e.g. Thank you for your business">${esc(b.default_note || "")}</textarea>
      <label for="bzsSig">Signed by <span class="opt">optional</span></label><input id="bzsSig" value="${esc(b.signatory_name || "")}">
      <h5 class="bz-h5">Numbering</h5>
      <div class="bz-2col"><div><label for="bzsIp">Invoice prefix</label><input id="bzsIp" value="${esc(b.invoice_prefix)}"></div><div><label for="bzsIn">Next number</label><input id="bzsIn" inputmode="numeric" value="${b.invoice_next}"></div></div>
      <div class="bz-2col"><div><label for="bzsQp">Quote prefix</label><input id="bzsQp" value="${esc(b.quote_prefix)}"></div><div><label for="bzsQn">Next number</label><input id="bzsQn" inputmode="numeric" value="${b.quote_next}"></div></div>
      <label for="bzsPad">Digits</label><select id="bzsPad">${[1, 2, 3, 4, 5, 6].map((n) => `<option ${n === b.number_pad ? "selected" : ""}>${n}</option>`).join("")}</select>
      <p class="fine" id="bzsEx">Next invoice: ${esc(nextNumberHint("invoice"))}</p>
      <button class="bz-btn primary wide big" id="bzsSave" type="button">Save</button>`);
    const brand = { logo: b.logo_path || null, color: b.brand_color || null, scale: Number(b.logo_scale) || 1 };
    const SIZES = [[0.75, "Small"], [1, "Medium"], [1.4, "Large"], [1.8, "Extra large"]];
    const SW = [["#C6F432", "Lime"], ["#42BA50", "Green"], ["#16813A", "Deep green"], ["#0E0932", "Midnight"], ["#1E6FD9", "Blue"], ["#7A3FD1", "Purple"], ["#E0533F", "Red"], ["#F2A900", "Gold"], ["#0E0E0E", "Black"]];
    const paintBrand = () => {
      $("bzsLogoBox").innerHTML = brand.logo ? `<img src="${esc(brand.logo)}" alt="Your logo">` : `<span>No logo yet</span>`;
      $("bzsLogoX").hidden = !brand.logo; $("bzsFromLogo").hidden = !brand.logo; $("bzsSizeRow").hidden = !brand.logo;
      $("bzsSize").innerHTML = SIZES.map(([v, l]) => `<button type="button" data-ls="${v}" class="${Math.abs(brand.scale - v) < 0.01 ? "on" : ""}" aria-pressed="${Math.abs(brand.scale - v) < 0.01}">${l}</button>`).join("");
      $("bzsSize").querySelectorAll("[data-ls]").forEach((x) => x.onclick = () => { brand.scale = Number(x.dataset.ls); paintBrand(); });
      document.querySelector('label[for="bzsLogo"]').innerHTML = `${svg(P.plus, 15)} ${brand.logo ? "Change logo" : "Upload logo"}`;
      $("bzsSw").innerHTML = SW.map(([c, n]) => `<button type="button" role="radio" aria-checked="${brand.color === c}" aria-label="${n}" data-sw="${c}" class="${brand.color === c ? "on" : ""}" style="background:${c}"></button>`).join("");
      $("bzsSw").querySelectorAll("[data-sw]").forEach((x) => x.onclick = () => { brand.color = x.dataset.sw; $("bzsCol").value = brand.color; paintBrand(); });
      $("bzsCol").value = brand.color || "#C6F432";
      $("bzsColTxt").textContent = brand.color ? brand.color.toUpperCase() : "Egom lime (default)";
      $("bzsMini").innerHTML = miniHeader($("bzsN") ? $("bzsN").value || b.name : b.name, brand.logo, brand.color, brand.scale);
    };
    $("bzsCol").oninput = (e) => { brand.color = e.target.value.toUpperCase(); paintBrand(); };
    $("bzsLogo").onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try { brand.logo = await shrinkLogo(f); if (!brand.color) brand.color = await logoColour(brand.logo); paintBrand(); }
      catch (err) { E().toast(err.message); }
    };
    $("bzsLogoX").onclick = () => { brand.logo = null; paintBrand(); };
    $("bzsFromLogo").onclick = async () => { const c = await logoColour(brand.logo); if (c) { brand.color = c; $("bzsCol").value = c; paintBrand(); } else E().toast("Couldn't find a clear colour in the logo"); };
    paintBrand();
    $("bzsN").addEventListener("input", paintBrand);
    const ex = () => { const pad = +$("bzsPad").value || 4; $("bzsEx").textContent = "Next invoice: " + $("bzsIp").value + String(Math.max(1, parseInt($("bzsIn").value, 10) || 1)).padStart(pad, "0"); };
    ["bzsIp", "bzsIn", "bzsPad"].forEach((i) => $(i).oninput = ex);
    $("bzsSave").onclick = async () => {
      const row = { name: $("bzsN").value.trim() || b.name, phone: $("bzsP").value.trim() || null, email: $("bzsE").value.trim() || null, address: $("bzsA").value.trim() || null,
        bank_details: $("bzsB").value.trim() || null, default_note: $("bzsNote").value.trim() || null, signatory_name: $("bzsSig").value.trim() || null,
        invoice_prefix: $("bzsIp").value, invoice_next: Math.max(1, parseInt($("bzsIn").value, 10) || 1),
        quote_prefix: $("bzsQp").value, quote_next: Math.max(1, parseInt($("bzsQn").value, 10) || 1), number_pad: +$("bzsPad").value || 4,
        logo_path: brand.logo, brand_color: brand.color, updated_at: new Date().toISOString() };
      if ("logo_scale" in b) row.logo_scale = brand.scale;
      busy("bzsSave", true);
      try { const saved = await rows(sb().from("businesses").update(row).eq("id", b.id).select()); Object.assign(S.biz, saved[0] || row); close(); draw(); E().toast("Saved"); }
      catch (e) { busy("bzsSave", false); E().toast(e.message); }
    };
  }

  /* ---------------- printable document (owner's PDF and the customer's link) ---------------- */
  function docHTML(d) {
    const isInv = d.kind === "invoice", bal = Math.max(0, (d.total_kobo || 0) - (d.paid_kobo || 0));
    const b = d.business || {}, c = d.customer || {};
    const accent = b.brand_color || "#C6F432", onAccent = inkOn(accent);
    return `<article class="bz-paper" style="--bz-accent:${accent};--bz-on:${onAccent}">
      <header><div class="bz-pbrand">${b.logo_path ? `<img class="bz-plogo" src="${esc(b.logo_path)}" alt="${esc(b.name)} logo" style="max-height:${Math.round(64 * (Number(b.logo_scale) || 1))}px;max-width:${Math.round(220 * (Number(b.logo_scale) || 1))}px">` : ""}
        <div><h1>${esc(b.name)}</h1><p>${esc([b.address, b.phone, b.email].filter(Boolean).join(" · "))}</p></div></div>
        <div class="bz-ptitle"><h2>${isInv ? "Invoice" : "Quote"}</h2><p>${esc(d.number)}</p></div></header>
      <section class="bz-pmeta">
        <div><small>${isInv ? "Bill to" : "For"}</small><b>${esc(c.name)}</b>${c.company ? `<span>${esc(c.company)}</span>` : ""}${c.address ? `<span>${esc(c.address)}</span>` : ""}</div>
        <div><small>Date</small><b>${niceDate(d.date)}</b>${d.due_date ? `<small>${isInv ? "Due" : "Valid until"}</small><b>${niceDate(d.due_date)}</b>` : ""}</div>
        ${isInv ? `<div class="bz-pdue"><small>${d.status === "paid" ? "Paid" : "Amount due"}</small><b>${K(d.status === "paid" ? d.total_kobo : bal)}</b></div>` : ""}
      </section>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>
        ${(d.lines || []).map((l) => `<tr><td><b>${esc(l.name)}</b>${l.description ? `<br><small>${esc(l.description)}</small>` : ""}</td><td>${Number(l.quantity)}${l.unit ? " " + esc(l.unit) : ""}</td><td>${K2(l.rate_kobo)}</td><td>${K(l.amount_kobo)}</td></tr>`).join("")}
      </tbody></table>
      <section class="bz-ptot">
        ${d.discount_kobo || d.shipping_kobo || d.adjustment_kobo ? `<div><span>Subtotal</span><span>${K(d.subtotal_kobo)}</span></div>` : ""}
        ${d.discount_kobo ? `<div><span>Discount</span><span>−${K(d.discount_kobo)}</span></div>` : ""}
        ${d.shipping_kobo ? `<div><span>Delivery</span><span>${K(d.shipping_kobo)}</span></div>` : ""}
        ${d.adjustment_kobo ? `<div><span>Adjustment</span><span>${K(d.adjustment_kobo)}</span></div>` : ""}
        <div class="t"><span>Total</span><span>${K(d.total_kobo)}</span></div>
        ${isInv && d.paid_kobo ? `<div><span>Paid</span><span>−${K(d.paid_kobo)}</span></div><div class="t"><span>Balance</span><span>${K(bal)}</span></div>` : ""}
      </section>
      ${b.bank_details && isInv ? `<section class="bz-pnote"><small>How to pay</small><p>${esc(b.bank_details).replace(/\n/g, "<br>")}</p></section>` : ""}
      ${d.notes ? `<section class="bz-pnote"><p>${esc(d.notes).replace(/\n/g, "<br>")}</p></section>` : ""}
      ${d.terms ? `<section class="bz-pnote"><small>Terms</small><p>${esc(d.terms).replace(/\n/g, "<br>")}</p></section>` : ""}
      ${b.signatory_name ? `<p class="bz-psig">${esc(b.signatory_name)}</p>` : ""}
      <footer>Made with Egom · egom.ng</footer></article>`;
  }
  function printDoc(kind, d, ls) {
    const doc = { kind, number: d.number, date: d.date, due_date: kind === "invoice" ? d.due_date : d.expiry_date, status: d.status,
      notes: d.notes, terms: d.terms, subtotal_kobo: d.subtotal_kobo, discount_kobo: d.discount_kobo, shipping_kobo: d.shipping_kobo,
      adjustment_kobo: d.adjustment_kobo, total_kobo: d.total_kobo, paid_kobo: d.paid_kobo || 0, business: S.biz, customer: cust(d.customer_id), lines: ls };
    showPrint(doc, true);
  }
  function showPrint(doc, withClose) {
    injectCss();
    let wrap = $("bzPrint"); if (!wrap) { wrap = document.createElement("div"); wrap.id = "bzPrint"; document.body.appendChild(wrap); }
    wrap.innerHTML = `<div class="bz-printbar">${withClose ? `<button class="bz-btn" type="button" id="bzPrClose">${svg(P.back, 16)} Back</button>` : `<span></span>`}
      <button class="bz-btn primary" type="button" id="bzPrGo">${svg(P.pdf, 16)} Save as PDF</button></div>${docHTML(doc)}`;
    document.body.classList.add("bz-printing");
    $("bzPrGo").onclick = () => { if (E().preview) return E().toast("In the real app this saves the invoice as a PDF.");
      const t = document.title; document.title = (doc.business.name || "Egom") + " " + doc.number; window.print(); document.title = t; };
    if ($("bzPrClose")) $("bzPrClose").onclick = () => { wrap.remove(); document.body.classList.remove("bz-printing"); };
    window.scrollTo(0, 0);
  }
  // A customer opening egom.ng/?doc=… sees the document without signing in.
  async function showShared(token) {
    injectCss();
    document.body.classList.add("bz-shared");
    let wrap = $("bzPrint"); if (!wrap) { wrap = document.createElement("div"); wrap.id = "bzPrint"; document.body.appendChild(wrap); }
    wrap.innerHTML = `<div class="bz-empty">Opening…</div>`;
    document.body.classList.add("bz-printing");
    const tryLoad = async (n) => {
      if (!E() || !E().sb) { if (n > 50) throw new Error("Couldn't start. Please refresh."); await new Promise((r) => setTimeout(r, 100)); return tryLoad(n + 1); }
      const { data, error } = await E().sb.rpc("biz_shared_document", { p_token: token });
      if (error) throw new Error(cleanErr(error.message));
      return data;
    };
    try {
      if (!/^[0-9a-f-]{36}$/i.test(token)) throw new Error("This link isn't complete. Ask the sender for it again.");
      const d = await tryLoad(0);
      if (!d) throw new Error("This document isn't available. It may have been withdrawn, or the link is incomplete.");
      showPrint(d, false);
      document.title = `${d.kind === "invoice" ? "Invoice" : "Quote"} ${d.number} · ${d.business.name}`;
    } catch (e) { wrap.innerHTML = `<div class="bz-empty">${esc(e.message)}</div>`; }
  }

  /* ---------------- logo and brand colour ---------------- */
  // Readable text on a colour: dark on light colours, white on dark ones.
  function inkOn(hex) {
    const n = parseInt(String(hex || "#000000").slice(1), 16), ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? "#FFFFFF" : "#0E0E0E";
  }
  function miniHeader(name, logo, color, scale) {
    const a = color || "#C6F432", s = Number(scale) || 1;
    return `<div class="bz-minipaper"><div class="bz-row bz-gap">${logo ? `<img src="${esc(logo)}" alt="" style="height:${Math.round(26 * s)}px;max-width:${Math.round(80 * s)}px">` : ""}<b>${esc(name)}</b><span class="bz-grow"></span><small>INVOICE</small></div>
      <i style="background:${a}"></i><div class="bz-row"><small>Amount due</small><span class="bz-minidue" style="background:${a};color:${inkOn(a)}">₦480,000</span></div></div>`;
  }
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("That file isn't an image Egom can read. Try a PNG or JPG.")); im.src = src; }); }
  const readAsDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Couldn't read that file.")); r.readAsDataURL(f); });
  // Shrink the logo to at most 600 × 240 px, keeping a clear background, and keep it small enough to store.
  async function shrinkLogo(file) {
    if (file.size > 8e6) throw new Error("That image is too large. Use one under 8 MB.");
    const im = await loadImg(await readAsDataURL(file));
    const crop = trimBox(im), w0 = crop.w, h0 = crop.h;
    for (const max of [[600, 240], [420, 170], [300, 120]]) {
      const k = Math.min(1, max[0] / w0, max[1] / h0), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(crop.src, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
      for (const out of [cv.toDataURL("image/png"), cv.toDataURL("image/webp", 0.92)]) if (out.length <= 380000 && out.startsWith("data:image/")) return out;
    }
    throw new Error("Couldn't make that logo small enough. Try a simpler image.");
  }
  // Cut away empty space around the logo (see-through, or plain white when the image has no see-through parts),
  // so the logo itself fills the space it's given. Works on a copy at most 1600 px wide.
  function trimBox(im) {
    const W = im.naturalWidth || 600, H = im.naturalHeight || 240, k = Math.min(1, 1600 / W, 1600 / H);
    const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.drawImage(im, 0, 0, w, h);
    let d; try { d = c.getImageData(0, 0, w, h).data; } catch (e) { return { src: cv, x: 0, y: 0, w, h }; }
    let clear = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 16) clear++;
    const usesAlpha = clear > d.length / 16 * 0.02;
    const blank = (i) => d[i + 3] < 16 || (!usesAlpha && d[i] > 242 && d[i + 1] > 242 && d[i + 2] > 242);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!blank((y * w + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { src: cv, x: 0, y: 0, w, h };
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    return { src: cv, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // The most common strong colour in the logo (ignores white, black, greys and see-through pixels).
  async function logoColour(src) {
    if (!src) return null;
    try {
      const im = await loadImg(src), cv = document.createElement("canvas"), w = 64, h = Math.max(1, Math.round(64 * im.naturalHeight / im.naturalWidth));
      cv.width = w; cv.height = h; const x = cv.getContext("2d"); x.drawImage(im, 0, 0, w, h);
      const px = x.getImageData(0, 0, w, h).data, bins = new Map();
      for (let i = 0; i < px.length; i += 4) {
        const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]]; if (a < 200) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40 || mx < 40) continue;
        const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4); const e = bins.get(key) || [0, 0, 0, 0];
        e[0]++; e[1] += r; e[2] += g; e[3] += b; bins.set(key, e);
      }
      let best = null; bins.forEach((e) => { if (!best || e[0] > best[0]) best = e; });
      if (!best || best[0] < 8) return null;
      return "#" + [best[1], best[2], best[3]].map((v) => Math.round(v / best[0]).toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch (e) { return null; }
  }

  /* ---------------- small shared bits ---------------- */
  // Sheets: same look as the app's own, with a scrollable body we can repaint.
  let stack = null;
  function sheet(id, title, inner, onClose, tall) {
    $("sheetRoot").innerHTML = `<div class="bg" id="${id}bg"><div class="sheet bz-sheet${tall ? " tall" : ""}" id="${id}sheet" role="dialog" aria-label="${title}">
      <div class="bz-row bz-sh"><h4>${title}</h4><button class="btn" id="${id}x" type="button" aria-label="Close">${icon("close") || svg(P.x)}</button></div>
      <div id="${id}sheetbody">${inner}</div></div></div>`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; $("sheetRoot").innerHTML = ""; if (onClose) onClose(); };
    const opened = Date.now();
    $(id + "x").onclick = close;
    $(id + "bg").onclick = (e) => { if (e.target.id === id + "bg" && Date.now() - opened > 700) close(); };
    return close;
  }
  function stashSheet() {   // keep the sheet underneath (e.g. the invoice editor) and bring it back afterwards
    const nodes = [...$("sheetRoot").childNodes]; nodes.forEach((n) => n.remove());
    return () => { $("sheetRoot").innerHTML = ""; nodes.forEach((n) => $("sheetRoot").appendChild(n)); };
  }
  function confirmBox(title, text, okLabel, fn) {
    const back = stashSheet();
    const close = sheet("bzk", title, `<p class="fine">${text}</p><div class="bz-foot"><button class="bz-btn" id="bzkNo" type="button">Cancel</button><button class="bz-btn danger" id="bzkYes" type="button">${okLabel}</button></div>`, null);
    $("bzkNo").onclick = () => { close(); back(); };
    $("bzkYes").onclick = async () => { busy("bzkYes", true); try { await fn(); } catch (e) { E().toast(e.message); } finally { if ($("bzkbg")) { close(); } } };
  }
  function busy(id, on) { const b = $(id); if (!b) return; b.disabled = on; if (on) { b.dataset.t = b.innerHTML; b.textContent = "Saving…"; } else if (b.dataset.t) b.innerHTML = b.dataset.t; }

  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement("style"); s.id = "bzCss";
    s.textContent = `
.bz{display:flex;flex-direction:column;gap:12px}
.bz-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.bz-gap{gap:8px}.bz-grow{flex:1 1 0;min-width:0}
.bz-head{padding:2px 4px}.bz-head h2{margin:0;font-family:var(--display);font-size:22px;letter-spacing:-.02em}
.bz-icon{width:40px;height:40px;border-radius:50%;border:0;background:var(--glass);box-shadow:var(--glass-edge);color:var(--ink);display:grid;place-items:center;cursor:pointer}
.bz-icon.sm{width:34px;height:34px;flex:0 0 auto}
.bz-delta{margin:0;font-size:12px;font-weight:600;color:#C6F432;white-space:nowrap}.bz-delta.dn{color:#FF8A7D}
.bz-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.bz-homegrid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:4px}
.bz-hside{display:flex;flex-direction:column;gap:12px;min-width:0}
.bz-hsec{padding:16px 16px 10px}.bz-hsec h3{font-size:17px;margin:0 0 8px}.bz-hsec > .bz-row{justify-content:space-between;align-items:baseline;margin-bottom:6px}.bz-hsec > .bz-row h3{margin:0}
.bz-hlist{margin:0 -16px}.bz-hlist .tx{padding:11px 16px}
.bz-todo{display:flex;align-items:center;gap:12px;width:100%;padding:10px 0;border:0;border-top:1px solid var(--grid);background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.bz-hsec h3 + .bz-todo{border-top:0}
.bz-todo b{display:block;font-size:14px}.bz-todo small{display:block;font-size:12px;color:var(--muted);margin-top:1px}
.bz-todo-ic{flex:0 0 auto;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--raise);color:var(--ink)}
.bz-todo.late .bz-todo-ic{background:color-mix(in srgb,#FF7A6B 22%,transparent);color:var(--exp)}.bz-todo.late small{color:var(--exp)}
.bz-todo.amber .bz-todo-ic{background:color-mix(in srgb,#FFBE3D 26%,transparent);color:#C98A00}
.bz-todo-btn{flex:0 0 auto;height:32px;padding:0 13px;border-radius:999px;background:var(--ink);color:var(--bg);display:flex;align-items:center;font-size:12.5px;font-weight:700}
.bz-ok{display:flex;align-items:center;gap:8px;margin:2px 0 8px}
.bz-catbar{display:flex;align-items:center;gap:12px;padding:8px 0}
.bz-catbar .bz-row{justify-content:space-between;gap:8px}.bz-catbar b{font-size:13.5px}.bz-catbar b:first-child{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bz-catic{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center}.bz-catic .ico{width:18px;height:18px}
.bz-track{display:block;height:6px;border-radius:99px;background:var(--track);margin-top:6px;overflow:hidden}.bz-track i{display:block;height:100%;border-radius:99px}
@media (max-width:1023px){.bz-hspend{display:none}.bz-hlist .tx:nth-child(n+5){display:none}}
@media (min-width:1024px){.bz-homegrid{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start}}
.bz-grid2 .gt{min-height:156px}
.gt.bz-amber{background:#FFBE3D!important;color:#0E0E0E}
.bz-small{font-size:12px;font-weight:600}
.bz-alert{display:flex;align-items:center;gap:12px;width:100%;padding:12px 12px 12px 16px;border-radius:26px;border:0;font:inherit;text-align:left;cursor:pointer;color:var(--ink);background:color-mix(in srgb,#FF7A6B 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,#FF7A6B 34%,transparent)}
.bz-alert b{display:block;font-size:14px}.bz-alert small{display:block;font-size:12px;color:var(--exp)}
.bz-alert.bz-owe{background:color-mix(in srgb,#FFBE3D 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,#FFBE3D 34%,transparent);margin-top:10px}.bz-alert.bz-owe small{color:var(--muted)}.bz-alert.bz-owe .bz-alert-ic{background:color-mix(in srgb,#FFBE3D 26%,transparent);color:#C98A00}
.bz-alert-ic{flex:0 0 auto;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,#FF7A6B 22%,transparent);color:var(--exp)}
.bz-alert-btn{flex:0 0 auto;height:36px;padding:0 14px;border-radius:999px;background:var(--ink);color:var(--bg);display:flex;align-items:center;font-size:13px;font-weight:700}
.bz-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding-top:2px}
.bz-quick button{display:flex;flex-direction:column;align-items:center;gap:7px;border:0;background:none;color:var(--ink);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.bz-qc{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--glass);box-shadow:var(--glass-edge)}
.bz-qc.lime{color:var(--accent-ink)}
.bz-card{padding:18px}.bz-card h3{margin:0;font-family:var(--display);font-size:18px;letter-spacing:-.02em}
.bz-start .bz-btn{margin-top:12px}
.bz-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:44px;padding:0 16px;border-radius:999px;border:0;background:var(--raise);color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.bz-btn.sm{height:36px;padding:0 13px;font-size:13px}
.bz-btn.primary{background:var(--accent);color:var(--on-lime)}
.bz-btn.danger{background:var(--exp);color:#fff}
.bz-btn.wide{width:100%}.bz-btn.big{height:54px;font-size:16px;font-weight:700;margin-top:12px}
.bz-btn:disabled{opacity:.6}
.bz-link{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;padding:6px 0}.bz-link.danger{color:var(--exp)}.bz-link.wide{width:100%;margin-top:10px}
.bz-seg{display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:999px;background:var(--glass);box-shadow:var(--glass-edge)}
.bz-seg.three{grid-template-columns:repeat(3,1fr)}
.bz-seg button{height:38px;border:0;border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.bz-seg button.on{background:var(--ink);color:var(--bg)}
.bz-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.bz-stats.two{grid-template-columns:1fr 1fr;margin-bottom:4px}
.bz-stats .gcard{border-radius:20px;padding:12px 14px}
.bz-stats p{margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.bz-stats b{font-family:var(--display);font-size:18px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.bz-late{color:var(--exp)!important}.bz-paid{color:var(--accent-ink)}.bz-neg{color:var(--exp)}
.bz-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0;scrollbar-width:none}.bz-chips::-webkit-scrollbar{display:none}
.bz-chips button{flex:0 0 auto;height:34px;padding:0 14px;border-radius:999px;border:0;background:var(--glass);box-shadow:var(--glass-edge);color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.bz-chips button.on{background:var(--accent);color:var(--on-lime);box-shadow:none}
.bz-chips.small{flex-wrap:wrap;margin:6px 0}
.bz-docs{padding:4px 18px}
.bz-doc{display:flex;align-items:center;gap:12px;width:100%;padding:14px 0;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.bz-docs .bz-doc:first-child,.bz-panel .bz-doc:first-of-type{border-top:0}
.bz-doc b{display:block;font-size:15px}.bz-doc small{display:block;font-size:12px;color:var(--muted);margin-top:3px}
.bz-end{display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right}.bz-end b{font-variant-numeric:tabular-nums}
.bz-pill{display:inline-block;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;background:var(--raise);color:var(--ink-2)}
.bz-pill.paid{background:var(--accent-soft);color:var(--accent-ink)}
.bz-pill.part{background:color-mix(in srgb,#FFBE3D 20%,transparent);color:#E0A21E}
.bz-pill.late{background:color-mix(in srgb,#FF7A6B 20%,transparent);color:var(--exp)}
.bz-pill.void{opacity:.7}
.g-hero .bz-pill{background:rgba(255,255,255,.14);color:#fff}
.g-hero .bz-pill.paid{background:rgba(198,244,50,.18);color:#C6F432}
.g-hero .bz-pill.part{background:rgba(255,190,61,.2);color:#FFBE3D}
.g-hero .bz-pill.late{background:rgba(255,122,107,.22);color:#FF8A7D}
.g-hero .bz-paid{color:#C6F432}
.bz-av{flex:0 0 auto;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;background:color-mix(in srgb,#5FD3BE 20%,transparent);color:#3FB39E}
.bz-search{display:flex;align-items:center;gap:8px;height:44px;padding:0 14px;border-radius:999px;background:var(--glass);box-shadow:var(--glass-edge);color:var(--muted)}
.bz-search input{flex:1;border:0;background:none;outline:0;color:var(--ink);font:inherit}
.bz-empty{padding:40px 16px;text-align:center;color:var(--muted)}
.bz-back{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;height:34px;padding:0 12px 0 6px;border:0;border-radius:999px;background:var(--glass);box-shadow:var(--glass-edge);color:var(--ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:-4px}
.bz-empty .bz-btn{margin-top:14px}
.bz-loading{padding:30px 0;text-align:center;color:var(--muted)}
.bz-sheet.tall{max-height:94vh}
.bz-sheet h4{font-family:var(--display);letter-spacing:-.01em}
.bz-sh{margin-bottom:4px}
.bz-sheet textarea{width:100%;border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:10px 12px;font:inherit;color:inherit;resize:vertical}
.bz-sheet .opt{font-weight:500;opacity:.8}
.bz-sumcard{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.bz-sumcard .gbig{font-size:clamp(34px,10vw,46px)}
.bz-sub{margin:0;font-size:13px;color:#C9CDD1}
.bz-bar{height:10px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:8px}.bz-bar i{display:block;height:100%;border-radius:5px;background:#C6F432}
.bz-fine{font-size:12px;font-weight:500;color:#C9CDD1}.bz-fine .bz-paid{color:#C6F432}
.bz-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:8px;margin-top:10px}
.bz-acts button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:72px;border-radius:20px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.bz-panel{margin-top:14px;padding:6px 16px;border-radius:20px;background:var(--bg);border:1px solid var(--line)}
.bz-panel>.bz-row{padding:10px 0}
.bz-h5{margin:14px 0 6px;font-family:var(--display);font-size:16px;letter-spacing:-.01em;color:var(--ink)}
.bz-panel .bz-h5{margin-top:10px}
.bz-li{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line);width:100%}
.bz-li:first-child,.bz-h5+.bz-li{border-top:0}
.bz-li b{font-variant-numeric:tabular-nums}.bz-li small{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.btn-li{border-left:0;border-right:0;border-bottom:0;background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.bz-dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%;background:var(--ink)}.bz-dot.lime{background:var(--accent)}.bz-dot.hollow{background:none;border:1.5px solid var(--muted)}
.bz-tot{border-top:1px solid var(--line);padding:6px 0}.bz-tot .bz-row{padding:6px 0;font-size:14px;color:var(--ink-2)}
.bz-total{border-top:1px solid var(--line);padding-top:12px!important;font-weight:700;color:var(--ink)!important}
.bz-total span:last-child{font-family:var(--display);font-size:20px;letter-spacing:-.02em}
.bz-total.light{border-color:rgba(255,255,255,.2);color:#fff!important;margin-top:14px}
.bz-big{font-family:var(--display);font-size:32px!important;font-weight:700;letter-spacing:-.04em}
.bz-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bz-naira{display:flex;align-items:center;border:1px solid var(--line);background:var(--bg);border-radius:12px;padding-left:12px}
.bz-naira span{color:var(--muted)}.bz-naira input{border:0!important;background:none!important;padding-left:6px!important}
.bz-sheet .bz-naira input{border:0}
.bz-short{width:120px!important;flex:0 0 auto}
.bz-sheet select#bzeDt{width:auto}
.bz-line{display:flex;flex-direction:column;gap:8px;padding:12px;margin-bottom:10px;border-radius:16px;background:var(--bg);border:1px solid var(--line)}
.bz-line input{border:1px solid var(--line)}
.bz-desc{font-size:13px!important;padding:8px 10px!important}
.bz-amt{font-variant-numeric:tabular-nums;white-space:nowrap}
.bz-x{color:var(--muted)}
.bz-step{display:flex;align-items:center;border-radius:999px;background:var(--raise)}
.bz-step button{width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:var(--ink);display:grid;place-items:center;cursor:pointer}
.bz-step input{width:46px!important;border:0!important;background:none!important;text-align:center;font-weight:700;padding:0!important}
.bz-dashed{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:48px;border-radius:16px;border:1.5px dashed var(--line);background:none;color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.bz-toggle{margin-top:14px;padding:12px 14px;border-radius:16px;background:var(--bg);border:1px solid var(--line)}
.bz-toggle b{display:block}.bz-toggle small{display:block;font-size:12px;color:var(--muted)}
.bz-switch{width:50px;height:30px;padding:3px;border:0;border-radius:999px;background:var(--raise);display:flex;cursor:pointer}
.bz-switch i{width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .15s}
.bz-switch.on{background:var(--accent)}.bz-switch.on i{transform:translateX(20px)}
.bz-foot{display:grid;grid-template-columns:1fr 1.6fr;gap:10px;margin-top:16px;position:sticky;bottom:-18px;padding:12px 0 6px;background:var(--surface)}
.bz-picks{display:flex;flex-direction:column;gap:6px}
.bz-pick{display:flex!important;align-items:center;gap:12px;margin:0!important;padding:12px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--ink)!important;font-size:14px!important;font-weight:500!important}
.bz-pick input{width:20px!important;height:20px;accent-color:var(--accent)}
.bz-pick b{display:block}.bz-pick small{display:block;font-size:12px;color:var(--muted)}
.bz-legend{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--ink-2)}
.bz-legend i{width:8px;height:8px;border-radius:2px;background:var(--r3);margin-left:6px}.bz-legend i.lime{background:var(--accent)}
.bz-bars{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;align-items:end;height:150px;margin-top:14px}
.bz-bars>div{display:flex;flex-direction:column;align-items:center;gap:6px}
.bz-bars span{font-size:11px;color:var(--muted)}
.bz-bb{display:flex;align-items:flex-end;gap:3px;height:120px}.bz-bb i{width:12px;border-radius:4px;background:var(--r4)}.bz-bb i.lime{background:var(--accent)}
.bz-split{display:flex;gap:3px;margin:14px 0 4px}.bz-split i{height:12px;border-radius:6px}
.bz-sw{width:10px;height:10px;border-radius:50%}
.nd{background:var(--r3)}.l1{background:#FF7A6B}.l2{background:#E0533F}.l3{background:#B23A2B}
.bz-spend{padding:9px 0}.bz-spend .bz-row{font-size:14px}.bz-thin{height:4px;border-radius:2px;background:var(--track);margin-top:6px}.bz-thin i{display:block;height:4px;border-radius:2px;background:#B9A0FF}
.bz-addgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.bz-addgrid button{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:22px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.bz-addgrid button.lime{background:var(--accent);color:var(--on-lime);border-color:transparent}
.bz-addgrid b{display:block;font-size:15px}.bz-addgrid small{display:block;font-size:12px;opacity:.75;margin-top:2px}
.bz-limeic{color:var(--accent-ink)}
.bz-wa{margin:12px 0 4px;padding:12px 14px;border-radius:14px 14px 14px 4px;background:#DCF8C6;color:#0E0E0E;font-size:14px;line-height:1.45;overflow-wrap:anywhere}
.bz-hlogo{height:30px;max-width:90px;object-fit:contain;border-radius:6px}
.bz-brand{display:flex;align-items:center;gap:14px}
.bz-logobox{flex:0 0 auto;width:132px;height:72px;border-radius:14px;border:1px dashed var(--line);background:#fff;display:grid;place-items:center;overflow:hidden;padding:8px}
.bz-logobox img{max-width:100%;max-height:100%;object-fit:contain}.bz-logobox span{font-size:12px;color:#8A8F94}
.bz-brandbtns{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.bz-brandbtns label.bz-btn{margin:0;color:var(--ink);font-size:13px;font-weight:600;cursor:pointer}
.bz-swatches{display:flex;flex-wrap:wrap;gap:10px}
.bz-swatches button{width:34px;height:34px;border-radius:50%;border:2px solid var(--line);cursor:pointer;padding:0}
.bz-swatches button.on{outline:3px solid var(--ink);outline-offset:2px}
.bz-sheet input[type=color]{width:44px;height:34px;padding:2px;border-radius:10px;flex:0 0 auto}
.bz-mini{margin-top:12px}
.bz-minipaper{background:#fff;color:#0E0E0E;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.bz-minipaper img{height:26px;max-width:80px;object-fit:contain}.bz-minipaper small{font-size:10px;letter-spacing:.08em;color:#5F6368}
.bz-minipaper i{display:block;height:3px;border-radius:2px}
.bz-minidue{padding:4px 10px;border-radius:8px;font-weight:700;font-size:13px}
#bzPrint{display:none}
body.bz-printing #bzPrint{display:block;position:fixed;inset:0;z-index:40;overflow:auto;background:#E8EBE6;padding:16px 12px 40px}
body.bz-printing.bz-shared>*:not(#bzPrint):not(#sheetRoot){display:none!important}
.bz-printbar{max-width:794px;margin:0 auto 12px;display:flex;justify-content:space-between;gap:8px}
.bz-paper{max-width:794px;margin:0 auto;background:#fff;color:#0E0E0E;border-radius:6px;padding:40px 40px 28px;font-family:Inter,system-ui,sans-serif;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.12)}
.bz-paper{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bz-paper header{display:flex;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:3px solid var(--bz-accent,#C6F432)}
.bz-pbrand{display:flex;flex-direction:column;gap:12px}.bz-plogo{max-height:64px;max-width:220px;object-fit:contain;align-self:flex-start}
.bz-paper h1{margin:0;font-family:"Space Grotesk",Inter,sans-serif;font-size:24px;letter-spacing:-.02em}
.bz-paper header p{margin:6px 0 0;color:#4A5058;max-width:380px}
.bz-ptitle{text-align:right}.bz-ptitle h2{margin:0;font-family:"Space Grotesk",Inter,sans-serif;font-size:22px;text-transform:uppercase;letter-spacing:.06em}.bz-ptitle p{margin:4px 0 0;font-weight:700}
.bz-pmeta{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:16px;padding:20px 0}
.bz-pmeta small{display:block;color:#5F6368;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
.bz-pmeta b{display:block;font-size:14px}.bz-pmeta span{display:block;color:#4A5058}
.bz-pdue{background:var(--bz-accent,#0E0E0E);color:var(--bz-on,#fff);border-radius:10px;padding:10px 14px}.bz-pdue small{color:inherit;opacity:.75;margin-top:0}.bz-pdue b{font-family:"Space Grotesk",Inter,sans-serif;font-size:20px;color:inherit}
.bz-paper table{width:100%;border-collapse:collapse}
.bz-paper th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5F6368;padding:8px 6px;border-bottom:1px solid #E3E3DE}
.bz-paper td{padding:10px 6px;border-bottom:1px solid #EAEAE6;vertical-align:top}.bz-paper td small{color:#5F6368}
.bz-paper th:nth-child(n+2),.bz-paper td:nth-child(n+2){text-align:right;white-space:nowrap}
.bz-ptot{margin:14px 0 0 auto;max-width:300px}.bz-ptot div{display:flex;justify-content:space-between;padding:5px 0}
.bz-ptot .t{border-top:1px solid #0E0E0E;margin-top:4px;padding-top:8px;font-weight:700;font-size:15px}
.bz-pnote{margin-top:20px;padding:12px 14px;border-radius:10px;background:#F5F5F2}.bz-pnote small{color:#5F6368;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.bz-pnote p{margin:4px 0 0}
.bz-psig{margin-top:28px;font-weight:700}
.bz-paper footer{margin-top:28px;padding-top:12px;border-top:1px solid #EAEAE6;color:#8A8F94;font-size:11px;text-align:center}
@media (max-width:560px){.bz-paper{padding:24px 18px}.bz-pmeta{grid-template-columns:1fr 1fr}.bz-pdue{grid-column:1/-1}.bz-paper header{flex-direction:column}.bz-ptitle{text-align:left}}
@media print{
  body.bz-printing>*:not(#bzPrint){display:none!important}
  body.bz-printing #bzPrint{position:static;padding:0;background:#fff;overflow:visible}
  .bz-printbar{display:none!important}
  .bz-paper{box-shadow:none;border-radius:0;max-width:none;padding:0}
  @page{size:A4;margin:16mm}
}`;
    document.head.appendChild(s);
  }

  window.EgomBusiness = { render, leave, refresh, showShared, calendarExtras, openDoc: (id) => (S.purchases.some((p) => p.id === id) ? openPurchase(id) : openInvoice(id)), ensureLoaded: () => (S.ready ? Promise.resolve() : (S.loading || (S.loading = loadAll().then(() => { S.loading = null; })))), _state: S, _totals: totals, _toKobo: toKobo };
})();
