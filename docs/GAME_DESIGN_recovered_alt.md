# Sneaky Swing — Game Design Document

## 1. 核心定位

Sneaky Swing 是一个真实挥杆数据驱动的高尔夫自走棋游戏。

玩家上传训练记录后，系统生成一个高尔夫分身。分身拥有三个核心属性：

| 属性        | 作用                |
| --------- | ----------------- |
| **Power** | 决定最大推进距离          |
| **Aim**   | 决定二维方向偏移          |
| **Touch** | 决定距离控制、短杆处理、进洞手感、波动稳定 |

核心原则：

> **Power 控制上限，Aim 控制落点质量，Touch 控制停球和波动。任何改动都不能让其中一个属性替代另外两个。**

玩家会根据自己的真实 swing issue 获得一个 **Swing Issue**。
Issue 不是低分惩罚，而是挥杆问题类型决定的"发病机制"。

---

## 2. 配置驱动架构

所有游戏机制参数集中在 `src/appConfig.js` 的 `game` 字段，Board.jsx 通过解构读取。**调参不需要动判定逻辑代码。**

```text
appConfig
├── cards.enabled         ← 卡牌系统开关（由赛前牌组选择决定：Base/Brainrot=true, RAW=false）
├── cards.deckType        ← 牌组类型（'base' / 'brainrot'）
├── board.aspectRatio     ← 棋盘宽高比
└── game
    ├── ydToPct              ← 码数 ↔ 棋盘比例（0.20）
    ├── clutchThresholdYd    ← 进洞模式切换距离（20 yd）
    ├── powerToRange         ← Power → 最大推距表（16 档, 0-15）
    ├── aimToOffsetRate      ← Aim → 横偏率表（15 档, 1-15）
    ├── parLayout            ← 18 洞赛程
    ├── holeDistance          ← 各 Par 洞距生成范围
    ├── distBounds           ← 采样区间系数（min / softCap / maxPushSoftCap）
    ├── burstRate            ← Hard cap 爆发率三档
    ├── clutchBaseChance     ← Clutch 基础进洞率（5 档距离）
    ├── clutchMissDistance    ← Clutch 未进剩余距离（5 档距离）
    ├── outcomeThresholds    ← great/good/okay/holed/pinseeker 判定阈值
    ├── rangeBandInfluence   ← 距离段属性影响力（P3）
    ├── offsetPenaltyRate    ← 偏移惩罚率 0.6（P3）
    └── timing               ← 动画与节奏参数（含 holedReset）
```

---

## 3. 两套判定

```text
20 码外：Field Shot / 推进判定
20 码内：Clutch Roll / 进洞判定
```

不强制走完固定阶段。强玩家可以两杆进洞，弱玩家可能四五杆。20 码内直接进入进洞骰，不会出现洞边永远进不了的情况。

---

## 4. 一杆结算逻辑

### A. 20 码外：推进判定（sample-first 三层独立采样）

```text
power → 决定 maxDistance
aim   → 决定 maxOffset（左右偏移上限）
touch → 决定距离采样集中度（实际推进接近理想距离的程度）和整体波动
shot result → 根据最终落点反推出 great / good / bad
```

流程：

```text
1. 根据 Power 得到 maxPush
2. idealDistance = min(currentDistance, maxPush)
3. 用 Aim + Touch 计算 ControlScore
4. Breakthrough Roll（见 §11）
   - miracle → 直接进洞
   - pinseeker → 直接贴洞 2-8yd
   - clean → effectiveTouch 临时 +2
5. Power Reserve Bonus（短洞有余力时提升 Touch）
6. sampleAroundIdeal 距离采样（stability = effectiveTouch）
7. Burst Rate 截断
8. sampleAroundIdeal 偏移采样（stability = aim）
9. Range-Band 缩放偏移 + Offset Penalty
10. Aim Consistency Bonus（Aim ≥ 7 时缩减偏移）
11. 转换为棋盘坐标落点
12. 过冲检测（Touch < 7 时）
13. 落点 ≤ 1yd → 自动进洞
14. labelShot 反推 outcome 标签
```

#### Power Reserve Bonus

短洞时有余力可以提升距离控制精度：

```text
powerReserve = (maxPushYd - distYd) / maxPushYd
如果 powerReserve > 0.3:
  effectiveTouch = min(10, effectiveTouch + floor(powerReserve × 3))
```

#### Aim Consistency Bonus

高 Aim 在偏移采样后额外缩减偏移量：

```text
如果 aim >= 7: offsetYd *= (1 - (aim - 6) × 0.1)
```

| Aim | 缩减系数 |
| --- | ------: |
| 7 | ×0.90 |
| 8 | ×0.80 |
| 9 | ×0.70 |
| 10 | ×0.60 |

#### `sampleAroundIdeal(ideal, min, max, stability)`

stability 高 → 多次随机取平均 → 自然聚集在 ideal 附近。stability 低 → 接近均匀分布。

#### 距离区间

```text
minDistance = idealDistance × (0.3 + effectiveTouch × 0.06)
softCap    = min(idealDistance × 1.12, maxPush × 1.05)
hardCap    = maxPush × burstRate
burstRate  = touch >= 8 ? 1.05 : touch >= 5 ? 1.03 : 1.02
actualDistance = clamp(sampleAroundIdeal(ideal, min, softCap, touch), 0, hardCap)
```

| Touch | 采样下限 | 含义 |
|-------|---------|------|
| 2 | ideal × 0.42 | 容易短 |
| 5 | ideal × 0.60 | 标准 |
| 10 | ideal × 0.90 | 几乎理想距离 |

#### 偏移区间

```text
maxOffset = actualDistance × AIM_TO_OFFSET_RATE[aim]
idealOffset = 0（正对洞口）
```

公式：`~1.7 × e^(-0.42×aim)`

