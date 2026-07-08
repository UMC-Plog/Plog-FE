import { cn } from "../lib/utils";

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const longEnough = password.length >= 8;

  const score = [hasLetter, hasNumber, hasSpecial, longEnough].filter(Boolean).length;

  if (!longEnough || score <= 1) return "weak";
  if (score === 2 || score === 3) return "medium";
  return "strong";
}

const STYLE: Record<PasswordStrength, { width: string; color: string; label: string }> = {
  empty: { width: "0%", color: "bg-gray-200", label: "" },
  weak: { width: "33%", color: "bg-error", label: "약한 비밀번호" },
  medium: { width: "66%", color: "bg-warning", label: "보통 비밀번호" },
  strong: { width: "100%", color: "bg-success", label: "안전한 비밀번호" },
};

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password);
  const { width, color, label } = STYLE[strength];

  if (strength === "empty") return null;

  return (
    <div className="mt-1.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all duration-200", color)}
          style={{ width }}
        />
      </div>
      <p
        className={cn(
          "mt-1 text-right text-caption font-normal",
          strength === "weak" && "text-error",
          strength === "medium" && "text-warning",
          strength === "strong" && "text-success"
        )}
      >
        {label}
      </p>
    </div>
  );
}
