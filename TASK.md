# TASK

## 已完成

- [x] 阅读 README / 前端工程结构与状态流
- [x] 确认前端需要的核心状态模型（Room/Player/GameState）
- [x] 初始化后端工程（FastAPI）
- [x] 接入 MySQL（SQLAlchemy async engine/session）
- [x] 接入 Redis（房间权威状态存储）
- [x] 实现基础 REST API（create/join/state/ready/start/vote/reaction）
- [x] 实现 WebSocket 房间通道 `/ws/rooms/{roomId}`
- [x] REST 更新后广播最新 state
- [x] WebSocket 连接绑定 playerId（query 参数）
- [x] 后端开始游戏时分配角色/词语，并通过 WS 私发 `secret`（断线重连可补发）
- [x] 前端新增 `src/services/backend.ts`（REST + WS）
- [x] 前端改造：创建/加入走 REST，准备/开始/投票/表情走 WS，state 广播驱动 UI
- [x] 联调环境变量：根目录 `.env.example` 增加 `VITE_BACKEND_URL`
- [x] 后端：WS 协议校验与错误处理（not_host、room_not_found、player_not_found 等）
- [x] 前端：房主驱动计时与阶段切换的状态推送（发言→投票、投票结束→结算）
- [x] 前端：接入并展示 `secret`（身份/词语），并根据 phase 控制何时可查看
- [x] 词语库与词语对管理（DB 表 word_categories/word_pairs，CRUD API，按分类随机抽取）
- [x] 开始游戏时由后端分配角色与词语（平民/卧底），每个玩家只能看到自己的词语
- [x] 投票结算：统计票数、处理平票（PK 最多 3 轮，超出随机淘汰）
- [x] 出局与胜负判定：卧底清零→平民胜；卧底人数 ≥ 平民人数→卧底胜
- [x] 回合推进：结果展示 5s 倒计时，自动进入下一轮发言
- [x] 投票弃票：前端弃票按钮，后端 targetPlayerId=null 忽略，全员弃票无人出局
- [x] 管理员角色与权限（DB users.role=2，启动时迁移列并同步 ADMIN_PHONES）
- [x] 前端词库管理页面（管理员 CRUD 分类与词对，自定义确认弹窗，分类胶囊布局）
- [x] 创建房间页优化（删除自定义词输入框，新增房间名称设置+默认名）
- [x] 大厅阶段 UI（隐藏倒计时，提示文案按满员切换"等待进入/等待准备"）
- [x] 退出/解散逻辑（房主退出→解散+广播 room:closed；非房主退出→移除+广播 state）
- [x] 退出确认弹窗（所有玩家退出房间时弹出确认对话框，防误触）
- [x] 再来一局（房主结算页发起 game:restart 重新分词重置状态）
- [x] 全局 Toast 通知系统（替换所有 window.alert 为应用内 Toast）
- [x] 前端结果页（投票结果展示淘汰者头像/身份/倒计时）
- [x] 前端结算页（胜负展示+角色揭示卡片+准备/再来一局按钮+退出）
- [x] 基础鉴权/身份（JWT 登录注册，playerId 防伪，房主权限）

## 待办 / 工程化与部署

- [ ] Alembic 迁移脚本（而非启动时 create_all）
- [ ] Docker Compose（MySQL + Redis + backend + frontend）
- [ ] 日志与监控（结构化日志、请求耗时）

## 已知问题/注意事项

- 前端 IDE 报 `react/jsx-runtime` / 模块找不到：通常是 node_modules/TS 服务未加载，先 `npm install` 再看。
