export function toCamelCaseRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()),
      value
    ])
  );
}

export function mapRows(rows) {
  return rows.map(toCamelCaseRow);
}
