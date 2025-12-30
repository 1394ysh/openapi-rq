import fs from "fs/promises";
import path from "path";
import { CONFIG_FILE_NAME } from "../constants/index.js";

/**
 * orq.config.json 설정 타입
 */
export interface SpecConfig {
  url: string;
  description?: string;
}

export type ReactQueryVersion = "v3" | "v4" | "v5";

export interface GenerateConfig {
  queryHook?: boolean;
  mutationHook?: boolean;
  suspenseHook?: boolean;
  infiniteQueryHook?: boolean;
}

export interface OrqConfig {
  $schema?: string;
  outputPath?: string;
  httpClient?: string;
  reactQueryVersion?: ReactQueryVersion;
  reactQuery?: {
    version?: ReactQueryVersion;
    importPath?: string;
  };
  generate?: GenerateConfig;
  specs?: Record<string, SpecConfig>;
  [key: string]: unknown;
}

export interface LoadConfigResult {
  config: OrqConfig | null;
  error: ConfigError | null;
  configPath: string;
}

export type ConfigErrorType =
  | "not_found"
  | "parse_error"
  | "permission_denied"
  | "unknown";

export interface ConfigError {
  type: ConfigErrorType;
  message: string;
  originalError?: Error;
}

/**
 * 설정 파일 경로 반환
 */
export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILE_NAME);
}

/**
 * 설정 파일 로드 (상세 에러 정보 포함)
 */
export async function loadConfig(
  cwd: string = process.cwd()
): Promise<LoadConfigResult> {
  const configPath = getConfigPath(cwd);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    try {
      const config = JSON.parse(content) as OrqConfig;
      return { config, error: null, configPath };
    } catch (parseError) {
      return {
        config: null,
        error: {
          type: "parse_error",
          message: `Invalid JSON in ${CONFIG_FILE_NAME}`,
          originalError: parseError instanceof Error ? parseError : undefined,
        },
        configPath,
      };
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return {
        config: null,
        error: {
          type: "not_found",
          message: `${CONFIG_FILE_NAME} not found`,
        },
        configPath,
      };
    }

    if (nodeError.code === "EACCES") {
      return {
        config: null,
        error: {
          type: "permission_denied",
          message: `Permission denied: ${configPath}`,
          originalError: nodeError,
        },
        configPath,
      };
    }

    return {
      config: null,
      error: {
        type: "unknown",
        message: nodeError.message || "Unknown error",
        originalError: nodeError,
      },
      configPath,
    };
  }
}

/**
 * 설정 파일 로드 (간단한 버전 - null 반환)
 */
export async function loadConfigSimple(
  cwd: string = process.cwd()
): Promise<OrqConfig | null> {
  const result = await loadConfig(cwd);
  return result.config;
}

/**
 * 설정 파일 저장
 */
export async function saveConfig(
  config: OrqConfig,
  cwd: string = process.cwd()
): Promise<void> {
  const configPath = getConfigPath(cwd);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * 설정 파일 존재 여부 확인
 */
export async function configExists(
  cwd: string = process.cwd()
): Promise<boolean> {
  const result = await loadConfig(cwd);
  return result.config !== null;
}
