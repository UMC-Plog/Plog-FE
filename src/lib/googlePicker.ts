const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const PERSONAL_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const PERSONAL_TOKEN_EXPIRY_BUFFER_MS = 60_000;
const PERSONAL_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/octet-stream",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
] as const;

type GoogleFileKind = "docs" | "slides";

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

interface GooglePickerDocument {
  id: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number | string;
  lastEditedUtc?: number | string;
  modifiedTime?: string;
  url?: string;
}

export interface PersonalGoogleDrivePickerFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  url?: string;
}

declare global {
  interface Window {
    gapi?: {
      load(name: string, callback: () => void): void;
    };
    google?: any;
  }
}

let pickerApiPromise: Promise<void> | null = null;
let identityApiPromise: Promise<void> | null = null;
let personalPickerToken: { accessToken: string; expiresAt: number } | null = null;

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Google 스크립트를 불러오지 못했습니다.")), {
      once: true,
    });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

function loadPickerApi() {
  pickerApiPromise ??= loadScript(GOOGLE_API_SCRIPT).then(
    () =>
      new Promise<void>((resolve, reject) => {
        if (!window.gapi) {
          reject(new Error("Google Picker API를 초기화하지 못했습니다."));
          return;
        }
        window.gapi.load("picker", resolve);
      })
  );
  return pickerApiPromise;
}

function loadIdentityApi() {
  identityApiPromise ??= loadScript(GOOGLE_IDENTITY_SCRIPT);
  return identityApiPromise;
}

function getValidPersonalPickerAccessToken() {
  if (
    personalPickerToken &&
    Date.now() < personalPickerToken.expiresAt - PERSONAL_TOKEN_EXPIRY_BUFFER_MS
  ) {
    return personalPickerToken.accessToken;
  }

  personalPickerToken = null;
  return null;
}

export function getPersonalGoogleDriveAccessToken() {
  return getValidPersonalPickerAccessToken();
}

export function clearPersonalGoogleDriveAccessToken() {
  personalPickerToken = null;
}

function requestPersonalPickerAccessToken(clientId: string): Promise<string> {
  const cachedToken = getValidPersonalPickerAccessToken();
  if (cachedToken) return Promise.resolve(cachedToken);

  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google 인증 모듈을 초기화하지 못했습니다."));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: PERSONAL_DRIVE_FILE_SCOPE,
      include_granted_scopes: false,
      callback: (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? "Google Drive 권한을 받지 못했습니다."));
          return;
        }

        const expiresInSeconds = Number(response.expires_in);
        if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
          reject(new Error("Google Drive 권한의 만료 시간을 확인하지 못했습니다."));
          return;
        }

        personalPickerToken = {
          accessToken: response.access_token,
          expiresAt: Date.now() + expiresInSeconds * 1000,
        };
        resolve(response.access_token);
      },
      error_callback: () => reject(new Error("Google 계정 선택 창이 닫혔습니다.")),
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

function getPickerEnvironment() {
  const clientId =
    import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_PICKER_APP_ID;

  if (!clientId || !apiKey || !appId) {
    throw new Error("Google Picker 환경변수(Client ID, API Key, App ID)가 필요합니다.");
  }

  return { clientId, apiKey, appId };
}

function toOptionalFileSize(value: number | string | undefined) {
  if (value === undefined || value === "") return undefined;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : undefined;
}

function toOptionalModifiedTime(document: GooglePickerDocument) {
  if (document.modifiedTime) return document.modifiedTime;
  if (document.lastEditedUtc === undefined || document.lastEditedUtc === "") return undefined;

  const timestamp = Number(document.lastEditedUtc);
  if (!Number.isFinite(timestamp)) return undefined;
  const modifiedTime = new Date(timestamp);
  return Number.isNaN(modifiedTime.getTime()) ? undefined : modifiedTime.toISOString();
}

function toPersonalPickerFile(
  document: GooglePickerDocument | undefined
): PersonalGoogleDrivePickerFile | null {
  if (
    !document?.id ||
    !document.name ||
    !document.mimeType ||
    !PERSONAL_ATTACHMENT_MIME_TYPES.includes(
      document.mimeType as (typeof PERSONAL_ATTACHMENT_MIME_TYPES)[number]
    )
  ) {
    return null;
  }

  return {
    id: document.id,
    name: document.name,
    mimeType: document.mimeType,
    size: toOptionalFileSize(document.sizeBytes),
    modifiedTime: toOptionalModifiedTime(document),
    url: document.url,
  };
}

export async function openGooglePicker(
  kind: GoogleFileKind,
  accessToken: string
): Promise<GooglePickerDocument | null> {
  const { apiKey, appId } = getPickerEnvironment();

  await loadPickerApi();
  const picker = window.google?.picker;
  if (!picker) throw new Error("Google Picker를 초기화하지 못했습니다.");

  return new Promise((resolve) => {
    const mimeType =
      kind === "docs"
        ? "application/vnd.google-apps.document"
        : "application/vnd.google-apps.presentation";
    const view = new picker.DocsView().setMimeTypes(mimeType).setIncludeFolders(false);
    const instance = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setOrigin(window.location.origin)
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED) resolve(data.docs?.[0] ?? null);
        if (data.action === picker.Action.CANCEL) resolve(null);
      })
      .build();
    instance.setVisible(true);
  });
}

export async function openPersonalGoogleDrivePicker(): Promise<PersonalGoogleDrivePickerFile | null> {
  const { clientId, apiKey, appId } = getPickerEnvironment();

  await Promise.all([loadPickerApi(), loadIdentityApi()]);
  const token = await requestPersonalPickerAccessToken(clientId);
  const picker = window.google?.picker;
  if (!picker) throw new Error("Google Picker를 초기화하지 못했습니다.");

  return new Promise((resolve) => {
    const view = new picker.DocsView()
      .setMimeTypes(PERSONAL_ATTACHMENT_MIME_TYPES.join(","))
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);
    const instance = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setOrigin(window.location.origin)
      .setCallback((data: { action?: string; docs?: GooglePickerDocument[] }) => {
        if (data.action === picker.Action.PICKED) {
          resolve(toPersonalPickerFile(data.docs?.[0]));
        }
        if (data.action === picker.Action.CANCEL) resolve(null);
      })
      .build();
    instance.setVisible(true);
  });
}
