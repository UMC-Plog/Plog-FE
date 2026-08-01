import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { AlertModal } from "../../components/Modal";
import { MySubpageHeader } from "../../components/my/MySubpageHeader";
import {
  disablePushNotifications,
  enablePushNotifications,
} from "../../lib/firebaseMessaging";
import {
  isNotificationEnabled,
  setNotificationEnabled,
} from "../../lib/notificationSettings";

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(
    () =>
      isNotificationEnabled() &&
      "Notification" in window &&
      Notification.permission === "granted",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      if (enabled) {
        await enablePushNotifications();
      } else {
        await disablePushNotifications();
      }
      setNotificationEnabled(enabled);
      navigate("/my");
    } catch (saveError) {
      const previousEnabled = !enabled;
      setNotificationEnabled(previousEnabled);
      setEnabled(previousEnabled);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "알림 설정을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout className="min-h-svh bg-gray-25">
      <MySubpageHeader title="알림 설정" onBack={() => navigate("/my")} />

      <main className="flex-1 px-4 pt-6">
        <p className="px-1.5 text-[12px] font-normal leading-[17px] text-gray-400">
          프로젝트 채팅의 새로운 멘션을 실시간으로 알려드려요
        </p>

        <section className="mt-[23px] flex h-[90px] items-center rounded-16 border border-gray-100 bg-white/10 px-[26px] shadow-card">
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
            알림을 켜두시면 새로운 @멘션 알림을 받을 수 있어요!
          </p>
        )}
      </main>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-[22px] pb-[26px] pt-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-14 w-full rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:bg-gray-200"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </footer>

      <AlertModal
        open={Boolean(error)}
        title="알림을 설정하지 못했어요"
        description={error ?? undefined}
        onConfirm={() => setError(null)}
      />
    </Layout>
  );
}
