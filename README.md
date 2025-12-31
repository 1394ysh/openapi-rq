<p align="center">
  <h1 align="center">openapi-rq (orq)</h1>
  <p align="center">
    <strong>OpenAPI React Query</strong> - OpenAPI 스펙에서 타입 안전한 React Query 코드 생성
  </p>
  <p align="center">
    <a href="./README_EN.md">English</a>
  </p>
</p>

<p align="center">
  <a href="#features">기능</a> •
  <a href="#installation">설치</a> •
  <a href="#quick-start">빠른 시작</a> •
  <a href="#commands">명령어</a> •
  <a href="#configuration">설정</a> •
  <a href="#usage">사용법</a>
</p>

---

**openapi-rq**는 OpenAPI 스펙에서 완전한 타입의 React Query 훅과 API 클라이언트 코드를 생성하는 CLI 도구입니다. [shadcn/ui](https://ui.shadcn.com/)에서 영감을 받아, 생성된 코드의 소유권을 사용자에게 제공합니다 - 런타임 의존성 없이 깔끔한 TypeScript 파일만 프로젝트에 추가됩니다.

> **참고**: 패키지 이름은 `openapi-rq`이며, CLI 명령어는 `orq` (단축 별칭)입니다.

## 왜 openapi-rq인가?

이 프로젝트는 팀 협업에서 API 명세에 대한 **단일 신뢰 원천(Single Source of Truth)**을 확립하기 위해 만들어졌습니다.

### 주요 장점

- **타입 안전성** - OpenAPI 스펙에서 직접 타입을 생성하여 런타임 에러 방지
- **점진적 도입** - 전체 코드베이스를 변경할 필요 없이 필요한 엔드포인트만 선택적으로 생성. 레거시 프로젝트에도 부담 없이 적용 가능
- **코드 소유권** - 생성된 코드는 프로젝트에 완전히 귀속. 필요시 자유롭게 수정 가능
- **런타임 의존성 제로** - orq는 생성 도구일 뿐, 프로덕션 번들에 포함되지 않음
- **병렬 개발 지원** - 백엔드 API가 준비되기 전에 플레이스홀더 생성으로 프론트엔드 개발 착수 가능

## 기능

- **타입 안전** - OpenAPI 스키마에서 자동 생성된 타입으로 완전한 TypeScript 지원
- **React Query v3/v4/v5** - TanStack Query의 모든 주요 버전 지원
- **런타임 오버헤드 제로** - 생성된 코드는 orq에 대한 의존성이 없음
- **대화형 CLI** - 퍼지 검색으로 특정 엔드포인트 선택
- **점진적 생성** - 필요에 따라 개별 엔드포인트 추가 또는 재생성
- **axios 통합** - HTTP 클라이언트 설정을 위한 부트스트랩 패턴
- **커스텀 요청 설정** - 파일 업로드/다운로드를 위한 headers, responseType, onUploadProgress 주입 가능

## 요구사항

- Node.js >= 18.0.0
- **fzf** - 대화형 퍼지 검색에 필수 ([설치 가이드](https://github.com/junegunn/fzf#installation))
- axios >= 1.0.0
- 다음 중 하나:
  - `react-query` >= 3.0.0 (v3용)
  - `@tanstack/react-query` >= 4.0.0 (v4/v5용)

### fzf 설치

```bash
# macOS
brew install fzf

# Ubuntu/Debian
sudo apt install fzf

# Windows (scoop)
scoop install fzf

# Windows (choco)
choco install fzf
```

## 설치

```bash
npm install -g openapi-rq
# 또는
npx openapi-rq
```

## 빠른 시작

```bash
# 1. 필수 의존성 설치
npm install axios @tanstack/react-query

# 2. 프로젝트 초기화
npx openapi-rq init

# 3. OpenAPI 스펙 추가
npx openapi-rq add

# 4. API 코드 생성
npx openapi-rq gen
```

## 명령어

| 명령어 | 별칭 | 설명 |
|--------|------|------|
| `orq init` | - | 설정 파일과 유틸리티 파일로 프로젝트 초기화 |
| `orq add` | - | 새 OpenAPI 스펙 URL 추가 |
| `orq remove` | `rm` | 등록된 스펙 제거 |
| `orq generate` | `g`, `gen` | API 코드 생성 (대화형) |
| `orq sync` | - | 등록된 모든 스펙 재생성 |
| `orq list` | `ls` | 등록된 스펙 목록 |
| `orq create` | `new` | 플레이스홀더 API 생성 (병렬 개발용) |

### 생성 옵션

```bash
# 대화형 모드 (기본)
npx openapi-rq gen

# 스펙의 모든 엔드포인트 생성
npx openapi-rq gen --spec PETSTORE --all

# 기존 파일 덮어쓰기
npx openapi-rq gen --all --overwrite
```

### 플레이스홀더 API 생성

백엔드가 준비되기 전에 API 파일 생성 - 프론트엔드/백엔드 병렬 개발에 유용:

```bash
# 대화형 모드
npx openapi-rq create

# 직접 지정
npx openapi-rq create --method GET --path /users/{userId} --spec MY_API
```

생성된 파일에는 타입과 훅이 포함되지만, API 함수는 실제 API가 준비될 때까지 에러를 던집니다. 실제 API가 준비되면 `orq generate --overwrite`로 교체하세요.

## 설정

`orq init` 실행 후 `orq.config.json` 파일이 생성됩니다:

```json
{
  "$schema": "https://unpkg.com/openapi-rq/schema.json",
  "outputPath": "./src/api",
  "reactQueryVersion": "v5",
  "httpClient": "axios",
  "keepSpecPrefix": true,
  "specs": {
    "PETSTORE": {
      "url": "https://petstore3.swagger.io/api/v3/openapi.json",
      "description": "Swagger Petstore API"
    }
  },
  "generate": {
    "queryHook": true,
    "mutationHook": true,
    "suspenseHook": false,
    "infiniteQueryHook": false
  }
}
```

### 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `outputPath` | `string` | `"./src/api"` | 생성된 파일의 출력 디렉토리 |
| `reactQueryVersion` | `"v3" \| "v4" \| "v5"` | `"v5"` | React Query 버전 |
| `httpClient` | `"axios"` | `"axios"` | HTTP 클라이언트 (현재 axios만 지원) |
| `keepSpecPrefix` | `boolean` | `true` | API URL에 스펙 접두사 유지 여부 (아래 설명 참고) |
| `generate.queryHook` | `boolean` | `true` | `useQuery` 훅 생성 |
| `generate.mutationHook` | `boolean` | `true` | `useMutation` 훅 생성 |
| `generate.suspenseHook` | `boolean` | `false` | `useSuspenseQuery` 훅 생성 (v5 전용) |
| `generate.infiniteQueryHook` | `boolean` | `false` | 페이지네이션용 `useInfiniteQuery` 훅 생성 |

### keepSpecPrefix 옵션

API URL에 스펙 이름 접두사를 유지할지 결정합니다.

#### `keepSpecPrefix: true` (기본값) - 여러 API 서버 사용 시

여러 OpenAPI 스펙(도메인)을 사용하고 각각 다른 baseURL이 필요한 경우:

```typescript
// 생성된 URL: "PETSTORE:/pet/{petId}"
// axios 인터셉터에서 스펙별 baseURL 라우팅
http.interceptors.request.use((config) => {
  if (config.url?.startsWith("PETSTORE:")) {
    config.baseURL = "https://petstore3.swagger.io/api/v3";
    config.url = config.url.replace("PETSTORE:", "");
  } else if (config.url?.startsWith("USER_API:")) {
    config.baseURL = "https://user-api.example.com";
    config.url = config.url.replace("USER_API:", "");
  }
  return config;
});
```

#### `keepSpecPrefix: false` - 단일 API 서버 사용 시

하나의 baseURL만 사용하는 경우:

```typescript
// 생성된 URL: "/pet/{petId}" (접두사 제거됨)
const http = axios.create({
  baseURL: "https://petstore3.swagger.io/api/v3"
});
setHttpClient(http);
```

## 사용법

### 1. HTTP 클라이언트 설정

앱의 진입점에서 axios 인스턴스를 설정합니다:

```typescript
// src/main.tsx 또는 src/index.tsx
import axios from "axios";
import { setHttpClient } from "@/api/__orq__";

const http = axios.create({
  baseURL: "/api",
  // 인터셉터, 헤더 등 추가
});

setHttpClient(http);
```

### 2. 생성된 훅 사용

```typescript
import { useGetPetByIdQuery } from "@/api/PETSTORE/get/pet/{petId}";

function PetDetail({ petId }: { petId: string }) {
  const { data, isLoading, error } = useGetPetByIdQuery({
    pathParams: { petId },
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>상태: {data.status}</p>
    </div>
  );
}
```

### 3. Repository 함수 직접 사용

```typescript
import { getPetById } from "@/api/PETSTORE/get/pet/{petId}";

async function fetchPet(petId: string) {
  const pet = await getPetById({ pathParams: { petId } });
  console.log(pet.name);
}
```

### 4. 파일 업로드 / 다운로드

`config` 옵션으로 axios 요청 설정을 커스터마이즈할 수 있습니다:

```typescript
import { uploadFile } from "@/api/MY_API/post/files/upload";
import { downloadFile } from "@/api/MY_API/get/files/{fileId}";

// 진행률과 함께 파일 업로드
const formData = new FormData();
formData.append("file", file);

await uploadFile({
  body: formData,
  config: {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded * 100) / e.total);
      console.log(`업로드 진행률: ${percent}%`);
    },
  },
});

// blob으로 파일 다운로드
const blob = await downloadFile({
  pathParams: { fileId: "123" },
  config: { responseType: "blob" },
});
```

### 5. 클래스 컴포넌트에서 사용

React Query 훅은 함수형 컴포넌트에서만 동작하지만, Repository 함수는 클래스 컴포넌트에서 직접 사용할 수 있습니다:

```typescript
import { getPetById } from "@/api/PETSTORE/get/pet/{petId}";

class PetDetail extends React.Component<{ petId: string }> {
  state = { pet: null, loading: true, error: null };

  async componentDidMount() {
    try {
      const pet = await getPetById({
        pathParams: { petId: this.props.petId }
      });
      this.setState({ pet, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  }

  render() {
    const { pet, loading, error } = this.state;
    if (loading) return <div>로딩 중...</div>;
    if (error) return <div>에러 발생</div>;
    return <div>{pet?.name}</div>;
  }
}
```

## 생성되는 파일 구조

```
src/api/
├── __orq__/
│   ├── httpClient.ts      # HTTP 클라이언트 부트스트랩 & RequestConfig 타입
│   ├── StringReplacer.ts  # URL 파라미터 유틸리티
│   └── index.ts
└── PETSTORE/
    ├── get/
    │   └── pet/{petId}.ts
    └── post/
        └── pet.ts
```

### 생성된 코드 예시

각 API 파일에 포함되는 내용:

```typescript
// 타입
export type PathParams = { petId: string };
export type QueryParams = Record<string, never>;
export type Body = undefined;
export type Response = Pet;
export type ErrorResponse = ApiError;

// 요청 인터페이스
export interface RequestArgs {
  pathParams: PathParams;
  queryParams?: QueryParams;
  body?: Body;
  config?: RequestConfig;  // 커스텀 headers, responseType 등
}

// 캐시 관리를 위한 쿼리 키
export const getPetByIdQueryKey = (req: RequestArgs) =>
  ["PETSTORE", "GET", "/pet/{petId}", req] as const;

// Repository 함수
export const getPetById = async (args: RequestArgs): Promise<Response> => {
  const url = new StringReplacer("PETSTORE:/pet/{petId}").replaceText(args.pathParams);
  const http = getHttpClient();
  return http.get(url, { params: args?.queryParams, ...args?.config });
};

// React Query 훅
export const useGetPetByIdQuery = <TData = Response, TError = ErrorResponse>(
  req: RequestArgs,
  options?: Omit<UseQueryOptions<Response, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> => {
  return useQuery({
    queryKey: getPetByIdQueryKey(req),
    queryFn: () => getPetById(req),
    ...options,
  });
};
```

## 라이선스

MIT
