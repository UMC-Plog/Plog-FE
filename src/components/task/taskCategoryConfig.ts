import type { ServerTaskCategory, TaskCategory } from '../../types/task'

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

export const SERVER_TASK_CATEGORY_CONFIG: Record<
  ServerTaskCategory,
  { label: string; className: string }
> = {
  PLANNING: { label: '기획', className: 'bg-warning/10 text-warning' },
  DESIGN: { label: '디자인', className: 'bg-aqua-50 text-aqua-600' },
  DEVELOP: { label: '개발', className: 'bg-primary-50 text-primary' },
  TEST_FIX: { label: '테스트/수정', className: 'bg-success/10 text-success' },
  PRESENTATION_DOC: { label: '발표 자료', className: 'bg-navy-50 text-navy-600' },
  RESEARCH: { label: '자료 조사', className: 'bg-warning/10 text-warning' },
  MATERIAL_PRODUCTION: { label: '자료 제작', className: 'bg-aqua-50 text-aqua-600' },
  PRESENTATION: { label: '발표', className: 'bg-primary-50 text-primary' },
  SCHEDULE_MANAGEMENT: { label: '일정 관리', className: 'bg-success/10 text-success' },
  ETC: { label: '기타', className: 'bg-gray-100 text-gray-600' },
}
