"""
Fisher 诊断引擎 — 基于 15 条原则的股票分析
实现 MasterEngine 接口，可扩展为多大师架构
"""
from engine.data_layer import get_stock_data


class Principle:
    def __init__(self, number, name, score_func, quantifiable=True):
        self.number = number
        self.name = name
        self.score_func = score_func
        self.quantifiable = quantifiable  # 是否可量化


class FisherEngine:
    def __init__(self):
        self.name = "Philip A. Fisher"
        self.book = "Common Stocks and Uncommon Profits"
        self.book_zh = "怎样选择成长股"

    def get_principles(self):
        return [
            Principle(1, "市场潜力", self._score_p1),
            Principle(2, "管理层决心", self._score_p2),
            Principle(3, "研发效率", self._score_p3),
            Principle(4, "销售组织", self._score_p4),
            Principle(5, "利润率", self._score_p5),
            Principle(6, "利润率维护", self._score_p6),
            Principle(7, "劳动关系", self._score_p7, quantifiable=False),
            Principle(8, "高管关系", self._score_p8, quantifiable=False),
            Principle(9, "管理层深度", self._score_p9, quantifiable=False),
            Principle(10, "成本分析", self._score_p10),
            Principle(11, "竞争优势", self._score_p11),
            Principle(12, "利润导向", self._score_p12),
            Principle(13, "融资需求", self._score_p13),
            Principle(14, "沟通透明度", self._score_p14),
            Principle(15, "管理层诚信", self._score_p15),
        ]

    def analyze(self, stock_code):
        """输入股票代码，输出完整诊断报告"""
        data = get_stock_data(stock_code)
        if not data:
            return {"error": "stock_not_found", "message": f"未找到股票代码 {stock_code}"}

        principles = self.get_principles()
        results = []
        total_score = 0
        quantifiable_count = 0

        for p in principles:
            result = p.score_func(data, p.quantifiable)
            result["principle_number"] = p.number
            result["principle_name"] = p.name
            result["quantifiable"] = p.quantifiable
            results.append(result)

            if p.quantifiable and result.get("score") is not None:
                total_score += result["score"]
                quantifiable_count += 1

        # 排序：高分在前，需调研的排最后
        results.sort(key=lambda r: (
            0 if r["quantifiable"] and r.get("score") is not None else 2,
            -(r.get("score") or 0)
        ))

        max_score = quantifiable_count * 10
        return {
            "stock": {
                "code": data["code"],
                "name": data["name"],
                "industry": data["industry"],
            },
            "master": {
                "name": self.name,
                "book": self.book,
                "book_zh": self.book_zh,
            },
            "total_score": total_score,
            "max_score": max_score,
            "score_pct": round(total_score / max_score * 100) if max_score > 0 else 0,
            "principles": results,
            "data_date": data["data_date"],
            "data_source": data["data_source"],
            "analysis_time": data["data_date"],
        }

    # ========== 原则1：市场潜力 ==========
    def _score_p1(self, data, quantifiable):
        f = data["financials"]
        ind = data["industry_benchmark"]
        growth = f["revenue_3y_cagr"]
        ind_growth = ind["growth_rate"]
        share = data["competitive"]["market_share"]

        if growth > 15:
            score = 10 if share > 20 else 9
            comment = f"营收3年CAGR {growth}%，远超行业{ind_growth}%。"
        elif growth > 8:
            score = 8 if share > 15 else 7
            comment = f"营收3年CAGR {growth}%，高于行业{ind_growth}%。"
        elif growth > 0:
            score = 6 if share > 10 else 5
            comment = f"营收3年CAGR {growth}%，行业{ind_growth}%。增长温和。"
        else:
            score = 3 if share > 5 else 2
            comment = f"营收3年CAGR {growth}%，行业{ind_growth}%。Fisher会高度警惕。"

        if ind_growth < 0:
            comment += f" 注意：行业整体在萎缩（{ind_growth}%），公司增长靠抢占份额。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"营收3年CAGR: {growth}% | 行业增速: {ind_growth}% | 市场份额: {share}%",
        }

    # ========== 原则2：管理层决心 ==========
    def _score_p2(self, data, quantifiable):
        f = data["financials"]
        ind = data["industry_benchmark"]
        rd = f["rd_ratio"]
        rd_avg = ind["avg_rd_ratio"]
        rd_growth = f["rd_growth"]
        profit_g = f["profit_growth"]

        if rd > rd_avg * 1.5 and rd_growth > profit_g:
            score = 10
            comment = f"研发费用率{rd}%（行业{rd_avg}%），且研发增速({rd_growth}%)超过利润增速({profit_g}%)。Fisher会欣赏这种对未来的投入。"
        elif rd > rd_avg:
            score = 8
            comment = f"研发费用率{rd}%高于行业{rd_avg}%。有创新的意愿。"
        elif rd > rd_avg * 0.5:
            score = 5
            comment = f"研发费用率{rd}%低于行业{rd_avg}%。Fisher可能会问：增长耗尽后怎么办？"
        else:
            score = 3
            comment = f"研发费用率{rd}%远低于行业{rd_avg}%。几乎没有为未来做准备。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"研发费用率: {rd}%（行业{rd_avg}%）| 研发增速: {rd_growth}%",
        }

    # ========== 原则3：研发效率 ==========
    def _score_p3(self, data, quantifiable):
        f = data["financials"]
        ind = data["industry_benchmark"]
        rd = f["rd_ratio"]
        growth = f["revenue_3y_cagr"]

        # 粗略估算：每1%研发费用率带来多少营收增速
        if rd > 0:
            efficiency = growth / rd
            avg_eff = ind["growth_rate"] / max(ind["avg_rd_ratio"], 0.5)

            if efficiency > avg_eff * 1.5:
                score = 9
                comment = f"每1%研发投入带来约{efficiency:.1f}%增长，效率显著高于行业。"
            elif efficiency > avg_eff:
                score = 7
                comment = f"研发效率高于行业平均水平。"
            elif efficiency > avg_eff * 0.5:
                score = 5
                comment = f"研发效率在行业均值附近。"
            else:
                score = 3
                comment = f"研发投入的产出效率低于行业。Fisher会追问：钱花对了吗？"
        else:
            score = 3
            comment = "研发投入极低，无法评估效率。"
            efficiency = 0

        return {
            "score": score,
            "comment": comment,
            "data_note": f"研发费用率: {rd}% | 营收增速: {growth}% | 效率比: {efficiency:.1f}" if rd > 0 else "研发费用率过低",
        }

    # ========== 原则4：销售组织 ==========
    def _score_p4(self, data, quantifiable):
        f = data["financials"]
        ind = data["industry_benchmark"]
        rev_per = f["revenue_per_employee"]
        ind_rev = ind["avg_revenue_per_employee"]
        sales_exp = f["sales_expense_ratio"]

        if rev_per > ind_rev * 1.5:
            score = 10 if sales_exp < 10 else 9
            comment = f"人均创收{rev_per}万元（行业{ind_rev}万），销售效率出色。"
        elif rev_per > ind_rev:
            score = 8
            comment = f"人均创收{rev_per}万元，高于行业{ind_rev}万。"
        elif rev_per > ind_rev * 0.7:
            score = 5
            comment = f"人均创收{rev_per}万元，在行业均值附近。"
        else:
            score = 3
            comment = f"人均创收{rev_per}万元，低于行业{ind_rev}万。销售效率需要提升。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"人均创收: {rev_per}万（行业{ind_rev}万）| 销售费用率: {sales_exp}%",
        }

    # ========== 原则5：利润率 ==========
    def _score_p5(self, data, quantifiable):
        f = data["financials"]
        ind = data["industry_benchmark"]
        gm = f["gross_margin"]
        ind_gm = ind["avg_gross_margin"]
        trend = f["gross_margin_trend"]

        if gm > ind_gm * 1.3:
            base = 10 if trend == "stable" else (9 if trend == "rising" else 7)
            comment = f"毛利率{gm}%（行业{ind_gm}%），趋势{self._trend_cn(trend)}。"
        elif gm > ind_gm:
            base = 8 if trend != "declining" else 6
            comment = f"毛利率{gm}%高于行业{ind_gm}%，趋势{self._trend_cn(trend)}。"
        elif gm > ind_gm * 0.7:
            base = 5 if trend != "declining" else 4
            comment = f"毛利率{gm}%在行业{ind_gm}%附近，趋势{self._trend_cn(trend)}。"
        else:
            base = 3 if trend != "declining" else 1
            comment = f"毛利率{gm}%低于行业{ind_gm}%，趋势{self._trend_cn(trend)}。Fisher会非常担忧。"

        if trend == "declining":
            comment += " 利润率持续下降是Fisher最警惕的信号之一。"

        return {
            "score": base,
            "comment": comment,
            "data_note": f"毛利率: {gm}%（行业{ind_gm}%）| 趋势: {self._trend_cn(trend)}",
        }

    # ========== 原则6：利润率维护 ==========
    def _score_p6(self, data, quantifiable):
        f = data["financials"]
        gm_trend = f["gross_margin_trend"]
        exp_trend = f["expense_ratio_trend"]

        if gm_trend in ("stable", "rising") and exp_trend == "declining":
            score = 10
            comment = "毛利率稳定且费用率在下降——这是最健康的利润率维护方式。Fisher称之为'效率驱动型'。"
        elif gm_trend == "stable" and exp_trend == "stable":
            score = 7
            comment = "利润率稳定，但没有明显的改善趋势。"
        elif gm_trend == "stable" and exp_trend == "rising":
            score = 5
            comment = "毛利率稳定但费用率上升。可能靠提价维持利润率——Fisher会问：提价空间还有多大？"
        elif gm_trend == "declining":
            score = 3
            comment = "毛利率在下降。Fisher会高度警惕：这是竞争加剧还是成本失控？"
        else:
            score = 2
            comment = "毛利率和费用率都在恶化。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"毛利率趋势: {self._trend_cn(gm_trend)} | 费用率趋势: {self._trend_cn(exp_trend)}",
        }

    # ========== 原则7-9：需调研 ==========
    def _score_p7(self, data, quantifiable):
        f = data["financials"]
        emp = f["employee_count_trend"]
        salary = f["avg_salary_vs_industry"]
        return {
            "score": None,
            "comment": f"员工数量趋势：{self._trend_cn(emp)}。人均薪酬：{self._salary_cn(salary)}行业。",
            "data_note": f"Fisher会说：去跟这家公司的前员工聊聊。问问他们为什么离开，愿不愿意推荐朋友来工作。",
            "requires_research": True,
            "research_guide": "在脉脉/看准网搜索公司评价；跟行业内的朋友打听员工满意度。",
        }

    def _score_p8(self, data, quantifiable):
        g = data["governance"]
        turnover = g["executive_turnover"]
        duality = g["ceo_duality"]
        warn = []
        if turnover == "高":
            warn.append("高管离职率偏高")
        if duality:
            warn.append("CEO兼任董事长，权力过度集中")
        warn_text = "；".join(warn) if warn else "无异常信号"

        return {
            "score": None,
            "comment": f"高管团队状况：{warn_text}。",
            "data_note": f"Fisher会说：观察高管之间的互动。频繁更换CFO是危险信号。{'CEO兼任董事长让Fisher不安——他相信权力制衡。' if duality else ''}",
            "requires_research": True,
            "research_guide": "查阅高管简历，看是否有长期共事经历；关注财报中'关键管理人员薪酬'部分的披露。",
        }

    def _score_p9(self, data, quantifiable):
        g = data["governance"]
        duality = g["ceo_duality"]
        return {
            "score": None,
            "comment": f"CEO{'兼' if duality else '不兼'}任董事长。Fisher会关注：CEO有没有培养接班人？",
            "data_note": "Fisher会说：如果CEO离职这家公司就瘫痪，那它不值得投资。看看中层有没有决策权。",
            "requires_research": True,
            "research_guide": "看公司官网'管理团队'页面；搜索'XX公司 接班人'相关新闻。",
        }

    # ========== 原则10：成本分析 ==========
    def _score_p10(self, data, quantifiable):
        g = data["governance"]
        audit = g["audit_opinion"]
        restatements = g["restatements"]

        if audit == "标准无保留意见" and restatements == 0:
            score = 10
            comment = "连续多年标准无保留审计意见，无财务重述。会计控制值得信赖。"
        elif audit == "标准无保留意见" and restatements <= 1:
            score = 7
            comment = f"审计意见正常，有{restatements}次财务重述但金额不重大。"
        elif restatements >= 2:
            score = 4
            comment = f"{restatements}次财务重述，Fisher会问：公司到底知不知道自己的成本？"
        else:
            score = 2
            comment = f"审计意见：{audit}。Fisher会说：远离审计有问题的公司。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"审计意见: {audit} | 近5年财务重述: {restatements}次",
        }

    # ========== 原则11：竞争优势 ==========
    def _score_p11(self, data, quantifiable):
        c = data["competitive"]
        share = c["market_share"]
        brand = c["brand_power"]
        moat = c["moat_type"]

        if share > 30 and brand == "顶级":
            score = 10
            comment = f"市场份额{share}%，品牌力{brand}，护城河类型：{moat}。Fisher会认为这几乎不可撼动。"
        elif share > 15 and brand in ("顶级", "强"):
            score = 8
            comment = f"市场份额{share}%，品牌力{brand}。有明显的竞争优势。"
        elif share > 5:
            score = 5
            comment = f"市场份额{share}%，竞争壁垒{moat}。优势存在但不够强。"
        else:
            score = 3
            comment = f"市场份额仅{share}%，无明显竞争壁垒。Fisher会说：为什么是这家公司而不是它的竞争对手？"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"市场份额: {share}% | 品牌力: {brand} | 护城河: {moat}",
        }

    # ========== 原则12：利润导向 ==========
    def _score_p12(self, data, quantifiable):
        f = data["financials"]
        rd_g = f["rd_growth"]
        capex_g = f["capex_growth"]
        profit_g = f["profit_growth"]

        invest_growth = (rd_g + capex_g) / 2

        if invest_growth > profit_g * 1.2:
            score = 10
            comment = f"研发+资本开支增速({invest_growth:.0f}%)超过利润增速({profit_g}%)。Fisher会说：这家公司在投资未来，不是榨干现在。"
        elif invest_growth >= profit_g * 0.8:
            score = 7
            comment = f"投入增速({invest_growth:.0f}%)与利润增速({profit_g}%)基本匹配。"
        elif invest_growth > 0:
            score = 5
            comment = f"投入增速({invest_growth:.0f}%)低于利润增速({profit_g}%)。可能是在吃老本。"
        else:
            score = 2
            comment = f"投入在缩减({invest_growth:.0f}%)而利润在增长({profit_g}%)。Fisher会说：这是短期主义——牺牲未来换今天的报表。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"研发增速: {rd_g}% | 资本开支增速: {capex_g}% | 利润增速: {profit_g}%",
        }

    # ========== 原则13：融资需求 ==========
    def _score_p13(self, data, quantifiable):
        f = data["financials"]
        dilution = f["share_count_change"]
        fcf = f["fcf"]

        if dilution <= 0 and fcf > 0:
            score = 10
            comment = f"近3年无增发（总股本变化{dilution}%），自由现金流{fcf}亿。Fisher最欣赏这种'自给自足'的公司。"
        elif dilution <= 2:
            score = 7
            comment = f"总股本稀释{dilution}%/年，在可接受范围。自由现金流{fcf}亿。"
        elif dilution <= 5:
            score = 5
            comment = f"总股本稀释{dilution}%/年。Fisher会说：你的股权每年被稀释{dilution}%，增长要扣掉这部分才是你的真实回报。"
        else:
            score = 2
            comment = f"总股本稀释{dilution}%/年！Fisher会说：增长再快，如果靠不断增发摊薄股东，这增长跟你没关系。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"总股本变化: {dilution}%/年 | 自由现金流: {fcf}亿",
        }

    # ========== 原则14：沟通透明度 ==========
    def _score_p14(self, data, quantifiable):
        g = data["governance"]
        violations = g["violations"]

        if violations == 0:
            score = 9
            comment = "无信息披露违规记录。Fisher会认为这是基本要求，但能做到的公司并不多。"
        elif violations <= 1:
            score = 6
            comment = f"{violations}次信息披露违规。Fisher会追问：为什么在坏事发生时不坦诚沟通？"
        else:
            score = 3
            comment = f"{violations}次信息披露违规。Fisher会说：如果管理层在坏事时沉默，你永远不知道还有什么没告诉你。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"信息披露违规: {violations}次",
        }

    # ========== 原则15：管理层诚信 ==========
    def _score_p15(self, data, quantifiable):
        g = data["governance"]
        violations = g["violations"]
        pledge = g["major_shareholder_pledge"]
        dividend = g["dividend_payout"]
        related = g["related_transactions"]

        score = 10
        warnings = []

        if violations > 0:
            score -= violations * 2
            warnings.append(f"{violations}次违规记录")
        if pledge > 20:
            score -= 3
            warnings.append(f"大股东质押{pledge}%（偏高）")
        if related != "正常范围":
            score -= 3
            warnings.append(f"关联交易{related}")
        if dividend < 10:
            score -= 1
            warnings.append("分红率偏低")

        score = max(1, min(10, score))

        if score >= 9:
            comment = "近10年无违规记录，大股东无质押，关联交易正常。Fisher会说：这正是'毋庸置疑的正直品格'。"
        elif score >= 7:
            comment = f"管理层诚信总体良好。{'注意：' + '；'.join(warnings) if warnings else ''}"
        elif score >= 4:
            comment = f"管理层存在一些值得警惕的信号：{'；'.join(warnings)}。Fisher会说：如果原则15不及格，其他14条再优秀也没用。"
        else:
            comment = f"管理层诚信严重存疑：{'；'.join(warnings)}。Fisher会说：不管其他方面多好，远离这家公司。"

        return {
            "score": score,
            "comment": comment,
            "data_note": f"违规: {violations}次 | 大股东质押: {pledge}% | 分红率: {dividend}% | 关联交易: {related}",
        }

    # ========== 辅助方法 ==========
    def _trend_cn(self, trend):
        mapping = {"stable": "稳定", "rising": "上升", "declining": "下降",
                    "growing": "扩张", "低": "低", "中等": "中等", "高": "高"}
        return mapping.get(trend, trend)

    def _salary_cn(self, level):
        mapping = {"above": "高于", "average": "等于", "below": "低于"}
        return mapping.get(level, level)


# ========== 测试 ==========
if __name__ == "__main__":
    engine = FisherEngine()
    report = engine.analyze("600519")
    if "error" not in report:
        print(f"📊 {report['stock']['name']}（{report['stock']['code']}）")
        print(f"Fisher 评分：{report['total_score']}/{report['max_score']}（{report['score_pct']}%）")
        print(f"大师：{report['master']['name']} — 《{report['master']['book_zh']}》")
        print()
        for p in report["principles"]:
            score_str = f"{p['score']}/10" if p['score'] is not None else "需调研"
            print(f"  原则{p['principle_number']:2d} {p['principle_name']:8s} {score_str:8s} {p['comment'][:80]}")
