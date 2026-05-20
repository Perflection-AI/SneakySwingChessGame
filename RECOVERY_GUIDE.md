# Recovery Guide - 如何从 Claude Code 历史恢复丢失文件

## 发生了什么

2026-05-19，在部署 GitHub Pages 时，执行了 `git checkout --orphan gh-pages` + `git rm -rf .`，导致工作区中所有未提交的修改被删除。这些文件从未被 commit 过，所以 git reflog、stash 等常规恢复手段都无法找回。

## 恢复途径

### 途径 1：VS Code Timeline（最简单）

1. 在 VS Code 文件浏览器中点击目标文件
2. 右键 → **Open Timeline**（或底部 Timeline 面板）
3. 会看到该文件的历史版本列表，按时间排序
4. 点击任意版本即可查看内容，可以复制恢复

**局限**：VS Code 只在文件被保存时记录历史。如果文件从未在 VS Code 中保存过，则没有记录。

### 途径 2：Claude Code 会话记录（最完整）

Claude Code 的每次对话都会保存为 `.jsonl` 文件，里面包含所有 Read、Write、Edit 操作的完整内容。

#### 文件位置

```
C:\Users\74017\.claude\projects\e--2026-TODOs-SneakySwingCodeBase\
```

每个 `.jsonl` 文件是一次独立的对话。

#### 搜索步骤

**第 1 步：找到哪些会话涉及目标文件**

```bash
# 搜索所有包含目标文件名的会话
grep -l "src/components/Board.jsx" \
  ~/.claude/projects/e--2026-TODOs-SneakySwingCodeBase/*.jsonl
```

这会返回一堆 `.jsonl` 文件名，每个是一次对话。

**第 2 步：找到最新版本**

```bash
# 按修改时间排序，最新的在前面
ls -lt ~/.claude/projects/e--2026-TODOs-SneakySwingCodeBase/*.jsonl | head -20
```

优先看最近修改的 `.jsonl` 文件。

**第 3 步：提取文件内容**

每次 Read 操作会在 `.jsonl` 中留下这样的记录：
```json
{"type":"tool_result","content":"     1│ import React from 'react'\n     2│ ...\n","tool_use_id":"..."}
```

每次 Edit 操作会记录：
```json
{"type":"tool_use","name":"Edit","input":{"file_path":"...","old_string":"...","new_string":"..."}}
```

每次 Write 操作会记录：
```json
{"type":"tool_use","name":"Write","input":{"file_path":"...","content":"..."}}
```

**用 grep 快速定位**：

```bash
# 在某个 session 文件中搜索 Read 操作
grep -o '"content":"[^"]*Board[^"]*"' session_id.jsonl | head -5

# 搜索 Write 操作
grep '"name":"Write"' session_id.jsonl | grep "目标文件名"
```

**第 4 步：重建最终版本**

1. 找到对该文件**最后一次 Read** 的完整内容 — 这是那一刻文件的快照
2. 检查 Read 之后是否有 **Edit** 操作 — 每个 Edit 会修改文件的一部分
3. 按 Edit 的时间顺序，把改动叠加到 Read 的内容上
4. 最终结果就是该文件在丢失前的最后状态

### 途径 3：Git Dangling Objects

如果文件曾经被 commit 过（即使在被删除的分支上）：

```bash
# 查找悬挂的 commit
git fsck --lost-found --dangling

# 查看某个悬挂 commit 的内容
git show <commit_hash> -- <file_path>
```

## 已确认恢复的文件

参见 [RECOVERY_LOG.md](./RECOVERY_LOG.md) 中的完整列表。

## 恢复验证方法

最后一次成功部署的 bundle 已保存在本地 `archive/` 目录，供离线对比：

```
archive/
├── index-DGISdab2.js   (294KB) — 部署版 JS bundle，可反编译出所有组件逻辑和配置值
└── index-B95curSI.css  (61KB)  — 部署版 CSS，包含全部 435 个 class 定义
```

