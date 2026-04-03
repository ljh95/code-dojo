---
id: 14
title: "Mutation 후 캐시 업데이트 - invalidation vs setQueryData"
tags: ["react-query", "useMutation", "invalidateQueries", "setQueryData"]
difficulty: "medium"
sourceDoc: [13]
---

## 질문

블로그 포스트의 제목을 수정하는 mutation을 구현하려 한다. 아래 두 가지 방법의 차이를 비교해보자.

```tsx
// 방법 A: 무효화
const useUpdateTitle = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTitle) => axios.patch(`/posts/${id}`, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', id] });
    },
  });
};

// 방법 B: 직접 업데이트
const useUpdateTitle = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTitle) =>
      axios.patch(`/posts/${id}`, { title: newTitle }).then((res) => res.data),
    onSuccess: (newPost) => {
      queryClient.setQueryData(['posts', id], newPost);
    },
  });
};
```

1. 방법 A와 방법 B의 동작 차이는 무엇인가?
2. **정렬된 목록**을 업데이트해야 하는 경우, 어느 방법이 더 안전한가? 그 이유는?
3. 방법 A에서 `invalidateQueries`의 결과를 `return`하는 것과 하지 않는 것의 차이는 무엇인가?

**힌트:** 직접 업데이트는 프론트엔드에서 백엔드 로직을 "모방"해야 한다는 점을 생각해보자.

---answer---

## 정답: 대부분의 경우 invalidation 우선 사용

### 핵심 아이디어

**invalidation**은 서버에서 최신 데이터를 다시 가져오므로 항상 정확하다. **setQueryData**는 추가 네트워크 요청 없이 캐시를 즉시 업데이트하지만, 프론트엔드에서 백엔드 로직을 중복 구현해야 한다.

### 단계별 해설

**1단계: 동작 차이**

- **방법 A (invalidation)**: 캐시를 "무효(stale)"로 표시하고, 현재 활성화된 쿼리를 자동으로 다시 가져온다. 서버의 최신 상태가 보장된다.
- **방법 B (setQueryData)**: mutation 응답 데이터로 캐시를 즉시 교체한다. 추가 네트워크 요청이 없어 빠르지만, 서버가 반환한 데이터가 완전해야 한다.

**2단계: 정렬된 목록의 경우**

정렬된 목록은 **invalidation이 더 안전**하다. 제목을 수정하면 정렬 순서가 바뀔 수 있는데, `setQueryData`로 단일 항목만 교체하면 정렬 위치가 틀어질 수 있다. invalidation은 전체 목록을 서버에서 다시 가져오므로 정렬이 정확하다.

**3단계: return의 차이**

```tsx
// ✅ invalidation이 끝날 때까지 mutation이 loading 상태 유지
onSuccess: () => {
  return queryClient.invalidateQueries({ queryKey: ['posts', id] });
}

// 🚀 invalidation을 실행만 하고 mutation은 즉시 success
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['posts', id] });
}
```

`invalidateQueries`는 Promise를 반환한다. `return`하면 React Query가 해당 Promise를 await하여, 관련 쿼리가 업데이트될 때까지 mutation이 `loading` 상태에 머문다.

### 깊은 이유 설명

TkDodo는 **대부분의 경우 invalidation을 선호**한다고 말한다. `setQueryData`는 간단한 경우(단일 항목 상세 화면 등)에 효과적이지만, 목록/정렬/페이지네이션이 관여하면 프론트엔드에서 백엔드의 정렬·필터 로직을 모방해야 하므로 코드 복잡도가 급격히 증가한다. "서버가 진실의 원천"이라는 원칙에 따라, 의심스러우면 invalidation을 사용하는 것이 안전하다.
