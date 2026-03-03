/**
 * Extract a Google Sheet ID from a URL or bare ID string.
 */
export function extractSheetId(input: string): string {
  const trimmed = input.trim()

  // Try extracting from full URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]

  // If it looks like a bare ID (no slashes, reasonable length)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 10) {
    return trimmed
  }

  throw new Error('Could not extract a Google Sheet ID from the provided input')
}

/**
 * Fetch CSV content from a published Google Sheet.
 * The sheet must be published to the web via File > Share > Publish to web.
 */
export async function fetchSheetCSV(sheetId: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (HTTP ${response.status}). Is the sheet published to the web?`)
  }

  const text = await response.text()

  // Google returns an HTML error page if the sheet isn't published
  if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    throw new Error('The Google Sheet is not published to the web. Use File > Share > Publish to web.')
  }

  return text
}
