from __future__ import annotations

import ast
import contextlib
import io
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "jupyter-notebook" / "frontline-pvp-balance.ipynb"


def markdown(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": text.splitlines(keepends=True)}


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


cells = [
    markdown(
        """# 阵地突围：战线模式双人对抗平衡实验

目标：在不改动现有单机七关数值的前提下，为独立的 1v1 战线模式寻找一组可落地的经济与反滚雪球规则。

成功标准：

- 镜像策略下先手胜率保持在 48%–52%。
- 中位对局时长控制在 10–16 分钟。
- 劣势方依靠前线补给加成有重新争夺中线的窗口，但不能无限拖延。
- 重装甲依旧强势，同时必须由步兵占领阵地，避免纯载具直冲总部。
"""
    ),
    code(
        """from __future__ import annotations
import math
import random
import statistics

SEED = 20260728
random.seed(SEED)

# 从当前 index.html 提取的基础数值；PVP 只通过规则系数调整，不覆盖单机数据。
units = {
    "rifle":    {"name": "步枪兵", "cost": 3,  "hp": 82,   "dps": 14 / 0.68, "capture": 1.00, "armor": 0.00},
    "mg":       {"name": "机枪兵", "cost": 6,  "hp": 112,  "dps": 10 / 0.18, "capture": 0.72, "armor": 0.00},
    "sniper":   {"name": "狙击兵", "cost": 8,  "hp": 68,   "dps": 58 / 2.55, "capture": 0.55, "armor": 0.00},
    "engineer": {"name": "工兵",   "cost": 7,  "hp": 94,   "dps": 28 / 1.35, "capture": 1.65, "armor": 0.00},
    "humvee":   {"name": "悍马车", "cost": 12, "hp": 260,  "dps": 17 / 0.46, "capture": 0.20, "armor": 0.18},
    "apc":      {"name": "CM34",   "cost": 22, "hp": 520,  "dps": 20 / 0.30, "capture": 0.28, "armor": 0.38},
    "hstv":     {"name": "HSTV",   "cost": 31, "hp": 670,  "dps": 98 / 1.65, "capture": 0.25, "armor": 0.55},
    "bmpt":     {"name": "BMPT",   "cost": 39, "hp": 920,  "dps": 18 / 0.18, "capture": 0.22, "armor": 0.68},
    "m1":       {"name": "M1",     "cost": 50, "hp": 1180, "dps": 188 / 2.55, "capture": 0.18, "armor": 0.82},
    "t90m":     {"name": "T-90M",  "cost": 48, "hp": 1120, "dps": 178 / 2.75, "capture": 0.18, "armor": 0.80},
    "apache":   {"name": "阿帕奇", "cost": 64, "hp": 760,  "dps": 18 / 0.16, "capture": 0.00, "armor": 0.42},
}

def combat_value(data):
    effective_hp = data["hp"] / max(0.15, 1 - data["armor"] * 0.72)
    objective = 0.55 + min(1.5, data["capture"]) * 0.28
    return math.sqrt(effective_hp * data["dps"]) * objective

for data in units.values():
    data["value"] = combat_value(data)
    data["efficiency"] = data["value"] / data["cost"]

print("已载入兵种:", len(units))
print("基础收入建议: 1.35 点/秒，开局 14 点")
"""
    ),
    code(
        """ranking = sorted(units.items(), key=lambda item: item[1]["efficiency"], reverse=True)
print("按简化战斗价值/价格排序：")
for key, data in ranking:
    print(f'{data["name"]:>5}  成本 {data["cost"]:>2}  效率 {data["efficiency"]:6.2f}')

print("\\n解释：该排序只用于发现价格异常；射程、克制关系、投放步兵和防空能力会在实战中改变结果。")
"""
    ),
    markdown(
        """## 双人规则模型

模型采用完全对称的基础资源，并加入三项专用规则：

1. **前线补给**：落后 2 个及以上阵地时，收入最多增加 12%，只在差距存在时生效。
2. **装甲部署槽**：每方同时最多 3 个重装甲单位，防止囤积后一次性碾压。
3. **占领依赖步兵**：载具只能提供 25% 占领权重；没有存活步兵时不能把中立点变为己方点。

下列轻量蒙特卡洛模型不代替真人测试，只用于筛掉明显会造成先手优势、时长失控或滚雪球的规则组合。
"""
    ),
    code(
        """strategies = {
    "均衡": ["rifle", "mg", "engineer", "rifle", "hstv", "sniper", "apc", "m1"],
    "步兵压制": ["rifle", "mg", "rifle", "sniper", "engineer", "mg", "apc"],
    "机械化": ["rifle", "engineer", "humvee", "apc", "rifle", "hstv", "bmpt", "m1"],
}

def buy(points, queue, cursor):
    for offset in range(len(queue)):
        index = (cursor + offset) % len(queue)
        kind = queue[index]
        if units[kind]["cost"] <= points:
            return kind, points - units[kind]["cost"], (index + 1) % len(queue)
    return None, points, cursor

def simulate(strategy_a, strategy_b, seed, comeback=0.12, max_seconds=1080):
    rng = random.Random(seed)
    points = [14.0, 14.0]
    power = [12.0, 12.0]
    infantry = [1.0, 1.0]
    cursor = [0, 0]
    front = 0.0                 # -3 为 A 总部，+3 为 B 总部
    hq = [2200.0, 2200.0]
    queues = [strategies[strategy_a], strategies[strategy_b]]
    heavy = [0, 0]
    purchases = [0, 0]
    command_edge = rng.gauss(0, 0.16)  # 玩家临场指挥差异，均值为 0，不偏向任一出生侧
    dt = 1.0

    for second in range(1, max_seconds + 1):
        # 阵地差距越大，落后方获得小幅且有上限的前线补给。
        bonus_a = min(comeback, max(0.0, front - 1.0) * 0.055)
        bonus_b = min(comeback, max(0.0, -front - 1.0) * 0.055)
        points[0] += 1.35 * (1 + bonus_a) * dt
        points[1] += 1.35 * (1 + bonus_b) * dt

        for side in (0, 1):
            kind, remaining, next_cursor = buy(points[side], queues[side], cursor[side])
            if kind is None:
                continue
            is_heavy = kind in {"bmpt", "m1", "t90m", "apache"}
            if is_heavy and heavy[side] >= 3:
                continue
            points[side], cursor[side] = remaining, next_cursor
            data = units[kind]
            jitter = rng.uniform(0.88, 1.12)
            power[side] += data["value"] * 0.042 * jitter
            infantry[side] += data["capture"] if data["armor"] == 0 else 0
            heavy[side] += int(is_heavy)
            purchases[side] += 1

        # 双方持续交换火力；越大的集团越容易受到炮火与反装甲集火，避免无限囤兵。
        exchange = min(power) * rng.uniform(0.010, 0.017)
        power[0] = max(2, power[0] - exchange * rng.uniform(0.9, 1.12))
        power[1] = max(2, power[1] - exchange * rng.uniform(0.9, 1.12))
        infantry[0] = max(0.2, infantry[0] * rng.uniform(0.992, 0.999))
        infantry[1] = max(0.2, infantry[1] * rng.uniform(0.992, 0.999))
        heavy[0] = max(0, heavy[0] - int(rng.random() < 0.0025 * max(1, heavy[0])))
        heavy[1] = max(0, heavy[1] - int(rng.random() < 0.0025 * max(1, heavy[1])))

        advantage = math.tanh((power[0] - power[1]) / 46 + command_edge)
        capture_gate = 1.0 if (infantry[0] > 0.45 and infantry[1] > 0.45) else 0.35
        decisive = 1.0 + max(0, second - 720) / 180
        front = max(-3.2, min(3.2, front + (advantage * 0.026 * decisive + rng.gauss(0, 0.006)) * capture_gate))

        hq_threshold = max(0.2, 1.75 - max(0, second - 900) * 0.009)
        siege_scale = 0.8 if second <= 900 else 2.2
        if front > hq_threshold:
            hq[1] -= max(6, power[0] - power[1] * 0.62) * siege_scale
        elif front < -hq_threshold:
            hq[0] -= max(6, power[1] - power[0] * 0.62) * siege_scale
        if hq[0] <= 0 or hq[1] <= 0:
            winner = 1 if hq[1] <= 0 else -1
            return winner, second, front, tuple(purchases)

    winner = 1 if hq[1] < hq[0] else -1 if hq[0] < hq[1] else 0
    return winner, max_seconds, front, tuple(purchases)
"""
    ),
    code(
        """def run_matrix(games_per_pair=160, comeback=0.12):
    rows = []
    all_results = []
    seed = SEED
    for a in strategies:
        for b in strategies:
            results = [simulate(a, b, seed + i, comeback) for i in range(games_per_pair)]
            seed += games_per_pair
            all_results.extend(results)
            a_wins = sum(result[0] == 1 for result in results)
            rows.append((a, b, a_wins / games_per_pair, statistics.median(r[1] for r in results)))
    return rows, all_results

rows, results = run_matrix()
print("策略 A      策略 B      A 胜率   中位时长")
for a, b, win_rate, duration in rows:
    print(f"{a:<10} {b:<10} {win_rate:>6.1%}   {duration / 60:>5.1f} 分钟")

mirror = [row for row in rows if row[0] == row[1]]
mirror_rate = statistics.fmean(row[2] for row in mirror)
median_duration = statistics.median(result[1] for result in results) / 60
timeout_rate = sum(result[1] >= 1080 for result in results) / len(results)
print(f"\\n镜像策略 A 方平均胜率: {mirror_rate:.1%}")
print(f"全部对局中位时长: {median_duration:.1f} 分钟")
print(f"18 分钟未结束比例: {timeout_rate:.1%}")
"""
    ),
    code(
        """# 对比不同追赶补给上限，观察是否显著拉长对局。
print("追赶上限  A方镜像胜率  中位时长  超时率")
for comeback in (0.00, 0.08, 0.12, 0.16):
    sweep_rows, sweep_results = run_matrix(games_per_pair=80, comeback=comeback)
    mirrors = [row for row in sweep_rows if row[0] == row[1]]
    rate = statistics.fmean(row[2] for row in mirrors)
    duration = statistics.median(result[1] for result in sweep_results) / 60
    timeout = sum(result[1] >= 1080 for result in sweep_results) / len(sweep_results)
    print(f"{comeback:>7.0%}       {rate:>6.1%}      {duration:>5.1f} 分钟   {timeout:>6.1%}")
"""
    ),
    markdown(
        """## 结论与落地参数

- 双方均为 **14 点开局、1.35 点/秒**，地图与初始战壕完全镜像。
- 建议追赶收入上限为 **12%**，仅当落后至少 2 个阵地时开启；回到 1 个阵地差距后立即关闭。
- 同时在场的 M1、T-90M、BMPT、阿帕奇合计最多 **3 个**；HSTV 与 CM34 不占重装甲槽。
- 载具只能贡献 25% 占领权重，最终转旗必须有步兵存活。
- 对局 18 分钟进入“决胜阶段”：双方收入 +25%，总部战线减伤从 95% 逐步降到 75%，避免无限僵持。
- 匹配版必须采用服务器权威模拟或锁步回放校验；本地分屏版可以共用同一个确定性模拟循环。

下一步真人测试重点：机枪兵压制是否过强、BMPT 双机炮是否挤压 HSTV 定位、阿帕奇与防空悍马的交换比，以及 M1/T-90M 的价格差是否足以体现火力/防护差异。
"""
    ),
]


def execute_cell(cell: dict, namespace: dict, execution_count: int) -> None:
    source = "".join(cell["source"])
    tree = ast.parse(source)
    last_expression = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last_expression = ast.Expression(tree.body.pop().value)
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream):
        exec(compile(tree, "<notebook>", "exec"), namespace)
        result = eval(compile(last_expression, "<notebook>", "eval"), namespace) if last_expression else None
    outputs = []
    text = stream.getvalue()
    if text:
        outputs.append({"name": "stdout", "output_type": "stream", "text": text.splitlines(keepends=True)})
    if result is not None:
        outputs.append({
            "data": {"text/plain": [repr(result)]},
            "execution_count": execution_count,
            "metadata": {},
            "output_type": "execute_result",
        })
    cell["execution_count"] = execution_count
    cell["outputs"] = outputs


namespace: dict = {}
count = 0
for cell in cells:
    if cell["cell_type"] == "code":
        count += 1
        execute_cell(cell, namespace, count)

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.8+"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(notebook, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Wrote and executed {OUTPUT} with {count} code cells")
