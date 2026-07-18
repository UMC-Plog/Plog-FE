const SUPPORTED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const INVALID_IMAGE_TYPE_MESSAGE = "JPG, PNG, WEBP 이미지만 선택할 수 있어요.";
const IMAGE_READ_ERROR_MESSAGE = "이미지를 불러오지 못했어요.";

export function getPersistentProfileImage(imageUrl: string | null | undefined) {
  const normalizedImageUrl = imageUrl?.trim();

  if (!normalizedImageUrl || normalizedImageUrl.startsWith("blob:")) {
    return null;
  }

  return normalizedImageUrl;
}

export function readProfileImage(file: File) {
  if (!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error(INVALID_IMAGE_TYPE_MESSAGE));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(IMAGE_READ_ERROR_MESSAGE));
    };
    reader.onerror = () => reject(new Error(IMAGE_READ_ERROR_MESSAGE));
    reader.onabort = () => reject(new Error(IMAGE_READ_ERROR_MESSAGE));
    reader.readAsDataURL(file);
  });
}
