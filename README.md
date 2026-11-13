# Flight Diary Dashboard — CSV 自助更新版

本網站為 GitHub Pages 靜態網站，預載資料來自 `flightdiary_2026_11_13_04_17.csv`（174 筆航班），不含人工新增的海路紀錄。

## 首次部署
1. 將 `index.html`、`styles.css`、`app.js`、`data.js`、`importer.js`、`upload.js` 上傳至 GitHub Repository 根目錄。
2. Repository → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save。
3. 等待 GitHub Pages 完成部署。

## 以後直接在 GitHub Pages 更新資料
1. 從 myFlightradar24 匯出與範例相同格式的 CSV（19 欄，含 Date、Flight number、From、To、Dep time、Arr time、Duration、Airline、Aircraft）。
2. 在網站的「更新 FlightDiary 資料」選取 CSV → 「載入並預覽資料」。預覽只在目前瀏覽器工作階段有效，尚未發布。
3. 展開「發布到 GitHub」，填入 GitHub 帳號、Repository 名稱、分支與 Fine-grained Personal Access Token。
4. Token 應只授權這一個 Repository，權限設定 `Contents: Read and write`。GitHub 建立位置：Settings → Developer settings → Personal access tokens → Fine-grained tokens。
5. 點擊「提交更新到 GitHub」，網站會使用 GitHub Contents API 提交更新後的 `data.js`，等待 Pages 部署完成即可跨裝置查看。

**安全提醒**：Token 只用於此次 API 請求，不寫入任何 GitHub 檔案或瀏覽器儲存空間。GitHub Pages 無法在未授權情況下自行永久寫入資料。請不要將 Token 放進程式碼、README 或公開的 Repository。Token 權限若被撤銷，請重新產生。

## 計算邏輯
- 根據 CSV 的出發與抵達機場判定國家；跨國抵達算一次造訪，國內線不重複計次。
- 造訪結束於從該國出境的航班起飛時間；停留與平均間隔精確到秒。
- 尚未抵達的航班不計入實績。未有離境航班的旅程不列入完整停留統計。
- 飛行時間以 CSV 的 Duration 為準；跨時區航班依已知國家時區估算抵達日期。
- 若匯入新機場無法判斷國家，會提示錯誤而非默默歸類。可在 `importer.js` 的 `AIRPORT_COUNTRIES` 補充機場對應。
- CSV 匯入會取代整份資料集，非追加資料；不要上傳只有部分航班的 CSV。
