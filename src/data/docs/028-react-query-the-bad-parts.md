---
id: 29
title: "React Query - 안 좋은 부분들 (The Bad Parts)"
author: "TkDodo (React Day Berlin 2024)"
source: "https://tkdodo.eu/blog/react-query-the-bad-parts"
tags: [react-query, 트레이드오프, 번들사이즈, 정규화캐싱, 발표]
date: "2024-12"
---

> **📌 핵심 요약**
> - React Query의 "나쁜 부분" 대부분은 미신이거나 의도된 트레이드오프이며, 진짜 한계(정규화 캐싱 부재, 동기 상태 부적합)를 알고 올바른 도구를 선택하라
> - 키워드: 트레이드오프, 번들사이즈, 선언적페칭, 정규화캐싱, Suspense
> - 이런 상황에서 다시 읽으면 좋다: React Query 도입 여부를 판단하거나 한계를 정리하고 싶을 때

---

> **원문**: React Query - The Bad Parts by Dominik Dorfmeister (TkDodo)
> **발표**: React Day Berlin 2024 (2024년 12월)
> **형식**: 슬라이드 + 발표 트랜스크립트

---

## 1. React Query 소개

이건 정말 짧게, 거의 라이트닝 토크 수준으로 끝날 거예요. 왜냐하면 대부분의 경우, React Query는 그냥 훌륭하거든요. 커뮤니티에서 개발자 경험과 사용자 경험 모두를 제공한다는 점에서 정말 사랑받고 있다고 생각합니다.

NPM 주간 다운로드 수를 보면, React Query는 올해 거의 400만에서 600만 주간 다운로드로 크게 성장했습니다. React의 수치(약 2,700만)와 비교하면 React Query가 전체 React 애플리케이션의 약 20%, 거의 5개 중 1개 앱에서 사용되고 있습니다. Sentry, BlueSky, ChatGPT처럼 수백만 명의 사용자를 가진 앱들도 포함됩니다.

State of Frontend 2024 설문조사에서 사용한 사람 중 2.8%만이 좋아하지 않았다고 답했고, State of React에서도 긍정적 감정으로 TanStack Query가 44%를 넘기며 1위에 올랐습니다.

## 2. 트레이드오프와 번들 사이즈

제 이름은 Dominik이고, 비엔나에 사는 소프트웨어 엔지니어입니다. React Query가 왜 훌륭한지에 대해 많이 쓰고 이야기해왔고, 여전히 그렇다고 생각합니다만 — 모든 것은 트레이드오프입니다. 오늘은 React Query가 최적의 선택이 아닌 경우들에 대해 이야기하고, 몇 가지 미신을 깨뜨리겠습니다.

첫 번째 포인트, 방 안의 코끼리 — **번들 사이즈**입니다.

먼저 번들 사이즈가 **아닌** 것: npm에서 보이는 크기(700KB 넘음)는 소스맵, 코드모드 등이 포함된 것이지 소비자에게 전달되는 크기가 아닙니다. Bundlephobia도 ESM을 제대로 이해하지 못하고 레거시 빌드를 잡아내므로 부정확합니다.

## 3. 번들 사이즈 최적화

Bundle.js를 통해 확인하면:
- 모든 것을 export: **12.4KB (minzip)**, Brotli로 **12KB**
- 일반적 사용(QueryClient, Provider, useQuery, useMutation): **9.63KB (10KB 미만)**

의존성 추가 전 번들 사이즈를 살펴보는 것은 중요하지만, **작성하지 않아도 되는 코드로 절약하는 번들 사이즈**도 고려해야 합니다. React Query를 사용하면 할수록, 직접 작성하지 않아도 되는 코드를 절약해줍니다. 대부분의 커스텀 솔루션은 아마 더 크거나, 일부 엣지 케이스에서 실패할 수도 있습니다. 캐싱과 캐시 무효화는 정말 어렵기 때문이죠.

## 4. 선언적 데이터 페칭

다음으로 깨뜨리고 싶은 미신: **"React Query로는 버튼 클릭으로 페칭을 할 수 없다"**

React Query는 기본적으로 **선언적(declarative)**입니다. useQuery 훅을 작성하고, query key와 query function을 전달하면, 자동으로 실행됩니다.

필터링을 추가할 때, `refetch`를 사용하고 싶을 수 있지만, refetch는 어떤 인수도 받지 않습니다. 이건 React Query가 설계된 방식이 아닙니다. 하드코딩된 키로 다른 인수의 refetch를 하면 캐시를 덮어쓸 뿐 아니라 레이스 컨디션이 발생할 수 있습니다.

올바른 접근: 모든 의존성을 query key에 넣는 것입니다.

```tsx
// applied filter를 React state에 저장
const [filter, setFilter] = useState({ status: 'all' })

const { data } = useQuery({
  queryKey: ['tasks', filter],
  queryFn: () => fetchTasks(filter),
})
```

applied filter가 변경되면 키가 변경되고, React Query가 자동으로 페칭합니다. "이 버튼을 클릭하면 페칭을 하고 싶다"는 명령적 사고에서, "이 상태에 매칭되는 데이터를 원한다"는 선언적 형태로 전환됩니다.

TanStack Router를 사용한다면 search params로 쉽게 변경 가능하고, 공유 가능한 URL과 브라우저 뒤로가기 버튼 내비게이션을 무료로 얻을 수 있습니다.

이전에 이미 검색했던 필터로 다시 변경하면 즉각적인 결과를 얻습니다. React Query는 키별로 모든 것을 별도로 캐시하기 때문입니다. 이것은 단순한 **도큐먼트 캐시**로, 완전한 응답이 주어진 키에 대해 저장됩니다.

