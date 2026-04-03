---
id: 30
title: "(번역) Concurrent Optimistic Updates in React Query"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/concurrent-optimistic-updates-in-react-query"
tags: [react-query, 번역, 낙관적업데이트, 동시성]
date: ""
---

> **📌 핵심 요약**
> - 동시 낙관적 업데이트 시 불일치의 창(Window of Inconsistency)을 방지하려면 쿼리 취소와 isMutating 기반 무효화 제한을 조합하라
> - 키워드: 낙관적업데이트, 동시성, cancelQueries, isMutating, 불일치의창
> - 이런 상황에서 다시 읽으면 좋다: 낙관적 업데이트에서 UI 깜빡임이나 상태 불일치가 발생할 때

---

[TkDodo](https://bsky.app/profile/tkdodo.eu)의 [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)를 번역한 글입니다.

---

## 낙관적 업데이트란

[낙관적 업데이트](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)는 [앱을 실제보다 더 빠른 것처럼 만들기](https://www.youtube.com/watch?v=nxzVZ7FYdwE&t=651s) 좋은 기술 중 하나입니다. 하지만 이 기술은 todo-app 스타일의 데모에서나 쉽게 구현할 수 있는 것 중 하나이기도 하죠.

예를 들어, 입력란에서 `Enter`를 누르면 곧바로 할 일이 목록에 추가됩니다. 이론적으로는 멋지지만 실제로는 더 많은 난관이 여러분을 기다리고 있을 겁니다.

## 클라이언트에서 서버 로직 다시 만들기

이 주제는 이미 [#12: Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query#optimistic-updates)에서 조금 다뤘지만, 다시 한 번 반복할만큼 중요합니다. 낙관적 UI는 기본적으로 서버가 무엇을 할지 예측하고 그걸 클라이언트에 미리 구현하려고 시도하는 겁니다.

사용자가 토글 버튼을 클릭하는 것처럼 간단한 경우에는 꽤나 직관적입니다. 불리언의 현재 상태를 반전시키기만 하면 되죠.

```typescript
queryClient.setQueryData(['items', 'detail', item.id], (prevItem) =>
  prevItem
    ? {
        ...prevItem,
        isActive: !prevItem.isActive,
      }
    : undefined
)
```

작성할 코드가 많지 않고, UX에는 큰 효과가 있습니다. 요청이 끝날 때까지 기다려야 UI가 반응하는 것보다는 사용자가 버튼을 클릭하자마자 바로 변경사항이 반영되는 게 낫죠. 클릭하고 0.5초가 지나야 새로운 상태로 바뀌는 토글 버튼보다 나쁜 건 많지 않습니다.

### 더 복잡한 업데이트 로직

다른 상황들에서는 그렇게 쉽지 않으며, 이걸 확인하려고 복잡한 시나리오를 만들 필요도 없습니다. 임의의 카테고리에 속한 아이템들의 목록이 있고, 사용자가 카테고리를 기준으로 필터링할 수 있다고 해볼게요. 사용자가 아이템을 수정하려면 모달 다이얼로그를 띄우고, 수정을 마치면 현재 보고 있는 목록을 낙관적으로 업데이트하고 싶은 상황입니다.

목록에서 아이템을 찾는 건 문제도 아니고, 업데이트를 병합하는 것도 어렵지 않습니다.

```typescript
queryClient.setQueryData(['items', 'list', filters], (prevItems) =>
  prevItems?.map((item) =>
    item.id === newItem.id ? { ...item, ...newItem } : item
  )
)
```

동작도 잘 되죠. 예외 케이스를 발견하기 전까지는요. 사용자가 아이템의 카테고리를 업데이트해서 아이템이 현재 필터링 결과에서 **제거**되게 하는 겁니다. 이런 케이스는 아직 처리하지 않았죠. GitHub의 리스트 뷰조차도 현재 필터링에 사용한 `label`을 인라인 편집으로 제거하면 제대로 처리하지 못합니다. 이걸 고쳐볼게요.

```typescript
queryClient.setQueryData(['items', 'list', filters], (prevItems) =>
  prevItems
    ?.map((item) =>
      item.id === newItem.id ? { ...item, ...newItem } : item
    )
    .filter((item) => filters.categories.includes(item.category))
)
```

이제 아이템이 낙관적으로 사라집니다. 목록을 다시 가져올 때 서버가 할 동작이랑 똑같으니 우리가 원하는 대로네요. 그런데 텍스트로도 필터링할 수 있다는 걸 잊고 있었습니다. 이제 `item.title` 등 아이템의 여러 속성에도 같은 처리를 해야하죠...

---

이쯤 되면, 현실적인 시나리오에서는 낙관적 업데이트가 서버에서 일어날 일을 **정확히** 알아야 하고, 그 로직을 클라이언트에서 반복하며 다시 만들어야 한다는 단점을 이해하셨길 바랍니다. 그럴만한 가치가 있을 때도 있지만 많은 경우 아닐 수 있다는 말씀을 드리고 싶습니다. 그리고 사용자가 동일한 개체를 동시에 여러 번 업데이트할 수 있다면 상황은 더 복잡해지죠.

## 동시 낙관적 업데이트

토글 버튼 예시로 돌아가서, 이번에는 낙관적 뮤테이션의 전체 코드를 작성해봅시다.

```typescript
const useToggleIsActive = (id: number) =>
  useMutation({
    mutationFn: api.toggleIsActive,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['items', 'detail', id],
      });

      queryClient.setQueryData(['items', 'detail', id], (prevItem) =>
        prevItem
          ? {
              ...prevItem,
              isActive: !prevItem.isActive,
            }
          : undefined
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['items', 'detail', id],
      });
    },
  });
```

위 코드는 뮤테이션이 시작되기 전에 캐시에 데이터를 쓰고, 끝나면 무효화하는 최소한의 예시입니다. 여러분이 주로 볼, 그리고 저희도 [문서](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates#updating-a-single-todo)에서 보여드리고 있는 `rollback` 로직은 생략했습니다. 오늘 제가 하려는 이야기와는 관련없고, 생략해도 이해할 수 있기 때문입니다.

### 불일치의 창(Window of Inconsistency)

제가 생략하지 않은 부분은 바로 수동 쿼리 취소입니다. 불일치의 창을 피하는 것과 꽤나 관련있기 때문이죠. 이 부분이 없다면 다음과 같은 일이 벌어질 수 있습니다.

요청이 진행되는 도중에 뮤테이션이 시작된다면, 요청이 끝날 때 낙관적 업데이트가 덮어쓰일 수 있습니다. 물론 마지막에 또다시 무효화가 일어나기 때문에 결국에는 수정되지만, 상태가 왔다 갔다 하는 불쾌한 UX를 만들 수 있습니다. 이 현상은 사용자가 업데이트를 하기 위해 화면에 포커스하고, 포커스 이벤트는 `refetchOnWindowFocus` 덕분에 무효화를 트리거할 때 제일 흔하게 일어납니다.

### 쿼리 취소

쿼리 취소는 뮤테이션이 시작될 때, 낙관적 업데이트와 충돌할 수 있는 현재 진행 중인 쿼리를 전부 중단시킴으로써 이 문제를 해결합니다.

여러 뮤테이션이 동일한 개체에 동시에 쓰기를 하더라도, 두 번째 뮤테이션이 시작될 때 이미 무효화가 진행 중이라면 문제없습니다. 하지만 항상 그런 건 아닙니다. 쿼리 취소가 도움되지 않는 시나리오를 보죠.

여기서 두 번째 뮤테이션은 첫 번째 뮤테이션이 끝나기 전에 시작되는데, 이때는 취소할 수 있는 쿼리가 없습니다. 그런데 첫 번째 뮤테이션이 settle되어 `queryClient.invalidateQueries`가 호출된 뒤에, 이 refetch가 두 번째 뮤테이션보다 빨리 끝나면 UI가 이전 상태로 복구될 것이고 불일치의 창을 또 보게될 겁니다.

이건 상당히 예외적인 케이스라는 점에 주목하세요. 두 번째 뮤테이션이 이 정도로 오래 걸리지 않는다면, 두 번째 무효화가 첫 번째 무효화 **또한** 취소할 겁니다. 명령형 호출인 `invalidateQueries`는 기본적으로 refetch를 취소하기 때문이죠. 동시 뮤테이션이 몇 주 동안은 잘 되다가 한 번씩 이전 UI가 반짝 나타나는 현상을 겪게될 수도 있습니다. 이걸 어떻게 고칠 수 있을까요?

### 과도한 무효화 방지

사실 문제는 바로 코드에 있습니다. 뮤테이션이 settle될 때마다 무효화를 하고 있죠.

```typescript
onSettled: () => {
  queryClient.invalidateQueries({
    queryKey: ['items', 'detail', id],
  });
}
```

이걸 조금만 더 똑똑하게 바꾸면 어떨까요? 위의 다이어그램을 보면, 아직 진행 중인 "관련된" 뮤테이션(두번째)도 결국 무효화를 할 테니 첫 번째 무효화는 쓸모없다는 걸 알 수 있습니다. 트릭은 첫번째 무효화를 생략하는 겁니다. 단 한 줄이면 되죠.

```typescript
onSettled: () => {
  if (queryClient.isMutating() === 1) {
    queryClient.invalidateQueries({
      queryKey: ['items', 'detail', id],
    });
  }
}
```

`queryClient.isMutating()`은 현재 실행 중인 뮤테이션이 몇 개인지 확인하는 명령적인 방법입니다. 다른 뮤테이션이 진행되고 있지 않을 때에만 무효화를 하기 위해 `1`인지 확인하고 있죠. `onSettled`가 호출될 때는 자기 자신의 뮤테이션도 아직 진행 중이므로, 이 값이 `0`이 되는 일은 없습니다. 즉, 오직 하나의 뮤테이션(자기 자신)이 남았을 때만 무효화를 합니다. 이 확인 작업은 꼭 무효화를 호출하기 직전에 명령형으로 실행해야 합니다. 여기서 `useIsMutating()`을 사용하면, [오래된 클로저 문제](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures)가 생길 가능성이 높습니다.

### 범위 제한

이 확인 작업의 범위는 현재 상당히 넓습니다. **다른 뮤테이션이 하나라도** 진행 중이라면 무효화를 생략할 테죠. 다른 뮤테이션이 진행 중이지 않거나, 끝날 때마다 [모든 걸 무효화](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)한다면 문제없습니다.

하지만 무효화를 세밀하게 하고 있다면 너무 많이 생략하지 않도록 주의해야 합니다. 관련된 뮤테이션에 `mutationKey`를 태그로 달고, 이 태그를 `isMutating`의 필터로 사용해서 균형을 유지하는 게 좋습니다.

```typescript
const useToggleIsActive = (id: number) =>
  useMutation({
    mutationKey: ['items'],
    mutationFn: api.toggleIsActive,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['items', 'detail', id],
      });

      queryClient.setQueryData(['items', 'detail', id], (prevItem) =>
        prevItem
          ? {
              ...prevItem,
              isActive: !prevItem.isActive,
            }
          : undefined
      );
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['items'] }) === 1) {
        queryClient.invalidateQueries({
          queryKey: ['items', 'detail', id],
        });
      }
    },
  });
```

이제 꽤 견고해졌습니다. 쿼리 취소와 제한된 무효화 덕분에, UI가 불일치한 상태를 반짝 보여주는 현상은 없을 거예요.
