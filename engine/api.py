"""
诊断引擎 API — 用于前端调用
"""
import sys
sys.path.insert(0, '.')
from engine.fisher_engine import FisherEngine
from engine.data_layer import search_stock, get_supported_stocks

engine = FisherEngine()


def diagnose(stock_code):
    """诊断单只股票"""
    return engine.analyze(stock_code)


def search(query):
    """搜索股票"""
    return search_stock(query)


def list_stocks():
    """列出所有支持的股票"""
    return get_supported_stocks()


# 用于本地开发服务器的 API handler
def handle_api_request(path, body):
    """处理 API 请求，返回 (status, data)"""
    if path == '/api/diagnose':
        stock_code = body.get('stock_code', '').strip()
        if not stock_code:
            return 400, {'error': 'empty_code', 'message': '请输入股票代码'}
        result = diagnose(stock_code)
        if 'error' in result:
            return 404, result
        return 200, result

    elif path == '/api/search':
        query = body.get('query', '').strip()
        if not query:
            return 400, {'error': 'empty_query', 'message': '请输入搜索关键词'}
        results = search(query)
        return 200, {'results': results}

    elif path == '/api/stocks':
        return 200, {'stocks': list_stocks()}

    return 404, {'error': 'not_found'}
