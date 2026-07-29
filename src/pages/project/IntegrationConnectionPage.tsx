import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleUserRound,
  Code2,
  File,
  Folder,
  Info,
  MessageCircle,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import githubIcon from "../../assets/integrations/github.svg";
import figmaIcon from "../../assets/integrations/figma.svg";
import notionIcon from "../../assets/integrations/notion.png";
import docsIcon from "../../assets/integrations/google-docs.svg";
import slidesIcon from "../../assets/integrations/google-slides.svg";

type ProviderId = "github" | "figma" | "notion" | "docs" | "slides";

const PROVIDERS = {
  github: {
    name: "GitHub",
    icon: githubIcon,
    description: "GitHub 계정을 연결하려면 Repository, Issue, PR등 모든 데이터를 가져올 수 있습니다",
    account: "유재석",
    accountType: "GitHub 계정",
    note: "GitHub는 실제 과정에서 Repository를 선택하므로 Plog에서 별도의 2차 선택 화면은 제공되지 않아요",
    items: ["Repository", "Issue", "Pull Request", "Commit", "User", "그 외 다수"],
    permissions: ["Repository 정보 및 읽기", "Issue / Pull Request 읽기", "Commit / Review / Comment 수집", "사용자 정보 읽기"],
  },
  figma: {
    name: "Figma",
    icon: figmaIcon,
    description: "Figma Design File URL을 등록하면, 필요한 데이터를 자동으로 수집할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Figma 계정",
    note: "다음 단계에서는 Figma 파일 URL을 등록해요\n여러 개의 Figma 파일 URL을 추가해 연동 가능해요",
    items: ["파일 정보", "코멘트", "버전 이력", "댓글", "작성자 및 수정 메타데이터", "기타 활동 데이터"],
    permissions: ["파일 정보 읽기", "버전 이력 수집", "댓글 정보 읽기", "필요한 메타데이터 수집"],
  },
  notion: {
    name: "Notion",
    icon: notionIcon,
    description: "Notion 계정을 연결한 후, 분석할 페이지와 데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Notion 계정",
    note: "다음 단계에서 분석할 페이지와 DB를 선택해요",
    items: ["페이지/DB", "생성자", "최종 수정자", "댓글", "페이지/DB 참여 정보"],
    permissions: ["공유된 페이지 읽기", "데이터베이스 읽기", "생성자/최종 수정자", "댓글 정보 읽기"],
  },
  docs: {
    name: "Google docs",
    icon: docsIcon,
    description: "Google docs 문서를 연결하면 문서의 변경 및 활동 데이터를 수집할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    note: "다음 단계에서 연동할 Google docs URL을 등록해요",
    items: ["문서 정보", "수정 이력", "댓글", "작성자", "공유 정보", "기타 활동 데이터"],
    permissions: ["문서 정보 읽기", "수정 이력 수집", "댓글 정보 읽기", "사용자 정보 읽기"],
  },
  slides: {
    name: "Google slides",
    icon: slidesIcon,
    description: "Google slides를 연결하면 프레젠테이션의 변경 및 활동 데이터를 수집할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    note: "다음 단계에서 연동할 Google slides URL을 등록해요",
    items: ["파일 정보", "수정 이력", "댓글", "작성자", "공유 정보", "기타 활동 데이터"],
    permissions: ["파일 정보 읽기", "수정 이력 수집", "댓글 정보 읽기", "사용자 정보 읽기"],
  },
} as const;

