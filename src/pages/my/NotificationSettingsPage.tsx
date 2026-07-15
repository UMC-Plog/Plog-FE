import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { Layout } from "../../components/Layout";
import { useNotificationStore } from "../../store/notificationStore";

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const notificationsEnabled = useNotificationStore(
    (state) => state.notificationsEnabled
  );
  const toggleNotifications = useNotificationStore(
    (state) => state.toggleNotifications
  );

  return (
    <Layout className="flex min-h-svh flex-col bg-gray-25">
      <AuthHeader
        title="알림 설정"
        variant="inline"
        onBack={() => navigate("/my")}
      />

      <main className="flex flex-1 flex-col">
        <div className="px-4 pt-6">
          <p className="px-2 text-caption font-normal text-gray-400">
            연동된 툴의 활동 데이터가 기여도 분석에 자동 반영됩니다
          </p>

          <section className="mt-5 flex h-[81px] items-center justify-between gap-4 rounded-lg border border-gray-100 bg-white px-6 shadow-md">
            <div>
              <h2 className="text-title font-bold text-gray-900">전체 알림</h2>
              <p className="mt-0.5 text-caption font-normal text-gray-400">
                모든 푸시 알림을 받습니다
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label="전체 알림"
              onClick={toggleNotifications}
              className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 ${
                notificationsEnabled ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </section>

          {!notificationsEnabled && (
            <div className="mt-5 px-2 text-caption font-normal text-gray-400">
              <p>알림 설정은 사용자분들의 원활한 서비스 이용을 위해 만들었어요</p>
              <p className="mt-0.5">
                알림을 켜두시면 @멘션 / Peer 평가 / 리포트 알림을 받으실 수 있어요!
              </p>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          전체 알림이 {notificationsEnabled ? "켜졌습니다" : "꺼졌습니다"}.
        </p>

        <footer className="mt-auto border-t border-gray-100 bg-white px-[22px] pb-6 pt-4">
          <Button type="button" size="lg" onClick={() => navigate("/my")}>
            저장
          </Button>
        </footer>
      </main>
    </Layout>
  );
}
