const REPORT_RENDER_DATA_KEY = '__PLOG_REPORT_RENDER_DATA__'

/**
 * 서버의 Chromium 컨텍스트가 문서 로드 전에 주입한 데이터만 읽는다.
 * 네트워크 API나 브라우저 저장소를 사용하지 않아 렌더 전용 화면 밖으로 노출되지 않는다.
 */
export function readReportRenderData<T>(): T | null {
  const value = (window as unknown as Record<string, unknown>)[REPORT_RENDER_DATA_KEY]
  return value && typeof value === 'object' ? (value as T) : null
}
