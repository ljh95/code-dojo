---
id: 25
title: "(번역) The Query Options API"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/the-query-options-api"
tags: [react-query, 번역, queryOptions, API]
date: ""
---

> [TkDodo](https://twitter.com/tkdodo)의 [The Query Options API](https://tkdodo.eu/blog/the-query-options-api)를 번역한 글입니다.

---

## 개요

약 3개월 전 React Query v5가 출시되면서 "라이브러리 역사상 가장 큰 breaking change"가 발생했습니다. 이제 모든 함수는 여러 인수가 아닌 단일 객체를 받으며, 이를 **Query Options**라 부릅니다.

### 변경 사항

```js
- useQuery(
-   ['todos'],
-   fetchTodos,
-   { staleTime: 5000 }
- )
+ useQuery({
+   queryKey: ['todos'],
+   queryFn: fetchTodos,
+   staleTime: 5000
+ })
```

쿼리 무효화도 동일하게 적용됩니다:

```js
- queryClient.invalidateQueries(['todos'])
+ queryClient.invalidateQueries({ queryKey: ['todos'] })
```

엄밀히 말해 완전히 새로운 API는 아닙니다. React Query의 함수들은 이미 오버로딩되어 있었으므로 v3에서도 객체 전달이 가능했습니다. 다만 널리 알려지지 않았을 뿐입니다.

---

## 변경 이유

### 더 나은 추상화

오버로딩의 존재는 유지보수자에게 번거롭고 사용자에게 명확하지 않습니다. API 간소화의 목표는 "항상 객체 하나만 전달"이라는 단순한 규칙입니다.

하나의 객체로 모든 것을 규정하는 추상화는 쿼리 옵션을 여러 함수 간에 공유할 때 특히 유용합니다.

**예시**:

```js
const todosQuery = {
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
}

// ✅ 됩니다
useQuery(todosQuery)

// 🤝 그럼요
queryClient.prefetchQuery(todosQuery)

// 🙌 오 예
useSuspenseQuery(todosQuery)

// 🎉 완전 되죠
useQueries([{
  queries: [todosQuery]
}])
```

이 패턴이 쿼리의 주요 추상화로 적합해 보였으나 한 가지 문제가 있었습니다.

---

### 타입스크립트 문제

타입스크립트는 인라인 객체의 초과 프로퍼티를 감지합니다:

```ts
// 에러 발생
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  stallTime: 5000,  // 오타 감지
})
```

그러나 객체를 상수로 추출하면:

```ts
// 에러 없음
const todosQuery = {
  queryKey: ['todos'],
  queryFn: fetchTodos,
  stallTime: 5000,
}

useQuery(todosQuery)
```

타입스크립트는 관대해집니다. 이는 발견하기 어려운 실수가 될 수 있습니다.

---

## queryOptions 헬퍼

v5에서 타입 안전한 `queryOptions` 헬퍼 함수를 도입했습니다:

```js
export function queryOptions(options) {
  return options
}
```

런타임에는 아무것도 하지 않지만, 타입 레벨에서 오타 문제를 해결하고 추가 기능을 제공합니다.

### DataTag

React Query의 `queryClient.getQueryData`는 타입 레벨에서 `unknown`을 반환했습니다:

```ts
// 수동 타입 지정 필요
const todos = queryClient.getQueryData<Array<Todo>>(['todos'])
//    ^? const todos: Todo[] | undefined
```

이는 타입 단언보다 안전하지 않습니다.

그러나 `queryOptions`를 사용하면:

```ts
const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
})

const todos = queryClient.getQueryData(todosQuery.queryKey)
//    ^? const todos: Todo[] | undefined
```

내부적으로 `queryKey`는 다음과 같이 태그됩니다:

```ts
(property) queryKey: string[] & {
  [dataTagSymbol]: Todo[];
}
```

이는 Mateusz Burzyński의 타입스크립트 마법으로, React Query에 새로운 수준의 타입 안전성을 제공합니다.

---

## 쿼리 팩토리

커스텀 훅이 단순히 `useQuery`를 래핑하는 것만 한다면 의미가 제한적입니다:

```ts
const useTodos = () => useQuery(todosQuery)
```

`queryKey`는 `queryFn`이 의존하는 것들을 정의하므로, 둘을 함께 두는 것이 합리적입니다.

"QueryFunction에서 QueryKey를 분리하는 건 실수였다"는 인사이트로, 두 패턴을 결합하면:

- 타입 안전성
- 같이 두기(co-location)
- 뛰어난 DX

를 모두 얻을 수 있습니다.

### Query Factory 예시

```ts
const todoQueries = {
  all: () => ['todos'],
  lists: () => [...todoQueries.all(), 'list'],
  list: (filters: string) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
    }),
  details: () => [...todoQueries.all(), 'detail'],
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5000,
    }),
}
```

이 패턴은 위계 구조 구축과 무효화용 키, 그리고 완전한 쿼리 객체를 모두 포함합니다.

> **Query Options + Query Key Factory = Query Factory**
