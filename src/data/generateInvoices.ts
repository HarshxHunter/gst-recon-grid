import type { Invoice, ReconStatus } from "../types";

// Small seeded PRNG (mulberry32) so the 1000-row dataset is stable
// across reloads instead of reshuffling every render.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VENDORS: { name: string; gstin: string }[] = [
  { name: "Reliance Industries Ltd", gstin: "27AAACR5055K1Z7" },
  { name: "Tata Consultancy Services", gstin: "27AAACT2727Q1ZW" },
  { name: "Infosys Ltd", gstin: "29AAACI4741L1Z7" },
  { name: "HDFC Bank", gstin: "27AAACH2702H1ZA" },
  { name: "Wipro Ltd", gstin: "29AAACW0387P1Z8" },
  { name: "Larsen & Toubro Ltd", gstin: "27AAACL0140P1ZR" },
  { name: "Bharti Airtel Ltd", gstin: "07AAACB2894G1Z1" },
  { name: "Adani Enterprises Ltd", gstin: "24AAACA6403P1Z6" },
  { name: "ITC Ltd", gstin: "19AAACI5950L1ZQ" },
  { name: "Mahindra & Mahindra Ltd", gstin: "27AAACM3025K1ZE" },
  { name: "Asian Paints Ltd", gstin: "27AAACA0997M1Z1" },
  { name: "Bajaj Finserv Ltd", gstin: "27AABCB2894P1ZL" },
  { name: "Sun Pharmaceutical Industries", gstin: "24AAACS7360H1ZO" },
  { name: "UltraTech Cement Ltd", gstin: "27AAACL2984B1ZC" },
  { name: "Hindustan Unilever Ltd", gstin: "27AAACH0043V1Z2" },
];

const VENDOR_PREFIX: Record<string, string> = {
  "Reliance Industries Ltd": "RIL",
  "Tata Consultancy Services": "TCS",
  "Infosys Ltd": "INF",
  "HDFC Bank": "HDFC",
  "Wipro Ltd": "WIP",
  "Larsen & Toubro Ltd": "LNT",
  "Bharti Airtel Ltd": "BAL",
  "Adani Enterprises Ltd": "ADE",
  "ITC Ltd": "ITC",
  "Mahindra & Mahindra Ltd": "MNM",
  "Asian Paints Ltd": "ASP",
  "Bajaj Finserv Ltd": "BFS",
  "Sun Pharmaceutical Industries": "SPI",
  "UltraTech Cement Ltd": "UTC",
  "Hindustan Unilever Ltd": "HUL",
};

// Roughly matches a real reconciliation run: most rows clean, the rest
// spread across the three problem states.
const STATUS_WEIGHTS: [ReconStatus, number][] = [
  ["matched", 0.62],
  ["amount_mismatch", 0.16],
  ["gstin_mismatch", 0.1],
  ["missing_in_gstr2b", 0.09],
  ["unreconciled", 0.03],
];

function pickStatus(rand: () => number): ReconStatus {
  const r = rand();
  let cumulative = 0;
  for (const [status, weight] of STATUS_WEIGHTS) {
    cumulative += weight;
    if (r <= cumulative) return status;
  }
  return "matched";
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function randomDateIn2026(rand: () => number): string {
  const month = 1 + Math.floor(rand() * 8); // Jan - Aug 2026
  const day = 1 + Math.floor(rand() * 28);
  return `2026-${pad(month, 2)}-${pad(day, 2)}`;
}

// Deterministic near-valid GSTIN corruption for gstin_mismatch rows,
// e.g. transposing the state code or one check-digit-like character.
function corruptGstin(gstin: string, rand: () => number): string {
  // Corrupt the state code — a realistic "wrong branch filed it" error.
  const digit = String(1 + Math.floor(rand() * 9));
  return digit.padStart(2, "0") + gstin.slice(2);
}

export function generateInvoices(count = 1000, seed = 42): Invoice[] {
  const rand = mulberry32(seed);
  const rows: Invoice[] = [];

  for (let i = 1; i <= count; i++) {
    const vendor = VENDORS[Math.floor(rand() * VENDORS.length)];
    const prefix = VENDOR_PREFIX[vendor.name];
    const status = pickStatus(rand);

    const taxableAmount = Math.round((5000 + rand() * 995000) / 100) * 100;
    // Interstate (IGST) vs intrastate (CGST+SGST) split, like real GST filings.
    const isInterstate = rand() > 0.45;
    const rate = [0.05, 0.12, 0.18, 0.28][Math.floor(rand() * 4)];
    const igst = isInterstate ? Math.round(taxableAmount * rate) : 0;
    const cgst = isInterstate ? 0 : Math.round((taxableAmount * rate) / 2);
    const sgst = isInterstate ? 0 : Math.round((taxableAmount * rate) / 2);
    const totalAmount = taxableAmount + igst + cgst + sgst;

    let gstr2bAmount: number | null = totalAmount;
    let vendorGstinForRow = vendor.gstin;

    if (status === "amount_mismatch") {
      const diff = Math.round((totalAmount * (0.02 + rand() * 0.08)) / 100) * 100;
      gstr2bAmount = rand() > 0.5 ? totalAmount - diff : totalAmount + diff;
    } else if (status === "missing_in_gstr2b") {
      gstr2bAmount = null;
    } else if (status === "gstin_mismatch") {
      vendorGstinForRow = corruptGstin(vendor.gstin, rand);
    }

    rows.push({
      id: `inv-${pad(i, 5)}`,
      vendorName: vendor.name,
      vendorGstin: vendorGstinForRow,
      invoiceNumber: `${prefix}-2026-${pad(i, 4)}`,
      invoiceDate: randomDateIn2026(rand),
      taxableAmount,
      igst,
      cgst,
      sgst,
      totalAmount,
      gstr2bAmount,
      status,
    });
  }

  return rows;
}
