---
id: 16
title: "오프라인 React Query - networkMode와 fetchStatus 이해하기"
tags: ["react-query", "오프라인", "networkMode", "fetchStatus"]
difficulty: "easy"
sourceDoc: [14]
---

## 질문

React Query v4에서 도입된 `networkMode`에 대한 질문이다.

다음 중 `networkMode` 설정별 동작이 **올바르게** 연결된 것을 모두 고르시오.

- (A) `networkMode: 'online'` — 네트워크가 없으면 쿼리가 `paused` 상태로 진입한다
- (B) `networkMode: 'always'` — 네트워크 연결과 관계없이 쿼리가 항상 실행된다
- (C) `networkMode: 'offlineFirst'` — 오프라인 시 캐시를 먼저 확인하고, 캐시 미스 시 `paused` 상태로 전환한다
- (D) `networkMode: 'online'` — 네트워크가 없어도 캐시에 데이터가 있으면 쿼리를 실행한다

**힌트:** v4의 기본 모드가 무엇인지, 그리고 `fetchStatus`라는 새 개념이 왜 필요해졌는지 생각해보자.

---answer---

## 정답: A, B, C

### 핵심 아이디어

React Query v4는 `networkMode` 설정을 도입하여, 쿼리의 네트워크 의존성을 명시적으로 제어할 수 있게 했다. 기존 `status`(loading/success/error)와 별도로 **`fetchStatus`**(fetching/paused/idle)가 추가되어 네트워크 상태를 정확히 표현한다.

### 각 선택지 해설

**(A) 정답** — `online`은 v4의 **기본 모드**이다. 네트워크 연결이 없으면 쿼리는 새로운 `paused` 상태로 진입하며, 네트워크가 복구되면 자동으로 재실행된다.

**(B) 정답** — `always`는 네트워크를 신경 쓰지 않는다. 웹 워커에서의 비동기 처리 등 **네트워크가 필요 없는 비동기 작업**에 적합하다.

**(C) 정답** — `offlineFirst`는 먼저 요청을 시도한다. 브라우저 캐시나 서비스 워커가 응답하면 성공, 캐시 미스로 네트워크 에러가 발생하면 재시도를 `paused` 상태로 전환한다. **오프라인 우선 PWA**에 적합하다.

**(D) 오답** — `online` 모드에서는 네트워크가 없으면 **쿼리 함수 자체를 실행하지 않는다**. 캐시에 데이터가 있더라도 리페치는 일어나지 않고 `paused` 상태로 대기한다.

### 깊은 이유 설명

v3에서는 오프라인 상태에서 쿼리가 "loading" 상태에 영원히 머물거나, 재시도 없이 즉시 에러가 되는 등의 문제가 있었다. v4의 `fetchStatus`는 **"데이터 보유 여부(status)"**와 **"queryFn 실행 여부(fetchStatus)"**를 분리하여, `status: 'success'`이면서 `fetchStatus: 'paused'`인 상태(데이터는 있지만 백그라운드 리페치가 멈춘 상태)를 정확하게 표현할 수 있게 되었다.
