import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            "AIzaSyCO9lY-yp1wv8-Cp-_zXiE6J93qaKB1cRc",
  authDomain:        "hao-realtime.firebaseapp.com",
  databaseURL:       "https://hao-realtime-default-rtdb.firebaseio.com", // ← WAJIB untuk RTDB
  projectId:         "hao-realtime",
  storageBucket:     "hao-realtime.firebasestorage.app",
  messagingSenderId: "809204783008",
  appId:             "1:809204783008:web:5d36a253d1c939375e36c5",
  measurementId:     "G-NCZ2M0G5HB",
}

const app = initializeApp(firebaseConfig)

export const db   = getDatabase(app)
export const auth = getAuth(app)
export default app