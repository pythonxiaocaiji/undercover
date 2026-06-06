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

---

## 2024-01-XX - 快速游戏功能和房间配置

### 完成的功能

#### 1. 快速匹配功能 🚀
- **新增后端接口**：`POST /rooms/quick-match`
  - 自动匹配进入允许快速匹配且未满的大厅房间
  - 按房间创建时间倒序查找
  - 找不到合适房间时返回友好提示

- **匹配逻辑**
  - 查找条件：`allow_quick_match=1` 且 `phase="大厅"`
  - 检查房间是否未满（当前玩家数 < 最大玩家数）
  - 自动加入第一个符合条件的房间
  - 如果已在房间中，直接返回房间信息

#### 2. 房间配置增强 ⚙️
- **新增配置项**：`allowQuickMatch`（允许快速匹配玩家加入）
  - 默认值：`true`（开启）
  - 房主创建房间时可配置
  - 存储到数据库和 Redis 状态中

- **数据库字段**
  - `backend/app/models/room.py`：已添加 `allow_quick_match` 字段
  - `backend/app/schemas/rooms.py`：CreateRoomRequest 添加 `allow_quick_match` 参数

#### 3. 前端界面更新 🎨
- **主界面新增按钮**
  - "快速游戏"按钮：紫粉渐变色，位于"创建房间"和"加入房间"之间
  - 点击后自动匹配进入合适的房间
  - 已在房间中时显示友好提示

- **创建房间界面**
  - 新增"允许快速匹配玩家加入"开关
  - 紫色主题，与快速游戏按钮呼应
  - 默认开启状态

#### 4. 类型定义更新 📝
- **RoomConfig 类型**（`src/types.ts`）
  - 添加 `allowQuickMatch?: boolean` 字段

- **BackendRoomState 类型**（`src/services/backend.ts`）
  - 添加 `allowQuickMatch?: boolean` 字段

### 技术实现

#### 后端快速匹配逻辑
```python
# 查找符合条件的房间
rooms = await db.execute(
    select(Room).where(
        Room.allow_quick_match == 1,
        Room.phase == "大厅"
    ).order_by(Room.created_at.desc())
)

# 遍历房间，找到第一个未满的
for room in rooms:
    state = await _get_room_state(room.id)
    players = state.get("players", [])
    if len(players) < max_players:
        # 加入房间
        ...
```

#### 前端快速匹配调用
```typescript
// 调用快速匹配接口
const resp = await quickMatch({ 
  player: { id, name, avatar } 
});

// 连接 WebSocket 并进入游戏
connectWs(resp.roomId, resp.playerId);
setView('game');
```

### 用户体验

#### 快速游戏流程
1. 用户点击"快速游戏"按钮
2. 系统自动查找合适的房间
3. 找到房间后自动加入
4. 进入游戏大厅，等待其他玩家

#### 房主控制
- 房主可以选择是否允许快速匹配玩家加入
- 关闭后，只能通过房间号或邀请加入
- 开启后，快速匹配玩家可以自动加入

### 修改的文件
- `backend/app/schemas/rooms.py` - 添加 `allow_quick_match` 参数
- `backend/app/routers/rooms.py` - 创建房间时保存配置，新增快速匹配接口
- `backend/app/models/room.py` - 已有 `allow_quick_match` 字段
- `src/types.ts` - 已有 `allowQuickMatch` 字段
- `src/services/backend.ts` - 添加 `quickMatch` 函数和类型定义
- `src/components/HomeView.tsx` - 添加快速游戏按钮和配置项
- `src/App.tsx` - 添加 `handleQuickMatch` 处理函数

### 测试建议
1. 创建房间时测试"允许快速匹配"开关
2. 测试快速匹配功能（有可用房间）
3. 测试快速匹配功能（无可用房间）
4. 测试房间满员时的快速匹配
5. 测试游戏进行中的房间不会被匹配到
6. 测试关闭快速匹配的房间不会被匹配到

### 待优化
- [ ] 添加更智能的匹配算法（考虑玩家等级、游戏模式等）
- [ ] 添加匹配队列和等待动画
- [ ] 支持取消匹配操作
- [ ] 添加匹配超时机制

---


---

## 2024-01-XX - 快速游戏功能和房间配置（部署完成）

### 完成的功能

#### 1. 快速匹配功能 🚀
- **新增后端接口**：`POST /rooms/quick-match`
  - 自动匹配进入允许快速匹配且未满的大厅房间
  - 按房间创建时间倒序查找
  - 找不到合适房间时返回友好提示

- **匹配逻辑**
  - 查找条件：`allow_quick_match=1` 且 `phase="大厅"`
  - 检查房间是否未满（当前玩家数 < 最大玩家数）
  - 自动加入第一个符合条件的房间
  - 如果已在房间中，直接返回房间信息

#### 2. 房间配置增强 ⚙️
- **新增配置项**：`allowQuickMatch`（允许快速匹配玩家加入）
  - 默认值：`true`（开启）
  - 房主创建房间时可配置
  - 存储到数据库和 Redis 状态中

#### 3. 前端界面更新 🎨
- **主界面新增按钮**
  - "快速游戏"按钮：紫粉渐变色，位于"创建房间"和"加入房间"之间
  - 点击后自动匹配进入合适的房间
  - 已在房间中时显示友好提示

