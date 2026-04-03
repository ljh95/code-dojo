---
id: 17
title: "React Router loader + React Query - ensureQueryData 패턴"
tags: ["react-query", "react-router", "loader", "캐싱"]
difficulty: "medium"
sourceDoc: [17]
---

## 질문

아래는 React Router의 loader에서 React Query를 활용하는 코드이다. 이 패턴의 **동작 방식과 설계 의도**를 파악하고, 다음 질문에 답해보자.

```jsx
// contacts.jsx
const contactDetailQuery = (id) => ({
  queryKey: ["contacts", "detail", id],
  queryFn: async () => getContact(id),
});

export const loader =
  (queryClient) =>
  async ({ params }) => {
    const query = contactDetailQuery(params.contactId);
    return (
      queryClient.getQueryData(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    );
  };

export default function Contact() {
  const params = useParams();
  const { data: contact } = useQuery(contactDetailQuery(params.contactId));
}
```

1. `getQueryData ?? fetchQuery` 패턴 대신 `queryClient.ensureQueryData`를 사용하면 어떤 점이 같고, 왜 이 패턴이 등장했는가?
2. loader에서 `prefetchQuery` 대신 `fetchQuery`를 사용하는 이유는 무엇인가?
3. React Router는 **언제(when)**, React Query는 **무엇(what)**을 담당한다고 할 때, 이 통합 패턴에서 각각의 역할은 무엇인가?

**힌트:** loader는 캐시에 데이터가 없을 때만 fetch하고, 컴포넌트에서는 여전히 useQuery를 사용한다는 점에 주목하자.

---answer---

## 정답: loader + ensureQueryData 통합 패턴

### 핵심 아이디어

React Router의 loader가 **라우트 진입 시점에 데이터를 미리 요청**하고, React Query가 **캐싱과 백그라운드 refetch**를 담당한다. 둘은 경쟁이 아니라 보완 관계이다.

### 단계별 해설

**1. `getQueryData ?? fetchQuery` === `ensureQueryData`**

v4.18.0부터 `queryClient.ensureQueryData`가 내장되었다. 내부 구현이 말 그대로 `getQueryData ?? fetchQuery`이다.

```jsx
// 동일한 동작
export const loader =
  (queryClient) =>
  async ({ params }) => {
    return queryClient.ensureQueryData(contactDetailQuery(params.contactId));
  };
```

캐시에 데이터가 있으면 즉시 반환하고, 없으면 fetch한다. 이미 방문한 페이지를 다시 방문할 때 **네트워크 요청 없이 즉시 데이터를 표시**할 수 있다.

**2. `fetchQuery` vs `prefetchQuery`**

```jsx
// fetchQuery: 데이터를 반환하고, 에러를 throw한다
await queryClient.fetchQuery(query);

// prefetchQuery: 아무것도 반환하지 않고, 에러를 내부적으로 catch한다
await queryClient.prefetchQuery(query);
```

loader에서는 **에러가 발생하면 React Router의 errorElement로 전파**되어야 하므로 `fetchQuery`가 적합하다. `prefetchQuery`는 에러를 삼켜버린다.

**3. 역할 분리**

| 역할 | React Router | React Query |
|------|-------------|-------------|
| 관심사 | **언제** 데이터를 fetch할지 | **무엇**을 캐싱하고 최신 상태로 유지할지 |
| 강점 | 라우트 진입 시점에 미리 fetch | stale-while-revalidate, 백그라운드 refetch |
| 한계 | 캐시 없음 (매번 재요청) | 컴포넌트 마운트까지 fetch 시작을 기다림 |

### 깊은 이유 설명

loader만 사용하면 이미 방문한 페이지로 돌아갈 때도 매번 서버에 요청한다. React Query만 사용하면 컴포넌트가 마운트될 때까지 fetch를 시작하지 못해 로딩 스피너가 보인다. **둘을 결합하면 "가능한 한 빨리 fetch + 캐시된 데이터 즉시 표시 + 백그라운드 갱신"**이라는 최적의 사용자 경험을 달성할 수 있다.
