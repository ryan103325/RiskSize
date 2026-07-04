// Firebase 專案設定
//
// 若要啟用「帳號登入 + 雲端同步」，請到 https://console.firebase.google.com
// 建立專案後，把下方設定值換成你自己專案的設定（詳細步驟見 README.md）。
// 只要 apiKey 保持 "YOUR_API_KEY"，網站會自動以「訪客模式」運作，
// 資料只存在瀏覽器的 localStorage，功能完全正常，只是不能跨裝置同步。

export const firebaseConfig = {
  apiKey: "AIzaSyCvgz7rh2rEXWzEx5vxjlYp9OWbt9ruOSY",
  authDomain: "risksize-b42e7.firebaseapp.com",
  projectId: "risksize-b42e7",
  storageBucket: "risksize-b42e7.firebasestorage.app",
  messagingSenderId: "618783220880",
  appId: "1:618783220880:web:b02991ac462896914ca415",
  measurementId: "G-5N6PNED5WZ"
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
