# Sneaky Swing 简化更新方案

## 1. 核心定位不变

Sneaky Swing 仍然是：

> 一个真实挥杆数据驱动的高尔夫自走棋游戏。

玩家上传训练记录后，系统生成一个高尔夫分身。
分身拥有三个核心属性：

| 属性        | 作用                |
| --------- | ----------------- |
| **Power** | 决定最大推进距离          |
| **Aim**   | 决定推进质量、方向稳定、障碍风险  |
| **Nerve** | 决定随机波动、关键球稳定、进洞能力 |

同时，玩家会根据自己的真实 swing issue 获得一个 **Swing Curse**。
Curse 不是低分惩罚，而是挥杆问题类型决定的"发病机制"。

---

## 2. 配置驱动架构

所有游戏机制参数集中在 `src/appConfig.js` 的 `game` 字段，Board.jsx 通过解构读取。**调参不需要动判定逻辑代码。**

```text
appConfig.game
├── ydToPct              ← 码数 ↔ 棋盘比例（0.20）
├── clutchThresholdYd    ← 进洞模式切换距离（20 yd）
├── powerToRange         ← Power → 最大推距表（11 档）
├── aimToOffsetRate      ← Aim → 横偏率表（10 档）
├── parLayout            ← 18 洞赛程
├── holeDistance          ← 各 Par 洞距生成范围
├── distBounds           ← 采样区间系数（min / softCap / maxPushSoftCap）
├── burstRate            ← Hard cap 爆发率三档
├── clutchBaseChance     ← Clutch 基础进洞率（5 档距离）
├── clutchMissDistance    ← Clutch 未进剩余距离（5 档距离）
└── outcomeThresholds    ← great/good/okay/holed/pinseeker 判定阈值
```

以下各节的数值表都对应 `appConfig.game` 中的字段。改表即改游戏。

---

## 3. 最大改动：从四阶段改成两套判定

之前我们讨论过 Drive / Approach / Short Game / Finish 四个阶段。
现在可以简化成：

```text
20 码外：Field Shot / 推进判定
20 码内：Clutch Roll / 进洞判定
```

也就是说，每一杆只先问一个问题：

```text
当前距离是否 ≤ 20 码？
```

如果不是，就推进。
如果是，就直接算进洞概率。

这样能解决两个问题：

1. **不会强制玩家走完固定四阶段。**
   强玩家可以两杆进洞，弱玩家可能四五杆。

2. **不会出现洞边永远进不了的情况。**
   20 码内不用普通距离误差，而是直接进入进洞骰。

---

## 4. 一杆结算逻辑

### A. 20 码外：推进判定（sample-first 三层独立采样）

20 码外，目标不是直接进洞，而是把球推进到更好的位置。

```text
power → 决定 maxDistance
aim   → 决定 maxOffset（左右偏移上限）
nerve  → 决定 distance 和 offset 的采样集中程度（分布形状）
shot result → 根据最终落点反推出 great / good / bad
```

流程：

```text
1. 根据 Power 得到 maxPush
2. idealDistance = min(currentDistance, maxPush)
3. 用 Aim + Nerve 计算 ControlScore
4. 先 Roll Breakthrough（见 §11）
   - miracle → 直接进洞
   - pinseeker → 直接贴洞 2-8yd
   - clean → stability 临时 +2
5. 用 sampleAroundIdeal 在距离区间内采样 actualDistance
6. 用 sampleAroundIdeal 在偏移区间内采样 lateralOffset
7. 转换为棋盘坐标落点
8. 如果落点距洞 ≤ 1yd，算自动进洞
9. 用 labelShot 反推 outcome 标签（great/good/okay/bad）
```

#### `sampleAroundIdeal(ideal, min, max, stability)`

```text
stability 高：多次随机取平均 → 自然聚集在 ideal 附近
stability 低：接近均匀分布 → 容易落到区间边缘
```

Nerve 即 stability。Nerve 10 → 6 次平均；Nerve 1 → 2 次平均。

#### 距离区间

```text
minDistance = idealDistance × 0.60
softCap    = min(idealDistance × 1.12, maxPush × 1.05)   ← 采样上限
hardCap    = maxPush × burstRate                          ← 角色绝对上限
burstRate  = nerve >= 8 ? 1.06 : nerve >= 5 ? 1.04 : 1.03
actualDistance = clamp(sampleAroundIdeal(ideal, min, softCap), 0, hardCap)
```

