import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface DateDropdownSelectProps {
  value: string;
  options: readonly (string | { value: string; label: string })[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  rounded?: "lg" | "xl";
  placeholder?: string;
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
  placeholder,
}: DateDropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedOption = options.find((option) =>
    (typeof option === "string" ? option : option.value) === value
  );
  const displayValue =
    typeof selectedOption === "string"
      ? selectedOption
      : selectedOption?.label;

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const visualViewport = window.visualViewport;
      const viewportPadding = 8;
      const gap = 4;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const spaceBelow = viewportBottom - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - viewportTop - gap - viewportPadding;
      const openUpward = spaceBelow < 120 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        48,
        Math.min(192, openUpward ? spaceAbove : spaceBelow)
      );
      const width = Math.min(rect.width, viewportWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(rect.left, viewportLeft + viewportPadding),
        viewportRight - width - viewportPadding
      );

      setPosition({
        left,
        top: openUpward ? rect.top - gap - maxHeight : rect.bottom + gap,
        width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
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
        <span className={value ? undefined : "text-gray-400"}>
          {displayValue || placeholder}
        </span>
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
          {options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;
            const selected = optionValue === value;
            return (
            <li key={optionValue} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2.5 text-left text-body-sm hover:bg-blue-50",
                  selected ? "font-semibold text-blue-500" : "text-gray-900"
                )}
              >
                {optionLabel}
                {selected && <Check className="h-4 w-4" aria-hidden />}
              </button>
            </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}
