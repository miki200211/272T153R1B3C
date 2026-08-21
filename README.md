# 🎖️ 272梯 陸軍步兵第153旅 步1營第3連 (153R 1B3C) 結訓數位紀念冊系統

> 專為 **272梯 陸軍步兵第153旅（宜蘭金六結）步1營第3連 (153R 1B3C)** 量身打造的完整數位紀念冊與通訊錄互動系統。

---

## 🌟 系統特色與亮點

* 💂 **三連專屬軍旅風介面**：軍事迷彩與戰術金屬徽章點綴，兼具專業與現代流暢美感。
* 👥 **全連班級名冊 (1~9班)**：完整收錄 98 位弟兄，卡片清楚標註姓名、綽號、公差職責、IG / LINE 一鍵複製與跳轉。
* 🛏️ **寢室床位配置圖 (1~11寢)**：9人寢室上下鋪雙層鋼床 3D 空間視覺化藍圖，點擊可快速瀏覽室友檔案。
* 📖 **國軍莒光作文簿 (大兵日記)**：擬真綠色稿紙、紅邊線、輔導長/連長評閱紅章，重溫莒光夜寫心得時光。
* ⚡ **三連傳奇榜 (Legends)**：爆笑天兵事蹟、單戰水壺事件等回憶時間軸。
* 🔒 **認證與個資管理**：預設以學號（如 `13005`）登入，登入後解鎖編輯個人自介、大頭貼與撰寫日記傳奇功能。忘記密碼提示：**「忘記密碼請聯繫 13055」**。
* ☁️ **Google 雲端無伺服器架構**：前端靜態託管於 GitHub Pages，後端透過 Google Apps Script 連接 Google Sheets 與 Google Drive（相片存放），0 維護成本、永久保存！
* ⚡ **即開即用 Demo 模式**：前端內建離線模擬快取，未串接後端時亦可直接獨立運行預覽！

---

## 📂 專案檔案結構

```text
153R1B3C/
├── index.html                   # 主頁面結構（頂部導覽、左主區、右側常駐導覽列、彈窗）
├── css/
│   └── style.css                # 樣式表（軍事主題、莒光作文簿、床位圖、響應式排版）
├── js/
│   ├── config.js                # 系統組態設定（GAS 網址與使用者會話管理）
│   ├── mockData.js              # 預設展示資料庫（98位弟兄、幹部、傳奇與日記）
│   ├── api.js                   # Google Apps Script RESTful API 通訊模組
│   └── app.js                   # 前端核心應用程式控制器與畫面渲染器
├── gas/
│   └── Code.gs                  # Google Apps Script 完整後端代碼（含一鍵初始化資料庫）
└── README.md                    # 本部署與使用說明文件
```

---

## 🚀 快速部屬與設定教學

### 第一步：Google 雲端後端與資料庫建立 (約 3 分鐘)

1. **建立 Google 試算表**：
   * 前往您的 Google Drive 資料夾：[**272T153R1B3C**](https://drive.google.com/drive/folders/18i6AGAwU9ntTZwQEP6dfCTMOlBJivObv?usp=drive_link)。
   * 在該資料夾內新增名為 `153R1B3C_Database` 的 Google 試算表。
   * （後端程式 `gas/Code.gs` 已綁定該資料夾 ID `18i6AGAwU9ntTZwQEP6dfCTMOlBJivObv`，將自動於該處建立 `Avatars` 資料夾存放個人大頭貼）。

2. **貼入 Apps Script 程式碼**：
   * 在試算表上方選單點選 **「擴充功能」 (Extensions) ➔「Apps Script」**。
   * 將本專案 `gas/Code.gs` 的所有內容複製並貼入編輯器中，覆蓋原本內容。
   * 按下 **Ctrl + S** 儲存專案。

3. **一鍵初始化資料庫**：
   * 在 Apps Script 編輯器頂部函式下拉選單中選擇 **`setupDatabase`**，點擊 **「執行」 (Run)**。
   * （首次執行會跳出權限授權提示，請點選「進階」➔「前往專案（不安全）」並允許授權）。
   * 執行完畢後，試算表會自動產生 `Members`, `Cadres`, `Legends`, `Diaries` 4 張工作表並填入預設資料！

4. **部署為網頁應用程式 (Web App)**：
   * 點選 Apps Script 右上角的 **「部署」 (Deploy) ➔「新增部署作業」 (New deployment)**。
   * 點選齒輪圖示選擇 **「網頁應用程式」 (Web app)**。
   * 設定說明如下：
     * **說明 (Description)**：`153R1B3C Production API`
     * **執行身分 (Execute as)**：`我 (您的 Google 帳號)`
     * **誰可以存取 (Who has access)**：`所有人 (Anyone)` *(務必選擇所有人，以允許前端讀寫)*
   * 點選 **「部署」**，複製產生的 **網頁應用程式網址 (Web App URL)**（格式如：`https://script.google.com/macros/s/.../exec`）。

---

### 第二步：GitHub Pages 前端部署 (約 2 分鐘)

1. 前往 [GitHub](https://github.com/) 建立一個新的公開 Repository（如 `153R1B3C-memorial`）。
2. 將本專案的所有檔案（`index.html`, `css/`, `js/`, `README.md` 等）上傳或推送到 Repository 的 `main` 分支。
3. 進入 Repository 的 **Settings ➔ Pages**：
   * **Source** 選擇 `Deploy from a branch`。
   * **Branch** 選擇 `main` / `root`。
   * 點選 **Save**。
4. 約 1 分鐘後，GitHub Pages 即會產生專屬公開網址（如 `https://your-username.github.io/153R1B3C-memorial/`）。

---

### 第三步：填入 Google Apps Script 網址

1. 開啟專案內的 [`js/config.js`](file:///d:/code/Project/153R1B3C/js/config.js)。
2. 將第一步獲得的 **Web App 網址** 貼入 `DEFAULT_GAS_API_URL` 欄位中：
   ```javascript
   DEFAULT_GAS_API_URL: 'https://script.google.com/macros/s/.../exec',
   ```
3. 儲存並推送到 GitHub，全站即可自動與 Google 試算表及 Google Drive 即時雙向同步！

---

## 💡 使用者操作指引

* **預設帳號與密碼**：
  * 學號（例如 `13005`），密碼預設亦為學號 `13005`。
  * 登入後可於自己的名冊卡片上點擊「編輯我的個人自介」，修改姓名、綽號、IG、LINE、感言並上傳新大頭貼。
* **忘記密碼**：
  * 請聯繫連隊窗口 `13055`（黃敬堯）。
* **一鍵複製與跳轉**：
  * 點擊任何弟兄卡片上的 **IG 按鈕**，可直接開啟 Instagram 個人主頁。
  * 點擊 **LINE 按鈕**，可一鍵將 LINE ID 複製至手機剪貼簿。
* **寢室床位圖**：
  * 點擊寢室各床位，可直接彈出該弟兄之專屬檔案名片。

---

*272梯 陸軍步兵第153旅 步1營第3連 全體弟兄 結訓留念* 🎖️
