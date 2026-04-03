---
id: 4
title: "select 옵션 데이터 변환 - 부분 구독과 최적화"
tags: ["react-query", "select", "데이터변환", "렌더링최적화"]
difficulty: "medium"
sourceDoc: [2, 3]
---

## 질문

아래 3가지 데이터 변환 방식의 차이점을 분석하시오.

```tsx
// 방식 A: queryFn에서 변환
const fetchTodos = async (): Promise<string[]> => {
  const response = await axios.get('todos');
  return response.data.map((todo) => todo.name.toUpperCase());
};
export const useTodosQuery = () =>
  useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

// 방식 B: 렌더링 함수에서 변환
export const useTodosQuery = () => {
  const queryInfo = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });
  return {
    ...queryInfo,
    data: queryInfo.data?.map((todo) => todo.name.toUpperCase()),
  };
};

// 방식 C: select 옵션 사용
export const useTodosQuery = () =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select: (data) => data.map((todo) => todo.name.toUpperCase()),
  });
```

1. 방식 A는 DevTools에서 어떤 데이터를 보여주는가? 원본인가, 변환된 데이터인가?
2. 방식 B에서 `...queryInfo`로 스프레드하는 것이 v4 이후로 권장되지 않는 이유는?
3. 방식 C의 `select`를 활용하여, **todo의 개수만 구독**하는 훅을 작성하시오. 이 훅을 사용하는 컴포넌트가 todo 이름이 바뀔 때 리렌더링되지 않는 이유를 설명하시오.

**힌트:** `select`는 `data`가 존재할 때만 호출되며, 반환값의 **참조적 동일성**이 유지되면 리렌더링하지 않는다.

---answer---

## 정답: select 옵션으로 부분 구독 구현

### 핵심 아이디어

`select` 옵션은 캐시된 원본 데이터를 유지하면서 **옵저버별로 다른 형태의 데이터를 구독**할 수 있게 해준다. 이는 불필요한 리렌더링을 방지하는 가장 강력한 방법이다.

### 각 질문 해설

**Q1**: 방식 A는 DevTools에서 **변환된 데이터**(대문자)를 보여준다. `queryFn`에서 변환한 결과가 캐시에 저장되기 때문이다. 반면 네트워크 탭에서는 원본(소문자)이 보인다. 이 불일치가 디버깅을 혼란스럽게 만들 수 있다.

**Q2**: v4부터 **Tracked Queries**가 기본 활성화되었다. `...queryInfo`로 스프레드하면 모든 프로퍼티에 대해 getter가 실행되어, 추적 기능이 모든 필드를 관찰하는 것으로 인식한다. 결과적으로 `isFetching` 등 불필요한 필드 변경에도 리렌더링이 발생한다.

**Q3: 부분 구독 코드**

```tsx
// 기본 쿼리 훅 — select를 외부에서 주입
export const useTodosQuery = (select?: (data: Todos) => unknown) =>
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
  });

// todo 개수만 구독하는 훅
export const useTodosCount = () =>
  useTodosQuery((data) => data.length);

// 특정 todo만 구독하는 훅
export const useTodo = (id: number) =>
  useTodosQuery((data) => data.find((todo) => todo.id === id));
```

### 깊은 이유 설명

`useTodosCount`가 todo 이름 변경 시 리렌더링되지 않는 이유:

1. 백그라운드 refetch로 새 데이터가 도착한다
2. React Query의 **구조적 공유(structural sharing)**가 이전/이후 데이터를 비교한다
3. `select`가 실행되어 `data.length`를 반환한다
4. 이전 `select` 결과(`3`)와 새 결과(`3`)가 동일하므로 **옵저버에게 알리지 않는다**

`select`를 인라인 함수로 전달하면 매 렌더링마다 함수 참조가 바뀌어 불필요한 재계산이 발생할 수 있다. 안정적인 함수 참조로 추출하거나 `useCallback`으로 감싸서 최적화할 수 있다.
