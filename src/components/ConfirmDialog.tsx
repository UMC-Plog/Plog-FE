import { type ReactNode, useId } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { cn } from "../lib/utils";

type ConfirmDialogVariant = "default" | "task" | "notice";

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
  variant?: ConfirmDialogVariant;
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
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const isProjectVariant = variant !== "default";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      ariaLabelledby={titleId}
      variant={isProjectVariant ? "projectContent" : "default"}
      contentClassName={cn(
        variant === "task" && "px-[22px] pb-[22px] pt-[30px]",
        variant === "notice" && "px-6 pb-[22px] pt-[30px]"
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center text-center",
          variant === "task" && "gap-2.5",
          variant === "notice" && "gap-4"
        )}
      >
        {icon && <div className={cn(!isProjectVariant && "mb-3")}>{icon}</div>}
        <h2
          id={titleId}
          className={cn(
            "text-title font-bold text-gray-900",
            isProjectVariant && "font-semibold leading-7",
            variant === "task" && "pt-1.5"
          )}
        >
          {title}
        </h2>
        {highlight && (
          <div className={cn("w-full", !isProjectVariant && "mt-3")}>
            {highlight}
          </div>
        )}
        {description && (
          <p
            className={cn(
              "text-body-sm text-gray-500",
              isProjectVariant && "text-gray-400",
              !isProjectVariant && (highlight ? "mt-2" : "mt-1.5")
            )}
          >
            {description}
          </p>
        )}

        <div
          className={cn(
            "flex w-full",
            variant === "default" && "mt-5 gap-2.5",
            variant === "task" && "gap-2.5 pt-3",
            variant === "notice" && "gap-4 pt-3"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size={isProjectVariant ? "lg" : "md"}
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
            size={isProjectVariant ? "lg" : "md"}
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
