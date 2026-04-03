---
id: 10
title: "placeholderData vs initialData - 캐시 레벨의 차이"
tags: ["react-query", "placeholderData", "initialData", "캐시"]
difficulty: "hard"
sourceDoc: [10]
---

## 질문

아래 두 커스텀 훅은 할 일 상세 페이지에서 목록 데이터를 활용해 로딩 스피너를 제거하려 한다.
동작 차이를 분석하고 질문에 답해보자.

```tsx
// 방식 A: initialData 사용
const useTodoA = (id) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['todo', id],
    queryFn: () => fetchTodo(id),
    staleTime: 30 * 1000,
    initialData: () =>
      queryClient
        .getQueryData(['todo', 'list'])
        ?.find((todo) => todo.id === id),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(['todo', 'list'])?.dataUpdatedAt,
  });
};

// 방식 B: placeholderData 사용
const useTodoB = (id) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['todo', id],
    queryFn: () => fetchTodo(id),
    placeholderData: () =>
      queryClient
        .getQueryData(['todo', 'list'])
        ?.find((todo) => todo.id === id),
  });
};
```

1. 방식 A에서 `staleTime: 30초`이고 목록 데이터가 10초 전에 갱신되었다면, 백그라운드 갱신이 일어나는가?
2. 방식 B에서 백그라운드 갱신이 실패하면 `data`는 어떻게 되는가? 방식 A와 비교하라.
3. 어떤 상황에서 `initialData`를, 어떤 상황에서 `placeholderData`를 사용해야 하는가?

**힌트:** `initialData`는 **캐시 레벨**, `placeholderData`는 **옵저버 레벨**에서 동작한다는 점이 핵심이다.

---answer---

## 정답: 캐시 레벨 vs 옵저버 레벨의 차이

### 핵심 아이디어

`initialData`는 캐시에 실제 데이터로 저장되어 `staleTime`과 `gcTime`의 영향을 받는다. `placeholderData`는 캐시에 저장되지 않고 옵저버에게만 임시로 보여지는 "가짜 데이터"이다. 이 차이가 백그라운드 갱신, 에러 처리, 데이터 지속성에 직접 영향을 미친다.

### 질문별 상세 답변

**Q1: 방식 A에서 백그라운드 갱신이 일어나는가?**

일어나지 않는다. `initialDataUpdatedAt`이 목록의 `dataUpdatedAt`(10초 전)을 참조하고, `staleTime`이 30초이므로 React Query는 "아직 20초 남았으니 신선하다"고 판단한다. 30초가 지나야 백그라운드 갱신이 일어난다.

```tsx
// initialDataUpdatedAt으로 "이 데이터가 언제 생성되었는지"를 알려준다
initialDataUpdatedAt: () =>
  queryClient.getQueryState(['todo', 'list'])?.dataUpdatedAt,
// → 10초 전 → staleTime 30초 이내 → 갱신 안 함
```

**Q2: 백그라운드 갱신 실패 시 data 비교**

| | initialData (방식 A) | placeholderData (방식 B) |
|---|---|---|
| 갱신 실패 시 status | `error` | `error` |
| 갱신 실패 시 data | **기존 initialData 유지** | **`undefined`** |
| 이유 | 캐시에 실제로 저장됨 | 캐시에 저장된 적 없음 |

`initialData`는 캐시의 "진짜 데이터"이므로 에러가 발생해도 남아있다. `placeholderData`는 "실제 데이터가 올 때까지의 임시값"이므로 실제 데이터 도착에 실패하면 사라진다.

**Q3: 사용 시점 가이드**

```
initialData를 사용할 때:
  → 다른 쿼리의 캐시 데이터를 "충분히 좋은 진짜 데이터"로 쓸 때
  → 예: 목록에서 상세 페이지로 이동 시 목록의 데이터를 초기값으로

placeholderData를 사용할 때:
  → 실제 데이터와 구조가 다른 임시 데이터를 보여줄 때
  → 예: 스켈레톤 형태의 더미 데이터, 하드코딩된 기본값
  → isPlaceholderData 플래그로 임시 데이터 여부를 UI에 표시 가능
```

### 깊은 이유 설명

이 두 옵션의 차이는 **"이 데이터를 얼마나 신뢰하는가?"** 에 달려있다.

- **`initialData`**: "이 데이터는 진짜 데이터의 일부다. 캐시에 넣어도 괜찮다." `staleTime`과 `initialDataUpdatedAt`으로 세밀하게 갱신 타이밍을 제어할 수 있다.
- **`placeholderData`**: "이 데이터는 어디까지나 임시다. 진짜 데이터가 오면 바로 교체해라." 항상 백그라운드 갱신이 일어나고, `isPlaceholderData` 플래그로 UI에서 구분할 수 있다.
