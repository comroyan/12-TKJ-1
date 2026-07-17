import { initializeApp, deleteApp } from "firebase/app";
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updatePassword, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config";
import firebaseConfig from "../../firebase-applet-config.json";
import { writeAuditLog } from "./db";

export interface UserSession {
  uid: string;
  email: string;
  role: string;
  name: string;
  absen: number;
  status: string;
  mustChangePassword?: boolean;
  foto?: string;
  jabatan?: string;
  bio?: string;
  hp?: string;
  instagram?: string;
  tempatPkl?: string;
}

// Check if setup admin has been completed
export async function isSetupCompleted(): Promise<boolean> {
  const currentOrigin = window.location.origin;
  const isLocalOrSandbox = 
    currentOrigin.includes("localhost") || 
    currentOrigin.includes("127.0.0.1") || 
    currentOrigin.includes("ais-dev") ||
    currentOrigin.includes("run.app") ||
    currentOrigin.includes("googleusercontent.com") ||
    currentOrigin.includes("aistudio.google") ||
    currentOrigin.includes("google.com");

  if (!isLocalOrSandbox) {
    // In production setups on external domains like Vercel, setup is always completed.
    return true;
  }

  // Check local storage first to prevent database roundtrips and avoid issues when Firestore is slow, rate-limited, or temporarily offline
  if (localStorage.getItem("classhub_setup_completed") === "true") {
    return true;
  }
  try {
    const docRef = doc(db, "settings", "setup_status");
    
    // Add a strict timeout of 2.5 seconds to prevent hanging on slow/spotty mobile networks
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Koneksi Firestore lambat (timeout 2.5s)")), 2500)
    );

    const snap = await Promise.race([fetchPromise, timeoutPromise]);
    const completed = snap.exists() && snap.data().completed === true;
    if (completed) {
      localStorage.setItem("classhub_setup_completed", "true");
    }
    return completed;
  } catch (e) {
    console.error("Gagal memeriksa status setup dari Firestore, beralih ke cache lokal:", e);
    return true;
  }
}

// Bootstrap Super Admin with Email & Password
export async function runAdminSetup(name: string, username: string, pass: string, absen: number): Promise<any> {
  const completed = await isSetupCompleted();
  if (completed) {
    throw new Error("Setup admin sudah pernah dijalankan sebelumnya.");
  }

  let email = username.trim();
  if (!email.includes("@")) {
    email = `${email}@classhub.local`;
  }

  let uid: string;
  let user: any;

  try {
    // 1. Try to create the user in Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    user = cred.user;
    uid = user.uid;
  } catch (err: any) {
    if (err.code === "auth/email-already-in-use") {
      // If already in use, try to sign in with the provided password
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      user = cred.user;
      uid = user.uid;
    } else {
      throw err;
    }
  }

  // Create Admin Profile in Firestore
  const adminData = {
    name: name || "Muhamad Zainurroyan",
    absen: absen || 19,
    jabatan: "Ketua Kelas",
    role: "Super Admin",
    status: "aktif",
    email: email,
    hp: "081234567890",
    instagram: "zainurroyan",
    tempatPkl: "PT Telekomunikasi Indonesia",
    bio: "Ketua Kelas XII TKJ 1 & Super Admin ClassHub",
    foto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
    mustChangePassword: false
  };

  await setDoc(doc(db, "users", uid), adminData, { merge: true });

  // Mark Setup as Completed
  await setDoc(doc(db, "settings", "setup_status"), {
    completed: true,
    setupDate: new Date().toISOString(),
    setupBy: uid
  });
  localStorage.setItem("classhub_setup_completed", "true");

  await writeAuditLog("Setup Admin", `Super Admin Pertama (${adminData.name}) berhasil dikonfigurasi.`);
  return user;
}

// Login
export async function loginUser(email: string, pass: string): Promise<UserSession> {
  let formattedEmail = email.trim();
  if (!formattedEmail.includes("@")) {
    formattedEmail = `${formattedEmail}@classhub.local`;
  }
  const cred = await signInWithEmailAndPassword(auth, formattedEmail, pass);
  const uid = cred.user.uid;

  // Fetch Firestore doc
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    throw new Error("Akun ditemukan di Auth tapi profil Firestore tidak ada.");
  }

  const data = userDoc.data();
  if (data.status !== "aktif") {
    await firebaseSignOut(auth);
    throw new Error("Akun Anda telah dinonaktifkan oleh administrator.");
  }

  await writeAuditLog("Login", `Siswa ${data.name} berhasil masuk.`);

  return {
    uid,
    email: cred.user.email!,
    role: data.role,
    name: data.name,
    absen: data.absen,
    status: data.status,
    mustChangePassword: data.mustChangePassword ?? false
  };
}

// Change Password (on first login)
export async function changeUserPassword(newPass: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Tidak ada pengguna aktif.");

  await updatePassword(user, newPass);
  
  // Update flag in firestore
  await setDoc(doc(db, "users", user.uid), {
    mustChangePassword: false
  }, { merge: true });

  await writeAuditLog("Change Password", "Pengguna mengganti password default mereka.");
}

// Forgot Password
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// Sign Out
export async function logoutUser() {
  const user = auth.currentUser;
  if (user) {
    await writeAuditLog("Logout", "Siswa keluar dari sistem.");
  }
  await firebaseSignOut(auth);
}

// Create Student Account (using temp Firebase App instance to prevent session logging swapping)
export async function adminCreateStudentAuthAndProfile(studentData: any): Promise<string> {
  const tempAppName = `temp-app-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    let formattedEmail = studentData.email.trim();
    if (!formattedEmail.includes("@")) {
      formattedEmail = `${formattedEmail}@classhub.local`;
    }

    const cred = await createUserWithEmailAndPassword(tempAuth, formattedEmail, studentData.password);
    const uid = cred.user.uid;

    // Create profile in primary Firestore db
    const profile = {
      name: studentData.name,
      absen: parseInt(studentData.absen),
      email: formattedEmail,
      hp: studentData.hp || "",
      instagram: studentData.instagram || "",
      tempatPkl: studentData.tempatPkl || "",
      jabatan: studentData.jabatan || "Siswa",
      role: studentData.role || "Anggota",
      bio: studentData.bio || "XII TKJ 1 Student",
      status: "aktif",
      foto: studentData.foto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
      mustChangePassword: true // Make them change password on first login
    };

    await setDoc(doc(db, "users", uid), profile);
    await firebaseSignOut(tempAuth);
    await deleteApp(tempApp);

    await writeAuditLog("Create Member", `Admin membuat akun siswa: ${studentData.name}`);
    return uid;
  } catch (error) {
    await deleteApp(tempApp);
    throw error;
  }
}
