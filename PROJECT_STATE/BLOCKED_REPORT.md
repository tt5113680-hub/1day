# 消费者端公网预览部署阻塞报告

- 记录时间：2026-08-09（Asia/Shanghai）
- 关联提交：`1e3e8dcc1535328c6c38bfc8daf5b7ec6ba0ced7`
- 关联任务：`CONSUMER-COMMERCIAL-HOME-V1`
- 公网实例：`49.232.124.130:18080`

## 已完成

- 消费者端商业化导航、团购、菜单、会员、个人页与受控跳转确认页已完成编码、类型检查、构建和 Playwright 验收。
- 变更已推送至 GitHub 分支 `hardening/COMMERCIAL-UI-ALIGNMENT`。
- 腾讯云上原 ONEDAY 容器保持运行，未切换至不完整版本；服务器其它项目未改动。

## 阻塞事实

腾讯云实例到 GitHub 的网络连接不稳定，连续三种安全下载方式均未能得到可校验的完整源码：

1. 浅克隆在约 8 MB 传输后失败，报 `curl 92 HTTP/2 stream ... CANCEL`、`unexpected disconnect` 与 `early EOF`。
2. 从 `raw.githubusercontent.com` 逐文件拉取时，第一个消费者端文件请求长期无响应，已仅终止本次新建的下载进程。
3. HTTP/1.1 与 `--filter=blob:none` 重试均未完成连接；随后 OrcaTerm 远程会话因网络波动断开。

## 未执行的操作

- 未重建或替换线上 `oneday-v3-preview-consumer-1` 容器。
- 未修改已有数据库、API、Worker、反向代理或任何非 ONEDAY 服务器文件。
- 未删除任何原有服务器目录；新建的未完成下载目录不参与运行环境。

## 恢复条件

待服务器到 GitHub 的稳定连接恢复后，从提交 `1e3e8dc` 重新获得完整源码、构建新 ONEDAY 预览镜像，并在切换消费者端容器前后验证公网店铺页及 5 项导航。
