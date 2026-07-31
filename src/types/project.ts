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