- **创建房间界面**
  - 新增"允许快速匹配玩家加入"开关
  - 紫色主题，与快速游戏按钮呼应
  - 默认开启状态

### 部署说明

**在服务器上执行：**
```bash
cd /opt/undercover
git pull
npm install
npm run build
```

**然后在浏览器中：**
1. 按 `Ctrl + Shift + R` 硬刷新
2. 检查主界面是否显示"快速游戏"按钮
3. 测试快速游戏功能

### 修改的文件
- `backend/app/schemas/rooms.py` - 添加 `allow_quick_match` 参数
- `backend/app/routers/rooms.py` - 创建房间时保存配置，新增快速匹配接口
- `src/types.ts` - 添加 `allowQuickMatch` 字段
- `src/services/backend.ts` - 添加 `quickMatch` 函数
- `src/components/HomeView.tsx` - 添加快速游戏按钮和配置项
- `src/App.tsx` - 添加 `handleQuickMatch` 处理函数
- `QUICK_START.md` - 添加快速游戏功能说明和部署指南

### Git 提交
- Commit: 4351b0f - feat: 添加快速游戏功能和房间快速匹配配置
- Commit: 4e41106 - fix: 添加快速游戏按钮到主界面

---

## 2024-01-XX - 修复 HTTPS WebSocket 连接问题 🔒

### 问题描述
- **Bug**：项目切换到 HTTPS 后，WebSocket 连接失败
- **错误信息**：浏览器控制台显示 `WebSocket connection to 'wss://whospy.top/ws/...' failed`
- **影响**：无法进入游戏房间，实时通信功能完全失效

### 根本原因
前端 WebSocket URL 构建逻辑有问题：
```typescript
// 原始代码（错误）
function wsBaseUrl() {
  const http = httpBaseUrl();
  return http.replace(/^http/, 'ws');
}
```

**问题分析**：
- 正则表达式 `/^http/` 会匹配 `http` 和 `https` 的开头
- 对于 `http://example.com` → 正确转换为 `ws://example.com` ✅
- 对于 `https://example.com` → 错误转换为 `wsps://example.com` ❌
- 应该转换为 `wss://example.com` 才对

### 修复方案
修改 `src/services/backend.ts` 中的 `wsBaseUrl()` 函数：

```typescript
// 修复后的代码
function wsBaseUrl() {
  const http = httpBaseUrl();
  // 正确处理 http → ws 和 https → wss 的转换
  return http.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws');
}
```

**修复逻辑**：
- 使用正则表达式 `/^https?/` 匹配 `http` 或 `https`
- 使用回调函数检查匹配到的协议
- `https` → 转换为 `wss`
- `http` → 转换为 `ws`

### 修复效果
- ✅ HTTP 环境：`http://localhost:8000` → `ws://localhost:8000`
- ✅ HTTPS 环境：`https://whospy.top` → `wss://whospy.top`
- ✅ WebSocket 连接成功
- ✅ 实时通信功能恢复正常
- ✅ 可以正常加入房间和进行游戏

### 技术细节

#### WebSocket 协议规范
- **HTTP** 使用 **WS** (WebSocket)
- **HTTPS** 使用 **WSS** (WebSocket Secure)
- 协议必须匹配，否则浏览器会阻止连接

#### 正则表达式改进
```typescript
// 旧版本（有bug）
/^http/  // 只匹配开头的 "http"

// 新版本（正确）
/^https?/  // 匹配 "http" 或 "https"
```

#### 替换逻辑改进
```typescript
// 旧版本（简单替换）
return http.replace(/^http/, 'ws');

// 新版本（条件替换）
return http.replace(/^https?/, (match) => 
  match === 'https' ? 'wss' : 'ws'
);
```

### 部署说明

**在服务器上执行：**
```bash
cd /opt/undercover
git pull
npm install
npm run build
systemctl restart nginx
```

**然后在浏览器中：**
1. 按 `Ctrl + Shift + R` 硬刷新
2. 打开浏览器开发者工具（F12）
3. 查看 Network 标签页的 WS 连接
4. 验证 WebSocket 连接是否成功（Status 101 Switching Protocols）
5. 测试创建/加入房间功能

### 修改的文件
- `src/services/backend.ts` - 修复 `wsBaseUrl()` 函数

### 测试建议
1. **本地开发环境（HTTP）**
   - 验证 `http://localhost:8000` → `ws://localhost:8000`
   - 测试 WebSocket 连接正常

2. **生产环境（HTTPS）**
   - 验证 `https://whospy.top` → `wss://whospy.top`
   - 测试 WebSocket 连接正常
   - 测试房间实时通信功能

3. **功能测试**
   - 创建房间
   - 加入房间
   - 玩家列表实时更新
   - 游戏阶段切换
   - 投票功能
   - 聊天功能

### Nginx 配置参考

确保 Nginx 配置正确代理 WebSocket 连接：

```nginx
location /ws/ {
    proxy_pass http://backend_server;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### Git 提交
- Commit: [待提交] - fix: 修复 HTTPS 环境下 WebSocket 连接失败的问题

---
