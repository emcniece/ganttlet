declare module 'frappe-gantt' {
  export interface FrappeTask {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies: string
    custom_class?: string
    [key: string]: unknown
  }

  export interface GanttOptions {
    on_click?: (task: FrappeTask) => void
    on_date_change?: (task: FrappeTask, start: Date, end: Date) => void
    on_progress_change?: (task: FrappeTask, progress: number) => void
    on_double_click?: (task: FrappeTask) => void
    on_view_change?: (mode: string) => void
    popup?: false | ((ctx: unknown) => void)
    popup_on?: 'click' | 'hover'
    view_mode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year'
    view_mode_select?: boolean
    today_button?: boolean
    readonly?: boolean
    readonly_progress?: boolean
    readonly_dates?: boolean
    bar_height?: number
    bar_corner_radius?: number
    container_height?: number | 'auto'
    column_width?: number | null
    padding?: number
    language?: string
    scroll_to?: string | Date
    lines?: 'both' | 'horizontal' | 'vertical' | 'none'
    auto_move_label?: boolean
    move_dependencies?: boolean
    holidays?: Record<string, string>
    infinite_padding?: boolean
  }

  export default class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGElement,
      tasks: FrappeTask[],
      options?: GanttOptions
    )
    refresh(tasks: FrappeTask[]): void
    change_view_mode(mode?: string): void
  }
}
