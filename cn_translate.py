#!/usr/bin/env python3.11
"""中文化脚本：将精读笔记中的英文替换为中文优先展示"""

import re

with open('/workspace/workbuddy/海外书籍AI精读平台/reading-guide.html', 'r') as f:
    content = f.read()

replacements = [
    # === 章节副标题 ===
    ('Introduction by Kenneth L. Fisher', '肯尼斯·费雪撰写导言'),
    ('Clues from the Past — 两种赚钱方法的百年对决', '两种赚钱方法的百年对决'),
    ('What "Scuttlebutt" Can Do — Fisher最伟大的方法论贡献', '"闲聊法"能做什么 — Fisher最伟大的方法论贡献'),
    ('What to Buy — The Fifteen Points to Look for in a Common Stock', '买什么：选择普通股的十五个要点'),
    ('Applying This to Your Own Needs — Scuttlebutt Method 实操指南', '如何应用到自己身上 — 闲聊法实操指南'),
    ('When to Buy — The Folly of Economic Forecasting', '何时买入 — 经济预测的愚蠢之处'),
    ('When to Sell — And When Not To', '何时卖出 — 以及何时不该卖'),
    ('The Hullabaloo about Dividends', '股息喧哗背后的真相'),
    ("Five Don'ts for Investors", '投资者的五个"不要"'),

    # === 概念框英文名 ===
    ('What made Fisher\'s approach revolutionary?', 'Fisher的方法到底"新"在哪？'),
    ('Method A vs. Method B: The historical verdict', '两种赚钱方法——历史给出的答案'),
    ('The logic behind the method', '为什么闲聊比财报更可靠？'),
    ('Building conviction through firsthand knowledge', '深度调研如何建立"投资信念"'),
    ('The Scuttlebutt Method: Fisher\'s greatest contribution', '闲聊法实操指南：Fisher最伟大的方法论贡献'),
    ('The right time to buy: A contrarian framework', 'Fisher的买入时机法则：逆向思维框架'),

    # === POINT 英文描述 → 只保留中文标题 ===
    ('POINT 1: Does the company have products or services with sufficient market potential to make possible a sizable increase in sales for at least several years?',
     '公司是否有足够大的市场空间，支撑至少数年的销售增长？'),
    ('POINT 2: Does the management have a determination to develop products that will still further increase sales when the growth potentials of currently attractive product lines have largely been exploited?',
     '当现有产品增长潜力耗尽时，管理层是否有决心开发新产品？'),
    ('POINT 3: How effective are the company\'s research and development efforts in relation to its size?',
     '公司的研发投入相对于其规模是否有效？'),
    ('POINT 4: Does the company have an above-average sales organization?',
     '公司是否有高于平均水平的销售团队？'),
    ('POINT 5: Does the company have a worthwhile profit margin?',
     '公司是否有有价值的利润率？'),
    ('POINT 6: What is the company doing to maintain or improve profit margins?',
     '公司在做什么来维持或改善利润率？'),
    ('POINT 7: Does the company have outstanding labor and personnel relations?',
     '公司是否有卓越的劳动关系？'),
    ('POINT 8: Does the company have outstanding executive relations?',
     '公司是否有卓越的高管关系？'),
    ('POINT 9: Does the company have depth to its management?',
     '公司的管理层是否有足够的深度？'),
    ('POINT 10: How good are the company\'s cost analysis and accounting controls?',
     '公司的成本分析和会计控制有多好？'),
    ('POINT 11: Are there other aspects of the business, somewhat peculiar to the industry involved, which will give the investor important clues as to how outstanding that company may be?',
     '公司是否有行业特有的竞争优势，能提供重要线索？'),
    ('POINT 12: Does the company have a short-range or long-range outlook in regard to profits?',
     '公司是否有短期还是长期的利润观？'),
    ('POINT 13: In the foreseeable future will the growth of the company require sufficient equity financing so that the larger number of shares then outstanding will largely cancel the existing stockholders\' benefit from this anticipated growth?',
     '公司未来增长是否需要大量股权融资，从而稀释现有股东利益？'),
    ('POINT 14: Does the management talk freely to investors about its affairs when things are going well but "clam up" when troubles occur?',
     '管理层是否在好事时大谈特谈、坏事时缄默不语？'),
    ('POINT 15: Does the company have a management of unquestionable integrity?',
     '公司的管理层是否有毋庸置疑的正直品格？'),

    # === 金句保留英文原文但加上"原文："前缀 ===
    # 不对金句英文做删除，而是加标签使其可以折叠

    # === 术语表：中文放在前面 ===
    ('<td class="en">senile dementia / Alzheimer\'s</td>', '<td><strong>老年痴呆/阿尔茨海默症</strong> <span style="color:var(--text-secondary);font-size:12px">(senile dementia / Alzheimer\'s)</span></td>'),
    ('<td class="en">investment counseling firm</td>', '<td><strong>投资顾问公司</strong> <span style="color:var(--text-secondary);font-size:12px">(investment counseling firm)</span></td>'),
    ('<td class="en">price of everything, value of nothing</td>', '<td><strong>知道一切价格，不知任何价值</strong> <span style="color:var(--text-secondary);font-size:12px">(price of everything, value of nothing)</span></td>'),
    ('<td class="en">business cycle betting</td>', '<td><strong>经济周期博弈</strong> <span style="color:var(--text-secondary);font-size:12px">(business cycle betting)</span></td>'),
    ('<td class="en">Federal Reserve System (1913)</td>', '<td><strong>美联储体系（1913年成立）</strong> <span style="color:var(--text-secondary);font-size:12px">(Federal Reserve System)</span></td>'),
    ('<td class="en">securities and exchange legislation</td>', '<td><strong>证券交易立法</strong> <span style="color:var(--text-secondary);font-size:12px">(securities and exchange legislation)</span></td>'),
    ('<td class="en">gyrating market</td>', '<td><strong>剧烈波动的市场</strong> <span style="color:var(--text-secondary);font-size:12px">(gyrating market)</span></td>'),

    # === 书籍卡片 ===
    ('Common Stocks and Uncommon Profits<br>《怎样选择成长股》', '《怎样选择成长股》<br><span style="font-size:14px;font-weight:400;color:var(--text-secondary)">Common Stocks and Uncommon Profits</span>'),
    ('Philip A. Fisher（菲利普·A·费雪）', '菲利普·A·费雪 <span style="font-size:13px;color:var(--text-secondary)">Philip A. Fisher</span>'),

    # === H1 ===
    ('Common Stocks and Uncommon Profits《怎样选择成长股》', '《怎样选择成长股》'),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1
    else:
        print(f'⚠️ NOT FOUND: {old[:60]}...')

print(f'✅ Applied {count}/{len(replacements)} replacements')

# 处理H1
h1_match = re.search(r'<h1>(.*?)</h1>', content)
if h1_match:
    old_h1 = h1_match.group(1)
    new_h1 = '《怎样选择成长股》<span style="font-size:16px;font-weight:400;color:var(--text-secondary);display:block;margin-top:4px;">Common Stocks and Uncommon Profits</span>'
    content = content.replace(f'<h1>{old_h1}</h1>', f'<h1>{new_h1}</h1>')
    print(f'✅ Fixed H1')

# 处理金句：保留英文但加可折叠
# 把 class="en" 的 div 用 <details> 包裹
content = re.sub(
    r'<div class="en">(.+?)</div>\s*<div class="zh">',
    r'<details class="en-detail"><summary style="cursor:pointer;color:var(--text-secondary);font-size:12px;margin-bottom:6px;">📖 原文（点击展开）</summary><div class="en">\1</div></details><div class="zh">',
    content
)

with open('/workspace/workbuddy/海外书籍AI精读平台/reading-guide.html', 'w') as f:
    f.write(content)

print('✅ 金句原文已折叠（默认隐藏，点击展开）')
print('✅ 中文化完成！')
