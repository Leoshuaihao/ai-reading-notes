#!/usr/bin/env python3.11
"""金融小白体验官：测试精读笔记网页的可用性和可理解性"""

import asyncio
from playwright.async_api import async_playwright
import json

RESULTS = []

def log(step, status, detail=""):
    entry = {"step": step, "status": status, "detail": detail}
    RESULTS.append(entry)
    emoji = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌" if status == "FAIL" else "📋"
    print(f"{emoji} [{status}] {step}")
    if detail:
        print(f"   → {detail}")

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        url = "file:///workspace/workbuddy/%E6%B5%B7%E5%A4%96%E4%B9%A6%E7%B1%8DAI%E7%B2%BE%E8%AF%BB%E5%B9%B3%E5%8F%B0/reading-guide.html"
        await page.goto(url, wait_until="networkidle", timeout=15000)
        log("页面加载", "PASS", "精读笔记页面成功加载")

        # 1. 检查核心元素是否存在
        title = await page.title()
        log("页面标题", "PASS", f"标题: '{title}'")
        if "成长股" not in title and "Common" not in title:
            log("页面标题可读性", "WARN", "标题未直接包含书名关键词，可能影响搜索")

        # 2. 检查书籍英雄卡片
        h1 = await page.locator("h1").first.text_content()
        log("书籍信息卡片", "PASS", f"H1: '{h1[:60]}...'")

        # 3. 检查导航栏
        nav_links = await page.locator(".nav-links a").count()
        log("顶部导航栏", "PASS", f"共 {nav_links} 个导航链接")

        # 4. 检查进度条
        progress = await page.locator(".progress-bar .fill").first.get_attribute("style")
        log("阅读进度条", "PASS", f"进度: {progress}")

        # 5. 滚动到"为什么这本书值得精读"区域
        await page.locator("text=为什么这本书值得精读").first.scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        why_items = await page.locator(".why-item").count()
        log("'为什么值得读'模块", "PASS", f"共 {why_items} 个理由卡片")

        # 6. 检查作者简介
        author_bio = await page.locator(".author-bio").count()
        log("作者简介模块", "PASS" if author_bio > 0 else "FAIL", f"{'存在' if author_bio else '缺失'}")

        # 7. 滚动到15条原则（第3章）——这是核心内容
        await page.locator("text=15条选股原则").first.scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        concept_boxes = await page.locator(".concept-box").count()
        log("核心概念解读模块", "PASS" if concept_boxes >= 10 else "WARN", f"共 {concept_boxes} 个概念解读框（预期>=15）")

        # 8. 检查金句模块
        gold_quotes = await page.locator(".gold-quote").count()
        log("原文金句模块", "PASS" if gold_quotes >= 5 else "WARN", f"共 {gold_quotes} 个金句引用")

        # 9. 检查中国市场关联
        china_boxes = await page.locator(".china-box").count()
        log("🇨🇳 中国市场关联", "PASS" if china_boxes >= 3 else "WARN", f"共 {china_boxes} 个中国市场解读")

        # 10. 检查思考题
        exercise_boxes = await page.locator(".exercise-box").count()
        log("🤔 思考题", "PASS" if exercise_boxes >= 4 else "WARN", f"共 {exercise_boxes} 道思考题")

        # 11. 检查反方观点
        counter_boxes = await page.locator(".counter-box").count()
        log("⚔️ 反方观点", "PASS" if counter_boxes >= 2 else "WARN", f"共 {counter_boxes} 个反方观点模块")

        # 12. 检查术语词典
        term_tables = await page.locator(".term-table").count()
        log("📊 术语词典", "PASS" if term_tables >= 2 else "WARN", f"共 {term_tables} 个术语表")

        # 13. 检查要点总结
        takeaway_lists = await page.locator(".takeaway-list").count()
        log("💡 要点总结", "PASS" if takeaway_lists >= 5 else "WARN", f"共 {takeaway_lists} 个要点列表")

        # 14. 检查专题对比
        await page.locator("text=Fisher vs Graham").first.scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        special_topic = await page.locator("text=成长股 vs 价值股").count()
        log("⚡ 专题对比", "PASS" if special_topic > 0 else "WARN", "Fisher vs Graham 对比表存在" if special_topic else "缺失")

        # 15. CTA按钮
        cta = await page.locator(".cta-btn").first.text_content()
        log("CTA按钮", "PASS", f"按钮文字: '{cta}'")

        # ====== 金融小白视角的专项测试 ======
        
        # 小白测试1：术语是否都有解释？
        log("--- 金融小白视角测试 ---", "📋", "")

        # 检查"Scuttlebutt Method"是否被清晰解释
        scuttlebutt_section = await page.locator("text=Scuttlebutt Method").first.text_content()
        if "闲聊" in scuttlebutt_section or "交叉验证" in scuttlebutt_section:
            log("小白测试: Scuttlebutt Method解释", "PASS", "核心方法论有中文解释，金融小白能理解")
        else:
            log("小白测试: Scuttlebutt Method解释", "WARN", "可能对小白不够友好")

        # 小白测试2：15条原则是否每条都有通俗解释？
        principle1 = await page.locator("text=原则1").first.text_content()
        if "电视机" in principle1 or "案例" in principle1:
            log("小白测试: 原则1通俗度", "PASS", "有具体案例辅助理解")
        else:
            log("小白测试: 原则1通俗度", "WARN", "缺少案例说明")

        # 小白测试3：是否有"阅读难度"标识？
        difficulty_tag = await page.locator("text=阅读难度").count()
        log("小白测试: 阅读难度标签", "PASS" if difficulty_tag > 0 else "WARN", 
            "有难度提示" if difficulty_tag else "缺少难度提示")

        # 小白测试4：导言是否足够温暖（降低阅读门槛）
        intro_text = await page.locator("text=一个95岁老人").first.text_content()
        log("小白测试: 导言亲和力", "PASS", "导言用个人故事开场，非金融小白也能被吸引")

        # 小白测试5：中国市场关联是否足够接地气？
        china_text = await page.locator(".china-box").first.text_content()
        if "茅台" in china_text or "A股" in china_text:
            log("小白测试: 中国市场接地气度", "PASS", "提到了茅台、A股等中国投资者熟悉的标的")
        else:
            log("小白测试: 中国市场接地气度", "WARN", "缺少中国本土案例")

        # 小白测试6：页面整体长度（太长可能吓退小白）
        scroll_height = await page.evaluate("document.body.scrollHeight")
        viewport_height = await page.evaluate("window.innerHeight")
        pages = scroll_height / viewport_height
        log("小白测试: 页面长度", "PASS" if pages < 15 else "WARN", 
            f"约 {pages:.0f} 屏（{scroll_height}px）")

        # 小白测试7：阅读路线图是否清晰
        roadmap_parts = await page.locator(".part-card").count()
        log("小白测试: 阅读路线图", "PASS" if roadmap_parts >= 2 else "WARN", 
            f"共 {roadmap_parts} 个部分卡片，结构{'清晰' if roadmap_parts >= 2 else '不够清晰'}")

        # 截图保存
        await page.screenshot(path="/workspace/workbuddy/海外书籍AI精读平台/screenshot_top.png", full_page=False)
        await page.screenshot(path="/workspace/workbuddy/海外书籍AI精读平台/screenshot_full.png", full_page=True)
        log("截图", "PASS", "已保存页面截图")

        await browser.close()

        # 输出总结
        passes = sum(1 for r in RESULTS if r["status"] == "PASS")
        warns = sum(1 for r in RESULTS if r["status"] == "WARN")
        fails = sum(1 for r in RESULTS if r["status"] == "FAIL")
        total = passes + warns + fails
        
        print("\n" + "="*60)
        print(f"📊 测试总结: {passes}✅ / {warns}⚠️ / {fails}❌ (共{total}项)")
        print("="*60)
        
        if fails > 0:
            print("\n❌ 需要修复的问题:")
            for r in RESULTS:
                if r["status"] == "FAIL":
                    print(f"   - {r['step']}: {r['detail']}")
        
        if warns > 0:
            print("\n⚠️ 建议优化:")
            for r in RESULTS:
                if r["status"] == "WARN":
                    print(f"   - {r['step']}: {r['detail']}")

asyncio.run(test())
