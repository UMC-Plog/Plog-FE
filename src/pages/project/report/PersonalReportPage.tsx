import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
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
import {
  fetchReportMemberResult,
  findProjectReport,
} from '../../../api/report';
import { getProjectIntegrations } from '../../../api/projectApi';
import { toPersonalReportView } from '../../../lib/reportView';
import type {
  InsightIconKey,
  PersonalReportView,
  StrengthIconKey,
} from '../../../lib/reportViewTypes';
import insightGrowth from '../../../assets/report/insight-growth.svg';
import insightStar from '../../../assets/report/insight-star.svg';
import insightTarget from '../../../assets/report/insight-target.svg';
import strengthChat from '../../../assets/report/strength-chat.svg';
import strengthPen from '../../../assets/report/strength-pen.svg';
import strengthTeam from '../../../assets/report/strength-team.svg';
import warningIcon from '../../../assets/report/warning.svg';

const TABLE_GRID = 'grid grid-cols-[1.6fr_1fr_1fr_1fr_1.1fr]';
const reportCache = new Map<
  string,
  { report: PersonalReportView; cautionText: string | null }
>();

const STRENGTH_ICONS: Record<StrengthIconKey, string> = {
  team: strengthTeam,
  pen: strengthPen,
  chat: strengthChat,
};

const INSIGHT_ICONS: Record<InsightIconKey, string> = {
  growth: insightGrowth,
  star: insightStar,
  target: insightTarget,
};

// Figma 아이콘은 프레임보다 작은 실제 벡터 크기로 export되어, 고정 박스 안에 중앙 정렬한다.
function IconBox({ src, className }: { src: string; className: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center', className)}>
      <img src={src} alt="" aria-hidden />
    </span>
  );
}

