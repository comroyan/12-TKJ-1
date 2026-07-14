import { 
  getStudentUsers, 
  createStudentUser, 
  updateStudentUser, 
  deleteStudentUser 
} from "../firebase/db";
import { adminCreateStudentAuthAndProfile } from "../firebase/auth";
import { renderIcons, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderAnggota(container: HTMLElement, userSession: any) {
  // Initial loading
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat anggota kelas...</span>
    </div>
  `;

  async function loadAndRender() {
    const students = await getStudentUsers();
    const isSAdmin = userSession.role === "Super Admin";

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="users" class="text-cyan-400 w-7 h-7"></i> Anggota Kelas XII TKJ 1
            </h1>
            <p class="text-slate-400 text-sm mt-1">Daftar siswa resmi, peranan, dan penempatan PKL.</p>
          </div>
          ${isSAdmin ? `
            <button id="addStudentBtn" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/10 transition-all duration-300">
              <i data-lucide="plus" class="w-4 h-4"></i> Tambah Siswa Baru
            </button>
          ` : ""}
        </div>

        <!-- Filters & Search -->
        <div class="p-4 glass rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="text" id="searchInput" placeholder="Cari nama, absen, tempat PKL..." class="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-colors">
          </div>
          <div>
            <select id="roleFilter" class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 text-sm outline-none transition-colors">
              <option value="">Semua Peranan (Role)</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Wakil">Wakil</option>
              <option value="Sekretaris">Sekretaris</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Anggota">Anggota</option>
            </select>
          </div>
          <div>
            <select id="statusFilter" class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-100 text-sm outline-none transition-colors">
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-aktif</option>
            </select>
          </div>
        </div>

        <!-- Members Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="membersGrid">
          <!-- Member cards will load here -->
        </div>
      </div>
    `;

    renderIcons();

    const membersGrid = document.getElementById("membersGrid") as HTMLDivElement;
    const searchInput = document.getElementById("searchInput") as HTMLInputElement;
    const roleFilter = document.getElementById("roleFilter") as HTMLSelectElement;
    const statusFilter = document.getElementById("statusFilter") as HTMLSelectElement;

    function renderCards(filteredStudents: any[]) {
      if (filteredStudents.length === 0) {
        membersGrid.innerHTML = `
          <div class="col-span-full py-12 text-center">
            <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="users" class="w-8 h-8"></i></div>
            <p class="text-slate-400">Siswa tidak ditemukan.</p>
          </div>
        `;
        renderIcons();
        return;
      }

      membersGrid.innerHTML = filteredStudents.map((student: any) => {
        const isSelf = student.id === userSession.uid;
        const roleColors: any = {
          "Super Admin": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
          "Wakil": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          "Sekretaris": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
          "Bendahara": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          "Anggota": "bg-slate-500/10 text-slate-400 border border-slate-500/20"
        };

        return `
          <div class="glass rounded-3xl p-6 relative overflow-hidden group glass-card-hover border-t-4 ${student.role === 'Super Admin' ? 'border-t-rose-500' : 'border-t-cyan-500/50'}">
            <span class="absolute top-4 right-4 text-xs font-mono font-bold px-2 py-1 bg-slate-950/80 border border-slate-800 text-slate-400 rounded-xl">
              Absen ${student.absen}
            </span>
            
            <div class="flex items-start gap-4">
              <img src="${student.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}" alt="${student.name}" class="w-16 h-16 rounded-2xl object-cover border border-slate-800 shadow-md">
              <div class="space-y-1">
                <h3 class="text-base font-bold text-white leading-snug group-hover:text-cyan-400 transition-colors">${student.name}</h3>
                <span class="inline-block text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-lg ${roleColors[student.role] || roleColors['Anggota']}">
                  ${student.jabatan}
                </span>
                <span class="block text-xs text-slate-500">UID: ${student.id.substring(0,6)}...</span>
              </div>
            </div>

            <p class="text-xs text-slate-400 mt-4 italic line-clamp-2 leading-relaxed">"${student.bio || 'Tidak ada bio'}"</p>

            <div class="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-cyan-500"></i> 
                <span>PKL: <strong class="text-slate-200">${student.tempatPkl || "-"}</strong></span>
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
                  <button class="editBtn p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-colors" data-uid="${student.id}" title="Edit Profil">
                    <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                  </button>
                ` : ""}
                ${isSAdmin && !isSelf ? `
                  <button class="deleteBtn p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-colors" data-uid="${student.id}" data-name="${student.name}" title="Hapus Akun">
                    <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                  </button>
                ` : ""}
              </div>
            </div>
          </div>
        `;
      }).join("");

      renderIcons();

      // Attach click listeners
      document.querySelectorAll(".editBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => handleEditStudent(btn.dataset.uid, students));
      });
      document.querySelectorAll(".deleteBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => handleDeleteStudent(btn.dataset.uid, btn.dataset.name));
      });
    }

    // Filter Logic
    function applyFilter() {
      const q = searchInput.value.toLowerCase();
      const role = roleFilter.value;
      const status = statusFilter.value;

      const filtered = students.filter((s: any) => {
        const matchesQuery = s.name.toLowerCase().includes(q) || 
                             (s.tempatPkl && s.tempatPkl.toLowerCase().includes(q)) || 
                             String(s.absen).includes(q);
        const matchesRole = role ? s.role === role : true;
        const matchesStatus = status ? (s.status || "aktif") === status : true;

        return matchesQuery && matchesRole && matchesStatus;
      });

      renderCards(filtered);
    }

    searchInput.addEventListener("input", applyFilter);
    roleFilter.addEventListener("change", applyFilter);
    statusFilter.addEventListener("change", applyFilter);

    // Initial render
    applyFilter();

    // Trigger Add Student Form Modal (Super Admin only)
    if (isSAdmin) {
      const addStudentBtn = document.getElementById("addStudentBtn") as HTMLButtonElement;
      addStudentBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Siswa Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
                <input type="text" id="mName" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor Absen</label>
                  <input type="number" id="mAbsen" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Peranan Aplikasi</label>
                  <select id="mRole" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                    <option value="Anggota">Anggota</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Wakil">Wakil</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Email / Username Login</label>
                <input type="text" id="mEmail" placeholder="siswa atau siswa@classhub.local" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Password Default</label>
                  <input type="text" id="mPassword" value="Siswa@TKJ1_2026" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Jabatan Struktur</label>
                  <input type="text" id="mJabatan" value="Siswa" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Siswa",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          focusConfirm: false,
          preConfirm: () => {
            const name = (document.getElementById("mName") as HTMLInputElement).value.trim();
            const absen = (document.getElementById("mAbsen") as HTMLInputElement).value.trim();
            const email = (document.getElementById("mEmail") as HTMLInputElement).value.trim();
            const password = (document.getElementById("mPassword") as HTMLInputElement).value.trim();
            const role = (document.getElementById("mRole") as HTMLSelectElement).value;
            const jabatan = (document.getElementById("mJabatan") as HTMLInputElement).value.trim();

            if (!name || !absen || !email || !password) {
              Swal.showValidationMessage("Harap isi semua kolom wajib!");
              return false;
            }
            return { name, absen, email, password, role, jabatan };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Membuat Akun Auth Siswa...",
              html: "Harap tunggu, proses enkripsi aman sedang dijalankan.",
              allowOutsideClick: false,
              background: "#0f172a",
              color: "#f8fafc",
              didOpen: () => {
                Swal.showLoading();
              }
            });

            try {
              await adminCreateStudentAuthAndProfile(result.value);
              Swal.close();
              toast.success("Siswa baru berhasil didaftarkan!");
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
  async function handleEditStudent(uid: string, studentList: any[]) {
    const student = studentList.find(s => s.id === uid);
    if (!student) return;

    const isSAdmin = userSession.role === "Super Admin";

    Swal.fire({
      title: `Edit Profil: ${student.name}`,
      background: "#0f172a",
      color: "#f8fafc",
      html: `
        <div class="space-y-4 text-left mt-4 font-sans max-h-[400px] overflow-y-auto pr-1">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap</label>
            <input type="text" id="eName" value="${student.name}" ${!isSAdmin ? "disabled" : ""} class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm disabled:opacity-50">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor Absen</label>
              <input type="number" id="eAbsen" value="${student.absen}" ${!isSAdmin ? "disabled" : ""} class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm disabled:opacity-50">
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Jabatan Struktur</label>
              <input type="text" id="eJabatan" value="${student.jabatan || 'Siswa'}" ${!isSAdmin ? "disabled" : ""} class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm disabled:opacity-50">
            </div>
          </div>
          ${isSAdmin ? `
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Peranan Aplikasi (Role)</label>
                <select id="eRole" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  <option value="Anggota" ${student.role === 'Anggota' ? 'selected' : ''}>Anggota</option>
                  <option value="Bendahara" ${student.role === 'Bendahara' ? 'selected' : ''}>Bendahara</option>
                  <option value="Sekretaris" ${student.role === 'Sekretaris' ? 'selected' : ''}>Sekretaris</option>
                  <option value="Wakil" ${student.role === 'Wakil' ? 'selected' : ''}>Wakil</option>
                  <option value="Super Admin" ${student.role === 'Super Admin' ? 'selected' : ''}>Super Admin</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Status Keaktifan</label>
                <select id="eStatus" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  <option value="aktif" ${student.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                  <option value="nonaktif" ${student.status === 'nonaktif' ? 'selected' : ''}>Non-aktif</option>
                </select>
              </div>
            </div>
          ` : ""}
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Tempat PKL</label>
            <input type="text" id="ePkl" value="${student.tempatPkl || ''}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">No. WhatsApp</label>
              <input type="text" id="eHp" value="${student.hp || ''}" placeholder="08..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Username Instagram</label>
              <input type="text" id="eInsta" value="${student.instagram || ''}" placeholder="username" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Tautan Foto Profil</label>
            <input type="text" id="eFoto" value="${student.foto || ''}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Bio / Slogan</label>
            <textarea id="eBio" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm h-16 resize-none">${student.bio || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#334155",
      preConfirm: () => {
        const updateData: any = {
          tempatPkl: (document.getElementById("ePkl") as HTMLInputElement).value.trim(),
          hp: (document.getElementById("eHp") as HTMLInputElement).value.trim(),
          instagram: (document.getElementById("eInsta") as HTMLInputElement).value.trim(),
          foto: (document.getElementById("eFoto") as HTMLInputElement).value.trim(),
          bio: (document.getElementById("eBio") as HTMLTextAreaElement).value.trim()
        };

        if (isSAdmin) {
          updateData.name = (document.getElementById("eName") as HTMLInputElement).value.trim();
          updateData.absen = parseInt((document.getElementById("eAbsen") as HTMLInputElement).value);
          updateData.jabatan = (document.getElementById("eJabatan") as HTMLInputElement).value.trim();
          updateData.role = (document.getElementById("eRole") as HTMLSelectElement).value;
          updateData.status = (document.getElementById("eStatus") as HTMLSelectElement).value;

          if (!updateData.name || isNaN(updateData.absen)) {
            Swal.showValidationMessage("Nama dan Absen harus valid!");
            return false;
          }
        }

        return updateData;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await updateStudentUser(uid, result.value);
          toast.success("Profil berhasil diperbarui!");
          loadAndRender();
        } catch (err: any) {
          Swal.fire("Gagal Memperbarui", err.message, "error");
        }
      }
    });
  }

  // Delete student handler
  async function handleDeleteStudent(uid: string, name: string) {
    const confirm = await confirmDialog("Hapus Siswa", `Apakah Anda yakin ingin menghapus siswa ${name}? Akun login dan data miliknya akan dihapus secara permanen.`);
    if (confirm) {
      try {
        await deleteStudentUser(uid, name);
        toast.success("Akun siswa berhasil dihapus.");
        loadAndRender();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    }
  }

  // Run initial loading and rendering
  loadAndRender();
}