| Aim | 偏移率 | 说明 |
| --- | -----: | --- |
| 1   |  1.10  | 极不稳定 |
| 2   |  0.73  | 不稳定 |
| 3   |  0.49  | 偏移明显 |
| 4   |  0.32  | 偏移中等 |
| 5   |  0.22  | 普通 |
| 6   |  0.14  | 较好 |
| 7   |  0.095 | 小幅偏移 |
| 8   |  0.063 | 稳定 |
| 9   |  0.042 | 很稳定 |
| 10  |  0.028 | 几乎笔直 |
| 11  |  0.018 | Brainrot: 超人 |
| 12  |  0.012 | Brainrot: 精确制导 |
| 13  |  0.008 | Brainrot: 几何级精确 |
| 14  |  0.005 | Brainrot: 纳米级 |
| 15  |  0.003 | Brainrot: 完美直线 |

#### Power → Max Push（递减收益）

| Power | Max Push | 定位 |
| ----- | -------: | --- |
| 0     |    20 yd | 完全新手 |
| 5     |   100 yd | 普通玩家 |
| 7     |   130 yd | 强玩家 |
| 10    |   162 yd | 接近职业水准 |
| 11    |   171 yd | Brainrot: 溢出开始 |
| 13    |   186 yd | Brainrot: 61% 飞过头 |
| 15    |   197 yd | Brainrot: 95% 飞过头 |

#### Range-Band 缩放 + Offset Penalty（P3）

三属性在不同距离段的影响力不同：

```text
距离段        Power  Aim   Touch   主导属性
180+ yd      1.00   0.50  0.20   Power
80–180 yd    0.80   1.00  0.60   Aim
20–80 yd     0.40   0.90  0.90   Aim + Touch
0–20 yd      0.10   0.40  1.00   Touch (Clutch Roll)
```

偏移区间受 range band 缩放：`maxOffset × (0.5 + band.aim × 0.5)`。
180+ yd 时 Aim 偏移被压缩到 75%，80-180 yd 时放大到 100%。

偏移惩罚：横向 miss 转化为纵向后退距离：

```js
const penaltyYd = absOffset * offsetPenaltyRate * band.aim  // offsetPenaltyRate = 0.6
```

180+ yd 只退 30%（0.6 × 0.5），80-180 yd 退 60%（0.6 × 1.0）。

---

### B. 20 码内：Clutch Roll / 进洞判定

```text
touchBonus = 0.7 + 0.3 × (Touch / 10)^0.6
FinalMakeChance = clamp(BaseChance × touchBonus, 5%, 95%)
```

基础进洞率（arcade 化，高于真实高尔夫）：

| 距离       | Base Chance |
| -------- | ----------: |
| 0–2 yd   |         95% |
| 2–5 yd   |         82% |
| 5–10 yd  |         60% |
| 10–15 yd |         42% |
| 15–20 yd |         28% |

没进时生成新的短距离。Touch 高的人没进也贴近洞口，Touch 低的人可能推过头。

---

## 5. 结果标签：从落点反推

outcome 不是核心判定，而是根据实际落点反推的标签。

| 条件                          | 标签 |
| ----------------------------- | --- |
| remainingYd ≤ 1yd             | holed |
| remainingYd ≤ 5yd             | pinseeker |
| progress ≥ 85% 且 \|offset\| ≤ 5   | great |
| progress ≥ 65% 且 \|offset\| ≤ 10  | good |
| progress ≥ 40%                | okay |
| 其余                          | bad |

---

## 6. Swing Issue 机制

Issue 来自真实 swing issue，每个只影响一件事：

| Swing Issue         | 游戏效果 |
| ------------------- | --- |
| Early Extension     | Aim −2，偏移放大 ×1.5 |
| Casting             | 距离 −25% |
| Over the Top        | 右偏优先 |
| Poor Face Control   | Aim −2，方向随机 |
| Sway                | 距离随机 ±10–25% |
| Slide               | 距离 −10% |
| Reverse Spine Angle | 结果降两级 |
| Loss of Posture     | 结果降一级 |
| Hanging Back        | Max Push −20% |
| Poor Tempo          | 随机小坏事（距离 −20% / Aim −2 / Touch −2） |

结果等级链：Great → Good → Okay → Bad。

> 分数影响 Power/Aim/Touch，问题类型影响 Issue。高分玩家和低分玩家可以有同一个 Issue。

---

## 7. 卡牌机制

卡牌作为轻量策略入口，所有效果由 4 个底层系统承载。Phase 1–3 已实现（属性卡、天气卡、动物卡），Check 卡待后续实现。详细设计见 `docs/0509_Cards.md`。Brainrot 抽象牌组（10 张，属性可超限 + 物理崩坏）详见 `docs/0511_BRAINROT_DECK.md`。

```text
① Player Stat Modifier — 击球前改属性 ← 已实现
② Weather Modifier       — 击球后改偏移/推进 ← 已实现
③ Animal Event Modifier  — 落地后改位置/对手属性 ← 已实现
④ Check Modifier         — 改判定 ← 待实现
```

### ① 属性调整卡（7 张）

击球前修改 Power / Aim / Touch。

| 卡牌 | 效果 | 代价 |
| ---- | ---- | ---- |
| Red Bull | Power +2 | Touch −1 |
| Drunk Swing | Power 随机 ±3 | 播报变怪 |
| Zen Mode | Touch +2 | Power −1 |
| Hot Head | Power +1, Aim +1 | Issue 触发率 +30% |
| Iron Grip | Aim +3 | Touch −2 |
| Power Nap | Touch +1, Power +1 | Aim −1 |
| Blind Faith | Power +4 | Aim −3 |

### ② 天气卡（5 张）

击球后修改弹道结果，对所有玩家生效。持续 1 个 Stage（全员各打一杆）。

| 卡牌 | 效果 | 一句话 |
| ---- | ---- | ---- |
| Left Wind | 所有球左偏 5–15yd | Blowin' in the wind |
| Right Wind | 所有球右偏 5–15yd | Wind's doing its thing |
| Rain | 推进距离 −30% | Can't hit far in the rain |
| Tailwind | 推进距离 +20% | Perfect breeze. Charge! |
| Fog | 所有球随机偏移 3–8yd | Can't see a thing out here |

### ③ 小动物卡（5 张）

落地后触发，改最终位置或对手属性。动物卡在 `BALL_LANDED` 而非 `FIRE_SHOT` 时结算。