角色不会突然打到超出自身能力的距离。采样范围用 soft cap 控制分布，采样后再用 hard cap 截断。

| Power | Max Push | Hard Cap (nerve≥8) | Hard Cap (nerve<5) |
| ----- | -------: | -----------------: | -----------------: |
| 3     |    56 yd |              59 yd |              58 yd |
| 5     |    96 yd |             102 yd |              99 yd |
| 7     |   152 yd |             161 yd |             157 yd |
| 10    |   266 yd |             282 yd |             274 yd |

Good 常见是正常的，但 good 意味着"接近理想距离"，不是"突破上限"。

#### 偏移区间

```text
maxOffset = actualDistance × AIM_TO_OFFSET_RATE[aim]
idealOffset = 0（正对洞口）
```

Aim 高 → 最大偏移小；Aim 低 → 最大偏移大。

#### Power → Max Push

非线性成长曲线：低 power 差距小（菜鸡互啄），高 power 差距大（怪物拉开）。

| Power | Max Push | 定位               |
| ----- | -------: | ---------------- |
| 0     |    20 yd | 完全新手             |
| 1     |    30 yd |                   |
| 2     |    42 yd |                   |
| 3     |    56 yd | 菜鸡               |
| 4     |    74 yd |                   |
| 5     |    96 yd | 普通玩家             |
| 6     |   122 yd |                   |
| 7     |   152 yd | 强玩家              |
| 8     |   186 yd |                   |
| 9     |   224 yd | 精英业余             |
| 10    |   266 yd | 接近职业水准           |

#### Auto-Hole

任何一杆（Field Shot 或 Clutch Roll），如果计算出的落点距洞 ≤ 1yd，算自动进洞。

---

### B. 20 码内：Clutch Roll / 进洞判定

20 码内进入 **Clutch Roll**。

这里不再算推进距离，而是直接计算进洞率。

```text
FinishScore = Nerve × 0.7 + Aim × 0.3
FinalMakeChance = BaseChance × (0.75 + FinishScore / 10)
FinalMakeChance = clamp(FinalMakeChance, 8%, 97%)
```

基础进洞率（arcade 化，高于真实高尔夫）：

| 距离       | Base Chance |
| -------- | ----------: |
| 0–2 yd   |         95% |
| 2–5 yd   |         82% |
| 5–10 yd  |         60% |
| 10–15 yd |         42% |
| 15–20 yd |         28% |

没进时，生成一个新的短距离：

| 原距离      |      没进后剩余 |
| -------- | ---------: |
| 0–2 yd   | 0.3–0.8 yd |
| 2–5 yd   | 0.5–1.5 yd |
| 5–10 yd  |     1–3 yd |
| 10–15 yd |     2–5 yd |
| 15–20 yd |     3–7 yd |

Nerve 高的人没进也更容易停在洞边；Nerve 低的人可能推过头。

---

## 5. 结果标签：从落点反推

outcome（great/good/okay/bad）不再是核心判定，而是根据实际落点反推的标签。

### `labelShot(remainingYd, originalDistYd, offsetYd)`

| 条件                                    | 标签           |
| ------------------------------------- | ------------ |
| remainingYd ≤ 1yd                        | **holed**     |
| remainingYd ≤ 5yd                        | **pinseeker** |
| progress ≥ 85% 且 \|offsetYd\| ≤ 8    | **great**     |
| progress ≥ 65% 且 \|offsetYd\| ≤ 15   | **good**      |
| progress ≥ 40%                          | **okay**      |
| 其余                                    | **bad**       |

```text
progress = 1 - remainingYd / originalDistYd
```

旧机制：先判定好坏，再生成落点。
新机制：先生成落点，再评价好坏。

强玩家可以：

```text
Drive → Short Game → Clutch
```

甚至：

```text
Drive → Clutch
```

弱玩家可能：

```text
Drive → Advance → Short Game → Clutch
```

这样就自然产生 2–5 杆的差异。

---

## 6. Curse 机制

Curse 依然来自真实 swing issue。
但简化后，每个 Curse 只影响一件事：

