import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { PlogIcon } from '../components/PlogIcon';
import { AlertModal } from '../components/Modal';
import { cn } from '../lib/utils';
import { downloadReportPdfZip, searchReports, type ReportSearchResponse } from '../api/report';
import { ApiError } from '../api/client';
import { toReportSearchQuery } from '../lib/reportSearch';

const REPORT_SEARCH_DEBOUNCE_MS = 300;

const formatReportDate = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// Figma: 완료 → bg #E9F8F0 / text #16A06B, 미생성 → bg #ECEFF3 / text #9AA4B2
function StatusBadge({ status }: { status: ReportSearchResponse['reportStatus'] }) {
  if (status === 'COMPLETED') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-caption bg-success/10 text-success">생성 완료</span>;
  }
  if (status === 'GENERATING') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-caption bg-warning/10 text-warning">생성 중</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-caption bg-error/10 text-error">생성 실패</span>;
}

export default function ReportPage() {
  const [keyword, setKeyword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportSearchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReportId, setDownloadingReportId] = useState<number | null>(null);
  const hasSearchQuery = keyword.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchReports({ ...toReportSearchQuery(keyword), size: 100 })
        .then((res) => {
          if (!cancelled) setReports(res.content);
        })
        .catch(() => {
          if (!cancelled) setNotice('리포트 목록을 불러오지 못했어요. 다시 시도해 주세요.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, REPORT_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [keyword]);

  const handleDownload = async (report: ReportSearchResponse) => {
    if (downloadingReportId !== null) return;
    setDownloadingReportId(report.reportId);
    try {
      await downloadReportPdfZip(report.reportId);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'PDF 다운로드에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-25">
      {/* 헤더 - Figma: h-56px, bg-gray-25, border-b gray-100 */}
      <header className="bg-gray-25 border-b border-gray-100 h-14 px-6 flex items-center">
        <div className="flex items-center gap-2">
          <PlogIcon />
          <h1 className="text-title text-gray-900">리포트</h1>
        </div>
      </header>

      {/* 검색창 - Figma: bg-white, border gray-100, h-49px≈h-12, rounded-13px≈rounded-lg */}
      <div className="px-6 pt-4 pb-3">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400"
            aria-hidden
          />
          <input
            type="text"
            placeholder="프로젝트명 또는 기간 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-4 rounded-lg border border-gray-100 bg-white',
              'text-body text-gray-900 placeholder:text-gray-400',
              'focus:outline-none focus:border-primary transition-colors',
            )}
          />
        </div>
      </div>

      {/* 리스트 - Figma: px-22px≈px-6, gap-12px=gap-3, pt-14px≈pt-3 */}
      <div className="flex-1 px-6 pt-3 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-body-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : reports.length === 0 && !hasSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-title text-gray-500">아직 리포트가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">참여 중인 프로젝트가 생기면 여기에 표시돼요</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="size-10 text-gray-300 mb-3" />
            <p className="text-title text-gray-500">검색 결과가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          reports.map((item) => (
            // Figma: bg-white, border gray-100, rounded-16px→rounded-2xl, shadow
            <div
              key={item.reportId}
              className="bg-white border border-gray-100 rounded-2xl shadow-md flex items-center px-5 py-4"
            >
              {/* 왼쪽: 프로젝트명 / 생성일 / 상태뱃지 - Figma: left-21px, gap-5px */}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1 pl-1">
                {/* Figma: 16px Bold, #161A20 */}
                <p className="text-body font-bold text-gray-900 truncate">
                  {item.projectName}
                </p>
                {/* Figma: 12px Medium, #9AA4B2 */}
                {item.completedAt && (
                  <p className="text-caption font-medium text-gray-400">
                    생성일: {formatReportDate(item.completedAt)}
                  </p>
                )}
                <StatusBadge status={item.reportStatus} />
              </div>

              {/* ZIP 버튼 - Figma: h-40px, px-16px, rounded-11px≈rounded-md */}
              {/* done: bg-primary #2186FB / pending: bg-gray-100 text-gray-400 */}
              <button
                type="button"
                disabled={item.reportStatus !== 'COMPLETED' || downloadingReportId !== null}
                onClick={() => handleDownload(item)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-md text-body-sm transition-colors',
                  item.reportStatus === 'COMPLETED'
                    ? 'bg-primary text-gray-25 hover:bg-primary-600 active:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                )}
              >
                ZIP
                <Download className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <AlertModal
        open={Boolean(notice)}
        title={notice ?? ''}
        onConfirm={() => setNotice(null)}
      />
    </div>
  );
}
