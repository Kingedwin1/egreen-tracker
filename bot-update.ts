// Egom — WhatsApp webhook (Supabase Edge Function, Deno)
//
// One shared bot number for everyone. A person signs up on the web, then links their WhatsApp
// number by sending "LINK 123456" (a code shown in the app). After that, every receipt they
// forward is scanned with the free OCR.space service, read with simple rules, filed under
// Personal or their Business, and saved to their own account.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   WHATSAPP_TOKEN            permanent System User access token from Meta
//   WHATSAPP_PHONE_NUMBER_ID  the bot number's Phone Number ID
//   WHATSAPP_VERIFY_TOKEN     any long random string; the same value goes into Meta's webhook settings
//   WHATSAPP_APP_SECRET       Meta app → App settings → Basic → App secret (checks messages really come from Meta)
//   OCR_SPACE_API_KEY         free key from ocr.space/ocrapi
//   APP_URL                   where people sign up, e.g. https://egom.ng (optional)
// SUPABASE_URL and the service key are provided by Supabase automatically.

import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

// ======================= receipt reading (inlined from receipt.ts) =======================
// Free receipt reading: OCR.space turns the image into text, then plain rules pull out
// amount, fee, date, time, payee, narration, reference and bank, and keywords pick a category.
// No AI, no paid services.

type Space = "personal" | "business";
type Preset = string; // "general", "solar", or one of BUSINESS_KINDS

const PERSONAL_CATEGORIES = ["Food & Groceries", "Eating Out", "Transport & Fuel", "Airtime & Data", "Bills & Utilities", "Rent & Housing", "Family & Support", "Giving & Church", "Shopping & Personal Care", "Health", "Entertainment", "Subscriptions", "Savings & Investment", "Bank Charges", "Other"];
const BUSINESS_CATEGORIES: Record<Preset, string[]> = {
  general: ["Stock & Inventory", "Materials & Supplies", "Staff Salaries", "Contractors & Labour", "Logistics & Delivery", "Vehicle & Fuel", "Rent & Office", "Utilities & Internet", "Marketing & Ads", "Software & Subscriptions", "Tools & Equipment", "Travel", "Professional Fees", "Taxes & Compliance", "Bank Charges", "Customer Refunds", "Other"],
  solar: ["Solar Equipment", "Installation Materials", "Installer & Labour Payouts", "Logistics & Delivery", "Vehicle & Fuel", "Staff Salaries", "Marketing & Ads", "Software & Subscriptions", "Office Rent & Upkeep", "Utilities & Internet", "Tools & Equipment", "Travel & Site Visits", "Professional Fees", "Taxes & Compliance", "Bank Charges", "Customer Refunds", "Other"],
};
// Kinds of business people can pick. Each kind adds its own categories (with keywords)
// in front of the general business list. "solar" and "general" keep their own lists above.
const BUSINESS_KINDS: [string, string][] = [
  ["retail", "Shop & retail"], ["food", "Food & restaurant"], ["fashion", "Fashion & beauty"],
  ["services", "Professional services"], ["tech", "Tech & online"], ["transport", "Transport & logistics"],
  ["agric", "Farming & agro"], ["building", "Building & real estate"], ["health", "Health & pharmacy"],
  ["education", "School & training"], ["events", "Events & media"], ["solar", "Solar & energy"],
  ["general", "Something else"],
];
const SECTORS: Record<string, { cats: Record<string, string[]>; signals: string[] }> = {
  retail: { cats: { "Packaging": ["packaging", "nylon", "nylons", "bags", "cartons", "boxes", "labels", "stickers"], "POS & Card Charges": ["pos", "pos charge", "card charge", "terminal", "settlement fee"] }, signals: ["shop", "store", "stock", "customer", "pos", "goods"] },
  food: { cats: { "Ingredients & Food Stock": ["ingredients", "foodstuff", "rice", "beans", "groundnut oil", "palm oil", "pepper", "tomatoes", "onions", "meat", "chicken", "fish", "flour", "sugar", "spices", "market"], "Gas & Cooking Fuel": ["gas", "cooking gas", "lpg", "gas refill", "charcoal", "firewood"], "Packaging": ["packaging", "takeaway", "take away", "pack", "nylon", "foil", "plates", "cups"] }, signals: ["restaurant", "kitchen", "catering", "food", "order", "customer"] },
  fashion: { cats: { "Fabrics & Materials": ["fabric", "fabrics", "ankara", "lace", "aso oke", "thread", "zip", "zips", "buttons", "lining", "material"], "Beauty Supplies": ["hair", "attachment", "wig", "braids", "relaxer", "nail", "nails", "lashes", "makeup", "cosmetics", "salon products"] }, signals: ["tailor", "salon", "boutique", "client", "customer", "fabric"] },
  services: { cats: { "Client Entertainment": ["client lunch", "client dinner", "entertainment", "refreshments"], "Training & Courses": ["course", "courses", "training", "certification", "workshop", "conference", "seminar"] }, signals: ["client", "consulting", "consultancy", "project", "invoice", "retainer"] },
  tech: { cats: { "Hosting & Cloud": ["hosting", "server", "aws", "google cloud", "azure", "vercel", "supabase", "cloudflare", "domain", "digitalocean", "firebase"], "Devices & Gadgets": ["laptop", "phone", "iphone", "macbook", "tablet", "monitor", "charger", "gadget", "gadgets"] }, signals: ["app", "software", "client", "subscription", "hosting", "developer"] },
  transport: { cats: { "Vehicle Repairs": ["mechanic", "repair", "repairs", "spare parts", "servicing", "tyre", "tyres", "vulcanizer", "brake", "engine"], "Drivers & Riders": ["driver", "drivers", "rider", "riders", "dispatch rider"], "Tolls & Levies": ["toll", "levy", "levies", "union", "park ticket", "agbero", "lcc", "permit"] }, signals: ["trip", "delivery", "dispatch", "waybill", "rider", "driver", "haulage"] },
  agric: { cats: { "Seeds & Feed": ["seed", "seeds", "seedlings", "feed", "feeds", "chicks", "fingerlings", "layers mash", "grower", "starter"], "Fertiliser & Chemicals": ["fertiliser", "fertilizer", "npk", "urea", "herbicide", "pesticide", "insecticide", "chemicals"], "Animal Health": ["vet", "veterinary", "vaccine", "vaccines", "vitamins", "medication"], "Farm Labour": ["farm hand", "farmhands", "labourers", "weeding", "harvest", "clearing"] }, signals: ["farm", "poultry", "crops", "birds", "pond", "harvest", "feed", "eggs"] },
  building: { cats: { "Building Materials": ["cement", "blocks", "sand", "granite", "iron rod", "rods", "roofing", "tiles", "paint", "plumbing", "pop", "timber", "wood"], "Site Labour": ["mason", "bricklayer", "carpenter", "plumber", "labourer", "workmanship", "iron bender", "tiler", "site work"], "Equipment Hire": ["hire", "rental", "scaffold", "scaffolding", "mixer", "excavator", "tipper"] }, signals: ["site", "project", "client", "building", "construction", "property", "tenant"] },
  health: { cats: { "Drugs & Medical Supplies": ["drugs", "medicine", "medicines", "syringes", "gloves", "consumables", "medical supplies", "test kits"], "Lab & Medical Equipment": ["lab", "laboratory", "reagents", "bp monitor", "glucometer", "medical equipment"] }, signals: ["patient", "patients", "clinic", "pharmacy", "hospital", "drugs"] },
  education: { cats: { "Teaching Materials": ["books", "textbooks", "chalk", "markers", "teaching aids", "uniforms", "stationery"], "Exam & Registration Fees": ["waec", "neco", "jamb", "exam fee", "exam fees", "registration", "accreditation"] }, signals: ["school", "student", "students", "pupils", "parents", "tuition", "fees"] },
  events: { cats: { "Equipment Hire": ["hire", "rental", "sound", "lights", "screen", "generator hire", "camera hire"], "Crew & Freelancers": ["crew", "freelancer", "freelance", "photographer", "videographer", "editor", "dj", "mc", "usher", "ushers", "sound engineer"], "Venue & Decor": ["venue", "hall", "decor", "decoration", "canopy", "chairs", "tables", "flowers", "stage"] }, signals: ["event", "client", "booking", "show", "shoot", "production", "wedding"] },
};
for (const [k, s] of Object.entries(SECTORS)) BUSINESS_CATEGORIES[k] = [...Object.keys(s.cats), ...BUSINESS_CATEGORIES.general.filter((c) => !(c in s.cats))];
// Money in gets its own short list, the same for personal and business
const INCOME_CATEGORIES = ["Salary", "Sales & Customer Payments", "Gifts & Support", "Refunds & Reversals", "Loans & Investment", "Other Income"];
const INCOME_KEYWORDS: Record<string, string[]> = {
  "Salary": ["salary", "salaries", "wage", "wages", "payroll", "stipend", "allowance", "pay"],
  "Sales & Customer Payments": ["sales", "sale", "customer", "client", "invoice", "payment for", "balance", "deposit", "job", "installation", "order", "goods", "service", "services", "project"],
  "Gifts & Support": ["gift", "birthday", "support", "upkeep", "pocket money", "love", "thanks", "thank you", "wedding", "seed", "mum", "mom", "mummy", "mother", "dad", "daddy", "father", "mama", "papa", "brother", "sister", "uncle", "aunty", "auntie", "family"],
  "Refunds & Reversals": ["refund", "reversal", "reversed", "chargeback", "returned"],
  "Loans & Investment": ["loan", "investment", "capital", "dividend", "interest", "returns", "payout", "repayment"],
};
function incomeCategory(text: string, space: Space): string {
  const t = norm(text);
  let best = "", score = 0;
  for (const [cat, words] of Object.entries(INCOME_KEYWORDS)) {
    let n = 0;
    for (const w of words) if (new RegExp(`(^|\\s)${w}(\\s|$)`).test(t)) n++;
    if (n > score) { best = cat; score = n; }
  }
  return best || (space === "business" ? "Sales & Customer Payments" : "Other Income");
}
// The right list for a row: income has its own, expenses depend on the ledger
const listFor = (space: Space, preset: Preset = "general", kind = "expense") => kind === "income" ? INCOME_CATEGORIES : categoriesFor(space, preset);
const categoriesFor = (space: Space, preset: Preset = "general") => space === "personal" ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES[preset] ?? BUSINESS_CATEGORIES.general;

