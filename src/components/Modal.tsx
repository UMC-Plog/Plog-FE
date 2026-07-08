import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}

/**
 * ⚠️ 임시 구현체입니다.
 * 컴포넌트 개발 원칙 문서 기준 Modal/BottomSheet는 "전역 공통 컴포넌트"로,
 * 팀 회의에서 담당자/최종 스펙(BottomSheet 포함 여부 등)을 확정할 예정입니다.
 * 회의 후 팀 공용 버전이 나오면 이 파일을 교체하세요.
 */
export function Modal({ open, onClose, children }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
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
}

/** 아이콘 + 타이틀 + 설명 + 버튼 1개 형태의 알림 모달 (로그인 실패, 탈퇴 완료 등) */
export function AlertModal({
  open,
  icon,
  title,
  description,
  confirmText = "확인",
  onConfirm,
}: AlertModalProps) {
  return (
    <Modal open={open}>
      <div className="flex flex-col items-center text-center">
        {icon && <div className="mb-3">{icon}</div>}
        <h2 className="text-title font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1.5 text-body-sm text-gray-500">{description}</p>}
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 h-12 w-full rounded-md bg-blue-500 text-body font-semibold text-white hover:bg-blue-600"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
