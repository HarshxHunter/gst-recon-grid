import { useMemo, useRef, useState } from "react";
import {
  type Column,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { STATUS_SORT_RANK, type Invoice } from "../types";
import { StatusBadge } from "./StatusBadge";
import { EditableAmountCell } from "./EditableAmountCell";

const ROW_HEIGHT = 38;

const inr = new Intl.NumberFormat("en-IN");

function SortableHeader({ label, column }: { label: string; column: Column<Invoice, unknown> }) {
  const sorted = column.getIsSorted();
  return (
    <button type="button" className="sort-header" onClick={column.getToggleSortingHandler()}>
      {label}
      <span className={`sort-indicator ${sorted ? "active" : ""}`}>
        {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "⇅"}
      </span>
    </button>
  );
}

interface Props {
  rows: Invoice[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onEditAmount: (id: string, next: number) => void;
}

export function InvoiceGrid({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onEditAmount,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const allVisibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = allVisibleIds.some((id) => selectedIds.has(id));

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        id: "select",
        size: 36,
        header: () => (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            onChange={(e) => onToggleAll(allVisibleIds, e.target.checked)}
            aria-label="Select all visible rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleRow(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.invoiceNumber}`}
          />
        ),
      },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        size: 190,
        enableSorting: false,
      },
      {
        accessorKey: "vendorGstin",
        header: "GSTIN",
        size: 148,
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.vendorGstin}
            {row.original.status === "gstin_mismatch" && (
              <span className="gstin-flag" title="Doesn't match vendor's registered GSTIN">
                ⚠
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "invoiceNumber",
        header: "Invoice #",
        size: 140,
        enableSorting: false,
      },
      {
        accessorKey: "invoiceDate",
        header: "Date",
        size: 96,
        enableSorting: false,
      },
      {
        accessorKey: "taxableAmount",
        header: ({ column }) => <SortableHeader label="Taxable amt" column={column} />,
        size: 120,
        enableSorting: true,
        cell: ({ row }) => (
          <EditableAmountCell
            value={row.original.taxableAmount}
            onCommit={(next) => onEditAmount(row.original.id, next)}
          />
        ),
      },
      {
        accessorKey: "igst",
        header: "IGST",
        size: 84,
        enableSorting: false,
        cell: ({ getValue }) => inr.format(getValue<number>()),
      },
      {
        accessorKey: "cgst",
        header: "CGST",
        size: 84,
        enableSorting: false,
        cell: ({ getValue }) => inr.format(getValue<number>()),
      },
      {
        accessorKey: "sgst",
        header: "SGST",
        size: 84,
        enableSorting: false,
        cell: ({ getValue }) => inr.format(getValue<number>()),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => <SortableHeader label="Our total" column={column} />,
        size: 120,
        enableSorting: true,
        cell: ({ getValue }) => inr.format(getValue<number>()),
      },
      {
        accessorKey: "gstr2bAmount",
        header: ({ column }) => <SortableHeader label="GSTR-2B total" column={column} />,
        size: 130,
        enableSorting: true,
        // Nulls (missing invoices) sort to the front so they surface first.
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.gstr2bAmount;
          const b = rowB.original.gstr2bAmount;
          if (a === null && b === null) return 0;
          if (a === null) return -1;
          if (b === null) return 1;
          return a - b;
        },
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return v === null ? "—" : inr.format(v);
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader label="Status" column={column} />,
        size: 150,
        enableSorting: true,
        sortingFn: (rowA, rowB) =>
          STATUS_SORT_RANK[rowA.original.status] - STATUS_SORT_RANK[rowB.original.status],
        cell: ({ getValue }) => <StatusBadge status={getValue<Invoice["status"]>()} />,
      },
    ],
    [
      allVisibleIds,
      allVisibleSelected,
      someVisibleSelected,
      selectedIds,
      onToggleAll,
      onToggleRow,
      onEditAmount,
    ]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const gridTemplateColumns = columns.map((c) => `${c.size}px`).join(" ");

  const tableRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="grid-shell">
      <div className="grid-scroll" ref={scrollRef}>
        <div className="grid-header-row" style={{ gridTemplateColumns }}>
          {table.getFlatHeaders().map((header) => (
            <div
              key={header.id}
              className={`grid-header-cell ${
                ["igst", "cgst", "sgst", "totalAmount", "taxableAmount", "gstr2bAmount"].includes(
                  header.column.id
                )
                  ? "align-right"
                  : ""
              }`}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          ))}
        </div>

        {tableRows.length === 0 ? (
          <div className="empty-state">No rows match the current filter.</div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((vRow) => {
              const row = tableRows[vRow.index];
              const isSelected = selectedIds.has(row.original.id);
              return (
                <div
                  key={row.id}
                  className={`grid-row status-${row.original.status} ${isSelected ? "selected" : ""}`}
                  style={{
                    gridTemplateColumns,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                  onClick={() => onToggleRow(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className={`grid-cell ${cell.column.id === "select" ? "checkbox-cell" : ""} ${
                        ["igst", "cgst", "sgst", "totalAmount", "taxableAmount", "gstr2bAmount"].includes(
                          cell.column.id
                        )
                          ? "align-right"
                          : ""
                      }`}
                      onClick={(e) => {
                        // Editing/selecting a cell shouldn't also toggle row selection.
                        if (cell.column.id === "taxableAmount" || cell.column.id === "select") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