// Keywords per category. Edit freely — lower-case words or phrases.
const KEYWORDS: Record<"personal" | Preset, Record<string, string[]>> = {
  solar: {
    "Solar Equipment": ["solar", "panel", "panels", "battery", "batteries", "inverter", "inverters", "lithium", "deye", "felicity", "growatt", "luminous", "mppt", "charge controller", "pv module", "jinko", "canadian solar", "pylontech"],
    "Installation Materials": ["cable", "cables", "wire", "wires", "breaker", "breakers", "mcb", "conduit", "trunking", "earthing", "earth rod", "bracket", "brackets", "rail", "rails", "mc4", "changeover", "ats", "bolts", "screws", "lugs", "dc box", "combiner", "isolator", "materials", "accessories"],
    "Installer & Labour Payouts": ["installer", "installers", "installation", "labour", "labor", "technician", "engineer", "workmanship", "payout", "welder", "electrician", "mason", "job payment", "site work"],
    "Logistics & Delivery": ["delivery", "logistics", "dispatch", "truck", "waybill", "carriage", "haulage", "loading", "offloading", "freight", "courier", "gig logistics"],
    "Vehicle & Fuel": ["fuel", "diesel", "petrol", "pms", "ago", "filling station", "total energies", "oando", "conoil", "mrs", "ardova", "nnpc", "mobil", "car", "vehicle", "van", "bus", "mechanic", "servicing", "service", "oil change", "engine oil", "tyre", "tyres", "tire", "vulcanizer", "car wash", "battery", "rav4", "parking", "generator", "gen"],
    "Staff Salaries": ["salary", "salaries", "wage", "wages", "stipend", "staff pay", "payroll", "allowance"],
    "Marketing & Ads": ["ads", "advert", "advertising", "facebook ads", "meta ads", "instagram", "google ads", "flyer", "flyers", "printing", "banner", "promo", "marketing", "influencer", "boost", "branding", "video editing"],
    "Software & Subscriptions": ["subscription", "software", "google workspace", "domain", "hosting", "zoho", "canva", "adobe", "capcut", "cpanel", "whogohost", "namecheap", "supabase", "vercel"],
    "Office Rent & Upkeep": ["office rent", "rent", "cleaning", "cleaner", "office", "furniture", "repairs", "maintenance"],
    "Utilities & Internet": ["nepa", "phcn", "ikedc", "ekedc", "electricity", "prepaid meter", "internet", "wifi", "spectranet", "starlink", "smile", "airtime", "data", "mtn", "airtel", "glo", "9mobile", "water"],
    "Tools & Equipment": ["tool", "tools", "drill", "multimeter", "ladder", "clamp meter", "crimper", "crimping", "spanner", "laptop", "printer"],
    "Travel & Site Visits": ["flight", "hotel", "travel", "trip", "site visit", "bus fare", "transport fare", "bolt", "uber", "indrive", "toll", "lcc"],
    "Professional Fees": ["lawyer", "legal", "consultant", "consultancy", "audit", "accountant", "cac", "registration fee", "professional fee"],
    "Taxes & Compliance": ["tax", "firs", "lirs", "vat remittance", "levy", "permit", "nrs", "paye", "withholding"],
    "Bank Charges": ["bank charge", "charges", "sms alert", "stamp duty", "maintenance fee", "commission", "transfer fee", "vat on"],
    "Customer Refunds": ["refund", "reversal to customer", "customer refund"],
  },
  general: {
    "Stock & Inventory": ["stock", "inventory", "goods", "wholesale", "supplier", "restock", "products", "merchandise", "resale"],
    "Materials & Supplies": ["materials", "supplies", "packaging", "nylon", "cartons", "raw materials", "ingredients", "fabric", "stationery", "printing paper"],
    "Staff Salaries": ["salary", "salaries", "wage", "wages", "stipend", "staff pay", "payroll", "allowance"],
    "Contractors & Labour": ["labour", "labor", "contractor", "technician", "artisan", "workmanship", "payout", "welder", "electrician", "plumber", "carpenter", "mason", "freelancer"],
    "Logistics & Delivery": ["delivery", "logistics", "dispatch", "rider", "truck", "waybill", "haulage", "loading", "offloading", "freight", "courier", "gig logistics"],
    "Vehicle & Fuel": ["fuel", "diesel", "petrol", "pms", "ago", "filling station", "total energies", "oando", "conoil", "mrs", "ardova", "nnpc", "mobil", "mechanic", "servicing", "oil change", "engine oil", "tyre", "tyres", "vulcanizer", "car wash", "parking", "generator", "gen"],
    "Rent & Office": ["office rent", "shop rent", "rent", "cleaning", "cleaner", "office", "shop", "furniture", "repairs", "maintenance", "service charge"],
    "Utilities & Internet": ["nepa", "phcn", "ikedc", "ekedc", "electricity", "prepaid meter", "internet", "wifi", "spectranet", "starlink", "smile", "airtime", "data", "mtn", "airtel", "glo", "9mobile", "water"],
    "Marketing & Ads": ["ads", "advert", "advertising", "facebook ads", "meta ads", "instagram", "google ads", "flyer", "flyers", "printing", "banner", "promo", "marketing", "influencer", "boost", "branding"],
    "Software & Subscriptions": ["subscription", "software", "google workspace", "domain", "hosting", "zoho", "canva", "adobe", "capcut", "cpanel", "whogohost", "namecheap", "shopify", "paystack fee"],
    "Tools & Equipment": ["tool", "tools", "equipment", "machine", "drill", "ladder", "laptop", "printer", "phone", "pos terminal"],
    "Travel": ["flight", "hotel", "travel", "trip", "bus fare", "transport fare", "bolt", "uber", "indrive", "toll", "lcc"],
    "Professional Fees": ["lawyer", "legal", "consultant", "consultancy", "audit", "accountant", "cac", "registration fee", "professional fee"],
    "Taxes & Compliance": ["tax", "firs", "lirs", "vat remittance", "levy", "permit", "nrs", "paye", "withholding"],
    "Bank Charges": ["bank charge", "charges", "sms alert", "stamp duty", "maintenance fee", "commission", "transfer fee", "vat on"],
    "Customer Refunds": ["refund", "reversal to customer", "customer refund"],
  },
  personal: {
    "Food & Groceries": ["food", "groceries", "grocery", "market", "foodstuff", "rice", "beans", "yam", "garri", "shoprite", "spar", "supermarket", "provisions", "mart", "foodco", "justrite"],
    "Eating Out": ["restaurant", "chicken republic", "kfc", "dominos", "domino", "eatery", "buka", "lunch", "dinner", "breakfast", "suya", "cafe", "chowdeck", "glovo", "pizza", "burger", "shawarma", "small chops"],
    "Transport & Fuel": ["bolt", "uber", "indrive", "fuel", "petrol", "pms", "diesel", "transport", "fare", "keke", "okada", "brt", "toll", "lcc", "cowry", "car wash", "mechanic", "vulcanizer", "filling station", "rav4", "car"],
    "Airtime & Data": ["airtime", "data", "recharge", "mtn", "airtel", "glo", "9mobile", "vtu"],
    "Bills & Utilities": ["generator", "gen", "nepa", "phcn", "ikedc", "ekedc", "electricity", "prepaid", "dstv", "gotv", "startimes", "water", "lawma", "waste", "estate dues", "service charge", "wifi", "internet", "spectranet", "starlink"],
    "Rent & Housing": ["rent", "landlord", "agent fee", "agency fee", "caution", "apartment", "house rent"],
    "Family & Support": ["mum", "mom", "mummy", "mother", "dad", "daddy", "father", "mama", "papa", "brother", "sister", "family", "support", "upkeep", "school fees", "pocket money"],
    "Giving & Church": ["tithe", "tithes", "offering", "church", "seed", "donation", "pledge", "giving", "ministry", "thanksgiving", "first fruit", "partnership"],
    "Shopping & Personal Care": ["clothes", "shoe", "shoes", "salon", "barber", "haircut", "jumia", "konga", "cosmetics", "perfume", "tailor", "laundry", "dry clean"],
    "Health": ["hospital", "pharmacy", "drug", "drugs", "clinic", "lab test", "medical", "medplus", "health"],
    "Entertainment": ["cinema", "movie", "filmhouse", "showmax", "game", "games", "outing", "club", "lounge", "concert", "ticket"],
    "Subscriptions": ["subscription", "netflix", "spotify", "apple", "icloud", "youtube", "chatgpt", "claude", "prime video", "audiomack"],
    "Savings & Investment": ["savings", "save", "piggyvest", "cowrywise", "invest", "investment", "risevest", "bamboo", "stocks", "money market", "fixed deposit"],
    "Bank Charges": ["bank charge", "charges", "sms alert", "stamp duty", "maintenance fee", "commission", "transfer fee"],
  },
};
for (const [k, sec] of Object.entries(SECTORS)) KEYWORDS[k] = { ...sec.cats, ...KEYWORDS.general };

const BANKS = ["OPay", "Moniepoint", "Kuda", "PalmPay", "GTBank", "Guaranty Trust", "Access", "Zenith", "UBA", "First Bank", "FirstBank", "Fidelity", "FCMB", "Sterling", "Wema", "ALAT", "Union Bank", "Stanbic", "Ecobank", "Polaris", "Providus", "Keystone", "Jaiz", "Carbon", "Paystack", "Flutterwave", "Paga", "Fairmoney", "VFD", "Globus", "Titan", "Lotus", "Taj", "Parallex", "Unity Bank", "Heritage", "Standard Chartered", "Citibank", "Moremonee", "Rubies"];

type ParsedTx = {
  date: string | null; time: string | null; amount: number; fee: number; currency: string;
  direction: "debit" | "credit" | "transfer"; counterparty: string; narration: string; reference: string; bank: string;
  to_bank?: string;
  category_personal: string; category_business: string; likely_space: Space | null; confidence: number;
  owner_name: string; // whose account this is: the sender for money out, the recipient for money in
  sure?: boolean;     // false when nothing on the receipt said which way the money went
  other_party?: string; // the name we'd use if the direction turns out the other way
};
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------- OCR
async function ocrSpace(apiKey: string, bytes: Uint8Array, mime: string, base64: string, engine = "2", table = true): Promise<string> {
  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("base64Image", `data:${mime};base64,${base64}`);
  form.append("language", "eng");
  form.append("OCREngine", engine);
  form.append("scale", "true");
  form.append("isTable", table ? "true" : "false");
  form.append("detectOrientation", "true");
  if (mime === "application/pdf") form.append("filetype", "PDF");
  const res = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: form });
  if (!res.ok) throw new Error(`OCR ${res.status}`);
  const data = await res.json() as { ParsedResults?: { ParsedText?: string }[]; IsErroredOnProcessing?: boolean; ErrorMessage?: string | string[] };
  if (data.IsErroredOnProcessing) throw new Error(`OCR error: ${[].concat(data.ErrorMessage as never ?? []).join(" ")}`);
  return (data.ParsedResults ?? []).map((r) => r.ParsedText ?? "").join("\n");
}

// ---------------------------------------------------------------- parsing helpers
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const NUM_RE = /(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}|\d{2,})/;
const toNum = (s: string) => Number(s.replace(/,/g, "")) || 0;

function cleanLines(text: string) {
  return text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\t+/g, "  ").replace(/\s{3,}/g, "  ").trim()).filter(Boolean);
}

// Value that follows a label, on the same line or the next one
function valueAfter(lines: string[], label: RegExp, skip?: RegExp): string {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(label);
    if (!m || m.index === undefined) continue;
    if (skip && skip.test(lines[i])) continue;
    const rest = lines[i].slice(m.index + m[0].length).replace(/^[\s:.\-–|=]+/, "").trim();
    if (rest.length >= 2) return rest;
    for (let j = i + 1; j < Math.min(lines.length, i + 3); j++) {
      if (lines[j].length >= 2 && !LABEL_ANY.test(lines[j])) return lines[j];
    }
  }
  return "";
}
const LABEL_ANY = /^(amount|transaction|date|time|status|reference|ref|session|narration|remark|description|sender|recipient|beneficiary|bank|account|fee|charge|from|to|type|channel|receipt)\b/i;

