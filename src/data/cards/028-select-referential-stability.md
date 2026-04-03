---
id: 28
title: "select 옵션 최적화 - 참조 안정성과 메모이제이션"
tags: ["react-query", "select", "최적화", "메모이제이션"]
difficulty: "medium"
sourceDoc: [31]
---

## 질문

아래 코드에서 `expensiveSuperTransformation`은 비용이 큰 연산이다. `ProductList` 컴포넌트가 화면에 3번 렌더링된다고 할 때, 질문에 답하라.

```tsx
const ProductList = () => {
  const [minRating, setMinRating] = useState(3);

  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    select: (products) => {
      return expensiveSuperTransformation(products, minRating);
    },
  });

  return <div>{/* ... */}</div>;
};
```

1. `select` 함수는 몇 번 실행되는가? 그 이유는?
2. `select` 함수가 불필요하게 재실행되는 두 가지 조건은 무엇인가?
3. `minRating`이 변경되지 않을 때 `select`의 재실행을 방지하려면 어떻게 해야 하는가?

**힌트:** React Query는 `select` 함수의 **참조 동일성(referential identity)**을 추적한다.

---answer---

## 정답: useCallback 또는 외부 함수로 select의 참조를 안정화해야 한다

### 핵심 아이디어

`select`는 **QueryObserver마다** 한 번씩 실행되며, 인라인 함수는 매 렌더링마다 새 참조를 생성하므로 불필요한 재실행이 발생한다. 참조를 안정화하면 **데이터가 실제로 변경될 때만** 실행되도록 최적화할 수 있다.

### 단계별 코드 해설

**1. 실행 횟수: 컴포넌트 인스턴스마다 한 번씩 (3번)**

`useQuery`를 호출할 때마다 새 `QueryObserver`가 생성되고, 각 옵저버마다 `select`가 최소 한 번 실행된다. 3개의 `ProductList` → 3번 실행.

**2. select가 재실행되는 두 가지 조건**

- **데이터가 변경될 때**: 새로운 데이터가 fetch되면 변환 함수를 다시 실행해야 한다 (필수)
- **select 함수 자체의 참조가 변경될 때**: 인라인 함수는 매 렌더마다 새 참조 → 불필요한 재실행 발생

**3. useCallback으로 참조 안정화**

```tsx
const ProductList = () => {
  const [minRating, setMinRating] = useState(3);

  // minRating이 변경되지 않는 한 동일한 참조 유지
  const selectTopRated = useCallback(
    (products: Product[]) => {
      return expensiveSuperTransformation(products, minRating);
    },
    [minRating]
  );

  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    select: selectTopRated,
  });

  return <div>{/* ... */}</div>;
};
```

의존성이 전혀 없다면 함수를 **컴포넌트 외부로** 이동시키는 것이 가장 간단하다:

```tsx
// 컴포넌트 외부 — 항상 동일한 참조
const selectTopRated = (products: Product[]) =>
  expensiveSuperTransformation(products);

// 컴포넌트 내부
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  select: selectTopRated,
});
```

### 깊은 이유 설명

같은 `useQuery`가 여러 컴포넌트에서 호출되면 `select`도 여러 번 실행된다. 이때 `fast-memoize` 같은 라이브러리로 **변환 함수 자체를 메모이제이션**하면, `select`는 옵저버마다 호출되지만 내부의 비싼 연산은 동일한 입력에 대해 **한 번만** 실행된다. 이것이 달성 가능한 최상의 최적화이다.
