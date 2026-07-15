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
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  expectedEndDate: string;
  members: ProjectMember[];
  invitationLink: string;
}
