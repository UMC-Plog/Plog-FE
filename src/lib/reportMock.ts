import type { ProfilePreset } from './profilePreset';

// 리포트 API가 아직 없어 화면 확인용 목업 데이터를 사용한다.
// 연동 시 이 파일을 제거하고 동일한 형태의 응답 타입으로 교체한다.

export const REPORT_SERIES_COLORS = ['#2186FB', '#06BCC4', '#173E8A', '#7DB2FC'] as const;

export interface TeamCompletionRow {
  name: string;
  profilePreset: ProfilePreset;
  total: number;
  done: number;
  doneRate: number;
  deadlineRate: number;
}

export interface TeamContribution {
  name: string;
  percent: number;
  color: string;
}

export interface MemberPeerScore {
  label: string;
  score: number;
}

export interface TeamMemberSummary {
  name: string;
  profilePreset: ProfilePreset;
  keywords: string[];
  activity: string;
  aiComment: string;
  scores: MemberPeerScore[];
  peerAverage: number;
}

export interface TeamReportMock {
  projectName: string;
  publishedAt: string;
  memberCount: number;
  period: string;
  taskCompletionRate: number;
  taskCompletionCaption: { muted: string; highlight: string };
  deadlineRate: number;
  deadlineCaption: { muted: string; highlight: string };
  aiInsight: string;
  completionRows: TeamCompletionRow[];
  contributions: TeamContribution[];
  averageContribution: number;
  members: TeamMemberSummary[];
}

const PEER_SCORES: MemberPeerScore[] = [
  { label: '협업 태도', score: 4.4 },
  { label: '리더십', score: 4.2 },
  { label: '커뮤니케이션', score: 4.0 },
  { label: '산출물 기여', score: 4.4 },
];

export const TEAM_REPORT_MOCK: TeamReportMock = {
  projectName: '테스트 프로젝트',
  publishedAt: '2026.06.12',
  memberCount: 4,
  period: '05.01–06.12',
  taskCompletionRate: 87,
  taskCompletionCaption: { muted: '활동 로그 15건 기준', highlight: '13건 완료' },
  deadlineRate: 92,
  deadlineCaption: { muted: '기한 내 완료', highlight: '12/13건' },
  aiInsight:
    '팀원들은 각자의 역할을 안정적으로 수행하며, 진행 상황과 의견을 꾸준히 공유해 원활한 협업 흐름을 만들었습니다 앞으로는 초기 단계에서 우선순위와 의사결정 기준을 더욱 명확히 정한다면 협업 효율을 높일 수 있습니다',
  completionRows: [
    { name: '노홍철', profilePreset: 'OTTER', total: 4, done: 4, doneRate: 100, deadlineRate: 100 },
    { name: '유재석', profilePreset: 'PENGUIN', total: 4, done: 3, doneRate: 75, deadlineRate: 75 },
    { name: '박명수', profilePreset: 'FROG', total: 4, done: 3, doneRate: 75, deadlineRate: 100 },
    { name: '황광희', profilePreset: 'KOALA', total: 3, done: 3, doneRate: 100, deadlineRate: 100 },
  ],
  contributions: [
    { name: '노홍철', percent: 46, color: REPORT_SERIES_COLORS[0] },
    { name: '유재석', percent: 30, color: REPORT_SERIES_COLORS[1] },
    { name: '박명수', percent: 12, color: REPORT_SERIES_COLORS[2] },
    { name: '황광희', percent: 12, color: REPORT_SERIES_COLORS[3] },
  ],
  averageContribution: 100,
  members: [
    {
      name: '노홍철',
      profilePreset: 'OTTER',
      keywords: ['리더십', '책임감'],
      activity: '전체 4개 · 완료 4개 · 완료율 100%',
      aiComment:
        '적극적인 리더십으로 팀의 방향을 잡고, 구성원들이 원활하게 협업할 수 있도록 분위기를 주도했어요',
      scores: PEER_SCORES,
      peerAverage: 4.25,
    },
    {
      name: '유재석',
      profilePreset: 'PENGUIN',
      keywords: ['리더십', '책임감'],
      activity: '전체 4개 · 완료 4개 · 완료율 100%',
      aiComment:
        '팀원의 의견을 존중하고 필요한 순간마다 적극적으로 도움을 주며 긍정적인 협업 분위기를 만들었어요',
      scores: PEER_SCORES,
      peerAverage: 4.25,
    },
    {
      name: '박명수',
      profilePreset: 'FROG',
      keywords: ['리더십', '책임감'],
      activity: '전체 4개 · 완료 4개 · 완료율 100%',
      aiComment: '진행 상황과 의견을 명확하게 공유하며 팀원 간의 원활한 소통을 이끌었어요',
      scores: PEER_SCORES,
      peerAverage: 4.25,
    },
    {
      name: '황광희',
      profilePreset: 'KOALA',
      keywords: ['리더십', '책임감'],
      activity: '전체 4개 · 완료 4개 · 완료율 100%',
      aiComment: '높은 완성도의 결과물을 꾸준히 만들어 프로젝트의 품질 향상에 크게 기여했어요',
      scores: PEER_SCORES,
      peerAverage: 4.25,
    },
  ],
};

