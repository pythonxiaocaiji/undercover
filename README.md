# 谁是卧底 (Who is the Undercover) - 互动派对游戏

这是一个基于 React 和 Tailwind CSS 开发的现代、流畅的“谁是卧底”互动派对游戏。它拥有精美的 UI 设计、流畅的动画效果以及完整的游戏逻辑，适合多人在线或线下聚会使用。

## 📝 项目介绍

“谁是卧底”是一款极受欢迎的语言表达与逻辑推理游戏。在游戏中，大部分玩家会拿到同一个词语（平民），而极少数玩家会拿到一个高度相似但不同的词语（卧底）。玩家需要通过描述自己的词语来找出潜伏在其中的卧底，而卧底则需要隐藏身份并尝试生存到最后。

本项目致力于提供一个视觉精美、交互流畅的数字版游戏体验，支持自定义房间配置、实时状态同步模拟以及丰富的互动表情。

## ✨ 功能介绍

- **房间管理**：
  - **创建房间**：自定义玩家人数（4-10人）、发言时间、投票时间、词语分类及卧底人数。
  - **加入房间**：通过房间 ID 快速进入现有游戏。
  - **房主系统**：首位进入房间的玩家自动成为房主，拥有开始游戏的权限。
- **准备机制**：所有玩家准备就绪后，房主可手动开启游戏，确保游戏开始前全员在线。
- **游戏流程**：
  - **大厅阶段**：玩家集结与准备。
  - **发言阶段**：玩家轮流发言描述词语，支持倒计时提醒。
  - **投票阶段**：全员参与投票，实时显示投票状态。
  - **结果展示**：自动计算投票结果，展示出局玩家及其真实身份。
  - **胜负判定**：实时监测平民与卧底人数，自动判定最终胜方。
- **互动体验**：
  - **词语查看**：随时查看自己的秘密词语。
  - **表情系统**：玩家之间可以发送实时气泡表情进行互动。
  - **退出确认**：自定义确认弹窗，防止误触导致游戏中断。
- **响应式设计**：完美适配移动端与桌面端，提供一致的视觉体验。

## 🚀 使用技术

- **前端框架**：React 18
- **编程语言**：TypeScript
- **样式处理**：Tailwind CSS
- **动画引擎**：Framer Motion (`motion/react`)
- **图标库**：Lucide React
- **构建工具**：Vite
- **字体**：Inter & Playfair Display (Google Fonts)

## 🧩 后端（FastAPI + MySQL + Redis）

本仓库包含一个 `backend/` 目录，用于提供多人联机所需的房间与状态同步服务：

- **HTTP REST**：创建/加入房间等
- **WebSocket**：房间内实时广播 `state`，并在开始游戏时对每位玩家私发 `secret`（身份/词语）
- **MySQL**：保存房间、玩家等基础数据
- **Redis**：保存房间权威状态（`state`）与每位玩家的秘密信息（`secrets`）

### 接口地址

- **REST 基址**：`http://localhost:8000`
- **健康检查**：`GET /health`
- **WebSocket**：`ws://localhost:8000/ws/rooms/{roomId}?playerId={playerId}`

### 关键消息类型（WebSocket）

- **下发房间状态**：`{ "type": "state", "payload": <BackendRoomState> }`
- **私发秘密信息**：`{ "type": "secret", "payload": { playerId, role, word } }`
- **客户端上行**：
  - `player:ready`
  - `game:start`
  - `vote`
  - `reaction`
  - `state:update`（房主驱动计时/阶段推进时推送）

### 环境变量

后端示例：`backend/.env.example`（复制为 `backend/.env` 后修改）

前端示例：根目录 `.env.example`（复制为 `.env` 后修改）

- `VITE_BACKEND_URL`：前端调用后端的 base URL（例如 `http://localhost:8000`）

### 启动后端

在 `backend/` 目录下：

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果你使用 **Conda** 管理 Python 环境（推荐本机开发用这种方式），可以这样做：

```bash
conda create -n undercover-backend python=3.11 -y
conda activate undercover-backend

pip install -r backend/requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

注意：需要本机已启动 **MySQL** 与 **Redis**，并在 `backend/.env` 中配置连接信息。

## 🛠️ 安装手册

在开始之前，请确保您的开发环境中已安装了 [Node.js](https://nodejs.org/) (建议版本 18+)。

1. **克隆/下载项目**：
   将项目源码下载到本地目录。

2. **安装依赖**：
   在项目根目录下运行以下命令安装必要的 npm 包：
   ```bash
   npm install
   ```

## 💻 运行命令

- **启动开发服务器**：
  ```bash
   npm run dev
   ```
  启动后，您可以在浏览器中访问 `http://localhost:3000` 查看应用。

### 前端是否由后端代理？

目前代码实现是：

- **前端（Vite）直接请求后端**（由 `VITE_BACKEND_URL` 控制 REST/WS 地址）
- **没有使用后端反向代理前端请求**

如果你希望本地开发走同源代理（例如 `/api` 转发到 `:8000`），我们可以后续在 `vite.config.ts` 增加 `server.proxy` 来实现。

- **构建生产版本**：
  ```bash
  npm run build
  ```
  该命令会将项目编译到 `dist` 目录中。

- **代码检查**：
  ```bash
  npm run lint
  ```

---

希望您能享受这款游戏！如果有任何建议或问题，欢迎随时反馈。
