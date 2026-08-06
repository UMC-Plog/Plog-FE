import { create } from "zustand";
import { fetchChannels } from "../api/chat";
import { fetchNotifications } from "../api/notification";

// 안 읽음 여부만 확인하면 되므로 전부 훑지 않고, 최대 이 페이지 수까지만 확인한다
// (찾는 즉시 중단). 알림/채팅방이 아주 많은 계정에서도 과도한 API 호출을 막기 위함.
const MAX_PAGES_TO_CHECK = 5;
const PAGE_SIZE = 20;

async function hasAnyUnreadNotification(): Promise<boolean> {
  for (let page = 0; page < MAX_PAGES_TO_CHECK; page += 1) {
    const response = await fetchNotifications({ page, size: PAGE_SIZE });
    if (response.content.some((notification) => !notification.isRead)) return true;
    if (!response.hasNext) return false;
  }
  return false;
}

async function hasAnyUnreadChat(): Promise<boolean> {
  for (let page = 0; page < MAX_PAGES_TO_CHECK; page += 1) {
    const response = await fetchChannels({ page, size: PAGE_SIZE });
    if (response.content.some((channel) => channel.hasUnreadMessage)) return true;
    if (!response.hasNext) return false;
  }
  return false;
}

interface NotificationBadgeState {
  hasUnreadNotification: boolean;
  hasUnreadChat: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
}

// refresh() 호출마다 증가하는 세대 값. 응답이 도착했을 때 이미 더 최신 refresh나 reset이
// 실행됐다면(=로그아웃/계정 전환 등으로 상태가 바뀌었다면) 그 응답은 버려서, 이전 계정의
// 늦게 도착한 응답이 새 계정의 배지 상태를 덮어쓰는 것을 막는다.
let requestGeneration = 0;

export const useNotificationBadgeStore = create<NotificationBadgeState>((set) => ({
  hasUnreadNotification: false,
  hasUnreadChat: false,
  refresh: async () => {
    const generation = ++requestGeneration;
    const [notifications, channels] = await Promise.allSettled([
      hasAnyUnreadNotification(),
      hasAnyUnreadChat(),
    ]);

    if (generation !== requestGeneration) return;

    set({
      hasUnreadNotification: notifications.status === "fulfilled" && notifications.value,
      hasUnreadChat: channels.status === "fulfilled" && channels.value,
    });
  },
  reset: () => {
    requestGeneration += 1;
    set({ hasUnreadNotification: false, hasUnreadChat: false });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("plog:logout", () => {
    useNotificationBadgeStore.getState().reset();
  });
}
