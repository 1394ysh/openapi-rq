import { HTTP_METHODS } from "../constants/index.js";
import type { OpenApiSpec, OperationObject } from "./openapi.js";

/**
 * API 정보 인터페이스
 */
export interface ApiInfo {
  method: string;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
}

/**
 * OpenAPI 스펙에서 모든 API 추출
 */
export function extractAllApis(spec: OpenApiSpec): ApiInfo[] {
  const apis: ApiInfo[] = [];

  if (!spec.paths) return apis;

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = methods[method] as OperationObject | undefined;
      if (!operation) continue;

      apis.push({
        method,
        path,
        operationId: operation.operationId || `${method}${path.replace(/\//g, "_")}`,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags,
      });
    }
  }

  return apis;
}

/**
 * 태그별로 API 그룹화
 */
export function groupApisByTag(apis: ApiInfo[]): Record<string, ApiInfo[]> {
  const groups: Record<string, ApiInfo[]> = {};

  for (const api of apis) {
    const tags = api.tags?.length ? api.tags : ["untagged"];
    for (const tag of tags) {
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(api);
    }
  }

  return groups;
}

/**
 * API 표시 문자열 생성
 */
export function formatApiDisplay(api: ApiInfo): string {
  const method = api.method.toUpperCase().padEnd(7);
  const summary = api.summary ? ` - ${api.summary}` : "";
  return `${method} ${api.path}${summary}`;
}

/**
 * 태그에 속한 API 개수 계산
 */
export function countApisByTag(
  spec: OpenApiSpec
): Array<{ name: string; count: number; description?: string }> {
  const tagCounts = new Map<string, number>();
  const tagDescriptions = new Map<string, string | undefined>();

  // 태그 설명 수집
  for (const tag of spec.tags || []) {
    tagDescriptions.set(tag.name, tag.description);
  }

  // API 카운트
  const apis = extractAllApis(spec);
  for (const api of apis) {
    const tags = api.tags?.length ? api.tags : ["untagged"];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries()).map(([name, count]) => ({
    name,
    count,
    description: tagDescriptions.get(name),
  }));
}
