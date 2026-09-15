# 阵地突围

《阵地突围》是一款浏览器端俯视角军事战术射击游戏，包含普通闯关、训练场、丧尸模式、战线模式和同机双人战线模式。

## 在线游玩与下载

- [在线运行最新版本](https://xtltt56-cmd.github.io/zhen-di-tu-po/)
- [下载最新 Windows 游戏包（ZIP）](https://github.com/xtltt56-cmd/zhen-di-tu-po/releases/latest/download/zhen-di-tu-po-latest.zip)
- [查看所有版本与更新记录](https://github.com/xtltt56-cmd/zhen-di-tu-po/releases)

每次 `main` 分支有新的提交时，GitHub Actions 会从当前根目录源码重新生成可运行 ZIP，并更新上面的“最新版本”下载地址，同时部署 GitHub Pages。因此用户不需要下载旧的 `release/` 快照来获取新版本。

## 快速开始

直接双击根目录的 `启动阵地突围.bat`，或用浏览器打开 `index.html`。

如果需要使用可分发版本，可打开 `release/` 下的完整游戏包，并运行其中的“一键启动游戏.bat”。

## 项目结构

- `index.html`：游戏入口、关卡与 Canvas 运行层。
- `src/`：性能、音频、存档、设置、寻路、战斗反馈和战线双人模式等模块。
- `assets/`：人物、载具、建筑、地形和界面素材。
- `tools/`：平衡分析、回归检查和可视化验证脚本。
- `output/`：平衡分析笔记本、设计说明和已生成的验证记录。
- `release/`：可直接分发的完整游戏包。

`tools/package_game.py` 是无第三方依赖的分发打包脚本；它只复制运行游戏所需的入口、模块和正式素材，不会把测试截图、浏览器缓存或本地临时目录放进客户下载包。

## 说明

本仓库不包含 `tmp/` 和 `.playwright-cli/`，这些目录只保存本地生成缓存、浏览器状态和临时文件，可能包含敏感令牌或不适合发布的运行数据。
