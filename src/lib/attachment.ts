export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024

export const MAX_ATTACHMENT_SIZE_ERROR = '파일은 최대 50MB까지 첨부할 수 있어요'

export const isAttachmentSizeValid = (file: File) =>
  file.size <= MAX_ATTACHMENT_SIZE
