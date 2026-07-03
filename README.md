# RiskSize｜台股現股當沖 風控倉位計算器

依「風險金額 ÷ 單張總風險」計算可持有張數的當沖倉位計算器。
計算已含 **手續費（可設折數）** 與 **現股當沖證交稅 0.15%**，並依盈虧比反推止盈價位。

> 適用範圍：台股現股當沖。不含期貨、選擇權與零股；不計滑價、不檢查當沖額度與平盤下放空限制。

## 功能

- ✅ 依規格計算：可持有張數（無條件捨去）、部位所需資金、實際動用風險金額（含差額）、止盈價位、預期虧損 / 預期浮盈（皆已扣費用）
- ✅ 輸入驗證：方向與止損價矛盾、張數為 0 等阻斷式錯誤提示
- ✅ 費率可自訂：證交稅優惠稅率（至民國 116 年底）到期後，直接在「設定」改成 0.3% 即可，不用改程式碼
- ✅ 記憶功能：設定值、上次輸入、歷史紀錄自動存在瀏覽器（localStorage）
- ✅ 歷史紀錄：儲存每筆試算、可刪除、可匯出 CSV
- ✅ 帳號登入（選用）：接上 Firebase 後可用 Google 帳號登入，設定與紀錄跨裝置雲端同步

---

## 一、啟用 GitHub Pages（必做，約 1 分鐘）

1. 到本 repo 的 **Settings → Pages**
2. **Source** 選 `Deploy from a branch`
3. **Branch** 選 `main`、資料夾選 `/ (root)`，按 **Save**
4. 等 1～2 分鐘，網站就會發布在：
   `https://<你的帳號>.github.io/RiskSize/`

> 不用登入也能完整使用：所有資料存在瀏覽器 localStorage，只是換裝置或清瀏覽器資料時不會保留。

## 二、啟用帳號登入與雲端同步（選用，約 10 分鐘）

登入功能使用 [Firebase](https://firebase.google.com)（Google 提供，免費額度對個人使用綽綽有餘）。

### 1. 建立 Firebase 專案

1. 到 [Firebase Console](https://console.firebase.google.com) → **建立專案**（名稱隨意，例如 `risksize`），Google Analytics 可關閉
2. 專案首頁點 **</>（Web）** 新增網頁應用程式，暱稱隨意，**不用**勾選 Hosting
3. 畫面會顯示一段 `firebaseConfig = { apiKey: "...", ... }` — 把這些值複製下來

### 2. 開啟 Google 登入

1. 左側選單 **建構 → Authentication → 開始使用**
2. 「登入方式」分頁 → 啟用 **Google** → 儲存

### 3. 建立 Firestore 資料庫

1. 左側選單 **建構 → Firestore Database → 建立資料庫**
2. 位置選 `asia-east1`（台灣），模式選 **正式版（鎖定模式）**
3. 到「規則」分頁，貼上以下規則後按 **發布**（只允許使用者讀寫自己的資料）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 4. 加入授權網域

1. **Authentication → 設定 → 授權網域** → 新增網域
2. 填入 `<你的帳號>.github.io`

### 5. 填入設定值

編輯 [`js/firebase-config.js`](js/firebase-config.js)，把步驟 1 複製的值貼進去：

```js
export const firebaseConfig = {
  apiKey: "AIzaSy...",              // ← 換成你的
  authDomain: "risksize.firebaseapp.com",
  projectId: "risksize",
  storageBucket: "risksize.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
```

commit 並 push 後，網站右上角就會出現「使用 Google 登入」按鈕。

> **這些設定值可以公開嗎？** 可以。Firebase 的 apiKey 只是專案識別碼，不是密碼；資料安全由步驟 3 的 Firestore 規則把關（每人只能存取自己的資料）。

---

## 費率設定

| 項目 | 預設值 | 說明 |
|---|---|---|
| 單邊手續費率基準 | 0.1425% | 實付 = 基準 × 折數 ÷ 10 |
| 手續費折數 | 6 折 | 依你的券商調整（1～10） |
| 當沖證交稅率 | 0.15% | 優惠稅率適用至民國 116 年 12 月 31 日，**到期後請在網頁「設定」改為 0.3** |

## 計算公式

```
單邊手續費率 = 0.1425% × (折數 / 10)
止損距離 = |進場價 − 止損價|

止損出場單股成本：
  做多 = 進場價 × 手續費率 + 止損價 × (手續費率 + 稅率)
  做空 = 進場價 × (手續費率 + 稅率) + 止損價 × 手續費率

單張總風險 = (止損距離 + 單股成本) × 1000
可持有張數 = floor(風險金額 × 1000 ÷ 單張總風險)
止盈價位  = 進場價 ± 盈虧比 × 止損距離
```

## 專案結構

```
index.html            主頁面
css/styles.css        樣式
js/calculator.js      計算核心（純函式）
js/app.js             UI、localStorage 記憶、歷史紀錄
js/cloud.js           Firebase 登入與 Firestore 同步
js/firebase-config.js Firebase 設定（未填時自動以訪客模式運作）
```

## 免責聲明

本結果未計入滑價與實際成交價落差，當沖急殺 / 急拉時實際虧損可能高於顯示值，僅供參考。
