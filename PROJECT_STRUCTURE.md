# 项目结构与功能-代码目录映射（索引文档）

本文档用于后续改动时快速定位代码：**你提出功能/BUG -> 我先读本文档 -> 按映射打开对应前后端文件 -> 再修改**。

## 1. 仓库目录概览

- **前端（Vite + React + TS）**：`src/`
- **后端（FastAPI）**：`backend/app/`
- **上传静态资源（后端挂载）**：`backend/uploads/`（通过 `/uploads` 访问）

## 2. 前端目录结构（`src/`）

- **入口**
  - `src/main.tsx`
    - React 渲染入口
    - 注入 `ToastProvider`
  - `src/App.tsx`
    - 应用主状态机（view 切换 + 房间连接/恢复 + WS 消息处理 + 房主计时驱动）

- **类型与模型**
  - `src/types.ts`
    - `Player` / `GameState` / `RoomConfig` / `PlayerRole` 等

- **后端通信层（强约束：修改接口/协议优先改这里）**
  - `src/services/backend.ts`
    - REST：`createRoom` / `joinRoom` / `listWordCategories` / 词库管理（admin CRUD）
    - WebSocket：`connectRoomWs` + `wsSendReady`/`wsSendStart`/`wsSendVote`/`wsSendReaction`/`wsSendStateUpdate`/`wsSendRestart`
  - `src/services/auth.ts`
    - JWT：`login` / `registerWithCaptcha` / `me` / `updateProfile` / `uploadAvatar`

- **UI 组件/页面（`src/components/`）**
  - `HomeView.tsx`
    - 首页（创建房间/加入房间/规则弹窗/返回房间入口/词库管理入口）
  - `AuthView.tsx`
    - 登录/注册 + 图形验证码
  - `ProfileView.tsx`
    - 用户名/头像设置 + 上传头像
  - `WordsAdminView.tsx`
    - 管理员：词库分类与词对 CRUD
  - `Toast.tsx`
    - 全局 Toast 通知系统（替代 `window.alert`）
  - 其余与游戏界面相关组件：
    - `TopBar.tsx`（顶部房间信息/阶段/倒计时/退出）
    - `ActionBar.tsx`（底部操作：准备/开始/投票/查看词语/表情）
    - `VotingModal.tsx`（投票弹窗）
    - `PlayerCard.tsx`（玩家卡片 + 表情气泡）
    - `SpeakerFocus.tsx`（当前发言/投票阶段焦点与倒计时）
    - `ConfirmModal.tsx`（退出/删除等确认弹窗）

## 3. 后端目录结构（`backend/app/`）

- **入口与中间件**
  - `backend/app/main.py`
    - FastAPI app 创建
    - CORS
    - `/uploads` 静态目录挂载
    - include routers：`health`/`auth`/`rooms`/`ws`/`words`
    - lifespan 启动：创建表（`Base.metadata.create_all`）+ 启动时轻量迁移 `users.role` + 同步 `ADMIN_PHONES`

