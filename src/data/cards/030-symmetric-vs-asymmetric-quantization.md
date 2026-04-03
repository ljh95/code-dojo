---
id: 30
title: "Symmetric vs Asymmetric Quantization - 비대칭이 더 나은 이유"
tags: ["quantization", "asymmetric", "scale-factor", "LLM"]
difficulty: "medium"
sourceDoc: [32]
---

## 질문

LLM 파라미터를 4비트로 양자화하는 두 가지 방식을 비교하려 한다. 아래 두 함수의 동작을 분석하시오.

```javascript
// 방식 A: 대칭 양자화
function quantizeSymmetric({ values, bits }) {
    const vmax = Math.max(...values.map(Math.abs)); // 0.89
    const qmax = 2 ** (bits - 1) - 1;               // 7
    const scale = vmax / qmax;                       // 0.1271...
    return {
        values: values.map((v) => Math.round(v / scale)),
        scale,
    };
}

// 방식 B: 비대칭 양자화
function quantizeAsymmetric({ values, bits }) {
    const vmax = Math.max(...values);                // 0.16
    const vmin = Math.min(...values);                // -0.89
    const qmax = 2 ** (bits - 1) - 1;               // 7
    const qmin = -(2 ** (bits - 1));                 // -8
    const scale = (vmax - vmin) / (qmax - qmin);     // 0.07
    const zero = qmin - Math.round(vmin / scale);    // 5
    return {
        values: values.map((x) => Math.round(x / scale + zero)),
        scale,
        zero,
    };
}

const values = [-0.89, 0.16, 0.08, -0.13, 0.16, -0.54];
```

1. 방식 A에서 양의 범위(0~7)가 실제로 어디까지 사용되는지 계산하고, **낭비되는 표현 공간**이 얼마나 되는지 설명하시오.
2. 방식 B가 `zero`(영점)를 별도로 저장하는 이유는 무엇인가? 역양자화 공식 `scale * (x - zero)`에서 `zero`의 역할을 설명하시오.
3. 같은 4비트에서 방식 A의 평균 오차는 18.0%, 방식 B는 8.5%다. 이 차이가 발생하는 **근본 원인**을 데이터 분포 관점에서 설명하시오.

**힌트:** 데이터의 최솟값(-0.89)과 최댓값(0.16)이 0을 기준으로 대칭인지 생각해보자.

---answer---

## 정답: 비대칭 양자화 (Asymmetric Quantization)

### 핵심 아이디어

대칭 양자화는 **0을 항상 중앙에 고정**하기 때문에, 데이터가 한쪽으로 치우쳐 있으면 반대쪽 표현 공간이 낭비된다. 비대칭 양자화는 **데이터의 실제 범위에 맞춰** 표현 공간을 할당하므로, 같은 비트 수에서 더 높은 정밀도를 얻는다.

### 단계별 해설

**1. 대칭 양자화의 공간 낭비**

```javascript
// 대칭 양자화: 범위를 -0.89 ~ +0.89로 잡음
// 실제 양의 최댓값은 0.16뿐
// 양의 방향 7단계 중 0.16/0.89 ≈ 1.26단계만 사용
// → 나머지 ~5.74단계(약 82%)가 낭비됨

const sym = quantizeSymmetric({ values, bits: 4 });
// [-7, 1, 1, -1, 1, -4]
// 양의 값들이 전부 1로 뭉개짐 → 0.16과 0.08을 구분 불가
```

**2. 비대칭 양자화의 영점(zero point)**

```javascript
// 비대칭: 실제 범위 -0.89 ~ 0.16에 맞춰 스케일링
// zero = 5는 "원래 0이었던 값"이 양자화 공간에서 5에 매핑된다는 뜻
// 역양자화 시 이 오프셋을 빼서 원래 위치로 복원

const asym = quantizeAsymmetric({ values, bits: 4 });
// [-8, 7, 6, 3, 7, -3]
// 0.16은 7, 0.08은 6 → 서로 다른 값으로 구분 가능!

function dequantize({ values, scale, zero }) {
    return values.map((x) => scale * (x - zero));
    // x=7: 0.07 * (7 - 5) = 0.14  (원본 0.16, 오차 12.5%)
    // x=6: 0.07 * (6 - 5) = 0.07  (원본 0.08, 오차 12.5%)
}
```

**3. 오차 비교**

| 원본 | 대칭 복원 | 대칭 오차 | 비대칭 복원 | 비대칭 오차 |
|------|----------|----------|-----------|-----------|
| -0.89 | -0.89 | 0.0% | -0.91 | 2.2% |
| 0.16 | 0.127 | 20.6% | 0.14 | 12.5% |
| 0.08 | 0.127 | 58.9% | 0.07 | 12.5% |
| **평균** | | **18.0%** | | **8.5%** |

### 깊은 이유 설명

LLM의 파라미터 분포는 대부분 **0 근처에 밀집**하지만, **완전히 대칭은 아니다**. 레이어마다, 블록마다 음의 방향이나 양의 방향으로 치우침(skew)이 있다. 대칭 양자화는 이런 치우침을 무시하고 양쪽 동일한 범위를 할당하므로, 한쪽의 표현 공간이 체계적으로 낭비된다.

비대칭 양자화는 `zero`라는 추가 메타데이터(보통 블록당 1개 정수)를 저장하는 대신, 16개의 표현 가능한 값 **전부**를 실제 데이터 범위에 맞게 사용한다. 이 작은 오버헤드가 오차를 **절반 가까이** 줄여주므로, 4비트 양자화에서는 거의 항상 비대칭 방식이 선호된다.

> 실제 llama.cpp에서 `Q4_0`은 대칭, `Q4_1`은 비대칭 양자화다. Q4_1이 블록당 `scale` + `zero` 두 값을 저장하여 약간 더 크지만, 퍼플렉서티는 Q4_0(8.71)보다 Q4_1(8.563)이 낫다.
