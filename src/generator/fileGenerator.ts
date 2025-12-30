import fs from "fs/promises";
import path from "path";
import type { OpenApiSpec, OperationObject, SchemaObject } from "../parser/openapi.js";
import {
  schemaToTypeString,
  extractAllSchemaNames,
  generateTypeDefinition,
} from "../parser/openapi.js";
import type { SpecName } from "../config/specs.js";
import type { ReactQueryConfig } from "../cli/prompts/selectReactQueryVersion.js";

interface ApiInfo {
  method: string;
  path: string;
  operationId: string;
}

interface HookOptions {
  queryHook?: boolean;
  mutationHook?: boolean;
  suspenseHook?: boolean;
  infiniteQueryHook?: boolean;
}

interface GenerateOptions {
  specName: SpecName;
  api: ApiInfo;
  outputPath: string;
  openApiSpec: OpenApiSpec;
  reactQueryConfig?: ReactQueryConfig;
  httpClientPath?: string;
  hookOptions?: HookOptions;
}

// 기본 설정
const DEFAULT_REACT_QUERY_CONFIG: ReactQueryConfig = {
  version: "v5",
  importPath: "@tanstack/react-query",
  queryImports: ["useQuery", "UseQueryOptions", "UseQueryResult"],
  mutationImports: ["useMutation", "UseMutationOptions", "UseMutationResult"],
};

const DEFAULT_HTTP_CLIENT_PATH = "@/lib/http";

const DEFAULT_HOOK_OPTIONS: HookOptions = {
  queryHook: true,
  mutationHook: true,
  suspenseHook: false,
  infiniteQueryHook: false,
};

/**
 * 단일 API 파일 생성
 */
export async function generateApiFile(options: GenerateOptions): Promise<void> {
  const { specName, api, outputPath, openApiSpec, reactQueryConfig, httpClientPath, hookOptions } = options;

  // 작업 객체 가져오기
  const pathItem = openApiSpec.paths[api.path];
  const operation = pathItem?.[api.method] as OperationObject | undefined;

  if (!operation) {
    throw new Error(`Operation not found: ${api.method} ${api.path}`);
  }

  // 파일 내용 생성
  const content = generateFileContent({
    specName,
    method: api.method,
    path: api.path,
    operation,
    openApiSpec,
    reactQueryConfig: reactQueryConfig || DEFAULT_REACT_QUERY_CONFIG,
    httpClientPath: httpClientPath || DEFAULT_HTTP_CLIENT_PATH,
    hookOptions: { ...DEFAULT_HOOK_OPTIONS, ...hookOptions },
  });

  // 디렉토리 생성
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // 파일 작성
  await fs.writeFile(outputPath, content, "utf-8");
}

interface GenerateContentOptions {
  specName: SpecName;
  method: string;
  path: string;
  operation: OperationObject;
  openApiSpec: OpenApiSpec;
  reactQueryConfig: ReactQueryConfig;
  httpClientPath: string;
  hookOptions: HookOptions;
}

/**
 * 파일 내용 생성
 */
