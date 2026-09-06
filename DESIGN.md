# Design System - 周期音乐提醒

## 气质与意象

清晨书桌上摊开的计划本，旁边放着一杯清水和一副耳机。页面像白纸一样干净，蓝色是钢笔划过的痕迹——清晰、克制、有方向感。

## 配色方案

| 用途 | 色值 | 意象 |
|------|------|------|
| 主色 (Primary) | `#2563EB` | 钴蓝墨水，行动与焦点 |
| 主色浅 (Primary Light) | `#DBEAFE` | 墨水晕染，选中态/高亮背景 |
| 背景 (Background) | `#FFFFFF` | 白纸 |
| 次级背景 (Surface) | `#F8FAFC` | 纸面微灰，区分层级 |
| 卡片边框 (Border) | `#E2E8F0` | 铅笔轻线 |
| 文字主 (Text Primary) | `#0F172A` | 墨黑 |
| 文字副 (Text Secondary) | `#64748B` | 铅笔字 |
| 文字弱 (Text Muted) | `#94A3B8` | 褪色墨迹 |
| 成功 (Success) | `#10B981` | 完成标记的绿 |
| 警告 (Warning) | `#F59E0B` | 提醒琥珀 |
| 危险 (Danger) | `#EF4444` | 错误红 |

## 排版

- 页面标题：fontSize 28, fontWeight 700, color `#0F172A`
- 卡片标题：fontSize 17, fontWeight 600, color `#0F172A`
- 正文：fontSize 15, fontWeight 400, color `#64748B`, lineHeight 22
- 辅助：fontSize 12, color `#94A3B8`
- 数字强调：fontSize 36, fontWeight 700, color `#2563EB`

## 组件风格

- **卡片**: backgroundColor `#FFFFFF`, borderRadius 16, borderWidth 1, borderColor `#E2E8F0`, padding 20
- **主按钮**: backgroundColor `#2563EB`, borderRadius 14, paddingVertical 16, 白色文字 fontWeight 600
- **次按钮**: backgroundColor `#F1F5F9`, borderRadius 14, paddingVertical 16, 蓝色文字
- **输入框**: backgroundColor `#F8FAFC`, borderRadius 12, borderWidth 1, borderColor `#E2E8F0`, padding 14
- **状态标签**: 小圆角胶囊，背景为主色10%透明度，文字为主色

## 图标

使用 `@expo/vector-icons` 的 `Ionicons` 或 `FontAwesome6`，线宽统一 2px。

## 设计禁忌

- 不用渐变背景
- 不用重阴影（仅极轻阴影或纯边框）
- 不用超过 3 种颜色
- 不用圆角超过 20px 的元素（按钮/卡片 14-16px 即可）
