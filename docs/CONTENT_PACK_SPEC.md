# 内容包规范

## 目标

内容包把“智能体功能”和“项目/IP资料”分开。通用插件可以公开复用，私有 IP 资料可以独立更新、授权和迁移。

## 目录

```text
content-packs/<pack-id>/
  content-pack.json
  source/                  # 可选，小型可分发资料
  indexes/                 # 可选，脱敏索引
  schemas/                 # 可选，结构化规则
```

`content-pack.json` 至少包含：

- `id`, `name`, `version`；
- `kind`: `generic` 或 `ip-specific`；
- `visibility`: `public` 或 `private`；
- `canonMode`；
- `capabilities`；
- `imagePolicy`；
- `defaultWorkspace`。

私有包可以使用 `sourceRootEnv`，从环境变量挂载本地资料，不把绝对路径写死在公开分发中。

## 三层存储

1. Git 层：代码、规则、结构、脱敏索引、小型文本。
2. 私有二进制层：原创图片、PSD、AE、PR、视频、音频和大文档，使用私有对象存储、Git LFS 或分卷归档。
3. 本地工作层：数据库、缓存、生成结果、临时参考和未确认外部素材。

## 权利状态

资源清单中的每个文件应有权利状态：

- `owned-redistributable`：拥有并允许分发；
- `owned-private`：拥有但只允许私有使用；
- `licensed-private`：授权仅限私有项目；
- `reference-only`：只作参考，不上传原文件；
- `private-review-required`：未完成权利复核，不上传。

默认状态必须是 `private-review-required`，不能默认公开。

## 资源清单

运行：

```powershell
npm run manifest:xinrui
```

默认只记录相对路径、分类、扩展名、大小和修改时间，不复制文件。需要完整校验时加 `--hash` 生成 SHA-256，但大资源库会明显增加时间和磁盘读取。

## 新锐私有包

`xinrui-private` 必须满足：

- GitHub 仓库为 private；
- `.env`、API key、Cookie、登录态、数据库 WAL/SHM 不上传；
- `往期视频`、`参考素材`、第三方图片和电子书先做权利复核；
- 角色视觉锚和正史文本可以按项目需要做脱敏索引；
- 外部浏览器资料只保存链接、事实卡和视觉特征，除非有明确分发权；
- 内容包版本与数据库索引版本分别记录。

## 更新

1. 本地资源变动后运行数据库增量同步。
2. 重新生成资源清单。
3. 比较新增、修改和删除。
4. 只把确认可分发的文件加入私有二进制层。
5. 更新 `content-pack.json` 版本。
6. 运行插件和 API 测试。
