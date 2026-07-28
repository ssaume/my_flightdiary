# Flight Diary Dashboard

純前端互動式旅行儀表板，可直接部署到 GitHub Pages。

## 部署步驟
1. 建立新的 GitHub repository。
2. 將本資料夾內的 `index.html`、`styles.css`、`app.js`、`data.js` 上傳到 repository 根目錄。
3. 開啟 **Settings → Pages**。
4. 在 **Build and deployment** 選擇 **Deploy from a branch**。
5. Branch 選擇 `main`，資料夾選擇 `/(root)`，按 **Save**。
6. 等待 GitHub Pages 顯示網站網址。

## 本地預覽
直接開啟 `index.html`，或在資料夾中執行：
```bash
python -m http.server 8000
```
然後瀏覽 `http://localhost:8000`。

## 統計規則
- 統計範圍：2023–2026。
- 截止日期：2026-07-28。
- 尚未出發及未完成旅程不計算。
- 時間顆粒度：時、分、秒。
- 國內線不重複計算造訪次數。

## 人工補充紀錄

- 2019-07-07：由香港搭海路離境。因未提供確切離境時刻，儀表板暫以 00:00:00 計算，並在停留明細標示為「海路；未提供確切時間」。
