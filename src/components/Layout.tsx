import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

/** 전역 공통 모바일 레이아웃 — 화면 콘텐츠를 app-shell(모바일 프레임) 안에 렌더링 */
export function Layout({ children, className }: LayoutProps) {
  return <div className={cn("app-shell", className)}>{children}</div>;
}
