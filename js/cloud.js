// Firebase 登入與雲端同步（未設定 firebase-config.js 時整個模組靜默停用）

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let auth = null;
let db = null;
let fns = null; // 動態載入的 firestore/auth 函式

export const cloudEnabled = isFirebaseConfigured();

/**
 * 初始化 Firebase 並監聽登入狀態。
 * @param {(user: {uid,displayName,email,photoURL}|null) => void} onUserChange
 */
export async function initCloud(onUserChange) {
  if (!cloudEnabled) return;

  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
  ]);

  const app = initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = fsMod.getFirestore(app);
  fns = { ...authMod, ...fsMod };

  authMod.onAuthStateChanged(auth, (user) => onUserChange(user));
}

export async function signIn() {
  const provider = new fns.GoogleAuthProvider();
  await fns.signInWithPopup(auth, provider);
}

export async function signOutUser() {
  await fns.signOut(auth);
}

/** 讀取使用者雲端資料：{ settings, records } 或 null */
export async function loadUserData(uid) {
  const snap = await fns.getDoc(fns.doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/** 寫入使用者雲端資料（整份覆蓋，資料量小） */
export async function saveUserData(uid, data) {
  await fns.setDoc(fns.doc(db, 'users', uid), data, { merge: true });
}
