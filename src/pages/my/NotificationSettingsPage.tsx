import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { MySubpageHeader } from "../../components/my/MySubpageHeader";

const NOTIFICATION_STORAGE_KEY = "plog-notifications-enabled";

function readNotificationSetting() {
  return localStorage.getItem(NOTIFICATION_STORAGE_KEY) !== "false";
}

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(readNotificationSetting);

  const save = () => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(enabled));
    navigate("/my");
  };

  return (
    <Layout className="min-h-svh bg-gray-25">
      <MySubpageHeader title="알림 설정" onBack={() => navigate("/my")} />

      <main className="flex-1 px-4 pt-6">
        <p className="px-1.5 text-[12px] font-normal leading-[17px] text-gray-400">
          연동된 툴의 활동 데이터가 기여도 분석에 자동 반영됩니다
        </p>

        <section className="mt-[18px] flex h-20 items-center rounded-16 border border-gray-100 bg-white/10 px-[26px] shadow-card">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-normal leading-[24px] text-gray-900">전체 알림</h2>
            <p className="mt-0.5 text-[12px] font-normal leading-[17px] text-gray-400">
              모든 푸시 알림을 받습니다
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="전체 알림"
            onClick={() => setEnabled((current) => !current)}
            className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              enabled ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "left-[23px]" : "left-[3px]"
              }`}
            />
          </button>
        </section>

        {!enabled && (
          <p className="mt-4 px-1.5 text-[12px] font-normal leading-[17px] text-gray-400">
            알림 설정은 사용자분들의 원활한 서비스 이용을 위해 만들었어요.
            <br />
            알림을 켜두시면 @멘션 / Peer 평가 / 리포트 알림을 받으실 수 있어요!
          </p>
        )}
      </main>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-[22px] pb-[26px] pt-4">
        <button
          type="button"
          onClick={save}
          className="h-14 w-full rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          저장
        </button>
      </footer>
    </Layout>
  );
}
