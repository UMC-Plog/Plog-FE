import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import aiSparkle from '../../assets/report/ai-sparkle.svg';

// 리포트 본문은 대부분 AI가 만든 한글 문장이다. word-break 기본값(normal)은 한글을
// 아무 글자에서나 끊어 "리/더십", "긍정적으/로"처럼 읽기 어렵게 쪼갠다.
//
// break-keep만 쓰면 반대로 한 줄에 안 들어가는 긴 단어가 상자 밖으로 삐져나온다
// (강점 카드처럼 폭이 85px밖에 안 되는 곳에서 실제로 50px 넘쳤다).
// break-words를 함께 걸어 평소에는 단어를 지키고, 정말 안 들어갈 때만 끊게 한다.
const BODY_TEXT = 'break-keep break-words';

// ── 번호가 붙은 섹션 ─────────────────────────────────────────────────────────

export function ReportSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[9px] bg-primary text-[14px] font-bold leading-[20px] text-gray-25">
          {step}
        </span>
        <h2 className="text-[18px] font-normal leading-[28px] text-gray-900">{title}</h2>
      </div>
      <p className={cn(BODY_TEXT, 'text-[12px] font-normal leading-[16px] text-gray-400')}>
        {description}
      </p>
      {children}
    </section>
  );
}

// ── 진행률 바 ────────────────────────────────────────────────────────────────

export function ScoreBar({ percent, color }: { percent: number; color?: string }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={cn('h-full rounded-full', !color && 'bg-gradient-to-r from-primary to-aqua')}
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── 요약 스코어 카드 ──────────────────────────────────────────────────────────

export function ReportStatCard({
  label,
  value,
  unit,
  percent,
  caption,
}: {
  label: string;
  value: number | null;
  unit: string;
  percent?: number;
  caption?: { muted: string; highlight: string };
}) {
  return (
    <div className="report-stat-card flex min-w-0 flex-1 flex-col gap-1.5 rounded-16 bg-white p-4 shadow-stat">
      <p className="text-[12px] font-normal leading-[16px] text-gray-900">{label}</p>
      <div className="flex h-[38px] items-baseline gap-[3px]">
        {value === null ? (
          <span className="text-[20px] font-bold leading-[38px] text-gray-500">측정 불가</span>
        ) : (
          <>
            <span className="text-[36px] font-bold leading-[40px] text-primary">{value}</span>
            <span className="text-[22px] font-semibold text-primary-300">{unit}</span>
          </>
        )}
      </div>
      {value === null ? (
        <div className="h-1.5 w-full rounded-full bg-gray-100" />
      ) : (
        <ScoreBar percent={percent ?? value} />
      )}
      {caption && (
        <div className="pt-[3px] text-[12px] font-normal leading-[16px]">
          <p className="text-gray-400">{caption.muted}</p>
          <p className="text-primary">{caption.highlight}</p>
        </div>
      )}
    </div>
  );
}

// ── AI 코멘트 박스 ────────────────────────────────────────────────────────────

export function ReportAiNote({
  label,
  tight,
  children,
}: {
  label: string;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-16 bg-primary-50 px-5 py-3.5">
      <div className={cn('flex flex-col', tight ? 'gap-1' : 'gap-2')}>
        <div className="flex items-start gap-1">
          <img src={aiSparkle} alt="" className="size-4 shrink-0" aria-hidden />
          <span className="text-[12px] font-normal leading-[16px] text-navy-700">{label}</span>
        </div>
        <p className={cn(BODY_TEXT, 'text-[12px] font-normal leading-[16px] text-gray-500')}>
          {children}
        </p>
      </div>
    </div>
  );
}

// ── 도넛 차트 ────────────────────────────────────────────────────────────────

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

// Figma 실측: 160x160 박스 안에 바깥 반지름 65.82의 링을 그리고,
// 그 위를 배경색(gray-25) 원(반지름 48)이 덮어 가운데를 뚫는 구조다.
// 여기서는 덮는 원 대신 보이는 링(48~65.82)만 stroke로 직접 그린다.
const DONUT_SIZE = 160;
const DONUT_OUTER_RADIUS = 65.82;
const DONUT_INNER_RADIUS = 48;
const DONUT_RADIUS = (DONUT_OUTER_RADIUS + DONUT_INNER_RADIUS) / 2;
const DONUT_THICKNESS = DONUT_OUTER_RADIUS - DONUT_INNER_RADIUS;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
// 12시 방향에서 시계 방향으로 시작하도록 1/4바퀴만큼 당긴다
const DONUT_START_OFFSET = DONUT_CIRCUMFERENCE / 4;
const DONUT_TRACK_COLOR = '#DDE2E9';

export function ReportDonut({
  segments,
  gaugePercent,
  caption,
  value,
  unit,
}: {
  segments?: DonutSegment[];
  gaugePercent?: number;
  caption: string;
  value: number;
  unit: string;
}) {
  const gradientId = `report-donut-gradient-${caption}`;
  const arcs: DonutSegment[] =
    gaugePercent === undefined
      ? (segments ?? [])
      : [{ key: 'gauge', value: gaugePercent, color: `url(#${gradientId})` }];
  const total =
    gaugePercent === undefined ? arcs.reduce((sum, arc) => sum + arc.value, 0) : 100;
  let consumed = 0;

  return (
    <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
      <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} className="size-full" aria-hidden>
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="63.7919"
            y1="16.2079"
            x2="96.2081"
            y2="143.792"
          >
            <stop stopColor="#2186FB" />
            <stop offset="1" stopColor="#07BCC5" />
          </linearGradient>
        </defs>

        {gaugePercent !== undefined && (
          <circle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={DONUT_RADIUS}
            fill="none"
            stroke={DONUT_TRACK_COLOR}
            strokeWidth={DONUT_THICKNESS}
          />
        )}

        {arcs.map((arc) => {
          const length = total > 0 ? (arc.value / total) * DONUT_CIRCUMFERENCE : 0;
          const offset = consumed;
          consumed += length;
          return (
            <circle
              key={arc.key}
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={DONUT_THICKNESS}
              strokeDasharray={`${length} ${DONUT_CIRCUMFERENCE - length}`}
              strokeDashoffset={DONUT_START_OFFSET - offset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[12px] font-normal leading-[16px] text-gray-400">{caption}</span>
        <span className="flex items-baseline gap-[3px] text-navy-700">
          <span className="text-[28px] font-semibold leading-[40px]">{value}</span>
          <span className="text-[15px] font-normal leading-[24px]">{unit}</span>
        </span>
      </div>
    </div>
  );
}
