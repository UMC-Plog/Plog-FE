import { useState, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { PlogIcon } from '../components/PlogIcon';
import { AlertModal } from '../components/Modal';
import { cn } from '../lib/utils';
import { useProjectStore } from '../store/projectStore';
import { usePeerEvaluationStore } from '../store/peerEvaluationStore';

type ReportStatus = 'done' | 'pending';

interface ReportItem {
  id: string;
  projectName: string;
  createdAt: string;
  status: ReportStatus;
}

const formatReportDate = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// Figma: 완료 → bg #E9F8F0 / text #16A06B, 미생성 → bg #ECEFF3 / text #9AA4B2
function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-caption',
        status === 'done'
          ? 'bg-success/10 text-success'
          : 'bg-gray-100 text-gray-400',
      )}
    >
      {status === 'done' ? '생성 완료' : '미생성'}
    </span>
  );
}

export default function ReportPage() {
  const [keyword, setKeyword] = useState('');
  const [notice, setNotice] = useState(false);
  const projects = useProjectStore((state) => state.projects);
  const byProject = usePeerEvaluationStore((state) => state.byProject);

  const reports = useMemo<ReportItem[]>(
    () =>
      projects.map((project) => {
        const evalState = byProject[project.id];
        const done = evalState?.submitted ?? false;
        return {
          id: project.id,
          projectName: project.name,
          createdAt: done ? formatReportDate(evalState?.submittedAt ?? null) : '',
          status: done ? 'done' : 'pending',
        };
      }),
    [projects, byProject],
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.projectName.toLowerCase().includes(q) ||
        r.createdAt.includes(q),
    );
  }, [reports, keyword]);

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
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-title text-gray-500">아직 리포트가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">참여 중인 프로젝트가 생기면 여기에 표시돼요</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="size-10 text-gray-300 mb-3" />
            <p className="text-title text-gray-500">검색 결과가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          filtered.map((item) => (
            // Figma: bg-white, border gray-100, rounded-16px→rounded-2xl, shadow
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl shadow-md flex items-center px-5 py-4"
            >
              {/* 왼쪽: 프로젝트명 / 생성일 / 상태뱃지 - Figma: left-21px, gap-5px */}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1 pl-1">
                {/* Figma: 16px Bold, #161A20 */}
                <p className="text-body font-bold text-gray-900 truncate">
                  {item.projectName}
                </p>
                {/* Figma: 12px Medium, #9AA4B2 */}
                {item.status === 'done' && (
                  <p className="text-caption font-medium text-gray-400">
                    생성일: {item.createdAt}
                  </p>
                )}
                <StatusBadge status={item.status} />
              </div>

              {/* PDF 버튼 - Figma: h-40px, px-16px, rounded-11px≈rounded-md */}
              {/* done: bg-primary #2186FB / pending: bg-gray-100 text-gray-400 */}
              <button
                type="button"
                disabled={item.status === 'pending'}
                onClick={() => setNotice(true)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-md text-body-sm transition-colors',
                  item.status === 'done'
                    ? 'bg-primary text-gray-25 hover:bg-primary-600 active:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                )}
              >
                PDF
                <Download className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <AlertModal
        open={notice}
        title="PDF 다운로드는 준비 중이에요"
        onConfirm={() => setNotice(false)}
      />
    </div>
  );
}
