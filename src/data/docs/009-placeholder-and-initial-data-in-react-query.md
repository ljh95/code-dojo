---
id: 10
title: "(번역) #9: Placeholder and Initial Data in React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/9-placeholder-and-initial-data-in-react-query"
tags: [react-query, 번역, placeholder, initialData]
date: ""
---

> **📌 핵심 요약**
> - initialData는 캐시 레벨에 저장되는 "진짜 데이터"이고, placeholderData는 옵저버 레벨의 "임시 데이터"이므로 용도에 맞게 구분하여 사용해야 한다
> - 키워드: placeholderData, initialData, 캐시 레벨, 옵저버 레벨, staleTime
> - 이런 상황에서 다시 읽으면 좋다: 로딩 스피너 없이 즉시 데이터를 보여주고 싶을 때

---

> [TkDodo](https://github.com/tkdodo)의 [Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query)를 번역한 문서입니다.

이 글은 React Query 사용 시 사용자 경험 향상 방법을 다룹니다. 대부분의 경우 로딩 스피너는 피하고 싶은 요소입니다.

React Query는 여러 방식으로 로딩 상태를 줄일 수 있도록 지원합니다: 백그라운드 갱신 시 캐시된 데이터 활용, 데이터 미리 불러오기, 쿼리 키 변경 시 이전 데이터 유지 등이 있습니다.

또 다른 방법으로 캐시에 동기적으로 데이터를 미리 채우는 방식이 있습니다. React Query는 두 가지 비슷하지만 다른 옵션을 제공합니다: **Placeholder Data**와 **Initial Data**입니다.

## 공통점 (Similarities)

두 방법 모두 동기적으로 사용 가능한 데이터를 캐시에 미리 채웁니다. 둘 중 하나를 제공하면 쿼리는 `loading` 상태를 건너뛰고 `success` 상태로 진입합니다. 또한 둘 다 값이거나 함수 형태로 제공될 수 있습니다.

```tsx
function Component() {
  // ✅ 데이터를 불러오지 않았지만 status는 success가 될 것입니다
  const { data, status } = useQuery({
    queryKey: ['number'],
    queryFn: fetchNumber,
    placeholderData: 23,
  });

  // ✅ initialData도 마찬가지 입니다
  const { data, status } = useQuery({
    queryKey: ['number'],
    queryFn: fetchNumber,
    initialData: () => 42,
  });
}
```

마지막으로 캐시에 이미 데이터가 있으면 둘 다 효과가 없습니다.

### 캐시 레벨 (cache level)

각 쿼리 키마다 캐시 엔트리는 단 하나만 존재합니다. `staleTime`과 `gcTime` 같은 옵션은 이 캐시 엔트리 수준에서 작동하며, 데이터가 오래되거나 가비지 컬렉션되는 시점을 결정합니다.

### 옵저버 레벨 (On observer level)

React Query의 옵저버는 캐시 엔트리에 대한 구독입니다. `useQuery`를 호출할 때마다 옵저버가 생성되고, 데이터 변화 시 컴포넌트는 리렌더링됩니다. 하나의 캐시 엔트리를 여러 옵저버가 감시할 수 있습니다.

`select`와 `keepPreviousData` 같은 옵션은 옵저버 레벨에서 작동하므로, 동일한 캐시 엔트리를 감시하면서도 컴포넌트별로 다른 데이터 슬라이스를 구독할 수 있습니다.

## 차이점 (Differences)

`initialData`는 캐시 레벨에서 작동하고 `placeholderData`는 옵저버 레벨에서 작동합니다.

### 지속성 (Persistence)

`initialData`는 캐시에 지속적으로 남습니다. 이는 "이미 충분히 좋은 데이터를 갖고 있다"는 의미이며, 캐시 엔트리 생성 즉시 캐시에 입력됩니다. 캐시 레벨에서만 작동하므로 하나만 존재할 수 있습니다.

반면 `placeholderData`는 캐시에 "절대로" 지속되지 않습니다. 이는 "실제 데이터를 받을 때까지 임시로 보여주는" 용도입니다. 옵저버 레벨에서 작동하므로 컴포넌트별로 다른 `placeholderData`를 가질 수 있습니다.

### 백그라운드에서 데이터 다시 불러오기 (Background refetches)

`placeholderData` 사용 시 옵저버가 마운트될 때마다 항상 백그라운드 갱신이 일어납니다. "실제 데이터"가 아니기 때문입니다. `useQuery`는 `isPlaceholderData` 플래그를 반환하여 사용자에게 임시 데이터임을 시각적으로 알릴 수 있고, 실제 데이터 로드 후 `false`로 전환됩니다.

`initialData`는 유효한 데이터이므로 `staleTime`을 따릅니다. `staleTime`이 0(기본값)이면 백그라운드 갱신이 일어나고, 30초로 설정했다면 React Query는 "이미 신선한 데이터가 있으니 30초간은 백엔드에 갈 필요가 없다"고 판단합니다.

이를 제어하려면 `initialDataUpdatedAt`을 제공하세요. 이는 React Query에 데이터 생성 시점을 알려주어 백그라운드 갱신 여부를 결정하는 데 사용됩니다. 기존 캐시 엔트리에서 `dataUpdatedAt` 타임스탬프를 참조할 때 유용합니다.

```tsx
const useTodo = (id) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['todo', id],
    queryFn: () => fetchTodo(id),
    staleTime: 30 * 1000,
    initialData: () => queryClient.getQueryData(['todo', 'list'])?.find((todo) => todo.id === id),
    initialDataUpdatedAt: () =>
      // ✅ 목록 쿼리 데이터가 주어진 staleTime (30초) 보다 오래되면
      // 백그라운드에서 데이터를 다시 불러올 것입니다.
      queryClient.getQueryState(['todo', 'list'])?.dataUpdatedAt,
  });
};
```

### 에러 전환 (Error transitions)

백그라운드 갱신 실패 시:

- **initialData**: 캐시에 남아있으므로 일반 백그라운드 에러로 처리됩니다. 쿼리는 `error` 상태가 되지만 `data`는 유지됩니다.

- **placeholderData**: "실제 데이터"가 아니고 아직 도착하지 않았으므로 더 이상 표시되지 않습니다. 쿼리는 `error` 상태가 되고 `data`는 `undefined`가 됩니다.

## 언제 사용해야 하는지 (When to use what)

저자는 개인적으로 다른 쿼리에서 데이터를 미리 채울 때는 `initialData`를 선호하고, 그 외 경우에는 `placeholderData`를 사용합니다.
