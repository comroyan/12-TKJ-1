import { 
  getStudentUsers, 
  createStudentUser, 
  updateStudentUser, 
  deleteStudentUser,
  createNotification
} from "../firebase/db";
import { adminCreateStudentAuthAndProfile } from "../firebase/auth";
import { renderIcons, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

function isTeacher(user: any) {
  const roleLower = (user.role || "").toLowerCase();
  const jabLower = (user.jabatan || "").toLowerCase();
  return roleLower === "wali kelas" || 
         roleLower === "guru" || 
         jabLower.includes("wali") || 
         jabLower.includes("guru") || 
         !user.absen || 
         user.absen === 0;
}

export async function renderGuru(container: HTMLElement, userSession: any) {
  // Initial loading
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat data guru...</span>
    </div>
  `;

  async function loadAndRender() {
    const allUsers = await getStudentUsers();
    const teachers = allUsers.filter(s => isTeacher(s));
    const isSAdmin = userSession.role === "Super Admin";

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="shield-check" class="text-emerald-400 w-7 h-7"></i> Wali Kelas & Staf Pengajar
            </h1>
            <p class="text-slate-400 text-sm mt-1">Daftar guru pendidik, wali kelas resmi, dan admin pengelola kelas XII TKJ 1.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            ${isSAdmin ? `
              <button id="addTeacherBtn" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all duration-300">
                <i data-lucide="plus" class="w-4 h-4"></i> Tambah Guru / Wali Kelas
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Filters & Search -->
        <div class="p-4 glass rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="relative col-span-2">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="text" id="teacherSearchInput" placeholder="Cari nama guru, mata pelajaran, jabatan..." class="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-colors">
          </div>
          <div>
            <select id="teacherRoleFilter" class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-emerald-500 text-slate-100 text-sm outline-none transition-colors">
              <option value="">Semua Peranan</option>
              <option value="Wali Kelas">Wali Kelas</option>
              <option value="Guru">Guru</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
        </div>

        <!-- Teachers Grid -->
        <div class="space-y-8" id="teachersGrid">
          <!-- Teacher cards will load here -->
        </div>
      </div>
    `;

    renderIcons();

    const teachersGrid = document.getElementById("teachersGrid") as HTMLDivElement;
    const searchInput = document.getElementById("teacherSearchInput") as HTMLInputElement;
    const roleFilter = document.getElementById("teacherRoleFilter") as HTMLSelectElement;

    function renderCardHtml(student: any) {
      const isSelf = student.id === userSession.uid;
      const roleColors: any = {
        "Super Admin": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
        "Wali Kelas": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        "Guru": "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
      };

      const topBorderClass = student.role === 'Super Admin' 
          ? 'border-t-rose-500' 
          : 'border-t-emerald-500';

      const badgeLabel = `<span class="absolute top-4 right-4 text-[10px] font-mono font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-1">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Pendidik
           </span>`;

      return `
        <div class="glass rounded-3xl p-6 relative overflow-hidden group glass-card-hover border-t-4 ${topBorderClass}">
          ${badgeLabel}
          
          <div class="flex items-start gap-4">
            <img src="${student.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}" alt="${student.name}" class="w-16 h-16 rounded-2xl object-cover border border-slate-800 shadow-md">
            <div class="space-y-1">
              <h3 class="text-base font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors">${student.name}</h3>
              <span class="inline-block text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-lg ${roleColors[student.role] || roleColors['Guru']}">
                ${student.jabatan || "Staf Pengajar"}
              </span>
              <span class="block text-xs text-slate-500">UID: ${student.id.substring(0,6)}...</span>
            </div>
          </div>

          <p class="text-xs text-slate-400 mt-4 italic line-clamp-2 leading-relaxed">"${student.bio || 'Tidak ada bio'}"</p>

          <div class="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <i data-lucide="book-open" class="w-3.5 h-3.5 text-emerald-400"></i> 
              <span>Tugas Utama: <strong class="text-emerald-400">${student.jabatan || "Wali Kelas / Guru"}</strong></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <i data-lucide="bell" class="w-3.5 h-3.5 text-yellow-500"></i> 
              <span>Status: <span class="capitalize font-semibold ${student.status === 'aktif' ? 'text-emerald-400' : 'text-rose-400'}">${student.status || 'aktif'}</span></span>
            </div>
          </div>

          <!-- Social Links & Action Drawer -->
          <div class="mt-4 flex items-center justify-between gap-2 pt-2">
            <div class="flex items-center gap-2">
              ${student.hp ? `
                <a href="https://wa.me/${student.hp.replace(/\D/g, '')}" target="_blank" class="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors" title="WhatsApp">
                  <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
                </a>
              ` : ""}
              ${student.instagram ? `
                <a href="https://instagram.com/${student.instagram}" target="_blank" class="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-colors" title="Instagram">
                  <i data-lucide="image" class="w-3.5 h-3.5"></i>
                </a>
              ` : ""}
            </div>

            <!-- Admin controls -->
            <div class="flex items-center gap-1">
              ${isSAdmin || isSelf ? `
                <button class="editTeacherBtn p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-colors" data-uid="${student.id}" title="Edit Profil">
                  <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                </button>
              ` : ""}
              ${isSAdmin && !isSelf ? `
                <button class="deleteTeacherBtn p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-colors" data-uid="${student.id}" data-name="${student.name}" title="Hapus Akun">
                  <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }

    function renderCards(filteredTeachers: any[]) {
      if (filteredTeachers.length === 0) {
        teachersGrid.innerHTML = `
          <div class="py-12 text-center">
            <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="users" class="w-8 h-8"></i></div>
            <p class="text-slate-400">Guru/Pendidik tidak ditemukan.</p>
          </div>
        `;
        renderIcons();
        return;
      }

      teachersGrid.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filteredTeachers.map(t => renderCardHtml(t)).join("")}
        </div>
      `;

      renderIcons();

      // Attach click listeners
      document.querySelectorAll(".editTeacherBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => handleEditTeacher(btn.dataset.uid, teachers));
      });
      document.querySelectorAll(".deleteTeacherBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => handleDeleteTeacher(btn.dataset.uid, btn.dataset.name));
      });
    }

    // Filter Logic
    function applyFilter() {
      const q = searchInput.value.toLowerCase();
      const role = roleFilter.value;

      const filtered = teachers.filter((s: any) => {
        const matchesQuery = s.name.toLowerCase().includes(q) || 
                             (s.jabatan && s.jabatan.toLowerCase().includes(q));
        const matchesRole = role ? s.role === role : true;

        return matchesQuery && matchesRole;
      });

      renderCards(filtered);
    }

    searchInput.addEventListener("input", applyFilter);
    roleFilter.addEventListener("change", applyFilter);

    applyFilter();

    // Trigger Add Teacher Form Modal
    if (isSAdmin) {
      const addTeacherBtn = document.getElementById("addTeacherBtn") as HTMLButtonElement;
      addTeacherBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Guru / Staf Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
                <input type="text" id="tName" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Peranan Aplikasi</label>
                  <select id="tRole" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-white outline-none text-sm">
                    <option value="Guru">Guru</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Jabatan Struktur</label>
                  <input type="text" id="tJabatan" value="Guru Mata Pelajaran" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-white outline-none text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Email / Username Login</label>
                <input type="text" id="tEmail" placeholder="nama.guru@classhub.local" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Password Default</label>
                <input type="text" id="tPassword" value="Guru@TKJ1_2026" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Guru",
          cancelButtonText: "Batal",
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#334155",
          focusConfirm: false,
          didOpen: () => {
            const tRole = document.getElementById("tRole") as HTMLSelectElement;
            const tJabatan = document.getElementById("tJabatan") as HTMLInputElement;
            const tPassword = document.getElementById("tPassword") as HTMLInputElement;

            tRole.addEventListener("change", () => {
              const val = tRole.value;
              if (val === "Guru") {
                tJabatan.value = "Guru Mata Pelajaran";
                tPassword.value = "Guru@TKJ1_2026";
              } else if (val === "Wali Kelas") {
                tJabatan.value = "Wali Kelas XII TKJ 1";
                tPassword.value = "WaliKelas@TKJ1_2026";
              } else {
                tJabatan.value = "Super Admin";
                tPassword.value = "Admin@TKJ1_2026";
              }
            });
          },
          preConfirm: () => {
            const name = (document.getElementById("tName") as HTMLInputElement).value.trim();
            const role = (document.getElementById("tRole") as HTMLSelectElement).value;
            const jabatan = (document.getElementById("tJabatan") as HTMLInputElement).value.trim();
            const emailInput = (document.getElementById("tEmail") as HTMLInputElement).value.trim();
            const password = (document.getElementById("tPassword") as HTMLInputElement).value.trim();

            if (!name || !emailInput || !password) {
              Swal.showValidationMessage("Harap isi semua kolom wajib!");
              return false;
            }

            const email = emailInput.includes("@") ? emailInput : `${emailInput}@classhub.local`;
            return { name, absen: "0", email, password, role, jabatan };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Memproses...",
              background: "#0f172a",
              color: "#f8fafc",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });

            try {
              const { name } = result.value;
              await adminCreateStudentAuthAndProfile(result.value);
              toast.success(`Berhasil mendaftarkan guru: ${name}`);
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal Mendaftar", err.message, "error");
            }
          }
        });
      });
    }
  }

  // Edit profile handler
  async function handleEditTeacher(uid: string, teacherList: any[]) {
    const teacher = teacherList.find(s => s.id === uid);
    if (!teacher) return;

    const isSAdmin = userSession.role === "Super Admin";

    Swal.fire({
      title: `Edit Profil Guru: ${teacher.name}`,
      background: "#0f172a",
      color: "#f8fafc",
      html: `
        <div class="space-y-4 text-left mt-4 font-sans max-h-[400px] overflow-y-auto pr-1">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
            <input type="text" id="eName" value="${teacher.name}" ${!isSAdmin ? "disabled" : ""} class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm disabled:opacity-50">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Jabatan / Mengajar</label>
            <input type="text" id="eJabatan" value="${teacher.jabatan || ''}" ${!isSAdmin ? "disabled" : ""} class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm disabled:opacity-50">
          </div>
          ${isSAdmin ? `
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Peranan Aplikasi (Role)</label>
                <select id="eRole" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  <option value="Guru" ${teacher.role === 'Guru' ? 'selected' : ''}>Guru</option>
                  <option value="Wali Kelas" ${teacher.role === 'Wali Kelas' ? 'selected' : ''}>Wali Kelas</option>
                  <option value="Super Admin" ${teacher.role === 'Super Admin' ? 'selected' : ''}>Super Admin</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Status Keaktifan</label>
                <select id="eStatus" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  <option value="aktif" ${teacher.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                  <option value="nonaktif" ${teacher.status === 'nonaktif' ? 'selected' : ''}>Non-aktif</option>
                </select>
              </div>
            </div>
          ` : ""}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">No. WhatsApp</label>
              <input type="text" id="eHp" value="${teacher.hp || ''}" placeholder="08..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Username Instagram</label>
              <input type="text" id="eInsta" value="${teacher.instagram || ''}" placeholder="username" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Tautan Foto Profil</label>
            <input type="text" id="eFoto" value="${teacher.foto || ''}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Bio / Slogan</label>
            <textarea id="eBio" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm h-16 resize-none">${teacher.bio || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#334155",
      preConfirm: () => {
        const updateData: any = {
          hp: (document.getElementById("eHp") as HTMLInputElement).value.trim(),
          instagram: (document.getElementById("eInsta") as HTMLInputElement).value.trim(),
          foto: (document.getElementById("eFoto") as HTMLInputElement).value.trim(),
          bio: (document.getElementById("eBio") as HTMLTextAreaElement).value.trim()
        };

        if (isSAdmin) {
          updateData.name = (document.getElementById("eName") as HTMLInputElement).value.trim();
          updateData.jabatan = (document.getElementById("eJabatan") as HTMLInputElement).value.trim();
          updateData.role = (document.getElementById("eRole") as HTMLSelectElement).value;
          updateData.status = (document.getElementById("eStatus") as HTMLSelectElement).value;
          updateData.absen = 0;

          if (!updateData.name) {
            Swal.showValidationMessage("Nama harus valid!");
            return false;
          }
        }

        return updateData;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await updateStudentUser(uid, result.value);
          toast.success("Profil guru berhasil diperbarui!");
          loadAndRender();
        } catch (err: any) {
          Swal.fire("Gagal Memperbarui", err.message, "error");
        }
      }
    });
  }

  // Delete teacher handler
  async function handleDeleteTeacher(uid: string, name: string) {
    const confirm = await confirmDialog("Hapus Akun Guru", `Apakah Anda yakin ingin menghapus akun guru ${name}? Akun login dan data miliknya akan dihapus secara permanen.`);
    if (confirm) {
      try {
        await deleteStudentUser(uid, name);
        toast.success("Akun guru berhasil dihapus.");
        loadAndRender();
      } catch (err: any) {
        Swal.fire("Gagal Menghapus", err.message, "error");
      }
    }
  }

  await loadAndRender();
}
