import { type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { usePeerEvaluationStore } from '../../store/peerEvaluationStore';

// ── SVG 아이콘 ──────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <div className="size-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
      <svg width="15" height="15" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path
          d="M12.9375 17.0625C10.9792 15.1042 10 12.75 10 10C10 7.25 10.9792 4.89583 12.9375 2.9375C14.8958 0.979167 17.25 0 20 0C22.75 0 25.1042 0.979167 27.0625 2.9375C29.0208 4.89583 30 7.25 30 10C30 12.75 29.0208 15.1042 27.0625 17.0625C25.1042 19.0208 22.75 20 20 20C17.25 20 14.8958 19.0208 12.9375 17.0625ZM0 35V33C0 31.5833 0.365001 30.2817 1.095 29.095C1.825 27.9083 2.79333 27.0017 4 26.375C6.58333 25.0833 9.20833 24.115 11.875 23.47C14.5417 22.825 17.25 22.5017 20 22.5C22.75 22.4983 25.4583 22.8217 28.125 23.47C30.7917 24.1183 33.4167 25.0867 36 26.375C37.2083 27 38.1775 27.9067 38.9075 29.095C39.6375 30.2833 40.0017 31.585 40 33V35C40 36.375 39.5108 37.5525 38.5325 38.5325C37.5542 39.5125 36.3767 40.0017 35 40H5C3.625 40 2.44833 39.5108 1.47 38.5325C0.491666 37.5542 0.00166667 36.3767 0 35Z"
          fill="#FAFBFC"
        />
      </svg>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0 mt-0.5">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#2186FB" strokeWidth="1.2" />
      <path d="M7.5 6.5v4" stroke="#2186FB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="4.5" r="0.75" fill="#2186FB" />
    </svg>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
      <InfoIcon />
      {children}
    </div>
  );
}

// ── 진행률 바 ────────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
      <div
        className="h-full bg-plog-gradient rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PeerEvalListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const projectState = usePeerEvaluationStore((s) =>
    id ? s.getProjectState(id) : { evaluations: {}, selfFeedback: null, submitted: false, submittedAt: null, partial: false }
  );
  const submitFinal = usePeerEvaluationStore((s) => s.submitFinal);

  // 평가 대상은 나를 제외한 팀원 전체 (익명성 정책: 닉네임 기준으로만 표시)
  const peers = (project?.members ?? []).filter(
    (member) => member.id !== user?.id && member.nickname !== user?.nickname,
  );
  const selfDone = projectState.selfFeedback?.done ?? false;

  const doneCount = peers.filter((peer) => projectState.evaluations[peer.id]?.done).length + (selfDone ? 1 : 0);
  const totalCount = peers.length + 1;
  const allDone = doneCount === totalCount;

  const handleSubmit = () => {
    if (!allDone || !id) return;
    submitFinal(id);
    navigate(`/project/${id}/report`, { state: { justSubmitted: true } });
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-25">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-gray-25 border-b border-gray-100 h-14 px-6 flex items-center gap-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="shrink-0">
          <ChevronLeft />
        </button>
        <span className="text-title text-gray-900">Peer 평가</span>
      </header>

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-4">
        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h3 font-semibold text-gray-900">
            {allDone ? '모든 평가 완료' : '평가할 팀원을 선택하세요'}
          </h1>
          <p className="text-caption font-normal text-gray-400">
            {allDone
              ? '자기 피드백까지 평가가 완료되었습니다. 최종 제출해 주세요.'
              : '닉네임 기반 익명 평가 / 리포트 발행 후 실명 공개'}
          </p>
        </div>

        {/* 진행률 */}
        <div className="flex flex-col gap-2">
          <span className="self-end text-body-sm font-semibold text-primary">
            {doneCount} / {totalCount}명 평가 완료
          </span>
          <ProgressBar value={doneCount} max={totalCount} />
        </div>

        {/* 팀원 카드 목록 */}
        <div className="flex flex-col gap-3 py-3">
          {peers.map((peer) => {
            const done = projectState.evaluations[peer.id]?.done ?? false;
            return (
              <div
                key={peer.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-md px-5 py-4 flex items-center gap-3"
              >
                {peer.profileImageUrl ? (
                  <img
                    src={peer.profileImageUrl}
                    alt={peer.nickname}
                    className="size-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <PersonIcon />
                )}
                <span className="flex-1 text-title text-gray-900">{peer.nickname}</span>
                {done ? (
                  <span className="bg-success/10 text-success rounded-full px-3.5 py-2 text-body-sm shrink-0">
                    완료
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${id}/peer-eval/${peer.id}/star`)}
                    className="bg-primary text-gray-25 rounded-full px-3.5 py-2 text-body-sm hover:bg-primary-600 transition-colors shrink-0"
                  >
                    평가하기
                  </button>
                )}
              </div>
            );
          })}

          {/* 자기 피드백 카드 */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-md px-5 py-4 flex items-start gap-3">
            <PersonIcon />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-title text-gray-900">자기 피드백</span>
                {selfDone ? (
                  <span className="bg-success/10 text-success rounded-full px-3.5 py-2 text-body-sm shrink-0">
                    완료
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${id}/peer-eval/self`)}
                    className="bg-primary text-gray-25 rounded-full px-3.5 py-2 text-body-sm hover:bg-primary-600 transition-colors shrink-0"
                  >
                    작성하기
                  </button>
                )}
              </div>
              <p className="text-caption text-gray-400 mt-2">
                활동 로그로 파악하기 어려운 기여 맥락 작성
              </p>
            </div>
          </div>
        </div>

        {/* 완료 상태 안내 박스 */}
        {allDone && (
          <InfoBox>
            <div className="text-caption text-primary leading-5">
              <p className="font-bold">제출 전 확인사항</p>
              <p className="font-normal">제출 후에는 수정이 불가합니다.</p>
              <p className="font-normal">전원 제출 완료 시 기여도 리포트가 자동으로 발행됩니다.</p>
            </div>
          </InfoBox>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        <button
          type="button"
          disabled={!allDone}
          onClick={handleSubmit}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            allDone
              ? 'bg-primary text-gray-25 hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {allDone ? '최종 제출하기' : '모든 평가 완료 후 제출 가능합니다'}
        </button>
      </div>
    </div>
  );
}
