# Daymark

Daymark（日迹）是一个纯静态的目标监督 Web 应用，用来记录每日任务、长期目标、打卡过程、日记和统计趋势。

## 功能

- 今日任务工作台
- 每日目标与长期目标管理
- 打卡状态：完成、顺延、跳过
- 过程备注、心情标记、长期进度数值
- 日历、历史记录、30 天趋势统计
- 浏览器本地 IndexedDB 存储
- JSON 导入 / 导出备份

## 本地开发

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

## 构建

```bash
npm run build
```

构建产物在 `dist` 目录。

## Cloudflare Pages

推荐配置：

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

当前版本是纯静态应用，数据保存在用户当前浏览器里。换设备或清理浏览器数据前，请先在设置页导出 JSON 备份。
