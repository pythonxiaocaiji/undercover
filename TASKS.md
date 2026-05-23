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

## 2024-01-XX - 修复玩家退出房间bug

### 问题描述
- **Bug**：玩家退出房间后，仍然显示在房间玩家列表中
- **影响**：房主可以继续开始游戏，但退出的玩家实际上已经不在房间里
- **复现步骤**：
  1. 多个玩家加入房间
  2. 其中一个玩家（非房主）退出房间
  3. 房主仍然可以看到该玩家
  4. 房主可以开始游戏，但该玩家不会收到任何消息

### 根本原因
后端 WebSocket 断开连接处理逻辑有问题：
- 只有在"大厅"阶段断开连接才会移除玩家
- 在游戏进行中（发言、投票、结果、结束）断开连接时，玩家不会被移除
- 这导致玩家退出后仍然保留在房间状态中

### 修复方案
修改 `backend/app/routers/ws.py` 中的 WebSocket 断开连接处理逻辑：

1. **非房主断开连接**
   - 无论在哪个阶段，都从房间状态中移除该玩家
   - 移除玩家后重新计算投票和游戏状态
   - 如果房间没有玩家了，自动解散房间

2. **游戏进行中的特殊处理**
   - 移除玩家后，重新检查胜负条件
   - 如果卧底全部退出 → 平民胜利
   - 如果卧底数量 ≥ 平民数量 → 卧底胜利
   - 自动切换到结束阶段并揭示所有玩家身份

3. **房主断开连接**
   - 保持原有逻辑：解散房间，通知所有玩家

### 修复效果
- ✅ 玩家退出后立即从房间列表中移除
- ✅ 房主看到的玩家列表实时更新
- ✅ 游戏进行中玩家退出会触发胜负判定
- ✅ 防止"幽灵玩家"问题
- ✅ 房间为空时自动解散

### 修改的文件
- `backend/app/routers/ws.py` - WebSocket 断开连接处理逻辑

### 测试建议
1. 大厅阶段玩家退出
2. 游戏进行中玩家退出
3. 投票阶段玩家退出
4. 结果阶段玩家退出
5. 所有玩家都退出（房间应该自动解散）
6. 房主退出（房间应该解散，其他玩家收到通知）

---

## 2024-01-XX - 图片压缩与音效系统

### 完成的功能

#### 1. 图片压缩功能 🖼️
- **新增库**：`browser-image-compression`
- **新增文件**：`src/lib/imageCompression.ts`
  - 自动压缩大图片到 1MB 以内
  - 最大尺寸限制 1920px
  - 保持 80% 图片质量
  - 使用 Web Worker 避免阻塞主线程
  - 如果图片已经很小，跳过压缩

- **功能特性**
  - 客户端验证（文件类型和大小）
  - 压缩前最大 10MB，压缩后最大 1MB
  - 支持 PNG/JPG/WebP 格式
  - 显示压缩比例和文件大小
  - 压缩失败时返回原文件

- **集成位置**
  - `ProfileView.tsx` - 头像上传时自动压缩
  - 优化上传体验，减少失败率

#### 2. 音效系统 🔊
- **新增文件**
  - `src/lib/sounds.ts` - 音效管理器
  - `src/lib/generatePlaceholderSounds.ts` - 占位音效生成器
  - `src/components/SoundControl.tsx` - 音效控制组件
  - `public/sounds/README.md` - 音效文件说明

- **音效管理器功能**
  - 音效预加载
  - 音量控制（0-1）
  - 静音开关
  - 本地存储用户设置
  - 单例模式

- **支持的音效类型**
  - `phase_change` - 阶段切换
  - `game_start` - 游戏开始
  - `vote` - 投票
  - `eliminated` - 玩家淘汰
  - `victory` - 胜利
  - `defeat` - 失败
  - `player_join` - 玩家加入
  - `player_leave` - 玩家离开
  - `ready` - 准备
  - `notification` - 通知

- **音效控制组件**
  - 悬浮按钮，固定在右上角
  - 音量滑块（鼠标悬停显示）
  - 静音/取消静音切换
  - 实时音量调节
  - 测试音效播放

- **音效触发点**
  - 阶段切换时播放 `phase_change`
  - 游戏开始时播放 `game_start`
  - 投票时播放 `vote`
  - 玩家淘汰时播放 `eliminated`
  - 游戏结束时播放 `victory` 或 `defeat`
  - 进入投票阶段播放 `notification`

#### 3. 用户体验优化
- **图片上传**
  - 自动压缩，提升成功率
  - 更友好的错误提示
  - 支持更大的原始文件（10MB）

- **音效体验**
  - 用户可自由控制音量和静音
  - 设置持久化到本地存储
  - 音效文件缺失时自动跳过，不影响游戏

### 技术实现

#### 图片压缩
```typescript
// 使用示例
const compressedFile = await compressImage(originalFile, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.8,
});
```

#### 音效系统
```typescript
// 初始化
soundManager.init();

// 播放音效
soundManager.play('vote');

// 控制音量
soundManager.setVolume(0.5);

// 静音
soundManager.toggleMute();
```

### 修改的文件
- `src/components/ProfileView.tsx` - 集成图片压缩
- `src/App.tsx` - 集成音效系统和控制按钮
- `package.json` - 添加 `browser-image-compression` 依赖

### 新增的文件
- `src/lib/imageCompression.ts`
- `src/lib/sounds.ts`
- `src/lib/generatePlaceholderSounds.ts`
- `src/components/SoundControl.tsx`
- `public/sounds/README.md`

### 待完成
- [ ] 添加真实的音效文件（目前使用占位音效）
- [ ] 添加更多音效触发点（玩家加入/离开）
- [ ] 考虑添加背景音乐
- [ ] 添加音效预设（不同主题）

---

## 待办事项
- [ ] 添加图片压缩功能（可选）
- [ ] 优化大文件上传进度显示
- [ ] 添加更多阶段转换动画效果
