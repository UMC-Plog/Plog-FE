import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

const LOGO_SVG = (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
    <defs>
      <linearGradient id="plogGradient" x1="0" y1="0" x2="72" y2="72">
        <stop offset="0%" stopColor="#2186FB" />
        <stop offset="52%" stopColor="#06BCC4" />
        <stop offset="100%" stopColor="#173E8A" />
      </linearGradient>
    </defs>
    <rect width="72" height="72" rx="20" fill="url(#plogGradient)" />
    <path
      d="M22 48V24h12a8 8 0 0 1 0 16h-6"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export function SplashPage() {
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLanding(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell items-center justify-center px-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {LOGO_SVG}
        <div className="text-center">
          <p className="text-h2 font-extrabold tracking-tight text-gray-900">PLOG</p>
          {showLanding && (
            <p className="mt-2 text-body text-gray-500 animate-in fade-in duration-500">
              과정을 기록하고, 결과를 증명하다
            </p>
          )}
        </div>
      </div>

      {showLanding && (
        <div className="w-full space-y-3 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Button variant="primary" size="lg" onClick={() => navigate("/login")}>
            로그인
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/signup")}>
            회원가입
          </Button>
          <button
            type="button"
            onClick={() => navigate("/find-password")}
            className="w-full text-center text-body-sm text-gray-400 hover:text-gray-600"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
      )}
    </div>
  );
}
