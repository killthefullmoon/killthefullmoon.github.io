# 游戏与音乐开放展厅

内容仍然来自 `misc/game.html` 和 `misc/music.html`。每个世界只有一张连续地图：中央走道贯穿全场，两侧用地毯和家具划分分类，分类之间没有门、墙或场景切换。主走道起点保留一扇标有 Back to Home 的回家门，可直接点击，或走近按 E 返回 Home。

每块地毯最多陈列 12 件。同一分类有更多内容时，会自动增加相邻的陈列区，所有条目同时存在于地图里，不需要翻页。新增分类会沿走道自动排布。分类菜单和左右箭头用于快速移动到实际展区；搜索覆盖整个收藏，结果按钮会定位并打开真实展品，其他分类仍保留在原处。点击展品直接查看详情或播放，点击空地才让小人走动；键盘靠近后仍可按 E 互动。

渲染、点击、碰撞与附近互动按空间网格查询；屏幕以外的家具不绘制、封面不加载。封面图片采用 128 张上限的缓存，缩略地图只预绘制一次。地图几何和轻量条目数据随收藏量增长，但画面中处理的展品数量取决于视野。

## 添加游戏

在原有 `.game-card` 上添加可选分类信息，其余标题、图片、状态、时长写法不变：

```html
<div class="game-card" data-genre="rogue" data-studio="Mega Crit">
  <!-- 原有游戏卡片内容 -->
</div>
```

`data-genre` 优先于 `collection-rooms.json` 中的 `games.items`，`data-studio` 优先于既有制作组映射。未标注且没有映射的游戏自动进入 More，不会丢失。

## 添加专辑

在原有 `.album_card` 上标注分类即可；专辑名、艺人和 Spotify iframe 保持原写法：

```html
<div class="album_card" data-genre="jazz" data-genre-name="Jazz">
  <!-- 原有专辑名称、artist_name、Spotify iframe -->
</div>
```

`data-genre` 优先于 `collection-rooms.json` 中的 `music.artists`。未分类的新艺人自动进入 More。

## 新分类与陈列

- 分类 ID 使用小写英文、数字和连字符；`lobby` 保留用于兼容旧链接，指向中央走道。
- 一个新的 `data-genre` 会自动生成开放展区和分类导航；可用 `data-genre-name` 指定显示名。
- 需要固定名称、顺序或地毯色时，在 `collection-rooms.json` 对应的 `rooms` 数组加入 `{ "id": "jazz", "name": "Jazz", "tint": "rgba(150, 110, 70, 0.18)" }`。没有条目的分类不显示。
- 同一制作组或艺人的条目相邻，已有游戏成就排序和专辑新旧排序保留；长分组可以延伸到多块地毯。
- 搜索覆盖整个收藏，支持标题、艺人、制作组与分类名称。每次显示最多 6 个结果按钮，左右箭头可以遍历全部匹配。
- `displaySize` 可设为 1–12，控制每块地毯的陈列量，默认 12。更多内容自动增加地毯；地面和中央走道随之延伸。

## 链接与检查

`misc/my_life.html#games`、`#music` 为中央走道；`#games/rpg`、`#music/neosoul/2` 会定位到对应分类的第一或第二块地毯，仍在同一地图里。`#music?q=Daniel` 可分享搜索，`#music/lobby/2?q=Daniel` 定位到第二个匹配。无效分类回到中央走道，超出范围的序号归到最后一个。走入展区或快速定位时，链接同步更新。

纯数据检查：`node tools/test_collection_rooms.mjs`，覆盖 10,000 件条目、99 个分类、陈列无遗漏、地毯间距、中央走道连通性、中文与兼容字符搜索、搜索定位和旧链接回退。新增内容通常只需要编辑页面和 JSON，不需要更改画布坐标或渲染代码。