export default function PersonalReportPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cached = projectId ? reportCache.get(projectId) : undefined;
  const [report, setReport] = useState<PersonalReportView | null>(cached?.report ?? null);
  const [cautionText, setCautionText] = useState<string | null>(cached?.cautionText ?? null);
  const [loadError, setLoadError] = useState(false);

  // 이 화면은 "내" 리포트인데 경로에 멤버 ID가 없다. 연동 상태 조회가 요청자의
  // projectMemberId를 함께 내려주므로 그것으로 내 결과를 찾는다.
  useEffect(() => {
    const numericProjectId = Number(projectId);
    if (!Number.isFinite(numericProjectId) || !projectId) return;
    let cancelled = false;

    Promise.all([findProjectReport(numericProjectId), getProjectIntegrations(projectId)])
      .then(([found, integrations]) => {
        if (!found || found.reportStatus !== 'COMPLETED') throw new Error('리포트 없음');
        return fetchReportMemberResult(found.reportId, integrations.projectMemberId);
      })
      .then((result) => {
        if (cancelled) return;
        const view = toPersonalReportView(result);
        reportCache.set(projectId, { report: view, cautionText: result.cautionText });
        setReport(view);
        // 분석 근거가 부족한 경우 서버가 한계를 알려준다(기능명세서의 '분석 제한' 표시).
        setCautionText(result.cautionText);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleTabChange = (tab: ReportTab) => {
    if (tab === 'team') navigate(`/project/${projectId}/report/team`);
  };

  const handleBack = () => navigate(`/project/${projectId}/report`, { replace: true });

  if (!report) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gray-25">
        <ReportHeader title="개인 리포트" onBack={handleBack} />
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
        <ReportTabBar active="personal" onChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-25">
      <ReportHeader title="개인 리포트" onBack={handleBack} />

      <ReportHero
        label={report.reportCode}
        title={report.projectName}
        badges={[
          { icon: 'calendar', text: `발행 ${report.publishedAt}` },
          { icon: 'period', text: report.period },
        ]}
      />

      <main className="-mt-[74px] flex flex-1 flex-col gap-[30px] px-5 pb-8">
        <div className="flex gap-3">
          <ReportStatCard
            label="종합 기여도 점수"
            value={report.contributionScore}
            unit="/100"
          />
          <ReportStatCard
            label="협업 안정도"
            value={report.collaborationStability}
            unit="%"
          />
        </div>

        <ReportAiNote label="AI 한줄 평가">{report.aiComment}</ReportAiNote>

        {/* 미제출·활동 부족 등으로 분석 근거가 모자란 경우, 점수를 그대로 신뢰하지 않도록 알린다 */}
        {cautionText && (
          <div className="flex items-start gap-2 rounded-12 bg-[#FEF6E7] px-[13px] py-[11px]">
            <img src={warningIcon} alt="" className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="text-[12px] font-normal leading-[16px] text-warning">{cautionText}</span>
          </div>
        )}

        {/* ① 기여도 상세 분석 */}
        <ReportSection
          step={1}
          title="기여도 상세 분석"
          description="업무 영역별 기여도 점수 및 팀 내 상위 비율이에요"
        >
          <div className="overflow-hidden rounded-[8px] border border-gray-100 p-px">
            <div className={cn(TABLE_GRID, 'bg-gray-100 px-3.5 py-2.5')}>
              <span className="text-[12px] font-normal leading-[16px] text-gray-400">항목</span>
              <span className="text-center text-[12px] font-normal leading-[16px] text-gray-400">
                점수
              </span>
            </div>

            {report.detailRows.map((row) => (
              <div
                key={row.label}
                className={cn(TABLE_GRID, 'items-center border-t border-gray-50 px-3.5 pb-3 pt-[13px]')}
              >
                <span className="truncate text-[14px] font-normal leading-[20px] text-gray-900">
                  {row.label}
                </span>
                <span className="text-center text-[14px] font-normal leading-[20px] text-gray-900">
                  {row.score}
                </span>
                <span className="col-span-3">
                  <ScoreBar percent={row.score} color={row.color} />
                </span>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ② 강점 분석 */}
        <ReportSection
          step={2}
          title="강점 분석"
          description={`${report.ownerName}님의 강점을 AI가 분석했어요`}
        >
          <div className="flex gap-2.5">
            {report.strengths.map((strength) => (
              <div
                key={strength.title}
                className="flex h-[128px] w-[112px] shrink-0 flex-col items-center gap-2 rounded-16 border border-gray-200 px-[10px] pt-[13px] shadow-chip"
              >
                <IconBox src={STRENGTH_ICONS[strength.icon]} className="size-8" />
                <span className="text-[14px] font-bold leading-[20px] text-gray-700">
                  {strength.title}
                </span>
                <p className="text-center text-[12px] font-normal leading-[16px] text-gray-500">
                  {strength.description}
                </p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ③ 취약점 진단 */}
        <ReportSection
          step={3}
          title="취약점 진단"
          description={`${report.ownerName}님의 약점을 AI가 분석했어요`}
        >
          <div className="flex h-[171px] items-center rounded-18 border border-gray-100 py-[21px] pl-px">
            <ReportDonut
              gaugePercent={report.weakness.percent}
              caption="취약도"
              value={report.weakness.percent}
              unit="%"
            />
            {/* 제목이 한 줄에 들어가야 해서 오른쪽 패딩 없이 남는 폭(201px)을 모두 쓴다 */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-[3px]">
                <span className="text-[11px] font-normal leading-[16px] text-gray-500">주요 취약점</span>
                <span className="break-keep text-[14px] font-bold leading-[20px] text-gray-900">
                  {report.weakness.title}
                </span>
              </div>
              <ul className="list-disc pl-4 text-[11px] font-normal leading-[16px] text-gray-500">
                {report.weakness.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </ReportSection>

        {/* ④ AI 개인 성장 인사이트 */}
        <ReportSection
          step={4}
          title="AI 개인 성장 인사이트"
          description="지속적인 성장을 위한 맞춤 인사이트를 확인해 보세요"
        >
          <div className="overflow-hidden rounded-16 border border-gray-100 p-px shadow-card">
            {report.insights.map((insight, index) => (
              <div
                key={insight.label}
                className={cn(
                  'flex items-center gap-3 px-[18px] py-3.5',
                  index < report.insights.length - 1 && 'border-b border-gray-100',
                )}
              >
                <IconBox src={INSIGHT_ICONS[insight.icon]} className="size-6" />
                <span className="w-[79px] shrink-0 text-[15px] font-normal leading-[24px] text-gray-900">
                  {insight.label}
                </span>
                <span className="min-w-0 flex-1 text-[12px] font-normal leading-[16px] text-gray-500">
                  {insight.text}
                </span>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ⑤ AI 문장 변환 */}
        <ReportSection
          step={5}
          title="AI 문장 변환"
          description="업무 경험을 자기소개서/포트폴리오 문장으로 변환했어요"
        >
          {report.sentences.map((sentence) => (
            <ReportAiNote key={sentence.label} label={sentence.label}>
              {sentence.text}
            </ReportAiNote>
          ))}
        </ReportSection>
      </main>

      <ReportTabBar active="personal" onChange={handleTabChange} />
    </div>
  );
}
