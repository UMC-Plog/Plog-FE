import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { consumeIntegrationReturnPath } from "../../lib/integrationCallback";

export function IntegrationCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const returnPath = consumeIntegrationReturnPath();
    if (!returnPath) {
      navigate("/home", { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    const failed = Boolean(params.get("error")) || params.get("success") === "false";

    navigate(returnPath, {
      replace: true,
      state: failed
        ? {
            isConnected: false,
            entryMode: "authorization-error",
            authorizationError: "외부 계정 연동이 취소되었거나 실패했어요. 다시 시도해 주세요.",
          }
        : { isConnected: true, entryMode: "authorization-complete" },
    });
  }, [location.search, navigate]);

  return (
    <div
      className="app-shell flex min-h-svh items-center justify-center bg-gray-25"
      role="status"
      aria-label="외부 계정 연동 결과 확인 중"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
    </div>
  );
}
