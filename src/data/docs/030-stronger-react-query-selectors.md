---
id: 31
title: "(번역) 더 강력해진 React Query 셀렉터"
author: "TkDodo (번역: willy4202)"
source: "https://velog.io/@willy4202/%EB%8D%94-%EA%B0%95%EB%A0%A5%ED%95%B4%EC%A7%84-React-Query-%EC%85%80%EB%A0%89%ED%84%B0"
tags: [react-query, 번역, 셀렉터, 최적화]
date: ""
---

> **📌 핵심 요약**
> - select 옵션으로 컴포넌트가 구독하는 데이터 범위를 좁혀 불필요한 리렌더링을 줄이고, 비용이 큰 변환은 메모이제이션으로 최적화하라
> - 키워드: select, 구독최적화, 구조적공유, 메모이제이션, QueryObserver
> - 이런 상황에서 다시 읽으면 좋다: useQuery 결과로 인한 불필요한 리렌더링을 최적화하고 싶을 때

---

이 글은 [tkdodo의 블로그 30번째 글](https://tkdodo.eu/blog/react-query-selectors-supercharged)을 번역했습니다.

---

## 개요

`select`는 React Query의 특히 유용한 기능입니다. "가능하면 쓸 일이 없길 바라지만, 막상 필요할 땐 그 어떤 도구보다 효과적"할 수 있습니다.

> select는 소규모 앱에서 React Query를 처음 시작할 때는 거의 필요 없는 최적화

---

## 글로벌 상태와 구독

React Query는 `QueryCache`라는 하나의 전역 상태로 구성되어 있으며, 모든 Query 정보가 저장됩니다.

Query 변화 발생 시, 모든 `QueryObserver`(useQuery로 생성되는 것들)에게 알려야 합니다.

이상적으로는 모든 컴포넌트가 모든 것에 구독하는 상황을 피해야 합니다. 예를 들어:
- todos Query 변화 → profile Query만 필요한 컴포넌트가 리렌더링될 이유 없음
- 구독을 제어하고 세밀하게 조정하는 것이 상태 관리 도구의 존재 이유

---

## QueryHash

`useQuery`는 전체 `QueryCache`를 구독하지 않습니다.

전달된 `QueryKey`는 결정론적으로 `QueryHash`로 변환되며, useQuery는 해당 Query 변화 시에만 알림을 받습니다.

본질적으로 관심 있는 Query로 미리 필터링하는 것과 같으며, 대부분의 경우 이것만으로 충분합니다.

---

## 세밀한 구독(Fine-grained Subscriptions)

엔드포인트가 많은 데이터를 반환하지만, 모든 데이터에 관심이 있는 것은 아닐 수 있습니다.

자주 변경되는 필드와 거의 변경되지 않는 필드가 함께 있을 때, 더 세밀한 수준의 구독이 필요할 수 있습니다.

이때 사용할 수 있는 것이 **select**입니다.

---

## select란 무엇인가?

`select`는 `useQuery`에 전달할 수 있는 옵션으로, 컴포넌트가 구독할 데이터를 선택(pick), 변환(transform), 또는 계산(compute)하는 데 사용됩니다.

Redux에서 **셀렉터(selector)**를 사용해 파생 상태를 얻는 방식과 유사합니다.

셀렉터는 "어떤 데이터에 접근하고 싶은지 가장 명확하게 표현하는 방법"입니다.

### 예제: 상품 데이터

API에서 상품 데이터를 가져오는 경우:

```typescript
// 전체 상품 데이터 조회
const { data: product } = useQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id)
});
```

상품 제목만 렌더링하고 싶은 경우:

```typescript
// select 미사용 - 전체 데이터에 구독
const ProductTitle = ({ id }) => {
  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id)
  });
  return <h1>{product?.title}</h1>;
};
```

문제: 엔드포인트가 구매 수, 댓글 수 등 제목보다 자주 변하는 정보도 반환하면, 관련 없는 변경으로 인해 컴포넌트가 리렌더링될 수 있습니다.

### select를 사용한 최적화

```typescript
// select 사용 - 제목에만 구독
const ProductTitle = ({ id }) => {
  const { data: title } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    select: (product) => product.title
  });
  return <h1>{title}</h1>;
};
```

select를 사용하는 컴포넌트는 select 함수의 반환 값에만 구독됩니다. 제목이 자주 변하지 않으면 다른 상품 데이터 속성 변경으로 인한 리렌더링이 거의 발생하지 않습니다.

### 여러 속성 선택

```typescript
// 여러 속성 선택
const { data } = useQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id),
  select: (product) => ({
    title: product.title,
    description: product.description
  })
});
```

**구조적 공유(structural sharing)**를 적용하므로 참조 안정성을 걱정할 필요가 없습니다. 제목이나 설명 중 하나라도 변경되면 리렌더링이 발생하고, 그렇지 않으면 발생하지 않습니다.

---

## select 추상화의 타입 지정

모든 코드는 유효한 TypeScript 코드입니다. 단순히 유효할 뿐 아니라 타입 안전하고 타입 추론이 적용됩니다.

`useQuery`에서 반환되는 객체의 data 필드는 select가 반환하는 타입으로 지정됩니다.

**중요:** 타입 추론에 맡길 때만 작동합니다. `useQuery`에 제네릭 타입 파라미터를 직접 지정하면 안 됩니다.

### 재사용 가능한 추상화

**권장사항:** Query Options API를 사용하여 공유 옵션을 추상화하면서도 사용하는 곳에서 직접 추가 옵션을 지정할 수 있습니다.

select를 선택적으로 만들고 싶은 경우:

```typescript
type ProductData = {
  id: string;
  title: string;
  description: string;
  // ... 기타 필드
};

const productOptions = <TData = ProductData>(
  id: string,
  select?: (data: ProductData) => TData
) => ({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id),
  select
});
```

핵심:
- `TData`라는 타입 매개변수를 추가하고 기본값을 `ProductData`로 설정
- select를 `ProductData → TData` 함수 타입으로 정의
- select 미제공 시 → data 타입은 `ProductData`
- select 제공 시 → data 타입은 함수의 반환 타입

---

## 메모이제이션(Memoization)으로 select 강화하기

select에서 실행되는 함수가 비용이 큰 작업인 경우를 고려합니다.

예: 큰 상품 목록 순회, 수천 개 리뷰 기반 평균 평점 계산, 데이터 필터링 및 정렬

```typescript
// expensiveSuperTransformation이라 부르는 함수
const { data: topRatedProducts } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  select: (products) => {
    return expensiveSuperTransformation(products);
  }
});
```

**문제:** `expensiveSuperTransformation`이 매 렌더링마다 실행됩니다.

### React Query가 select를 다시 실행하는 경우

1. **데이터가 변경될 때** - 새로운 데이터 수신 시 변환 함수 재실행
2. **select 함수 자체가 변경될 때** - 참조 동일성을 추적하므로 인라인 함수는 매 렌더마다 새로 생성되어 최적화 미적용

인라인 함수는 추가 props를 클로저로 캡처할 수 있어 오래된 결과를 걱정하지 않아도 됩니다:

```typescript
const [minRating, setMinRating] = useState(3);

const { data: topRatedProducts } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  select: (products) => {
    // minRating이 현재 값으로 캡처됨
    return products
      .filter(p => p.rating >= minRating)
      .sort((a, b) => b.rating - a.rating);
  }
});
```

---

## select 안정화하기(Stabilizing select)

핵심은 select에 안정적인 참조를 전달하는 것입니다.

### useCallback 사용

```typescript
const [minRating, setMinRating] = useState(3);

const selectTopRated = useCallback(
  (products) => {
    return products
      .filter(p => p.rating >= minRating)
      .sort((a, b) => b.rating - a.rating);
  },
  [minRating]
);

const { data: topRatedProducts } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  select: selectTopRated
});
```

minRating이 변경되지 않는 한 select에는 안정적인 참조가 전달됩니다.

### 컴포넌트 외부로 함수 이동

의존성이 없다면:

```typescript
// 컴포넌트 외부
const selectTopRated = (products) => {
  return products
    .filter(p => p.rating >= 3)
    .sort((a, b) => b.rating - a.rating);
};

// 컴포넌트 내부
const { data: topRatedProducts } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  select: selectTopRated
});
```

---

## 최종 보스(The Final Boss)

같은 컴포넌트를 여러 번 렌더링하면 select는 얼마나 자주 실행될까요?

**정답:** 컴포넌트마다 한 번씩입니다.

정확히는 `QueryObserver`마다 한 번씩인데, select 결과가 거기에 캐시되기 때문입니다.

`useQuery`를 호출할 때마다 새로운 `QueryObserver`가 만들어지므로, 각 호출마다 최소 한 번은 select가 실행됩니다.

**문제:** 하나의 데이터에 대해 `expensiveSuperTransformation`이 여러 번 실행될 수 있습니다.

---

## 더 많은 메모이제이션(More Memoization)

목표: `expensiveSuperTransformation`을 입력값 기준으로 메모이제이션

React Query는 옵저버 단위로 결과를 캐시하므로, 별도의 메모이제이션이 필요합니다.

[fast-memoize](https://www.npmjs.com/package/fast-memoize) 같은 라이브러리 사용:

```typescript
import memoize from 'fast-memoize';

const memoizedTransformation = memoize(
  (products) => {
    return expensiveSuperTransformation(products);
  }
);

const { data: topRatedProducts } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetchProducts(),
  select: memoizedTransformation
});
```

### 동작 방식

`ProductList`를 세 번 렌더링하는 경우:

- select는 세 번 실행됨 (각 `QueryObserver`마다 한 번씩 — 필수)
- **하지만** `expensiveSuperTransformation`은 한 번만 실행됨 (동일한 data로 실행되므로 `fast-memoize`의 캐시를 두 번 맞고 지나감)

데이터 변경 시:
- select는 세 번 실행됨
- `expensiveSuperTransformation`은 새로운 data에 대해 한 번만 실행됨

**결론:** 이것이 달성할 수 있는 최상의 최적화입니다.
