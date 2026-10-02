/** Parses RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends, an optional byte-order mark. */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);
    if (inQuotes) {
      if (char !== '"') field += char;
      else if (input.charAt(i + 1) === '"') {
        field += '"';
        i += 1;
      } else inQuotes = false;
    } else if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && input.charAt(i + 1) === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