| 卡牌 | 效果 | 目标 | 一句话 |
| ---- | ---- | ---- | ---- |
| Squirrel Tax | 球被随机位移 5–20yd | 对手 | That squirrel took your ball |
| Mole Tunnel | 球往前跳 10–30yd | 自己 | Mole bro's got your back |
| Angry Goose | 对手下一杆 Touch −2 | 对手 | The goose is watching you |
| Sly Fox | 对手下一杆 Aim −2 | 对手 | Fox stole your sense of direction |
| Lucky Rabbit | 球往前跳 5–15yd | 自己 | The rabbit knows a shortcut |

### 卡牌与挥杆管线的结合方式

卡牌系统通过**分层顺序管线**与三属性落点计算结合。每一层卡牌操作不同的数据、在不同的时机介入，天然不会冲突。

```text
                 输入                          输出
                   │                            │
                   ▼                            │
┌─────────────────────────┐                     │
│  ① Player Stat Modifier │ ── 改的是 pStats    │
│     (属性卡 / 饮料卡)     │    (calculateGame-  │
│                         │     Landing 的输入)  │
└───────────┬─────────────┘                     │
            │                                   │
            ▼                                   │
┌─────────────────────────┐                     │
│  calculateGameLanding   │ ←── 核心物理计算     │
│  (Power/Aim/Touch →     │     不感知卡牌存在   │
│   endX, endY, outcome)  │                     │
└───────────┬─────────────┘                     │
            │                                   │
            ▼                                   │
┌─────────────────────────┐                     │
│  ② Weather Modifier    │ ── 改的是 landing    │
│     (天气卡)            │    (物理计算的结果)   │
└───────────┬─────────────┘                     │
            │                                   │
            ▼                                   │
         [球飞行动画]                             │
            │                                   │
            ▼                                   │
┌─────────────────────────┐                     │
│  ③ Animal Event         │ ── 改的是 playerPos  │
│     (动物卡 / 生物卡)     │    (球在棋盘的位置)  │
└───────────┬─────────────┘                     │
            │                                   │
            ▼                                   │
┌─────────────────────────┐                     │
│  ④ Meta Event           │ ── 改的是游戏状态     │
│     (Brainrot 独有)      │    (换球/重置洞)     │
└───────────┬─────────────┘                     │
            │                                   │
            ▼                                   ▼
         final endX, endY → state.playerPos 更新
```

#### 为什么不会冲突

| 层级 | 操作对象 | 介入时机 | 读什么 | 写什么 |
|------|---------|---------|--------|--------|
| ① 属性卡 | `pStats` | 击球前 | 玩家原始属性 | Power/Aim/Touch 数值 |
| ② 天气卡 | `landing` | 物理计算后 | calculateGameLanding 返回值 | endX/endY |
| ③ 动物卡 | `playerPos` | 球落地后 | 球的最终位置 | endX/endY |
| ④ Meta | 游戏状态 | 落地后/结算后 | state | playerPos/holePos/杆数 |

**每一层写入的数据都是下一层的输入，且每层只写自己负责的字段。** 不存在两层同时修改同一个值的情况。

更具体地：

1. **属性卡改的是 `calculateGameLanding` 的输入参数**。它不知道也不关心球最终落哪——它只调整"你用什么属性去打这杆"。物理计算函数本身不感知卡牌存在，和没有卡时完全一样。

2. **天气卡改的是 `calculateGameLanding` 的返回值**。它拿到的 `landing` 是一个纯数据对象（endX/endY/remainingYd），修改后传给动画系统。它不碰属性，因为属性已经用完了。

3. **动物卡改的是球在棋盘上的位置**。它在 `BALL_LANDED` 时触发，拿到的 `playerPos` 已经是天气修改后的最终飞行落点。它只做位置增减，不碰属性也不重新计算弹道。

4. **Meta 卡操作的是更高层的游戏状态**（互换位置、重置整洞），在③之后执行。此时球的落点已经完全确定。

#### ① 属性卡如何影响落点

属性卡在 `fireGameShot()` 中、调用 `calculateGameLanding` 之前执行：

```js
// Board.jsx fireGameShot()
const pStats = { ...players[ti].stats }  // 复制原始属性

// 1) 先应用 cardPenalties（动物卡的持续性惩罚，如 Angry Goose Touch-2）
for (const pen of cardPenalties) {
  if (pen.targetPlayerIdx === ti && pen.remainingSwings > 0)
    pStats[pen.stat] = clamp(pStats[pen.stat] + pen.mod, 1, 10)
}

// 2) 再应用 activeCard（属性卡）
const card = gs.activeCard
if (card?.system === 'player_stat') {
  const eff = card.effect
  if (eff.powerMod)    pStats.power = clamp(pStats.power + eff.powerMod, 1, 10)
  if (eff.aimMod)      pStats.aim   = clamp(pStats.aim   + eff.aimMod,   1, 10)
  if (eff.touchMod)    pStats.touch = clamp(pStats.touch + eff.touchMod, 1, 10)
  if (eff.powerRandom) pStats.power = clamp(pStats.power + randInt(-eff.powerRandom, eff.powerRandom), 1, 10)
}

// 3) 修改后的 pStats 传入物理计算
let landing = calculateGameLanding(pp, hole, hole.x, hole.y, pStats)
```

每个属性影响落点的路径：

| 属性 | 影响 | 落点公式中的位置 |
|------|------|----------------|
| **Power** | `maxPushYd = POWER_TO_RANGE[power]` → 决定球最远能飞多远 | `idealDistYd = min(distYd, maxPushYd)` → `actualDistYd` → `endX/endY` 的 `dirX×distancePct` 分量 |
| **Aim** | `AIM_TO_OFFSET_RATE[aim]` → 决定横向偏移上限 | `maxOffsetYd = actualDist × offsetRate` → `offsetYd` → `endX/endY` 的 `perpX×offsetPct` 分量 |
| **Touch** | `sampleAroundIdeal(..., touch)` → 决定距离采样集中度 | `actualDistYd` 趋向 `idealDistYd` 的程度；Clutch 时决定进洞率 |

**举例：Red Bull (Power+2, Touch-1)**

