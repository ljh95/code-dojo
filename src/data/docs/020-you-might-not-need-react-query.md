---
id: 21
title: "(번역) #20: You Might Not Need React Query"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/you-might-not-need-react-query"
tags: [react-query, 번역]
date: ""
---

![](https://velog.velcdn.com/images/cnsrn1874/post/89ffeb9a-5fc4-4b81-a025-553abc8f2ee5/image.png)

Photo by [Randy Tarampi](https://unsplash.com/ko/@randytarampi)

[TkDodo](https://twitter.com/TkDodo)의 [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query)를 번역한 글입니다.

---

## 개요

[React Server Component](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)가 React Query를 없애버릴까요? 지난 몇 달간 가장 많이 받은 질문입니다. 적절한 답이 없지만, 이 주제를 더 자세히 살펴본 후 의견을 나눕니다.

> "(데이터 fetching 분야 라이브러리의 메인테이너로서) 서버 컴포넌트와 서스펜스에 대해 솔직히 두려움이 제일 큽니다." - 2022. 10. 26

---

## 제 생각

모든 도구는 문제를 해결하는 데 도움이 되어야 합니다. React는 애플리케이션에서 데이터를 fetch하는 방식을 강요하지 않았습니다. 이 공백을 메운 것이 React Query와 swr 같은 라이브러리입니다.

서버 사이드 렌더링이 유행했을 때, 첫 페이지 로딩을 빠르게 하기 위해 서버에서 HTML을 사전 렌더링했습니다. 이후 앱은 클라이언트 측 페이지 내비게이션을 통해 SPA처럼 동작합니다. 이 상황에서 React Query는 첫 데이터 fetch를 서버로 옮기고 클라이언트에서 결과를 하이드레이트할 수 있게 했습니다.

---

## 그래서 뭐가 변했나요?

시대가 진화하고 있습니다. 앞뒤로 왔다 갔다 하는 것처럼 보이지만 사실은 앞으로 나아가고 있습니다.

React는 여전히 컴포넌트를 렌더링하는 라이브러리일 뿐입니다. 하지만 서버 컴포넌트를 사용하면 서버에서의 사전 렌더링이 가능한 새로운 애플리케이션 아키텍처를 제공합니다. 빌드타임이나 런타임에 데이터에 접근할 수 있게 함으로써 클라이언트에서 쿼리해야 하는 API를 만들지 않아도 됩니다.

```jsx
export default async function Page() {
  const data = await fetch(`https://api.github.com/repos/tanstack/react-query`);

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

React 컴포넌트 안에서 `async/await`를 사용하는 것이 가능합니다. 이는 이 아키텍처를 채택하는 애플리케이션의 상황을 극적으로 변화시킵니다. React Query는 클라이언트에서 비동기 상태를 관리하기 위한 라이브러리입니다. 데이터 fetching을 서버에서만 한다면 React Query가 필요할 이유가 있을까요?

### 필요 없을 수도 있어요

아마도 필요 없을 것입니다. Next.js나 Remix처럼 데이터의 fetching과 mutation이 잘 구상된 성숙한 프레임워크로 새 애플리케이션을 시작한다면 React Query는 필요 없을 겁니다.

그리고 정말 괜찮습니다. React Query의 메인테이너라고 해서 모든 상황에 React Query를 사용하라고 할 수 없습니다. React Query를 사용하기로 했다면, 그 이유는 "문제 해결에 도움됨"이어야 합니다.

### 통합

서버 컴포넌트라는 새로운 세계에는 React Query를 통합시킬 만한 지점이 아직 많이 있습니다. 대부분의 프로젝트는 백지상태에서 시작하지 않습니다. 수년에 걸쳐 구축된 수많은 애플리케이션이 존재하며, 점진적으로 `app` 디렉토리를 적용할 수는 있지만 서버 컴포넌트를 활용하려면 어느 정도의 재설계가 필요합니다.

이런 과도기에 React Query는 `app` 디렉토리 및 서버 컴포넌트와 아주 잘 통합됩니다. 일부 컴포넌트를 옮겨서 서버에서만 fetch 하도록 하거나, 서버 컴포넌트로 캐시를 prefetch 한 뒤에 `useQuery`를 사용하는 클라이언트 컴포넌트에 전달할 수도 있습니다. 모 아니면 도일 필요는 없습니다. [공식 문서](https://tanstack.com/query/v4/docs/react/guides/ssr#using-the-app-directory-in-nextjs-13)에 이미 이런 통합에 대한 좋은 가이드가 있습니다.

### 하이브리드 접근법

하이브리드 접근법은 서버 컴포넌트가 (아직) 잘 지원하지 않는 용례를 마주칠 때 특히 유용합니다.

예를 들어:

- 무한 스크롤 목록을 렌더링할 때 첫 페이지는 서버에서 prefetch하고, 사용자가 끝까지 스크롤 했을 때는 클라이언트에서 더 많은 페이지를 가져오는 경우
- 네트워크 연결 없이도 앱이 작동해야 한다는 요구 사항
- 사용자의 명시적인 상호작용 없이도 항상 새로운 데이터를 볼 수 있는 사용자 경험 (일정 간격으로 fetch 하거나 자동 refetch)

React Query에는 이 모든 상황에 대해 잘 구상되어 있으므로 서버 컴포넌트와 결합하는 것이 분명 타당한 경우가 존재합니다. 하지만 React Query의 주 용도가 데이터를 fetch 해서 사용자에게 보여주는 것이었다면 서버 컴포넌트로도 충분히 대신할 수 있습니다.

### "킬러"는 아닙니다

다양한 이유로 인해 모두가 서버 컴포넌트를 채택하지는 않을 겁니다:

- 백엔드가 Node.js로 작성되지 않았을 수도 있음
- 프런트엔드가 전용 서버 없는 SPA여도 괜찮음
- React Native로 모바일 앱을 만들고 있을 수도 있음
- Tanstack Query 사용자라면 React를 아예 사용하지 않을 수도 있음

게다가 데이터 fetch _이외의_ 작업에 React Query를 사용할 수 있습니다. 클라이언트에서 비동기 상태 관리자로 Tanstack Query를 선택하기는 완벽하게 좋은 선택입니다.

하지만 이를 기본으로 지원하는 내장 기능이 있는 프레임워크를 선택했다면 그 기능을 사용하세요!

---

## 결론

Tanstack Query를 RSC 외부에서, 심지어는 결합해서도 사용하는 경우가 여전히 많을 것으로 예상됩니다. RSC는 아직 초기 단계의 최첨단 기술입니다. 사용하려면 프레임워크, 라우터, 번들러와 긴밀하게 통합해야 하며, 추가적인 서버 부하를 처리할 수 있는 인프라가 필요합니다.

> "공짜 점심은 없어요. 모든 것은 트레이드-오프입니다."

React Query의 사망 보도는 크게 과장된 것입니다.
