# 测试与部署文档 · AI 精读笔记平台

> 本文档说明测试方法、部署流程和发布检查清单。上线前必读。

---

## 1. 测试工具

### 1.1 Playwright（推荐）

```bash
# 安装（一次性）
pip install playwright
playwright install chromium
```

### 1.2 本地预览服务器

```bash
# 在项目根目录
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

---

## 2. 视口测试矩阵

每个页面必须通过以下视口验证：

| 视口 | 宽度 | 高度 | 代表设备 |
|------|------|------|---------|
| 桌面 | 1440px | 900px | MacBook / 标准显示器 |
| 平板 | 768px | 1024px | iPad |
| 手机 | 375px | 812px | iPhone 12/13/14 |

### 2.1 快速截图脚本

```python
# save as: test_screenshots.py
from playwright.sync_api import sync_playwright

PAGES = [
    ("修行首页", "index.html"),
    ("完整书架", "bookshelf.html"),
    ("概念地图", "concepts.html"),
    ("个人中心", "my.html"),
    ("诊断引擎", "diagnose.html"),
    ("精读指南(示例)", "reading-guide.html"),
]

# 16本书页面
BOOK_SLUGS = [
    "fisher", "howard-marks", "buffett", "market-cycle", "buffett-letters",
    "alchemy-finance", "poor-charlie", "intelligent-investor", "peter-lynch",
    "security-analysis", "beating-street", "stock-operator", "economic-moat",
    "fooled-by-randomness", "black-swan", "antifragile"
]

VIEWPORTS = [
    ("desktop", 1440, 900),
    ("tablet", 768, 1024),
    ("mobile", 375, 812),
]

BASE_URL = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch()
    for vp_name, vp_w, vp_h in VIEWPORTS:
        for book_name, book_path in BOOKS:
            page = browser.new_page(viewport={"width": vp_w, "height": vp_h})
            page.goto(f"{BASE_URL}/{book_path}", wait_until="networkidle")
            page.screenshot(
                path=f"screenshots/{vp_name}_{book_path.replace('/', '_')}.png",
                full_page=True
            )
            print(f"✅ {book_name} @ {vp_name}")
            page.close()
    browser.close()
```

### 2.2 运行

```bash
mkdir -p screenshots
python3 test_screenshots.py
```

---

## 3. 测试检查清单

### 3.1 桌面端 (1440px)

- [ ] 导航栏水平排列，不换行
- [ ] 章节下拉菜单正常展开/关闭
- [ ] Hero 卡片封面和信息并排显示
- [ ] "为什么值得精读" 2×2 网格
- [ ] 章节卡片左侧边框 hover 效果
- [ ] 折叠/展开动画流畅
- [ ] TOC 📑 按钮不显示（视口 > 1200px）
- [ ] 回到顶部按钮 hover 有效果

### 3.2 平板端 (768px)

- [ ] 汉堡菜单正常展开/关闭
- [ ] 章节下拉消失，所有链接在汉堡菜单中
- [ ] Hero 卡片垂直排列
- [ ] 封面缩小到合适尺寸
- [ ] "为什么值得精读" 单列
- [ ] 章节卡片 padding 减小
- [ ] 折叠按钮全宽
- [ ] TOC 📑 按钮可见

### 3.3 手机端 (375px)

- [ ] 所有平板端检查项
- [ ] 无水平溢出（关键！）
- [ ] 文字大小可读（不小于 13px）
- [ ] 按钮/链接触控目标 ≥ 44px（iOS 标准）
- [ ] 输入框 font-size ≥ 16px（防止 iOS 缩放）
- [ ] TOC 面板宽度 280px（不溢出屏幕）
- [ ] Emoji 正常显示

### 3.4 功能测试

- [ ] 所有章节链接跳转正确
- [ ] 章节折叠/展开正常
- [ ] 展开状态刷新后保持（localStorage）
- [ ] 导航高亮随滚动更新
- [ ] 进度条随阅读更新
- [ ] TOC 面板滑出/关闭正常
- [ ] ESC 关闭 TOC 面板
- [ ] 回到顶部按钮功能正常
- [ ] AI 对话组件展开/关闭正常（如有）
- [ ] 页面内搜索（Ctrl+F）能找到章节标题

### 3.5 跨浏览器（如条件允许）

- [ ] Chrome（主力）
- [ ] Safari（iOS 用户重点）
- [ ] Firefox
- [ ] Edge

---

## 4. 部署流程

### 4.1 部署架构

```
本地代码 → git push → GitHub main 分支 → GitHub Pages 自动构建 → CDN 分发
```

- **仓库**: https://github.com/Leoshuaihao/ai-reading-notes
- **Pages 设置**: Source = Deploy from a branch, Branch = main, Folder = / (root)
- **自定义域名**: ai-reading.workbuddy.com（DNS CNAME 指向 Leoshuaihao.github.io）

### 4.2 标准部署步骤

```bash
# 1. 确保在正确的分支
git checkout main
git pull origin main