function generateFileContent(options: GenerateContentOptions): string {
  const {
    specName,
    method,
    path: apiPath,
    operation,
    openApiSpec,
    reactQueryConfig,
    httpClientPath,
    hookOptions,
  } = options;

  const operationId =
    operation.operationId || `${method}${apiPath.replace(/\//g, "_")}`;
  const pascalCaseId = toPascalCase(operationId);

  // 파라미터 분석
  const pathParams = (operation.parameters || []).filter((p) => p.in === "path");
  const queryParams = (operation.parameters || []).filter((p) => p.in === "query");

  // 요청/응답 스키마 추출 (content-type에 관계없이 첫 번째 스키마 사용)
  const requestSchema = getFirstSchema(operation.requestBody?.content);

  // 성공 응답 추출 (2XX 패턴, 204 No Content 지원)
  const successResponseInfo = getSuccessResponse(operation.responses);

  // 에러 응답 추출 (4XX, 5XX 패턴 지원, 여러 에러 타입 union)
  const errorSchemas = getErrorSchemas(operation.responses);

  // 타입 문자열 생성
  const pathParamsType = generatePathParamsType(pathParams);
  const queryParamsType = generateQueryParamsType(queryParams, openApiSpec);
  const bodyType = requestSchema
    ? schemaToTypeString(requestSchema, openApiSpec)
    : "undefined";

  // 204 No Content는 void
  const responseType = successResponseInfo.isNoContent
    ? "void"
    : successResponseInfo.schema
      ? schemaToTypeString(successResponseInfo.schema, openApiSpec)
      : "void";

  // 여러 에러 타입을 union으로 합침
  const errorType = errorSchemas.length > 0
    ? errorSchemas
        .map((schema) => schemaToTypeString(schema, openApiSpec))
        .filter((type, index, arr) => arr.indexOf(type) === index) // 중복 제거
        .join(" | ")
    : "unknown";

  // 필수 여부 확인
  const hasRequiredPathParams = pathParams.length > 0;
  const hasRequiredQueryParams = queryParams.some((p) => p.required);
  const hasRequiredBody = operation.requestBody?.required ?? false;

  // 사용된 스키마 수집 (별도 타입 정의용)
  const usedSchemas = extractAllSchemaNames(operation, openApiSpec);
  const schemaDefinitions = generateSchemaDefinitions(usedSchemas, openApiSpec);

  const now = new Date().toISOString();

  // 요청 args 타입 생성
  const argsType = generateArgsType({
    hasRequiredPathParams,
    hasRequiredQueryParams,
    hasRequiredBody,
  });

  // React Query import 생성 (hookOptions에 따라 필요한 import만)
  const reactQueryImport = generateReactQueryImport(reactQueryConfig, hookOptions);

  // __orq__ 경로 계산 (폴더 깊이에 따라 동적으로)
  // 구조: {specName}/{method}/...path.../file.ts → __orq__는 specName과 같은 레벨
  const pathDepth = apiPath.split("/").filter(Boolean).length; // path segments
  const totalDepth = 1 + pathDepth; // method 폴더 + path 폴더들
  const utilsRelativePath = "../".repeat(totalDepth) + "__orq__";

  // Hook 코드 생성
  const queryHookCode = hookOptions.queryHook
    ? generateQueryHook(pascalCaseId, operationId, argsType)
    : "";
  const suspenseHookCode = hookOptions.suspenseHook
    ? generateSuspenseHook(pascalCaseId, operationId, argsType)
    : "";
  const mutationHookCode = hookOptions.mutationHook
    ? generateMutationHook(pascalCaseId, operationId)
    : "";
  const infiniteQueryHookCode = hookOptions.infiniteQueryHook
    ? generateInfiniteQueryHook(pascalCaseId, operationId, argsType, reactQueryConfig.version)
    : "";

  // Hook 섹션 조합
  const hooksSection = [queryHookCode, suspenseHookCode, infiniteQueryHookCode, mutationHookCode]
    .filter(Boolean)
    .join("\n");

  return `/**
 * ${method.toUpperCase()} ${apiPath}
 * ${operation.summary || "Auto-generated API file"}
 * Generated at: ${now}
 * Source: ${specName}
 */
${reactQueryImport}
import { StringReplacer, getHttpClient, type RequestConfig } from "${utilsRelativePath}";

// ===== Types =====
${schemaDefinitions ? `// Referenced Types\n${schemaDefinitions}\n` : ""}
export type PathParams = ${pathParamsType};

export type QueryParams = ${queryParamsType};

export type Body = ${bodyType};

export type Response = ${responseType};

export type ErrorResponse = ${errorType};

export interface RequestArgs {
  pathParams${hasRequiredPathParams ? "" : "?"}: PathParams;
  queryParams${hasRequiredQueryParams ? "" : "?"}: QueryParams;
  body${hasRequiredBody ? "" : "?"}: Body;
  config?: RequestConfig;
}

// ===== API URL =====
const API_URL = "${specName}:${apiPath}";

// ===== Query Keys =====
export const ${operationId}QueryKey = (req: RequestArgs) =>
  ["${specName}", "${method.toUpperCase()}", "${apiPath}", req] as const;

// ===== Repository =====
export const ${operationId} = async (args: RequestArgs${argsType}): Promise<Response> => {
  const url = new StringReplacer(API_URL).replaceText(args?.pathParams ?? {});
${generateHttpCall(method)}
};
${hooksSection}
`;
}

/**
 * React Query import 문 생성
 * TypeScript 4.5+ inline type imports를 사용하여 ESLint no-duplicate-imports 규칙 호환
 */
function generateReactQueryImport(
  config: ReactQueryConfig,
  hookOptions: HookOptions
): string {
  const imports: string[] = [];

  // Query Hook imports
  if (hookOptions.queryHook || hookOptions.suspenseHook) {
    imports.push("useQuery");
    imports.push("type UseQueryOptions");
    imports.push("type UseQueryResult");
  }

  // Suspense Hook imports (useSuspenseQuery는 v5에서만)
  if (hookOptions.suspenseHook && config.version === "v5") {
    imports.push("useSuspenseQuery");
    imports.push("type UseSuspenseQueryResult");
  }

  // Mutation Hook imports
  if (hookOptions.mutationHook) {
    imports.push("useMutation");
    imports.push("type UseMutationOptions");
    imports.push("type UseMutationResult");
  }

  // Infinite Query Hook imports
  if (hookOptions.infiniteQueryHook) {
    imports.push("useInfiniteQuery");
    imports.push("type UseInfiniteQueryOptions");
    imports.push("type UseInfiniteQueryResult");
    imports.push("type InfiniteData");
  }

  if (imports.length === 0) {
    return ""; // No hooks needed
  }

  return `import {
  ${imports.join(",\n  ")},
} from "${config.importPath}";`;
}

/**
 * Query Hook 코드 생성
 */
function generateQueryHook(
  pascalCaseId: string,
  operationId: string,
  argsType: string
): string {
  return `
// ===== React Query Hook =====
export const use${pascalCaseId}Query = <TData = Response, TError = ErrorResponse>(
  req: RequestArgs${argsType},
  options?: Omit<UseQueryOptions<Response, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> => {
  return useQuery({
    queryKey: ${operationId}QueryKey(req),
    queryFn: () => ${operationId}(req),
    ...options,
  });
};`;
}

/**
 * Suspense Query Hook 코드 생성 (React Query v5+)
 */
function generateSuspenseHook(
  pascalCaseId: string,
  operationId: string,
  argsType: string
): string {
  return `
// ===== Suspense Query Hook =====
export const use${pascalCaseId}SuspenseQuery = <TData = Response, TError = ErrorResponse>(
  req: RequestArgs${argsType},
  options?: Omit<UseQueryOptions<Response, TError, TData>, "queryKey" | "queryFn">
): UseSuspenseQueryResult<TData, TError> => {
  return useSuspenseQuery({
    queryKey: ${operationId}QueryKey(req),
    queryFn: () => ${operationId}(req),
    ...options,
  });
};`;
}

/**
 * Mutation Hook 코드 생성
 */
function generateMutationHook(
  pascalCaseId: string,
  operationId: string
): string {
  return `
// ===== Mutation Hook =====
export const use${pascalCaseId}Mutation = <TContext = unknown>(
  options?: Omit<
    UseMutationOptions<Response, ErrorResponse, RequestArgs, TContext>,
    "mutationFn"
  >
): UseMutationResult<Response, ErrorResponse, RequestArgs, TContext> => {
  return useMutation({
    mutationFn: ${operationId},
    ...options,
  });
};`;
}

/**
 * Infinite Query Hook 코드 생성
 */
function generateInfiniteQueryHook(
  pascalCaseId: string,
  operationId: string,
  argsType: string,
  version: "v3" | "v4" | "v5"
): string {
  // v5: 6개 타입 인자 (TPageParam 포함)
  // v3, v4: 5개 타입 인자
  if (version === "v5") {
    return `
// ===== Infinite Query Hook =====
export const use${pascalCaseId}InfiniteQuery = <TPageParam = unknown>(
  req: RequestArgs${argsType},
  options: Omit<
    UseInfiniteQueryOptions<Response, ErrorResponse, InfiniteData<Response>, Response, ReturnType<typeof ${operationId}QueryKey>, TPageParam>,
    "queryKey" | "queryFn"
  >
): UseInfiniteQueryResult<InfiniteData<Response>, ErrorResponse> => {
  return useInfiniteQuery({
    queryKey: ${operationId}QueryKey(req),
    queryFn: ({ pageParam }) => ${operationId}({
      ...req,
      queryParams: { ...req.queryParams, ...(pageParam as Record<string, unknown>) },
    } as RequestArgs),
    ...options,
  });
};`;
  }

  // v3, v4: 5개 타입 인자
  return `
// ===== Infinite Query Hook =====
export const use${pascalCaseId}InfiniteQuery = <TPageParam = unknown>(
  req: RequestArgs${argsType},
  options: Omit<
    UseInfiniteQueryOptions<Response, ErrorResponse, InfiniteData<Response>, Response, ReturnType<typeof ${operationId}QueryKey>>,
    "queryKey" | "queryFn"
  > & {
    getNextPageParam: (lastPage: Response, allPages: Response[]) => TPageParam | undefined;
  }
): UseInfiniteQueryResult<InfiniteData<Response>, ErrorResponse> => {
  return useInfiniteQuery({
    queryKey: ${operationId}QueryKey(req),
    queryFn: ({ pageParam }) => ${operationId}({
      ...req,
      queryParams: { ...req.queryParams, ...(pageParam as Record<string, unknown>) },
    } as RequestArgs),
    ...options,
  });
};`;
}

/**
 * 참조된 스키마들의 타입 정의 생성
 */
function generateSchemaDefinitions(
  schemaNames: Set<string>,
  spec: OpenApiSpec
): string {
  if (schemaNames.size === 0) return "";

  const definitions: string[] = [];

  schemaNames.forEach((name) => {
    const schema = spec.components?.schemas?.[name];
    if (schema) {
      definitions.push(generateTypeDefinition(name, schema, spec));
    }
  });

  return definitions.join("\n\n");
}

/**
 * Path Params 타입 생성
 */
function generatePathParamsType(
  params: Array<{ name: string; required?: boolean; schema?: SchemaObject }>
): string {
  if (params.length === 0) {
    return "Record<string, never>";
  }

  const props = params
    .map((p) => {
      let type = "string";
      if (p.schema?.type === "integer" || p.schema?.type === "number") {
        type = "number";
      }
      return `${p.name}: ${type}`;
    })
    .join("; ");

  return `{ ${props} }`;
}

/**
 * Query Params 타입 생성
 */
function generateQueryParamsType(
  params: Array<{ name: string; required?: boolean; schema?: SchemaObject }>,
  spec: OpenApiSpec
): string {
  if (params.length === 0) {
    return "Record<string, never>";
  }

  const props = params
    .map((p) => {
      const optional = p.required ? "" : "?";
      const type = schemaToTypeString(p.schema, spec);
      return `${p.name}${optional}: ${type}`;
    })
    .join("; ");

  return `{ ${props} }`;
}

/**
 * 요청 args 기본값 타입 생성
 */
function generateArgsType(options: {
  hasRequiredPathParams: boolean;
  hasRequiredQueryParams: boolean;
  hasRequiredBody: boolean;
}): string {
  const { hasRequiredPathParams, hasRequiredQueryParams, hasRequiredBody } =
    options;

  // 모든 파라미터가 optional이면 기본값 허용
  if (!hasRequiredPathParams && !hasRequiredQueryParams && !hasRequiredBody) {
    return " = {}";
  }
  return "";
}

/**
 * HTTP 호출 코드 생성 (axios 전용)
 * 사용처의 axios instance가 interceptor에서 data를 추출할 수 있으므로 response 그대로 반환
 * args.config를 통해 headers, responseType 등 axios 옵션 주입 가능
 */
function generateHttpCall(method: string): string {
  const lowerMethod = method.toLowerCase();

  if (lowerMethod === "get") {
    return `  const http = getHttpClient();
  return http.get(url, { params: args?.queryParams, ...args?.config });`;
  }

  if (lowerMethod === "delete") {
    return `  const http = getHttpClient();
  return http.delete(url, { params: args?.queryParams, data: args?.body, ...args?.config });`;
  }

  // post, put, patch
  return `  const http = getHttpClient();
  return http.${lowerMethod}(url, args?.body, { params: args?.queryParams, ...args?.config });`;
}

/**
 * 문자열을 PascalCase로 변환
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * content 객체에서 첫 번째 스키마를 추출
 * application/json, multipart/form-data, application/octet-stream 등 모든 content-type 지원
 */
function getFirstSchema(
  content?: Record<string, { schema?: SchemaObject }>
): SchemaObject | undefined {
  if (!content) return undefined;

  // 우선순위: application/json > 나머지
  if (content["application/json"]?.schema) {
    return content["application/json"].schema;
  }

  // 첫 번째 content-type의 스키마 반환
  const firstKey = Object.keys(content)[0];
  return firstKey ? content[firstKey]?.schema : undefined;
}

interface ResponseInfo {
  schema: SchemaObject | undefined;
  statusCode: string;
  isNoContent: boolean;
}

/**
 * 성공 응답(2XX) 추출
 * 우선순위: 200 > 201 > 202 > 203 > 2XX > default
 * 204 No Content는 별도 처리
 */
function getSuccessResponse(
  responses: Record<string, { description?: string; content?: Record<string, { schema?: SchemaObject }> }> | undefined
): ResponseInfo {
  if (!responses) {
    return { schema: undefined, statusCode: "200", isNoContent: false };
  }

  // 204 No Content 확인
  if (responses["204"]) {
    return { schema: undefined, statusCode: "204", isNoContent: true };
  }

  // 구체적인 2XX 코드 우선
  const successCodes = ["200", "201", "202", "203"];
  for (const code of successCodes) {
    if (responses[code]) {
      return {
        schema: getFirstSchema(responses[code].content),
        statusCode: code,
        isNoContent: false,
      };
    }
  }

  // 2XX 패턴 (와일드카드)
  if (responses["2XX"]) {
    return {
      schema: getFirstSchema(responses["2XX"].content),
      statusCode: "2XX",
      isNoContent: false,
    };
  }

  // default를 성공으로 사용하는 경우 (에러가 아닌 경우)
  if (responses["default"] && !responses["4XX"] && !responses["5XX"]) {
    return {
      schema: getFirstSchema(responses["default"].content),
      statusCode: "default",
      isNoContent: false,
    };
  }

  return { schema: undefined, statusCode: "200", isNoContent: false };
}

/**
 * 에러 응답(4XX, 5XX) 추출 및 union 타입 생성
 * 여러 에러 타입이 있으면 union으로 합침
 */
function getErrorSchemas(
  responses: Record<string, { description?: string; content?: Record<string, { schema?: SchemaObject }> }> | undefined
): SchemaObject[] {
  if (!responses) return [];

  const errorSchemas: SchemaObject[] = [];
  const errorCodes: string[] = [];

  // 모든 키 순회
  for (const code of Object.keys(responses)) {
    // 4XX, 5XX 패턴
    if (code === "4XX" || code === "5XX") {
      const schema = getFirstSchema(responses[code].content);
      if (schema) errorSchemas.push(schema);
      continue;
    }

    // 개별 4xx, 5xx 코드
    const numCode = parseInt(code, 10);
    if (numCode >= 400 && numCode < 600) {
      const schema = getFirstSchema(responses[code].content);
      if (schema) {
        errorSchemas.push(schema);
        errorCodes.push(code);
      }
    }
  }

  // default를 에러로 사용하는 경우
  if (responses["default"] && errorSchemas.length === 0) {
    const schema = getFirstSchema(responses["default"].content);
    if (schema) errorSchemas.push(schema);
  }

  return errorSchemas;
}
