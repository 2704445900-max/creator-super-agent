# 全流程创作超级智能体使用规范

## 两个版本

| 版本 | 工作区 | 内容包 | 用途 |
| --- | --- | --- | --- |
| 通用版 | `creator-default` | `creator-generic` | 其他作品、其他账号、原创项目，不读取新锐纪元私有资料 |
| 新锐专用版 | `xinrui-main` | `xinrui-private` | 新锐纪元正史、角色视觉锚、剧作规则和账号资料 |

两个版本使用同一个持久任务运行器，但内容包、账号档案和正史边界分开保存。通用版不得引用新锐纪元角色、设定、图像和账号资料。

## 启动

1. 在工作台根目录安装依赖：`npm install`。
2. 从 `.env.example` 创建 `.env`，填写文本模型和图像模型配置。
3. 启动：`npm run server`。
4. 打开 `http://127.0.0.1:8787/`。
5. 在“超级智能体”中选择工作区。

独立通用部署设置：

```text
CREATOR_EDITION=generic
```

该模式不写入新锐种子实体，并强制创作请求使用 `creator-generic`。

## 图像模型

默认优先使用 ChatGPT/OpenAI `gpt-image-2`，也支持明确配置的 OpenAI-compatible 云端图像模型。

```text
IMAGE_PROVIDER=openai
IMAGE_MODEL=gpt-image-2
IMAGE_BASE_URL=https://api.openai.com/v1
IMAGE_API_KEY=...
```

如果中转站提供兼容的 `/images/generations` 和 `/images/edits`，将 `IMAGE_BASE_URL`、`IMAGE_API_KEY` 和 `IMAGE_MODEL` 改成对应值。

ComfyUI 只作为可选后备，不是默认依赖。

## 在工作台中执行

1. 选择“新锐纪元企划工作区”或“通用创作工作区”。
2. 输入创作目标和剧本。
3. 填写时长和预算。
4. 需要关键帧时勾选“执行关键帧生图”。
5. 保持“付费生成前暂停审批”和“视觉终审后继续”开启。
6. 点击“开始执行”。
7. 在右侧查看每一步状态。
8. 到达付费门禁后，核对模型、项目和预算，再批准。
9. 生成图出现后，与身份锚、服装、道具和场景参考并排检查，再决定是否通过。

任务状态和产物会保存在数据库和项目目录中。服务重启后，处于执行中的任务会重新进入队列。

## Codex 插件用法

新锐项目：

```text
@xinrui-ip-studio 为这段剧本建立项目，锁定本地正史和角色视觉参考，执行到付费生图审批。
```

通用项目：

```text
@creator-super-agent 为这个原创账号建立隔离工作区，从选题、剧本、故事板、关键帧、15秒视频计划执行到发布方案。
```

现实参考：

```text
@creator-super-agent 先用浏览器检索这个现实道具的可靠图片和结构特征，保存到待处理区，确认后再做本地画风转换。
```

## 自动管线

正常执行顺序：

1. 立项和账号目标；
2. 剧本四层审查；
3. 美术资产清单；
4. 浏览器外部研究；
5. 提示词精修和连续性锁；
6. 导演分镜和故事板；
7. 云端关键帧生图；
8. 单图视觉检查；
9. Seedance 成本与视频计划；
10. AE/PR/Remotion/Hyperframes 等后期交接；
11. 标题、封面、简介、标签和发布时间建议；
12. 项目归档与迁移。

## 浏览器参考规范

本地资料不足时，应先浏览器检索，尤其是：

- 现实武器、车辆、军装和装备；
- 城市、地图、建筑和机场；
- 真实道具、仪器和专业动作；
- 导演、电影、动画和美术风格；
- B站、抖音、小红书、YouTube、Instagram 和 X 的趋势；
- 受众研究和学术资料。

外部资料先进入 `02_research/external_pending/` 或 `output/external-references/pending/`。记录来源、日期、视觉特征、歧义和授权状态。外部参考不能自动写入新锐正史。

## 视觉终审

每张关键帧至少检查：

- 角色身份、脸型、发型、发饰、体型；
- 单镜头单一服装，不混穿；
- 道具型号、比例、握持和接触点；
- 肢体、关节、手部、视线和重心；
- 构图、景别、焦点和画面信息层级；
- 场景平面关系、光源、天气和空间连续性；
- 180 度轴线、角色动线和镜头方向；
- 画风、色彩、材质和前后镜头一致性；
- 多余肢体、乱码、水印、融化、重叠和穿帮。

局部边缘、色彩和小面积遮挡可以交给 Photoshop；脸部结构、严重手部错误、现实道具结构、轴线和空间关系错误应重新生成或重做分镜。

## 成本规则

- 文本规划和本地检查可以自动执行。
- 付费图像和视频模型默认暂停审批。
- 每个镜头先做低成本草稿，再做正式生成。
- 连续两次失败后先修改分镜或参考，不继续盲抽。
- 单帧未通过视觉检查，不消耗视频模型预算。
- 平台发布和源文件覆盖必须人工确认。

## 项目目录

项目默认保存到 `output/projects/<project-slug>/`：

- `00_brief`：目标、账号、预算；
- `01_script`：剧本草稿和修订；
- `02_research`：外部参考与审美研究；
- `03_art`：角色、服装、场景、道具和风格；
- `04_storyboard`：调度、关键帧、故事板和 QA；
- `05_animation`：AE、Spine/Live2D；
- `06_editing`：Premiere 和 DaVinci 交接；
- `07_audio`：配音、音乐、音效；
- `08_publish`：平台发布资料；
- `09_review`：成片和账号复盘；
- `99_exports`：交付文件。

## 安装和更新插件

在 PowerShell 中运行：

```powershell
.\scripts\install_agent_plugins.ps1
```

脚本会校验插件、更新缓存版本、复制到个人插件目录、结构化更新 Personal marketplace，并重新安装：

- `creator-super-agent@personal`
- `xinrui-ip-studio@personal`

安装后新建一个 Codex 任务，使新版技能进入上下文。

## 验证

```powershell
npm run test:plugins
$env:AGENT_BASE_URL="http://127.0.0.1:8787"
npm run test:agent
```

完整工作台仍可运行：

```powershell
npm run test:api
npm run test:pipeline
```

## 故障处理

- 页面仍是旧版：确认 8787 端口对应的新 Node 进程已重启。
- 任务停在审批：在智能体任务详情批准或拒绝，不要重复新建任务。
- 图像接口失败：先查看“图像后端诊断”，检查 Base URL、模型名、密钥和兼容端点。
- 通用版出现新锐内容：确认 `CREATOR_EDITION=generic`，工作区为 `creator-default`，内容包为 `creator-generic`。
- 数据库锁定：停止并行同步和全管线测试，改为串行运行。
- 服务重启后任务未继续：打开任务详情，确认没有待审批；必要时点击“恢复任务”。
