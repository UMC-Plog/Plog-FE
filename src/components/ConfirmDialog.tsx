import { type ReactNode, useId } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  icon?: ReactNode;
  highlight?: ReactNode;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** true면 확인 버튼이 danger(빨강) 스타일로 표시됨 (삭제, 탈퇴 등 되돌릴 수 없는 동작) */
  destructive?: boolean;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 예/아니오, 취소/확인형 확인창 (삭제 확인, 탈퇴 확인 등) */
export function ConfirmDialog({
  open,
  icon,
  highlight,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  destructive = false,
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onCancel} ariaLabelledby={titleId}>
      <div className="flex flex-col items-center text-center">
        {icon && <div className="mb-3">{icon}</div>}
        <h2 id={titleId} className="text-title font-bold text-gray-900">{title}</h2>
        {highlight && <div className="mt-3 w-full">{highlight}</div>}
        {description && (
          <p className={`${highlight ? "mt-2" : "mt-1.5"} text-body-sm text-gray-500`}>
            {description}
          </p>
        )}

        <div className="mt-5 flex w-full gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth={false}
            disabled={confirmDisabled}
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-400 hover:bg-gray-200"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            size="md"
            fullWidth={false}
            disabled={confirmDisabled}
            loading={confirmLoading}
            onClick={onConfirm}
            className="flex-1 text-white"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
