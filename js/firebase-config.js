// Firebase 專案設定
//
// 若要啟用「帳號登入 + 雲端同步」，請到 https://console.firebase.google.com
// 建立專案後，把下方設定值換成你自己專案的設定（詳細步驟見 README.md）。
// 只要 apiKey 保持 "YOUR_API_KEY"，網站會自動以「訪客模式」運作，
// 資料只存在瀏覽器的 localStorage，功能完全正常，只是不能跨裝置同步。

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