| Swing Issue         | Curse             | 简化效果                    |
| ------------------- | ----------------- | ----------------------- |
| Early Extension     | Hip Betrayal      | 推进结果降一级，并产生大幅左右偏播报      |
| Casting             | Premature Release | 本杆实际推进 -25%             |
| Over the Top        | Outside-In Demon  | 更容易右偏；如果进障碍，优先右侧障碍      |
| Poor Face Control   | Face Goblin       | 推进结果降一级，方向随机            |
| Sway                | Backswing Drift   | 推进距离随机：可能 +10%，可能 -25%  |
| Slide               | Target-Side Slide | Shot result 降一级，但距离损失较小 |
| Reverse Spine Angle | Spine Rebellion   | 低频触发，结果直接降两级            |
| Loss of Posture     | Posture Collapse  | 结果降一级                   |
| Hanging Back        | Back Foot Tax     | Max Push -20%           |
| Poor Tempo          | Tempo Gremlin     | 随机触发一个小坏事               |

结果等级链：

```text
Great → Good → Okay → Bad
```

Curse 的核心不是扣分，而是改变这一杆的"发病方式"。

---

## 7. 卡牌机制

卡牌继续作为轻量策略入口。
但每张卡只改一个明确东西。

| 卡牌                       | 效果                              |
| ------------------------ | ------------------------------- |
| **Pray and Rip**         | 本洞 Power +2，Aim -1              |
| **Boring Golf**          | 本洞 Nerve +2，Power -1            |
| **Coach Whisper**        | 取消下一次 Curse                     |
| **Deep Breath**          | 下一杆结果最低不会低于 Okay                |
| **Hero Shot**            | 如果打出 Great，额外靠近；如果 Bad，Nerve -1 |
| **Face Control Patch**   | 本洞 Aim +2，Power -1              |
| **Late Release Therapy** | 本洞 Premature Release 无效         |
| **Hip Stay Home**        | 本洞 Hip Betrayal 无效              |
| **Pin Hunter**           | canReachHole 时 Pin Seeker ×2；失败则结果降一级 |
| **Send It**              | Effective Max Push +20%，Aim -2    |
| **One Good Swing**       | 下一杆 Miracle Chance +1%，Curse 触发率 +20% |
| **Safe Tap**             | 下一次 Clutch Roll 最低进洞率 70%，但不能触发 Miracle/Pin Seeker |

比例建议：

```text
训练属性 70%
Curse 20%
卡牌 10%
```

---

## 8. 训练数据转换

训练报告仍然转换为三个属性：

### Power

```text
PowerScore = Rotation × 0.5 + Sequencing × 0.5
Power = round(PowerScore / 10)
```

### Aim

```text
AimScore = PlaneControl × 0.6 + ImpactControl × 0.4
Aim = round(AimScore / 10)
```

### Nerve

```text
Nerve = round(Stability / 10)
```

或者如果 Stability 是 1–5：

```text
Nerve = Stability × 2
```

### Curse

Curse 由 root cause 决定：

```text
Early Extension → Hip Betrayal
Casting → Premature Release
Over the Top → Outside-In Demon
Poor Face Control → Face Goblin
Sway → Backswing Drift
Slide → Target-Side Slide
Reverse Spine Angle → Spine Rebellion
Loss of Posture → Posture Collapse
Hanging Back → Back Foot Tax
Poor Tempo → Tempo Gremlin
```

这里有一个重要原则：

> 分数影响 Power / Aim / Nerve，问题类型影响 Curse。
> 高分玩家和低分玩家可以有同一个 Curse。

这会让系统更公平，也更像角色构筑。

---

## 9. 一洞示例

### Par 4，洞长：250 yd（默认开局）

玩家：

```text
Power = 8
Aim = 5
Nerve = 6
Curse = Premature Release
```

Power 8：

```text
baseMaxPush = 186 yd
```

#### 第 1 杆：250 yd

20 码外，进入推进判定。

```text
intendedDistance = min(250, 186) = 186 yd
ControlScore = Aim × 0.6 + Nerve × 0.4 = 5 × 0.6 + 6 × 0.4 = 5.4
```

Breakthrough Roll：未触发。

采样距离区间：

```text
idealDist = 186 yd
softCap = min(186 × 1.12, 186 × 1.05) = 195 yd
hardCap = 186 × 1.04 = 193 yd  (nerve 6 → burstRate 1.04)
actualPush = 186 × ~0.88 = 164 yd
remaining = 250 - 164 = 86 yd
```

播报：

> 第一杆推进不错，球停在 86 码外。

