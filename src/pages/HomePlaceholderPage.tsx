import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";

/**
 * ⚠️ 임시 페이지입니다.
 * 홈/마이페이지/프로젝트 설정은 담당자 B 파트입니다.
 * 로그인·회원가입 플로우 테스트를 위한 자리표시자입니다.
 */
export function HomePlaceholderPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="app-shell items-center justify-center px-8 text-center">
      <p className="text-h3 font-bold text-gray-900">🎉 로그인 성공</p>
      <p className="mt-2 text-body text-gray-500">
        {user?.nickname ?? user?.realName ?? "사용자"}님, 환영해요.
      </p>
      <p className="mt-1 text-caption text-gray-400">
        (홈 화면은 담당자 B가 구현할 예정입니다)
      </p>
      <div className="mt-6 w-full">
        <Button
          variant="outline"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          로그아웃
        </Button>
      </div>
    </div>
  );
}
