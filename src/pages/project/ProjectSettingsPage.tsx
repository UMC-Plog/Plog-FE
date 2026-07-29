import { useEffect, useState, type FormEvent } from "react";
import { FolderX } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Layout } from "../../components/Layout";
import { isFutureDate } from "../../lib/projectDate";
import { useProjectStore } from "../../store/projectStore";
import type { ProjectType } from "../../types/project";

const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: "DEVELOPMENT", label: "개발 프로젝트" },
  { value: "GENERAL", label: "일반 팀프로젝트" },
];

export function ProjectSettingsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === id)
  );
  const updateProject = useProjectStore((state) => state.updateProject);
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectType, setProjectType] = useState<ProjectType>(
    project?.type ?? "DEVELOPMENT"
  );
  const [expectedEndDate, setExpectedEndDate] = useState(
    project?.expectedEndDate ?? ""
  );

  useEffect(() => {
    if (!project) return;
    setProjectName(project.name);
    setProjectType(project.type);
    setExpectedEndDate(project.expectedEndDate);
  }, [project]);

  if (!project) {
    return (
      <Layout className="bg-gray-25">
        <AuthHeader title="프로젝트 설정" variant="inline" onBack={() => navigate("/home")} />
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <FolderX className="h-12 w-12 text-gray-300" aria-hidden />
          <h1 className="mt-4 text-title font-bold text-gray-900">
            프로젝트를 찾을 수 없어요
          </h1>
          <Button className="mt-6 !w-auto px-6 !text-white" onClick={() => navigate("/home")}>
            홈으로 이동
          </Button>
        </main>
      </Layout>
    );
  }

  const normalizedName = projectName.trim();
  const dateChanged = expectedEndDate !== project.expectedEndDate;
  const isValid =
    normalizedName.length >= 2 &&
    normalizedName.length <= 20 &&
    (!dateChanged || isFutureDate(expectedEndDate));
  const hasChanges =
    normalizedName !== project.name ||
    projectType !== project.type ||
    dateChanged;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || !hasChanges) return;
    updateProject(id, {
      name: normalizedName,
      type: projectType,
      expectedEndDate,
    });
    navigate(`/project/${id}/feed`);
  };

  return (
    <Layout className="bg-gray-25">
      <AuthHeader
        title="프로젝트 설정"
        variant="inline"
        onBack={() => navigate(`/project/${id}/feed`)}
      />
      <main className="flex-1 px-5 py-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-100 bg-white p-5 shadow-md"
        >
          <div className="space-y-4">
            <Input
              id="project-name"
              label="프로젝트명"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              maxLength={20}
            />

            <label htmlFor="project-type" className="block">
              <span className="mb-1.5 block text-body-sm font-medium text-gray-700">
                프로젝트 유형
              </span>
              <select
                id="project-type"
                value={projectType}
                onChange={(event) => setProjectType(event.target.value as ProjectType)}
                className="h-14 w-full rounded-lg border border-gray-200 bg-white px-4 text-body text-gray-900 outline-none focus:border-blue-500"
              >
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Input
              id="project-end-date"
              type="date"
              label="예상 종료일"
              value={expectedEndDate}
              onChange={(event) => setExpectedEndDate(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!isValid || !hasChanges}
            className="mt-6 enabled:!text-white disabled:!text-gray-400"
          >
            변경사항 저장
          </Button>
        </form>
      </main>
    </Layout>
  );
}
