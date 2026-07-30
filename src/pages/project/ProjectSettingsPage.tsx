import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Link2, QrCode } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import githubIcon from "../../assets/integrations/github.svg";
import figmaIcon from "../../assets/integrations/figma.svg";
import notionIcon from "../../assets/integrations/notion.png";
import docsIcon from "../../assets/integrations/google-docs.svg";
import slidesIcon from "../../assets/integrations/google-slides.svg";
import { useProjectStore } from "../../store/projectStore";

// logo: Figma 실측 - 32px 흰 타일 안에 들어가는 로고 크기 (GitHub 애셋은 타일 자체라 32)
const INTEGRATIONS = [
  { id: "github", label: "GitHub", icon: githubIcon, logo: 32, connected: true },
  { id: "figma", label: "Figma", icon: figmaIcon, logo: 22, connected: true },
  { id: "notion", label: "Notion", icon: notionIcon, logo: 16, connected: false },
  { id: "docs", label: "Google docs", icon: docsIcon, logo: 19, connected: false },
  { id: "slides", label: "Google slides", icon: slidesIcon, logo: 19, connected: true },
] as const;

const YEARS = ["2025", "2026", "2027", "2028"];
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

function SelectBox({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative flex-1">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full appearance-none rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] text-gray-900 outline-none focus:border-blue-500"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
    </div>
  );
}

export function ProjectSettingsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.projects.find((item) => item.id === id));
  const updateProject = useProjectStore((state) => state.updateProject);
  const markProjectSettingsAsSeen = useProjectStore((state) => state.markProjectSettingsAsSeen);
  const initialDate = project?.expectedEndDate?.split("-") ?? ["2026", "06", "15"];
  const [name, setName] = useState(project?.name || "테스트 프로젝트");
  const [type, setType] = useState(project?.type || "DEVELOPMENT");
  const [year, setYear] = useState(initialDate[0] || "2026");
  const [month, setMonth] = useState(initialDate[1] || "06");
  const [day, setDay] = useState(initialDate[2] || "15");

  useEffect(() => {
    markProjectSettingsAsSeen(id);
  }, [id, markProjectSettingsAsSeen]);

  const handleSave = () => {
    if (project) {
      updateProject(project.id, {
        name: name.trim() || project.name,
        type,
        expectedEndDate: `${year}-${month}-${day}`,
      });
    }
    navigate(`/project/${id}/feed`);
  };

  return (
    <div className="app-shell min-h-svh bg-gray-25 pb-[116px]">
      <header className="flex h-[52px] items-center border-b border-gray-100 bg-gray-25 px-5 shadow-sm">
        <button type="button" aria-label="뒤로가기" onClick={() => navigate(`/project/${id}/feed`)} className="mr-3 flex h-6 w-6 items-center justify-center">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-[18px] font-semibold text-gray-900">프로젝트 설정</h1>
      </header>

      <main className="px-5 pt-[18px]">
        <label className="block text-[14px] font-normal text-gray-700">
          프로젝트명
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-[11px] h-14 w-full rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] text-gray-900 outline-none focus:border-blue-500"
          />
        </label>

        <label className="mt-[22px] block text-[14px] font-normal text-gray-700">
          프로젝트 유형
          <div className="relative mt-[11px]">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as "DEVELOPMENT" | "GENERAL")}
              className="h-14 w-full appearance-none rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] text-gray-900 outline-none focus:border-blue-500"
            >
              <option value="DEVELOPMENT">개발 프로젝트</option>
              <option value="GENERAL">일반 팀프로젝트</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          </div>
        </label>

        <fieldset className="mt-[22px]">
          <legend className="text-[14px] font-normal text-gray-700">예상 종료일</legend>
          <div className="mt-[11px] flex gap-[7px]">
            <SelectBox value={year} onChange={setYear} ariaLabel="종료 연도">
              {YEARS.map((item) => <option key={item}>{item}</option>)}
            </SelectBox>
            <SelectBox value={month} onChange={setMonth} ariaLabel="종료 월">
              {MONTHS.map((item) => <option key={item}>{item}</option>)}
            </SelectBox>
            <SelectBox value={day} onChange={setDay} ariaLabel="종료 일">
              {DAYS.map((item) => <option key={item}>{item}</option>)}
            </SelectBox>
          </div>
        </fieldset>

        <section className="mt-[22px]">
          <h2 className="text-[14px] font-normal text-gray-700">팀원 초대</h2>
          <div className="mt-[11px] grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(project?.invitationLink ?? "https://plog.app/invite/mock")}
              className="flex h-14 items-center justify-center gap-2 rounded-[14px] bg-blue-100 text-[16px] font-semibold text-navy-700"
            >
              <Link2 className="h-[18px] w-[18px]" /> 링크 초대
            </button>
            <button
              type="button"
              className="flex h-14 items-center justify-center gap-2 rounded-[14px] bg-blue-100 text-[16px] font-semibold text-navy-700"
            >
              <QrCode className="h-[18px] w-[18px]" /> QR 초대
            </button>
          </div>
        </section>

        <section className="mt-[17px]">
          <h2 className="text-[14px] font-normal text-gray-900">
            팀(워크) 스페이스 연동 <span className="text-error">*</span>
          </h2>
          <p className="mt-1 text-[12px] font-normal text-gray-400">
            워크스페이스의 소유자(생성자)의 연동이 필요합니다
          </p>
          {/* Figma: 카드 세로 패딩 0 + 행 높이 61 (카드 총 높이 305) */}
          <div className="mt-2 rounded-[16px] border border-gray-100 bg-white/10 px-[18px] shadow-card">
            {INTEGRATIONS.map((integration) => (
              <button
                key={integration.id}
                type="button"
                onClick={() => navigate(`/project/${id}/settings/integrations/${integration.id}`)}
                className="flex h-[61px] w-full items-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                  <img src={integration.icon} alt="" className="object-contain" style={{ width: integration.logo, height: integration.logo }} />
                </span>
                <span className="ml-3 flex-1 text-left text-[15px] font-normal text-gray-900">
                  {integration.label}
                </span>
                <span className={`mr-[14px] rounded-full px-[14px] py-[5px] text-[12px] ${
                  integration.connected ? "bg-[#E9F8F0] text-success" : "bg-[#FDEDEE] text-error"
                }`}>
                  {integration.connected ? "연동" : "미연동"}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid h-[92px] w-full max-w-mobile -translate-x-1/2 grid-cols-[1fr_1fr] gap-4 border-t border-gray-100 bg-white px-5 pt-[10px]">
        <button
          type="button"
          onClick={() => navigate(`/project/${id}/feed`)}
          className="h-14 rounded-[14px] border border-error text-[16px] font-semibold text-error"
        >
          프로젝트 나가기
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="h-14 rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white"
        >
          저장
        </button>
      </footer>
    </div>
  );
}
