import { spawn } from "child_process";

interface FzfOptions {
  /** 다중 선택 허용 */
  multi?: boolean;
  /** 프롬프트 문자열 */
  prompt?: string;
  /** 헤더 텍스트 (키 바인딩 자동 추가됨) */
  header?: string;
  /** 높이 (예: "80%", "20") */
  height?: string;
  /** 미리보기 명령어 */
  preview?: string;
  /** 테두리 표시 */
  border?: boolean;
  /** 헤더에 키 바인딩 표시 */
  showKeyBindings?: boolean;
}

/**
 * fzf 설치 확인
 */
export async function checkFzfInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("which", ["fzf"]);
    proc.on("close", (code) => {
      resolve(code === 0);
    });
    proc.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * 키 바인딩 헤더 생성
 */
function buildHeader(userHeader: string | undefined, isMulti: boolean): string {
  const keyBindings = isMulti
    ? [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "  Tab: 선택    Ctrl+A: 전체선택",
        "  Enter: 확인        Ctrl+C: 취소",
        "  Ctrl+D: 전체해제",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ]
    : [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "  Enter: 선택        Ctrl+C: 취소",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ];

  const header = userHeader ? `${userHeader}\n` : "";
  return `${header}${keyBindings.join("\n")}`;
}

/**
 * fzf를 사용한 선택 프롬프트
 * - 실시간 fuzzy search
 * - 명확한 검색 입력창
 * - 다중 선택 지원
 * - 키 바인딩 UI 표시
 */
export async function fzfSelect(
  items: string[],
  options: FzfOptions = {}
): Promise<string[]> {
  const isInstalled = await checkFzfInstalled();
  if (!isInstalled) {
    throw new Error(
      "fzf is not installed. Please install it first:\n  brew install fzf"
    );
  }

  return new Promise((resolve, reject) => {
    const args: string[] = [];

    if (options.multi) {
      args.push("--multi");
    }

    if (options.prompt) {
      args.push("--prompt", options.prompt);
    }

    // 헤더에 키 바인딩 정보 자동 추가
    const showBindings = options.showKeyBindings !== false;
    if (showBindings) {
      const header = buildHeader(options.header, !!options.multi);
      args.push("--header", header);
    } else if (options.header) {
      args.push("--header", options.header);
    }

    // 헤더 라인 수에 맞게 높이 조정
    const headerLines = options.multi ? 6 : 4;
    args.push("--header-lines", "0"); // 리스트 아이템이 아닌 별도 헤더

    if (options.height) {
      args.push("--height", options.height);
    }

    if (options.preview) {
      args.push("--preview", options.preview);
      args.push("--preview-window", "right:40%:wrap");
    }

    if (options.border !== false) {
      args.push("--border", "rounded");
    }

    // 레이아웃: 검색창을 상단에
    args.push("--layout", "reverse");

    // 터미널 기본 컬러 사용 (커스텀 컬러 비활성화)

    // 키 바인딩
    if (options.multi) {
      args.push(
        "--bind",
        "tab:toggle",
        "--bind",
        "ctrl-a:select-all",
        "--bind",
        "ctrl-d:deselect-all",
        "--bind",
        "enter:accept"
      );
    }

    const fzf = spawn("fzf", args, {
      stdio: ["pipe", "pipe", "inherit"],
    });

    let output = "";

    fzf.stdout.on("data", (data) => {
      output += data.toString();
    });

    fzf.on("close", (code) => {
      if (code === 130) {
        // Ctrl+C
        resolve([]);
        return;
      }
      if (code !== 0 && code !== null) {
        resolve([]);
        return;
      }

      const selected = output
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      resolve(selected);
    });

    fzf.on("error", (err) => {
      reject(err);
    });

    // 아이템들을 fzf의 stdin으로 전달
    fzf.stdin.write(items.join("\n"));
    fzf.stdin.end();
  });
}

/**
 * fzf 단일 선택
 */
export async function fzfSelectOne(
  items: string[],
  options: Omit<FzfOptions, "multi"> = {}
): Promise<string | null> {
  const selected = await fzfSelect(items, { ...options, multi: false });
  return selected[0] || null;
}
