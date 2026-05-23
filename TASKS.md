# 开发任务记录

## 2024-01-XX - 手机端界面优化与阶段提示动画

### 完成的功能

#### 1. 手机端响应式优化
- **TopBar（顶部栏）**
  - 优化内边距：`px-3 sm:px-6`，`py-3 sm:py-4`
  - 房间ID在小屏幕隐藏：`hidden sm:inline-block`
  - 文字大小自适应：`text-sm sm:text-lg`
  - 优化布局防止文字溢出，添加 `truncate` 和 `min-w-0`

- **PlayerCard（玩家卡片）**
  - 头像大小：`w-14 h-14 sm:w-16 sm:h-16`
  - 内边距：`p-3 sm:p-4`
  - 圆角：`rounded-2xl sm:rounded-3xl`
  - 文字大小：`text-xs sm:text-sm`
  - 选中环宽度：`ring-2 sm:ring-4`

- **ActionBar（底部操作栏）**
  - 按钮高度：`h-12 sm:h-14`
  - 图标大小：`w-4 h-4 sm:w-5 sm:h-5`
  - 圆角：`rounded-xl sm:rounded-2xl`
  - 间距：`gap-2 sm:gap-4`
  - 底部内边距：`p-3 sm:p-6`

- **SpeakerFocus（发言焦点）**
  - 进度环：`w-32 h-32 sm:w-40 sm:h-40`
  - 头像：`w-24 h-24 sm:w-28 sm:h-28`
  - 文字和按钮大小优化
  - 间距：`py-6 sm:py-10`

- **主界面布局**
  - 底部内边距：`pb-24 sm:pb-32`
  - 页面内边距：`px-3 sm:px-6`
  - 玩家列表网格：`grid-cols-2 sm:grid-cols-3 md:grid-cols-4`
  - 各种弹窗和浮层的响应式调整

#### 2. 阶段转换动画
- **新增组件**：`PhaseTransition.tsx`
  - 3D 翻转动画效果（rotateY）
  - 每个阶段独特的渐变背景色
  - 装饰性脉动光晕效果
  - 图标缩放和旋转动画
  - 底部动态加载点

- **阶段配置**
  - 大厅：蓝紫渐变 + Play 图标
  - 发言：蓝色渐变 + 麦克风图标
  - 投票：红色渐变 + 投票图标
  - 结果：黄色渐变 + 奖杯图标
  - 结束：绿色渐变 + 奖杯图标

- **触发逻辑**
  - 阶段切换时自动显示 2.5 秒
  - 使用 `prevPhaseRef` 追踪阶段变化
  - 大厅阶段不显示转换动画

#### 3. 修复手机端上传图片 Bug
- **问题**：手机端上传图片报错 `request_failed_413`，但前端未正确显示错误信息

- **修复内容**
  - **前端错误处理优化**（`src/services/auth.ts`）
    - 改进 `throwIfNotOk` 函数，添加常见 HTTP 状态码的友好错误提示
    - 413: "文件过大，请选择小于5MB的图片"
    - 415: "不支持的文件格式"
    - 422: "请求数据验证失败"
    - 等其他常见状态码

  - **客户端文件验证**（`src/services/auth.ts`）
    - 在 `uploadAvatar` 函数中添加客户端验证
    - 文件大小限制：5MB
    - 文件类型限制：PNG/JPG/WebP
    - 在上传前进行验证，避免不必要的网络请求

  - **ProfileView 组件优化**（`src/components/ProfileView.tsx`）
    - 在 `onPickFile` 中添加前置验证
    - 优化手机端响应式布局
    - 改进错误提示显示
    - 优化按钮和输入框的手机端尺寸

### 修改的文件
- `src/components/TopBar.tsx`
- `src/components/PlayerCard.tsx`
- `src/components/ActionBar.tsx`
- `src/components/SpeakerFocus.tsx`
- `src/components/PhaseTransition.tsx`（新增）
- `src/components/ProfileView.tsx`
- `src/services/auth.ts`
- `src/App.tsx`

### 技术要点
- Tailwind CSS 响应式断点（`sm:`、`md:`）
- Framer Motion 动画库
- React Hooks（useState、useRef、useEffect）
- 客户端文件验证
- 友好的错误提示

---

## 待办事项
- [ ] 添加图片压缩功能（可选）
- [ ] 优化大文件上传进度显示
- [ ] 添加更多阶段转换动画效果
