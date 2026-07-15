import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,
      toggleNotifications: () =>
        set((state) => ({
          notificationsEnabled: !state.notificationsEnabled,
        })),
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),
    }),
    {
      name: "plog-notification-settings",
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
