import { cn } from "../lib/utils";

export interface TermsState {
  service: boolean;
  privacy: boolean;
  externalTool: boolean;
  marketing: boolean;
}

interface TermsItemConfig {
  key: keyof TermsState;
  required: boolean;
  title: string;
  description?: string;
}

const ITEMS: TermsItemConfig[] = [
  { key: "service", required: true, title: "[필수] 서비스 이용약관 동의" },
  { key: "privacy", required: true, title: "[필수] 개인정보 수집 및 이용 동의 (실명, 메일)" },
  {
    key: "externalTool",
    required: true,
    title: '[필수] 외부 협업 툴(Notion, Github 등) 데이터 접근 및 활동 로그 수집 동의',
    description: "분석 엔진 가동 및 기여도 리포트 발행 목적",
  },
  {
    key: "marketing",
    required: false,
    title: "[선택] 마케팅 정보 수신 및 웹 푸시 알림 동의",
    description: "프로젝트 초대, 리포트 발행 알림 포함",
  },
];

interface TermsAgreementFormProps {
  value: TermsState;
  onChange: (next: TermsState) => void;
}

const allChecked = (v: TermsState) => v.service && v.privacy && v.externalTool && v.marketing;
export const requiredChecked = (v: TermsState) => v.service && v.privacy && v.externalTool;

export function TermsAgreementForm({ value, onChange }: TermsAgreementFormProps) {
  const toggleAll = () => {
    const next = !allChecked(value);
    onChange({ service: next, privacy: next, externalTool: next, marketing: next });
  };

  const toggleOne = (key: keyof TermsState) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="rounded-xl border border-gray-100 p-5">
      <p className="mb-1 text-title font-bold text-gray-900">서비스 이용 동의 안내</p>
      <p className="mb-4 text-body-sm text-gray-400">
        플로그(Plog) 시작을 위해 다음 권한이 필요합니다.
      </p>

      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "mb-3 flex w-full items-center gap-2.5 rounded-md py-3 text-left text-body font-semibold",
          allChecked(value) ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-700"
        )}
      >
        <Checkbox checked={allChecked(value)} />
        모두 동의하고 시작하기
      </button>

      <div className="space-y-3.5">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggleOne(item.key)}
            className="flex w-full items-start gap-2.5 text-left"
          >
            <Checkbox checked={value[item.key]} className="mt-0.5" />
            <span>
              <span className="block text-body-sm font-medium text-gray-800">{item.title}</span>
              {item.description && (
                <span className="mt-0.5 block text-caption font-normal text-gray-400">
                  {item.description}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
        checked ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white",
        className
      )}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
