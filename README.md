<p align="center">
  <img src="./docs/images/zhiwei-mark.png" alt="知微，紫微知道的对话伙伴" width="132" />
</p>

<h1 align="center">紫微知道</h1>

<p align="center"><strong>让「知微」陪你读懂命盘里的线索。</strong></p>
<p align="center">一个面向普通用户的开源紫微斗数 Agent，强调可追溯的命盘事实、自然的对谈体验与可本地运行的基础能力。</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Chart%20Engine-iztro-4b5563" alt="iztro" />
  <img src="https://img.shields.io/badge/Database-Optional-64748b" alt="Optional database" />
  <img src="https://img.shields.io/badge/License-Apache--2.0-d22128" alt="Apache-2.0 license" />
</p>

---

## 目录

1. [这是什么](#这是什么)
2. [核心能力](#核心能力)
3. [界面预览](#界面预览)
4. [快速开始](#快速开始)
5. [配置模型](#配置模型)
6. [可选数据库与知识检索](#可选数据库与知识检索)
7. [工作原理](#工作原理)
8. [项目结构](#项目结构)
9. [验证与部署](#验证与部署)
10. [边界与贡献](#边界与贡献)

---

## 这是什么

**紫微知道** 是一个消费级紫微斗数对话产品。你可以创建自己的命盘，和「知微」聊事业、关系、财富、近况，也可以从任何你真正关心的问题开始。

它不要求注册、登录、支付或使用托管账号。没有数据库时，依然可以排盘、使用本地知识检索，并在浏览器中保存匿名命盘与对话；接入 Postgres 与 pgvector 后，可获得持久化和增强检索能力。

「知微」不是用固定报告模板回答问题。她会自然地和你对谈，但涉及个人命盘时，只会把确定性排盘工具给出的信息当作你的盘面事实。

## 核心能力

| 能力 | 说明 |
|---|---|
| **确定性排盘** | 使用 [iztro](https://github.com/SylarLong/iztro) 生成命盘，不让模型自行计算星曜或宫位。 |
| **知微对谈** | 温柔、细腻、坚定的对话人格；按语境组织回答，而不是强制五段式报告。 |
| **事实可追溯** | 每次严肃分析都可查看工具调用、命盘事实、知识来源与 critic 状态。 |
| **按需宫位解读** | 命盘页只在你点击后生成当前宫位的 AI 解读，避免自动消耗 Token。 |
| **流式回答体验** | 回答渐进呈现，支持 Markdown、证据面板和回答过程状态。 |
| **连续对话记录** | 匿名对话可从记录页恢复；无数据库时，浏览器本地保留最近的完整会话。 |
| **本地优先检索** | 默认使用 Markdown / 关键词知识检索；Embedding 与 pgvector 都是可选增强。 |
| **隐私优先** | 模型 API Key 仅保存在当前浏览器本地；匿名数据可从设置页清除。 |

## 界面预览

| 对话与证据 | 命盘与宫位解读 |
|:---:|:---:|
|<img width="2139" height="1286" alt="image" src="https://github.com/user-attachments/assets/14d0f266-6cd6-4f4e-b9f4-27ad5a1620e7" />
|<img width="2138" height="1293" alt="image" src="https://github.com/user-attachments/assets/cfb185dd-6855-4a92-9f5f-dd3bccdd90b9" />
|


## 快速开始

### 环境要求

- Node.js 22+
- npm 10+
- 可选：Docker Desktop / Postgres 16（用于持久化与 pgvector）

### 本地运行

```bash
git clone https://github.com/ruijayfeng/ziwei_chat.git
cd ziwei_chat
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。首次进入后：

1. 在「命盘」页填写出生信息并生成命盘。
2. 回到对话页，直接说出你关心的事。
3. 需要 AI 正文时，在「设置」页配置模型。
4. 在回答旁打开证据面板，查看本次分析实际使用了什么。

### 不配置模型时能做什么？

排盘、命盘展示、本地知识检索、工具链准备和证据状态仍可运行。涉及个性化长回答时，产品会提示你完成模型设置，而不会伪造一段看似可靠的分析。

## 配置模型

在 `/settings` 的模型设置中填写 OpenAI 兼容服务的：

- Provider
- Base URL
- API Key
- Model

模型 Key 只保存在**当前浏览器的 localStorage**，请求时发送给 `/api/chat`，不会写入项目数据库。你可以随时在设置页清除。

## 可选数据库与知识检索

### 运行模式

| 模式 | 需要什么 | 可获得什么 |
|---|---|---|
| **本地基础模式** | Node.js | 排盘、匿名浏览器数据、本地 Markdown / 关键词检索、模型对话。 |
| **本地语义检索** | Embedding Provider | 构建本地 JSON Embedding 索引，增强无数据库检索。 |
| **Postgres / pgvector** | Postgres、`DATABASE_URL`、Embedding Provider | 对话与命盘持久化、知识向量检索、跨请求的数据恢复。 |

### 启动本地 Postgres

```bash
docker compose up -d postgres
npx drizzle-kit migrate
```

环境变量参考 [`.env.example`](./.env.example)。数据库是可选的：不配置时，产品仍能以本地模式启动。

### 构建本地 Embedding 索引

```bash
EMBEDDING_BASE_URL="https://api.openai.com/v1" \
EMBEDDING_API_KEY="sk-..." \
EMBEDDING_MODEL="text-embedding-3-small" \
npm run build:knowledge-embeddings
```

这会读取 `content/knowledge/**/*.md` 并生成本地索引。未配置时，系统自动回退到 Markdown / 关键词检索。

## 工作原理

```text
出生信息
  -> iztro 确定性命盘
  -> 命盘事实与问题路由
  -> 主题工作流 + 本地 / 向量知识检索
  -> 知微生成自然回答
  -> critic 审核与证据输出
```

核心原则：

- 只有确定性工具返回的信息可以被描述为用户的命盘事实。
- 知识库用于解释，不用于补造盘面信息。
- 对话应当自然、有温度，但不把倾向说成确定命运。
- 医疗、法律、投资、紧急决策等高风险问题只提供反思性、非替代性的建议。

## 项目结构

```text
src/
  app/          Next.js 路由与 API
  components/   对话、命盘、记录、洞见、设置界面
  lib/          Agent、命盘、数据库、检索与领域契约
content/        运行时主题工作流与本地知识
drizzle/        数据库迁移
scripts/        知识导入、Embedding 构建、Provider 诊断
tests/          单元、集成与 Agent 评估测试
docs/           产品、架构、提示词、知识与部署文档
```

## 验证与部署

### 本地质量门禁

```bash
npm run lint
npm run typecheck
npm run test
npm run eval:agent
npm run build
```

### 部署到 Vercel

1. Fork 或推送此仓库到 GitHub。
2. 在 Vercel 导入 Next.js 项目。
3. 设置 `NEXT_PUBLIC_APP_URL` 为部署地址。
4. 若要启用持久化，额外配置 `DATABASE_URL` 并先执行迁移。
5. 部署。

详细部署、数据库和知识导入说明见 [部署文档](./docs/development/deployment.md)。

## 边界与贡献

紫微知道提供的是基于命盘事实的倾向性解读和现实反思，不替代医疗、法律、心理、投资或职业专业建议，也不承诺确定结果。

欢迎提交 Issue 和 PR。对产品使用、Agent 协议、知识来源或界面体验的改进，请先阅读：

- [产品定义](./docs/product/prd.md)
- [Agent 架构](./docs/architecture/agent-architecture.md)
- [提示词与响应协议](./docs/prompts/response-protocol.md)
- [知识与 Skills 规范](./docs/knowledge/knowledge-and-skills-spec.md)
- [验收标准](./docs/evaluation/acceptance-criteria.md)

## 许可证

除明确标注为第三方来源的知识内容外，本项目按 [Apache License 2.0](./LICENSE) 发布；第三方知识来源及其保留的许可证声明见 [NOTICE](./NOTICE)。

---

<p align="center">如果紫微知道对你有帮助，欢迎点亮 Star，让更多人以更清楚的方式认识自己的命盘。</p>
