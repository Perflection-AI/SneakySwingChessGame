# Sneaky Swing

用真实挥杆数据养一个高尔夫分身，然后看它带着你的技术缺陷去打 9 洞自走棋。你越训练，它越少发病。

---

## 一句话

> Sneaky Swing 是一个真实挥杆数据驱动的高尔夫自走棋。玩家通过训练提升 Power、Aim 和 Nerve，减少 Swing Curse 的发病率，再用轻量卡牌影响比赛，让自己的分身在 9 洞中越打越像个人。

---

## 三大属性

| 属性 | 玩家理解 | 后台映射 |
|------|---------|---------|
| **Power** | 我最远能打多远 | Rotation + Sequencing → 射程上限表 |
| **Aim** | 我会不会打歪 | Plane Control + Impact Control → 偏移率表 |
| **Nerve** | 关键时刻稳不稳 | Stability → 距离波动表 + Curse 触发修正 |

详见 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) 第 4–5 节。

---

## Swing Curse

每个分身有一个挥杆诅咒，来自报告中的 root_causes。

- **Marcus** — Hip Betrayal：47% 概率左右偏移突然放大
- **Sofia** — Premature Violence：23% 概率距离突然暴减

Nerve 越低触发越频繁。详见 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) 第 6 节。

---

## 单杆结算

```
Power → 最大射程 → 瞄洞或尽量推进
Nerve → 距离波动（±2% ~ ±35%）
Aim   → 左右偏移（±1% ~ ±20%）
Curse → 可能放大误差
→ 落点区域判定 → 进洞或继续
```

每洞 2–4 杆，每杆带结构化播报。详见 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) 第 7–10 节。

---

## 卡牌

每洞发 3 张选 1 张。12 张 MVP 卡牌：风险收益、稳定控制、缺陷修正、训练成长。详见 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) 第 11 节。

---

## 训练闭环

```
上传训练 → 更新属性 → 生成训练卡 → 打一局 → 看分身变强 → 再练一次
```

---

## 比赛模式

- **9 洞快速赛**（3–5 分钟）
- **18 洞标准赛**（6–10 分钟）
- **Yesterday You**（打昨天的自己）

---

## 技术栈

Vite + React + SneakySwing Design System (DSD)

## 完整设计文档

[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — 包含所有公式、概率表、数据结构、卡牌列表
