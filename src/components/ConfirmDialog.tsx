import { type ReactNode, useId } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** true면 확인 버튼이 danger(빨강) 스타일로 표시됨 (삭제, 탈퇴 등 되돌릴 수 없는 동작) */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 예/아니오, 취소/확인형 확인창 (삭제 확인, 탈퇴 확인 등) */
export function ConfirmDialog({
  open,
  icon,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onCancel} ariaLabelledby={titleId}>
      <div className="flex flex-col items-center text-center">
        {icon && <div className="mb-3">{icon}</div>}
        <h2 id={titleId} className="text-title font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1.5 text-body-sm text-gray-500">{description}</p>}

        <div className="mt-5 flex w-full gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth={false}
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            size="md"
            fullWidth={false}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
