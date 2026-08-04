import {
  type CSSProperties,
  type ReactNode,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  ariaLabelledby?: string;
  contentClassName?: string;
  overlayClassName?: string;
}

interface BottomSheetProps extends ModalProps {
  draggable?: boolean;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  closeOnHandleClick?: boolean;
  handleCloseLabel?: string;
}

/** Plog 전역 공통 Modal — 중앙 정렬 팝업 (업무카드 상세, 삭제확인 등) */
export function Modal({
  open,
  onClose,
  children,
  ariaLabelledby,
  contentClassName,
  overlayClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-[21px]",
        overlayClassName
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className={cn(
          "w-full max-w-sm rounded-[22px] bg-white p-6 shadow-xl animate-in",
          contentClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Plog 전역 공통 BottomSheet — 하단에서 올라오는 시트 (액션 목록, 필터 등) */
export function BottomSheet({
  open,
  onClose,
  children,
  ariaLabelledby,
  contentClassName,
  draggable = false,
  initialHeight = 588,
  minHeight = 250,
  maxHeight = 588,
  closeOnHandleClick = false,
  handleCloseLabel = "바텀시트 닫기",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const clampHeight = (height: number) => {
    const viewportMax = Math.max(minHeight, window.innerHeight - 12);
    return Math.min(Math.max(height, minHeight), Math.min(maxHeight, viewportMax));
  };

  const sheetStyle: CSSProperties | undefined = draggable
    ? { height: clampHeight(initialHeight) }
    : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className={cn(
          "flex w-full max-w-mobile flex-col rounded-t-xl bg-white p-6 pb-8 shadow-xl animate-in slide-in-from-bottom",
          contentClassName
        )}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {closeOnHandleClick ? (
          <button
            type="button"
            onClick={onClose}
            disabled={!onClose}
            aria-label={handleCloseLabel}
            className="relative -top-1 mx-auto mb-[15px] flex h-5 w-16 shrink-0 cursor-pointer items-start justify-center rounded-full before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
          >
            <span className="h-[5px] w-11 rounded-full bg-gray-200" aria-hidden />
          </button>
        ) : draggable ? (
          <button
            type="button"
            aria-label="바텀시트 크기 조절 핸들"
            className="relative -top-1 mx-auto mb-[15px] flex h-5 w-16 shrink-0 cursor-pointer items-start justify-center"
          >
            <span className="h-[5px] w-11 rounded-full bg-gray-200" aria-hidden />
          </button>
        ) : (
          <div
            className="relative -top-1 mx-auto mb-[15px] h-[5px] w-11 shrink-0 rounded-full bg-gray-200"
            aria-hidden
          />
        )}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

interface AlertModalProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void;
  variant?: "default" | "profile-saved";
}

/** 아이콘 + 타이틀 + 설명 + 버튼 1개 형태의 알림 모달 (로그인 실패, 탈퇴 완료 등) */
export function AlertModal({
  open,
  icon,
  title,
  description,
  confirmText = "확인",
  onConfirm,
  variant = "default",
}: AlertModalProps) {
  const isProfileSaved = variant === "profile-saved";

  return (
    <Modal
      open={open}
      contentClassName={isProfileSaved ? "h-[248px] p-6" : undefined}
    >
      <div className={cn("flex flex-col items-center text-center", isProfileSaved && "h-full pt-3")}>
        {icon && <div className="mb-3">{icon}</div>}
        <h2 className="text-title font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1.5 text-body-sm text-gray-500">{description}</p>}
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            "w-full bg-blue-500 text-body font-semibold text-white hover:bg-blue-600",
            isProfileSaved ? "mt-auto h-14 rounded-lg" : "mt-5 h-12 rounded-md"
          )}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