- **路由（authoritative API/协议入口）**：`backend/app/routers/`
  - `health.py`
    - `GET /health`
  - `auth.py`（prefix `/auth`）
    - `GET /auth/captcha`：生成图形验证码（存 Redis）
    - `POST /auth/register`：注册（校验验证码）
    - `POST /auth/login`：登录（校验验证码，返回 JWT）
    - `GET /auth/me`：当前用户
    - `PUT /auth/profile`：更新用户名/头像 URL
    - `POST /auth/avatar`：上传头像文件（写入 `backend/uploads/avatars`，返回可访问 URL）
  - `rooms.py`（prefix `/rooms`，以 REST 为主）
    - `POST /rooms`：创建房间（写 DB + 初始化 Redis 权威 `state`，并广播 WS `state`）
    - `POST /rooms/{roomId}/join`：加入房间（大厅阶段可加入）
    - `GET /rooms/{roomId}/state`：获取 Redis 中房间权威状态
    - `POST /rooms/{roomId}/ready`：设置准备（写 Redis 并广播；同时同步 DB player）
    - `POST /rooms/{roomId}/state`：房主更新状态（写 Redis 并广播）
    - `POST /rooms/{roomId}/start`：开始游戏（切到发言阶段并广播）
    - `POST /rooms/{roomId}/vote`：投票（注：当前前端主要走 WS 投票；此 REST 可能仅用于基础/旧流程）
    - `POST /rooms/{roomId}/reaction`：表情（同上：前端主要走 WS）
  - `ws.py`（prefix `/ws`，房间实时逻辑核心）
    - `WS /ws/rooms/{roomId}?playerId=...`
    - 接收客户端上行：`player:ready` / `game:start` / `vote` / `reaction` / `state:update` / `game:restart`
    - 下发：`state` 广播、`secret` 私发（身份/词语）、`room:closed`、`error`
  - `words.py`（prefix `/words`）
    - `GET /words/categories`：列出分类（若空则 seed）
    - `GET /words/pairs?category_id=...`：列出词对
    - `GET /words/random?category=...`：随机抽取词对（用于开始游戏）
    - admin（需要 JWT 且 role=2）：
      - `POST /words/categories`
      - `DELETE /words/categories/{id}`
      - `POST /words/pairs`
      - `DELETE /words/pairs/{id}`

- **WebSocket 连接管理**
  - `backend/app/ws/manager.py`
    - `ConnectionManager`：按 room 维护连接集合 + room->player->ws 映射
    - `broadcast(room_id, msg)` / `send_to_player(room_id, player_id, msg)`

- **Redis 权威状态存储**
  - `backend/app/redis/client.py`：`redis_client`
  - room state key：`room:{roomId}:state`
  - room secrets key：`room:{roomId}:secrets`（hash，playerId -> secret json）

## 4. 核心业务功能到代码位置映射（最常用）

### 4.1 登录 / 注册 / 验证码 / JWT

- **前端**
  - UI：`src/components/AuthView.tsx`
  - API：`src/services/auth.ts`
  - 入口/鉴权流：`src/App.tsx`（启动时 `getToken()` -> `me()` -> 进入 home/game）
- **后端**
  - 路由：`backend/app/routers/auth.py`
  - JWT/鉴权：`backend/app/core/security.py`（后续若要改 token/权限需要读此文件）
  - 验证码存储：Redis `captcha:{captcha_id}`

### 4.2 个人资料（用户名/头像/上传）

- **前端**
  - UI：`src/components/ProfileView.tsx`
  - API：`src/services/auth.ts`（`updateProfile` / `uploadAvatar`）
- **后端**
  - 路由：`backend/app/routers/auth.py`（`/auth/profile`、`/auth/avatar`）
  - 静态文件：`backend/app/main.py` 挂载 `/uploads`
  - 文件落盘：`backend/uploads/avatars/`

### 4.3 房间：创建 / 加入 / 恢复（本地缓存 active room）

- **前端**
  - UI：`src/components/HomeView.tsx`
  - 主流程：`src/App.tsx`
    - 本地缓存：`ACTIVE_ROOM_KEY = undercover_active_room`（roomId + playerId）
    - `handleStartGame` 调 `createRoom` -> `connectWs`
    - `handleJoinRoom` 调 `joinRoom` -> `connectWs`
    - `handleResumeRoom`：读取缓存后重连
  - API：`src/services/backend.ts`（`createRoom`/`joinRoom`/`connectRoomWs`）
- **后端**
  - REST：`backend/app/routers/rooms.py`（创建/加入/基础 state）
  - 权威状态：Redis `room:{roomId}:state`

### 4.4 实时同步：房间 WS 通道、state 广播、错误与解散

