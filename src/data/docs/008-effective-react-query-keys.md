---
id: 8
title: "(번역) #8: Effective React Query Keys"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/8-effective-react-query-keys"
tags: [react-query, 번역, 쿼리키]
date: ""
---

> **📌 핵심 요약**
> - 쿼리 키는 일반→구체 순으로 구조화하고, 쿼리 키 팩토리 패턴으로 관리하면 무효화와 캐시 조작이 유연해진다
> - 키워드: 쿼리 키 구조, 쿼리 키 팩토리, invalidateQueries, 선언형 쿼리, 공간 배치
> - 이런 상황에서 다시 읽으면 좋다: 쿼리 키 설계가 복잡해지거나 mutation 후 캐시 무효화 전략을 고민할 때

---

> [TkDodo](https://github.com/tkdodo)의 [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)를 번역한 문서입니다.

[쿼리 키](https://react-query.tanstack.com/guides/query-keys)는 React Query에서 매우 중요한 핵심 개념입니다. React Query는 이를 통해 데이터를 먼저 캐시하고 쿼리의 의존성에 변화가 생기면 데이터를 다시 불러오기 때문에 쿼리 키는 꼭 필요합니다. 마지막으로, 필요에 따라 쿼리 캐시와 상호작용 할 수 있습니다. 예를 들어, mutation 이후에 데이터를 업데이트하거나 특정 쿼리를 수동으로 무효화 할 수 있습니다.

이 세가지 포인트가 어떤 의미를 갖고 있는지 빠르게 알아보겠습니다. 그리고나서 이 일을 효율적으로 진행하기 위해 제가 개인적으로 쿼리 키를 구성하는 방법을 보여드릴게요.

## 데이터 캐싱 (Caching Data)

내부적으로 쿼리 캐시는 key는 직렬화된 쿼리 키이고 value는 쿼리 데이터와 메타 정보로 이루어진 자바스크립트 객체입니다. 키는 [결정론적인 방식](https://react-query.tanstack.com/guides/query-keys#query-keys-are-hashed-deterministically)으로 해싱되어 있어서 객체를 사용할 수 있습니다. (최상위 레벨에서 키는 문자열 또는 배열이어야 합니다.)

가장 중요한 점은 쿼리에서 키를 사용하려면 키는 유니크해야 합니다. React Query는 캐시에서 키를 찾으면 그 데이터를 사용할 것입니다. 또한 `useQuery`와 `useInfiniteQuery`는 같은 쿼리 키를 사용할 수 없다는 점도 명심해주세요. 이 두 개의 훅에서 같은 쿼리 키를 사용한다는 것은 즉, 쿼리 캐시는 하나만 존재하고 두 개의 훅에서 데이터를 공유하는 것을 의미합니다. inifinite 쿼리는 "일반적인" 쿼리와는 근본적으로 다르기 때문에 이는 좋은 방법이 아닙니다.

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

// 🚨 동작하지 않을 것입니다
useInfiniteQuery({
  queryKey: ['todos'],
  queryFn: fetchInfiniteTodos,
});

// ✅ 대신 다른 키를 사용하세요
useInfiniteQuery({
  queryKey: ['infiniteTodos'],
  queryFn: fetchInfiniteTodos,
});
```

## 자동으로 데이터 다시 불러오기 (Automatic Refetching)

**쿼리는 선언형입니다.**

이는 여러번 강조해도 부족하지 않을 정도로 매우 중요한 개념이며 단순히 "클릭"만 하기에도 몇 시간이 걸릴 수 있습니다. 대부분의 사람들은 쿼리를, 특히 데이터를 다시 불러오는 경우, *명령형*의 방식으로 생각합니다.

여기 데이터를 불러오는 쿼리가 있습니다. 저는 버튼을 누르면 데이터를 다시 불러오도록 하고 싶어요. 이 때 매개변수는 다르게 할당하고 싶습니다. 이 경우 많은 사람들이 다음과 같이 접근하는 것을 봐왔습니다.

```tsx
function Component() {
  const { data, refetch } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // ❓ 데이터를 다시 불러오려면 매개변수를 어떻게 전달해야 할까요❓
  return (
    <Filters onApply={() => refetch(???)} />
  )
}
```

제 대답은 **"이렇게 하지 마세요"** 입니다.

이는 `refetch`의 목적이 아닙니다. - `refetch`의 목적은 *같은 매개변수로 데이터를 다시 불러오는 것*입니다.

만약 일부 상태가 데이터를 변경한다면, 해당 상태를 쿼리 키에 포함하세요. React Query는 키가 변경될 때마다 자동으로 데이터를 다시 불러올 것입니다. 따라서 데이터 필터링을 적용하고 싶다면 클라이언트 상태를 변경하세요.

```tsx
function Component() {
  const [filters, setFilters] = React.useState();
  const { data } = useQuery({
    queryKey: ['todos', filters],
    queryFn: () => fetchTodos(filters),
  });

  // ✅ 로컬 상태를 설정하고 상태를 통해 쿼리를 조작하세요
  return (
    <Filters onApply={setFilters} />
  );
}
```

`setFilters`가 업데이트하면서 발생하는 리렌더링으로 인해 React Query의 쿼리 키는 항상 변할 것이며 데이터를 다시 불러올 것입니다. 더 자세한 예시는 [#1: Practical React Query - 쿼리 키를 의존성 배열처럼 다루세요 (Treat the query key like a dependency array)](https://tkdodo.eu/blog/practical-react-query#treat-the-query-key-like-a-dependency-array)에서 다뤘습니다.

## 수동적인 상호 작용 (Manual Interaction)

쿼리 키가 가장 중요한 부분은 바로 쿼리 캐시와 수동적으로 상호작용하는 경우입니다. [invalidateQueries](https://react-query.tanstack.com/reference/QueryClient#queryclientinvalidatequeries) 또는 [setQueriesData](https://react-query.tanstack.com/reference/QueryClient#queryclientsetqueriesdata)와 같은 많은 수동적인 상호 작용 방법은 [쿼리 필터](https://react-query.tanstack.com/guides/filters#query-filters)를 지원합니다. 이를 통해 쿼리 키를 흐릿하게 매칭할 수 있습니다.

## 효율적인 React Query 키 (Effective React Query Keys)

지금부터 말씀드리는 포인트는 제 개인적인 견해를 반영하고 있습니다. 쿼리 키를 작업할 때 무조건 따라야 하는 것은 아니라는 점을 꼭 알아주세요. 저는 앱이 더 복잡해질 때 이러한 전략이 가장 잘 동작하고 확장성도 꽤 좋다는 것을 발견했습니다. 할 일 관리 앱 같은 규모에서는 꼭 이렇게 할 필요는 없습니다.

### 공간 배치 (Colocate)

만약 [Kent C. Dodds](https://twitter.com/kentcdodds)의 [공간 배치를 통한 유지 관리성](https://kentcdodds.com/blog/colocation)을 읽지 않았다면 읽어보세요. 저는 모든 쿼리 키를 `/src/utils/queryKeys.ts`와 같은 전역 공간에 두는 것이 좋은 방법이라고 생각하지 않습니다. 저는 쿼리 키를 해당하는 쿼리 근처에 두며, 같은 기능 단위의 디렉토리에 공동으로 배치합니다. 예를 들면 다음과 같습니다.

```
- src
  - features
    - Profile
      - index.tsx
      - queries.ts
    - Todos
      - index.tsx
      - queries.ts
```

*queries* 파일에는 React Query와 관련된 모든 내용이 들어갑니다. 일반적으로 저는 커스텀 훅만 export 하므로 실제 쿼리 함수와 쿼리 키는 로컬 영역에만 남아있습니다.

### 항상 배열로 이루어진 키를 사용하세요 (Always use Array Keys)

맞습니다. 쿼리 키는 문자열도 될 수 있지만, 저는 일관성을 유지하기 위해 배열로 사용하는 것을 선호합니다. 사실 어차피 React Query가 내부적으로 배열로 변환할 것입니다.

```tsx
// 🚨 어쨌든 ['todos'] 로 변환될 것입니다
useQuery({ queryKey: 'todos' });
// ✅
useQuery({ queryKey: ['todos'] });
```

**업데이트:** React Query v4부터 모든 키는 배열이어야만 합니다.

### 구조 (Structure)

쿼리 키를 *가장 일반적인 것*부터 *가장 구체적인 것*까지 구성하세요. 그 사이에 필요한 만큼의 세분화된 수준을 추가하세요. 여기에서는 필터 가능한 목록과 상세보기 화면을 보여줄 수 있도록 할 일 목록을 어떻게 구성하는지 보여드리겠습니다.

```tsx
['todos', 'list', { filters: 'all' }]
['todos', 'list', { filters: 'done' }]
['todos', 'detail', 1]
['todos', 'detail', 2]
```

이 구조를 사용하면 `['todos']`로 모든 할 일 관련 항목을 무효화할 수 있습니다. 모든 목록 또는 모든 상세 정보뿐만 아니라 정확한 키를 알고 있다면 특정 목록을 대상으로 할 수도 있습니다. 이를 통해 필요한 경우 모든 목록을 대상으로 할 수 있기 때문에 [Mutation 응답에서의 업데이트](https://react-query.tanstack.com/guides/updates-from-mutation-responses)는 더욱 유연해집니다.

```tsx
function useUpdateTitle() {
  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      // ✅ 할 일 상세정보를 업데이트
      queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo);

      // ✅ 해당 할 일을 포함하고 있는 모든 목록을 업데이트
      queryClient.setQueriesData(['todos', 'list'], (previous) =>
        previous.map((todo) => (todo.id === newTodo.id ? newtodo : todo)),
      );
    },
  });
}
```

이 방식은 목록과 상세 정보의 구조가 매우 다르다면 제대로 동작하지 않을 수 있습니다. 물론 이럴 경우 대안으로 모든 목록을 무효화하는 방법을 사용할 수도 있습니다.

```tsx
function useUpdateTitle() {
  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo);

      // ✅ 모든 목록을 무효화
      queryClient.invalidateQueries({
        queryKey: ['todos', 'list'],
      });
    },
  });
}
```

현재 어떤 목록을 보고있는지, 예를 들어 url에서 필터를 읽어낼 수 있다면, 더 정확한 쿼리 키를 구성할 수 있으므로, 이 두 가지 방법을 결합하여 목록에 대해 `setQueryData`를 호출하고 다른 모든 목록을 무효화할 수도 있습니다.

```tsx
function useUpdateTitle() {
  // url에서 현재 필터를 추출하여 반환하는 가상의 커스텀 훅
  const { filters } = useFilterParams();

  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo);

      // ✅ 현재 보고있는 목록을 업데이트
      queryClient.setQueryData(['todos', 'list', { filters }], (previous) =>
        previous.map((todo) => (todo.id === newTodo.id ? newtodo : todo)),
      );

      // 🥳 모든 목록을 무효화하지만,
      // 활성화 되어있는 항목은 다시 불러오지 않습니다
      queryClient.invalidateQueries({
        queryKey: ['todos', 'list'],
        refetchType: 'none',
      });
    },
  });
}
```

**업데이트:** v4에서, `refetchActive`는 `refetchType`으로 대체되었습니다. 위의 예시에서는 아무것도 다시 불러오지 않을 것이기 때문에 `refetchType: 'none'`이 될 것입니다.

### 쿼리 키 팩토리를 사용하세요 (Use Query Key factories)

위에 예시에서는 많은 수의 쿼리 키를 수동으로 선언한 것을 볼 수 있습니다. 이것은 오류가 발생하기 쉬울 뿐더러 추후 변경하기 어렵게 만듭니다. 예를 들어, 키에 더 세분화된 수준을 추가하려고 하는 경우 등이 있습니다.

그래서 제가 각각의 기능 별로 하나의 쿼리 키 팩토리를 구성하는 것을 추천하는 것입니다. 이는 각각의 엔트리와 쿼리 키를 생성할 함수가 있는 간단한 객체입니다. 또한 커스텀 훅에서 사용할 수 있습니다. 위의 예시 구조를 기반으로하면 다음과 같이 구성할 수 있을 것입니다.

```tsx
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

이렇게 하면 각각의 레벨이 다른 레벨보다 상위에서 빌드되지만, 여전히 독립적으로 접근할 수 있기 때문에 더 많은 유연성을 제공합니다.

```tsx
function useTodos(filters: string) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => fetchTodos(filters),
  });
}

function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
  });
}

function useUpdateTitle() {
  return useMutation({
    mutationFn: updateTitle,
    onSuccess: (newTodo) => {
      queryClient.setQueryData(todoKeys.detail(newTodo.id), newTodo);
      queryClient.invalidateQueries({
        queryKey: todoKeys.lists(),
      });
    },
  });
}
```
