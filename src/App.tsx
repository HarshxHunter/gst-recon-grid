import { useMemo, useState } from "react";
import { generateInvoices } from "./data/generateInvoices";
import { InvoiceGrid } from "./components/InvoiceGrid";
import { Toolbar } from "./components/Toolbar";
import type { Invoice } from "./types";

const ROW_COUNT = 1000;

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => generateInvoices(ROW_COUNT));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mismatchOnly, setMismatchOnly] = useState(false);

  const visibleRows = useMemo(
    () => (mismatchOnly ? invoices.filter((r) => r.status !== "matched") : invoices),
    [invoices, mismatchOnly]
  );

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function editAmount(id: string, nextAmount: number) {
    setInvoices((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        // A manual edit invalidates whatever auto-matched this row before;
        // it goes back into the review queue rather than staying "matched".
        const igstRate = row.igst > 0 ? row.igst / row.taxableAmount : 0;
        const cgstRate = row.cgst > 0 ? row.cgst / row.taxableAmount : 0;
        const sgstRate = row.sgst > 0 ? row.sgst / row.taxableAmount : 0;
        const igst = Math.round(nextAmount * igstRate);
        const cgst = Math.round(nextAmount * cgstRate);
        const sgst = Math.round(nextAmount * sgstRate);
        return {
          ...row,
          taxableAmount: nextAmount,
          igst,
          cgst,
          sgst,
          totalAmount: nextAmount + igst + cgst + sgst,
          status: "unreconciled",
        };
      })
    );
  }

  function bulkReconcile() {
    setInvoices((prev) =>
      prev.map((row) =>
        selectedIds.has(row.id) ? { ...row, status: "matched" } : row
      )
    );
    setSelectedIds(new Set());
  }

  const mismatchCount = invoices.filter((r) => r.status !== "matched").length;

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>GST reconciliation</h1>
          <p>Purchase records vs. GSTR-2B, April 2026</p>
        </div>
        <span className="header-count">
          <strong>{mismatchCount}</strong> of {invoices.length} rows need review
        </span>
      </div>

      <Toolbar
        selectedCount={selectedIds.size}
        totalCount={invoices.length}
        visibleCount={visibleRows.length}
        mismatchOnly={mismatchOnly}
        onToggleMismatchOnly={() => setMismatchOnly((v) => !v)}
        onBulkReconcile={bulkReconcile}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <InvoiceGrid
        rows={visibleRows}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onEditAmount={editAmount}
      />
    </div>
  );
}
