import "./index.css";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { 
  isSetupCompleted, 
  runAdminSetup, 
  loginUser, 
  changeUserPassword, 
  resetPassword, 
  logoutUser, 
  UserSession 
} from "./firebase/auth";
import { renderIcons, toast, sendLocalSystemNotification, requestNotificationPermission } from "./utils/helpers";
import { createStudentUser } from "./firebase/db";

// Import Page Renderers
import { renderDashboard } from "./pages/dashboard";
import { renderAnggota } from "./pages/anggota";
import { renderJadwal } from "./pages/jadwal";
import { renderKas } from "./pages/kas";
import { renderTugas } from "./pages/tugas";
import { renderVoting } from "./pages/voting";
import { renderOrganisasi } from "./pages/organisasi";
import { renderGaleri } from "./pages/galeri";
import { renderMeetings } from "./pages/meetings";
import { renderContacts } from "./pages/contacts";
import { renderProfile } from "./pages/profile";
import { renderLogs } from "./pages/logs";
import { renderLearningCenter } from "./pages/learningCenter";
import { renderLatihan } from "./pages/latihan";
import { renderTKJHub } from "./pages/tkjHub";
import { renderMiniGames } from "./pages/miniGames";
import { renderLinkBelajar } from "./pages/linkBelajar";
import { renderDiskusi, cleanupDiskusiListener } from "./pages/diskusi";
import { renderSubmissions } from "./pages/submissions";
import { renderSaluran } from "./pages/saluran";

// App Core State
let activeUserSession: UserSession | null = null;
let currentActivePage = "dashboard";
let globalUnsubscribeNotifications: (() => void) | null = null;

// Theme Engine
export function applyTheme() {
  const currentTheme = localStorage.getItem("classhub_theme") || "dark";
  const htmlEl = document.documentElement;
  
  // Disable transitions temporarily during theme switch to prevent GPU texture artifacts and scanline glitches on mobile
  htmlEl.classList.add("no-transitions");
  
  if (currentTheme === "light") {
    htmlEl.classList.add("light-theme");
  } else {
    htmlEl.classList.remove("light-theme");
  }
  
  const themeToggleButtons = document.querySelectorAll("#themeToggleBtn, #mobileThemeToggleBtn");
  themeToggleButtons.forEach((btn: any) => {
    const lightIcon = btn.querySelector(".light-icon");
    const darkIcon = btn.querySelector(".dark-icon");
    if (lightIcon && darkIcon) {
      if (currentTheme === "light") {
        lightIcon.classList.add("hidden");
        lightIcon.classList.remove("block");
        darkIcon.classList.add("block");
        darkIcon.classList.remove("hidden");
      } else {
        lightIcon.classList.add("block");
        lightIcon.classList.remove("hidden");
        darkIcon.classList.add("hidden");
        darkIcon.classList.remove("block");
      }
    }
  });

  // Force full browser reflow & repaint to clear GPU paint caches on mobile devices
  const rootEl = document.getElementById("root");
  if (rootEl) {
    const originalVisibility = rootEl.style.visibility;
    rootEl.style.visibility = "hidden";
    rootEl.offsetHeight; // Force layout reflow and invalidates GPU texture cache
    rootEl.style.visibility = originalVisibility;
  }

  // Safely remove the no-transitions lock after a short delay so hover transitions remain functional afterwards
  setTimeout(() => {
    htmlEl.classList.remove("no-transitions");
  }, 50);
}

export function toggleTheme() {
  const currentTheme = localStorage.getItem("classhub_theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("classhub_theme", newTheme);
  applyTheme();
}

// Initial theme apply
applyTheme();


// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker registered successfully."))
      .catch(err => console.error("Service Worker registration failed:", err));
  });
}

// Main DOM Entry Point
const rootEl = document.getElementById("root") as HTMLElement;

