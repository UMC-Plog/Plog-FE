import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { PeerEvalAvatar } from '../../../components/PeerEvalAvatar';
import { AlertModal } from '../../../components/Modal';
import {
  ReportAiNote,
  ReportDonut,
  ReportSection,
  ReportStatCard,
  ScoreBar,
} from '../../../components/report/ReportBlocks';
import {
  ReportHeader,
  ReportHero,
  ReportTabBar,
  type ReportTab,
} from '../../../components/report/ReportChrome';
import { downloadReportPdfZip, fetchReportDetail, findProjectReport } from '../../../api/report';
import { ApiError } from '../../../api/client';
import { teamReportCache } from '../../../lib/reportCache';
import { toTeamReportView } from '../../../lib/reportView';
import starIcon from '../../../assets/report/star.svg';
import warningIcon from '../../../assets/report/warning.svg';

// 표 열 비율 — Figma 실측(1.60 / 1 / 1 / 1 / 1.10)
const TABLE_GRID = 'grid grid-cols-[1.6fr_1fr_1fr_1fr_1.1fr]';
// 이 비율 미만이면 경고 색으로 표시하고 하단 경고 문구에 포함한다
const RATE_WARNING_THRESHOLD = 80;

const rateTone = (rate: number) => (rate >= RATE_WARNING_THRESHOLD ? 'text-success' : 'text-error');

