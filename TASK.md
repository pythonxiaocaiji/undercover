# TASK

## 已完成

- [x] 阅读 README / 前端工程结构与状态流
- [x] 确认前端需要的核心状态模型（Room/Player/GameState）
- [x] 初始化后端工程（FastAPI）
- [x] 接入 MySQL（SQLAlchemy async engine/session）
- [x] 接入 Redis（房间权威状态存储）
- [x] 实现基础 REST API（create/join/state/ready/start/vote/reaction）
- [x] 实现 WebSocket 房间通道 `/ws/rooms/{roomId}`
- [x] REST 更新后广播最新 state（部分接口已补齐）
- [x] WebSocket 连接绑定 playerId（query 参数）
- [x] 后端开始游戏时分配角色/词语，并通过 WS 私发 `secret`（断线重连可补发）
- [x] 前端新增 `src/services/backend.ts`（REST + WS）
- [x] 前端改造：创建/加入走 REST，准备/开始/投票/表情走 WS，state 广播驱动 UI
- [x] 联调环境变量：根目录 `.env.example` 增加 `VITE_BACKEND_URL`

## 进行中

- [ ] 后端：统一状态更新与广播策略（REST/WS 双入口保证一致）
- [ ] 后端：完善 WS 协议校验与错误处理（not_host、room_not_found、player_not_found 等）
- [ ] 前端：房主驱动计时与阶段切换的状态推送完善（发言->投票、投票结束结算）
- [ ] 前端：接入并展示 `secret`（身份/词语），并根据 phase 控制何时可查看

## 待办 / 下一步开发（核心游戏逻辑后端化）

- [ ] 词语库与词语对管理（按分类读取/随机抽取）
- [ ] 开始游戏时由后端分配角色与词语（平民/卧底），并做到“每个玩家只能看到自己的词语”
- [ ] 投票结算：统计票数、处理平票（PK/随机/重投可配置）
- [ ] 出局与胜负判定：卧底清零平民胜；卧底人数 >= 平民人数卧底胜（或按你规则调整）
- [ ] 回合推进：结果展示倒计时、进入下一轮发言

## 待办 / 工程化与部署

- [ ] Alembic 迁移脚本（而非启动时 create_all）
- [ ] Docker Compose（MySQL + Redis + backend + frontend）
- [ ] 基础鉴权/身份（playerId 防伪、房主权限）
- [ ] 日志与监控（结构化日志、请求耗时）

## 已知问题/注意事项

- 前端 IDE 报 `react/jsx-runtime` / 模块找不到：通常是 node_modules/TS 服务未加载，先 `npm install` 再看。
