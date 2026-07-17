"""验证章节自测卡片：插入位置、展开/收起、不影响原有折叠逻辑"""
from playwright.sync_api import sync_playwright
import pathlib

BASE = pathlib.Path(__file__).parent
BOOKS = ["fisher", "antifragile", "market-cycle"]

with sync_playwright() as p:
    browser = p.chromium.launch(chromium_sandbox=False)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    all_pass = True

    for book in BOOKS:
        url = (BASE / "books" / book / "index.html").as_uri()
        page.goto(url)
        page.wait_for_load_state("networkidle")

        n_box = page.locator(".chapter-card .exercise-box").count()
        n_quiz = page.locator(".self-quiz").count()
        ok_count = n_box == n_quiz and n_quiz > 0

        # 每个 self-quiz 都紧跟在 exercise-box 之后
        ok_pos = page.evaluate("""() =>
            [...document.querySelectorAll('.self-quiz')].every(q =>
                q.previousElementSibling && q.previousElementSibling.classList.contains('exercise-box'))
        """)

        # 展开第一个 quiz 所在章节的折叠区，再验证 quiz 展开/收起
        quiz = page.locator(".self-quiz").first
        card_btn = quiz.locator("xpath=ancestor::article[contains(@class,'chapter-card')]//button[contains(@class,'toggle-btn')]")
        if card_btn.count():
            expanded = card_btn.first.get_attribute("aria-expanded")
            if expanded != "true":
                card_btn.first.click()
                page.wait_for_timeout(700)
        body = quiz.locator("div").nth(1)
        hidden_before = body.evaluate("el => el.style.display === 'none'")
        quiz.evaluate("el => el.click()")
        shown = body.evaluate("el => el.style.display === 'block'")
        quiz.evaluate("el => el.click()")
        hidden_after = body.evaluate("el => el.style.display === 'none'")
        ok_toggle = hidden_before and shown and hidden_after

        # 原有折叠逻辑不受影响：再点 toggle-btn 能收起
        ok_collapse = True
        if card_btn.count():
            card_btn.first.evaluate("el => el.click()")
            page.wait_for_timeout(700)
            ok_collapse = card_btn.first.evaluate(
                "el => el.getAttribute('aria-expanded') === 'false'")

        status = "PASS" if (ok_count and ok_pos and ok_toggle and ok_collapse) else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"[{status}] {book}: box={n_box} quiz={n_quiz} pos={ok_pos} toggle={ok_toggle} collapse={ok_collapse}")

    # 截图留档（fisher：展开第一个 quiz 所在章节并展开 quiz）
    page.goto((BASE / "books" / "fisher" / "index.html").as_uri())
    page.wait_for_load_state("networkidle")
    q = page.locator(".self-quiz").first
    fb = q.locator("xpath=ancestor::article[contains(@class,'chapter-card')]//button[contains(@class,'toggle-btn')]")
    if fb.count() and fb.first.get_attribute("aria-expanded") != "true":
        fb.first.evaluate("el => el.click()")
        page.wait_for_timeout(700)
    q.evaluate("el => el.click()")
    page.wait_for_timeout(300)
    q.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    page.screenshot(path=str(BASE / "preview_self_quiz.png"))
    browser.close()

    print("ALL PASS" if all_pass else "SOME FAILED")