const STEPS = ["연동 시작", "계정 인증", "데이터 선택", "연동 완료"];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex px-[26px] pb-[25px] pt-[28px]">
      {STEPS.map((label, index) => (
        <div key={label} className="relative flex flex-1 flex-col items-center">
          {index < 3 && <span className="absolute left-[62%] top-4 h-px w-[76%] border-t border-dashed border-gray-200" />}
          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[15px] ${
            step === index + 1 ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_0_3px_#D6E7FE]" : "border-gray-200 bg-gray-25 text-gray-400"
          }`}>
            {index + 1}
          </span>
          <span className={`mt-3 text-[12px] ${step === index + 1 ? "text-blue-500" : "text-gray-400"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function IntegrationConnectionPage() {
  const { id = "", provider = "github" } = useParams();
  const navigate = useNavigate();
  const config = PROVIDERS[(provider in PROVIDERS ? provider : "github") as ProviderId];
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState(["연동된 파일 1", "연동된 파일 2"]);
  const [notionSelected, setNotionSelected] = useState(["프로젝트 기획서", "회의록"]);
  const isGithub = provider === "github";
  const isNotion = provider === "notion";
  const currentStep = isGithub && step === 3 ? 4 : step;
  const actionLabel = currentStep === 1 ? "계정 연결" : currentStep === 2 ? (isGithub ? "저장" : "다음") : currentStep === 3 ? "저장" : "확인";
  const infoText = useMemo(() => {
    if (currentStep === 4) return "저장 후 데이터 수집이 시작돼요\n언제든지 설정에서 연동 내용 변경이 가능해요";
    if (isNotion && currentStep === 1) return "Notion은 연동 후 2차 설정이 필요해요\n워크 스페이스 선택 후 페이지와 DB를 고를 수 있어요";
    if (isNotion && currentStep === 3) return "생성자, 마지막 편집자, 댓글 정보를 수집할 수 있어요";
    return config.note;
  }, [config.note, currentStep, isNotion]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const next = () => {
    if (currentStep === 4) {
      navigate(`/project/${id}/settings`);
      return;
    }
    if (isGithub && currentStep === 2) setStep(4);
    else setStep((value) => value + 1);
  };

  return (
    <div className="app-shell min-h-svh bg-gray-25 pb-[92px]">
      <header className="flex h-[52px] items-center border-b border-gray-100 px-5 shadow-sm">
        <button type="button" aria-label="뒤로가기" onClick={() => navigate(`/project/${id}/settings`)} className="mr-3 flex h-6 w-6 items-center justify-center">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-[18px] font-semibold text-gray-900">{config.name} 연결</h1>
      </header>
      <Stepper step={currentStep} />

      <main className="px-5">
        <section className={`rounded-[16px] border border-gray-100 bg-white/10 p-[21px] shadow-card ${currentStep === 4 ? "min-h-[429px]" : ""}`}>
          {currentStep === 4 ? (
            <div className="flex flex-col items-center pt-[95px] text-center">
              <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-blue-100">
                <Check className="h-12 w-12 text-aqua-500" strokeWidth={4} />
              </span>
              <h2 className="mt-8 text-[22px] font-bold text-navy-700">계정 연동이 완료되었습니다!</h2>
              <p className="mt-4 text-[12px] leading-[18px] text-gray-400">선택한 외부 서비스의 데이터를 수집하여<br />분석을 시작할 수 있습니다</p>
              {isNotion ? (
                <div className="mt-7 w-full text-left">
                  <h3 className="text-[14px] text-gray-700">선택된 항목 ({notionSelected.length})</h3>
                  <NotionSelectedList selected={notionSelected} />
                </div>
              ) : !isGithub && (
                <div className="mt-7 w-full text-left">
                  <h3 className="text-[14px] text-gray-700">등록된 파일 ({files.length})</h3>
                  <FileList icon={config.icon} files={files} onRemove={(name) => setFiles((items) => items.filter((item) => item !== name))} />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-gray-100 pb-5">
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                  <img src={config.icon} alt="" className="h-16 w-16 object-contain" />
                </span>
                <div className="ml-5 min-w-0">
                  <h2 className="text-[18px] font-semibold text-gray-900">{config.name} 연동</h2>
                  <p className="mt-1 text-[12px] leading-[18px] text-gray-400">{currentStep === 1 ? config.description : `${config.name} 계정을 연결합니다`}</p>
                </div>
              </div>

              {currentStep === 1 && (
                <>
                  <h3 className="mt-6 text-[15px] text-gray-700">연동 시 가져오는 데이터</h3>
                  <div className="mt-3 grid grid-cols-2 gap-y-2">
                    {config.items.map((item) => <span key={item} className="flex items-center gap-2 text-[13px] text-gray-700"><CheckCircle2 className="h-4 w-4 shrink-0 fill-blue-500 text-white" />{item}</span>)}
                  </div>
                  <h3 className="mt-6 text-[15px] text-gray-700">연동 안내</h3>
                  <div className="mt-3 rounded-[12px] bg-blue-50 px-4 py-3 text-[12px] leading-5 text-gray-500">
                    {isNotion ? (
                      <>· 공유된 페이지만/데이터베이스만 조회돼요</>
                    ) : (
                      <>· 계정 연결 후 {config.name} URL을 하나씩 추가 가능해요<br />· 여러 파일을 점진적으로 등록하여 연동 범위 확장이 가능해요</>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="flex items-center py-6">
                    <div className="ml-[58px]">
                      <p className="text-[18px] text-gray-900">{config.account}</p>
                      <p className="mt-1 text-[12px] text-gray-400">{config.accountType}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-[#E9F8F0] px-4 py-2 text-[12px] text-success">계정 확인</span>
                  </div>
                  <h3 className="text-[15px] text-gray-700">요청 권한</h3>
                  <div className="mt-3 rounded-[12px] border border-gray-200 px-[18px] py-4">
                    {config.permissions.map((permission, index) => {
                      const icons = [Folder, RotateCcw, MessageCircle, index === 3 ? CircleUserRound : Code2];
                      const Icon = icons[index] ?? File;
                      return <div key={permission} className="flex min-h-[56px] items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50"><Icon className="h-5 w-5 text-blue-500" /></span><div><p className="text-[13px] text-gray-700">{permission}</p><p className="mt-1 text-[11px] text-gray-400">연동에 필요한 정보 및 활동 데이터 수집</p></div></div>;
                    })}
                  </div>
                </>
              )}

              {currentStep === 3 && isNotion && (
                <>
                  <div className="flex items-center py-6">
                    <div className="ml-[58px]"><p className="text-[18px] text-gray-900">{config.account}</p><p className="mt-1 text-[12px] text-gray-400">{config.accountType}</p></div>
                    <span className="ml-auto rounded-full bg-[#E9F8F0] px-4 py-2 text-[12px] text-success">계정 확인</span>
                  </div>
                  <div className="relative">
                    <input aria-label="페이지 또는 DB 검색" placeholder="페이지 / DB 검색" className="h-12 w-full rounded-[14px] border border-gray-200 bg-transparent pl-11 pr-4 text-[14px] outline-none focus:border-blue-500" />
                    <span className="absolute left-[18px] top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <span className="rounded-full bg-blue-100 px-[18px] py-2 text-[12px] text-blue-500">전체</span>
                    <span className="rounded-full border border-gray-200 px-[18px] py-2 text-[12px] text-gray-400">페이지</span>
                    <span className="rounded-full border border-gray-200 px-[18px] py-2 text-[12px] text-gray-400">DB</span>
                  </div>
                  <div className="mt-6 rounded-[14px] border border-gray-100 bg-white px-[18px] py-2 shadow-card">
                    <div className="notion-selection-scroll h-[174px] overflow-y-scroll pr-[10px]">
                      {[
                        { name: "프로젝트 기획서", type: "페이지" },
                        { name: "회의록", type: "DB" },
                        { name: "프로젝트 기획서", type: "페이지" },
                        { name: "회의 액션 아이템", type: "DB" },
                        { name: "디자인 가이드", type: "페이지" },
                        { name: "개발 일정", type: "DB" },
                      ].map((item, index) => {
                        const selected = index < 2 && notionSelected.includes(item.name);
                        return (
                          <button
                            key={`${item.name}-${index}`}
                            type="button"
                            onClick={() => setNotionSelected((items) =>
                              items.includes(item.name) ? items.filter((name) => name !== item.name) : [...items, item.name]
                            )}
                            className="flex h-[58px] w-full items-center"
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border ${selected ? "border-blue-500 bg-gradient-to-br from-blue-500 to-aqua-500 text-white" : "border-gray-300"}`}>
                              {selected && <Check className="h-4 w-4" />}
                            </span>
                            <span className="ml-3 text-[15px] text-gray-700">{item.name}</span>
                            <span className={`ml-auto rounded-full px-4 py-2 text-[12px] ${item.type === "DB" ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>{item.type}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="py-3 text-center text-[14px] font-semibold text-blue-500">선택 {notionSelected.length}개</p>
                  </div>
                </>
              )}

              {currentStep === 3 && !isNotion && (
                <>
                  <div className="flex items-center py-6">
                    <div className="ml-[58px]"><p className="text-[18px] text-gray-900">{config.account}</p><p className="mt-1 text-[12px] text-gray-400">{config.accountType}</p></div>
                    <span className="ml-auto rounded-full bg-[#E9F8F0] px-4 py-2 text-[12px] text-success">계정 확인</span>
                  </div>
                  <label className="block text-[14px] text-gray-700">
                    {config.name} {provider === "figma" ? "Design File" : "파일"} URL
                    <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" className="mt-3 h-14 w-full rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] outline-none focus:border-blue-500" />
                  </label>
                  <button type="button" onClick={() => { if (url.trim()) { setFiles((items) => [...items, `연동된 파일 ${items.length + 1}`]); setUrl(""); } }} className="mt-3 flex h-14 w-full items-center justify-center gap-4 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500">
                    <Plus className="h-5 w-5" /> URL 등록
                  </button>
                  <h3 className="mt-7 text-[14px] text-gray-700">등록된 파일 ({files.length})</h3>
                  <FileList icon={config.icon} files={files} onRemove={(name) => setFiles((items) => items.filter((item) => item !== name))} />
                </>
              )}
            </>
          )}
        </section>

        <div className="mt-6 flex gap-3 rounded-[12px] bg-blue-50 px-[18px] py-3 text-[12px] leading-[18px] text-blue-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong className="font-semibold">안내</strong><br />{infoText.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid h-[92px] w-full max-w-mobile -translate-x-1/2 grid-cols-[123px_1fr] gap-[21px] border-t border-gray-100 bg-white px-5 pt-3">
        <button type="button" onClick={() => navigate(`/project/${id}/settings`)} className="h-14 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500">취소</button>
        <button type="button" onClick={next} className="h-14 rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white">{actionLabel}</button>
      </footer>
    </div>
  );
}

function NotionSelectedList({ selected }: { selected: string[] }) {
  return (
    <div className="mt-3 rounded-[14px] border border-gray-100 bg-white px-[18px] py-2 shadow-card">
      {selected.map((name, index) => (
        <div key={`${name}-${index}`} className="flex h-[58px] items-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-gradient-to-br from-blue-500 to-aqua-500 text-white">
            <Check className="h-4 w-4" />
          </span>
          <span className="ml-3 text-[14px] text-gray-700">{name}</span>
          <span className={`ml-auto rounded-full px-4 py-2 text-[12px] ${index === 1 ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>
            {index === 1 ? "DB" : "페이지"}
          </span>
        </div>
      ))}
    </div>
  );
}

function FileList({ icon, files, onRemove }: { icon: string; files: string[]; onRemove: (name: string) => void }) {
  return (
    <div className="mt-3 rounded-[14px] border border-gray-100 bg-white px-[18px] py-2 shadow-card">
      {files.map((file) => (
        <div key={file} className="flex h-[60px] items-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white"><img src={icon} alt="" className="h-6 w-6 object-contain" /></span>
          <div className="ml-3"><p className="text-[12px] text-gray-700">{file}</p><p className="mt-1 text-[11px] text-gray-400">마지막 수정: 2026.06.21 10:30</p></div>
          <button type="button" aria-label={`${file} 삭제`} onClick={() => onRemove(file)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
        </div>
      ))}
    </div>
  );
}
