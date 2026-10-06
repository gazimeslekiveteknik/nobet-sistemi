const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");

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
const db = getFirestore(app);

async function testFirebase() {
  try {
    console.log("Firebase'e baglaniliyor...");
    const testDoc = doc(db, "test_collection", "connection_test");
    await setDoc(testDoc, {
      status: "BAŞARILI",
      message: "Yapay Zeka asistanınızdan merhaba! Veritabanınız kusursuz çalışıyor.",
      time: new Date().toISOString()
    });
    console.log("-> Veri yazma testi BAŞARILI!");

    const snap = await getDoc(testDoc);
    if (snap.exists()) {
      console.log("-> Veri okuma testi BAŞARILI!");
      console.log("   Gelen Veri:", snap.data().message);
    } else {
      console.log("Veri bulunamadi.");
    }
    process.exit(0);
  } catch (error) {
    console.error("BAGLANTI HATASI:", error);
    process.exit(1);
  }
}

testFirebase();
