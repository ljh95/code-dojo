---
id: 31
title: "Block Quantization - 이상치와 블록 크기의 트레이드오프"
tags: ["quantization", "block-size", "outlier", "LLM"]
difficulty: "medium"
sourceDoc: [32]
---

## 질문

다음은 LLM 파라미터를 4비트 대칭 양자화하는 함수다. 이 함수를 **전체 파라미터 배열에 한 번에 적용**했을 때 발생하는 문제를 분석하시오.

```javascript
function quantize({ values, bits }) {
    const vmax = Math.max(...values.map(Math.abs));
    const qmax = 2 ** (bits - 1) - 1;
    const scale = vmax / qmax;
    return {
        values: values.map((v) => Math.round(v / scale)),
        scale,
    };
}

// 시나리오: 이상치가 포함된 파라미터
const params = [-0.89, 0.16, 0.08, -0.13, 0.16, -0.54, 10.0];
const result = quantize({ values: params, bits: 4 });
// scale = 10.0 / 7 = 1.4286
// 양자화 결과: [-1, 0, 0, 0, 0, 0, 7]
```

1. 이상치 `10.0` 하나가 추가되었을 때, 나머지 6개 파라미터의 양자화 결과가 대부분 `0`이 되는 이유를 **scale 값 변화**로 설명하시오.
2. 이 문제를 해결하기 위해 **블록 단위 양자화**를 적용한다고 할 때, 아래 함수에서 `blockSize`가 작을수록/클수록 어떤 트레이드오프가 발생하는지 설명하시오.

```javascript
function quantizeBlocks({ values, bits, blockSize }) {
    const blocks = [];
    for (let i = 0; i < values.length; i += blockSize) {
        const block = values.slice(i, i + blockSize);
        const vmax = Math.max(...block.map(Math.abs));
        const qmax = 2 ** (bits - 1) - 1;
        const scale = vmax / qmax;
        blocks.push({
            values: block.map((v) => Math.round(v / scale)),
            scale, // 블록마다 별도 저장 → 오버헤드
        });
    }
    return blocks;
}
```

3. 실무에서 이상치를 **양자화하지 않고 별도 테이블에 저장**하는 이유는 무엇인가?

**힌트:** scale은 전체 범위를 기준으로 계산된다. 범위가 넓어질수록 "한 칸"의 간격이 어떻게 변하는지 생각해보자.

---answer---

## 정답: 블록 단위 양자화 (Block Quantization)

### 핵심 아이디어

이상치(outlier)가 scale을 지배하면 **나머지 값들의 표현 해상도가 극단적으로 떨어진다**. 블록 단위 양자화는 이상치의 영향을 해당 블록에 **국한**시키고, 나머지 블록은 자체 범위에 맞는 정밀한 scale을 가질 수 있게 한다.

### 단계별 해설

**1. 이상치가 scale을 지배하는 문제**

```javascript
// 이상치 없을 때
// scale = 0.89 / 7 = 0.127 → "한 칸" = 0.127
// 0.16은 0.16/0.127 ≈ 1.26 → 반올림하여 1 ✅

// 이상치 10.0 추가 시
// scale = 10.0 / 7 = 1.4286 → "한 칸" = 1.4286
// 0.16은 0.16/1.4286 ≈ 0.112 → 반올림하여 0 ❌
// -0.89는 -0.89/1.4286 ≈ -0.623 → 반올림하여 -1

// 결과: 7개 파라미터 중 5개가 0으로 뭉개짐
// 평균 오차: 116.8% (이상치 없을 때 18.0%)
```

핵심은 scale이 `0.127 → 1.4286`으로 **11배** 커졌다는 것이다. 양자화의 "눈금 간격"이 11배 넓어져서, 작은 값들이 전부 같은 눈금에 매핑된다.

**2. 블록 크기 트레이드오프**

```javascript
// blockSize = 2 (작은 블록)
// 장점: 이상치 블록 = [10.0, -0.54]만 scale이 크고
//        나머지 블록은 각각 최적의 scale을 가짐
// 단점: 블록 수 = values.length / 2 → scale 저장 많음
//        7개 값에 4개 블록 → 4개의 scale(float16) 필요

// blockSize = 256 (큰 블록)
// 장점: 오버헤드 적음 (256개당 scale 1개)
// 단점: 이상치가 포함된 블록의 범위가 넓어져
//        같은 블록 내 255개 값의 정밀도가 떨어짐
```

| 블록 크기 | 오버헤드 | 이상치 영향 범위 | 정밀도 |
|-----------|---------|----------------|--------|
| 작음 (32) | 높음 | 좁음 (32개만 피해) | 높음 |
| 큼 (256) | 낮음 | 넓음 (256개 피해) | 낮음 |

**3. 이상치 별도 저장**

```javascript
// 개념적 구현
function quantizeWithOutlierTable({ values, bits, blockSize, threshold }) {
    const outlierTable = {}; // { index: originalValue }

    // 1단계: 이상치 분리
    const cleaned = values.map((v, i) => {
        if (Math.abs(v) > threshold) {
            outlierTable[i] = v; // 원본 값 보존
            return 0;            // 블록에서 제거
        }
        return v;
    });

    // 2단계: 이상치 제거된 값으로 양자화 → scale이 작아져 정밀도 ↑
    const blocks = quantizeBlocks({ values: cleaned, bits, blockSize });

    return { blocks, outlierTable };
}
```

### 깊은 이유 설명

LLM에는 극소수의 **"슈퍼 가중치(super weight)"**가 존재한다. Apple의 연구에 따르면, 이 중 **단 하나만 제거해도** 모델이 완전한 헛소리를 출력할 수 있다. 이상치는 모델 품질에 극도로 중요하지만, 양자화에는 극도로 해롭다.

실무에서 사용하는 블록 크기는 보통 **32~256개**다. 이 범위가 "오버헤드 vs 정밀도" 트레이드오프의 실용적 균형점이다. 예를 들어 블록 크기 32에서 대칭 양자화를 하면, 32개의 4비트 정수(16바이트) + 1개의 float16 scale(2바이트) = **총 18바이트**로, 오버헤드는 약 12.5%다.

> llama.cpp의 `Q4_0` 포맷은 블록 크기 32의 대칭 양자화, `Q2_K`는 더 복잡한 블록 구조를 사용한다.
