import fs from "fs/promises";
import path from "path";

/**
 * 파일 존재 여부 확인
 * 권한 에러는 예외로 던짐
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return false;
    }
    if (nodeError.code === "EACCES") {
      throw new Error(`Permission denied: ${filePath}`);
    }
    throw error;
  }
}

/**
 * 디렉토리 존재 여부 확인
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * 디렉토리 생성 (재귀)
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * API 파일 경로 생성
 * @example generateFilePath("get", "/pet/{petId}") => "get/pet/{petId}.ts"
 */
export function generateFileName(method: string, apiPath: string): string {
  const cleanPath = apiPath.replace(/^\//, "");
  return `${method.toLowerCase()}/${cleanPath}.ts`;
}

/**
 * 전체 API 파일 경로 생성
 */
export function generateFullPath(
  outputPath: string,
  specName: string,
  method: string,
  apiPath: string
): string {
  return path.join(outputPath, specName, generateFileName(method, apiPath));
}

/**
 * 파일 안전하게 작성 (디렉토리 자동 생성)
 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * 파일 삭제 (존재하지 않아도 에러 없음)
 */
export async function removeFileSafe(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