```
Marcus (P8,A3,T4) + Red Bull → pStats = {power:10, aim:3, touch:3}

calculateGameLanding({power:10, aim:3, touch:3}):
  maxPushYd = 162 (P10 → 比 P8 的 142 多 20yd)
  idealDistYd = min(250, 162) = 162
  actualDistYd ≈ 130-155 (Touch 3 → 采样较散，可能偏短)
  maxOffsetYd = 155 × 0.49 = 76 (Aim 3 → 偏移大)
  endX = pp.x + dirX × distPct + perpX × offsetPct
  endY = pp.y + dirY × distPct + perpY × offsetPct

→ 球飞更远（P10=162 vs P8=142），但距离控制更差（T3 vs T4）
```

#### ② 天气卡如何影响落点

天气卡在 `calculateGameLanding` 返回之后、`FIRE_SHOT` dispatch 之前执行：

```js
// Board.jsx fireGameShot() — calculateGameLanding 之后
const weather = gs.activeWeather
if (weather?.effect) {
  if (weather.effect.offsetXRange) {
    const offsetYd = randRange(weather.effect.offsetXRange)
    landing.endX += offsetYd * YD_TO_PCT          // 横向偏移
  }
  if (weather.effect.pushMultiplier !== 1.0) {
    const dx = landing.endX - pp.x, dy = landing.endY - pp.y
    const ratio = 1 - weather.effect.pushMultiplier
    landing.endX -= dx * ratio                     // 距离缩放
    landing.endY -= dy * ratio
  }
  // 重算 remainingYd
  landing.remainingYd = distPct(landing, hole) / YD_TO_PCT
}
```

天气卡**不碰属性**。它操作的是已经算好的 `endX/endY` 坐标：

| 天气效果 | 操作 | 数学 |
|---------|------|------|
| Left/Right Wind | 横向偏移 | `endX += offsetYd × YD_TO_PCT` |
| Rain/Tailwind | 距离缩放 | `endX -= dx × (1-multiplier)` / `endY -= dy × (1-multiplier)` |
| Fog | 随机偏移 | 同 Left/Right Wind，范围更大 |

**距离缩放的数学**：把 `(endX-pp.x)` 和 `(endY-pp.y)` 看作飞行向量，乘以 `pushMultiplier` 就是缩放这个向量。Rain (0.7) 缩短 30%，Tailwind (1.2) 放大 20%。方向不变，只有长度变化。

**为什么天气不影响属性**：天气改变的是"球实际飞到哪"，而不是"你用什么力量打"。相当于球在空中遇到了风或雨，你的挥杆本身没变。

#### ③ 动物卡如何影响落点

动物卡在 `BALL_LANDED` 时触发（球飞完动画、落地之后）。它操作的是 `state.playerPos`（球在棋盘上的位置），不碰属性也不重新计算弹道：

```js
// useBallAnimation.js — resolveAnimalEvent()
if (eff.displacementAxis === 'forward') {
  // 向洞口方向位移（如 Mole Tunnel）
  const dx = holePos.x - pos.x, dy = holePos.y - pos.y
  const d = Math.sqrt(dx*dx + dy*dy)
  const clamped = Math.min(distPct, d * 0.5)      // 最多靠近50%
  newPos = { x: pos.x + dx/d × clamped, y: pos.y + dy/d × clamped }
}
else {
  // 随机方向位移（如 Squirrel Tax）
  const angle = Math.random() * Math.PI * 2
  newPos = { x: pos.x + cos(angle) × distPct, y: pos.y + sin(angle) × distPct }
}
```

| 动物效果 | 操作 | 数学 |
|---------|------|------|
| 向前位移 | 向洞口方向移动 | `pos += normalize(hole-pos) × min(dist, d×0.5)` |
| 随机位移 | 随机方向移动 | `pos += random_angle × dist` |
| 属性惩罚 | 写入 cardPenalties 数组 | `{stat:'touch', mod:-2, remainingSwings:1, targetPlayerIdx}` |

**属性惩罚不立即生效**：Angry Goose (Touch-2) 不是当场改属性，而是写入 `cardPenalties` 数组。下次对手击球时，`fireGameShot` 在步骤①中读取并应用，然后递减 `remainingSwings`。这保证了惩罚在正确的时机、以正确的管线层级生效。

#### Brainrot 牌组的额外层

Brainrot 牌组（详见 `docs/0511_BRAINROT_DECK.md`）在管线中复用相同的 4 个层级，只是效果更极端：

```text
Brainrot 在各层的扩展:

① 属性层:
   - allowOverflow: clamp 范围从 [1,10] 扩展到 [1,15]
   - powerOverride/aimOverride: 强制设定（非增减）
   - randomizeAll: 全属性重新随机
   - copyOpponentStats: 用对手属性替换自己
   - 溢出检测(overflowCheck): Power>10 后概率飞过头

② 天气层:
   - pushMultiplier 1.8 (vs 基础牌组最大 1.2)
   - offsetXRange [-30,30] (vs 基础牌组最大 [-15,-5])
   - 使用完全相同的代码路径，只是数值更大

③ 动物层:
   - displacementRange [30,60] (vs 基础牌组最大 [10,30])
   - teleportNearHole: 传送到洞口附近（新增分支）
   - swapPositions: 互换两个球的位置（新增分支）

④ Meta 层 (Brainrot 独有):
   - resetHole: 重置整洞（复用 TRANSITION_HOLE action）
```

**溢出检测（overflowCheck）** 是 Brainrot 唯一在管线中新增的步骤，位于 `calculateGameLanding` 之后、天气修改之前：

```js
// 在 weather modifier 之前
if (pStats.power > 10) {
  const ov = checkOverflow(pStats.power)
  if (ov) {
    // 沿飞行方向放大距离
    landing.endX = pp.x + (landing.endX - pp.x) * ov.distMultiplier
    landing.endY = pp.y + (landing.endY - pp.y) * ov.distMultiplier
    // 额外横向混乱
    landing.endX += randRange(-ov.wobbleYd, ov.wobbleYd) * YD_TO_PCT
  }
}
```