export default function TeamReportPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cached = projectId ? teamReportCache.get(projectId) : undefined;
  const [report, setReport] = useState(cached?.report ?? null);
  const [reportId, setReportId] = useState<number | null>(cached?.reportId ?? null);
  const [loadError, setLoadError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 화면은 projectId만 알고 들어오므로 리포트를 먼저 찾고 상세를 받아온다.
  useEffect(() => {
    const numericProjectId = Number(projectId);
    if (!projectId || !Number.isFinite(numericProjectId)) return;
    let cancelled = false;

    findProjectReport(numericProjectId)
      .then(async (found) => {
        // 발행 전이면 members가 빈 배열로 와서 표가 비어 보이므로 완료된 리포트만 그린다.
        if (!found || found.reportStatus !== 'COMPLETED') throw new Error('리포트 없음');
        return fetchReportDetail(found.reportId);
      })
      .then((detail) => {
        if (cancelled) return;
        const view = toTeamReportView(detail);
        teamReportCache.set(projectId, { reportId: detail.reportId, report: view });
        setReportId(detail.reportId);
        setReport(view);
      })
      .catch(() => {
        if (cancelled) return;
        // 캐시로 이미 그리고 있다면 화면을 지우지 말고, 최신이 아닐 수 있다는 것만 알린다.
        if (teamReportCache.has(projectId)) {
          setNotice('최신 리포트를 불러오지 못했어요. 표시된 내용이 오래됐을 수 있어요.');
        } else {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const deadlineWarnings =
    report?.completionRows.filter((row) => row.deadlineRate < RATE_WARNING_THRESHOLD) ?? [];

  const handleTabChange = (tab: ReportTab) => {
    if (tab === 'personal') navigate(`/project/${projectId}/report/personal`);
  };

  const handleBack = () => navigate(`/project/${projectId}/report`, { replace: true });

  const handleDownload = async () => {
    if (!reportId || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadReportPdfZip(reportId);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : '리포트 다운로드에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!report) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gray-25">
        <ReportHeader title="팀 리포트" onBack={handleBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5">
          <p className="text-title font-medium text-gray-500">
            {loadError ? '리포트를 불러오지 못했어요' : '리포트를 불러오는 중...'}
          </p>
          {loadError && (
            <p className="text-center text-body-sm text-gray-400">
              아직 발행되지 않았거나 일시적인 오류일 수 있어요
            </p>
          )}
        </div>
        <ReportTabBar active="team" onChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-25">
      <ReportHeader
        title="팀 리포트"
        onBack={handleBack}
        onDownload={handleDownload}
        downloadDisabled={!reportId || !report.pdfAvailable || isDownloading}
      />

      <ReportHero
        label={report.reportCode}
        title={report.projectName}
        badges={[
          { icon: 'calendar', text: `발행 ${report.publishedAt}` },
          { icon: 'people', text: `팀원 ${report.memberCount}명` },
          { icon: 'period', text: report.period },
        ]}
      />

      <main className="-mt-[74px] flex flex-1 flex-col gap-[30px] px-5 pb-8">
        <div className="flex gap-3">
          <ReportStatCard
            label="전체 업무 완료율"
            value={report.taskCompletionRate}
            unit="%"
            caption={report.taskCompletionCaption}
          />
          <ReportStatCard
            label="마감 준수율"
            value={report.deadlineRate}
            unit="%"
            caption={report.deadlineCaption}
          />
        </div>

        <ReportAiNote label="AI 인사이트">{report.aiInsight}</ReportAiNote>

        {/* ① 팀 업무 완수 현황 */}
        <ReportSection step={1} title="팀 업무 완수 현황" description="전체적으로 목표한 업무를 달성 중이에요">
          <div className="overflow-hidden rounded-[8px] border border-gray-100 p-px">
            <div className={cn(TABLE_GRID, 'bg-gray-100 px-3.5 py-2.5')}>
              {['팀원', '전체', '완료', '완료율', '마감 준수'].map((head, index) => (
                <span
                  key={head}
                  className={cn(
                    'text-[12px] font-normal leading-[16px] text-gray-400',
                    index === 0 && 'text-left',
                    index > 0 && index < 4 && 'text-center',
                    index === 4 && 'text-right',
                  )}
                >
                  {head}
                </span>
              ))}
            </div>

            {report.completionRows.map((row) => (
              <div
                key={row.id}
                className={cn(TABLE_GRID, 'items-center border-t border-gray-50 px-3.5 pb-3 pt-[13px]')}
              >
                <span className="flex items-center gap-[9px]">
                  <PeerEvalAvatar profilePreset={row.profilePreset} size="xs" />
                  <span className="truncate text-[14px] font-normal leading-[20px] text-gray-900">
                    {row.name}
                  </span>
                </span>
                <span className="text-center text-[14px] font-normal leading-[20px] text-gray-900">
                  {row.total}개
                </span>
                <span className="text-center text-[14px] font-normal leading-[20px] text-gray-900">
                  {row.done}개
                </span>
                <span
                  className={cn('text-center text-[14px] font-normal leading-[20px]', rateTone(row.doneRate))}
                >
                  {row.doneRate}%
                </span>
                <span
                  className={cn('text-right text-[14px] font-normal leading-[20px]', rateTone(row.deadlineRate))}
                >
                  {row.deadlineRate}%
                </span>
              </div>
            ))}
          </div>

          {deadlineWarnings.length > 0 && (
            <div className="flex items-center gap-2 rounded-12 bg-[#FEF6E7] px-[13px] py-[11px]">
              <img src={warningIcon} alt="" className="size-4 shrink-0" aria-hidden />
              <span className="text-[12px] font-normal leading-[16px] text-warning">
                마감 준수율 경고:{' '}
                {deadlineWarnings.map((row) => `${row.name}(${row.deadlineRate}%)`).join(', ')}
              </span>
            </div>
          )}
        </ReportSection>

        {/* ② 팀 기여도 분포 */}
        <ReportSection
          step={2}
          title="팀 기여도 분포"
          description="업무 완료, 활동 지수, Peer 평가를 종합한 결과예요"
        >
          <div className="flex h-[171px] items-center gap-4 rounded-18 border border-gray-100 py-[21px] pl-[13px] pr-[19px]">
            <ReportDonut
              segments={report.contributions.map((item) => ({
                key: String(item.id),
                value: item.percent,
                color: item.color,
              }))}
              caption="팀 평균 기여율"
              value={report.averageContribution}
              unit="%"
            />
            <ul className="flex w-[138px] shrink-0 flex-col gap-3">
              {report.contributions.map((item) => (
                <li key={item.id} className="flex items-center gap-[9px]">
                  <span
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-normal leading-[20px] text-gray-900">
                    {item.name}
                  </span>
                  <span
                    className="text-[14px] font-normal leading-[20px]"
                    style={{ color: item.color }}
                  >
                    {item.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ReportSection>

        {/* ④ 팀원별 활동 요약 — Figma 시안에 ③이 없어 번호를 그대로 따랐다 */}
        <ReportSection
          step={4}
          title="팀원별 활동 요약"
          description="완료율은 전체 부여 업무 기준으로 계산했어요"
        >
          {report.members.map((member) => (
            <article
              key={member.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-100 px-[15px] py-3.5"
            >
              <div className="flex items-center gap-3">
                <PeerEvalAvatar profilePreset={member.profilePreset} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-[14px] font-normal leading-[20px] text-gray-900">
                      {member.name}
                    </span>
                    <span className="flex gap-1">
                      {member.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-12 bg-primary-50 px-2 py-[3px] text-[12px] font-normal leading-[16px] text-primary"
                        >
                          {keyword}
                        </span>
                      ))}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[12px] font-normal leading-[16px] text-gray-400">
                    {member.activity}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-right">
                  <span className="text-[15px] font-bold leading-[24px] text-navy-700">
                    {member.peerAverage.toFixed(2)}
                  </span>
                  <span className="text-[12px] font-normal leading-[16px] text-gray-400"> / 5.0</span>
                </span>
              </div>

              <ReportAiNote label="AI 한줄 평가" tight>
                {member.aiComment}
              </ReportAiNote>

              <div className="relative px-2 py-[11px]">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" aria-hidden />
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200" aria-hidden />
                <div className="relative grid grid-cols-2 gap-x-[28px] gap-y-[31px]">
                  {member.scores.map((score) => (
                    <div key={score.label} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-[12px] font-medium leading-[16px] text-gray-900">
                          {score.label}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          <span className="text-[15px] font-normal leading-[24px] text-navy-700">
                            {score.score.toFixed(1)}
                          </span>
                          <span className="text-[12px] font-normal leading-[16px] text-gray-400">
                            {' '}
                            / 5.0
                          </span>
                        </span>
                      </div>
                      <ScoreBar percent={(score.score / 5) * 100} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex h-[55px] items-center justify-between rounded-16 bg-peer-average px-[18px]">
                <span className="text-[14px] font-bold leading-[20px] text-gray-25">종합 Peer 평균</span>
                <span className="flex items-center gap-[7px]">
                  <img src={starIcon} alt="" className="size-[17px] shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">
                    <span className="text-[18px] font-semibold leading-[28px] text-gray-25">
                      {member.peerAverage.toFixed(2)}
                    </span>
                    <span className="text-[12px] font-normal leading-[16px] text-navy-100"> / 5.0</span>
                  </span>
                </span>
              </div>
            </article>
          ))}
        </ReportSection>
      </main>

      <ReportTabBar active="team" onChange={handleTabChange} />
      <AlertModal
        open={Boolean(notice)}
        title={notice ?? ''}
        onConfirm={() => setNotice(null)}
      />
    </div>
  );
}