来源 commit: `772c45f81106f0a708d136263459b5c4f7eb4384`

### 如何使用这两个文件

**JS bundle** — 代码被 Vite 压缩（变量名缩短），但逻辑结构完整可读：
- 搜索字符串字面量定位功能：`grep -o 'flightDuration[^\\]*' archive/index-DGISdab2.js`
- 提取 appConfig 精确值、组件逻辑、action handler 等
- 本次恢复中已用于验证：makeHole 签名、DEAL_CARD 行为、TrainingPicker props、timing 数值

**CSS bundle** — 压缩为单行，但可通过 class 名提取完整规则：
- 本次从中提取了 134 个缺失的 class，写入 `src/recovered.css`
- 搜索特定 class：`grep -oP '\.phase-badge\{[^}]*\}' archive/index-B95curSI.css`

除了上述途径，还可以用最后一次成功部署的 bundle 做对比：

```bash
# 提取已部署的 JS bundle
git show 772c45f81106f0a708d136263459b5c4f7eb4384:dist/assets/index-DGISdab2.js > /tmp/deployed-bundle.js

# 提取已部署的 CSS
git show 772c45f81106f0a708d136263459b5c4f7eb4384:dist/assets/index-B95curSI.css > /tmp/deployed.css
```

从中可以反编译出：
- appConfig 的精确值（timing、powerToRange、outcomeThresholds 等）
- 组件逻辑（TrainingPicker、useGameReducer、Board 等）
- CSS 类定义（134 个缺失的类已从 deployed.css 中恢复到 `src/recovered.css`）
- cards.js 的完整卡牌定义（部署版有 17 张基础卡，当前源码只有 4 张）

## 当前恢复状态

### 已完成 ✅
- appConfig.js（完整：board + cards + map + game 所有属性）
- shotPhysics.js（完整）
- useIllustrateState.js + useIllustrateAnimation.js（修复 null guard + syncBalls）
- TrainingPicker.jsx（完整恢复，含 testConfig + illustrateConfig）
- useGameReducer.js（修复 makeHole 用 holePlan）
- Board.jsx（修复 makeHole + generateHoleFromMap 调用）
- IslandContainer.jsx（修复 handleNewGame 重置）
- CSS（134 个缺失类 → src/recovered.css）
- 静态资源（map/, mock-record/, npc-data/）

### 待恢复 ⚠️

以下内容经 2026-05-20 全面对比 `archive/index-DGISdab2.js` 确认缺失，按优先级排列。

---

#### P0 — 核心玩法缺失

##### 1. 基础牌组缺失 13 张牌（17→4）
- **文件**: `src/cards.js`
- **参照**: archive 中搜索 `iron_grip`, `power_nap`, `blind_faith`, `left_wind`, `right_wind`, `rain`, `tailwind`, `fog`, `squirrel_tax`, `mole_tunnel`, `angry_goose`, `sly_fox`, `lucky_rabbit`
- **丢失内容**:
  - 3 张玩家状态牌: `iron_grip`（Aim+3 Touch-2）、`power_nap`（Touch+1 Power+1 Aim-1）、`blind_faith`（Power+4 Aim-3）
  - 5 张天气牌: `left_wind`（左偏5-15yd）、`right_wind`（右偏5-15yd）、`rain`（距离-30%）、`tailwind`（距离+20%）、`fog`（随机偏移3-8yd）
  - 5 张动物事件牌: `squirrel_tax`（对手位移5-20yd）、`mole_tunnel`（自球前跳10-30yd）、`angry_goose`（对手Touch-2）、`sly_fox`（对手Aim-2）、`lucky_rabbit`（自球前跳5-15yd）
- **注意**: 恢复时需将 archive 的 `touchMod` 统一为当前代码的 `nerveMod`，`issueTriggerBonus` 统一为 `curseTriggerBonus`