溢出检测修改的是 `landing`（和天气卡相同的对象），但它操作的是飞行向量的**长度倍率**，而天气卡操作的是**固定偏移或比例缩放**。两者不会互相干扰，因为它们的数学操作是独立的（先放大距离，再叠加偏移）。

### 发牌与手牌规则

```text
每个 Stage 完成后发 1 张（全员各打一杆 = 1 Stage）
最多持有 4 张（手牌满时不发）
转洞时丢弃全部手牌
可选使用 / 跳过 / 交换（2 张旧牌换 1 张新牌）
```

`appConfig.cards.enabled` 控制开关。关闭时不发牌、不显示 UI、直接自动击球。开关由赛前牌组选择决定：选择 Base 或 Brainrot 时 `enabled=true`，选择 "I Want It RAW" 时 `enabled=false`。

数据结构：`src/cards.js`（卡牌定义）、`DeckPickerScreen.jsx`（赛前牌组选择 UI）、`useGameReducer.js`（state.hand[] / activeCard / activeWeather / cardPenalties）、`CardPicker.jsx`（牌组内选牌 UI）、`Board.jsx` ActiveEffects（效果面板）。

比例建议：训练属性 60%，Issue 20%，卡牌 20%。

---

## 8. 训练数据转换

```text
Power  = round((Rotation × 0.5 + Sequencing × 0.5) / 10)
Aim    = round((PlaneControl × 0.6 + ImpactControl × 0.4) / 10)
Touch  = round((Tempo × 0.3 + Contact × 0.3 + Stability × 0.4) / 10)
```

Stability 权重最高，因为 Touch 继承了原 Nerve 的稳定性职责。

---

## 9. 比赛结构：18 洞制

### 9.1 洞数与 Par

```text
PAR_LAYOUT = [4, 3, 4, 4, 3, 5, 4, 3, 4, 3, 4, 3, 4, 4, 3, 4, 5, 3]
总 Par = 67
```

默认开局为 Par 4。

| Par | 初始距离 | 节奏预期 |
| --- | ---: | --- |
| 3   | 100–160 yd | Power 5 可 1-2 杆上果岭 |
| 4   | 210–300 yd | Power 5 要 3-5 杆 |
| 5   | 340–400 yd | Power 7 要 3-4 杆 |

### 9.2 计分

高尔夫标准计分，以相对 Par 差值显示（Eagle/Birdie/E/Par/Bogey/Double）。18 洞差值之和为总成绩。

### 9.3 回合制

多位玩家交替击球，一方进洞后其余继续，全部进洞后转洞。18 洞结束比较总成绩。

### 9.4 棋盘交互

鼠标滚轮缩放，右键拖拽平移。每洞开球 Auto-Zoom，每杆落地后 Camera Follow-Up（250ms 等待 → 镜头缓动 → cameraFollowUp 到期后 CAMERA_SETTLED）。一方进洞后等待 holedReset (600ms) 再继续。

### 9.5 UI 布局

赛事直播 app 风格：

```text
┌─────────────────────────────────┐
│  赛场棋盘（最大化，浅绿背景）        │
│  ┌─ 击球结果横幅（动画叠加） ──┐    │
│  └──────────────────────────┘    │
│  ┌─ 直播状态条（底部深色叠加） ──┐  │
│  │ ●LIVE │ Hole 4/18 · Par 4  │  │
│  └────────────────────────────┘  │
├─────────────────────────────────┤
│  计分板（排行榜风格，差值着色）      │
├─────────────────────────────────┤
│  播报区（可滚动，始终可见）          │
├─────────────────────────────────┤
│  Debug 侧边栏                     │
└─────────────────────────────────┘
```

- **Broadcast Ticker**：底部深色半透明条（`rgba(15,15,25,0.82)` + 毛玻璃），显示 LIVE 指示灯 / 洞号 / 当前球员距离 / CLUTCH 标记
- **Shot Banner**：每杆结算时棋盘中央弹出动画文字（scale 弹入 → 停留 → 向上飘出淡出），2s 后自动消失。HOLED! 绿色，BAD 红色，OKAY 琥珀色等
- **Scoreboard**：深色标题行 + 固定左侧玩家标签 + 可滚动分数区 + 固定右侧总成绩列。分数按差值着色（Birdie 绿 / Par 灰 / Bogey 琥珀 / Double+ 红 / Eagle 金）
- **Player Drawer**：底部抽屉，收起时显示手柄条 + 玩家颜色点，展开时显示完整属性卡片（Power/Aim/Touch/Issue）

**赛前流程 UI**（4 步，全屏卡片式选择）：

```text
TrainingPicker → OpponentPicker → MapPicker → DeckPickerScreen → Board
     ↓                ↓               ↓              ↓
 选择训练日      选择对手(多选)    选择地图(必选)   选择牌组(含RAW)
 [Go Next]        [Go Next]        [Go Next]      [Start Match]
```

所有选择页面的视觉风格统一：选中项高亮（绿色边框 + 发光），未选中项灰色遮罩。Debug 侧边栏仅保留 Mode 切换、Start/Pause/Reset 控制。

---

## 10. 游戏循环

### 二级状态机

```text
primaryStatus:   off → run ↔ pause → off
secondaryStatus: null → card_picking → during_swing → camera_followup → card_picking → ...
cardPending:     false → true (有手牌时) → false (USE/SKIP 后)
```

### Stage 系统

**Stage** = 一个完整回合，所有未进洞玩家各打一杆。

```text
holeNumber=1, stageIndex=0: Marcus swings → Sofia swings → stage complete
holeNumber=1, stageIndex=1: Marcus swings → Sofia swings → stage complete
...
holeNumber=1, stageIndex=N: Marcus holes → Sofia swings → stage complete
```

Stage 新增状态：

```text
stageIndex: 0,              // 当前是第几个 swing-round
swingsThisStage: 0,         // 当前 stage 已完成击球数
stageActivePlayerCount: N,  // stage 开始时未进洞人数
```

天气卡持续整个 Stage，卡牌惩罚（如 Angry Goose Touch −2）按 Stage 递减。

### 完整一杆（含三层卡牌管线）

