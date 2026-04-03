---
id: 27
title: "낙관적 업데이트 동시성 - isMutating으로 불일치 방지하기"
tags: ["react-query", "낙관적업데이트", "동시성", "mutation"]
difficulty: "hard"
sourceDoc: [30]
---

## 질문

아래는 토글 버튼의 낙관적 업데이트 뮤테이션 코드이다. 사용자가 빠르게 두 번 클릭할 때 **UI가 이전 상태로 잠깐 되돌아가는 깜빡임 현상**이 발생한다.

```tsx
const useToggleIsActive = (id: number) =>
  useMutation({
    mutationFn: api.toggleIsActive,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['items', 'detail', id],
      });
      queryClient.setQueryData(['items', 'detail', id], (prev) =>
        prev ? { ...prev, isActive: !prev.isActive } : undefined
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['items', 'detail', id],
      });
    },
  });
```

1. 두 번째 뮤테이션이 진행 중일 때 첫 번째 뮤테이션의 `onSettled`가 먼저 실행되면 어떤 일이 발생하는가?
2. `onSettled`에서 **한 줄을 추가**하여 이 문제를 해결하라.
3. 여러 종류의 뮤테이션이 존재할 때, `isMutating` 확인의 범위를 제한하려면 어떻게 해야 하는가?

**힌트:** "마지막 뮤테이션만 무효화하면 된다"는 원칙을 코드로 표현해보자.

---answer---

## 정답: `queryClient.isMutating() === 1` 조건으로 과도한 무효화 방지

### 핵심 아이디어

동시 낙관적 업데이트에서 **불일치의 창(Window of Inconsistency)** 문제가 발생한다. 첫 번째 뮤테이션이 settle되어 무효화→refetch가 일어나면, 아직 진행 중인 두 번째 뮤테이션의 낙관적 상태가 서버의 이전 상태로 덮어씌워진다.

### 단계별 코드 해설

**1. 문제 시나리오**

- 사용자가 빠르게 두 번 클릭 → 뮤테이션 A, B가 동시에 진행
- A의 `onSettled` → `invalidateQueries` → refetch가 B보다 먼저 완료
- refetch 결과(A만 반영된 서버 상태)가 캐시에 쓰여 B의 낙관적 상태를 덮어씀
- UI가 잠깐 이전 상태로 깜빡임

**2. 해결: 마지막 뮤테이션만 무효화**

```tsx
onSettled: () => {
  // 자기 자신만 남았을 때(다른 관련 뮤테이션이 없을 때)만 무효화
  if (queryClient.isMutating() === 1) {
    queryClient.invalidateQueries({
      queryKey: ['items', 'detail', id],
    });
  }
},
```

`onSettled` 시점에 자기 자신도 아직 "진행 중"이므로 값이 `0`이 되는 일은 없다. `1`이면 자기만 남았다는 뜻이므로 안전하게 무효화할 수 있다.

**3. mutationKey로 범위 제한**

```tsx
const useToggleIsActive = (id: number) =>
  useMutation({
    mutationKey: ['items'],  // 관련 뮤테이션에 동일한 키 부여
    mutationFn: api.toggleIsActive,
    // ...onMutate 생략
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['items'] }) === 1) {
        queryClient.invalidateQueries({
          queryKey: ['items', 'detail', id],
        });
      }
    },
  });
```

### 깊은 이유 설명

이 패턴에서 반드시 **명령형** `queryClient.isMutating()`을 사용해야 한다. `useIsMutating()` 훅을 쓰면 **오래된 클로저(stale closure)** 문제가 발생하여, `onSettled` 콜백이 생성 시점의 값을 캡처하게 된다. 무효화 직전에 현재 상태를 명령형으로 조회하는 것이 핵심이다.
