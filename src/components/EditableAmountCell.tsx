import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onCommit: (next: number) => void;
}

export function EditableAmountCell({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!editing) {
    return (
      <div
        className="editable-cell"
        title="Click to edit"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
      >
        {value.toLocaleString("en-IN")}
      </div>
    );
  }

  const parsed = Number(draft);
  const invalid = draft.trim() === "" || Number.isNaN(parsed) || parsed < 0;

  const commit = () => {
    if (!invalid) onCommit(Math.round(parsed));
    setEditing(false);
  };

  return (
    <input
      ref={inputRef}
      className={`editable-input ${invalid ? "invalid" : ""}`}
      value={draft}
      inputMode="decimal"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}
