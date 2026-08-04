import { Code2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { getProjectDeadline } from "../../lib/projectDate";
import { cn } from "../../lib/utils";
import type { Project, ProjectViewMode } from "../../types/project";

interface ProjectCardProps {
  project: Project;
  viewMode: ProjectViewMode;
}

const PROJECT_TYPE = {
  DEVELOPMENT: {
    label: "개발 프로젝트",
    className: "bg-blue-50 text-blue-600",
    icon: Code2,
  },
  GENERAL: {
    label: "일반 프로젝트",
    className: "bg-aqua-50 text-aqua-600",
    icon: Pencil,
  },
} as const;

function MemberAvatars({ project, limit }: { project: Project; limit: number }) {
  const visibleMembers = project.members.slice(0, limit);
  const memberCount = project.memberCount ?? project.members.length;
  const remainingCount = Math.max(0, memberCount - visibleMembers.length);

  return (
    <div className="flex -space-x-2" aria-label={`팀원 ${memberCount}명`}>
      {visibleMembers.map((member) => (
        <span
          key={member.id}
          title={member.nickname}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-aqua-50 text-caption text-aqua-700"
        >
          {member.profileImageUrl ? (
            <img src={member.profileImageUrl} alt={member.nickname} className="h-full w-full object-cover" />
          ) : (
            member.nickname.trim().slice(0, 1) || "?"
          )}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-caption text-gray-500">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export function ProjectCard({ project, viewMode }: ProjectCardProps) {
  const isGrid = viewMode === "grid";
  const deadline = getProjectDeadline(project);
  const projectType = PROJECT_TYPE[project.type];
  const TypeIcon = projectType.icon;
  const clampedProgress = Math.min(100, Math.max(0, project.progress));

  return (
    <article
      className={cn(
        "relative rounded-[16px] border border-gray-100 bg-white shadow-md",
        "h-[172px]",
        "transition-transform active:scale-[0.99]"
      )}
    >
      <Link
        to={`/project/${project.id}/feed`}
        aria-label={`${project.name} 프로젝트 열기`}
        className={cn(
          "flex h-full min-w-0 flex-col rounded-[16px] pb-5 pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
          "px-[22px]"
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption", projectType.className)}>
            <TypeIcon size={13} aria-hidden="true" />
            {projectType.label}
          </span>
          {!isGrid && (
            <span
              className={cn(
                "rounded-md px-3 py-1 text-caption",
                deadline.tone === "success" && "bg-success/10 text-success",
                deadline.tone === "urgent" && "bg-error/10 text-error",
                deadline.tone === "default" && "bg-blue-50 text-blue-600"
              )}
            >
              {deadline.label}
            </span>
          )}
        </div>

        <h2
          className={cn(
            "mt-2 min-w-0 break-keep text-title font-bold text-gray-900",
            isGrid ? "line-clamp-2 leading-6" : "truncate"
          )}
          title={project.name}
        >
          {project.name}
        </h2>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <MemberAvatars project={project} limit={isGrid ? 2 : 3} />
            {!isGrid && (
              <span className="shrink-0 text-caption font-normal text-gray-500">
                팀원 {project.memberCount ?? project.members.length}명
              </span>
            )}
          </div>
          {isGrid && (
            <span
              className={cn(
                "shrink-0 text-caption",
                deadline.tone === "success" && "text-success",
                deadline.tone === "urgent" && "text-error",
                deadline.tone === "default" && "text-blue-600"
              )}
            >
              {deadline.label}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-aqua-500"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-caption font-normal">
            <span className="text-gray-500">진행률</span>
            <span className="font-semibold text-navy-700">{clampedProgress}%</span>
          </div>
        </div>
      </Link>

    </article>
  );
}
