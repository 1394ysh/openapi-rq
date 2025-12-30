import { PATTERNS } from "../constants/index.js";

/**
 * 문자열을 PascalCase로 변환
 * @example "get_user_by_id" => "GetUserById"
 * @example "getUserById" => "GetUserById"
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * 문자열을 camelCase로 변환
 * @example "get_user_by_id" => "getUserById"
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

/**
 * TypeScript 유효 식별자인지 확인
 */
export function isValidTsIdentifier(str: string): boolean {
  return PATTERNS.tsIdentifier.test(str);
}

/**
 * 객체 키를 안전한 문자열로 변환
 * 특수문자가 있으면 따옴표로 감싸기
 */
export function safePropertyKey(key: string): string {
  return isValidTsIdentifier(key) ? key : `"${key}"`;
}

/**
 * UPPER_SNAKE_CASE 유효성 검사
 */
export function isValidSpecName(name: string): boolean {
  return PATTERNS.specName.test(name);
}

/**
 * URL 경로에서 파라미터 추출
 * @example "/pet/{petId}/photos/{photoId}" => ["petId", "photoId"]
 */
export function extractPathParams(path: string): string[] {
  const matches = path.match(PATTERNS.pathParam);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1)); // {param} => param
}

/**
 * URL 경로의 파라미터를 값으로 교체
 * @example replacePathParams("/pet/{petId}", { petId: "123" }) => "/pet/123"
 */
export function replacePathParams(
  path: string,
  params: Record<string, string | number>
): string {
  return path.replace(PATTERNS.pathParam, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}
