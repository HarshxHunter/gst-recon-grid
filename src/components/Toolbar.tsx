interface Props {
  selectedCount: number;
  totalCount: number;
  visibleCount: number;
  mismatchOnly: boolean;
  onToggleMismatchOnly: () => void;
  onBulkReconcile: () => void;
  onClearSelection: () => void;
}

export function Toolbar({
  selectedCount,
  totalCount,
  visibleCount,
  mismatchOnly,
  onToggleMismatchOnly,
  onBulkReconcile,
  onClearSelection,
}: Props) {
  return (
    <div className="toolbar">
      <button
        className="btn btn-primary"
        disabled={selectedCount === 0}
        onClick={onBulkReconcile}
      >
        Mark {selectedCount > 0 ? selectedCount : ""} selected as reconciled
      </button>

      {selectedCount > 0 && (
        <button className="btn" onClick={onClearSelection}>
          Clear selection
        </button>
      )}

      <div className="toolbar-divider" />

      <button
        className={`btn btn-toggle ${mismatchOnly ? "active" : ""}`}
        onClick={onToggleMismatchOnly}
      >
        {mismatchOnly ? "Showing mismatches only" : "Show mismatches only"}
      </button>

      <div className="toolbar-spacer" />

      {mismatchOnly && (
        <span className="selection-note">
          {visibleCount} of {totalCount} rows shown
        </span>
      )}
      <span className="selection-note">
        <strong>{selectedCount}</strong> selected
      </span>
    </div>
  );
}
