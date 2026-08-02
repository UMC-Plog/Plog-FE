const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type GoogleFileKind = "docs" | "slides";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GooglePickerDocument {
  id: string;
  name?: string;
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
let accessToken: string | null = null;

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

function requestAccessToken(clientId: string): Promise<string> {
  if (accessToken) return Promise.resolve(accessToken);

  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google 인증 모듈을 초기화하지 못했습니다."));
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_READONLY_SCOPE,
      callback: (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? "Google Drive 권한을 받지 못했습니다."));
          return;
        }
        accessToken = response.access_token;
        resolve(response.access_token);
      },
      error_callback: () => reject(new Error("Google 계정 선택 창이 닫혔습니다.")),
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function openGooglePicker(kind: GoogleFileKind): Promise<GooglePickerDocument | null> {
  const clientId = import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_PICKER_APP_ID;

  if (!clientId || !apiKey || !appId) {
    throw new Error("Google Picker 환경변수(Client ID, API Key, App ID)가 필요합니다.");
  }

  await Promise.all([loadPickerApi(), loadIdentityApi()]);
  const token = await requestAccessToken(clientId);
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
      .setOAuthToken(token)
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
