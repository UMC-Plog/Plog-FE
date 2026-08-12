export interface ReportSearchQuery {
  keyword?: string
  startDate?: string
  endDate?: string
}

const COMPACT_DATE_PATTERN = /^(\d{4})(\d{2})(\d{2})$/
const SEPARATED_DATE_PATTERN = /^(\d{4})([-.])(\d{1,2})\2(\d{1,2})$/
const COMPACT_MONTH_DAY_PATTERN = /^(\d{2})(\d{2})$/
const SEPARATED_MONTH_DAY_PATTERN = /^(\d{1,2})([-.])(\d{1,2})$/

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const isValidDate = (year: number, month: number, day: number) => {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysInMonth[month - 1]
}

/**
 * 사용자가 검색창에 입력한 날짜를 백엔드 LocalDate 계약(YYYY-MM-DD)으로 변환한다.
 * 연도가 생략된 MMDD/MM-DD/MM.DD 입력은 현재 연도를 사용한다.
 * 날짜가 아닌 검색어와 실제로 존재하지 않는 날짜는 null을 반환한다.
 */
export function normalizeReportSearchDate(value: string, currentYear = new Date().getFullYear()) {
  const input = value.trim()
  const compactMatch = input.match(COMPACT_DATE_PATTERN)
  const separatedMatch = input.match(SEPARATED_DATE_PATTERN)
  const compactMonthDayMatch = input.match(COMPACT_MONTH_DAY_PATTERN)
  const separatedMonthDayMatch = input.match(SEPARATED_MONTH_DAY_PATTERN)

  const yearText = compactMatch?.[1] ?? separatedMatch?.[1] ?? String(currentYear).padStart(4, '0')
  const monthText = compactMatch?.[2]
    ?? separatedMatch?.[3]
    ?? compactMonthDayMatch?.[1]
    ?? separatedMonthDayMatch?.[1]
  const dayText = compactMatch?.[3]
    ?? separatedMatch?.[4]
    ?? compactMonthDayMatch?.[2]
    ?? separatedMonthDayMatch?.[3]
  if (!monthText || !dayText) return null

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!isValidDate(year, month, day)) return null
  return `${yearText}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 단일 검색창 입력을 프로젝트명 검색 또는 완료일 하루 검색으로 구분한다. */
export function toReportSearchQuery(value: string): ReportSearchQuery {
  const input = value.trim()
  if (!input) return {}

  const date = normalizeReportSearchDate(input)
  if (date) return { startDate: date, endDate: date }
  return { keyword: input }
}
