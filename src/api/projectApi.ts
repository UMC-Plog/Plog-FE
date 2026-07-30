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
  ProjectMember,
  ProjectType,
} from "../types/project";
import { apiRequest } from "./client";

const PROJECT_PAGE_SIZE = 100;
const MAX_PROJECT_PAGES = 20;

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
    name: response.projectName,
    invitationLink: response.invite.inviteUrl,
    myProjectMemberId: response.myProjectMemberId,
  };
}

export async function getProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext && page < MAX_PROJECT_PAGES) {
    const response = await apiRequest<ProjectListResponse>(
      `/api/projects?page=${page}&size=${PROJECT_PAGE_SIZE}`
    );
    if (!response || !Array.isArray(response.content)) {
      throw new Error("프로젝트 목록 응답 형식이 올바르지 않습니다.");
    }

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