```text
CAMERA_SETTLED → card_picking
  │ Stage 完成时：发牌（hand < 4）、清天气、递减惩罚
  │ Marcus → CardPicker UI，等待 USE / SKIP / EXCHANGE
  │ Sofia  → 300ms 后自动 SKIP（AI）
  ▼
during_swing → FIRE_SHOT
  │ ① Player Stat Modifier → 修改 power/aim/touch
  │ calculateGameLanding(modifiedStats) → baseResult
  │ ② Weather Modifier → 偏移/推进调整
  │ dispatch FIRE_SHOT → 球飞行动画
  ▼
BALL_LANDED
  │ ③ Animal Event Modifier → 位移/属性惩罚
  │ activeCard 清空（动物卡在此清理，非 FIRE_SHOT）
  ▼
camera_followup → 镜头缓动 → CAMERA_SETTLED
```

### 完整比赛流程

```text
选择训练记录 → 生成 Power/Aim/Touch/Issue
→ 选择对手（可多选）
→ 选择地图（必须选，不可跳过）
→ 选择牌组（Base / Brainrot / I Want It RAW 无牌模式）
→ 18 洞比赛（默认 Par 4 开局）
→ 每洞：丢弃旧手牌 → 发 1 张卡（上限 4 张，无牌模式跳过）
→ 每个 Stage 完成后：发牌（hand < 4 时，无牌模式跳过）
→ card_picking → USE/SKIP/EXCHANGE → 效果生效（无牌模式直接自动击球）
→ 20 码外: Field Shot → 20 码内: Clutch Roll
→ FIRE_SHOT → 属性卡/天气卡清空 → 播报
→ BALL_LANDED → 动物卡结算
→ 全部进洞 → 记录杆数 → 转洞
→ 18 洞结束 → 比较总成绩
```

---

## 11. Breakthrough Shot（神之一杆）

普通推进表保证节奏稳定，Breakthrough 制造两杆、一杆高光事件。

| 等级 | 效果 |
| --- | --- |
| Clean Strike | 推进结果提升一级 |
| Pin Seeker | 直接打到 2-8 yd 内 |
| Miracle Shot | 直接进洞 |

触发概率由 ControlScore（Aim × 0.6 + Touch × 0.4）决定。必须够得到洞才能触发 Pin Seeker / Miracle。Power 不直接提高概率，只决定够不够得到。

一杆进洞概率按距离递减：20-80yd 1-3%，80-180yd 0.2-1%，180+yd 0.02-0.2%。

---

## 12. 数值平衡

> 日期: 2026-05-10 | 状态: P0-P3 已实现，10M 模拟验证完成

### 12.1 角色定义（15/20/25 属性点分档）

三名主角根据训练评分获得不同属性点数：

```text
训练评分 45 → Marcus → 15 属性点
训练评分 68 → Sofia  → 20 属性点
训练评分 91 → David  → 25 属性点
```

| 角色 | Power | Aim | Touch | 点数 | 风格 | 高光 | 翻车 |
|------|-------|-----|-------|------|------|------|------|
| Marcus | 8 | 3 | 4 | 15 | Bomber | 长洞少打一杆 | 短洞推杆灾难 |
| Sofia | 5 | 9 | 6 | 20 | Sniper | 每杆偏移极小 | Power 不足 |
| David | 7 | 8 | 10 | 25 | Closer | 距离控制+推杆最强 | Power 普通不省杆 |
| Balanced | 6 | 6 | 6 | 18 | Balanced | 无短板 | 无亮点 |
| Chaos | 8 | 3 | 8 | 19 | Chaos | Boom/Bust 均衡 | A3 偏移大 |
| Technician | 4 | 8 | 8 | 20 | Technician | 不远但精细 | P4 长洞不够 |

### 12.2 Range-Band 属性影响力

```text
距离段        Power  Aim   Touch
180+ yd      1.00   0.50  0.20   ← Power 统治
80–180 yd    0.80   1.00  0.60   ← Aim 主导
20–80 yd     0.40   0.90  0.90   ← Aim + Touch
0–20 yd      0.10   0.40  1.00   ← Touch (Clutch)
```

### 12.3 已实现修改

- **[P0]** remainingYd 改为 2D 距离，Aim 偏移直接影响下一杆距离
- **[P1]** Touch 动态采样下限：minRate = 0.3 + touch × 0.06
- **[P2]** 概率性过冲：距离 < maxPush × 0.5 且 Touch < 7 时
- **[P3]** Range-Band 缩放 + 偏移惩罚（offsetPenaltyRate = 0.6）

### 12.4 10M 模拟结果

#### 单洞分型 (10,000,000 轮)

**Par 3** (Touch 主导):

```text
Role            Avg    Std  Birdie%   Par%  Bogey%  Blowup%
David          2.07   0.68      79%    18%      3%       0%
Technician     2.64   0.71      48%    40%     11%       1%
Chaos          3.01   0.77      25%    52%     23%       3%
Balanced       3.02   0.82      26%    50%     24%       4%
Sofia          3.04   0.79      24%    52%     23%       4%
Marcus         3.64   0.90       6%    43%     51%      15%
```

**Par 4** (全属性混合):

```text
Role            Avg    Std  Birdie%   Par%  Bogey%  Blowup%
David          2.99   0.67      83%    15%      2%       0%
Chaos          4.01   0.78      26%    51%     23%       3%
Balanced       4.20   0.79      16%    55%     30%       6%
Technician     4.37   0.73       7%    56%     37%       6%
Sofia          4.38   0.83      10%    51%     38%       9%
Marcus         4.75   0.92       5%    38%     57%      18%
```

**Par 5** (Power 统治):

```text
Role            Avg    Std  Birdie%   Par%  Bogey%  Blowup%
David          3.89   0.70      84%    15%      2%       0%
Chaos          4.88   0.77      32%    50%     18%       2%
Balanced       5.33   0.74       8%    58%     34%       7%
Sofia          5.67   0.83       4%    44%     53%     14%
Marcus         5.76   0.91       4%    39%     57%     18%
Technician     5.91   0.79       0%    33%     67%     21%
```

#### 估算 18 洞

```text
David ~49 (-18) | Chaos ~67 (E) | Balanced ~70 (+3)
Technician ~70 (+3) | Sofia ~72 (+5) | Marcus ~80 (+13)
```

