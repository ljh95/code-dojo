---
id: 7
title: "useQuery 제네릭 - 추론에 맡기기"
tags: ["react-query", "TypeScript", "타입 추론", "제네릭"]
difficulty: "medium"
sourceDoc: [6]
---

## 질문

아래 두 커스텀 훅은 동일한 API를 호출하지만 타입 지정 방식이 다르다.
각 방식의 **문제점 또는 장점**을 분석하고, 질문에 답해보자.

```tsx
// 방식 A: 제네릭을 명시적으로 전달
function useGroupCount() {
  return useQuery<Group[], Error>({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
    // 🚨 타입 에러 발생!
  });
}

// 방식 B: 제네릭을 전달하지 않음
function fetchGroups(): Promise<Group[]> {
  return axios.get('groups').then((response) => response.data);
}

function useGroupCount() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
  });
}
```

1. 방식 A에서 `select`가 `number`를 반환하는데 왜 타입 에러가 발생하는가?
2. 방식 A의 에러를 제네릭으로 해결하려면 어떻게 해야 하는가?
3. 방식 B가 방식 A보다 **권장되는 이유**는 무엇인가?

**힌트:** TypeScript의 Partial Type Argument Inference가 아직 지원되지 않는다는 점을 생각해보자.

---answer---

## 정답: queryFn 반환 타입으로 추론에 맡기기

### 핵심 아이디어

`useQuery`에 제네릭을 명시적으로 전달하면 **Partial Type Argument Inference**가 불가능하여 모든 제네릭을 수동 지정해야 한다. `queryFn`의 반환 타입만 정확히 정의하면 TypeScript가 나머지를 **자동 추론**한다.

### 1. 방식 A의 에러 원인

`useQuery`는 4개의 제네릭을 갖는다: `TQueryFnData`, `TError`, `TData`, `TQueryKey`. 방식 A에서 `<Group[], Error>`만 전달하면 3번째 제네릭 `TData`는 기본값인 `TQueryFnData`(= `Group[]`)가 된다. `select`가 `number`를 반환하므로 `Group[]`과 충돌한다.

```tsx
// 🚨 TData가 Group[]로 기본 지정되어 number와 충돌
useQuery<Group[], Error>({ ... select: (groups) => groups.length })

// ✅ 3번째 제네릭을 명시하면 해결되지만 번거롭다
useQuery<Group[], Error, number>({ ... select: (groups) => groups.length })
```

### 2. 권장 방식: 추론에 맡기기

```tsx
// fetchGroups.ts
// 반환 타입을 명시 — 이것이 추론의 출발점
function fetchGroups(): Promise<Group[]> {
  return axios.get('groups').then((response) => response.data);
}

// useGroupCount.ts
function useGroupCount() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    select: (groups) => groups.length,
    // ✅ data는 number | undefined로 자동 추론
  });
}
```

### 깊은 이유 설명

제네릭을 명시하지 않는 방식이 권장되는 이유:

- **Partial Type Argument Inference 미지원**: 하나의 제네릭을 지정하면 나머지도 모두 지정해야 한다. 제네릭이 추가될수록 유지보수가 어려워진다.
- **select, queryKey 등의 고급 기능과 호환**: 3번째(`TData`), 4번째(`TQueryKey`) 제네릭이 필요한 경우에도 자연스럽게 추론된다.
- **코드 가독성**: 자바스크립트처럼 읽히면서도 타입 안정성을 확보한다.

핵심 원칙: **`queryFn`의 반환 타입을 정확히 정의하고, 나머지는 TypeScript 추론에 맡긴다.**