export type StrengthIconKey = 'team' | 'pen' | 'chat';
export type InsightIconKey = 'growth' | 'star' | 'target';

export interface PersonalReportMock {
  reportCode: string;
  projectName: string;
  publishedAt: string;
  period: string;
  ownerName: string;
  contributionScore: number;
  collaborationStability: number;
  aiComment: string;
  detailRows: { label: string; score: number; color: string }[];
  strengths: { icon: StrengthIconKey; title: string; description: string }[];
  weakness: {
    percent: number;
    title: string;
    tips: string[];
  };
  insights: { icon: InsightIconKey; label: string; text: string }[];
  sentences: { label: string; text: string }[];
}

export const PERSONAL_REPORT_MOCK: PersonalReportMock = {
  reportCode: 'PLOG-2025-08-00012345',
  projectName: '테스트 프로젝트',
  publishedAt: '2026.06.12',
  period: '05.01–06.12',
  ownerName: '노홍철',
  contributionScore: 92,
  collaborationStability: 84,
  aiComment:
    '기획부터 개발까지 전 과정을 주도하며 높은 완성도와 협업 성과를 만들어낸 핵심 멤버로 평가됩니다',
  detailRows: [
    { label: '협업 태도', score: 95, color: REPORT_SERIES_COLORS[0] },
    { label: '리더십', score: 90, color: REPORT_SERIES_COLORS[1] },
    { label: '커뮤니케이션', score: 93, color: REPORT_SERIES_COLORS[2] },
    { label: '산출물 기여', score: 88, color: REPORT_SERIES_COLORS[3] },
  ],
  strengths: [
    { icon: 'team', title: '주도성', description: '일정을 주도적으로 관리하고 실행해요' },
    { icon: 'pen', title: '전문성', description: '기술 역량으로 팀의 완성도를 높여요' },
    { icon: 'chat', title: '소통 능력', description: '명확한 소통으로 협업을 원활히 해요' },
  ],
  weakness: {
    percent: 65,
    title: '의견 제시 빈도가 상대적으로 낮음',
    tips: [
      '이슈에 대한 의견 제시를 늘려보세요',
      '회의에 더 적극적으로 참여해 보세요',
      '아이디어를 공유하면 성과가 높아져요',
    ],
  },
  insights: [
    { icon: 'growth', label: '성장 포인트', text: '초기 논의 단계에서 의견을 제시해 팀 방향 설정에 기여해요' },
    { icon: 'star', label: '유지 강점', text: '책임감과 문제 해결력을 계속 발휘해서 팀을 이끌어 가세요' },
    { icon: 'target', label: '다음 액션', text: '앞으로 2주 동안 최소 1개의 아이디어를 제안하세요' },
  ],
  sentences: [
    {
      label: 'AI 자기소개서 추천 문장',
      text: '프로젝트의 초기 기획부터 요구사항 정의, 설계, 개발, 배포까지 전 과정을 주도하며 일정 내 고품질 결과물을 안정적으로 제공하고, 팀과의 긴밀한 협업을 통해 프로젝트 목표 달성에 크게 기여했습니다.',
    },
    {
      label: 'AI 포트폴리오 추천 문장',
      text: '웹 개발 프로젝트에서 프론트엔드 개발을 주도하며, 주요 페이지를 단독 개발했습니다. 사용자 경험을 고려한 UI/UX 설계와 성능 최적화를 통해 완성도에 기여했습니다.',
    },
  ],
};
