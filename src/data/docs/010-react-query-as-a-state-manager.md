---
id: 11
title: "(번역) #10: React Query as a State Manager"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/10-react-query-as-a-state-manager"
tags: [react-query, 번역, 상태관리]
date: ""
---

> [TkDodo](https://github.com/tkdodo)의 [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)를 번역한 문서입니다.

React Query는 "데이터 불러오기 라이브러리"라기보다는 비동기 상태를 관리하는 도구입니다. 실제로 네트워크 요청을 직접 수행하지 않으며, `queryFn`에 전달된 Promise를 처리합니다. fetch, axios, ky 등의 HTTP 클라이언트와 함께 사용됩니다.

## 비동기 상태 관리자 (An Async State Manager)

React Query는 Promise 기반의 모든 비동기 작업을 관리할 수 있는 상태 관리자입니다. `QueryKey`가 쿼리를 고유하게 식별하므로, 동일한 키로 여러 곳에서 호출하면 같은 데이터를 받습니다.

```tsx
export const useTodos = () =>
  useQuery({ queryKey: ["todos"], queryFn: fetchTodos });

function ComponentOne() {
  const { data } = useTodos();
}

function ComponentTwo() {
  // ✅ ComponentOne과 정확히 동일한 데이터를 받을 것입니다.
  const { data } = useTodos();
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ComponentOne />
      <ComponentTwo />
    </QueryClientProvider>
  );
}
```

컴포넌트 트리의 어느 위치에서든 동일한 QueryClientProvider 하위에 있으면 같은 데이터를 공유합니다. 동시 요청은 중복 제거되어 네트워크 요청은 한 번만 발생합니다.

## 데이터 동기화 도구 (A data synchronization tool)

React Query는 서버 상태를 관리하므로, 프론트엔드는 데이터를 "소유"하지 않는다고 가정합니다. API에서 불러온 데이터는 특정 시점의 "스냅샷"일 뿐입니다.

**핵심 질문**: 데이터를 불러온 후에도 그 데이터가 정확한가?

답변은 도메인에 따라 다릅니다:
- 트위터 게시물(좋아요, 댓글 포함): 빠르게 오래된 데이터가 됨
- 환율 정보(일일 주기 업데이트): 오래 유지되는 정확한 데이터

React Query는 화면을 백엔드 데이터 소유자와 동기화하여 업데이트 빈도를 지능적으로 제어합니다.

## React Query 등장 이전 (Before React Query)

### 방법 1: 전역 상태 관리 (Redux)

- 애플리케이션 시작 시 한 번만 데이터 로드
- 전역 상태에 저장하여 모든 컴포넌트가 접근 가능
- 수동 업데이트에 의존 (또는 전체 페이지 새로고침)
- 문제: 불충분한 캐시 업데이트 빈도

### 방법 2: 로컬 상태 관리

```tsx
useEffect(() => {
  setLoading(true);
  fetchData();
}, []);
```

- 컴포넌트 마운트 시마다 데이터 로드
- 모달 같은 곳에서만 필요한 데이터를 로컬 상태로 관리
- 문제: 재마운트마다 로딩 스피너가 표시됨

## 오래된 데이터를 사용하면서 다시 불러오기 (Stale While Revalidate)

React Query의 캐싱 메커니즘은 RFC 5861 표준을 따릅니다. 핵심 원칙:

**오래된 데이터 > 데이터 없음**

로딩 스피너는 "느리다"는 인식을 주므로, 캐시된 데이터를 즉시 반환하고 백그라운드에서 새 데이터를 가져옵니다.

## 데이터를 똑똑하게 다시 불러오기 (Smart refetches)

React Query는 다음 시점에서 자동으로 데이터를 다시 불러옵니다:

| 옵션 | 설명 |
|------|------|
| `refetchOnMount` | 새 컴포넌트 마운트 시 |
| `refetchOnWindowFocus` | 브라우저 탭 포커스 시 (실제 사용 환경에서 효과적) |
| `refetchOnReconnect` | 네트워크 재연결 시 |
| `queryClient.invalidateQueries()` | 수동 무효화 (뮤테이션 후) |

## React Query가 마법을 부리게 하기 (Letting React Query do its magic)

**문제 상황**:

```tsx
function ComponentOne() {
  const { data } = useTodos();

  if (data) {
    // ⚠️ 데이터가 존재할 경우에만 조건적으로 마운트
    return <ComponentTwo />;
  }
  return <Loading />;
}

function ComponentTwo() {
  // ⚠️ 이어서 2번째 네트워크 요청이 이루어질 것입니다.
  const { data } = useTodos();
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ComponentOne />
    </QueryClientProvider>
  );
}
```

**원인**: `staleTime` 기본값이 0이므로 componentOne이 마운트될 때 데이터를 가져오고, componentTwo가 마운트될 때 다시 가져옵니다.

> "도대체 무슨 일이 일어난거야? 2초 전에 데이터를 불러왔는데 왜 네트워크 요청이 또 발생하는거지?"
> — React Query 초보자의 정상적인 반응

## staleTime을 커스터마이징하기 (Customize staleTime)

**해결책**: `staleTime`을 조정하여 데이터 신선도 기간을 설정합니다.

**핵심 원칙**:
**데이터가 신선한 동안은 항상 캐시에서 반환됩니다. 신선한 데이터는 네트워크 요청을 유발하지 않습니다.**

```tsx
// 기본 staleTime 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ 전역적으로 20초로 설정
      staleTime: 1000 * 20,
    },
  },
});

// 🚀 할 일과 관련된 모든 것은 1분의 staleTime을 가질 것입니다.
queryClient.setQueryDefaults(todoKeys.all, {
  staleTime: 1000 * 60,
});
```

`staleTime`에 대한 "올바른" 값은 없습니다. 도메인과 요구사항에 따라 결정되며, 최소 20초 설정을 권장합니다.

## 보너스: setQueryDefaults 사용하기 (Bonus: using setQueryDefaults)

v3부터 React Query는 쿼리 키별로 기본값을 설정할 수 있습니다:

```tsx
queryClient.setQueryDefaults(todoKeys.all, {
  staleTime: 1000 * 60,
});
```

Query Filters를 따르므로 원하는 정밀도로 기본값을 설정 가능합니다.

## 관심사의 분리에 대한 주의사항 (A note on separation of concerns)

**전통적 패턴**: Container/Presentational 컴포넌트
- 장점: 명확한 분리, 재사용성, 테스트 용이
- 단점: Props 드릴링, 보일러플레이트, 고차 컴포넌트의 복잡성

**훅 시대의 패턴**: `useQuery`, `useContext` 등을 어디서나 사용
- 장점: Props 드릴링 제거, 독립적인 컴포넌트
- 우려사항: 컴포넌트 결합도 증가?

**트레이드오프 인식**: 모든 것은 상황에 따라 다릅니다.
- Button 컴포넌트가 데이터를 불러와야 하나? 아니오.
- Dashboard를 Container/View로 나누어야 하나? 아니오.
- Props 전달 vs `useQuery` 사용? 상황과 팀의 선택에 따라 결정

마크 에릭슨의 "[Hooks, HOCs, and Tradeoffs](https://www.youtube.com/watch?v=xiKMbmDv-Vw)"를 권장합니다.

## 결론 (Takeaways)

1. React Query는 전역 비동기 상태 관리자로서 최고 성능을 발휘합니다.
2. Refetch 플래그를 필요한 경우에만 비활성화하세요.
3. 서버 데이터를 다른 상태 관리자와 중복 동기화하지 마세요.
4. `staleTime` 조정만으로도 우수한 사용자 경험과 효율적인 백그라운드 업데이트를 달성할 수 있습니다.
