---
id: 21
title: "React Query가 필요 없을 수도 있다 - RSC 시대의 판단 기준"
tags: ["react-query", "RSC", "서버컴포넌트", "트레이드오프"]
difficulty: "easy"
sourceDoc: [21]
---

## 질문

React Server Component(RSC)가 등장하면서, 아래처럼 서버 컴포넌트에서 직접 데이터를 fetch할 수 있게 되었다.

```jsx
// app/page.tsx (서버 컴포넌트)
export default async function Page() {
  const data = await fetch("https://api.github.com/repos/tanstack/react-query");
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

이 상황에서 다음 질문에 답해보자.

1. 위와 같이 서버 컴포넌트에서 데이터를 fetch한다면 React Query가 필요 없는 이유는 무엇인가?
2. 그럼에도 React Query가 여전히 필요한 구체적인 사용 사례 3가지를 들어보자.
3. "React Query가 필요한가?"를 판단하는 핵심 기준은 무엇인가?

**힌트:** React Query는 "클라이언트에서 비동기 상태를 관리"하는 라이브러리라는 정의에서 출발하자.

---answer---

## 정답: 도구는 문제를 해결할 때만 필요하다

### 핵심 아이디어

React Query는 **클라이언트에서 비동기 상태를 관리**하기 위한 라이브러리이다. 데이터 fetching을 서버에서만 한다면 관리할 클라이언트 비동기 상태 자체가 없으므로 React Query가 필요 없을 수 있다.

### 단계별 해설

**1. RSC에서 React Query가 불필요한 경우**

서버 컴포넌트는 서버에서 데이터에 직접 접근할 수 있다. 컴포넌트 안에서 `async/await`를 사용하므로 로딩 상태, 에러 상태, 캐싱을 클라이언트에서 관리할 필요가 없다. Next.js나 Remix처럼 데이터 fetching과 mutation이 잘 구상된 프레임워크를 사용한다면, 프레임워크 내장 기능만으로 충분하다.

**2. React Query가 여전히 필요한 사용 사례**

| 사용 사례 | 이유 |
|-----------|------|
| **무한 스크롤** | 첫 페이지는 서버에서 prefetch하되, 추가 페이지는 클라이언트에서 fetch해야 한다 |
| **오프라인 지원** | 네트워크 연결 없이도 앱이 동작해야 한다면 클라이언트 캐시가 필수이다 |
| **실시간 갱신** | 일정 간격 polling, window focus refetch 등 사용자 상호작용 없이 데이터를 갱신해야 한다 |

추가로, **하이브리드 접근법**도 유효하다. 서버 컴포넌트로 초기 데이터를 prefetch하고, 클라이언트 컴포넌트에서 `useQuery`로 이어받아 갱신하는 방식이다.

**3. 판단 기준**

> "이 도구가 내 문제 해결에 도움이 되는가?"

- 서버 컴포넌트를 지원하는 프레임워크(Next.js, Remix)를 사용하고, 주 용도가 데이터를 fetch해서 보여주는 것이라면 -> **불필요할 수 있다**
- SPA, React Native, 서버 없는 환경이거나 오프라인/실시간 갱신이 필요하다면 -> **여전히 필요하다**
- 기존 앱에서 점진적으로 RSC를 도입하는 과도기라면 -> **공존이 가능하다**

### 깊은 이유 설명

모든 도구는 트레이드오프가 있다. RSC는 서버 부하를 처리할 인프라가 필요하고, 프레임워크/라우터/번들러와 긴밀한 통합이 필요하다. 모든 팀이 이를 채택할 수 있는 것은 아니다. TkDodo(React Query 메인테이너)의 표현대로, **"React Query의 사망 보도는 크게 과장된 것"**이며, 핵심은 자신의 상황에 맞는 도구를 선택하는 것이다.
