import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Check, FolderX, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Layout } from "../../components/Layout";
import { ProjectInviteSection } from "../../components/project/ProjectInviteSection";
import { getDateAfterDays, isFutureDate } from "../../lib/projectDate";
import { useProjectStore } from "../../store/projectStore";
import type { ProjectMember, ProjectType } from "../../types/project";

const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: "DEVELOPMENT", label: "개발 프로젝트" },
  { value: "GENERAL", label: "일반 팀프로젝트" },
];

function ProjectMemberRow({ member }: { member: ProjectMember }) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-aqua-50 text-body font-semibold text-aqua-700">
        {member.profileImageUrl ? (
          <img src={member.profileImageUrl} alt={`${member.nickname} 프로필`} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{member.nickname.trim().slice(0, 1) || "?"}</span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-gray-900">{member.nickname}</span>
    </li>
  );
}

export function ProjectSettingsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.projects.find((item) => item.id === id));
  const updateProject = useProjectStore((state) => state.updateProject);
  const markProjectSettingsAsSeen = useProjectStore((state) => state.markProjectSettingsAsSeen);
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectType, setProjectType] = useState<ProjectType | "">(project?.type ?? "");
  const [expectedEndDate, setExpectedEndDate] = useState(project?.expectedEndDate ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveStartedRef = useRef(false);

  useEffect(() => {
    markProjectSettingsAsSeen(id);
  }, [id, markProjectSettingsAsSeen]);

  useEffect(() => {
    if (!project) return;
    setProjectName(project.name);
    setProjectType(project.type);
    setExpectedEndDate(project.expectedEndDate);
    setNameTouched(false);
    setDateTouched(false);
  }, [project]);

  const normalizedName = projectName.trim();
  const nameValid = normalizedName.length >= 2 && normalizedName.length <= 20;
  const dateChanged = Boolean(project && expectedEndDate !== project.expectedEndDate);
  const dateValid = !dateChanged || isFutureDate(expectedEndDate);
  const hasChanges = Boolean(project && (
    normalizedName !== project.name || projectType !== project.type || dateChanged
  ));
  const canSave = nameValid && projectType !== "" && dateValid && hasChanges && !saving;
  const invitationLink = useMemo(() => {
    if (!project) return "";
    return project.invitationLink || `${window.location.origin}/invite/${project.id}`;
  }, [project]);

  if (!project) {
    return (
      <Layout className="bg-gray-25">
        <AuthHeader title="프로젝트 설정" variant="inline" onBack={() => navigate("/home")} />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <FolderX size={32} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-h3 font-bold text-gray-900">프로젝트를 찾을 수 없어요</h1>
          <p className="mt-2 text-body-sm text-gray-500">삭제되었거나 존재하지 않는 프로젝트입니다.</p>
          <Button type="button" fullWidth={false} className="mt-6 !text-white" onClick={() => navigate("/home")}>
            홈으로 이동
          </Button>
        </main>
      </Layout>
    );
  }

  const nameError = nameTouched && !nameValid
    ? normalizedName.length === 0 ? "프로젝트명을 입력해 주세요" : "프로젝트명은 앞뒤 공백 제외 2~20자로 입력해 주세요"
    : undefined;
  const dateError = dateTouched && dateChanged && !dateValid
    ? "오늘보다 이후 날짜를 선택해 주세요"
    : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameTouched(true);
    setDateTouched(true);
    if (!canSave || !projectType || saveStartedRef.current) return;
    saveStartedRef.current = true;
    setSaving(true);
    updateProject(project.id, { name: normalizedName, type: projectType, expectedEndDate });
    saveStartedRef.current = false;
    setSaving(false);
    setSaved(true);
  };

  return (
    <Layout className="bg-gray-25">
      <AuthHeader title="프로젝트 설정" variant="inline" />
      <main className="flex-1 px-5 py-6">
        <form onSubmit={handleSubmit} noValidate>
          <section aria-labelledby="project-info-title" className="rounded-lg border border-gray-100 bg-white p-5 shadow-md">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="text-blue-500" aria-hidden="true" />
              <h2 id="project-info-title" className="text-title font-bold text-gray-900">프로젝트 정보</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Input
                id="project-name"
                label="프로젝트명"
                value={projectName}
                onChange={(event) => { setProjectName(event.target.value); setSaved(false); }}
                onBlur={() => setNameTouched(true)}
                errorText={nameError}
                className="h-14 rounded-lg"
                maxLength={20}
              />
              <label htmlFor="project-type" className="block">
                <span className="mb-1.5 block text-body-sm font-medium text-gray-700">프로젝트 유형</span>
                <select
                  id="project-type"
                  value={projectType}
                  onChange={(event) => { setProjectType(event.target.value as ProjectType); setSaved(false); }}
                  className="h-14 w-full rounded-lg border border-gray-200 bg-white px-4 text-body text-gray-900 outline-none focus:border-blue-500"
                  required
                >
                  {PROJECT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Input
                id="project-end-date"
                type="date"
                label="예상 종료일"
                value={expectedEndDate}
                min={getDateAfterDays(1)}
                onChange={(event) => { setExpectedEndDate(event.target.value); setSaved(false); }}
                onBlur={() => setDateTouched(true)}
                errorText={dateError}
                className="h-14 rounded-lg"
              />
            </div>
            <Button type="submit" size="lg" loading={saving} disabled={!canSave} className="mt-6 enabled:!text-white disabled:!text-gray-400">
              변경사항 저장
            </Button>
            <div className="mt-2 min-h-5" aria-live="polite">
              {saved && <p className="flex items-center justify-center gap-1 text-caption font-normal text-success"><Check size={14} aria-hidden="true" /> 변경사항을 저장했어요</p>}
            </div>
          </section>
        </form>

        <section aria-labelledby="project-members-title" className="mt-5 rounded-lg border border-gray-100 bg-white p-5 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-aqua-600" aria-hidden="true" />
              <h2 id="project-members-title" className="text-title font-bold text-gray-900">현재 팀원</h2>
            </div>
            <span className="rounded-full bg-aqua-50 px-3 py-1 text-caption text-aqua-700">{project.members.length}명</span>
          </div>
          {project.members.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100">
              {project.members.map((member) => <ProjectMemberRow key={member.id} member={member} />)}
            </ul>
          ) : (
            <p className="mt-4 rounded-md bg-gray-50 px-4 py-5 text-center text-body-sm text-gray-400">표시할 팀원이 없어요</p>
          )}
        </section>

        <div className="mt-5 rounded-lg border border-gray-100 bg-white p-5 shadow-md">
          <ProjectInviteSection invitationLink={invitationLink} />
        </div>
      </main>
    </Layout>
  );
}