#### 第 2 杆：86 yd

20 码外，继续推进判定。

```text
intendedDistance = min(86, 186) = 86 yd
actualPush = 86 × ~0.92 = 79 yd
remaining = 86 - 79 = 7 yd → 进入 Clutch
```

播报：

> 第二杆推到 7 码，进入 Clutch 范围。

#### 第 3 杆：7 yd

5–10 yd 范围，Clutch Roll。

```text
FinishScore = Nerve × 0.7 + Aim × 0.3 = 6 × 0.7 + 5 × 0.3 = 5.7
BaseChance = 60%
FinalMakeChance = 60% × (0.75 + 5.7 / 10) = 60% × 1.32 = 79.2%
```

进洞。

最终这洞 3 杆，Par 4 打 +1（Bogey）。

---

## 10. 比赛结构：18 洞制

### 10.1 洞数与 Par

比赛固定 18 洞。每洞有标准杆数（Par）：

```text
PAR_LAYOUT = [4, 3, 4, 4, 3, 5, 4, 3, 4, 3, 4, 3, 4, 4, 3, 4, 5, 3]
总 Par = 67
```

默认开局为 Par 4，比赛模式为默认模式（非测试模式）。

### 10.2 洞距生成

每洞根据 Par 值生成初始开球距离：

| Par | 初始距离        | 节奏预期             |
| --- | -----------: | ------------------ |
| 3   |  100–160 yd  | Power 5 可 1–2 杆上果岭 |
| 4   |  210–300 yd  | Power 5 要 3–5 杆    |
| 5   |  340–400 yd  | Power 7 要 3–4 杆    |

洞口固定在棋盘上方区域，玩家根据距离放在下方对应位置。

### 10.3 计分方式

采用高尔夫标准计分，以相对 Par 的差值显示：

| 差值     | 术语      | 显示 |
| ------ | ------- | --: |
| ≤ -2   | Eagle   | -2  |
| -1     | Birdie  | -1  |
| 0      | Par     | E   |
| +1     | Bogey   | +1  |
| +2     | Double  | +2  |

每洞结束后记录各玩家杆数，计算 `杆数 - Par` 差值。
总成绩为 18 洞差值之和（如 -3 表示低于标准杆 3 杆）。

### 10.4 回合制

两位玩家交替击球，轮流推进。一方进洞后，另一方继续从当前位置击球，直到双方都进洞，该洞结束，进入下一洞。

### 10.5 比赛结束

18 洞全部完成后，比较总成绩（低于 Par 越多越好），宣布获胜者。可重新开始新一局 18 洞。

### 10.6 棋盘交互

| 操作            | 功能              |
| ------------- | --------------- |
| 鼠标滚轮         | 缩放棋盘            |
| 右键拖拽（缩放后） | 平移棋盘            |
| 鼠标点击（测试模式）  | 向点击方向击球         |
| 鼠标点击（游戏模式）  | 无交互，自动击球       |

#### 自动缩放（Auto-Zoom）

每洞开球前，棋盘根据所有玩家位置 + 洞口的包围盒自动计算缩放和平移：

```text
1. 收集所有玩家坐标 + 洞口坐标
2. 计算包围盒（spanX, spanY）
3. zoom = min(55/spanX × 100, 55/spanY × 100)，clamp 到 [0.5, 3.0]
4. pan 居中到包围盒中点
```

效果：短洞（Par 3）自动放大，长洞（Par 5）自动缩小，确保所有玩家和洞口始终可见。

### 10.7 赛事直播风格 UI

整体布局采用赛事直播 app 风格，将赛场状态、击球结果、计分板分层呈现。

#### 屏幕布局

```text
┌──────────────────────────────────────────┐
│              赛场棋盘（最大化）               │
│                                          │
│   ┌──── 击球结果横幅（动画叠加层） ────┐      │
│   │         GREAT! / HOLED!           │      │
│   └──────────────────────────────────┘      │
│                                          │
│   ┌── 直播状态条（底部深色叠加层） ──────────┐  │
│   │ ●LIVE │ Hole 4/18 · Par 4 │ ●MC 86yd │  │
│   └──────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  计分板（赛事排行榜风格）                      │
│  ┌─── 深色标题 ──────────────────────┬──┐  │
│  │       1  2  3  4  5 … 16 17 18   │ T │  │
│  │       4  3  4  4  3 …            │67 │  │
│  ├──────┬────────────────────────────┼───┤  │
│  │ ● MC │ E +1 -2 [·] .  .  .  .   │-1 │  │
│  │ ● SR │+1  E  E  .  .  .  .  .   │+1 │  │
│  └──────┴────────────────────────────┴───┘  │
│         [Pause]    [Reset]               │
├──────────────────────────────────────────┤
│  玩家属性抽屉（默认隐藏，上拉展开）              │
│  ── ── ──  拖拽手柄  ── ── ──              │
│      ● MC          ● SR                   │
└──────────────────────────────────────────┘
```

