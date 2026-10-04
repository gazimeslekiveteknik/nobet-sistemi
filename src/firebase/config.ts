import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Firebase Console'dan (console.firebase.google.com) 
// aldığınız proje ayarlarını buraya yapıştırın.
const firebaseConfig = {
  apiKey: "AIzaSyAXa4hzVW-sDuXzUl6q32b3k_rZc6gFQSs",
  authDomain: "nobetprogrami-764d6.firebaseapp.com",
  projectId: "nobetprogrami-764d6",
  storageBucket: "nobetprogrami-764d6.firebasestorage.app",
  messagingSenderId: "831370642316",
  appId: "1:831370642316:web:a1cf3d2f87f83ae969cca9",
  measurementId: "G-7HLWLJVKWB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