// Main Routing and Initialization Orchestrator
async function initializeApplet() {
  // 1. Check if Setup is Completed
  const setupDone = await isSetupCompleted();
  if (!setupDone) {
    renderSetupScreen();
    return;
  }

  // 2. Listen to Auth State
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      activeUserSession = null;
      localStorage.removeItem("classhub_cached_profile");
      renderLoginScreen();
    } else {
      let data: any = null;
      
      try {
        // Fetch profile with a 2.5s timeout to prevent hanging on mobile networks
        const fetchPromise = getDoc(doc(db, "users", user.uid));
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout memuat profil dari Firestore (2.5s)")), 2500)
        );
        
        const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
        if (userDoc && userDoc.exists()) {
          data = userDoc.data();
        }
      } catch (err) {
        console.warn("Gagal/Timeout memuat profil real-time dari Firestore, mencoba cache lokal...", err);
      }

      // Check for cached profile in localStorage if Firestore is slow or offline
      if (!data) {
        const cached = localStorage.getItem("classhub_cached_profile");
        if (cached) {
          try {
            data = JSON.parse(cached);
            console.log("Berhasil memuat data profil dari cache lokal offline.");
          } catch (e) {
            console.error("Gagal membaca profil ter-cache:", e);
          }
        }
      }

      // Ultimate fallback: If there is no Firestore profile and no cache, build a basic temporary profile to let the app load
      if (!data) {
        console.warn("Profil tidak ditemukan. Membuat profil sementara berbasis akun.");
        data = {
          name: user.displayName || user.email?.split("@")[0] || "Siswa ClassHub",
          role: "Siswa",
          absen: 0,
          status: "aktif",
          mustChangePassword: false
        };
      }

      activeUserSession = {
        uid: user.uid,
        email: user.email!,
        role: data.role || "Siswa",
        name: data.name || "Siswa ClassHub",
        absen: data.absen ?? 0,
        status: data.status || "aktif",
        mustChangePassword: data.mustChangePassword ?? false,
        ...data // Include extra details like hp, bio, tempatPkl
      };

      // Save to localStorage cache for instant loads next time
      localStorage.setItem("classhub_cached_profile", JSON.stringify(activeUserSession));

      // Enforce password change on first login as requested
      if (activeUserSession.mustChangePassword) {
        renderMustChangePasswordScreen();
      } else {
        const pageContent = document.getElementById("pageContent");
        if (pageContent) {
          // Update cached user session dynamically if layout is already rendered
          const userNameEl = document.getElementById("sidebarUserName");
          const userJabatanEl = document.getElementById("sidebarUserJabatan");
          const userPhotoEl = document.getElementById("sidebarUserPhoto") as HTMLImageElement;
          if (userNameEl) userNameEl.innerText = activeUserSession.name;
          if (userJabatanEl) userJabatanEl.innerText = activeUserSession.jabatan;
          if (userPhotoEl) userPhotoEl.src = activeUserSession.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop';
        } else {
          renderMainLayout();
        }
      }
    }
  });
}

