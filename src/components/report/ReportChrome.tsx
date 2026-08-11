import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import badgeCalendar from '../../assets/report/badge-calendar.svg';
import badgePeople from '../../assets/report/badge-people.svg';
import badgePeriod from '../../assets/report/badge-period.svg';
import shareIcon from '../../assets/report/header-share.svg';
import tabPersonIcon from '../../assets/report/tab-person.svg';
import tabTeamIcon from '../../assets/report/tab-team.svg';

export type ReportTab = 'team' | 'personal';

// ── 아이콘 ───────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path
        d="M7 1L1 8L7 15"
        stroke="#161A20"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 탭 아이콘은 선택 여부에 따라 색이 바뀌어야 해서, 색이 고정된 SVG를 마스크로 써서
// currentColor로 칠한다 (Figma 벡터 형태는 그대로 유지).
// Vite가 작은 SVG를 작은따옴표가 포함된 data URI로 인라인하므로 url()을 반드시 큰따옴표로 감싼다.
function MaskIcon({ src, size, className }: { src: string; size: string; className?: string }) {
  const maskUrl = `url("${src}")`;
  return (
    <span
      aria-hidden
      className={cn('block shrink-0 bg-current', className)}
      style={{
        maskImage: maskUrl,
        WebkitMaskImage: maskUrl,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskSize: size,
        WebkitMaskSize: size,
      }}
    />
  );
}

// ── 상단 헤더 ────────────────────────────────────────────────────────────────

export function ReportHeader({
  title,
  onBack,
  onShare,
}: {
  title: string;
  onBack?: () => void;
  onShare?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-gray-25 pl-[25px] pr-6 shadow-[0px_4px_2px_rgba(204,204,204,0.25)]">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          aria-label="뒤로"
          className="shrink-0"
        >
          <ChevronLeft />
        </button>
        <span className="text-[18px] font-semibold leading-[28px] text-gray-900">{title}</span>
      </div>
      <button type="button" onClick={onShare} aria-label="리포트 공유" className="shrink-0">
        <img src={shareIcon} alt="" className="size-5" aria-hidden />
      </button>
    </header>
  );
}

// ── 그라데이션 히어로 ─────────────────────────────────────────────────────────

const BADGE_ICONS = {
  calendar: badgeCalendar,
  people: badgePeople,
  period: badgePeriod,
} as const;

export interface ReportHeroBadge {
  icon: keyof typeof BADGE_ICONS;
  text: string;
}

export function ReportHero({
  label,
  title,
  badges,
}: {
  label: string;
  title: string;
  badges: ReportHeroBadge[];
}) {
  return (
    <div className="bg-report-hero px-5 pb-[86px] pt-[26px]">
      <div className="flex flex-col gap-3.5">
        <span className="text-[12px] font-normal leading-[16px] text-gray-25">{label}</span>
        <h1 className="text-[22px] font-semibold leading-[32px] text-gray-25">{title}</h1>
        <div
          className="grid gap-2 pt-0.5"
          style={{ gridTemplateColumns: `repeat(${badges.length}, minmax(0, 1fr))` }}
        >
          {badges.map((badge) => (
            <span
              key={badge.text}
              className="flex h-7 min-w-0 items-center justify-center gap-1 rounded-full bg-white/[0.16] px-1.5"
            >
              <img src={BADGE_ICONS[badge.icon]} alt="" className="size-[13px] shrink-0" aria-hidden />
              <span className="whitespace-nowrap text-[clamp(9px,2.8vw,12px)] font-normal leading-[16px] text-gray-25">
                {badge.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 하단 탭바 ────────────────────────────────────────────────────────────────

function TabItem({
  label,
  icon,
  iconSize,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  iconSize: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-full w-[92px] flex-col items-center gap-[5px] transition-colors',
        active ? 'text-primary' : 'text-gray-400',
      )}
    >
      <MaskIcon src={icon} size={iconSize} className="size-6" />
      <span className="whitespace-nowrap text-[12px] font-normal leading-[16px]">{label}</span>
    </button>
  );
}

export function ReportTabBar({
  active,
  onChange,
}: {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-20 flex h-[88px] shrink-0 items-start justify-center gap-[92px] border-t border-gray-100 bg-white pb-[22px] pt-[11px]">
      <TabItem
        label="팀 리포트"
        icon={tabTeamIcon}
        iconSize="24px 24px"
        active={active === 'team'}
        onClick={() => onChange('team')}
      />
      <TabItem
        label="개인 리포트"
        icon={tabPersonIcon}
        iconSize="20px 12px"
        active={active === 'personal'}
        onClick={() => onChange('personal')}
      />
    </nav>
  );
}
