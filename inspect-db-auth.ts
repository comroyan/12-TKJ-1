import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

async function inspect() {
  const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(config);
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  try {
    await signInWithEmailAndPassword(auth, "zainurroyan@classhub.local", "Siswa@TKJ1_2026");
  } catch (e) {
    console.log("Failed login with Siswa@TKJ1_2026, trying another default...");
    try {
      await signInWithEmailAndPassword(auth, "zainurroyan@classhub.local", "Admin@TKJ1_2026");
    } catch (err) {
      console.error("All login attempts failed:", err);
      process.exit(1);
    }
  }
  
  const snap = await getDocs(collection(db, "users"));
  console.log("TOTAL USERS:", snap.size);
  snap.forEach(doc => {
    console.log("USER ID:", doc.id, "NAME:", doc.data().name, "ABSEN:", doc.data().absen);
  });
  process.exit(0);
}

inspect().catch(console.error);