## 5. 정규화된 캐싱과 학습 곡선

React Query에는 **정규화된 캐시(normalized cache)**가 없습니다. GraphQL을 위한 Apollo Client나 Urql은 스키마와 엔티티 간의 관계를 알기 때문에 정규화된 캐싱을 제공합니다. React Query는 캐시에 무엇이 있는지 모르고, 반환되는 Promise만 알 뿐입니다.

커뮤니티 솔루션으로 **Normie**가 있으며, React Query, SWR, RTK Query와의 통합을 제공합니다.

**학습 곡선에 대해**: Tanner의 설계 목표 — **단일 쿼리로 시작해서 전체 가치 제안의 80%를 첫 시도에 이해하고 사용법을 배울 수 있다**는 것입니다.

최소한의 필수 옵션인 query key와 query function만으로 useQuery를 시작할 수 있고, 이것만으로도 캐싱, 요청 중복 제거, stale-while-revalidate, 백그라운드 업데이트, 글로벌 상태 관리, 재시도 등을 얻습니다.

점진적 학습 경로:
1. **useQuery + useMutation + invalidation** → 대부분의 앱에서 충분
2. **낙관적 업데이트, 무한 쿼리** → 복잡성이 커질 때
3. **플러그인 시스템, 캐시 구독** → 고급 사용

## 6. 동기 상태 관리와 빌트인 솔루션

React Query를 **동기 상태**(사이드바 토글 등)에 쓰지 마세요. React Query로 작성한다면:

```tsx
// ❌ 이렇게 하지 마세요
const { data: isOpen } = useQuery({
  queryKey: ['sidebar-state'],
  queryFn: () => Promise.resolve(false),
  initialData: false,
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
})
```

비동기 동기화를 막기 위해 여러 설정을 꺼야 하고, 장황하며, 효율적이지 않습니다.

클라이언트 상태에는 전용 도구 사용 권장:

**Zustand** 예시:
```tsx
const useSidebarStore = create((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
```

**XState Store**도 유사하지만 TypeScript에서 타입 추론이 더 잘 동작하고, 이벤트 기반입니다.

## 7. React의 비전

React에 내장된 비동기 프리미티브가 없는 이유는 React 팀이 **API를 제대로 만들려고** 하기 때문입니다.

Context Selector 대신, React 팀의 비전: `use` 연산자 + React 컴파일러로 useMemo 없이도 세밀한 구독을 달성.

데이터 페칭에 대해서도: **Suspense**는 컴포넌트가 로딩/에러 상태 처리에서 분리되는 아키텍처이고, TypeScript와 잘 동작합니다 — `data`가 절대 `undefined`가 될 수 없으므로.

> **Suspense와 Server Components가 우리가 기다려온 비동기 프리미티브**입니다. 서버 컴포넌트를 지원하는 프레임워크로 작업하고 있다면 그것들을 사용하세요. 그 전까지는 편하게 Query를 사용하세요.

## 8. 문서 구조 개선

문서는 오버홀이 필요합니다. **가이드가 좀 더 구조화되어야 하고, 제로부터 끝까지 하나의 흐름으로 안내해야 합니다.**

## 9. Next.js에서 TanStack Query

서버 컴포넌트와 액션이 내장된 성숙한 프레임워크를 사용하고 있고 이것으로 충분하다면, React Query를 바로 도입하지 않아도 됩니다. 하지만:

- 기존 앱에서 App Router로 마이그레이션 중이라면 유지하며 점진적으로 전환
- 매우 인터랙티브한 사용 사례(무한 스크롤, 실시간 업데이트)에서는 여전히 유용
- 서버 컴포넌트와의 통합: 서버에서 페칭 시작 → Promise를 클라이언트로 스트리밍 → 캐시가 픽업

참고: 버전 4에서 React Query → TanStack Query로 리브랜딩. 프레임워크에 종속되지 않는 코어 + 각 프레임워크별 어댑터(React, Vue, Svelte, Solid).

## 10. HTTP 캐싱과 결합

cache-control 헤더를 사용하고 있다면 **staleTime을 그냥 0으로 유지**하면 됩니다. React Query에서 페치가 트리거되더라도 브라우저 캐시에서 직접 전달됩니다. 오프라인 상태에서도 브라우저 캐시에 캐시되어 있다면 동작합니다.

---

## 핵심 정리

| 주제 | 결론 |
|---|---|
| **번들 사이즈** | 실제 ~10KB. 직접 작성하지 않아도 되는 코드를 고려하면 충분히 가치 있음 |
| **버튼 클릭 페칭** | 미신. 선언적으로 query key에 의존성을 넣어 해결 |
| **정규화된 캐싱** | 실제 트레이드오프. GraphQL + 정규화 캐싱 필요시 Apollo/Urql 사용 |
| **학습 곡선** | useQuery 하나로 80% 가치 획득. 점진적 학습 가능 |
| **동기 상태** | React Query를 쓰지 말 것. Zustand, XState Store 등 사용 |
| **Next.js App Router** | 사용 가능하나 필수 아님. 사용 사례에 따라 판단 |
| **HTTP 캐싱** | staleTime 0 + 브라우저 캐시(cache-control) 조합 가능 |

> React Query는 대부분의 상황에서 훌륭한 트레이드오프이며, "나쁜 부분"이라 불리는 것들의 상당수는 미신이거나 의도적 설계 선택이다. 진짜 한계를 이해하고, 올바른 도구를 올바른 곳에 사용하면 된다.
