import { STATUS_LABEL, type ReconStatus } from "../types";

export function StatusBadge({ status }: { status: ReconStatus }) {
  return <span className={`status-badge ${status}`}>{STATUS_LABEL[status]}</span>;
}