#### 直播状态条（Broadcast Ticker）

棋盘底部的深色半透明叠加层（`rgba(15,15,25,0.82)` + 毛玻璃），实时显示比赛状态：

```text
● LIVE │ Hole 4/18 · Par 4 │ ● Marcus 86yd [CLUTCH]
```

| 元素          | 说明                                       |
| ----------- | ---------------------------------------- |
| LIVE 指示灯    | 红色脉动圆点 + 红色文字，表示比赛进行中                    |
| Hole / Par  | 当前洞号与标准杆                                 |
| 击球玩家 + 距离   | 当前击球玩家颜色点 + 姓名缩写 + 到洞口距离                 |
| CLUTCH 标记   | 20 码内时显示绿色底色徽章                           |
| 击球结果标签      | 每杆结束后右侧弹出结果药丸（绿色=good、蓝色=pin seeker 等）  |

#### 击球结果横幅（Shot Banner）

每杆结算时在棋盘中央弹出的大号动画文字，2 秒后自动淡出：

| 结果          | 配色                    |
| ----------- | --------------------- |
| MIRACLE!    | 绿→蓝渐变                 |
| HOLED!      | 绿色 `#719342`          |
| PIN SEEKER! | 蓝色 `#008BFF`          |
| GREAT/GOOD  | 绿色                    |
| OKAY        | 琥珀色 `#A88D37`         |
| BAD         | 红色 `#EF4444`          |

动画：`scale(0.5) → scale(1.08) → scale(1)` 弹入，停留后向上飘出淡出。每次新击球通过 `key` 强制重新挂载触发动画。

#### 计分板（Broadcast Leaderboard）

赛事排行榜风格，保留三容器并排结构但全面升级视觉：

| 区域     | 样式                                            |
| ------ | --------------------------------------------- |
| 标题行    | 深色背景 `#1A1A2E`，白色洞号 + 浅色标准杆，当前洞高亮            |
| 玩家标签列  | 固定左侧，彩色圆点 + 玩家名（玩家颜色）                        |
| 分数区域   | 可横向滚动，隐藏滚动条，分数按差值着色                           |
| 总成绩列   | 固定右侧，领先者高亮                                   |

分数颜色编码：

| 差值     | 样式    | 颜色        |
| ------ | ----- | --------- |
| ≤ -2   | Eagle | 金色 `#B8860B` |
| -1     | Birdie | 绿色 `#719342` |
| 0      | Par   | 灰色 `#828282` |
| +1     | Bogey | 琥珀色 `#A88D37` |
| ≥ +2   | Double+ | 红色 `#EF4444` |

每洞领先者在分数下方显示彩色圆点标记。当前洞格有浅灰背景提示。

#### 玩家属性抽屉（Player Drawer）

玩家详细属性（Power / Aim / Nerve / Curse）默认隐藏，通过屏幕底部抽屉上拉查看：

| 状态   | 显示内容                      |
| ---- | ------------------------- |
| 收起   | 拖拽手柄条 + 两个玩家的颜色点 + 姓名缩写  |
| 展开   | 完整玩家卡片（属性数值 + Curse 详情）  |

交互方式：点击/轻触手柄切换，或 pointer 拖拽上拉/下拉（30px 阈值触发）。展开时覆盖棋盘下半部分，收起时仅占 48px 高度。

---

## 11. 新版游戏循环

```text
上传训练
→ 生成 Power / Aim / Nerve / Curse
→ 进入 18 洞比赛（默认 Par 4 开局，比赛模式）
→ 每洞两名玩家交替击球
   - 20 码外：Field Shot（sample-first 推进判定）
     - Breakthrough Roll（Miracle / Pin Seeker / Clean / 无）
     - 独立采样 distance + offset + stability
     - 落点 ≤ 1yd → 自动进洞
   - 20 码内：Clutch Roll（进洞判定）
     - 根据距离 + Nerve + Aim 算进洞率
     - 成功进洞 / 失败生成短距离
→ 双方都进洞 → 记录杆数，计算相对 Par 差值
→ 18 洞结束 → 比较总成绩，宣布获胜者
```

