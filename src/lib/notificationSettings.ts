export const NOTIFICATION_STORAGE_KEY = 'plog-notifications-enabled'
export const FCM_TOKEN_STORAGE_KEY = 'plog-fcm-token'

export function isNotificationEnabled() {
  return window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) === 'true'
}

export function setNotificationEnabled(enabled: boolean) {
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(enabled))
}
