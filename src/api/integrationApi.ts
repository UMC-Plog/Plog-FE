import type {
  FigmaResourceRegisterRequest,
  IntegrationAuthorizationResponse,
  IntegrationCollectionResponse,
  IntegrationDisconnectionResponse,
  IntegrationLinkType,
  IntegrationProviderPath,
  IntegrationResourceCandidateResponse,
  IntegrationResourceListResponse,
  IntegrationResourceResponse,
  IntegrationStatusResponse,
  NotionResourceRegisterRequest,
} from "../types/integration";
import { apiRequest } from "./client";

export const LINK_TYPE_BY_PROVIDER: Record<IntegrationProviderPath, IntegrationLinkType> = {
  github: "GITHUB",
  figma: "FIGMA",
  notion: "NOTION",
  google: "GOOGLE",
};

/** 1. 프로젝트 외부 연동 상태 조회 */
export function getIntegrationStatus(projectId: string) {
  return apiRequest<IntegrationStatusResponse>(`/api/projects/${projectId}/integrations`);
}

/**
 * 2. 외부 계정 연동 URL 발급.
 * 응답의 authorization으로 브라우저를 이동시키면 provider 승인 플로우가 시작된다.
 * 이미 연결된 provider면 409.
 */
export function createIntegrationAuthorization(
  projectId: string,
  provider: IntegrationProviderPath
) {
  return apiRequest<IntegrationAuthorizationResponse>(
    `/api/projects/${projectId}/integrations/${provider}/authorization`,
    { method: "POST" }
  );
}

/** 3-1. 등록된 수집 대상 리소스 조회 (GitHub repository는 App 설치 콜백에서 자동 등록됨) */
export function getIntegrationResources(
  projectId: string,
  provider: IntegrationProviderPath
) {
  return apiRequest<IntegrationResourceListResponse>(
    `/api/projects/${projectId}/integrations/${provider}/resources`
  );
}

/** 3-2. Notion 등록 후보 조회 (query는 Notion 제목 검색어) */
export function getNotionResourceCandidates(projectId: string, query?: string) {
  const search = query ? `?query=${encodeURIComponent(query)}` : "";

  return apiRequest<IntegrationResourceCandidateResponse[]>(
    `/api/projects/${projectId}/integrations/notion/resources/candidates${search}`
  );
}

/** 3-3. Notion 수집 대상 등록 */
export function registerNotionResource(
  projectId: string,
  request: NotionResourceRegisterRequest
) {
  return apiRequest<IntegrationResourceResponse>(
    `/api/projects/${projectId}/integrations/notion/resources`,
    { method: "POST", body: request }
  );
}

/** 3-5. Figma Design File 수집 대상 등록 (서버가 URL에서 file key를 추출해 권한 재검증) */
export function registerFigmaResource(projectId: string, fileUrl: string) {
  const request: FigmaResourceRegisterRequest = { fileUrl };

  return apiRequest<IntegrationResourceResponse>(
    `/api/projects/${projectId}/integrations/figma/resources`,
    { method: "POST", body: request }
  );
}

/** 4. 외부 연동 데이터 수동 수집 (프로젝트 완료 시 자동 수집되며, 재동기화용) */
export function collectIntegrationData(projectId: string) {
  return apiRequest<IntegrationCollectionResponse>(
    `/api/projects/${projectId}/integrations/collect`,
    { method: "POST" }
  );
}

/** 6. 외부 계정 연동 해제 (연결 정보·수집 대상·활동·계정 매핑이 함께 정리됨) */
export function disconnectIntegration(
  projectId: string,
  provider: IntegrationProviderPath
) {
  return apiRequest<IntegrationDisconnectionResponse>(
    `/api/projects/${projectId}/integrations/${provider}`,
    { method: "DELETE" }
  );
}