---

## 12. 这个版本的好处

### 更简单

不需要真实弧线，不需要 sideOffset，不需要复杂四阶段权重。

### 更好调

所有游戏机制参数集中在 `appConfig.js`，改配置不改代码：

```text
powerToRange       → Power 最大推距表
distBounds         → 采样区间系数（min / softCap / maxPushSoftCap）
burstRate          → Hard cap 爆发率
clutchBaseChance   → Clutch 进洞率
outcomeThresholds  → great/good/okay 判定阈值
holeDistance        → 各 Par 洞距生成范围
```

调参成本极低。改 JSON → 刷新浏览器 → 立刻看到效果。

### 更适合 18 洞

因为每洞的杆数可以通过洞长和结果表控制。

### 更符合训练目标

玩家仍然会清楚知道：

```text
Power 不够 → 远洞多打一杆
Aim 不够 → 推进质量差 / 容易进障碍
Nerve 不够 → 近洞进不去 / 没进还滚远
Curse 触发 → 真实挥杆毛病出来演你
```

### 更有魔性

播报和 Curse 仍然可以很好笑。

比如：

> Sofia 的 Premature Release 又出来收税了，球飞到一半开始辞职。

或者：

> Marcus 的 Hip Betrayal 触发，球左转投奔森林。

---

## 13. Breakthrough Shot（神之一杆）

普通推进表保证每洞节奏稳定，Breakthrough Shot 制造两杆、一杆这种高光事件。

### 13.1 三种等级

| 等级               | 效果            |
| ---------------- | ------------- |
| **Clean Strike** | 推进结果提升一级      |
| **Pin Seeker**   | 直接打到 2–8 yd 内 |
| **Miracle Shot** | 直接进洞          |

### 13.2 触发条件

只在 20 码外的 Field Shot 触发。

### 13.3 基础概率

由 ControlScore 决定：

```text
ControlScore = Aim × 0.6 + Nerve × 0.4
```

| ControlScore | Clean Strike | Pin Seeker | Miracle |
| ------------ | -----------: | ---------: | ------: |
| 8–10         |          20% |         8% |    0.8% |
| 6–8          |          12% |         4% |    0.3% |
| 4–6          |           6% |       1.5% |    0.1% |
| 1–4          |           2% |       0.5% |   0.02% |

**Power 不直接提高 Miracle 概率。Power 只决定你够不够得到。**

### 13.4 能力门槛

每杆先算：

```text
Effective Max Push = PowerMaxPush × ShotCap
canReachHole = currentDistance <= EffectiveMaxPush
```

- **够不到洞**：只能触发 Clean Strike
- **够得到洞**：才能触发 Pin Seeker / Miracle Shot

### 13.5 一杆进洞

只可能发生在：

```text
canReachHole = true
并且触发 Miracle Shot
```

Miracle 概率按距离递减：

| 洞距        | Miracle Chance |
| --------- | -------------: |
| 20–80 yd  |          1%–3% |
| 80–180 yd |        0.2%–1% |
| 180+ yd   |     0.02%–0.2% |

一杆进洞应该是"我靠？！"事件，不是日常通勤。

### 13.6 结果分布目标

| 玩家水平 | 常见杆数  |
| ---- | ----- |
| 很强   | 2–3 杆 |
| 普通   | 3–4 杆 |
| 很烂   | 4–6 杆 |
| 奇迹   | 1 杆   |

---

## 14. 最终一句话版本

> Sneaky Swing 的新版机制是：20 码外用推进判定，20 码内用进洞判定。Power 决定最大推进距离，Aim + Nerve 决定推进质量，Nerve + Aim 决定近洞进洞率。真实 swing issue 生成不同 Curse，Curse 会以不同方式修改单杆结果；玩家通过少量卡牌临时干预比赛，并通过真实训练长期提升分身。

该复杂的地方放在 **Curse 叙事和训练成长**，不该复杂的地方别塞进判定公式。游戏要好玩，不是让你们搭一个会打高尔夫的 Excel。
