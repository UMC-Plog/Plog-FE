export type ProjectType = "DEVELOPMENT" | "GENERAL";

export type ProjectStatus = "IN_PROGRESS" | "COMPLETED";

export type ProjectViewMode = "list" | "grid";

export interface ProjectMember {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface Project {
  id: string;
  myProjectMemberId: number;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  expectedEndDate: string;
  members: ProjectMember[];
  memberCount?: number;
  invitationLink?: string;
}

export type ProjectApiType = "DEVELOP" | "GENERAL";

export type ProfilePreset =
  | "OTTER"
  | "PENGUIN"
  | "FROG"
  | "KOALA"
  | "PANDA"
  | "SMILEY"
  | "GHOST"
  | "TIGER";

export interface ProjectMemberPreviewResponse {
  userId: number;
  nickname: string;
  profilePreset: ProfilePreset | null;
}

export interface ProjectListItemResponse {
  projectId: number;
  myProjectMemberId: number;
  projectName: string;
  projectType: ProjectApiType;
  status: ProjectStatus;
  endDay: string;
  remainingDays: number;
  memberCount: number;
  memberPreviews: ProjectMemberPreviewResponse[];
  extraMemberCount: number;
  progressPercent: number;
}

export interface ProjectListResponse {
  content: ProjectListItemResponse[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface CreateProjectRequest {
  projectName: string;
  projectType: ProjectApiType;
  endDay: string;
}

export interface ProjectInviteResponse {
  inviteCode: string;
  inviteUrl: string;
}

export interface ProjectInvitationPreviewResponse {
  projectId: number;
  projectName: string;
  projectType: ProjectApiType;
  endDay: string;
}

export interface ProjectJoinRequest {
  inviteCode: string;
}

export interface ProjectJoinResponse {
  projectId: number;
  projectName: string;
  projectMemberId: number;
  role: "OWNER" | "MEMBER";
  projectStatus: ProjectStatus;
  memberStatus: "ACTIVE" | "EXIT";
  joinedAt: string;
}

export interface ProjectSettingsInviteResponse {
  inviteUrl: string;
  qrUrl: string;
}

export type ProjectIntegrationType =
  | "GITHUB"
  | "FIGMA"
  | "NOTION"
  | "GOOGLE"
  | "GOOGLE_DOCS"
  | "GOOGLE_SLIDES";

export interface ProjectExternalConnectionResponse {
  connectionId: number;
  linkType: ProjectIntegrationType;
  isLinked: boolean;
}

export interface ProjectSettingsResponse {
  projectId: number;
  projectName: string;
  projectType: ProjectApiType;
  status: ProjectStatus;
  startDay: string;
  endDay: string;
  invite: ProjectSettingsInviteResponse;
  externalConnections: ProjectExternalConnectionResponse[];
  updatedAt: string;
}

export interface UpdateProjectSettingsRequest {
  projectName: string;
  endDay: string;
  projectType: ProjectApiType;
}

export interface UpdateProjectSettingsResponse {
  projectId: number;
  projectName: string;
  projectType: ProjectApiType;
  endDay: string;
  updatedAt: string;
}

export interface ProjectLeaveResponse {
  success: boolean;
}

export interface ProjectIntegrationDisconnectResponse {
  projectId: number;
  linkType: ProjectIntegrationType;
}

export interface IntegrationItemResponse {
  linkType: ProjectIntegrationType;
  linked: boolean;
  connectedAccountName: string | null;
  /**
   * 해당 provider에 등록된 리소스들의 최근 수집 상태.
   * 연동만 하고 아직 수집한 적이 없으면 NOT_STARTED로 온다.
   */
  collectionStatus: CollectionJobStatus | null;
  /** 해당 provider 리소스 중 가장 최근 수집 완료 시각. 수집 전이면 null */
  lastCollectedAt: string | null;
  /** 가장 최근 수집 실패 원인. 실패가 없으면 null */
  lastCollectionFailure: string | null;
}

/**
 * 수집 잡의 상태. 서버가 내려주는 진행 중 값의 이름이 확정되지 않았다 —
 * Swagger enum은 PENDING/RETRYABLE인데 백엔드 안내는 QUEUED/RETRYING이었다.
 * 그래서 진행 중 상태를 열거하지 않고 종료 상태 3개만 정의하고, 나머지는 string으로 열어둔다.
 * 어떤 이름이 오든 isCollectionFinished로 판정하므로 동작에 영향이 없다.
 */
export type CollectionFinishedStatus = "SUCCEEDED" | "PARTIAL_FAILED" | "FAILED";
export type CollectionJobStatus = CollectionFinishedStatus | (string & {});

const FINISHED_STATUSES: readonly string[] = ["SUCCEEDED", "PARTIAL_FAILED", "FAILED"];

/** 종료 상태면 true. 아직 시작 전(null)이거나 진행 중인 값은 모두 false. */
export function isCollectionFinished(status: CollectionJobStatus | null | undefined) {
  return status != null && FINISHED_STATUSES.includes(status);
}

export interface ProjectIntegrationStatusResponse {
  projectId: number;
  projectMemberId: number;
  integrations: IntegrationItemResponse[];
  /** 가장 최근 수동 수집 잡의 상태. 요청한 적이 없으면 null */
  collectionJobStatus: CollectionJobStatus | null;
  /** 가장 최근 수집 잡의 실패 요약. 실패가 없으면 null */
  collectionJobFailure: string | null;
  /** 프로젝트 완료 시 실행되는 최종 수집 상태. 실행 전이면 null */
  finalCollectionStatus: CollectionJobStatus | null;
  finalCollectionFailure: string | null;
  /** 최근 수집 잡이 시도한 리소스 수. 아직 끝나지 않았으면 null */
  requestedResourceCount: number | null;
  /** 최근 수집 잡이 성공한 리소스 수. 아직 끝나지 않았으면 null */
  collectedResourceCount: number | null;
}

export interface IntegrationProviderActorResponse {
  actorKey: string;
  providerActorId: string | null;
  providerLogin: string;
  providerEmail: string | null;
  displayName: string;
  activityCount: number;
  firstOccurredAt: string | null;
  lastOccurredAt: string | null;
  mapped: boolean;
  mappedProjectMemberId: number | null;
  mappedByCurrentMember: boolean;
}

export interface IntegrationActorMappingResponse {
  mappingId: number;
  projectMemberId: number;
  memberName: string;
  memberNickname: string;
  profilePreset: ProfilePreset | null;
  actorKey: string;
  providerActorId: string | null;
  providerLogin: string;
  providerEmail: string | null;
}

export interface IntegrationActorMappingListResponse {
  projectId: number;
  linkType: ProjectIntegrationType;
  currentProjectMemberId: number;
  mappings: IntegrationActorMappingResponse[];
  availableProviderActors: IntegrationProviderActorResponse[];
}


export interface CreateProjectResponse {
  projectId: number;
  projectName: string;
  projectType: ProjectApiType;
  status: ProjectStatus;
  startDay: string;
  endDay: string;
  myProjectMemberId: number;
  myRole: "OWNER" | "MEMBER";
  invite: ProjectInviteResponse;
}

export interface CreatedProject {
  id: string;
  myProjectMemberId: number;
  name: string;
  invitationCode: string;
  invitationLink: string;
}
