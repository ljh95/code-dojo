---
id: 24
title: "(번역) #23: Why You Need React Query"
author: "TkDodo (번역: cnsrn1874)"
source: "https://velog.io/@cnsrn1874/why-you-need-react-query"
tags: [react-query, 번역]
date: ""
---

## 개요

React Query는 React 앱에서 비동기 상태와의 상호작용을 간소화한 라이브러리입니다. 그러나 많은 개발자들이 단순히 `useEffect`에서 `fetch`할 수 있다며 추가 라이브러리가 필요 없다고 주장합니다.

이 글은 TkDodo의 "Why You Want Need React Query"를 번역한 것으로, 간단해 보이는 데이터 fetching 코드에 숨어있는 버그들을 밝히고 React Query의 필요성을 설명합니다.

---

## 문제의 코드

```jsx
// fetch-in-useEffect

function Bookmarks({ category }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState();

  useEffect(() => {
    fetch(`${endpoint}/${category}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((e) => setError(e));
  }, [category]);

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

이 간단해 보이는 10줄의 코드에는 **5개의 숨겨진 버그**가 있습니다.

---

## 발견된 5가지 버그

### 1. 경쟁 상태 🏎️

네트워크 응답은 요청 순서와 다르게 도착할 수 있습니다. `category`를 `books`에서 `movies`로 변경했는데 `movies`의 응답이 더 늦게 도착하면, UI는 `movies`를 선택했지만 `books`의 데이터를 표시하는 일관되지 않은 상태가 됩니다.

**해결 방법:**

```jsx
// ignore-flag

function Bookmarks({ category }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState();

  useEffect(() => {
    let ignore = false;
    fetch(`${endpoint}/${category}`)
      .then((res) => res.json())
      .then((d) => {
        if (!ignore) {
          setData(d);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e);
        }
      });
    return () => {
      ignore = true;
    };
  }, [category]);

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

### 2. 로딩 상태 🕑

로딩 상태가 없어서 요청이 진행 중일 때 보류 UI를 표시할 방법이 없습니다.

**해결 방법:**

```jsx
// loading-state

function Bookmarks({ category }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState();

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetch(`${endpoint}/${category}`)
      .then((res) => res.json())
      .then((d) => {
        if (!ignore) {
          setData(d);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [category]);

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

### 3. 빈 상태 🗑️

`data`를 빈 배열로 초기화하면 실제로 빈 배열이 반환된 경우와 아직 로드되지 않은 경우를 구분할 수 없습니다. `data`를 `undefined`로 초기화하는 것이 낫습니다.

```jsx
// empty-state

function Bookmarks({ category }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(); // [] → undefined
  const [error, setError] = useState();
  // ... 나머지 코드
}
```

### 4. 카테고리 변경 시 데이터와 에러가 재설정되지 않음 🔄️

`category`가 변경되어도 이전의 `data`와 `error`가 유지되어, 새 요청이 성공해도 이전의 에러가 표시될 수 있습니다.

**해결 방법:**

```jsx
// reset-state

function Bookmarks({ category }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetch(`${endpoint}/${category}`)
      .then((res) => res.json())
      .then((d) => {
        if (!ignore) {
          setData(d);
          setError(undefined); // 이전 에러 제거
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e);
          setData(undefined); // 이전 데이터 제거
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [category]);

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

### 5. StrictMode에서 두 번 실행됨 🔥🔥

개발 모드에서 `React.StrictMode`는 버그를 찾기 위해 의도적으로 effect를 두 번 호출합니다. 이를 방지하려면 추가 처리가 필요합니다.

---

## 보너스: 에러 처리 🚨

`fetch`는 HTTP 에러 응답에서 자동으로 reject하지 않으므로 수동으로 처리해야 합니다.

```jsx
// error-handling

function Bookmarks({ category }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetch(`${endpoint}/${category}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch");
        }
        return res.json();
      })
      .then((d) => {
        if (!ignore) {
          setData(d);
          setError(undefined);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e);
          setData(undefined);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [category]);

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

---

## React Query로 해결

```jsx
// react-query

function Bookmarks({ category }) {
  const { isLoading, data, error } = useQuery({
    queryKey: ["bookmarks", category],
    queryFn: () =>
      fetch(`${endpoint}/${category}`).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch");
        }
        return res.json();
      }),
  });

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

### 자동으로 해결되는 문제들:

- **경쟁 상태 제거:** 상태는 항상 입력값(카테고리)에 의해 저장됨
- **로딩 상태 제공:** 공짜로 제공되는 로딩, 데이터, 에러 상태
- **빈 상태 구분:** 명확하게 구분되며 `placeholderData` 기능으로 향상 가능
- **상태 자동 관리:** 이전 카테고리의 데이터나 에러를 받지 않음
- **중복 제거:** StrictMode 포함, 중복된 fetch가 효율적으로 제거됨

---

## 보너스: 요청 취소

```jsx
// cancellation

function Bookmarks({ category }) {
  const { isLoading, data, error } = useQuery({
    queryKey: ["bookmarks", category],
    queryFn: ({ signal }) =>
      fetch(`${endpoint}/${category}`, { signal }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch");
        }
        return res.json();
      }),
  });

  // 데이터와 에러 상태에 따른 JSX 반환
}
```

`signal`을 `fetch`에 전달하면 카테고리 변경 시 요청이 자동으로 중단됩니다.

---

## 결론

React Query는 단순한 데이터 fetching 라이브러리가 아닌 **비동기 상태 관리자**입니다. 간단한 `fetch` 작업에도 많은 엣지 케이스와 상태 관리 로직이 필요하므로, React Query를 사용하면 유지보수와 확장이 훨씬 더 쉬운 코드를 작성할 수 있습니다.
