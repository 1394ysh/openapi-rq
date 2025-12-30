/**
 * 프로젝트 전역 상수
 */

// 설정 파일
export const CONFIG_FILE_NAME = "orq.config.json" as const;
export const SCHEMA_URL = "https://unpkg.com/openapi-rq/schema.json" as const;

// HTTP 메서드
export const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

// 유효성 검증 패턴
export const PATTERNS = {
  /** UPPER_SNAKE_CASE 스펙 이름 */
  specName: /^[A-Z][A-Z0-9_]*$/,
  /** TypeScript 유효 식별자 */
  tsIdentifier: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
  /** URL 경로 파라미터 */
  pathParam: /\{(\w+)\}/g,
} as const satisfies Record<string, RegExp>;

// fzf 설정
export const FZF_CONFIG = {
  colors: {
    theme: [
      "--color=fg:#d0d0d0,bg:#121212,hl:#5f87af",
      "--color=fg+:#d0d0d0,bg+:#262626,hl+:#5fd7ff",
      "--color=info:#afaf87,prompt:#d7005f,pointer:#af5fff",
      "--color=marker:#87ff00,spinner:#af5fff,header:#87afaf",
    ],
  },
  headerLines: {
    multi: 6,
    single: 4,
  },
} as const;
