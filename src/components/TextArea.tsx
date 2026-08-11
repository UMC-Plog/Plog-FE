import { type TextareaHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "../lib/utils";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  showCharacterCount?: boolean;
}

/**
 * Plog 전역 공통 TextArea
 * 상태: default / focus / error(빨간 테두리) / success(초록 테두리)
 * 게시글, 피드백 등 여러 줄 입력에 사용
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      errorText,
      successText,
      className,
      id,
      maxLength,
      value,
      showCharacterCount = true,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const textareaId = id ?? label?.replace(/\s+/g, "-");
    const hasError = Boolean(errorText);
    const hasSuccess = Boolean(successText) && !hasError;
    const length = typeof value === "string" ? value.length : 0;
    const hasMeta = Boolean(
      hasError ||
        hasSuccess ||
        helperText ||
        (maxLength && showCharacterCount)
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-body-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            "min-h-[120px] w-full resize-none rounded-md border bg-white px-3.5 py-3 text-body text-gray-900",
            "placeholder:text-gray-400 transition-colors duration-150",
            "focus:outline-none",
            hasError
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

        {hasMeta && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div>
              {hasError && (
                <p className="flex items-center gap-1 text-caption font-normal text-error">
                  ⚠ {errorText}
                </p>
              )}
              {!hasError && hasSuccess && (
                <p className="flex items-center gap-1 text-caption font-normal text-success">
                  ✓ {successText}
                </p>
              )}
              {!hasError && !hasSuccess && helperText && (
                <p className="text-caption font-normal text-gray-400">{helperText}</p>
              )}
            </div>
            {maxLength && showCharacterCount && (
              <p className="shrink-0 text-caption font-normal text-gray-400">
                {length}/{maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
