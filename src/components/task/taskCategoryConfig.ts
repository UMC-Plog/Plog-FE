import type { TaskCategory } from '../../types/task'

export const TASK_BADGE_BASE_CLASS =
  'inline-flex items-center rounded-full px-2 py-1 text-caption leading-none'

export const TASK_CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; className: string }
> = {
  document: { label: '문서', className: 'bg-navy-50 text-navy-600' },
  design: { label: '디자인', className: 'bg-aqua-50 text-aqua-600' },
  planning: { label: '기획', className: 'bg-warning/10 text-warning' },
  development: { label: '개발', className: 'bg-primary-50 text-primary' },
  test: { label: '테스트/수정', className: 'bg-success/10 text-success' },
}