- **前端**
  - WS 建立：`src/services/backend.ts` -> `connectRoomWs`
  - WS 消息处理：`src/App.tsx` 的 `ws.onmessage`
    - `state`：驱动 UI（`applyBackendState`）
    - `secret`：保存 `mySecret`
    - `room:closed`/`error`：Toast + `confirmExit()` 返回首页
- **后端**
  - WS 路由/协议：`backend/app/routers/ws.py`
  - 连接管理：`backend/app/ws/manager.py`

### 4.5 游戏流程：大厅 -> 发言 -> 投票 -> 结果 -> 结束；房主计时推进

- **前端（房主驱动）**
  - 计时与阶段推进：`src/App.tsx` 的 `useEffect` interval
    - 当 `isHost` 且 phase ∈ {发言, 投票, 结果} 时，本地倒计时并通过 `wsSendStateUpdate` 推送
    - 发言结束 -> 切投票；结果倒计时结束 -> 下一轮发言或结束
  - 跳过发言：`handleSkipSpeaking`（仅当前发言者可触发）
  - 投票 UI：`src/components/VotingModal.tsx` + `src/components/ActionBar.tsx`
- **后端（权威结算/分配）**
  - 开始游戏：`backend/app/routers/ws.py`（`game:start`）
    - 抽词：从 DB 选分类与词对
    - 分配卧底数量、写入 `room:{roomId}:secrets`
    - 对每个 player 私发 `secret`
  - 投票与结算：`backend/app/routers/ws.py`（`vote` + `_settle_vote_if_needed` 等内部函数）
    - PK 最多 3 轮，超出随机淘汰
    - 胜负判定：卧底清零 -> 平民胜；卧底数 ≥ 平民数 -> 卧底胜
    - 结果阶段倒计时结束自动下一轮（由房主 state:update 触发结算时机）

### 4.6 表情/互动（reaction）

- **前端**
  - 发送：`src/services/backend.ts` -> `wsSendReaction`
  - UI：`PlayerCard.tsx`（展示气泡） + `App.tsx`（维护 `reactions` map + 3s 自动清理）
- **后端**
  - WS：`backend/app/routers/ws.py`（`reaction`）
  - 存储：写入 room state 的 `reactions` 字段 + broadcast `reaction` 与 `state`

### 4.7 词库管理（管理员）

- **前端**
  - 页面：`src/components/WordsAdminView.tsx`
  - API：`src/services/backend.ts`（`adminCreateWordCategory`/`adminDeleteWordCategory`/`adminCreateWordPair`/`adminDeleteWordPair`）
  - 入口：`src/App.tsx`（home 中点击，需 `authMe.is_admin`）
- **后端**
  - 路由：`backend/app/routers/words.py`
  - 权限：`users.role == 2`（admin）

## 5. WS 协议速查（前后端共同约定）

- **下行（server -> client）**
  - `state`：`{ type: 'state', payload: BackendRoomState }`
  - `secret`：`{ type: 'secret', payload: { playerId, role, word } }`
  - `reaction`：`{ type: 'reaction', payload: { targetPlayerId, emoji, fromPlayerId? } }`
  - `room:closed` / `error`

- **上行（client -> server）**（见 `src/services/backend.ts`）
  - `player:ready`
  - `game:start`
  - `game:restart`
  - `vote`
  - `reaction`
  - `state:update`

## 6. 环境变量与运行相关

- **前端**（根目录 `.env`）：
  - `VITE_BACKEND_URL`：例如 `http://localhost:8000`

- **后端**（`backend/.env`，示例见 `backend/.env.example`）：
  - MySQL/Redis/JWT/CORS/ADMIN_PHONES 等

## 7. 后续协作约定（你提出修改时我会这样做）

- **第 1 步**：我会先读取本文件 `PROJECT_STRUCTURE.md`
- **第 2 步**：根据你描述的功能点，定位到本文件中对应条目，列出需要打开的前后端文件
- **第 3 步**：再读取这些文件并实施修改（避免盲改/改错文件）

