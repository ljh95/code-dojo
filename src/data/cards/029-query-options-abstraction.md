---
id: 29
title: "Query 추상화 - queryOptions로 설정 공유하기"
tags: ["react-query", "추상화", "queryOptions", "TypeScript"]
difficulty: "medium"
sourceDoc: [32]
---

## 질문

아래는 `useQuery` 위에 커스텀 훅으로 추상화를 만든 코드이다.

```tsx
import type { UseQueryOptions } from '@tanstack/react-query';

function useInvoice(
  id: number,
  options?: Partial<UseQueryOptions<Invoice>>
) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id),
    ...options,
  });
}

// 사용
const { data } = useInvoice(1, {
  select: (invoice) => invoice.createdAt, // 타입 에러!
});
```

1. `select` 옵션을 전달할 때 타입 에러가 발생하는 이유는 무엇인가?
2. 커스텀 훅 대신 `queryOptions` API를 사용하여 같은 추상화를 만들어라.
3. `queryOptions` 방식이 커스텀 훅보다 나은 이유 3가지를 설명하라.

**힌트:** `UseQueryOptions<Invoice>`는 4개의 제네릭 중 첫 번째만 지정한 것이다. `select`의 반환 타입은 몇 번째 제네릭인가?

---answer---

## 정답: `queryOptions` API로 설정을 공유하고 사용처에서 합성한다

### 핵심 아이디어

커스텀 훅으로 `useQuery`를 감싸면 **타입 추론이 깨지고**, 특정 구현에 묶이며, 훅 밖에서는 사용할 수 없다. `queryOptions`는 순수 설정 객체이므로 이 모든 문제를 해결한다.

### 단계별 코드 해설

**1. 타입 에러 원인**

`UseQueryOptions`는 4개의 제네릭 `<TQueryFnData, TError, TData, TQueryKey>`를 가진다. `UseQueryOptions<Invoice>`로 첫 번째만 지정하면 `TData`(select의 반환 타입)가 기본값 `unknown`이 된다. `select`가 `Invoice → string`을 반환하려 하지만, 타입 시스템은 `TData`가 `Invoice`라고 기대하므로 에러가 발생한다.

**2. queryOptions로 리팩토링**

```tsx
import { queryOptions } from '@tanstack/react-query';

// 설정만 정의 — 어디서든 사용 가능한 순수 함수
function invoiceOptions(id: number) {
  return queryOptions({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id),
  });
}

// 사용처에서 추가 옵션을 합성 — 완전한 타입 추론
const { data } = useQuery({
  ...invoiceOptions(1),
  select: (invoice) => invoice.createdAt,
});
// data: string | undefined  ← 정확한 타입!
```

**3. queryOptions가 커스텀 훅보다 나은 3가지 이유**

- **어디서든 사용 가능**: 서버 컴포넌트, 라우트 로더, 이벤트 핸들러 등 훅을 쓸 수 없는 곳에서도 동작한다. (커스텀 훅은 컴포넌트/훅 내부에서만 사용 가능)
- **구현에 비종속적**: `useQuery`, `useSuspenseQuery`, `useQueries` 등 어떤 훅과도 조합할 수 있다. 커스텀 훅은 특정 훅에 묶인다.
- **완전한 타입 추론**: 사용처에서 `select`, `throwOnError` 등을 스프레드로 합성하면 제네릭을 수동 지정할 필요 없이 타입이 정확히 추론된다.

### 깊은 이유 설명

`queryOptions` 함수는 런타임에서는 입력을 그대로 반환하는 **identity 함수**이다. 하지만 타입 수준에서는 제네릭 추론 체인을 올바르게 연결해준다. 핵심은 **공유할 것은 설정(configuration)이지 로직(logic)이 아니라는** 인식이다. 커스텀 훅은 로직 공유에 적합하고, 설정 공유에는 `queryOptions`가 적합하다.