##### 2. 卡牌评论子系统完全缺失
- **文件**: `src/commentaryEngine.js` + `src/commentaryTemplates.js`
- **参照**: archive 中搜索 `cardUse`, `brainrot_cardUse`, `cardUsed`, `cardId`, `{cardName}`, `{cardFlavor}`, `{targetName}`
- **丢失内容**:
  - 18 个卡牌使用评论模板（`cardUse` 和 `brainrot_cardUse` 两个模板池）
  - `commentaryEngine.js` 中缺少 `cardUsed` 路由逻辑（`getPoolKey` 函数）
  - `matchConditions` 中缺少 `cardId` 条件匹配
  - 新模板占位符: `{cardName}`, `{cardFlavor}`, `{targetName}`, `{power}`, `{aim}`, `{touch}`

##### 3. CommentaryFeed 渲染差异
- **文件**: `src/components/board/CommentaryFeed.jsx`
- **参照**: archive 中搜索 `commentary-feed`, `commentary-line`, `maxLines`
- **丢失内容**:
  - archive 版本 reverse 数组（最新消息在底部）
  - `maxLines` / 紧凑模式支持（截断显示）
  - 当前版本正向渲染 + 无截断

---

#### P1 — 逻辑 Bug / 功能缺失

##### 4. `drunk_swing` 丢失 `weirdCommentary: true`
- **文件**: `src/cards.js`
- **参照**: archive 搜索 `drunk_swing` → effect 中应有 `weirdCommentary: true`
- **当前**: effect 只有 `{powerRandom: 3}`，缺少 `weirdCommentary` 开关

##### 5. BALL_LANDED 缺少 `holedIn: true`
- **文件**: `src/hooks/useGameReducer.js` 第 354-365 行
- **参照**: archive 中 `BALL_LANDED` 的 `isHoled` 分支
- **问题**: 当 `isHoled === true` 时，archive 额外设置 `holedIn: true`，当前代码缺失。可能导致进洞状态异常

##### 6. DeckPickerScreen 缺少 "I Want It RAW" 选项
- **文件**: `src/components/DeckPickerScreen.jsx`
- **参照**: archive 搜索 `Nn`（DECKS 数组定义），应有 3 个选项
- **丢失内容**:
  - `{type:"none", label:"I Want It RAW", count:0, desc:"No cards, pure skill only", color:"#828282"}`
  - 条件渲染: `count > 0` 时才显示卡牌数量
  - 预览扇形: none 类型不显示卡牌预览
  - `dk-card-top` wrapper div（CSS 类已定义但 JSX 未使用）
- **注意**: `IslandContainer.jsx` 第 63 行的 handler 仍保留 `none` 分支，只是 UI 无法触发

---

#### P2 — 体验 / 数据差异

##### 7. 训练数据难度递进系统缺失
- **文件**: `src/data/trainingRecords.js`
- **参照**: archive 搜索 `Qt`（tier 定义数组）和 `$t`（archetype 映射）
- **丢失内容**:
  - 5 层难度递进（每天 radarMin/Max、scoreMin/Max、stabMin/Max 不同）
  - 确定性 archetype 分配（每天固定一个角色类型）
  - 当前代码所有天数用相同随机范围 + 随机 archetype
- **Archive tier 数据**:
  | 天 | radarMin | radarMax | scoreMin | scoreMax | stabMin | stabMax | Archetype |
  |---|---|---|---|---|---|---|---|
  | 0 | 2 | 4.5 | 25 | 50 | 1 | 2 | Raw Talent |
  | 1 | 3 | 5.5 | 35 | 60 | 1 | 3 | Wildcard |
  | 2 | 4 | 6.5 | 45 | 70 | 2 | 4 | Steady Eddie |
  | 3 | 5 | 7.5 | 55 | 80 | 2 | 5 | The Bomber |
  | 4 | 6 | 9 | 65 | 95 | 3 | 5 | The Closer |

