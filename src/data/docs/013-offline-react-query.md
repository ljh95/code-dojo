---
id: 14
title: "(번역) #13: Offline React Query"
author: "TkDodo (번역: highjoon)"
source: "https://www.highjoon-dev.com/blogs/13-offline-react-query"
tags: [react-query, 번역, 오프라인]
date: ""
---

> [TkDodo](https://github.com/tkdodo)의 [Offline React Query](https://tkdodo.eu/blog/offline-react-query)를 번역한 문서입니다.

React Query는 비동기 상태 관리자입니다. 프로미스를 제공하기만 하면, 해결되든 거부되든 라이브러리는 만족합니다. 프로미스의 출처는 중요하지 않습니다.

프로미스 사용 사례 중 가장 큰 것은 데이터 불러오기입니다. 이는 활성화된 네트워크 연결을 요구합니다. 하지만 특히 모바일 기기에서 네트워크 연결이 없어도 앱이 작동해야 할 필요가 있습니다.

## v3에서의 이슈 (Issues in v3)

React Query는 오프라인 시나리오를 잘 처리합니다. 캐싱 계층을 제공하므로, 캐시가 채워져 있으면 네트워크 연결 없이도 작동합니다. v3에서 예상대로 작동하지 않을 수 있는 극단적 시나리오들:

### 1) 캐시에 데이터가 없는 경우 (no data in the cache)

다음 시나리오에서 동작이 이상해질 수 있습니다:

- 네트워크 연결이 좋은 상태에서 목록 화면으로 이동
- 연결이 끊어진 상태에서 게시글 클릭

쿼리가 "loading" 상태에 머물러 네트워크가 다시 연결될 때까지 진행되지 않습니다. React Query Devtools는 "fetching" 상태라고 표시하지만, 실제로는 "paused" 상태입니다. 이 개념이 없어서 숨겨진 구현 세부 사항으로 처리되었습니다.

### 2) 재시도를 하지 않습니다 (no retries)

재시도를 완전히 비활성화하면, 쿼리는 즉시 오류 상태로 전환되며 막을 방법이 없습니다.

### 3) 네트워크가 필요 없는 쿼리 (queries that don't need the network)

네트워크 연결이 필요 없는 쿼리(예: 웹 워커에서의 비동기 프로세싱)도 네트워크가 다시 연결되기 전까지 일시 중지됩니다. 또한 윈도우 포커스 시 실행되지 않습니다.

---

**요약**: React Query가 네트워크 연결이 필요하지 않을 때도 필요하다고 가정하는 경우(사례 3), 그리고 실행되지 않아야 할 쿼리를 실행하는 경우(사례 1, 2)라는 두 가지 주요 문제가 있습니다.

## 새로운 네트워크모드 (The new NetworkMode)

v4에서는 `networkMode` 설정을 도입하여 온라인과 오프라인 쿼리를 명확히 구분합니다. `useQuery`와 `useMutation` 옵션으로 전역적으로 또는 쿼리별로 설정할 수 있습니다.

### 온라인 (online)

v4의 기본 모드입니다. 네트워크 연결이 활성화된 경우에만 쿼리가 실행됩니다.

네트워크 연결이 없는 상황에서 쿼리는 새로운 "paused" 상태로 진입합니다. 이는 주 상태("loading", "success", "error")의 부차적 상태입니다.

예를 들어, 데이터를 성공적으로 가져왔지만 백그라운드에서 다시 불러오기가 일시 중지된 경우 "success"와 "paused" 상태가 동시에 존재할 수 있습니다.

### 데이터 불러오기 상태 (fetchStatus)

`isFetching` 플래그와 유사하게, `fetching`과 `paused`는 상호 배타적이므로 새로운 `fetchStatus`로 통합되어 `useQuery`에서 반환됩니다:

- **fetching**: 쿼리가 실제로 실행 중 - 요청이 진행 중
- **paused**: 쿼리가 실행되지 않음 - 연결 회복까지 일시 중지
- **idle**: 쿼리가 현재 실행 중이 아님

일반적으로 `status`는 데이터 정보를 제공합니다("success"는 데이터 있음, "loading"은 없음). `fetchStatus`는 `queryFn` 실행 여부를 나타냅니다.

React Query Devtools의 새로운 네트워크 모드 토글 버튼으로 테스트할 수 있으며, 새로운 보라색 "paused" 상태 배지로 명확히 볼 수 있습니다.

### 항상 (always)

이 모드에서 React Query는 네트워크 연결을 신경쓰지 않습니다. 쿼리는 항상 실행되며 일시 중지되지 않습니다. 데이터 불러오기 이외의 용도로 사용할 때 유용합니다.

### 오프라인 우선 (offlineFirst)

GitHub 저장소 API 같은 경우, 응답 헤더에 캐시 제어 정보가 포함됩니다:

```
cache-control: public, max-age=60, s-maxage=60
```

이는 다음 60초 동안 브라우저 캐시에서 응답을 제공함을 의미합니다. 오프라인 우선 PWA와 서비스 워커도 유사하게 작동합니다.

React Query가 네트워크 연결이 없다고 판단하면 요청이 발생하지 않아 캐시 가로채기가 작동하지 않습니다. 따라서 추가 캐시 레이어가 있으면 `networkMode: 'offlineFirst'`를 사용하세요.

첫 요청이 캐시를 히트하면 "success" 상태로 전환되고 데이터를 받습니다. 캐시 미스 시 네트워크 오류가 발생하면, React Query는 재시도를 일시 중지하여 쿼리를 "paused" 상태로 전환합니다. 이는 두 장점을 모두 활용합니다.

## 이 모든 것이 여러분에게 어떤 의미가 있을까요? (What does all of this mean for me, exactly?)

원하지 않으면 아무 영향이 없습니다. `isLoading`만 확인하면 React Query는 이전과 동일하게 작동합니다.

그러나 네트워크 연결이 없는 상황에서도 앱을 견고하게 만들려면, 공개된 `fetchStatus`를 사용하여 적절히 대응할 수 있습니다.

이 새로운 상태를 어떻게 활용할지는 개발자에게 달려 있습니다.
