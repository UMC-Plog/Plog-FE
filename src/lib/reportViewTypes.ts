import type { ProfilePreset } from './profilePreset';

// 리포트 화면이 그리는 데이터 형태.
// 서버 응답을 이 형태로 변환해 쓰며, 변환은 reportView.ts가 담당한다.

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

export interface TeamReportView {
  reportCode: string;
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

export type StrengthIconKey = 'team' | 'pen' | 'chat';
export type InsightIconKey = 'growth' | 'star' | 'target';

export interface PersonalReportView {
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
