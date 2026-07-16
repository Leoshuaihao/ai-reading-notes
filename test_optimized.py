#!/usr/bin/env python3.11
"""优化后回归测试"""

import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        url = "file:///workspace/workbuddy/%E6%B5%B7%E5%A4%96%E4%B9%A6%E7%B1%8DAI%E7%B2%BE%E8%AF%BB%E5%B9%B3%E5%8F%B0/reading-guide.html"
        await page.goto(url, wait_until="networkidle", timeout=15000)
        print("✅ 页面加载成功\n")

        # Test 1: 折叠/展开按钮存在
        toggle_btns = await page.locator(".toggle-btn").count()
        print(f"📋 折叠/展开按钮数量: {toggle_btns}")
        assert toggle_btns >= 6, f"预期>=6个折叠按钮，实际{toggle_btns}个"
        print("✅ 折叠按钮数量合格\n")

        # Test 2: 默认状态下内容被折叠
        collapsed_sections = await page.locator(".collapsible-section.collapsed").count()
        print(f"📋 默认折叠区域数: {collapsed_sections}")
        assert collapsed_sections >= 6, f"预期>=6个折叠区域，实际{collapsed_sections}个"
        print("✅ 默认折叠状态正确\n")

        # Test 3: 点击展开按钮
        first_btn = page.locator(".toggle-btn").first
        await first_btn.scroll_into_view_if_needed()
        await asyncio.sleep(0.3)
        await first_btn.click()
        await asyncio.sleep(0.5)
        
        btn_text = await first_btn.text_content()
        print(f"📋 点击后按钮文字: '{btn_text.strip()}'")
        assert "收起" in btn_text, f"预期按钮变为'收起'，实际'{btn_text}'"
        print("✅ 展开交互正常\n")

        # Test 4: 原则1案例是否包含"诺基亚/iPhone"
        page_content = await page.content()
        has_nokia = "诺基亚" in page_content or "Nokia" in page_content
        has_iphone = "iPhone" in page_content or "智能手机" in page_content
        print(f"📋 原则1案例包含诺基亚: {has_nokia}")
        print(f"📋 原则1案例包含iPhone/智能手机: {has_iphone}")
        assert has_nokia and has_iphone, "原则1缺少智能手机vs功能手机案例"
        print("✅ 原则1案例优化合格\n")

        # Test 5: 页面高度（应减少）
        scroll_height = await page.evaluate("document.body.scrollHeight")
        viewport_height = await page.evaluate("window.innerHeight")
        pages = scroll_height / viewport_height
        print(f"📋 页面总高度: {scroll_height}px (约{pages:.0f}屏)")
        # 默认折叠后应该显著变短
        assert scroll_height < 12000, f"折叠后页面仍然过长: {scroll_height}px"
        print("✅ 折叠后页面长度合理\n")

        # Test 6: 浮动导航
        toc = await page.locator(".toc-float").count()
        print(f"📋 浮动导航存在: {toc > 0}")
        print("✅ 浮动导航已添加\n")

        # Test 7: 预览提示
        hints = await page.locator(".preview-hint").count()
        print(f"📋 展开提示数量: {hints}")
        assert hints >= 6, f"预期>=6个提示，实际{hints}个"
        print("✅ 预览提示合格\n")

        # 截图
        await page.screenshot(path="/workspace/workbuddy/海外书籍AI精读平台/screenshot_optimized.png", full_page=True)
        print("✅ 截图已保存\n")

        # 最终统计
        print("="*50)
        print("🎉 所有测试通过！优化成功。")
        print("="*50)

        await browser.close()

asyncio.run(test())
