---
id: 22
title: "React Query 선언적 사고 - staleTime과 queryKey 의존성"
tags: ["react-query", "staleTime", "queryKey", "선언적 사고"]
difficulty: "medium"
sourceDoc: [22]
---

## 질문

아래는 이슈 목록을 필터링하는 컴포넌트다. 필터가 바뀔 때마다 데이터를 다시 불러오기 위해 `refetch`를 명령적으로 호출하고 있다.

```tsx
function IssueList() {
  const [filters, setFilters] = useState({ status: 'open' })
  const { data, refetch } = useQuery({
    queryKey: ['issues'],
    queryFn: () => fetchIssues(filters),
  })

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    refetch() // 필터 바뀔 때마다 수동 refetch
  }

  return <Table data={data} onFilterChange={handleFilterChange} />
}
```

1. 이 코드에서 **두 가지 문제점**은 무엇인가?
2. `refetch()`를 제거하면서도 필터 변경 시 자동으로 데이터를 다시 불러오려면 어떻게 해야 하는가?
3. 모든 `useQuery`에서 불필요한 refetch가 너무 자주 발생한다면, 어떤 설정을 조정해야 하는가?

**힌트:** `queryKey`를 `useEffect`의 의존성 배열처럼 생각해보자.

---answer---

## 정답: queryKey에 의존성 포함 + staleTime 조정

### 핵심 아이디어

React Query는 **비동기 상태 관리자**이지 데이터 패칭 라이브러리가 아니다. `queryKey`가 변하면 자동으로 새 데이터를 가져오므로, 명령적 `refetch()` 대신 **queryKey에 의존성을 선언**하는 것이 올바른 사고방식이다.

### 문제점 분석

```tsx
// 문제 1: queryKey에 filters가 빠져있다
queryKey: ['issues'] // filters가 바뀌어도 같은 캐시 엔트리를 사용

// 문제 2: 명령적 refetch
refetch() // stale closure 문제 발생 가능 — setFilters 직후에 호출하면 이전 filters로 fetch
```

### 수정된 코드

```tsx
function IssueList() {
  const [filters, setFilters] = useState({ status: 'open' })
  const { data } = useQuery({
    // queryFn이 의존하는 값은 반드시 queryKey에 포함
    queryKey: ['issues', filters],
    queryFn: () => fetchIssues(filters),
    staleTime: 2 * 60 * 1000, // 2분 — 불필요한 refetch 방지
  })

  // refetch() 호출 불필요 — filters가 바뀌면 queryKey가 바뀌고 자동으로 fetch
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  return <Table data={data} onFilterChange={handleFilterChange} />
}
```

### 깊은 이유 설명

**왜 queryKey에 의존성을 넣어야 하는가?**

- 각 필터 조합이 **별도의 캐시 엔트리**로 저장되어, 다른 필터로 전환했다가 돌아오면 캐시된 데이터를 즉시 보여줄 수 있다.
- `filters`가 `queryKey`에 없으면 Race Condition이 발생할 수 있다. 빠르게 필터를 두 번 바꿨을 때, 첫 번째 응답이 늦게 도착하면 잘못된 데이터가 표시된다.

**왜 staleTime이 중요한가?**

- `staleTime`의 기본값은 `0`이다. 즉, 모든 쿼리가 즉시 `stale` 상태가 되어 window focus, mount 시마다 refetch된다.
- `staleTime`을 적절히 설정하면 `fresh` 상태인 동안은 캐시 데이터만 반환하고 네트워크 요청을 하지 않는다.
- 정답은 없다. 실시간 협업 도구라면 `0`, 거의 변하지 않는 설정 데이터라면 `Infinity`가 적합하다.