function pad(n: number) { return String(n).padStart(2, "0"); }
function validDate(y: number, m: number, d: number) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function monthIdx(s: string) { const i = MONTHS.indexOf(s.slice(0, 3).toLowerCase()); return i >= 0 ? i + 1 : 0; }
const fixYear = (y: number) => (y < 100 ? 2000 + y : y);

function findDate(text: string, defaultYear: number): string | null {
  const tries: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/, (m) => validDate(+m[1], +m[2], +m[3])],
    [/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-,.]+([A-Za-z]{3,9})[\s\-,.]+(\d{2,4})\b/, (m) => monthIdx(m[2]) ? validDate(fixYear(+m[3]), monthIdx(m[2]), +m[1]) : null],
    [/\b([A-Za-z]{3,9})[\s\-.]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-]+(\d{4})\b/, (m) => monthIdx(m[1]) ? validDate(+m[3], monthIdx(m[1]), +m[2]) : null],
    [/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/, (m) => {
      let d = +m[1], mo = +m[2]; const y = fixYear(+m[3]);
      if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // month-first slip
      return validDate(y, mo, d);
    }],
    [/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([A-Za-z]{3,9})\b/, (m) => monthIdx(m[2]) ? validDate(defaultYear, monthIdx(m[2]), +m[1]) : null],
  ];
  for (const [re, fn] of tries) {
    const m = text.match(re);
    if (m) { const v = fn(m); if (v) return v; }
  }
  return null;
}
function findTime(text: string): string | null {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\b/);
  if (!m) return null;
  let h = +m[1]; const min = +m[2];
  if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

function amountIn(s: string) { const m = s.replace(/\s(?=\d{3}\b)/g, "").match(NUM_RE); return m ? toNum(m[1]) : 0; }

function findAmount(lines: string[], text: string) {
  // 1) labelled amount
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(transaction amount|amount paid|amount sent|amount debited|debit amount|total amount|amount|total|sum|grand total)\s*[:\-\t]?\s*(?:₦|NGN|N|#)?\s*[\d,.]*\s*$/i.test(lines[i]) && !/\b(fee|charge|vat|balance|commission|stamp)\b/i.test(lines[i])) {
      const v = amountIn(lines[i].replace(/^.*?(amount|total|sum)/i, "")) || (lines[i + 1] ? amountIn(lines[i + 1]) : 0);
      if (v > 0) return v;
    }
  }
  // 2) first number with a currency mark (OCR often reads ₦ as N, # or H)
  const cur = text.match(/(?:₦|NGN|N|#|H)\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{2})?)/);
  if (cur) return toNum(cur[1]);
  // 3) largest money-looking number
  const all = [...text.matchAll(/\b(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})\b/g)].map((m) => toNum(m[1]));
  return all.length ? Math.max(...all) : 0;
}
function findFee(lines: string[]) {
  for (const l of lines) {
    if (/\b(fee|fees|charge|charges|commission|stamp duty)\b/i.test(l) && !/\bfree\b/i.test(l)) {
      const v = amountIn(l.replace(/^.*?(fee|fees|charge|charges|commission|duty)/i, ""));
      if (v > 0 && v < 100000) return v;
    }
  }
  return 0;
}
function cleanName(s: string) {
  return s.split(/\s*[|•·]\s*|\s{2,}/)[0]
    .replace(/\([^)]*\)/g, "").replace(/\b\d{6,}\b/g, "").replace(/\*{2,}\d*/g, "").replace(/[()]/g, "")
    .replace(/\b(name|account|acct|details?)\b[:\s]*/gi, "").trim().slice(0, 80);
}

// ---------------------------------------------------------------- categorising
function hits(text: string, words: string[]) {
  let n = 0;
  for (const w of words) if (new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)) n++;
  return n;
}
function categorize(space: Space, text: string, preset: Preset = "general"): { category: string; score: number } {
  const t = norm(text);
  let best = "Other", score = 0;
  for (const [cat, words] of Object.entries(KEYWORDS[space === "personal" ? "personal" : (KEYWORDS[preset] ? preset : "general")])) {
    const h = hits(t, words);
    if (h > score) { best = cat; score = h; }
  }
  return { category: best, score };
}
// Words that point clearly to the business
const BUSINESS_SIGNALS: Record<Preset, string[]> = {
  general: ["client", "customer", "supplier", "stock", "inventory", "wholesale", "logistics", "salary", "salaries", "staff", "office", "shop", "materials", "waybill", "invoice", "contractor"],
  solar: ["solar", "panel", "panels", "inverter", "inverters", "battery", "batteries", "installer", "installation", "client", "customer", "site", "logistics", "salary", "salaries", "deye", "lithium", "office", "materials", "waybill"],
};
for (const [k, sec] of Object.entries(SECTORS)) BUSINESS_SIGNALS[k] = [...new Set([...BUSINESS_SIGNALS.general, ...sec.signals])];

function guessSpace(text: string, preset: Preset, businessName = ""): Space | null {
  const t = norm(text);
  const own = norm(businessName).split(" ").filter((w) => w.length > 2);
  if (hits(t, BUSINESS_SIGNALS[preset] ?? BUSINESS_SIGNALS.general) > 0 || (own.length && hits(t, own) > 0)) return "business";
  const p = categorize("personal", t);
  if (p.score > 0 && ["Food & Groceries", "Eating Out", "Family & Support", "Giving & Church", "Shopping & Personal Care", "Health", "Entertainment", "Rent & Housing"].includes(p.category)) return "personal";
  return null;
}

