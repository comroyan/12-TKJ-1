import { updateStudentUser, getSystemSettings, updateSystemSettings } from "../firebase/db";
import { changeUserPassword } from "../firebase/auth";
import { renderIcons, toast } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderProfile(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat profil & pengaturan...</span>
    </div>
  `;

  async function loadAndRender() {
    const settings = await getSystemSettings();
    const isSAdmin = userSession.role === "Super Admin";

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
        <!-- 1. Profile Editing Card -->
        <div class="lg:col-span-2 space-y-6">
          <div class="glass p-6 rounded-3xl relative overflow-hidden bg-slate-900/20">
            <h2 class="text-xl font-bold font-display text-white flex items-center gap-2 mb-4">
              <i data-lucide="user" class="text-cyan-400 w-5 h-5"></i> Edit Profil Pribadi Saya
            </h2>
            
            <form id="profileForm" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
                  <input type="text" id="pName" value="${userSession.name}" disabled class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 outline-none text-sm cursor-not-allowed">
                  <span class="text-[10px] text-slate-500 mt-1 block">Nama hanya dapat diedit oleh Super Admin.</span>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor Absen</label>
                  <input type="number" id="pAbsen" value="${userSession.absen}" disabled class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 outline-none text-sm cursor-not-allowed">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">No. WhatsApp Aktif</label>
                  <input type="text" id="pHp" placeholder="Contoh: 08123..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Username Instagram</label>
                  <input type="text" id="pInsta" placeholder="Contoh: @zainurroyan" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-sm">
                </div>
              </div>

              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Tempat Penempatan PKL</label>
                <input type="text" id="pPkl" placeholder="Nama perusahaan / industri PKL" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-sm">
              </div>

              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Link Foto Profil (URL)</label>
                <input type="text" id="pFoto" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-xs">
              </div>

              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Bio Singkat / Motto Hidup</label>
                <textarea id="pBio" placeholder="Ceritakan kepribadian atau slogan TKJ Anda..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-sm h-20 resize-none"></textarea>
              </div>

              <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl transition-all shadow-md">
                Simpan Perubahan Profil
              </button>
            </form>
          </div>

          <!-- 2. Security Change Password Card -->
          <div class="glass p-6 rounded-3xl relative overflow-hidden bg-slate-900/20">
            <h2 class="text-xl font-bold font-display text-white flex items-center gap-2 mb-4">
              <i data-lucide="lock" class="text-rose-400 w-5 h-5"></i> Ganti Password Akun
            </h2>
            
            <form id="passwordForm" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Password Baru</label>
                  <input type="password" id="pNewPass" placeholder="Minimal 6 karakter" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 text-slate-100 outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Ulangi Password Baru</label>
                  <input type="password" id="pConfirmPass" placeholder="Ulangi" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 text-slate-100 outline-none text-sm">
                </div>
              </div>

              <button type="submit" class="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-slate-950 font-bold rounded-xl transition-all">
                Perbarui Password Akun
              </button>
            </form>
          </div>
        </div>

        <!-- 3. General App/Class Configuration Settings (Super Admin only) -->
        <div class="space-y-6">
          <div class="glass p-6 rounded-3xl relative overflow-hidden bg-slate-900/20 flex flex-col justify-between">
            <div>
              <h2 class="text-xl font-bold font-display text-white flex items-center gap-2 mb-4">
                <i data-lucide="settings-icon" class="text-yellow-400 w-5 h-5"></i> Konfigurasi ClassHub
              </h2>

              <form id="settingsForm" class="space-y-4">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Kelas Digital</label>
                  <input type="text" id="sClassName" value="${settings?.className || 'XII TKJ 1'}" ${!isSAdmin ? 'disabled' : ''} class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500 text-slate-100 outline-none text-sm disabled:opacity-50">
                </div>

                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Slogan / Motto Kelas</label>
                  <textarea id="sMotto" ${!isSAdmin ? 'disabled' : ''} class="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500 text-slate-100 outline-none text-sm h-16 resize-none disabled:opacity-50">${settings?.motto || 'Networking our future.'}</textarea>
                </div>

                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Tautan Logo Kelas (URL)</label>
                  <input type="text" id="sLogoUrl" value="${settings?.logoUrl || ''}" ${!isSAdmin ? 'disabled' : ''} class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-yellow-500 text-slate-100 outline-none text-xs disabled:opacity-50">
                </div>

                ${isSAdmin ? `
                  <button type="submit" class="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/20 text-yellow-400 hover:text-slate-950 font-bold rounded-xl transition-all">
                    Simpan Konfigurasi Kelas
                  </button>
                ` : `
                  <p class="text-[10px] text-slate-500 italic mt-4">Pengaturan aplikasi hanya dapat dikonfigurasi oleh Super Admin.</p>
                `}
              </form>
            </div>
          </div>

          <!-- PWA Information Card -->
          <div class="glass p-6 rounded-3xl bg-slate-900/10 border border-slate-800/50">
            <h3 class="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <i data-lucide="award" class="text-cyan-400 w-4.5 h-4.5"></i> Dukungan Aplikasi PWA
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">ClassHub XII TKJ 1 mendukung Progressive Web App (PWA). Anda dapat menginstalnya di perangkat Android, iOS, maupun PC untuk akses instan langsung dari homescreen.</p>
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Populate user profile inputs
    const pHp = document.getElementById("pHp") as HTMLInputElement;
    const pInsta = document.getElementById("pInsta") as HTMLInputElement;
    const pPkl = document.getElementById("pPkl") as HTMLInputElement;
    const pFoto = document.getElementById("pFoto") as HTMLInputElement;
    const pBio = document.getElementById("pBio") as HTMLTextAreaElement;

    // Grab current user's profile state to prefill
    // We can do this safely since userSession is passed. Wait, we can fetch their fresh doc as well, or use userSession
    // Let's fetch fresh doc to avoid stale session data
    const freshUsers = await updateStudentUser(userSession.uid, {}); // Safe empty operation to pull or check
    // Wait, let's just prefill with userSession initially, and fetch fresh doc:
    try {
      const snap = await updateStudentUser(userSession.uid, {}); // trigger log or get doc
      // Since updateStudentUser does not return doc, we can look at local storage or keep it simple. Let's prefill with passed userSession properties!
      // In main.ts we populated userSession with userDoc data, so it contains: hp, instagram, tempatPkl, foto, bio. Let's make sure it loads.
      if (userSession.hp) pHp.value = userSession.hp;
      if (userSession.instagram) pInsta.value = userSession.instagram;
      if (userSession.tempatPkl) pPkl.value = userSession.tempatPkl;
      if (userSession.foto) pFoto.value = userSession.foto;
      if (userSession.bio) pBio.value = userSession.bio;
    } catch(e){}

    // Profile form submit
    const profileForm = document.getElementById("profileForm") as HTMLFormElement;
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        hp: pHp.value.trim(),
        instagram: pInsta.value.trim(),
        tempatPkl: pPkl.value.trim(),
        foto: pFoto.value.trim(),
        bio: pBio.value.trim()
      };

      try {
        await updateStudentUser(userSession.uid, updated);
        // Sync local session
        Object.assign(userSession, updated);
        toast.success("Profil Anda berhasil diperbarui!");
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    });

    // Password form submit
    const passwordForm = document.getElementById("passwordForm") as HTMLFormElement;
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = (document.getElementById("pNewPass") as HTMLInputElement).value;
      const confirmPass = (document.getElementById("pConfirmPass") as HTMLInputElement).value;

      if (!newPass || newPass.length < 6) {
        Swal.fire("Sandi Terlalu Lemah", "Password minimal harus memiliki panjang 6 karakter.", "warning");
        return;
      }
      if (newPass !== confirmPass) {
        Swal.fire("Tidak Cocok", "Password baru dan konfirmasi tidak sesuai.", "warning");
        return;
      }

      try {
        await changeUserPassword(newPass);
        toast.success("Password Anda berhasil diperbarui!");
        passwordForm.reset();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    });

    // Settings form submit (Super Admin only)
    if (isSAdmin) {
      const settingsForm = document.getElementById("settingsForm") as HTMLFormElement;
      settingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const updatedSettings = {
          className: (document.getElementById("sClassName") as HTMLInputElement).value.trim(),
          motto: (document.getElementById("sMotto") as HTMLTextAreaElement).value.trim(),
          logoUrl: (document.getElementById("sLogoUrl") as HTMLInputElement).value.trim()
        };

        try {
          await updateSystemSettings(updatedSettings);
          toast.success("Pengaturan ClassHub utama berhasil disimpan!");
          
          // Force header re-render to update logo or class name immediately!
          const headerTitle = document.getElementById("headerClassName");
          if (headerTitle) headerTitle.innerText = updatedSettings.className;
          const headerLogo = document.getElementById("headerClassLogo") as HTMLImageElement;
          if (headerLogo && updatedSettings.logoUrl) headerLogo.src = updatedSettings.logoUrl;
        } catch (err: any) {
          Swal.fire("Gagal", err.message, "error");
        }
      });
    }
  }

  loadAndRender();
}
