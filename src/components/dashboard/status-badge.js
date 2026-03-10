import { Badge } from "../ui/badge.js";

const variants = {
  SCHOOL: "default",
  COLLEGE: "secondary",
  ACTIVE: "success",
  PAID: "success",
  PARTIAL: "warning",
  PARTIALLY_PAID: "warning",
  PENDING: "destructive"
};

export function StatusBadge({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();
  const label = value.replaceAll("_", " ");

  return <Badge variant={variants[value] || "outline"}>{label}</Badge>;
}