### 12.5 单属性扫描（Par 4, 1M 轮）

固定其他属性 = 5，扫描 1-10：

```text
Power 1→10: Δ = 7.34 杆 | Aim 1→10: Δ = 2.52 杆 | Touch 1→10: Δ = 1.90 杆
Power/Aim 比 = 2.91×（P3 后从 4.60× 降至）
```

### 12.6 关键发现

1. **David (Touch 10) 压倒性最强**：Touch 双重加成（距离采样 + Clutch 进洞），25 点 + T10 全场最佳
2. **Marcus (15 点) 最弱**：T4 短杆灾难 + A3 偏移严重，属性点不足
3. **Power 仍 ~3x 于 Aim/Touch**：结构性问题，offset penalty 缓解但未根治
4. **Chaos 接近 Par**：P8/T8 的 Boom/Bust 均衡
5. **Aim offset penalty 生效**：Aim 1 blowup 率 84% vs Aim 10 的 13%

### 12.7 已知问题

- **David 过强**：Touch 10 双重控制（距离采样 + Clutch 进洞率），25 属性点放大差距
- **15/20/25 分档差距过大**：Marcus 和 David 的 18 洞差距达 30+ 杆
- **Sofia 排名靠后**：Power 直接省杆，Aim 的"好位置"无法完全弥补"多打一杆"

---

## 13. 动画与节奏参数

集中在 `appConfig.game.timing`：

```js
flightDuration: 0.7,       // 球飞行时间（秒）
fadeDuration: 1.5,         // 轨迹淡出（秒）
shotDelay: 500,             // 自动击球前等待（ms）
landDelay: 300,             // 落地后等待（ms）
cameraFollowUp: 600,        // 镜头调整总时间（ms）
holedReset: 600,            // 一方进洞后等待（ms）
holeTransition: 1000,       // 洞间过渡（ms）
holeTransitionFinal: 1500,  // 最后一洞结束等待（ms）
```

### 球飞行动画架构

动画循环在 `useBallAnimation.js` 中使用 `requestAnimationFrame` 驱动。核心设计要点：

**本地 Map 累积动画进度**：`ballAnims`（闭包内 Map）存储每个球的 progress / fade / phase，独立于 React state 累积。每帧从 `gameRef.current.balls` 同步新球（只发现、不影响已有球的进度），避免因 React 18 批量更新导致 `gameRef` 过时而无法累积进度。

**TICK_ANIMATION 使用 merge 而非 replace**：reducer 中的 `TICK_ANIMATION` 将动画更新与当前 state 合并，而非直接替换 `state.balls`。这防止了并发 dispatch（如 rAF 的 TICK_ANIMATION 与 setTimeout 的 FIRE_SHOT）之间的竞态覆盖。

```text
rAF tick 流程：
1. gameRef.current.balls → 发现新球 → 加入 ballAnims Map
2. 在 ballAnims 中推进 progress / fade（本地累积，不依赖 React state）
3. progress ≥ 1 → schedule BALL_LANDED timer
4. fade ≥ 1 → 从 ballAnims 删除，标记 removed
5. dispatch TICK_ANIMATION({ balls: next, removed }) → reducer merge 到 state
```

---

## 14. 文字播报系统

每杆结算后从预写模板池（~63 条，按事件类型分类）抽取播报文字，填充数据后显示在计分板下方。

```text
src/commentaryTemplates.js   ← 模板池
src/commentaryEngine.js      ← 选择引擎（优先级、去重、条件过滤）
src/components/Board.jsx     ← 每杆生成 shotContext → 调用引擎 → 渲染 feed
```

模板类型：holeOpen / great / good / okay / bad / holed / pinseeker / miracle / clutchEnter / clutchMiss / cardUse。

优先级：cardUsed > miracle > holed > pinseeker > clutchEnter > clutchMiss > outcome。维护最近 8 条去重。

UI：计分板下方深色半透明背景，固定高度可滚动，自动滚到底部。Start/Pause/Reset 按钮在 Debug 侧边栏（IslandContainer）。

---

## 15. 地图系统：基于标注图片的棋盘

### 15.1 概述

棋盘可以加载多张用户标注过点位顺序的图片，替代当前的空白绿色背景。相邻标注点对定义每一洞的**方向向量**（不是距离），实际洞距由 par 决定。

**核心设计原则：**

- **只取方向，不取距离** — 标注点对只提供击球方向，Par 距离从 `holeDistance` 表查表
- **地图等比缩放** — 图片根据 Par 距离动态缩放，使标注点对之间的距离匹配实际球距
- **多地图自动切换** — 打完一张地图的所有点对后，自动切换到下一张地图
- **不旋转地图** — 方向完全由标注点决定
- **不改变 par 分配** — 继续沿用 `parLayout`

---

### 15.2 数据来源

使用 Mapping Tools（mode='mapping'）生成的 JSON + 对应图片文件，存放在 `public/map/map_*/` 目录下。

JSON 格式：

```json
{
  "version": 1,
  "image": { "width": 1695, "height": 816 },
  "points": [
    { "index": 1, "uv": { "u": 0.8098, "v": 0.4426 }, "px": { "x": 1373, "y": 361 } },
    { "index": 2, "uv": { "u": 0.5074, "v": 0.2013 }, "px": { "x": 860, "y": 164 } }
  ]
}
```

---

### 15.3 地图加载流程

#### 自动发现

赛前流程进入地图选择阶段时，自动扫描 `public/map/map_1/` 到 `map_20/`：

```js
for (let i = 1; i <= 20; i++) {
  const res = await fetch(`/map/map_${i}/map.json`)
  if (!res.ok) break  // 没有更多地图了
  const data = await res.json()
  discoveredMaps.push({ id: `map_${i}`, ...data })
}
```

#### 选择 UI

地图选择为必选步骤，不可跳过。选中的地图按顺序合并点位池。

```text
☑ Map 1 — CMU Campus (2 holes)
☐ Map 2 — The White House (2 holes)
```

选中后高亮，未选中变灰。

#### React 数据流

