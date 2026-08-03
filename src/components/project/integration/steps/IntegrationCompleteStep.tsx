import { Check, X } from "lucide-react";
import type { IntegrationResourceResponse } from "../../../../types/integration";
import type { IntegrationResourceItem } from "../integrationViewTypes";

function GradientCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden>
      <defs>
        <linearGradient id="plog-complete-check" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2186FB" />
          <stop offset="1" stopColor="#07BCC5" />
        </linearGradient>
      </defs>
      <path d="M20 6 9 17l-5-5" stroke="url(#plog-complete-check)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotionSelectedList({ resources }: { resources: IntegrationResourceResponse[] }) {
  return (
    <div className="mt-3 min-h-[123px] rounded-[16px] border border-gray-100 bg-white px-[18px] shadow-card">
      {resources.map((resource) => {
        const isDatabase = resource.resourceType === "NOTION_DATA_SOURCE";
        return (
          <div key={resource.resourceId} className="flex h-[57px] items-center">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-b from-blue-500 to-aqua-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <span className="ml-3 truncate text-[14px] text-gray-700">{resource.resourceName}</span>
            <span className={`ml-auto shrink-0 rounded-full px-3 py-[5px] text-[12px] ${isDatabase ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>
              {isDatabase ? "DB" : "페이지"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function IntegrationFileList({
  icon,
  logoSize,
  items,
  onRemove,
}: {
  icon: string;
  logoSize: number;
  items: IntegrationResourceItem[];
  onRemove?: (key: string) => void;
}) {
  return (
    <div className="mt-3 rounded-[14px] border border-gray-100 bg-white px-[18px] shadow-card">
      {items.map((item) => (
        <div key={item.key} className="flex h-[61px] items-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white">
            <img src={icon} alt="" className="object-contain" style={{ width: logoSize, height: logoSize }} />
          </span>
          <div className="ml-3 min-w-0">
            <p className="truncate text-[12px] text-gray-700">{item.name}</p>
            <p className="mt-1 text-[11px] text-gray-400">{item.subtitle}</p>
          </div>
          {onRemove && (
            <button type="button" aria-label={`${item.name} 삭제`} onClick={() => onRemove(item.key)} className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function IntegrationCompleteStep({
  isGithub,
  isNotion,
  resources,
  resourceItems,
  icon,
  logoSize,
}: {
  isGithub: boolean;
  isNotion: boolean;
  resources: IntegrationResourceResponse[];
  resourceItems: IntegrationResourceItem[];
  icon: string;
  logoSize: number;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${isGithub ? "h-full" : "min-h-[381px] justify-center"}`}>
      <span className={`flex h-[88px] w-[88px] items-center justify-center rounded-full bg-blue-100 ${isGithub ? "mt-[92px]" : ""}`}>
        <GradientCheck />
      </span>
      <h2 className="mt-8 text-[22px] font-bold text-navy-700">계정 연동이 완료되었습니다!</h2>
      <p className="mt-4 text-[12px] leading-[18px] text-gray-400">선택한 외부 서비스의 데이터를 수집하여<br />분석을 시작할 수 있습니다</p>
      {isNotion ? (
        <div className="-mx-[2px] mt-7 w-[calc(100%+4px)] text-left">
          <h3 className="text-[14px] text-gray-700">선택된 항목 ({resources.length})</h3>
          <NotionSelectedList resources={resources} />
        </div>
      ) : !isGithub ? (
        <div className="mt-7 w-full text-left">
          <h3 className="text-[14px] text-gray-700">등록된 파일 ({resourceItems.length})</h3>
          <IntegrationFileList icon={icon} logoSize={logoSize} items={resourceItems} />
        </div>
      ) : null}
    </div>
  );
}