##### 8. MapPicker 缺失功能
- **文件**: `src/components/MapPicker.jsx`
- **参照**: archive 搜索 `kn`（名称覆盖表）、`isDimmed`、`mp-card-dimmed`
- **丢失内容**:
  - 地图名称覆盖: `map_1→CMU Campus`, `map_2→The White House`, `map_3→World`, `map_4→Strait of Hormuz`
  - `isDimmed` prop — 未选中地图变暗（CSS 类 `mp-card-dimmed`）
  - 确认按钮文案: archive 用 "Go Next"，当前用 "Start Match"

##### 9. 现有 4 张卡牌的属性差异
- **文件**: `src/cards.js`
- **参照**: archive 搜索 `red_bull`, `drunk_swing`, `zen_mode`, `hot_head`
- **差异**:
  - `red_bull`: description 中 "Touch" → 当前 "Nerve"，flavorText 英→中
  - `zen_mode`: description 中 "Touch" → 当前 "Nerve"，flavorText 英→中
  - `hot_head`: description 中 "Issue" → 当前 "Curse"，flavorText 英→中
  - `drunk_swing`: flavorText 英→中（且缺 `weirdCommentary`，见上方 #4）
  - 这些差异是有意的重命名 + 本地化，恢复时以当前命名为准

---

#### P3 — 潜在 Bug（当前代码中）

##### 10. `onPracticeRange` prop 未被 TrainingPicker 接收
- **文件**: `src/components/IslandContainer.jsx` 第 435 行 → `src/components/TrainingPicker.jsx`
- **问题**: IslandContainer 传了 `onPracticeRange` prop 给 TrainingPicker，但 TrainingPicker 未 destructured 或使用该 prop，导致练习场入口不可达

##### 11. `accuracy` 计算后未使用
- **文件**: `src/components/PracticeRange.jsx` 第 109-111 行
- **问题**: 计算了 `accuracy` 变量但 JSX 中从未渲染

##### 12. `effectiveStats` 计算后未使用
- **文件**: `src/components/TrainingPicker.jsx` 第 105-108 行
- **问题**: `useMemo` 计算了 `effectiveStats` 但未传递给任何组件（archive 也有此问题，属死代码）

---

### 已验证匹配 ✅（无需修改）

以下模块经对比确认与 archive 完全一致：

| 模块 | 文件 | 说明 |
|---|---|---|
| 游戏配置 | `src/appConfig.js` | 所有数值、属性结构完全一致 |
| 物理引擎 | `src/utils/shotPhysics.js` | 16种挥杆问题、clutch、breakthrough 全部一致 |
| Brainrot 牌组 | `src/cards.js`（10张 brainrot） | 完全一致 |
| 记分卡 | `src/components/Scorecard.jsx` + CSS | 完全一致 |
| NPC 数据 | `src/components/IslandContainer.jsx` | 3 个 AI 对手属性完全一致 |
| 游戏主结构 | `src/App.jsx` + `AppProvider.jsx` | 路由骨架一致 |
| 照片/介绍动画 | archive `wt` 组件 | 完全一致 |
| CSS | `src/recovered.css` | 134 个类全部恢复 |

---

## 可能仍有缺失的内容

以下情况的内容可能尚未恢复：

- 在 Claude Code 对话中通过 Edit 做了修改，但最后一次 Read 发生在 Edit 之前很久，中间有多次 Edit 没有被追踪到
- 纯粹在本地编辑器中修改、从未通过 Claude Code 读取或修改过的文件
- 已经删除的文件（Claude Code 不会记录 `rm` 操作前的文件内容）
- **FireAnimation / GameFinished** — CSS 已恢复，组件逻辑需验证

## 以后如何避免

1. **频繁 commit** — 不要积累一周的未提交修改
2. **每次开始破坏性操作前** — Claude Code 应先检查 `git status` 并 stash 或 commit
3. **`.mcp.json` 等敏感文件** — 已加入 `.gitignore`，不会再被意外提交
