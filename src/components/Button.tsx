import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "../lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400",
  outline:
    "bg-white text-blue-500 border border-blue-500 hover:bg-blue-50 active:bg-blue-100 disabled:border-gray-200 disabled:text-gray-400",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-300",
  // TODO: Figma에 danger hover/active variant가 추가되면 정확한 값으로 교체
  danger:
    "bg-error text-white hover:bg-error/90 active:bg-error/80 disabled:bg-gray-100 disabled:text-gray-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-sm rounded-md gap-1.5",
  md: "h-12 px-4 text-body rounded-md gap-2",
  lg: "h-14 px-5 text-[16px] font-bold rounded-lg gap-2",
};

/**
 * Plog 전역 공통 Button
 * variant: primary / outline / ghost / danger
 * size: sm / md / lg
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = true,
      loading = false,
      icon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