// Which ledger a receipt belongs to, from the account holder's name on it.
// personalName: e.g. "Ada Obi" (every word must appear, any order). businessName: e.g. "Ada Foods".
const NAME_FILLER = new Set(["ltd", "limited", "plc", "nig", "nigeria", "enterprises", "enterprise", "ventures", "global", "services", "the", "and", "co", "company", "concept", "concepts", "innovative", "int", "international"]);
function spaceFromOwner(owner: string, personalName: string, businessName: string): Space | null {
  const o = norm(owner);
  if (!o) return null;
  // Business: its distinctive words must appear (so "Ada Foods" matches "ADA FOODS LIMITED")
  const allBw = norm(businessName).split(" ").filter((w) => w.length > 1);
  const bw = allBw.filter((w) => !NAME_FILLER.has(w)).length ? allBw.filter((w) => !NAME_FILLER.has(w)) : allBw;
  if (bw.length && bw.every((w) => new RegExp(`(^|\\s)${w}`).test(o))) return "business";
  const pn = norm(personalName).split(" ").filter((w) => w.length > 1);
  if (pn.length && pn.every((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(o))) return "personal";
  return null;
}

type ParseOpts = { preset?: Preset; businessName?: string; personalName?: string; extraNames?: string[] };
function finish(base: Omit<ParsedTx, "category_personal" | "category_business" | "likely_space" | "confidence">, opts: ParseOpts = {}): ParsedTx {
  const preset = opts.preset ?? "general";
  const basis = `${base.narration} ${base.counterparty}`;
  if (base.direction === "transfer") return { ...base, category_personal: "", category_business: "", likely_space: null, confidence: 0.8 };
  if (base.direction === "credit") {
    // Money from your own business into your pocket (e.g. salary from your company) is personal income
    const fromOwnBiz = !!opts.businessName && spaceFromOwner(base.counterparty, "", opts.businessName) === "business";
    return { ...base, category_personal: incomeCategory(basis, "personal"), category_business: incomeCategory(basis, "business"), likely_space: fromOwnBiz ? "personal" : guessSpace(basis, preset, opts.businessName), confidence: 0.6 };
  }
  const p = categorize("personal", basis), b = categorize("business", basis, preset);
  return { ...base, category_personal: p.category, category_business: b.category, likely_space: guessSpace(basis, preset, opts.businessName), confidence: Math.max(p.score, b.score) > 0 ? 0.7 : 0 };
}
// Recompute categories after the direction is corrected
function recategorise(t: ParsedTx, direction: "debit" | "credit", counterparty: string, opts: ParseOpts = {}): ParsedTx {
  return finish({ ...t, direction, counterparty }, opts);
}

// ---------------------------------------------------------------- who sent, who received
// Receipts put the two people in blocks: "Sender / From / Sender details" and
// "Recipient / Beneficiary / To / Receiver". Each block has a name and usually a bank.
const BANK_ALIASES: [RegExp, string][] = [
  [/\bmonie\s*point\b|\bmoniepoint\b|\bteamapt\b/i, "Moniepoint"], [/\bo\s?pay\b|\bpaycom\b/i, "OPay"], [/\bpalm\s?pay\b/i, "PalmPay"],
  [/\bkuda\b/i, "Kuda"], [/\bgt\s?bank\b|\bguaranty\s+trust\b|\bgtco\b/i, "GTBank"], [/\baccess\b/i, "Access"], [/\bzenith\b/i, "Zenith"],
  [/\buba\b|\bunited bank for africa\b/i, "UBA"], [/\bfirst\s?bank\b|\bfirst bank of nigeria\b|\bfbn\b/i, "First Bank"], [/\bfidelity\b/i, "Fidelity"],
  [/\bfcmb\b|\bfirst city monument\b/i, "FCMB"], [/\bsterling\b/i, "Sterling"], [/\bwema\b|\balat\b/i, "Wema"], [/\bunion bank\b/i, "Union Bank"],
  [/\bstanbic\b/i, "Stanbic"], [/\becobank\b/i, "Ecobank"], [/\bpolaris\b/i, "Polaris"], [/\bprovidus\b/i, "Providus"], [/\bkeystone\b/i, "Keystone"],
  [/\bjaiz\b/i, "Jaiz"], [/\bcarbon\b/i, "Carbon"], [/\bpaystack\b/i, "Paystack"], [/\bflutterwave\b/i, "Flutterwave"], [/\bpaga\b/i, "Paga"],
  [/\bfair\s?money\b/i, "FairMoney"], [/\bvfd\b|\bv bank\b|\bvbank\b/i, "VFD"], [/\bglobus\b/i, "Globus"], [/\btitan\b/i, "Titan"],
  [/\blotus\b/i, "Lotus"], [/\btaj\s?bank\b/i, "TAJBank"], [/\bparallex\b/i, "Parallex"], [/\bunity bank\b/i, "Unity Bank"], [/\bheritage\b/i, "Heritage"],
  [/\bstandard chartered\b/i, "Standard Chartered"], [/\bciti\s?bank\b/i, "Citibank"], [/\bmoremonee\b/i, "Moremonee"], [/\brubies\b/i, "Rubies"],
  [/\bsmartcash\b/i, "SmartCash"], [/\bmomo\b|\bmtn momo\b/i, "MoMo"], [/\bpocketapp\b|\bpocket by piggyvest\b/i, "Pocket"], [/\bkredi\b/i, "Kredi"],
];
function bankIn(s: string): string {
  for (const [re, name] of BANK_ALIASES) if (re.test(s)) return name;
  return "";
}
const SENDER_LABEL = /^(?:received\s+from|sender(?:'s)?(?:\s+(?:name|details|account(?:\s+name)?|info))?|from(?:\s+account)?|source(?:\s+account)?|debit(?:ed)?\s+account|originator(?:\s+name)?|paid\s+by|payer(?:\s+name)?|account\s+debited|transferred\s+by|sent\s+by)\b\s*[:\-|]?/i;
const RECIP_LABEL = /^(?:recipient(?:'s)?(?:\s+(?:name|details|account(?:\s+name)?|info))?|beneficiary(?:\s+(?:name|details|account(?:\s+name)?|info))?|receiver(?:\s+(?:name|details))?|to(?:\s+account)?|destination(?:\s+account)?|credit(?:ed)?\s+(?:account|to)|paid\s+to|sent\s+to|transfer(?:red)?\s+to|payee(?:\s+name)?|account\s+credited)\b\s*[:\-|]?/i;
const SENDER_BANK = /^(?:sender(?:'s)?\s+bank|from\s+bank|source\s+bank|originator\s+bank|debit\s+bank)\b\s*[:\-|]?/i;
const RECIP_BANK = /^(?:recipient(?:'s)?\s+bank|beneficiary(?:'s)?\s+bank|receiver(?:'s)?\s+bank|to\s+bank|destination\s+bank|credit\s+bank|bank\s+name)\b\s*[:\-|]?/i;
const STOP_LABEL = /^(amount|transaction|date|time|status|reference|ref|session|narration|remarks?|description|purpose|fee|charges?|type|channel|receipt|payment|note|memo|currency|total|vat|stamp|balance|support|download|share|report|this receipt|disclaimer|thank)/i;

type Party = { name: string; bank: string };
// A person's name from a line like "EMEKA JOHN | Moniepoint | 801***1234" or "Emeka John 0123456789 OPay"
function nameFrom(s: string): string {
  let t = String(s || "");
  for (const [re] of BANK_ALIASES) t = t.replace(re, " ");
  t = t.replace(/\b(micro[-\s]?finance|mfb|bank|plc|limited liability)\b\.?/gi, " ")
    .replace(/[*xX]{2,}\d*/g, " ").replace(/\d[\d*\s-]{4,}\d/g, " ").replace(/\b\d+\b/g, " ")
    .replace(/[|•·,:;()\[\]]/g, " ").replace(/\b(name|account|acct|details?|no\.?|number)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  // OCR can tack a stray letter or two onto the end
  return t.replace(/\s+[a-z]$/i, "").slice(0, 80);
}
function block(lines: string[], label: RegExp, bankLabel: RegExp): Party {
  let name = "", bank = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (bankLabel.test(l)) { const b = bankIn(l.replace(bankLabel, "")) || bankIn(lines[i + 1] ?? ""); if (b) bank = b; continue; }
    const m = l.match(label);
    if (!m || name) continue;
    const rest = l.slice(m[0].length).trim();
    const window = [rest, ...lines.slice(i + 1, i + 4).filter((x, k, arr) => !arr.slice(0, k + 1).some((y) => STOP_LABEL.test(y) || SENDER_LABEL.test(y) || RECIP_LABEL.test(y)))];
    for (const w of window) {
      if (!name) { const n = nameFrom(w); if (n.length >= 3 && /[a-z]{2}/i.test(n)) name = n; }
      if (!bank) bank = bankIn(w);
    }
  }
  return { name, bank };
}
// The app that made the receipt: its name sits in the first lines or in the footer
function issuer(lines: string[]): string {
  const head = lines.slice(0, 4).join(" "), foot = lines.slice(-4).join(" ");
  return bankIn(head) || (/\b(powered by|thank you for (?:banking|choosing|using))\b/i.test(foot) ? bankIn(foot) : "");
}
const nameMatches = (party: string, names: string[]) => !!party && names.some((n) => {
  const w = norm(n).split(" ").filter((x) => x.length > 1 && !NAME_FILLER.has(x));
  const o = norm(party);
  return w.length > 0 && w.every((x) => new RegExp(`(^|\\s)${x}`).test(o));
});

// ---------------------------------------------------------------- main parsers
function parseReceiptText(text: string, today: string, opts: ParseOpts = {}): ParsedTx | null {
  const lines = cleanLines(text);
  const flat = lines.join("\n");
  const amount = findAmount(lines, flat);
  if (!(amount > 0)) return null;

  const dateLine = valueAfter(lines, /\b(transaction date|date\s*(?:&|and)?\s*time|payment date|value date|date)\b/i);
  const date = findDate(dateLine, +today.slice(0, 4)) ?? findDate(flat, +today.slice(0, 4));
  const time = findTime(dateLine) ?? findTime(flat);

  const sender = block(lines, SENDER_LABEL, SENDER_BANK);
  const recip = block(lines, RECIP_LABEL, RECIP_BANK);
  const madeBy = issuer(lines);

  // Which way did the money go? Names first: if the receiver is you, it's money in.
  const mine = [opts.personalName ?? "", opts.businessName ?? "", ...(opts.extraNames ?? [])].filter((n) => n.trim());
  const senderMe = nameMatches(sender.name, mine), recipMe = nameMatches(recip.name, mine);
  const creditWords = /\b(money received|you received|you have received|received from|credit alert|credited|incoming|inward|deposit|cr\b|credit transaction|payment received|transfer received|you got)\b/i.test(flat);
  const debitWords = /\b(debit alert|debited|you sent|you paid|transfer successful|transfer to|sent to|paid to|outward|withdrawal|purchase|airtime|data bundle|bill payment|pos purchase|dr\b|debit transaction)\b/i.test(flat);
  let direction: "debit" | "credit" | "transfer", sure = true;
  if (senderMe && recipMe) direction = "transfer";
  else if (recipMe) direction = "credit";
  else if (senderMe) direction = "debit";
  else if (creditWords && !debitWords) direction = "credit";
  else if (debitWords && !creditWords) direction = "debit";
  else { direction = "debit"; sure = !(sender.name && recip.name); }

  // The other party, and which of YOUR accounts the money moved through
  let counterparty: string, other: string, bank: string, to_bank = "", owner: string;
  if (direction === "credit") {
    counterparty = sender.name; other = recip.name; owner = recip.name;
    bank = recip.bank || (creditWords ? madeBy : "") || "";
  } else if (direction === "transfer") {
    counterparty = recip.bank || recip.name; other = sender.name; owner = sender.name;
    bank = sender.bank || madeBy || ""; to_bank = recip.bank || "";
  } else {
    counterparty = recip.name; other = sender.name; owner = sender.name;
    // The receipt's own app is the sender's bank on a transfer receipt; never the receiver's bank
    bank = sender.bank || (madeBy && madeBy !== recip.bank ? madeBy : "") || (!recip.bank ? madeBy : "");
    // A card slip names the card's bank somewhere on it
    if (!bank && !sender.name && !recip.name) bank = bankIn(flat);
  }
  // Shop receipts and POS slips have no blocks: fall back to the merchant line
  if (!counterparty) counterparty = cleanName(valueAfter(lines, /\b(merchant(?: name)?|biller|account name|paid to|to)\b/i, SENDER_LABEL));

  const narration = valueAfter(lines, /^(?:narration|remarks?|description|purpose|payment for|memo|note|transfer note|comment)\b/i)
    .replace(/^[:\-\s]+/, "").replace(/\s{2,}/g, " ").slice(0, 200);

  const refRaw = valueAfter(lines, /\b(session id|transaction (?:reference|ref|id|no\.?|number)|reference(?: no\.?| number| id)?|ref(?:\.|erence)?\s*(?:no\.?|#)?|receipt (?:no\.?|number))\b/i);
  const reference = (refRaw.replace(/\s/g, "").match(/[A-Za-z0-9\-/]{6,}/)?.[0] ?? "").slice(0, 60);

  return { ...finish({
    date: date ?? today, time, amount, fee: direction === "credit" ? 0 : findFee(lines), currency: "NGN",
    direction, counterparty, narration, reference, bank, to_bank, owner_name: owner,
  }, opts), sure, other_party: other };
}

// ---------------------------------------------------------------- typed messages, in plain words
// Money out:  "5000 fuel", "I paid Emeka 20k for transport", "bought cables 45,000", "sent mum 10k"
// Money in:   "+50000 from Mr Ade", "Mr Ade paid me 450k for the Lekki job", "received 150k salary",
//             "sold 2 panels to Tunde for 380k", "customer paid 200k balance", "got 20k from mum"
const IN_CUES = /\b(received|recieved|recived|got|collected|earned|made|sold|income|credit(?:ed)?|deposit(?:ed)?|money in|paid me|sent me|transferred to me|gave me|refunded|refund from|reversal|customer paid|client paid)\b/i;
const OUT_CUES = /\b(paid|pay|spent|spend|bought|buy|purchased|sent|send|gave|give|transferred|transfer|withdrew|withdrawal|debited|cost|bill)\b/i;
const WORDNUM: Record<string, number> = { thousand: 1e3, k: 1e3, grand: 1e3, million: 1e6, m: 1e6, mil: 1e6, billion: 1e9, b: 1e9 };
function findTypedAmount(text: string): { amount: number; at: number; len: number } | null {
  const re = /(?:₦|ngn|\bn(?=\d)|#)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|m|b|mil|thousand|million|billion|grand)?(?![\w])(?:\s*naira)?/gi;
  let best: { amount: number; at: number; len: number } | null = null;
  for (const m of text.matchAll(re)) {
    let v = toNum(m[1]);
    const unit = (m[2] ?? "").toLowerCase();
    if (unit) v *= WORDNUM[unit] ?? 1;
    // A small number right before a word like "panels" or "bags" is a count, not money
    const after = text.slice((m.index ?? 0) + m[0].length);
    if (!unit && v < 100 && !/naira|[₦#]|ngn/i.test(m[0]) && /^\s+[a-z]/i.test(after) && !/^\s+(naira|k\b|thousand)/i.test(after)) continue;
    if (!(v > 0)) continue;
    // A bare small number ("job 2", "phase 3") isn't money unless it's marked as money
    if (!unit && v < 50 && !/[₦#]|ngn|naira/i.test(m[0] + after.slice(0, 7))) continue;
    if (!best || v > best.amount) best = { amount: v, at: m.index ?? 0, len: m[0].length };
  }
  return best;
}
const RELATIVE_DAY: [RegExp, number][] = [[/\byesterday\b/i, -1], [/\btoday\b/i, 0], [/\b(?:2|two) days ago\b/i, -2]];
function shiftDay(today: string, d: number) { const t = new Date(today + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
const NAME_RE = "((?:(?:mr|mrs|ms|miss|dr|engr|chief|alhaji|madam|aunty|uncle|pastor|bro|sis|prof|barr?)\\.?\\s+)?[A-Za-z][\\w.&'-]*(?:\\s+(?!for\\b|to\\b|from\\b|on\\b|at\\b|as\\b|being\\b|via\\b|with\\b|today\\b|yesterday\\b|naira\\b)[A-Za-z][\\w.&'-]*){0,3})";
function parseManual(text: string, today: string, opts: ParseOpts = {}): ParsedTx | null {
  const raw = text.replace(/\s+/g, " ").trim();
  const plus = /^\s*\+/.test(raw);
  const body = raw.replace(/^\s*[+-]\s*/, "");
  const amt = findTypedAmount(body);
  if (!amt) return null;
  // Must read like money: the number leads, or there's a money word nearby
  const leads = amt.at <= 2;
  if (!leads && !IN_CUES.test(body) && !OUT_CUES.test(body) && !/₦|naira|\bngn\b|\d\s*k\b/i.test(body)) return null;
  const amount = amt.amount;
  const before = body.slice(0, amt.at).trim(), after = body.slice(amt.at + amt.len).trim();
  // "Chief Okafor sent 1.2m" / "Tunde transferred 50k": someone else did the paying, so it's money in
  const theyPaid = new RegExp(`^${NAME_RE}\\s+(?:has\\s+|just\\s+)?(?:paid|sent|transferred|gave)\\b`, "i").exec(body);
  const someoneElse = !!theyPaid && !/^(i|we|i've|i have|we have|just)\b/i.test(body);
  const income = plus || someoneElse || IN_CUES.test(body) && !/\b(i paid|i sent|i gave|i bought|i spent|paid to|sent to)\b/i.test(body);
  const date = RELATIVE_DAY.find(([re]) => re.test(body));
  let who = "", m: RegExpMatchArray | null;
  const S = (re: string) => new RegExp(re, "i");
  if (income) {
    if ((m = body.match(S(`\\bfrom\\s+${NAME_RE}`)))) who = m[1];
    else if ((m = body.match(S(`^${NAME_RE}\\s+(?:paid|sent|gave|transferred)(?:\\s+me)?\\b`)))) who = m[1];
    else if ((m = body.match(S(`\\bsold\\b.*?\\bto\\s+${NAME_RE}`)))) who = m[1];
    else if ((m = body.match(S(`\\b(?:customer|client)\\s+${NAME_RE}\\s+paid\\b`)))) who = m[1];
  } else {
    if ((m = body.match(S(`\\b(?:paid|sent|gave|transferred|transfer)\\s+(?:to\\s+)?${NAME_RE}\\s+(?=\\S*\\d)`)))) who = m[1];
    else if ((m = body.match(S(`\\b(?:to|paid)\\s+${NAME_RE}`)))) who = m[1];
    else if ((m = body.match(/\b(?:at|from)\s+([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*)/))) who = m[1];
  }
  who = who.replace(/^(i|we|my|the|a)\s+/i, "").replace(/\s+(me|for|to)$/i, "").trim();
  if (/^(i|me|we|it|them|him|her|you|customer|client|someone|somebody)$/i.test(who) || /\d/.test(who)) who = "";
  // What it was for: everything that isn't the amount, the person or the filler words
  const ledgerWords = new RegExp(`\\b(personal|biz|business${opts.businessName ? "|" + norm(opts.businessName).split(" ").filter((w) => w.length > 2).join("|") : ""})\\b`, "gi");
  let narration = `${before} ${after}`.replace(who ? new RegExp(who.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : /$^/, " ")
    .replace(/^\s*(i|we)\b/i, " ").replace(IN_CUES, " ").replace(/\b(i|we|just|have|has|had|was|were|me|my|naira|ngn|today|yesterday|two days ago|2 days ago|from|to|the|for|on|of|a|an)\b/gi, " ")
    .replace(/\b(paid|pay|spent|spend|bought|buy|purchased|sent|send|gave|give|transferred|transfer)\b/gi, " ")
    .replace(ledgerWords, " ").replace(/[₦#]/g, " ").replace(/\s+/g, " ").replace(/^[\s:,–-]+|[\s:,–-]+$/g, "").trim();
  // Keep "for ..." intact when there is one: it reads better
  const forPart = body.match(/\bfor\s+(?:the\s+)?(.+?)$/i)?.[1]?.replace(/(?:₦|#)?\s?\d[\d,.]*\s*(k|m|thousand|million)?\b/gi, "").replace(ledgerWords, "").trim();
  if (forPart && forPart.length > 2 && !forPart.toLowerCase().startsWith((who || "§").toLowerCase())) narration = forPart;
  return finish({
    date: date ? shiftDay(today, date[1]) : today, time: null, amount, fee: 0, currency: "NGN",
    direction: income ? "credit" : "debit", counterparty: who.slice(0, 80), narration: narration.slice(0, 200), reference: "", bank: "", owner_name: "",
  }, opts);
}

// ======================= bot =======================

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const WA_TOKEN = env("WHATSAPP_TOKEN");
const PHONE_ID = env("WHATSAPP_PHONE_NUMBER_ID");
const VERIFY_TOKEN = env("WHATSAPP_VERIFY_TOKEN");
const APP_SECRET = env("WHATSAPP_APP_SECRET");
const OCR_KEY = env("OCR_SPACE_API_KEY");
const APP_URL = env("APP_URL", "https://egom.ng");
const GRAPH = "https://graph.facebook.com/v25.0";
const MAX_FILE_BYTES = 1_000_000; // OCR.space free-plan limit

// Service key: older projects expose SUPABASE_SERVICE_ROLE_KEY, newer ones SUPABASE_SECRET_KEYS (JSON)
function serviceKey() {
  const raw = env("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { const o = JSON.parse(raw); const k = String(o.default ?? Object.values(o)[0] ?? ""); if (k) return k; } catch { if (raw.startsWith("sb_")) return raw; }
  }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
const sb = createClient(env("SUPABASE_URL"), serviceKey(), { auth: { persistSession: false } });

// The signed-up person behind a WhatsApp number
type Profile = {
  user_id: string; full_name: string | null; has_business: boolean; business_name: string | null;
  business_preset: Preset; whatsapp: string | null;
  home_prefs?: { cats?: Record<string, string[]>; cat_map?: Record<string, Record<string, string>> } | null;
};
// The user's own category list (they can add, rename and remove them in the app)
function catList(p: Profile, space: Space, kind = "expense"): string[] {
  const own = p.home_prefs?.cats?.[space];
  return kind !== "income" && Array.isArray(own) && own.length ? own : listFor(space, p.business_preset, kind);
}
// A built-in category the user renamed or removed maps to their name for it (or Other)
function mapCat(p: Profile, space: Space, c: string | null | undefined, kind = "expense"): string | null {
  if (!c) return null;
  const m = p.home_prefs?.cat_map?.[space]?.[c] ?? c;
  return catList(p, space, kind).includes(m) ? m : null;
}
const bizLabel = (p: Profile) => (p.business_name?.trim() || "Business");
const label = (p: Profile, s: Space) => (s === "personal" ? "Personal" : bizLabel(p));
const otherSpace = (s: Space): Space => (s === "personal" ? "business" : "personal");

// ---------------------------------------------------------------- helpers
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n: number) => naira.format(Number(n) || 0);
const normKey = norm;
const lagosNow = () => new Date(Date.now() + 60 * 60 * 1000); // UTC+1, no DST
const todayISO = () => lagosNow().toISOString().slice(0, 10);
function prettyDate(iso?: string | null, time?: string | null) {
  if (!iso) return "no date";
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return time ? `${s}, ${String(time).slice(0, 5)}` : s;
}
function bizWords(p: Profile) {
  return norm(p.business_name).split(" ").filter((w) => w.length > 2 && !["ltd", "limited", "the", "and", "nig", "nigeria"].includes(w));
}
function spaceFromText(p: Profile, t: string): Space | null {
  const s = normKey(t);
  if (!p.has_business) return null;
  const words = ["biz", "business", "company", "office", "work", ...bizWords(p)];
  if (words.some((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(s))) return "business";
  if (/\b(personal|me|mine|private|home)\b/.test(s)) return "personal";
  return null;
}
function matchCategory(p: Profile, space: Space, q: string, kind = "expense"): string | null {
  const n = normKey(q);
  if (!n) return null;
  const list = catList(p, space, kind);
  return list.find((c) => normKey(c) === n) ??
    list.find((c) => normKey(c).startsWith(n)) ??
    list.find((c) => normKey(c).includes(n)) ??
    list.find((c) => n.split(" ").some((w) => w.length > 2 && normKey(c).includes(w))) ?? null;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function validSignature(raw: string, header: string | null) {
  if (!APP_SECRET) { console.error("WHATSAPP_APP_SECRET is not set — rejecting"); return false; }
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqualHex(hex, header.slice(7));
}

// ---------------------------------------------------------------- WhatsApp API
async function waSend(payload: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) console.error("WhatsApp send failed", res.status, (await res.text()).slice(0, 500));
}
// Blue ticks plus "typing…" while a receipt is read, so people know it landed
const markReading = (msgId: string) => waSend({ status: "read", message_id: msgId, typing_indicator: { type: "text" } });
const sendText = (to: string, body: string) => waSend({ to, type: "text", text: { body: body.slice(0, 4000), preview_url: false } });
const sendButtons = (to: string, body: string, buttons: { id: string; title: string }[]) =>
  waSend({
    to, type: "interactive",
    interactive: { type: "button", body: { text: body.slice(0, 1000) }, action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) } },
  });
async function downloadMedia(mediaId: string) {
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
  if (!meta.ok) throw new Error(`media lookup ${meta.status}`);
  const info = await meta.json() as { url: string; mime_type: string; file_size?: number };
  if (info.file_size && info.file_size > MAX_FILE_BYTES) throw new Error("too_large");
  const file = await fetch(info.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
  if (!file.ok) throw new Error(`media download ${file.status}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) throw new Error("too_large");
  return { bytes, mime: (info.mime_type || "").split(";")[0].trim() };
}

// ---------------------------------------------------------------- accounts & linking
async function profileFor(number: string): Promise<Profile | null> {
  const { data, error } = await sb.from("profiles").select("user_id, full_name, has_business, business_name, business_preset, whatsapp, home_prefs").eq("whatsapp", number).maybeSingle();
  if (error) throw new Error("profile lookup: " + error.message);
  return data as Profile | null;
}

// "LINK 123456" from a phone proves the person owns that WhatsApp number
async function tryLink(from: string, text: string): Promise<boolean> {
  const m = text.trim().match(/^link\s*:?\s*(\d{6})$/i);
  if (!m) return false;
  const { data: code } = await sb.from("link_codes").select("code, user_id, expires_at").eq("code", m[1]).maybeSingle();
  if (!code || new Date(code.expires_at).getTime() < Date.now()) {
    await sendText(from, `That code has expired or isn't right. Open ${APP_URL}, go to *Link WhatsApp* and get a new one.`);
    return true;
  }
  const existing = await profileFor(from);
  if (existing && existing.user_id !== code.user_id) {
    await sendText(from, "This WhatsApp number is already linked to another Egom account. Unlink it there first (Settings → WhatsApp), then send the code again.");
    return true;
  }
  const { data: prof, error } = await sb.from("profiles")
    .update({ whatsapp: from, whatsapp_linked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", code.user_id).select("user_id, full_name, has_business, business_name, business_preset, whatsapp").single();
  if (error) { console.error("link failed", error); await sendText(from, "Sorry, I couldn't link your number just now. Please try again."); return true; }
  await sb.from("link_codes").delete().eq("user_id", code.user_id);
  const p = prof as Profile;
  await sendText(from, `Linked. Hi${p.full_name ? " " + p.full_name.split(" ")[0] : ""}, this number now saves to your Egom account.\n\n${help(p)}`);
  return true;
}

let lastNudge = new Map<string, number>();
async function nudgeSignup(from: string) {
  // Don't flood someone who keeps messaging before signing up
  const t = lastNudge.get(from) ?? 0;
  if (Date.now() - t < 10 * 60 * 1000) return;
  lastNudge.set(from, Date.now());
  await sendText(from, `Hi, I'm *Egom*. I keep track of your money from your receipts.\n\nThis number isn't linked to an Egom account yet.\n1. Sign up free at ${APP_URL}\n2. Tap *Link WhatsApp* and send me the code it shows.\n\nThen just forward me your receipts.`);
}

// ---------------------------------------------------------------- parsed receipt → row fields
function cleanTx(p: Profile, t: ParsedTx) {
  return {
    tx_date: t.date, tx_time: t.time, amount: t.amount, fee: t.fee, currency: t.currency,
    kind: t.direction === "credit" ? "income" : t.direction === "transfer" ? "transfer" : "expense",
    counterparty: t.counterparty, narration: t.narration, reference: t.reference, bank: t.bank, to_bank: t.to_bank ?? "",
    sure: t.sure !== false, other_party: t.other_party ?? "",
    category_personal: t.category_personal, category_business: t.category_business,
    confidence: t.confidence, likely_space: p.has_business ? t.likely_space : "personal" as Space,
    owner_space: p.has_business ? spaceFromOwner(t.owner_name, p.full_name ?? "", p.business_name ?? "") : "personal" as Space,
  };
}
type Tx = ReturnType<typeof cleanTx>;
const parseOpts = (p: Profile) => ({ preset: p.business_preset, businessName: p.has_business ? p.business_name ?? "" : "", personalName: p.full_name ?? "" });

// ---------------------------------------------------------------- database (always scoped to one user)
async function ruleFor(p: Profile, space: Space, counterparty: string | null, kind = "expense") {
  const k = normKey(counterparty);
  if (!k) return null;
  const { data } = await sb.from("category_rules").select("category").eq("user_id", p.user_id).eq("space", space).eq("counterparty_key", k).maybeSingle();
  return data?.category && catList(p, space, kind).includes(data.category) ? data.category as string : null;
}
async function learnRule(p: Profile, space: Space, counterparty: string | null, category: string) {
  const k = normKey(counterparty);
  if (k.length < 3) return;
  await sb.from("category_rules").upsert({ user_id: p.user_id, space, counterparty_key: k, category, updated_at: new Date().toISOString() }, { onConflict: "user_id,space,counterparty_key" });
}
async function findDuplicate(p: Profile, space: Space, tx: { amount: number; tx_date: string | null; reference: string; counterparty: string }, excludeBatch: string) {
  let q = sb.from("expenses").select("id, amount, tx_date, counterparty, reference, batch_id").eq("user_id", p.user_id).eq("space", space).eq("status", "saved").neq("batch_id", excludeBatch).limit(20);
  const ref = tx.reference.replace(/[^A-Za-z0-9\-_/]/g, "");
  if (ref && tx.tx_date) q = q.or(`reference.eq.${ref},and(amount.eq.${tx.amount},tx_date.eq.${tx.tx_date})`);
  else if (ref) q = q.eq("reference", tx.reference);
  else if (tx.tx_date) q = q.eq("amount", tx.amount).eq("tx_date", tx.tx_date);
  else return null;
  const { data } = await q;
  return (data ?? []).find((e) =>
    (tx.reference && e.reference === tx.reference) ||
    (Number(e.amount) === tx.amount && e.tx_date === tx.tx_date && normKey(e.counterparty) === normKey(tx.counterparty))
  ) ?? null;
}
async function setLastBatch(p: Profile, sender: string, batchId: string) {
  await sb.from("chat_state").upsert({ sender, user_id: p.user_id, last_batch_id: batchId, updated_at: new Date().toISOString() });
}
async function lastBatch(p: Profile, sender: string) {
  const { data } = await sb.from("chat_state").select("last_batch_id, updated_at, user_id").eq("sender", sender).maybeSingle();
  if (!data?.last_batch_id || data.user_id !== p.user_id) return { id: null, rows: [] as Record<string, any>[], at: null as string | null };
  const { data: rows } = await sb.from("expenses").select("*").eq("user_id", p.user_id).eq("batch_id", data.last_batch_id).order("created_at");
  return { id: data.last_batch_id as string, rows: rows ?? [], at: data.updated_at as string };
}

// Assign a space to every row in a batch, apply learned rules, mark saved
async function fileBatch(p: Profile, batchId: string, space: Space) {
  const { data: rows } = await sb.from("expenses").select("*").eq("user_id", p.user_id).eq("batch_id", batchId).order("created_at");
  const out: { row: Record<string, any>; dup: Record<string, any> | null }[] = [];
  for (const r of rows ?? []) {
    const suggested = mapCat(p, space, space === "business" ? r.category_business : r.category_personal, r.kind);
    const list = catList(p, space, r.kind);
    const fallback = r.kind === "income" ? (space === "business" ? "Sales & Customer Payments" : "Other Income") : "Other";
    const category = r.kind === "transfer" ? null : (await ruleFor(p, space, r.counterparty, r.kind)) ?? (list.includes(suggested) ? suggested : fallback);
    const { data: updated } = await sb.from("expenses").update({ space, status: "saved", category, updated_at: new Date().toISOString() }).eq("id", r.id).eq("user_id", p.user_id).select().single();
    const dup = await findDuplicate(p, space, { amount: Number(r.amount), tx_date: r.tx_date, reference: r.reference ?? "", counterparty: r.counterparty ?? "" }, batchId);
    out.push({ row: updated ?? r, dup });
  }
  return out;
}

function describeRow(r: Record<string, any>, full = true) {
  const sign = r.kind === "income" ? "+" : "";
  const total = Number(r.amount) + (r.kind === "expense" ? Number(r.fee || 0) : 0);
  const who = r.kind === "transfer" ? `${r.bank || "Your account"} → ${r.to_bank || "your other account"}` : r.counterparty ? `${r.kind === "income" ? "From" : "To"} ${r.counterparty}` : "";
  const lines = full
    ? [`*${sign}${money(total)}*${r.kind === "transfer" ? ` ${r.bank || "your account"} → ${r.to_bank || "your other account"}` : r.counterparty ? ` ${r.kind === "income" ? "from" : "to"} ${r.counterparty}` : ""}`, `${r.kind === "transfer" ? "Own transfer" : r.category} · ${prettyDate(r.tx_date, r.tx_time)}`]
    : [[who, prettyDate(r.tx_date, r.tx_time)].filter(Boolean).join(" · ")];
  if (Number(r.fee) > 0 && r.kind === "expense") lines.push(`(includes ${money(r.fee)} bank charge)`);
  if (r.narration) lines.push(`"${r.narration}"`);
  if (r.kind === "income" && full) lines.push("Money in, not spending.");
  if (r.bank && r.kind !== "transfer" && full) lines.push(`${r.kind === "income" ? "Into" : "From"} your ${r.bank} account`);
  return lines.join("\n");
}
async function replySaved(p: Profile, to: string, filed: { row: Record<string, any>; dup: Record<string, any> | null }[], space: Space) {
  // Brand voice: the number first, then where it went. Calm, plain, no emoji.
  const where = (row: Record<string, any>) => row.kind === "transfer" ? "your own transfers" : row.kind === "income" ? `money in · ${row.category}` : row.category;
  const tail = p.has_business ? ` (${label(p, space)})` : "";
  const parts: string[] = [];
  if (filed.length === 1) {
    const { row, dup } = filed[0];
    const amt = Number(row.amount) + (row.kind === "expense" ? Number(row.fee || 0) : 0);
    parts.push(`*${row.kind === "income" ? "+" : ""}${money(amt)}* saved to ${where(row)}${tail}.`);
    parts.push(describeRow(row, false));
    if (row.bank && row.kind !== "transfer") parts.push(`${row.kind === "income" ? "Into" : "From"} your ${row.bank} account`);
    if (dup) parts.push(`This looks like one already saved on ${prettyDate(dup.tx_date)}. Reply *undo* if it's a repeat.`);
    parts.push("");
  } else {
    parts.push(`${filed.length} saved${tail}.`, "");
    filed.forEach(({ row, dup }, i) => {
      parts.push(`${i + 1}. ${describeRow(row)}`);
      if (dup) parts.push(`This looks like one already saved on ${prettyDate(dup.tx_date)}. Reply *undo* if it's a repeat.`);
      parts.push("");
    });
  }
  const moveTip = p.has_business ? ` Wrong ledger? *move ${space === "business" ? "personal" : "business"}*.` : "";
  const eg = filed.every(({ row }) => row.kind === "income") ? "cat salary" : "cat fuel";
  const flip = filed.every(({ row }) => row.kind === "income") ? " Not money in? *money out*." : filed.every(({ row }) => row.kind === "expense") ? " It was money in? *money in*." : "";
  parts.push(`Wrong category? Reply *cat <name>*, e.g. _${eg}_.${moveTip}${flip} Mistake? *undo*.`);
  await sendText(to, parts.join("\n"));
}

// ---------------------------------------------------------------- handlers
async function handleReceipt(p: Profile, from: string, msgId: string, bytes: Uint8Array, mime: string, caption: string, mediaId: string) {
  // (caption is extended below with any line typed under the receipt)
  let text = "";
  try {
    text = await ocrSpace(OCR_KEY, bytes, mime, encodeBase64(bytes));
  } catch (e) {
    console.error(e);
    await sendText(from, "Sorry, I couldn't scan that one right now. Please send it again in a few minutes.");
    return;
  }
  // Words typed with the receipt: the caption, plus any message that arrived while we were reading it
  caption = [caption, ...(await takeNotes(from))].filter((x) => x && x.trim()).join(" · ").slice(0, 300);
  let parsed = parseReceiptText(text, todayISO(), parseOpts(p));
  // A second read with the other engine when the first one missed the amount or the people
  if (!parsed || (!parsed.counterparty && !parsed.other_party)) {
    try {
      const more = await ocrSpace(OCR_KEY, bytes, mime, encodeBase64(bytes), "1", false);
      const again = parseReceiptText(`${text}\n${more}`, todayISO(), parseOpts(p)) ?? parseReceiptText(more, todayISO(), parseOpts(p));
      if (again && (!parsed || again.counterparty || again.other_party)) parsed = again;
    } catch (e) { console.error("second read failed", e); }
  }
  // The caption can say which way the money went: "payment from client", "income", "I paid"
  if (parsed && parsed.direction !== "transfer") {
    const c = normKey(caption);
    // What it was for: the caption fills in when the receipt has no narration (OPay often has none)
    const words = captionWords(p, caption);
    if (words) parsed = { ...parsed, narration: parsed.narration ? `${parsed.narration} · ${words}`.slice(0, 200) : words.slice(0, 200) };
    if (words) parsed = { ...parsed, ...cats(p, parsed.direction === "credit" ? "credit" : "debit", parsed.counterparty, `${words} ${parsed.narration}`) };
    const said = /\b(income|money in|received|recieved|paid me|sent me|payment from|from (?:a |my |the )?(?:customer|client)|customer paid|client paid|deposit from|sales?)\b/.test(c) ? "credit"
      : /\b(expense|money out|i paid|i sent|spent|paid to|payment to)\b/.test(c) ? "debit" : null;
    if (said && said !== parsed.direction) parsed = { ...parsed, direction: said, counterparty: parsed.other_party || parsed.counterparty, other_party: parsed.counterparty, bank: said === "credit" ? "" : parsed.bank, sure: true, ...cats(p, said, parsed.other_party || parsed.counterparty, parsed.narration) };
    else if (said) parsed = { ...parsed, sure: true };
  }
  if (!parsed) {
    await sendText(from, `I couldn't find an amount on that receipt. Send a clearer screenshot, or type it like: *5000 fuel*`);
    return;
  }
  await saveBatch(p, from, msgId, [cleanTx(p, parsed)], caption, "whatsapp", mediaId);
  // A message that landed while we were saving still belongs to this receipt
  const late = await takeNotes(from);
  if (late.length) await addNote(p, from, late.join(" · "), true);
}

// ---------------------------------------------------------------- words sent with a receipt
// WhatsApp delivers a forwarded receipt and the line typed under it as two separate messages,
// often at the same moment. While a receipt is being read we leave a marker; a text that arrives
// then is parked as a note and picked up by the receipt, so it's read with it.
const READ_MARK = (from: string, id: string) => `reading:${from}:${id}`;
async function markReceipt(from: string, id: string, on: boolean) {
  if (on) await sb.from("processed_messages").insert({ wa_message_id: READ_MARK(from, id) });
  else await sb.from("processed_messages").delete().eq("wa_message_id", READ_MARK(from, id));
}
async function receiptBeingRead(from: string) {
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await sb.from("processed_messages").select("wa_message_id").like("wa_message_id", `reading:${from}:%`).gte("created_at", since).limit(1);
  return !!data?.length;
}
async function parkNote(from: string, text: string) {
  await sb.from("processed_messages").insert({ wa_message_id: `note:${from}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}:${text.slice(0, 500)}` });
}
async function takeNotes(from: string): Promise<string[]> {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await sb.from("processed_messages").select("wa_message_id").like("wa_message_id", `note:${from}:%`).gte("created_at", since);
  const ids = (data ?? []).map((r: Record<string, string>) => r.wa_message_id).sort();
  for (const id of ids) await sb.from("processed_messages").delete().eq("wa_message_id", id);
  return ids.map((id: string) => id.split(":").slice(4).join(":")).filter(Boolean);
}
// The caption without ledger words ("egreen", "personal", "biz"), so what's left is what it was for
function captionWords(p: Profile, caption: string) {
  const own = bizWords(p);
  return caption.split(/\s+/).filter((w) => !new RegExp(`^(${["personal", "biz", "business", ...own].join("|")})[.,!]?$`, "i").test(w)).join(" ").replace(/^[\s·,:-]+|[\s·,:-]+$/g, "").trim();
}

// Categories for a corrected direction
function cats(p: Profile, dir: "debit" | "credit", who: string, note: string) {
  const basis = `${note ?? ""} ${who ?? ""}`;
  return dir === "credit"
    ? { category_personal: incomeCategory(basis, "personal"), category_business: incomeCategory(basis, "business") }
    : { category_personal: categorize("personal", basis).category, category_business: categorize("business", basis, p.business_preset).category };
}
// Turn the last batch round: money in <-> money out
async function flipBatch(p: Profile, from: string, batchId: string, to: "income" | "expense", who?: string) {
  const { data: rows } = await sb.from("expenses").select("*").eq("user_id", p.user_id).eq("batch_id", batchId);
  for (const r of rows ?? []) {
    if (r.kind === "transfer") continue;
    const name = who ?? r.counterparty ?? "";
    const c = cats(p, to === "income" ? "credit" : "debit", name, r.narration ?? "");
    // The bank on the receipt belonged to whoever sent it; once the direction flips we no longer know which of your accounts it was
    const patch: Record<string, unknown> = { kind: to, counterparty: name, fee: to === "income" ? 0 : r.fee, bank: r.source === "whatsapp" ? null : r.bank, ...c, updated_at: new Date().toISOString() };
    if (r.space) { const sp = r.space as Space; const sug = mapCat(p, sp, sp === "business" ? c.category_business : c.category_personal, to); patch.category = (await ruleFor(p, sp, name, to)) ?? sug ?? (to === "income" ? (sp === "business" ? "Sales & Customer Payments" : "Other Income") : "Other"); }
    await sb.from("expenses").update(patch).eq("id", r.id).eq("user_id", p.user_id);
  }
}
// After the direction is settled: file it, or ask which ledger
async function settle(p: Profile, from: string, batchId: string, chosen: Space | null, guess: Space | null) {
  if (chosen) return replySaved(p, from, await fileBatch(p, batchId, chosen), chosen);
  const { data: rows } = await sb.from("expenses").select("*").eq("user_id", p.user_id).eq("batch_id", batchId).order("created_at");
  const order: Space[] = guess === "personal" ? ["personal", "business"] : ["business", "personal"];
  const preview = (rows ?? []).map((t) => t.kind === "transfer"
    ? `${money(Number(t.amount))} ${t.bank || "your account"} → ${t.to_bank || "your other account"} · ${prettyDate(t.tx_date, t.tx_time)}`
    : `${t.kind === "income" ? "+" : ""}${money(Number(t.amount) + (t.kind === "expense" ? Number(t.fee || 0) : 0))} ${t.kind === "income" ? "from" : "to"} ${t.counterparty || "Unknown"} · ${prettyDate(t.tx_date, t.tx_time)}${t.narration ? `\n"${t.narration}"` : ""}`).join("\n\n");
  await sendButtons(from, `${preview}\n\nWhich ledger?${guess ? ` (looks like ${label(p, guess)})` : ""}`, order.map((s) => ({ id: `space:${s}:${batchId}`, title: label(p, s) })));
}

async function saveBatch(p: Profile, from: string, msgId: string, txs: Tx[], hintText: string, source: string, mediaId?: string) {
  const batchId = crypto.randomUUID();
  // No business: everything is personal. Otherwise caption wins, then the account holder's name on the receipt.
  const chosen: Space | null = !p.has_business ? "personal"
    : spaceFromText(p, hintText) ?? (txs.every((t) => t.owner_space && t.owner_space === txs[0].owner_space) ? txs[0].owner_space : null);
  const rows = txs.map((t) => ({
    user_id: p.user_id, batch_id: batchId, wa_message_id: msgId, sender: from, source, media_id: mediaId ?? null,
    space: null, status: "pending",
    kind: t.kind, tx_date: t.tx_date ?? todayISO(), tx_time: t.tx_time, amount: t.amount, fee: t.fee, currency: t.currency,
    counterparty: t.counterparty, narration: t.narration, reference: t.reference, bank: t.bank || null, to_bank: t.to_bank || null,
    category_personal: t.category_personal, category_business: t.category_business, confidence: t.confidence,
    note: hintText && !spaceFromText(p, hintText) ? hintText.slice(0, 200) : null,
  }));
  const { error } = await sb.from("expenses").insert(rows);
  if (error) { console.error("insert failed", JSON.stringify(error)); await sendText(from, "Sorry, I couldn't save that. Please try again."); return; }
  await setLastBatch(p, from, batchId);

  // Nothing on the receipt said which way the money went: ask before filing
  const unsure = txs.find((t) => !t.sure && t.kind !== "transfer");
  if (unsure) {
    const amt = money(unsure.amount);
    const names = [unsure.other_party, unsure.counterparty].filter(Boolean);
    const body = `${amt}${names.length === 2 ? ` between ${names[0]} and ${names[1]}` : ""} · ${prettyDate(unsure.tx_date, unsure.tx_time)}\n\nDid this money come in or go out?`;
    const enc = (s: string) => encodeURIComponent(s || "").slice(0, 90);
    await sendButtons(from, body, [
      { id: `dir:expense:${batchId}:${enc(unsure.counterparty)}:${chosen ?? ""}`, title: "Money out" },
      { id: `dir:income:${batchId}:${enc(unsure.other_party)}:${chosen ?? ""}`, title: "Money in" },
    ]);
    return;
  }
  await settle(p, from, batchId, chosen, txs[0].likely_space);
}

async function handleManual(p: Profile, from: string, msgId: string, text: string) {
  const parsed = parseManual(text, todayISO(), parseOpts(p));
  if (!parsed) return false;
  // "from Ada Foods" names who paid you; it shouldn't pick the ledger
  const hint = parsed.direction === "credit" && parsed.counterparty ? text.replace(parsed.counterparty, " ") : text;
  await saveBatch(p, from, msgId, [cleanTx(p, parsed)], hint, "manual");
  return true;
}

async function handleSummary(p: Profile, from: string, text: string) {
  const s = normKey(text);
  const space = spaceFromText(p, s);
  const now = lagosNow();
  let y = now.getUTCFullYear(), m = now.getUTCMonth(); // 0-based
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  if (/\blast month\b/.test(s)) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  else {
    const idx = months.findIndex((mm) => new RegExp(`\\b${mm}`).test(s));
    if (idx >= 0) { m = idx; if (idx > now.getUTCMonth()) y -= 1; }
  }
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const end = m === 11 ? `${y + 1}-01-01` : `${y}-${String(m + 2).padStart(2, "0")}-01`;
  const monthLabel = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const spaces: Space[] = space ? [space] : p.has_business ? ["personal", "business"] : ["personal"];
  const out: string[] = [`*${monthLabel}*`];
  for (const sp of spaces) {
    const { data } = await sb.from("expenses").select("amount, fee, category, kind").eq("user_id", p.user_id).eq("space", sp).eq("status", "saved").gte("tx_date", start).lt("tx_date", end);
    const exp = (data ?? []).filter((e) => e.kind === "expense");
    const inc = (data ?? []).filter((e) => e.kind === "income").reduce((a, e) => a + Number(e.amount), 0);
    const total = exp.reduce((a, e) => a + Number(e.amount) + Number(e.fee || 0), 0);
    const byCat = new Map<string, number>();
    exp.forEach((e) => byCat.set(e.category || "Other", (byCat.get(e.category || "Other") ?? 0) + Number(e.amount) + Number(e.fee || 0)));
    out.push("", `*${p.has_business ? label(p, sp) + ": " : "Spent: "}${money(total)}* (${exp.length} expense${exp.length === 1 ? "" : "s"})${inc ? `\nMoney in: ${money(inc)}` : ""}`);
    [...byCat.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, v]) => out.push(`• ${c}: ${money(v)}`));
  }
  out.push("", `See everything at ${APP_URL}`);
  await sendText(from, out.join("\n"));
}

function help(p: Profile) {
  const b = p.has_business ? bizWords(p)[0] || "business" : "";
  return `Egom keeps track of your money from your receipts.

*Send a receipt*: forward or share a screenshot (transfer receipt, POS slip, shop receipt).${p.has_business ? ` Add *${b}* or *personal* as a caption to skip the question.` : ""}
*Type one*: _5000 fuel_ or _2.5k lunch_${p.has_business ? ` or _12000 printing ${b}_` : ""}
*Money in*: forward the receipt someone sent you, or type _Mr Ade paid me 450k for the Lekki job_ or _received 150k salary_
*Got it the wrong way round?* Reply _money in_ or _money out_
*Fix the last one*: _cat food_${p.has_business ? " · _move personal_" : ""} · _undo_
*Add a note*: just type it after the receipt, e.g. _for the Lekki job_
*Totals*: _summary_ · _summary last month_${p.has_business ? ` · _${b} summary_` : ""}

Everything is also at ${APP_URL}`;
}

async function addNote(p: Profile, from: string, note: string, quiet = false) {
  const { id, rows, at } = await lastBatch(p, from);
  if (!id || !rows.length || !at) return false;
  if (Date.now() - new Date(at).getTime() > 30 * 60 * 1000) return false; // only within 30 minutes
  const clean = note.trim().slice(0, 200);
  const words = captionWords(p, clean);
  const c = normKey(clean);
  const said = /\b(income|money in|received|recieved|paid me|sent me|payment from|from (?:a |my |the )?(?:customer|client)|customer paid|client paid|deposit from)\b/.test(c) ? "income"
    : /\b(expense|money out|i paid|i sent|paid to|payment to)\b/.test(c) ? "expense" : null;
  if (said && rows.some((r) => r.kind !== "transfer" && r.kind !== said)) await flipBatch(p, from, id, said);
  const { rows: fresh } = await lastBatch(p, from);
  let changed = "";
  for (const r of fresh) {
    const patch: Record<string, unknown> = { note: r.note ? `${r.note}; ${clean}` : clean, updated_at: new Date().toISOString() };
    if (!r.narration && words) patch.narration = words;
    if (r.kind !== "transfer" && words) {
      const basis = `${words} ${r.narration ?? ""}`;
      const c2 = cats(p, r.kind === "income" ? "credit" : "debit", r.counterparty ?? "", basis);
      const hit = r.kind === "income" ? true : categorize("personal", basis).score > 0 || categorize("business", basis, p.business_preset).score > 0;
      if (hit) Object.assign(patch, c2);
      if (r.space && hit) {
        const sp = r.space as Space;
        const mc = mapCat(p, sp, sp === "business" ? c2.category_business : c2.category_personal, r.kind);
        if (mc && mc !== r.category) { patch.category = mc; changed = mc; }
      }
    }
    await sb.from("expenses").update(patch).eq("id", r.id).eq("user_id", p.user_id);
  }
  const pending = fresh.some((r) => !r.space);
  if (quiet && pending) return true; // the ledger question is still open; it'll show the note when answered
  const flipped = said ? `\nSaved as *${said === "income" ? "money in" : "money out"}*.` : "";
  await sendText(from, `Note added: "${clean}"${changed ? `\nCategory updated to *${changed}*.` : ""}${flipped}`);
  return true;
}

async function handleText(p: Profile, from: string, msgId: string, text: string) {
  const t = text.trim();
  const n = normKey(t);
  if (!n || /^(hi|hello|hey|help|menu|start)$/.test(n)) return sendText(from, help(p));

  if (n === "undo") {
    const { id, rows } = await lastBatch(p, from);
    if (!id || !rows.length) return sendText(from, "Nothing to undo.");
    await sb.from("expenses").delete().eq("user_id", p.user_id).eq("batch_id", id);
    await sb.from("chat_state").update({ last_batch_id: null }).eq("sender", from);
    return sendText(from, `Removed: ${rows.map((r) => `${money(Number(r.amount) + Number(r.fee || 0))} to ${r.counterparty || "Unknown"}`).join(", ")}.`);
  }

  // "money in" / "it was income" / "money out" turns the last one round
  const flipTo = /^(?:(?:it|that)(?: s| is| was)?\s+|its\s+|thats\s+|this (?:is|was)\s+)?(?:money in|income|incoming|credit|a credit|received|i received it)$/.test(n) ? "income"
    : /^(?:(?:it|that)(?: s| is| was)?\s+|its\s+|thats\s+|this (?:is|was)\s+)?(?:money out|expense|an expense|outgoing|debit|a debit|spending|i paid)$/.test(n) ? "expense" : null;
  if (flipTo) {
    const { id, rows } = await lastBatch(p, from);
    if (!id || !rows.length) return sendText(from, "Send a receipt first, then I can change it.");
    if (rows.every((r) => r.kind === flipTo)) return sendText(from, `It's already saved as ${flipTo === "income" ? "money in" : "money out"}.`);
    await flipBatch(p, from, id, flipTo);
    const { rows: now } = await lastBatch(p, from);
    const saved = now.filter((r) => r.space);
    if (!saved.length) return settle(p, from, id, null, null);
    return replySaved(p, from, saved.map((row) => ({ row, dup: null })), saved[0].space as Space);
  }

  const cat = t.match(/^(?:cat|category)\s+(.+)$/i);
  if (cat) {
    const { id, rows } = await lastBatch(p, from);
    const saved = rows.filter((r) => r.space);
    if (!id || !saved.length) return sendText(from, "Send a receipt first, then I can change its category.");
    const space = saved[0].space as Space;
    const kind = saved[0].kind;
    const category = matchCategory(p, space, cat[1], kind);
    if (!category) return sendText(from, `I don't know that category. ${kind === "income" ? "Money-in" : label(p, space)} categories:\n${catList(p, space, kind).map((c) => `• ${c}`).join("\n")}`);
    for (const r of saved) {
      await sb.from("expenses").update({ category, updated_at: new Date().toISOString() }).eq("id", r.id).eq("user_id", p.user_id);
      await learnRule(p, space, r.counterparty, category);
    }
    return sendText(from, `Moved to *${category}*. I'll use that for ${saved[0].counterparty || "this payee"} next time.`);
  }

  const mv = n.match(/^move (?:to )?(.+)$/);
  if (mv && p.has_business) {
    const target = /^personal$/.test(mv[1]) ? "personal" : spaceFromText(p, mv[1]);
    if (target) {
      const { id, rows } = await lastBatch(p, from);
      if (!id || !rows.length) return sendText(from, "Nothing to move.");
      return replySaved(p, from, await fileBatch(p, id, target), target);
    }
  }

  // Answering the "Which ledger?" question by typing
  const typed = p.has_business ? (n === "personal" ? "personal" : spaceFromText(p, n) === "business" && n.split(" ").length <= 3 ? "business" : null) : null;
  if (typed) {
    const { id, rows } = await lastBatch(p, from);
    if (id && rows.some((r) => r.status === "pending")) return replySaved(p, from, await fileBatch(p, id, typed), typed);
  }

  if (/^(?:summary|total|totals|report)\b|\b(how much|what did i|this month|last month)\b/.test(n) || (/\b(spent|spend)\b/.test(n) && !/\d/.test(n))) return handleSummary(p, from, t);

  // Typed under a forwarded receipt: it arrives as its own message, often while the receipt is still being read
  if (!(await receiptBeingRead(from))) await new Promise((r) => setTimeout(r, 1500)); // the receipt may land a moment later
  if (await receiptBeingRead(from)) { await parkNote(from, t); return; }
  const recent = await lastBatch(p, from);
  if (recent.id && recent.at && Date.now() - new Date(recent.at).getTime() < 90 * 1000 && recent.rows.some((r) => r.source === "whatsapp")) {
    // Unless it's clearly a different amount, a line sent right after a receipt describes that receipt
    const typed = parseManual(t, todayISO(), parseOpts(p));
    if (!typed || recent.rows.some((r) => Math.abs(Number(r.amount) - typed.amount) < 1)) { if (await addNote(p, from, t)) return; }
  }

  if (await handleManual(p, from, msgId, t)) return;

  // Anything else sent soon after a receipt is a note on that receipt
  if (await addNote(p, from, t)) return;
  return sendText(from, `I didn't get that.\n\n${help(p)}`);
}

async function handleMessage(msg: Record<string, any>) {
  const from = String(msg.from ?? "").replace(/\D/g, "");
  if (!from) return;

  const { error: dupErr } = await sb.from("processed_messages").insert({ wa_message_id: msg.id });
  if (dupErr) {
    if (dupErr.code === "23505") return; // already handled (WhatsApp retry)
    console.error("database error", JSON.stringify(dupErr));
    return sendText(from, "Sorry, I couldn't reach my database just now. Please try again in a minute.");
  }

  const text = msg.type === "text" ? String(msg.text?.body ?? "") : "";
  if (text && await tryLink(from, text)) return;

  const p = await profileFor(from);
  if (!p) { console.log("message from unlinked number"); return nudgeSignup(from); }
  console.log("handling", msg.type, "for", p.user_id);
  markReading(msg.id).catch(() => {});

  if (msg.type === "image" || msg.type === "document") {
    const media = msg.image ?? msg.document;
    const caption = String(media?.caption ?? "").trim();
    try {
      const { bytes, mime } = await downloadMedia(media.id);
      if (!["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"].includes(mime)) {
        return sendText(from, "Please send the receipt as a photo/screenshot (JPG or PNG) or a PDF.");
      }
      await markReceipt(from, msg.id, true);
      try { await handleReceipt(p, from, msg.id, bytes, mime, caption, media.id); } finally { await markReceipt(from, msg.id, false); }
    } catch (e) {
      if (String(e).includes("too_large")) return sendText(from, `That file is over 1 MB, the scanner's limit. Send it as a normal photo or screenshot so WhatsApp shrinks it. Bank statements go in at ${APP_URL} instead.`);
      console.error(e);
      return sendText(from, "Sorry, I couldn't download that file. Please send it again.");
    }
    return;
  }
  if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
    const parts = String(msg.interactive.button_reply.id).split(":");
    const [kind, space, batchId] = parts;
    if (kind === "dir" && (space === "income" || space === "expense") && batchId) {
      const who = decodeURIComponent(parts[3] ?? "");
      await flipBatch(p, from, batchId, space, who || undefined);
      const ch = parts[4] === "personal" || parts[4] === "business" ? parts[4] as Space : !p.has_business ? "personal" : null;
      return settle(p, from, batchId, ch, null);
    }
    // Old buttons from before the switch said "egreen"
    const sp = space === "egreen" ? "business" : space;
    if (kind === "space" && (sp === "personal" || sp === "business") && batchId) {
      return replySaved(p, from, await fileBatch(p, batchId, sp), sp);
    }
    return;
  }
  if (msg.type === "text") return handleText(p, from, msg.id, text);
  return sendText(from, "Send me a receipt screenshot, or type *help*.");
}

async function processPayload(body: Record<string, any>) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      if (v.statuses?.length) console.log("status update", v.statuses.map((s: any) => `${s.status}${s.errors ? " " + JSON.stringify(s.errors) : ""}`).join(", "));
      for (const msg of v.messages ?? []) {
        try { await handleMessage(msg); } catch (e) { console.error("message failed", e); }
      }
    }
  }
}

// ---------------------------------------------------------------- HTTP entry
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (VERIFY_TOKEN && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) return new Response("Invalid signature", { status: 401 });

  let body: Record<string, any>;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }

  // Reply to Meta immediately; keep working in the background.
  const work = processPayload(body).catch((e) => console.error("process error", e));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(work); else await work;
  return new Response("ok");
});
