import { useNavigate } from "react-router-dom";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export function AuthHeader({ title, subtitle, onBack, showBack = true }: AuthHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-4">
      {showBack && (
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={onBack ?? (() => navigate(-1))}
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <h1 className="text-h2 font-extrabold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-1.5 text-body text-gray-500">{subtitle}</p>}
    </div>
  );
}