`appConfig` 是纯 JS 对象，不会触发 React 重渲染。地图数据通过以下方式传递：

```text
IslandContainer (响应式 state)
  ├── mapEnabled, selectedMapIds  ← useState
  └── mapImageUrl prop ──→ Board ──→ BoardArea
                          │
                    appConfig.map (写入)
                    ├── .imageUrl, .imageWidth, .imageHeight
                    ├── .points[] (合并 + mapId 标记)
                    ├── .availableMaps[]
                    └── .transform { scale, imgAspect, offsetX, offsetY }

Board (响应式同步)
  └── useEffect watches state.holeNumber
      ├── setMapTransform(appConfig.map.transform)
      └── setActiveMapImageUrl(appConfig.map.imageUrl)
```

---

### 15.4 坐标映射（各向异性缩放）

棋盘保持 1:1 正方形。图片通过各向异性缩放映射到棋盘坐标：

```text
UV (u, v) → Board (x, y):
  x = offsetX + u × scale
  y = offsetY + v × scale × imgAspect

其中:
  scale = distPct / sqrt(du² + dv² × imgAspect²)
  imgAspect = imageHeight / imageWidth
  offsetX = 50 - uvMidU × scale
  offsetY = 50 - uvMidV × scale × imgAspect
```

`imgAspect` 确保图片不变形（横图横显，竖图竖显）。

---

### 15.5 洞生成

#### 方向向量 + Par 距离

```text
1. 取标注点对，计算各向异性 UV 距离（考虑图片宽高比）:
   uvBoardDist = sqrt(du² + dv² × imgAspect²)
2. Par 查表得到 distYd，换算棋盘百分比 distPct
3. scale = distPct / uvBoardDist
4. 将起止点 UV 坐标映射到棋盘坐标:
   startBoard = (startPt.u × scale, startPt.v × scale × imgAspect)
   endBoard   = (endPt.u × scale, endPt.v × scale × imgAspect)
5. 取中点，偏移到棋盘中心 (50, 50):
   offsetX = 50 - midBoard.x
   offsetY = 50 - midBoard.y
6. hole = endBoard + offset
   tee  = startBoard + offset
```

这样保证 hole 和 tee 之间的棋盘距离精确等于 `distPct`，且方向来自地图标注点对。与旧版的区别：旧版直接用 UV 坐标放洞位（距离由点间实际 UV 距离决定，约 50yd），新版只取方向，距离由 Par 决定（Par 4 约 255yd）。

#### 多地图切换

每个点标记 `mapId`（来源地图 ID）。`generateHoleFromMap` 每次调用时检查当前点的 `mapId`，自动切换：

```js
const mapMeta = appConfig.map.availableMaps.find(m => m.id === startPt.mapId)
appConfig.map.imageUrl = `/map/${mapId}/map.png`
appConfig.map.imageWidth = mapMeta.data.image.width
appConfig.map.imageHeight = mapMeta.data.image.height
```

Board 层通过 `useEffect` 在 `holeNumber` 变化时读取 `appConfig.map.imageUrl`，触发 BoardArea 重渲染。

#### 图片过渡动画

地图图片的 `left/top/width/height` 属性添加了 CSS transition（1.5s），切洞时地图平滑缩放变换到新位置。

---

### 15.6 相机行为

#### 初始 Auto-Zoom（开洞时）

`calcAutoZoom` 框住所有玩家 + 洞口，用于游戏开始和洞过渡：

```text
fillX = 0.65  ← 左右留白（较大）
fillY = 0.70  ← 上下留白
```

#### Follow-Up Zoom（每杆后）

`calcFollowUpZoom` 只框住当前回合玩家 + 洞口，不包含其他玩家。这让镜头在每次击球后有明显缩放变化：

```text
points = [activePos, hole, midPoint±pad]
pad = 12 (棋盘 pct 单位)
```

---

### 15.7 地图模式视觉覆盖

有地图时（`.board-area.has-map`），所有场上元素变为白色以保证在深色/复杂地图背景上可见：

| 元素 | 无地图 | 有地图 |
|------|--------|--------|
| 旗杆 | 灰色 | 白色 |
| 旗帜 | 红色 | 白色 |
| 洞环 | 绿色边框 | 白色边框 |
| 虚线 | 灰色，透明度 0.4 | 白色，透明度 0.7 |
| 进洞范围圈 | 灰色虚线 | 白色虚线 |
| 玩家圆环 | 原色 | 原色 + 白色描边 |
| 玩家距离数字 | 灰色 | 白色 |
| 球 | 黑色 | 白色 |
| 球轨迹虚线 | 黑色 | 白色 |
| 球距离文字 | 灰色 | 白色 |
| 进洞特效 | 绿色脉冲 | 白色脉冲 |
| 地图图片 | — | brightness(0.7) 降亮度 |

#### 玩家活跃状态

- **当前回合玩家**：正常色彩 + 正常亮度，`z-index: 6`（最上层）
- **非活跃玩家**：`saturate(0.3) brightness(0.65)` 灰度化 + 距离数字同步灰度化
- **已进洞玩家**：保持灰度状态直到下一洞

---

### 15.8 文件结构

| 文件 | 职责 |
|------|------|
| `src/appConfig.js` | `map` 字段（imageUrl, points, transform, availableMaps） |
| `src/components/IslandContainer.jsx` | Map 开关、自动发现、勾选 UI、rebuildMapConfig |
| `src/components/Board.jsx` | mapTransform/mapImageUrl 响应式同步、BoardArea prop 传递 |
| `src/components/board/BoardArea.jsx` | 地图图片渲染（scale/offset/transition） |
| `src/utils/shotPhysics.js` | `generateHoleFromMap` — 方向向量 + Par 距离 + 地图切换 |
| `src/hooks/useGameReducer.js` | `makeHole` 分支选择 `generateHoleFromMap` vs `generateHoleForPar` |
| `src/hooks/useBoardZoom.js` | `calcAutoZoom` / `calcFollowUpZoom` |
| `src/components/mapping/` | Mapping Tools（6 文件：标注点位、缩放、保存/加载 JSON） |
| `public/map/map_*/` | 地图数据目录（map.png + map.json） |
