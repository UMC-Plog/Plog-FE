/** 외부 연동 API 타입 — https://api.umc-plog.site/v3/api-docs 의 Integration 태그 기준 */

export type IntegrationLinkType = "GITHUB" | "FIGMA" | "NOTION" | "GOOGLE";

/** 연동 API의 path variable. 스웨거 소셜 인증(`kakao | google`)과 동일하게 소문자를 쓴다 */
export type IntegrationProviderPath = "github" | "figma" | "notion" | "google";

export type IntegrationResourceType =
  | "GITHUB_REPOSITORY"
  | "NOTION_PAGE"
  | "NOTION_DATA_SOURCE"
  | "GOOGLE_DOCUMENT"
  | "GOOGLE_PRESENTATION"
  | "FIGMA_FILE";

export type IntegrationResourceStatus = "ACTIVE" | "REAUTH_REQUIRED" | "DISABLED";

/** Notion 등록 요청/후보 조회에서 쓰는 대상 종류 */
export type NotionResourceType = "PAGE" | "DATA_SOURCE";

export interface IntegrationItemResponse {
  linkType: IntegrationLinkType;
  linked: boolean;
  /** 화면 표시용 연결 계정/워크스페이스 이름. 미연결이면 null */
  connectedAccountName: string | null;
}

export interface IntegrationStatusResponse {
  projectId: number;
  projectMemberId: number;
  /** GITHUB, FIGMA, NOTION, GOOGLE 순서로 항상 4개가 내려온다 */
  integrations: IntegrationItemResponse[];
}

export interface IntegrationAuthorizationResponse {
  linkType: IntegrationLinkType;
  /** provider 승인 화면 URL */
  authorization: string;
  /** 발급된 state 만료 시각 */
  expiresAt: string;
}

export interface IntegrationResourceResponse {
  resourceId: number;
  providerResourceId: string;
  resourceType: IntegrationResourceType;
  resourceName: string;
  resourceUrl: string;
  resourceStatus: IntegrationResourceStatus;
  lastModifiedAt: string | null;
  lastCollectedAt: string | null;
}

export interface IntegrationResourceListResponse {
  projectId: number;
  linkType: IntegrationLinkType;
  resources: IntegrationResourceResponse[];
}

export interface IntegrationResourceCandidateResponse {
  providerResourceId: string;
  resourceType: NotionResourceType;
  resourceName: string;
  resourceUrl: string;
  lastModifiedAt: string | null;
}

export interface NotionResourceRegisterRequest {
  resourceType: NotionResourceType;
  providerResourceId: string;
}

export interface FigmaResourceRegisterRequest {
  fileUrl: string;
}

export interface GoogleResourceRegisterRequest {
  fileId: string;
}

export interface GooglePickerAccessTokenResponse {
  accessToken: string;
  connectedAccountName: string;
  expiresAt: string;
}

export interface IntegrationCollectionFailureResponse {
  resourceId: number;
  linkType: IntegrationLinkType;
  resourceName: string;
  reason: string;
}

export interface IntegrationCollectionResponse {
  projectId: number;
  requestedResourceCount: number;
  collectedResourceCount: number;
  failures: IntegrationCollectionFailureResponse[];
}

export interface IntegrationDisconnectionResponse {
  projectId: number;
  linkType: IntegrationLinkType;
}

export interface IntegrationResourceRemovalResponse {
  projectId: number;
  linkType: Exclude<IntegrationLinkType, "GITHUB">;
  resourceId: number;
}
