/** Convert any Google Sheets share/edit URL to a CSV export URL. */
export function toSheetCsvUrl(input: string): string {
  const url = input.trim();

  // Already a CSV export URL
  if (url.includes('/export?') && url.includes('format=csv')) return url;

  // Extract spreadsheet ID from common URL patterns:
  // https://docs.google.com/spreadsheets/d/<ID>/edit#gid=...
  // https://docs.google.com/spreadsheets/d/<ID>/pub?...
  // https://docs.google.com/spreadsheets/d/<ID>
  const m = url.match(/spreadsheets\/d\/([\w-]+)/);
  if (!m) throw new Error('Not a valid Google Sheets URL');

  const id = m[1];

  // gid (sheet tab) — preserve if present
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : '';

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid}`;
}

/** Fetch a public Google Sheets document as CSV text. */
export async function fetchSheetCsv(sheetUrl: string): Promise<string> {
  const csvUrl = toSheetCsvUrl(sheetUrl);

  const res = await fetch(csvUrl);
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new Error('Sheet is not public. Share it as "Anyone with the link → Viewer" first.');
    }
    throw new Error(`Failed to fetch sheet (HTTP ${res.status})`);
  }

  return res.text();
}
