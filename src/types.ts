export type ReconStatus =
  | "matched"
  | "amount_mismatch"
  | "gstin_mismatch"
  | "missing_in_gstr2b"
  | "unreconciled";

export interface Invoice {
  id: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO yyyy-mm-dd
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  gstr2bAmount: number | null;
  status: ReconStatus;
}

export const STATUS_LABEL: Record<ReconStatus, string> = {
  matched: "Matched",
  amount_mismatch: "Amount mismatch",
  gstin_mismatch: "GSTIN mismatch",
  missing_in_gstr2b: "Missing in GSTR-2B",
  unreconciled: "Unreconciled",
};

// Sorting by status uses this instead of alphabetical order, so the most
// urgent rows for an accountant to review surface first.
export const STATUS_SORT_RANK: Record<ReconStatus, number> = {
  missing_in_gstr2b: 0,
  gstin_mismatch: 1,
  amount_mismatch: 2,
  unreconciled: 3,
  matched: 4,
};
