import { create } from "zustand";
import { fetchChannels } from "../api/chat";
import { fetchNotifications } from "../api/notification";

interface NotificationBadgeState {
  hasUnreadNotification: boolean;
  hasUnreadChat: boolean;
  refresh: () => Promise<void>;
}

export const useNotificationBadgeStore = create<NotificationBadgeState>((set) => ({
  hasUnreadNotification: false,
  hasUnreadChat: false,
  refresh: async () => {
    const [notifications, channels] = await Promise.allSettled([
      fetchNotifications({ page: 0, size: 20 }),
      fetchChannels({ page: 0, size: 20 }),
    ]);

    set({
      hasUnreadNotification:
        notifications.status === "fulfilled" &&
        notifications.value.content.some((notification) => !notification.isRead),
      hasUnreadChat:
        channels.status === "fulfilled" &&
        channels.value.content.some((channel) => channel.hasUnreadMessage),
    });
  },
}));