# 2. 确认所有更改
git status
git diff --stat

# 3. 添加并提交
git add -A
git commit -m "feat: 添加《XXX》精读笔记"

# 4. 推送
git push origin main

# 5. 等待 1-2 分钟 CDN 刷新
# 6. 验证线上页面
```

### 4.3 部署后验证

```bash
# 检查线上页面可访问
curl -s -o /dev/null -w "%{http_code}" https://ai-reading.workbuddy.com/

# 检查新书页面
curl -s -o /dev/null -w "%{http_code}" https://ai-reading.workbuddy.com/books/new-book/

# 检查关键资源
curl -s -o /dev/null -w "%{http_code}" https://ai-reading.workbuddy.com/assets/css/style.css
curl -s -o /dev/null -w "%{http_code}" https://ai-reading.workbuddy.com/assets/js/app.js
```

### 4.4 紧急回滚

```bash
# 查看最近提交
git log --oneline -10

# 回滚到上一个版本
git revert <commit-hash>
git push origin main

# 或者强制回退（谨慎使用）
git reset --hard <commit-hash>
git push --force origin main
```

---

## 5. 常见部署问题

### 页面 404

- **原因**：文件路径大小写不匹配（GitHub Pages 区分大小写）
- **解决**：检查文件名大小写，`books/Fisher/` vs `books/fisher/`

### CSS 不加载

- **原因**：相对路径错误
- **解决**：检查 `<link href="../../assets/css/style.css">` 路径层级

### 页面更新不生效

- **原因**：浏览器缓存或 CDN 缓存
- **解决**：
  1. Ctrl+Shift+R 强制刷新
  2. 添加 `?v=timestamp` 查询参数
  3. 等待 5 分钟 CDN 缓存过期

### GitHub Pages 构建失败

- **原因**：通常不是构建问题（纯静态），可能是分支设置问题
- **检查**：仓库 Settings → Pages → 确认 Branch 和 Folder 设置正确

---

## 6. 性能检查

### 6.1 目标指标

| 指标 | 目标 |
|------|------|
| 首屏加载 | < 2s |
| 最大内容绘制 (LCP) | < 2.5s |
| 累积布局偏移 (CLS) | < 0.1 |
| 总页面大小 | < 500KB（纯 HTML+CSS+JS） |

### 6.2 优化要点

- 无外部图片（封面用 CSS 渐变）
- CSS inline 或小文件（~524 行，约 10KB）
- JS 不依赖第三方库
- 无额外字体文件请求
- 使用 `content-visibility: auto` 优化长页面渲染（.chapter-card）

---

## 7. 监控（建议）

当前平台无主动监控。如果需要，建议：

- **Uptime**: GitHub Pages 自带 99.9% SLA
- **分析**: 可添加 Google Analytics 或 Plausible（隐私友好）
- **错误追踪**: 纯静态站前端错误较少，暂不需要 Sentry

---

## 8. 安全注意事项

- **API Key**: 不暴露在前端代码中，通过 Cloudflare Worker 代理
- **CORS**: Worker 配置了允许的来源域名
- **XSS**: 内容为静态 HTML，无用户输入，风险极低
- **HTTPS**: GitHub Pages 强制 HTTPS
- **依赖**: 零外部 JS 依赖，无供应链风险
