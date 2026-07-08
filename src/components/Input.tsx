import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  /** 오른쪽에 붙는 버튼/아이콘 (예: "코드 전송", "중복 확인", 비밀번호 표시 토글) */
  suffix?: ReactNode;
  locked?: boolean;
  lockedHelperText?: string;
}

/**
 * Plog 전역 공통 Input
 * 상태: default / focus / error(빨간 테두리) / success(초록 체크) / locked(잠금)
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      successText,
      suffix,
      locked = false,
      lockedHelperText,
      className,
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [suffixWidth, setSuffixWidth] = useState(0);
    const suffixRef = useRef<HTMLDivElement>(null);
    const inputId = id ?? label?.replace(/\s+/g, "-");
    const hasError = Boolean(errorText);
    const hasSuccess = Boolean(successText) && !hasError;

    useLayoutEffect(() => {
      if (suffix && suffixRef.current) {
        setSuffixWidth(suffixRef.current.offsetWidth);
      } else {
        setSuffixWidth(0);
      }
    }, [suffix]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-body-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={locked}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            style={suffix ? { paddingRight: suffixWidth + 22 } : undefined}
            className={cn(
              "h-12 w-full rounded-md border bg-white px-3.5 text-body text-gray-900",
              "placeholder:text-gray-400 transition-colors duration-150",
              "focus:outline-none",
              locked
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : hasError
                ? "border-error focus:border-error"
                : hasSuccess
                ? "border-success focus:border-success"
                : focused
                ? "border-blue-500"
                : "border-gray-200 hover:border-gray-300",
              className
            )}
            {...props}
          />
          {suffix && (
            <div
              ref={suffixRef}
              className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center"
            >
              {suffix}
            </div>
          )}
        </div>

        {locked && lockedHelperText && (
          <p className="mt-1.5 flex items-center gap-1 text-caption font-normal text-gray-400">
            🔒 {lockedHelperText}
          </p>
        )}
        {!locked && hasError && (
          <p className="mt-1.5 flex items-center gap-1 text-caption font-normal text-error">
            ⚠ {errorText}
          </p>
        )}
        {!locked && hasSuccess && (
          <p className="mt-1.5 flex items-center gap-1 text-caption font-normal text-success">
            ✓ {successText}
          </p>
        )}
        {!locked && !hasError && !hasSuccess && helperText && (
          <p className="mt-1.5 text-caption font-normal text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
