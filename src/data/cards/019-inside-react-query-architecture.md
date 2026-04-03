---
id: 19
title: "React Query 내부 구조 - QueryClient, QueryCache, Query, Observer"
tags: ["react-query", "아키텍처", "Observer패턴", "내부구조"]
difficulty: "hard"
sourceDoc: [19]
---

## 질문

React Query의 내부 아키텍처는 네 가지 핵심 객체로 구성된다. 아래 다이어그램을 보고 질문에 답해보자.

```
컴포넌트
  └── useQuery() 호출
        └── QueryObserver (생성)
              └── Query (구독)
                    └── QueryCache (저장)
                          └── QueryClient (컨테이너)
```

1. `QueryClient`, `QueryCache`, `Query`, `QueryObserver` 각각의 역할은 무엇인가? 한 줄씩 설명해보자.
2. 하나의 `Query`에 여러 컴포넌트가 `useQuery`를 호출하면 어떤 일이 일어나는가? "Observer"와 "비활성 쿼리"의 개념으로 설명해보자.
3. React Query가 프레임워크에 구애받지 않는(framework-agnostic) 이유는 이 아키텍처의 어떤 특성 때문인가?

**힌트:** 대부분의 로직은 "Query Core"에 있고, React 어댑터는 약 100줄에 불과하다는 점을 생각해보자.

---answer---

## 정답: React Query의 계층형 내부 아키텍처

### 핵심 아이디어

React Query의 핵심 로직은 프레임워크와 무관한 **Query Core**(QueryClient, QueryCache, Query, QueryObserver)에 있다. React, Solid, Vue 등의 프레임워크 어댑터는 Observer를 구독하고 컴포넌트를 리렌더링하는 **얇은 접착 계층**일 뿐이다.

### 각 객체의 역할

```
QueryClient
├── 역할: 캐시의 컨테이너. 기본 설정 보유. 캐시 작업을 위한 편의 메서드 제공
├── QueryCache
│   ├── 역할: queryKeyHash를 키로, Query 인스턴스를 값으로 하는 인메모리 객체(Map)
│   ├── Query
│   │   ├── 역할: 데이터, 상태, 메타 정보 보유. queryFn 실행, 재시도, 취소, 중복 제거 로직
│   │   └── 내부 상태 머신으로 불가능한 상태 전이를 방지
│   └── ...
└── MutationCache
```

**QueryObserver**는 Query와 컴포넌트 사이의 접착제이다.

```
컴포넌트 A ──→ Observer A ──┐
                             ├──→ Query ["todos"]
컴포넌트 B ──→ Observer B ──┘
```

- 각 `useQuery` 호출마다 하나의 Observer가 생성된다
- Observer는 정확히 하나의 Query를 구독한다
- **Observer가 0개인 Query = 비활성(inactive) 쿼리** (DevTools에서 회색으로 표시)
- Observer는 컴포넌트가 사용하는 속성만 추적하여 **불필요한 리렌더링을 방지**한다 (예: `data`만 사용하면 `isFetching` 변경 시 리렌더링하지 않음)

### 컴포넌트 마운트 시 흐름

1. 컴포넌트 마운트 -> `useQuery` 호출 -> **Observer 생성**
2. Observer가 QueryCache의 **Query를 구독** (없으면 Query 생성)
3. 데이터가 stale이면 **백그라운드 fetch 트리거**
4. Query 상태 변경 -> **Observer에 알림**
5. Observer가 최적화 후 -> **컴포넌트 리렌더링**

### 깊은 이유 설명

프레임워크 어댑터(react-query의 `useBaseQuery`)는 약 100줄이다. 하는 일은 단 세 가지뿐이다:

1. **Observer를 생성**한다
2. **Observer를 구독**한다
3. Observer가 알림을 보내면 **컴포넌트를 리렌더링**한다

재시도, 캐싱, 중복 제거, stale 판단 등 핵심 로직은 모두 Query Core에 있다. 이 때문에 React뿐 아니라 Solid, Vue 등 어떤 프레임워크든 얇은 어댑터만 작성하면 Tanstack Query를 사용할 수 있다. **관심사의 분리가 아키텍처 수준에서 철저하게 적용된 결과**이다.
