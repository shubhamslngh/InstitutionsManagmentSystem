const displayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options) {
  if (!value) {
    return "NA";
  }

  const date = parseDateValue(value);
  if (!date) {
    return "NA";
  }

  if (options) {
    return new Intl.DateTimeFormat("en-IN", options).format(date);
  }

  return displayFormatter.format(date);
}

export function formatDateForDisplay(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split("-");
  if (!year || !month || !day) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

export function formatDateForStorage(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return normalized;
}

export function formatDateInput(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
