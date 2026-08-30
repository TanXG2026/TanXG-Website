# 探星阁网站 GitHub Desktop 协作说明

本项目通过 GitHub Desktop 这个 app 在不同电脑之间同步。课程编辑器仍在每个人自己的电脑上运行，大家编辑完成后再将改动上传到 GitHub 就行。

## 一、支持的平台

- macOS：双击 `启动内容编辑器.command`
- Windows：双击 `启动内容编辑器.bat`
- 两个平台都需要安装 GitHub Desktop 和 Python 3

下载地址：

- GitHub Desktop：https://desktop.github.com/
- Python 3：https://www.python.org/downloads/

## 二、第一次下载项目

1. 接受仓库管理员发来的 GitHub 协作邀请。
2. 打开 GitHub Desktop，选择 `File → Clone Repository`。
3. 选择探星阁网站仓库和本机保存位置，然后点击 `Clone`。
4. Mac 双击 `.command` 启动器；Windows 双击 `.bat` 启动器。
5. 浏览器自动打开课程编辑器后，即表示本机环境正常。

## 三、每次编辑的固定顺序

### 开始前

1. 打开 GitHub Desktop 并选择探星阁网站仓库。
2. 确认当前分支为 `main`。
3. 点击 `Fetch origin`；如果随后出现 `Pull origin`，继续点击它。
4. 在协作群中说明自己准备编辑，确认没有其他人正在编辑课程资料。

### 编辑与保存

1. 双击本机对应的启动器。
2. 在浏览器中编辑课程。
3. 点击“保存到网站”，看到保存成功提示后再关闭编辑器。

### 上传改动

1. 回到 GitHub Desktop，检查左侧列出的文件变化。
2. 在 `Summary` 中填写清楚的说明，例如“更新高等数学课程内容”。
3. 点击 `Commit to main`。
4. 点击 `Push origin`。
5. 在协作群中通知其他成员已经上传，提醒下一位成员先执行 `Pull origin`。

## 四、必须遵守的协作规则

1. 课程资料集中保存在 `assets/data/courses-data.js`，同一时间只允许一人编辑课程内容。
2. 开始前先拉取，结束后立即提交并推送，不要让修改长期只保存在个人电脑上。
3. `backups` 文件夹是每台电脑自己的恢复备份，不上传 GitHub；GitHub 的提交历史就是团队共享版本记录。
4. 页面结构、样式或程序的大改动应使用独立分支，再通过 Pull Request 合并。
5. 如果出现冲突、红色警告或无法推送，不要使用 Force Push，也不要点击 Discard Changes。保留现场并联系仓库管理员处理。

## 五、推荐的提交说明

- `更新高等数学课程内容`
- `新增量子力学课程`
- `修正课程衔接关系`
- `调整课程详情页样式`
- `修复内容编辑器问题`

