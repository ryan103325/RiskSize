// Firebase 專案設定
//
// 若要啟用「帳號登入 + 雲端同步」，請到 https://console.firebase.google.com
// 建立專案後，把下方設定值換成你自己專案的設定（詳細步驟見 README.md）。
// 只要 apiKey 保持 "YOUR_API_KEY"，網站會自動以「訪客模式」運作，
// 資料只存在瀏覽器的 localStorage，功能完全正常，只是不能跨裝置同步。

export const firebaseConfig = {
  apiKey: "AIzaSyBg2zel9db4LmZBIqjDcHa9vcpBHxtFHfQ",
  authDomain: "risksize-261cf.firebaseapp.com",
  projectId: "risksize-261cf",
  storageBucket: "risksize-261cf.firebasestorage.app",
  messagingSenderId: "1005342520959",
  appId: "1:1005342520959:web:d46246fb76e96a92d7b14a",
  measurementId: "G-4GEKXKGB4H"
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
