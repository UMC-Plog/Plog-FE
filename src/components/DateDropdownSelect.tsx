import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface DateDropdownSelectProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  rounded?: "lg" | "xl";
}

interface DropdownPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export function DateDropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  rounded = "lg",
}: DateDropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 8;
      const gap = 4;
      const top = rect.bottom + gap;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      );

      setPosition({
        left,
        top,
        width,
        maxHeight: Math.max(48, Math.min(192, window.innerHeight - top - viewportPadding)),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-14 w-full items-center justify-between border border-gray-200 bg-white px-4 text-body text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400",
          rounded === "xl" ? "rounded-[14px] px-[18px] text-[15px]" : "rounded-lg"
        )}
      >
        <span>{value}</span>
        <ChevronDown className="h-[18px] w-[18px] shrink-0 text-gray-400" aria-hidden />
      </button>

      {open && position && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
          className={cn(
            "fixed z-[100] overflow-y-auto overscroll-contain border border-gray-200 bg-white py-1 shadow-xl",
            rounded === "xl" ? "rounded-[14px]" : "rounded-lg"
          )}
        >
          {options.map((option) => (
            <li key={option} role="option" aria-selected={option === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2.5 text-left text-body-sm hover:bg-blue-50",
                  option === value ? "font-semibold text-blue-500" : "text-gray-900"
                )}
              >
                {option}
                {option === value && <Check className="h-4 w-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
