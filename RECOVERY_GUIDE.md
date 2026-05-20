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

## 可能仍有缺失的内容

以下情况的内容可能尚未恢复：

- 在 Claude Code 对话中通过 Edit 做了修改，但最后一次 Read 发生在 Edit 之前很久，中间有多次 Edit 没有被追踪到
- 纯粹在本地编辑器中修改、从未通过 Claude Code 读取或修改过的文件
- 已经删除的文件（Claude Code 不会记录 `rm` 操作前的文件内容）

## 以后如何避免

1. **频繁 commit** — 不要积累一周的未提交修改
2. **每次开始破坏性操作前** — Claude Code 应先检查 `git status` 并 stash 或 commit
3. **`.mcp.json` 等敏感文件** — 已加入 `.gitignore`，不会再被意外提交
