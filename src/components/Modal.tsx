import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  ariaLabelledby?: string;
  contentClassName?: string;
}

/** Plog 전역 공통 Modal — 중앙 정렬 팝업 (업무카드 상세, 삭제확인 등) */
export function Modal({ open, onClose, children, ariaLabelledby, contentClassName }: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-[21px]"
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className={cn(
          "w-full max-w-mobile rounded-t-xl bg-white p-6 pb-8 shadow-xl animate-in slide-in-from-bottom",
          contentClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative -top-1 mx-auto mb-[15px] h-[5px] w-11 rounded-full bg-gray-200" />
        {children}
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
