const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";

type GoogleFileKind = "docs" | "slides";

interface GooglePickerDocument {
  id: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number | string;
  lastEditedUtc?: number | string;
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

function getPickerEnvironment() {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_PICKER_APP_ID;

  if (!apiKey || !appId) {
    throw new Error("Google Picker 환경변수(API Key, App ID)가 필요합니다.");
  }

  return { apiKey, appId };
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
