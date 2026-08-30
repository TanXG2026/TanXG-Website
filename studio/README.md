# 探星阁内容中心

这是探星阁新版网站的 Sanity Studio 源码，连接项目 `TanXG` 的 `production` 数据集。

日常编辑请直接访问：<https://tanxg-content-center.sanity.studio/>

本目录只在需要修改后台栏目结构或重新部署后台时使用。普通的课程、讲义、科研、科普、可视化、社区和团队内容，应直接在在线后台中编辑并发布。

## 开发命令

- `pnpm dev`：启动本地 Studio
- `pnpm build`：检查并构建 Studio
- `pnpm exec sanity deploy`：重新部署 Studio
- `node scripts/generateSeed.mjs`：从网站当前静态内容重新生成迁移文件
