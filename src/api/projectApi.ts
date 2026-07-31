import frogImg from "../assets/frog.png";
import ghostImg from "../assets/ghost.png";
import koalaImg from "../assets/koala.png";
import otterImg from "../assets/otter.png";
import pandaImg from "../assets/panda.png";
import penguinImg from "../assets/penguin.png";
import smileImg from "../assets/smile.png";
import tigerImg from "../assets/tiger.png";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  CreatedProject,
  Project,
  ProjectApiType,
  ProjectListItemResponse,
  ProjectListResponse,
  ProjectInvitationPreviewResponse,
  ProjectJoinRequest,
  ProjectJoinResponse,
  ProjectLeaveResponse,
  ProjectMember,
  ProjectSettingsResponse,
  ProjectType,
  UpdateProjectSettingsRequest,
  UpdateProjectSettingsResponse,
} from "../types/project";
import { ApiError, apiRequest } from "./client";

const PROJECT_PAGE_SIZE = 100;
const MAX_PROJECT_PAGES = 20;
const PROFILE_PRESETS = new Set([
  "OTTER",
  "PENGUIN",
  "FROG",
  "KOALA",
  "PANDA",
  "SMILEY",
  "GHOST",
  "TIGER",
]);

function invalidProjectListResponse(): never {
  throw new ApiError(
    "INVALID_PROJECT_LIST_RESPONSE",
    "프로젝트 목록 응답 형식이 올바르지 않습니다."
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateProjectListItem(value: unknown): asserts value is ProjectListItemResponse {
  if (typeof value !== "object" || value === null) invalidProjectListResponse();

  const project = value as ProjectListItemResponse;
  if (
    !isPositiveSafeInteger(project.projectId) ||
    !isPositiveSafeInteger(project.myProjectMemberId) ||
    typeof project.projectName !== "string" ||
    (project.projectType !== "DEVELOP" && project.projectType !== "GENERAL") ||
    (project.status !== "IN_PROGRESS" && project.status !== "COMPLETED") ||
    typeof project.endDay !== "string" ||
    !Number.isSafeInteger(project.remainingDays) ||
    !isNonNegativeSafeInteger(project.memberCount) ||
    !Array.isArray(project.memberPreviews) ||
    !isNonNegativeSafeInteger(project.extraMemberCount) ||
    !isNonNegativeSafeInteger(project.progressPercent)
  ) {
    invalidProjectListResponse();
  }

  project.memberPreviews.forEach((member) => {
    if (
      !isPositiveSafeInteger(member.userId) ||
      typeof member.nickname !== "string" ||
      (member.profilePreset !== null &&
        !PROFILE_PRESETS.has(member.profilePreset))
    ) {
      invalidProjectListResponse();
    }
  });
}

function validateProjectListResponse(
  value: unknown
): asserts value is ProjectListResponse {
  if (typeof value !== "object" || value === null) {
    invalidProjectListResponse();
  }

  const response = value as ProjectListResponse;
  if (
    !Array.isArray(response.content) ||
    !isNonNegativeSafeInteger(response.page) ||
    !isPositiveSafeInteger(response.size) ||
    typeof response.hasNext !== "boolean"
  ) {
    invalidProjectListResponse();
  }
  response.content.forEach(validateProjectListItem);
}

function mapProjectType(projectType: ProjectApiType): ProjectType {
  return projectType === "DEVELOP" ? "DEVELOPMENT" : "GENERAL";
}

export function toApiProjectType(projectType: ProjectType): ProjectApiType {
  return projectType === "DEVELOPMENT" ? "DEVELOP" : "GENERAL";
}

function getPresetImage(profilePreset: string | null) {
  if (!profilePreset) return undefined;

  const images = {
    OTTER: otterImg,
    PENGUIN: penguinImg,
    FROG: frogImg,
    KOALA: koalaImg,
    PANDA: pandaImg,
    SMILEY: smileImg,
    GHOST: ghostImg,
    TIGER: tigerImg,
  } as const;

  return images[profilePreset as keyof typeof images];
}

function mapMember(response: ProjectListItemResponse["memberPreviews"][number]): ProjectMember {
  return {
    id: String(response.userId),
    nickname: response.nickname,
    profileImageUrl: getPresetImage(response.profilePreset),
  };
}

export function mapProjectResponseToProject(response: ProjectListItemResponse): Project {
  return {
    id: String(response.projectId),
    myProjectMemberId: response.myProjectMemberId,
    name: response.projectName,
    type: mapProjectType(response.projectType),
    status: response.status,
    progress: response.progressPercent,
    expectedEndDate: response.endDay,
    members: response.memberPreviews.map(mapMember),
    memberCount: response.memberCount,
  };
}

export function mapCreatedProjectResponse(response: CreateProjectResponse): CreatedProject {
  return {
    id: String(response.projectId),
    myProjectMemberId: response.myProjectMemberId,
    name: response.projectName,
    invitationCode: response.invite.inviteCode,
    invitationLink: response.invite.inviteUrl,
  };
}

export async function getProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext && page < MAX_PROJECT_PAGES) {
    const response = await apiRequest<unknown>(
      `/api/projects?page=${page}&size=${PROJECT_PAGE_SIZE}`
    );
    validateProjectListResponse(response);

    projects.push(...response.content.map(mapProjectResponseToProject));
    hasNext = response.hasNext === true;
    page += 1;
  }

  if (hasNext) {
    throw new Error("프로젝트 목록이 너무 많아 모두 불러오지 못했어요.");
  }

  return projects;
}

export function createProject(request: CreateProjectRequest) {
  return apiRequest<CreateProjectResponse>("/api/projects", {
    method: "POST",
    body: request,
  });
}

export function getProjectInvitationPreview(inviteCode: string) {
  return apiRequest<ProjectInvitationPreviewResponse>(
    `/api/projects/invitations/${encodeURIComponent(inviteCode)}`
  );
}

export function joinProject(inviteCode: string) {
  const request: ProjectJoinRequest = { inviteCode };

  return apiRequest<ProjectJoinResponse>("/api/projects/join", {
    method: "POST",
    body: request,
  });
}

export function getProjectSettings(projectId: string) {
  return apiRequest<ProjectSettingsResponse>(`/api/projects/${projectId}/settings`);
}

export function updateProjectSettings(
  projectId: string,
  request: UpdateProjectSettingsRequest
) {
  return apiRequest<UpdateProjectSettingsResponse>(
    `/api/projects/${projectId}/settings`,
    {
      method: "PATCH",
      body: request,
    }
  );
}

export function leaveProject(projectId: string) {
  return apiRequest<ProjectLeaveResponse>(`/api/projects/${projectId}/members/me`, {
    method: "DELETE",
  });
}

