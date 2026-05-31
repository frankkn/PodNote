from app.core.limits import RateLimiter


def test_rate_limiter_allows_up_to_max() -> None:
    rl = RateLimiter(max_hits=2, window_seconds=3600)
    assert rl.allow("ip-a") is True
    assert rl.allow("ip-a") is True
    assert rl.allow("ip-a") is False  # 第 3 次超過上限
    # 不同 key 各自計算
    assert rl.allow("ip-b") is True
