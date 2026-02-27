import type { Task } from '../types'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

async function sheetsApiFetch(url: string, options: RequestInit, accessToken: string): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const body = await res.json()

  if (!res.ok) {
    const msg = body?.error?.message || `Google Sheets API error (${res.status})`
    throw new Error(msg)
  }

  return body
}

export function buildSheetData(tasks: Task[]): (string | number)[][] {
  if (tasks.length === 0) return []

  const header = [
    'Task Name',
    'Resource',
    'Start Date',
    'End Date',
    'Start Offset (days)',
    'Duration (days)',
    '% Complete',
    'Dependencies',
  ]

  const earliestStart = tasks.reduce((min, t) => {
    const d = new Date(t.start).getTime()
    return d < min ? d : min
  }, new Date(tasks[0].start).getTime())

  const MS_PER_DAY = 86400000

  const taskMap = new Map(tasks.map((t) => [t.id, t.name]))

  const rows = tasks.map((t) => {
    const startMs = new Date(t.start).getTime()
    const endMs = new Date(t.end).getTime()
    const offset = Math.round((startMs - earliestStart) / MS_PER_DAY)
    const duration = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY))
    const depNames = t.dependencies
      .map((id) => taskMap.get(id))
      .filter(Boolean)
      .join(', ')

    return [t.name, t.resource, t.start, t.end, offset, duration, t.percentComplete, depNames]
  })

  return [header, ...rows]
}

async function createSpreadsheet(accessToken: string): Promise<{ spreadsheetId: string; sheetId: number }> {
  const title = `Ganttlet Export - ${new Date().toLocaleDateString()}`

  const body = await sheetsApiFetch(
    SHEETS_API,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: 'Tasks' } }],
      }),
    },
    accessToken
  ) as { spreadsheetId: string; sheets: { properties: { sheetId: number } }[] }

  return {
    spreadsheetId: body.spreadsheetId,
    sheetId: body.sheets[0].properties.sheetId,
  }
}

async function writeTaskData(
  spreadsheetId: string,
  data: (string | number)[][],
  accessToken: string
): Promise<void> {
  const range = `Tasks!A1:H${data.length}`

  await sheetsApiFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ range, majorDimension: 'ROWS', values: data }),
    },
    accessToken
  )
}

async function addGanttChart(
  spreadsheetId: string,
  sheetId: number,
  taskCount: number,
  accessToken: string
): Promise<void> {
  const chartHeight = Math.max(300, taskCount * 40 + 100)

  const request = {
    requests: [
      {
        addChart: {
          chart: {
            spec: {
              title: 'Gantt Chart',
              basicChart: {
                chartType: 'BAR',
                stackedType: 'STACKED',
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Days' },
                  { position: 'LEFT_AXIS', title: '' },
                ],
                domains: [
                  {
                    domain: {
                      sourceRange: {
                        sources: [
                          {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: taskCount + 1,
                            startColumnIndex: 0,
                            endColumnIndex: 1,
                          },
                        ],
                      },
                    },
                  },
                ],
                series: [
                  {
                    series: {
                      sourceRange: {
                        sources: [
                          {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: taskCount + 1,
                            startColumnIndex: 4,
                            endColumnIndex: 5,
                          },
                        ],
                      },
                    },
                    color: { red: 1, green: 1, blue: 1, alpha: 0 },
                  },
                  {
                    series: {
                      sourceRange: {
                        sources: [
                          {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: taskCount + 1,
                            startColumnIndex: 5,
                            endColumnIndex: 6,
                          },
                        ],
                      },
                    },
                    color: { red: 0.23, green: 0.51, blue: 0.96, alpha: 1 },
                  },
                ],
                headerCount: 1,
              },
            },
            position: {
              overlayPosition: {
                anchorCell: {
                  sheetId,
                  rowIndex: taskCount + 3,
                  columnIndex: 0,
                },
                widthPixels: 800,
                heightPixels: chartHeight,
              },
            },
          },
        },
      },
    ],
  }

  await sheetsApiFetch(
    `${SHEETS_API}/${spreadsheetId}:batchUpdate`,
    { method: 'POST', body: JSON.stringify(request) },
    accessToken
  )
}

export async function exportToGoogleSheets(tasks: Task[], accessToken: string): Promise<string> {
  const data = buildSheetData(tasks)
  if (data.length === 0) throw new Error('No tasks to export')

  const { spreadsheetId, sheetId } = await createSpreadsheet(accessToken)
  await writeTaskData(spreadsheetId, data, accessToken)
  await addGanttChart(spreadsheetId, sheetId, tasks.length, accessToken)

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}
