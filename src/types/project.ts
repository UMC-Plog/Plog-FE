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

export interface ProjectSettingsInviteResponse {
  inviteUrl: string;
  qrUrl: string;
}

export type ProjectIntegrationType = "GITHUB" | "FIGMA" | "NOTION" | "GOOGLE";

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
}

export interface ProjectIntegrationStatusResponse {
  projectId: number;
  projectMemberId: number;
  integrations: IntegrationItemResponse[];
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
  invitationLink: string;
}