// -----------------------------------------------------
// SCREEN: SETUP ADMIN (Run Once Bootstrap)
// -----------------------------------------------------
function renderSetupScreen() {
  rootEl.innerHTML = `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div class="w-full max-w-lg glass p-8 rounded-3xl space-y-6 relative border border-slate-800 text-center">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <i data-lucide="shield-alert" class="w-8 h-8"></i>
          </div>
        </div>
        
        <div class="space-y-2">
          <h1 class="text-2xl font-bold font-display text-white tracking-tight">Setup Admin Awal</h1>
          <p class="text-sm text-slate-400 leading-relaxed">Selamat datang di ClassHub XII TKJ 1. Lengkapi data di bawah secara aman untuk membuat Super Admin pertama dan menginisialisasi database kelas.</p>
        </div>

        <form id="setupForm" class="space-y-4 text-left">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap Super Admin</label>
            <input type="text" id="setupNameInput" required value="Muhamad Zainurroyan" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor Absen</label>
            <input type="number" id="setupAbsenInput" required value="19" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Username Super Admin</label>
            <input type="text" id="setupUsernameInput" required placeholder="Masukkan username (contoh: zainurroyan)" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Password Super Admin</label>
            <input type="password" id="setupPasswordInput" required placeholder="Masukkan password super admin" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>

          <button type="submit" id="submitSetupBtn" class="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer">
            <i data-lucide="shield-check" class="w-5 h-5"></i> Inisialisasi & Buat Super Admin
          </button>
        </form>
      </div>
    </div>
  `;

  renderIcons();

  const setupForm = document.getElementById("setupForm") as HTMLFormElement;
  const submitSetupBtn = document.getElementById("submitSetupBtn") as HTMLButtonElement;

  setupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitSetupBtn.disabled = true;
    submitSetupBtn.innerHTML = `<span class="spinner"></span> Mengonfigurasi...`;

    const name = (document.getElementById("setupNameInput") as HTMLInputElement).value.trim();
    const absen = parseInt((document.getElementById("setupAbsenInput") as HTMLInputElement).value);
    const username = (document.getElementById("setupUsernameInput") as HTMLInputElement).value.trim();
    const password = (document.getElementById("setupPasswordInput") as HTMLInputElement).value;

    try {
      await runAdminSetup(name, username, password, absen);
      toast.success("Database berhasil diinisialisasi & Admin terdaftar!");
      // Force reload page to initiate auth state listening
      window.location.reload();
    } catch (err: any) {
      submitSetupBtn.disabled = false;
      submitSetupBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i> Inisialisasi & Buat Super Admin`;
      toast.error(err.message);
    }
  });
}

// -----------------------------------------------------
// SCREEN: LOGIN
// -----------------------------------------------------
function renderLoginScreen() {
  rootEl.innerHTML = `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div class="w-full max-w-md glass p-8 rounded-3xl space-y-6 border border-slate-800 relative">
        <div class="text-center space-y-2">
          <div class="flex justify-center">
            <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <i data-lucide="award" class="w-8 h-8"></i>
            </div>
          </div>
          <h1 class="text-2xl font-bold font-display text-white tracking-tight mt-3">ClassHub XII TKJ 1</h1>
          <p class="text-xs text-slate-400">Networking our future, configuring our goals.</p>
        </div>

        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Username / Email Kelas</label>
            <input type="text" id="emailInput" placeholder="Contoh: zainurroyan" class="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm placeholder-slate-600 transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1 flex justify-between items-center">
              <span>Kata Sandi Akun</span>
              <button type="button" id="forgotPassBtn" class="text-[10px] text-cyan-400 hover:underline">Lupa Password?</button>
            </label>
            <input type="password" id="passwordInput" placeholder="Masukkan password" class="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm placeholder-slate-600 transition-colors">
          </div>

          <button type="submit" id="submitLoginBtn" class="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer">
            Masuk ke Portal
          </button>
        </form>
      </div>
    </div>
  `;

  renderIcons();

  const loginForm = document.getElementById("loginForm") as HTMLFormElement;
  const submitBtn = document.getElementById("submitLoginBtn") as HTMLButtonElement;
  const forgotBtn = document.getElementById("forgotPassBtn") as HTMLButtonElement;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("emailInput") as HTMLInputElement).value.trim();
    const password = (document.getElementById("passwordInput") as HTMLInputElement).value;

    if (!email || !password) {
      toast.error("Silakan isi semua kolom login.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Menghubungkan...`;

    try {
      await loginUser(email, password);
      toast.success("Selamat datang kembali!");
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Masuk dengan Email & Password`;
      toast.error(err.message);
    }
  });

  forgotBtn.addEventListener("click", async () => {
    const email = (document.getElementById("emailInput") as HTMLInputElement).value.trim();
    if (!email) {
      toast.error("Masukkan email terlebih dahulu di kolom username.");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Link reset password berhasil dikirim ke email Anda!");
    } catch (err: any) {
      toast.error(err.message);
    }
  });
}

// -----------------------------------------------------
// SCREEN: COMPLETE PROFILE (For first Google Login of non-admins)
// -----------------------------------------------------
function renderCompleteProfileScreen(user: any) {
  rootEl.innerHTML = `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div class="w-full max-w-lg glass p-8 rounded-3xl space-y-6 border border-slate-800 relative">
        <div class="text-center space-y-2">
          <div class="flex justify-center">
            <div class="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <i data-lucide="user-plus" class="w-8 h-8"></i>
            </div>
          </div>
          <h2 class="text-xl font-bold font-display text-white tracking-tight mt-3">Lengkapi Profil Siswa</h2>
          <p class="text-xs text-slate-400">Hubungkan akun Google Anda dengan biodata resmi XII TKJ 1.</p>
        </div>

        <form id="completeProfileForm" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div class="md:col-span-2">
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
            <input type="text" id="profNameInput" required value="${user.displayName || ""}" placeholder="Nama Lengkap sesuai absensi" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>
          
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor Absen</label>
            <input type="number" id="profAbsenInput" min="1" max="50" required placeholder="Contoh: 19" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>

          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">No. HP / WhatsApp</label>
            <input type="tel" id="profHpInput" required placeholder="Contoh: 081234567890" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>

          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Username Instagram</label>
            <input type="text" id="profIgInput" placeholder="Contoh: zainurroyan" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>

          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Tempat PKL</label>
            <input type="text" id="profPklInput" placeholder="Contoh: PT Telkom" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors">
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs text-slate-400 font-semibold mb-1">Bio Singkat</label>
            <textarea id="profBioInput" placeholder="Ceritakan singkat tentang dirimu..." class="w-full h-20 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-sm transition-colors resize-none"></textarea>
          </div>

          <div class="md:col-span-2 flex gap-3 pt-2">
            <button type="button" id="profCancelBtn" class="flex-1 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-bold rounded-2xl transition-all">
              Batal / Keluar
            </button>
            <button type="submit" id="profSubmitBtn" class="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-cyan-500/10">
              Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  renderIcons();

  const form = document.getElementById("completeProfileForm") as HTMLFormElement;
  const submitBtn = document.getElementById("profSubmitBtn") as HTMLButtonElement;
  const cancelBtn = document.getElementById("profCancelBtn") as HTMLButtonElement;

  cancelBtn.addEventListener("click", async () => {
    await logoutUser();
    window.location.reload();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (document.getElementById("profNameInput") as HTMLInputElement).value.trim();
    const absen = parseInt((document.getElementById("profAbsenInput") as HTMLInputElement).value);
    const hp = (document.getElementById("profHpInput") as HTMLInputElement).value.trim();
    const instagram = (document.getElementById("profIgInput") as HTMLInputElement).value.trim();
    const tempatPkl = (document.getElementById("profPklInput") as HTMLInputElement).value.trim();
    const bio = (document.getElementById("profBioInput") as HTMLInputElement).value.trim();

    if (!name || isNaN(absen) || !hp) {
      toast.error("Nama Lengkap, Nomor Absen, dan No. HP wajib diisi.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Menyimpan...`;

    try {
      const profileData = {
        name,
        absen,
        email: user.email,
        hp,
        instagram,
        tempatPkl,
        bio: bio || "XII TKJ 1 Student",
        jabatan: "Siswa",
        role: "Anggota",
        status: "aktif",
        foto: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
        mustChangePassword: false
      };

      await createStudentUser(user.uid, profileData);
      toast.success("Profil berhasil disimpan! Selamat bergabung.");
      window.location.reload();
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Simpan Profil`;
      toast.error(err.message);
    }
  });
}

// -----------------------------------------------------
// SCREEN: MUST CHANGE PASSWORD ON FIRST LOGIN
// -----------------------------------------------------
function renderMustChangePasswordScreen() {
  rootEl.innerHTML = `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div class="w-full max-w-md glass p-8 rounded-3xl space-y-6 border border-slate-800 relative text-center">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <i data-lucide="lock" class="w-8 h-8"></i>
          </div>
        </div>

        <div class="space-y-1">
          <h2 class="text-xl font-bold font-display text-white">Amankan Akun Anda</h2>
          <p class="text-xs text-slate-400">Karena ini login pertama Anda, harap ganti password default Anda untuk melindungi profil siswa Anda.</p>
        </div>

        <form id="forceChangeForm" class="space-y-4 text-left">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Password Baru</label>
            <input type="password" id="newPassInput" required placeholder="Minimal 6 karakter" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 text-slate-100 outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Konfirmasi Password Baru</label>
            <input type="password" id="confirmPassInput" required placeholder="Ulangi password" class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 text-slate-100 outline-none text-sm">
          </div>

          <button type="submit" id="submitForceBtn" class="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl transition-all">
            Simpan Password & Masuk
          </button>
        </form>
      </div>
    </div>
  `;

  renderIcons();

  const form = document.getElementById("forceChangeForm") as HTMLFormElement;
  const submitBtn = document.getElementById("submitForceBtn") as HTMLButtonElement;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = (document.getElementById("newPassInput") as HTMLInputElement).value;
    const confirmPass = (document.getElementById("confirmPassInput") as HTMLInputElement).value;

    if (newPass.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Menyimpan...`;

    try {
      await changeUserPassword(newPass);
      toast.success("Password aman tersimpan!");
      window.location.reload();
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Simpan Password & Masuk`;
      toast.error(err.message);
    }
  });
}

// -----------------------------------------------------
// LAYOUT: MAIN APP DRAWER / FRAME
// -----------------------------------------------------
async function renderMainLayout() {
  if (!activeUserSession) return;

  const isSAdmin = activeUserSession.role === "Super Admin";

  rootEl.innerHTML = `
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row relative">
      <!-- Mobile Top Navigation Bar -->
      <div class="md:hidden flex items-center justify-between px-6 py-4 glass border-b border-slate-850 z-50 w-full">
        <div class="flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=48&h=48&fit=crop" id="headerClassLogo" class="w-8 h-8 rounded-xl object-cover border border-slate-800">
          <span class="text-sm font-bold font-display tracking-tight" id="headerClassName">XII TKJ 1</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="mobileThemeToggleBtn" class="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-850" title="Ubah Tema">
            <i data-lucide="sun" class="w-5 h-5 light-icon block"></i>
            <i data-lucide="moon" class="w-5 h-5 dark-icon hidden"></i>
          </button>
          <button id="mobileBurgerBtn" class="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-850">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Sidebar (Responsive Overlay for Mobile) -->
      <aside id="sidebarPanel" class="w-72 glass border-r border-slate-850 p-6 flex flex-col justify-between fixed md:sticky inset-y-0 left-0 h-screen z-50 md:z-40 transition-all duration-300 hidden md:flex">
        <div class="space-y-6">
          <!-- Class Logo Header -->
          <div class="glass p-4 flex items-center gap-3 mb-2 border border-white/10">
            <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=64&h=64&fit=crop" id="headerClassLogo" class="w-10 h-10 rounded-lg object-cover border border-white/10 shadow-md">
            <div>
              <h2 class="text-sm font-bold tracking-tight leading-none text-white" id="headerClassName">XII TKJ 1</h2>
              <span class="text-[10px] text-sky-400 font-mono mt-1 block">ClassHub Digital • 2025/2026</span>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="space-y-1.5 overflow-y-auto max-h-[60vh] pr-1 scroll-hide">
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="dashboard">
              <i data-lucide="home" class="w-4 h-4"></i> Dashboard
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="anggota">
              <i data-lucide="users" class="w-4 h-4"></i> Anggota Kelas
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="jadwal">
              <i data-lucide="calendar" class="w-4 h-4"></i> Jadwal & Piket
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="kas">
              <i data-lucide="dollar-sign" class="w-4 h-4"></i> Kas & Keuangan
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-cyan-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="diskusi">
              <i data-lucide="message-circle" class="w-4 h-4 text-cyan-400 animate-pulse"></i> Diskusi Kelas
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-emerald-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="saluran">
              <i data-lucide="radio" class="w-4 h-4 text-emerald-400"></i> Saluran Informasi <span class="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono animate-pulse">Siaran</span>
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="learning-center">
              <i data-lucide="book-open" class="w-4 h-4 text-cyan-400"></i> Learning Center
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="latihan">
              <i data-lucide="graduation-cap" class="w-4 h-4 text-rose-400"></i> Latihan & Ujian
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="tkj-hub">
              <i data-lucide="cpu" class="w-4 h-4 text-cyan-400"></i> TKJ HUB
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="mini-games">
              <i data-lucide="gamepad-2" class="w-4 h-4 text-cyan-400"></i> Mini Games
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="link-belajar">
              <i data-lucide="link" class="w-4 h-4 text-cyan-400"></i> Link Belajar
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="tugas">
              <i data-lucide="list-todo" class="w-4 h-4"></i> Tugas & Agenda
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="submissions">
              <i data-lucide="upload-cloud" class="w-4 h-4"></i> Kirim Tugas Siswa
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="voting">
              <i data-lucide="message-square" class="w-4 h-4"></i> Voting Kelas
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="organisasi">
              <i data-lucide="award" class="w-4 h-4"></i> Organisasi
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="galeri">
              <i data-lucide="image" class="w-4 h-4"></i> Galeri & Berkas
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="meetings">
              <i data-lucide="file-text" class="w-4 h-4"></i> Logistik Rapat
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="contacts">
              <i data-lucide="phone-call" class="w-4 h-4"></i> Kontak & Siaran
            </button>
            <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="profile">
              <i data-lucide="settings-icon" class="w-4 h-4"></i> Profil & Setelan
            </button>
            ${isSAdmin ? `
              <button class="nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 border-l-transparent text-rose-400 hover:bg-sky-500/10 hover:text-sky-400 transition-all" data-page="logs">
                <i data-lucide="shield-alert" class="w-4 h-4"></i> Audit Log
              </button>
            ` : ""}
          </nav>
        </div>

        <!-- Quick Profile Logout Footer -->
        <div class="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <img id="sidebarUserPhoto" src="${activeUserSession.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop'}" class="w-8.5 h-8.5 rounded-xl object-cover border border-slate-800">
            <div class="overflow-hidden">
              <span id="sidebarUserName" class="text-xs font-bold text-white block truncate leading-none">${activeUserSession.name}</span>
              <span id="sidebarUserJabatan" class="text-[9px] text-slate-500 block mt-0.5 truncate uppercase font-mono">${activeUserSession.jabatan}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button id="themeToggleBtn" class="p-2 bg-slate-900 border border-slate-850 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-xl transition-colors" title="Ubah Tema">
              <i data-lucide="sun" class="w-4 h-4 light-icon block"></i>
              <i data-lucide="moon" class="w-4 h-4 dark-icon hidden"></i>
            </button>
            <button id="logoutBtn" class="p-2 bg-slate-900 border border-slate-850 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition-colors" title="Keluar">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </aside>

      <!-- Content Container -->
      <main class="flex-1 p-6 md:p-8 relative min-h-screen" id="pageContent">
        <!-- Render page dynamically -->
      </main>
    </div>
  `;

  renderIcons();
  applyTheme();

  // Setup real-time notifications listener
  if (globalUnsubscribeNotifications) {
    globalUnsubscribeNotifications();
    globalUnsubscribeNotifications = null;
  }

  let isInitialLoad = true;
  const notificationsQuery = query(collection(db, "notifications"), orderBy("date", "desc"), limit(1));
  globalUnsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const notif = change.doc.data();
        toast.info(`📢 ${notif.title || 'Pengumuman'}\n${notif.content || ''}`);
        sendLocalSystemNotification(notif.title || "Pengumuman Kelas 📢", notif.content || "");
      }
    });
  });

  // Setup dynamic page routing listener
  const navItems = document.querySelectorAll(".nav-item");
  const mobileBurgerBtn = document.getElementById("mobileBurgerBtn") as HTMLButtonElement;
  const sidebarPanel = document.getElementById("sidebarPanel") as HTMLElement;

  function routeToPage(page: string) {
    // Clean up active real-time diskusichat listener to prevent lag, active read cost and memory leak
    if (page !== "diskusi") {
      cleanupDiskusiListener();
    }
    currentActivePage = page;
    navItems.forEach((btn: any) => {
      const isSelected = btn.dataset.page === page;
      btn.className = `nav-item w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium border-l-3 transition-all ${
        isSelected 
          ? "bg-sky-500/10 text-sky-400 border-l-sky-400" 
          : "text-slate-400 border-l-transparent hover:bg-sky-500/10 hover:text-sky-400"
      }`;
    });

    const pageContent = document.getElementById("pageContent") as HTMLElement;
    
    // Inject respective view
    switch (page) {
      case "dashboard":
        renderDashboard(pageContent, activeUserSession);
        break;
      case "anggota":
        renderAnggota(pageContent, activeUserSession);
        break;
      case "jadwal":
        renderJadwal(pageContent, activeUserSession);
        break;
      case "kas":
        renderKas(pageContent, activeUserSession);
        break;
      case "diskusi":
        renderDiskusi(pageContent, activeUserSession);
        break;
      case "saluran":
        renderSaluran(pageContent, activeUserSession);
        break;
      case "learning-center":
        renderLearningCenter(pageContent, activeUserSession);
        break;
      case "latihan":
        renderLatihan(pageContent, activeUserSession);
        break;
      case "tkj-hub":
        renderTKJHub(pageContent, activeUserSession);
        break;
      case "mini-games":
        renderMiniGames(pageContent, activeUserSession);
        break;
      case "link-belajar":
        renderLinkBelajar(pageContent, activeUserSession);
        break;
      case "tugas":
        renderTugas(pageContent, activeUserSession);
        break;
      case "submissions":
        renderSubmissions(pageContent, activeUserSession);
        break;
      case "voting":
        renderVoting(pageContent, activeUserSession);
        break;
      case "organisasi":
        renderOrganisasi(pageContent, activeUserSession);
        break;
      case "galeri":
        renderGaleri(pageContent, activeUserSession);
        break;
      case "meetings":
        renderMeetings(pageContent, activeUserSession);
        break;
      case "contacts":
        renderContacts(pageContent, activeUserSession);
        break;
      case "profile":
        renderProfile(pageContent, activeUserSession);
        break;
      case "logs":
        if (isSAdmin) renderLogs(pageContent, activeUserSession);
        break;
    }

    // Auto close sidebar on mobile navigation
    if (window.innerWidth < 768) {
      sidebarPanel.classList.add("hidden");
    }
  }

  // Attach nav clicks
  navItems.forEach((btn: any) => {
    btn.addEventListener("click", () => {
      routeToPage(btn.dataset.page);
    });
  });

  // Mobile menu toggle
  if (mobileBurgerBtn) {
    mobileBurgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebarPanel.classList.toggle("hidden");
    });
  }

  // Close mobile sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (window.innerWidth < 768) {
      const target = e.target as HTMLElement;
      if (!sidebarPanel.contains(target) && target !== mobileBurgerBtn && !mobileBurgerBtn.contains(target)) {
        sidebarPanel.classList.add("hidden");
      }
    }
  });

  // Theme Toggle listeners
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    toggleTheme();
    routeToPage(currentActivePage);
  });
  document.getElementById("mobileThemeToggleBtn")?.addEventListener("click", () => {
    toggleTheme();
    routeToPage(currentActivePage);
  });

  // Logout listener
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      if (globalUnsubscribeNotifications) {
        globalUnsubscribeNotifications();
        globalUnsubscribeNotifications = null;
      }
      await logoutUser();
      toast.success("Berhasil keluar dari portal.");
    } catch (e: any) {
      toast.error(e.message);
    }
  });

  // Initialize with dashboard page
  routeToPage(currentActivePage);
}

// Kickstart the application
initializeApplet();
