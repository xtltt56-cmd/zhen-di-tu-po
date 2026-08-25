# 《阵地突围》模块化运行层

当前版本将可独立演进、可独立验证的系统放在 `src/`，并保持 `index.html` 中已有玩法函数的对外签名不变。

加载顺序：

1. `game-config.js`：性能、音频和载具模块的统一参数。
2. `performance-system.js`：帧率采样、空间哈希、自适应质量和对象数量控制。
3. `vehicle-module-system.js`：载具模块损伤、性能衰减和乘员维修。
4. `audio-system.js`：Web Audio 武器、爆炸、命中、载具和环境音效；支持分类混音。
5. `save-system.js`：带校验值的主存档与上一版本备份，主存档损坏时自动恢复。
6. `settings-system.js`：画质、粒子、反馈和音频混音设置；设置自动持久化。
7. `pathfinding-system.js`：带短期方向记忆的障碍预判和局部绕行。
8. `combat-feedback-system.js`：命中标记、伤害数字、来袭方向和轻量镜头震动。
9. `frontline-visuals.js`：普通战线与双人战线共享的高清素材、人物动画、载具尺寸、总部、战壕及战斗特效渲染。
10. `frontline-duel-system.js`：同机红蓝双人战线、对称经济、双输入、战壕和总部升级。
11. `index.html`：关卡、模式、实体更新、输入和 Canvas 渲染。

## 设计边界

- 音效系统只消费战斗事件，不反向修改伤害、射速或 AI。
- 性能系统只降低低优先级视觉对象，不跳过碰撞、近战和近距离目标。
- 主战坦克模块采用渐进损伤，不会因单次普通命中直接归零。
- 满血重装甲的单发弹体和爆炸伤害分别受上限保护，避免“一发瘫痪”。
- 存档保护同时保留传统存档键，旧版本进度可以继续加载。
- 设置系统只改变表现层，不改变兵种和载具平衡数值。

## 平衡分析

`output/jupyter-notebook/frontline-pvp-balance.ipynb` 是已执行的战线双人对抗蒙特卡洛模型。生成脚本位于 `tools/build_frontline_pvp_notebook.py`，可用标准 Python 重新生成并验证。

本地双人模式的完整操作和规则说明位于 `output/frontline-local-duel-guide.md`。

## 后续拆分顺序

1. 静态兵种、载具与关卡数据。
2. 战役、丧尸和战线模式控制器。
3. 实体更新、碰撞与弹道。
4. Canvas 渲染器和 HUD。
5. 输入、启动流程与双人网络同步。

每轮只迁移一个边界，并保留兼容适配层，避免大规模重写导致已有模式失效。
