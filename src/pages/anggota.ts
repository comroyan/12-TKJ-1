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
          <div class="flex flex-wrap items-center gap-3">
            <button id="groupMakerBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:text-cyan-400 text-slate-200 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/5">
              <i data-lucide="shuffle" class="w-4 h-4 text-cyan-400"></i> Buat Kelompok
            </button>
            ${isSAdmin ? `
              <button id="copyCredentialsBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-yellow-500 hover:text-yellow-400 text-slate-200 font-bold rounded-xl text-sm transition-all shadow-lg shadow-yellow-500/5" title="Salin semua akun login siswa">
                <i data-lucide="copy" class="w-4 h-4 text-yellow-500"></i> Salin Semua Akun
              </button>
              <button id="addStudentBtn" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/10 transition-all duration-300">
                <i data-lucide="plus" class="w-4 h-4"></i> Tambah Siswa Baru
              </button>
            ` : ""}
          </div>
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

      // Group Maker Click Listener
      const groupMakerBtn = document.getElementById("groupMakerBtn") as HTMLButtonElement;
      if (groupMakerBtn) {
        groupMakerBtn.addEventListener("click", () => {
          Swal.fire({
            title: "Pengaturan Acak Kelompok",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 text-left mt-4 font-sans max-h-[420px] overflow-y-auto pr-1">
                <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <span class="text-xs font-bold text-cyan-400 block">Metode Pembagian</span>
                  <select id="gmMethod" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
                    <option value="groupCount">Berdasarkan Jumlah Kelompok (Misal: dibagi jadi X kelompok)</option>
                    <option value="memberCount">Berdasarkan Anggota per Kelompok (Misal: X orang per kelompok)</option>
                  </select>
                </div>

                <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <span class="text-xs font-bold text-cyan-400 block">Nilai Pembagi (2-12)</span>
                  <select id="gmValue" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4" selected>4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                </div>

                <!-- Live Simulation Preview Panel -->
                <div id="gmSummaryPreview" class="p-3.5 bg-sky-950/25 border border-sky-500/20 rounded-xl space-y-1">
                  <!-- Will be filled dynamically by JavaScript -->
                </div>

                <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-cyan-400">Siswa yang Disertakan</span>
                    <button type="button" id="toggleAllStudents" class="text-[10px] text-cyan-400 hover:underline">Semua / Kosongkan</button>
                  </div>
                  <div class="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1 mt-1.5">
                    ${students.filter((s: any) => (s.status || "aktif") !== "nonaktif").map((s: any) => `
                      <label class="flex items-center gap-2 p-1.5 bg-slate-950/50 border border-slate-800/60 rounded-lg cursor-pointer hover:border-cyan-500/30 transition-all">
                        <input type="checkbox" name="gmStudentCheck" value="${s.id}" data-name="${s.name}" checked class="accent-cyan-500 rounded">
                        <span class="text-[10px] text-slate-300 line-clamp-1">Absen ${s.absen} - ${s.name}</span>
                      </label>
                    `).join("")}
                  </div>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "🎲 Acak Sekarang",
            cancelButtonText: "Batal",
            confirmButtonColor: "#06b6d4",
            cancelButtonColor: "#334155",
            didOpen: () => {
              const toggleBtn = document.getElementById("toggleAllStudents");
              if (toggleBtn) {
                toggleBtn.addEventListener("click", () => {
                  const checkboxes = document.querySelectorAll("input[name='gmStudentCheck']") as NodeListOf<HTMLInputElement>;
                  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
                  checkboxes.forEach((cb) => {
                    cb.checked = !allChecked;
                  });
                  toggleBtn.innerText = allChecked ? "Pilih Semua" : "Kosongkan Semua";
                  updateGmPreview();
                });
              }

              const updateGmPreview = () => {
                const previewEl = document.getElementById("gmSummaryPreview");
                if (!previewEl) return;

                const method = (document.getElementById("gmMethod") as HTMLSelectElement).value;
                const value = parseInt((document.getElementById("gmValue") as HTMLSelectElement).value) || 4;
                const checkedBoxes = document.querySelectorAll("input[name='gmStudentCheck']:checked") as NodeListOf<HTMLInputElement>;
                const N = checkedBoxes.length;

                if (N === 0) {
                  previewEl.innerHTML = `
                    <div class="flex items-center gap-2 text-rose-400 text-xs">
                      <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
                      <span>Harap pilih minimal 1 siswa di daftar bawah!</span>
                    </div>
                  `;
                  renderIcons();
                  return;
                }

                let numGroups = 1;
                if (method === "groupCount") {
                  numGroups = Math.min(value, N);
                } else {
                  numGroups = Math.max(1, Math.ceil(N / value));
                }

                const minSize = Math.floor(N / numGroups);
                const numMaxGroups = N % numGroups;
                const numMinGroups = numGroups - numMaxGroups;

                let rincian = "";
                if (numMaxGroups === 0) {
                  rincian = `Semua ${numGroups} kelompok masing-masing berisi ${minSize} anggota.`;
                } else {
                  rincian = `${numMaxGroups} kelompok berisi ${minSize + 1} anggota, dan ${numMinGroups} kelompok berisi ${minSize} anggota.`;
                }

                previewEl.innerHTML = `
                  <div class="space-y-1 text-[11px] font-sans">
                    <div class="font-bold text-cyan-300 flex items-center gap-1.5">
                      <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                      Simulasi Pembagian Kelompok
                    </div>
                    <p class="text-slate-300 leading-snug">
                      Akan membagi <span class="text-white font-bold">${N} siswa</span> menjadi <span class="text-white font-bold">${numGroups} kelompok</span>.
                    </p>
                    <p class="text-sky-300 font-mono text-[10px] leading-snug bg-sky-950/40 p-1.5 rounded border border-sky-500/10 mt-1">
                      💡 ${rincian}
                    </p>
                  </div>
                `;
                renderIcons();
              };

              // Attach update listeners
              const gmMethod = document.getElementById("gmMethod") as HTMLSelectElement;
              const gmValue = document.getElementById("gmValue") as HTMLSelectElement;
              if (gmMethod) gmMethod.addEventListener("change", updateGmPreview);
              if (gmValue) gmValue.addEventListener("change", updateGmPreview);
              
              const studentChecks = document.querySelectorAll("input[name='gmStudentCheck']");
              studentChecks.forEach((cb) => {
                cb.addEventListener("change", updateGmPreview);
              });

              // Initial trigger
              updateGmPreview();
            },
            preConfirm: () => {
              const method = (document.getElementById("gmMethod") as HTMLSelectElement).value;
              const value = parseInt((document.getElementById("gmValue") as HTMLSelectElement).value);
              const checkedBoxes = document.querySelectorAll("input[name='gmStudentCheck']:checked") as NodeListOf<HTMLInputElement>;
              const selectedStudents = Array.from(checkedBoxes).map((cb) => ({
                id: cb.value,
                name: cb.dataset.name || "Siswa"
              }));

              if (selectedStudents.length === 0) {
                Swal.showValidationMessage("Harap sertakan minimal 1 siswa!");
                return false;
              }

              return { method, value, selectedStudents };
            }
          }).then((result) => {
            if (result.isConfirmed) {
              const { method, value, selectedStudents } = result.value;
              
              // Fisher-Yates Shuffle
              const shuffled = [...selectedStudents];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }

              const numStudents = shuffled.length;
              let numGroups = 1;

              if (method === "groupCount") {
                numGroups = Math.min(value, numStudents);
              } else {
                numGroups = Math.max(1, Math.ceil(numStudents / value));
              }

              const groups: any[][] = Array.from({ length: numGroups }, () => []);
              shuffled.forEach((student, index) => {
                groups[index % numGroups].push(student);
              });

              // Construct rincian penjelasan kelompok
              const minSize = Math.floor(numStudents / numGroups);
              const numMaxGroups = numStudents % numGroups;
              const numMinGroups = numGroups - numMaxGroups;
              let rincianText = "";
              if (numMaxGroups === 0) {
                rincianText = `Semua ${numGroups} kelompok masing-masing berisi ${minSize} anggota.`;
              } else {
                rincianText = `${numMaxGroups} kelompok berisi ${minSize + 1} anggota, dan ${numMinGroups} kelompok berisi ${minSize} anggota.`;
              }

              let outputHtml = `<div class="space-y-4 text-left mt-2 max-h-[350px] overflow-y-auto pr-1 font-sans">`;
              outputHtml += `
                <div class="p-3 bg-cyan-950/30 border border-cyan-800/30 rounded-2xl space-y-1.5">
                  <span class="text-xs font-bold text-cyan-400 block uppercase tracking-wider">📋 Rincian Pembagian</span>
                  <p class="text-slate-300 text-xs">
                    Total <strong class="text-white">${numStudents} siswa</strong> dibagi menjadi <strong class="text-white">${numGroups} kelompok</strong>.
                  </p>
                  <p class="text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800">
                    💡 ${rincianText}
                  </p>
                </div>
              `;

              let outputText = `📌 HASIL PEMBAGIAN KELOMPOK XII TKJ 1\n`;
              outputText += `Dibuat secara acak otomatis pada: ${new Date().toLocaleString("id-ID")}\n`;
              outputText += `Ringkasan: ${numStudents} siswa dibagi menjadi ${numGroups} kelompok.\n`;
              outputText += `Rincian: ${rincianText}\n\n`;

              groups.forEach((group, idx) => {
                const groupNum = idx + 1;
                outputHtml += `
                  <div class="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl border-l-4 border-l-cyan-500 space-y-1.5">
                    <span class="text-xs font-bold text-cyan-400 block uppercase tracking-wider">Kelompok ${groupNum} (${group.length} Anggota)</span>
                    <div class="grid grid-cols-1 gap-1 text-[11px] text-slate-300">
                      ${group.map((s, i) => `<div>${i + 1}. ${s.name}</div>`).join("")}
                    </div>
                  </div>
                `;

                outputText += `• Kelompok ${groupNum} (${group.length} Anggota):\n`;
                group.forEach((s, i) => {
                  outputText += `  ${i + 1}. ${s.name}\n`;
                });
                outputText += `\n`;
              });
              outputHtml += `</div>`;

              Swal.fire({
                title: "Hasil Acak Kelompok",
                background: "#0f172a",
                color: "#f8fafc",
                html: outputHtml,
                showCancelButton: true,
                confirmButtonText: "📋 Salin Hasil",
                cancelButtonText: "Tutup",
                confirmButtonColor: "#06b6d4",
                cancelButtonColor: "#334155",
                showDenyButton: true,
                denyButtonText: "📢 Siarkan Pengumuman",
                denyButtonColor: "#f59e0b",
              }).then(async (res) => {
                if (res.isConfirmed) {
                  navigator.clipboard.writeText(outputText);
                  toast.success("Hasil kelompok berhasil disalin ke clipboard!");
                } else if (res.isDenied) {
                  try {
                    const announceTitle = "Pembagian Kelompok Baru";
                    const announceContent = `Berikut pembagian kelompok acak XII TKJ 1:\n\n${outputText}`;
                    await createNotification(announceTitle, announceContent, "info");
                    toast.success("Hasil kelompok disiarkan ke Siaran Pengumuman!");
                  } catch (err: any) {
                    Swal.fire("Gagal Menyiarkan", err.message, "error");
                  }
                }
              });
            }
          });
        });
      }
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
      const copyCredentialsBtn = document.getElementById("copyCredentialsBtn") as HTMLButtonElement;
      if (copyCredentialsBtn) {
        copyCredentialsBtn.addEventListener("click", () => {
          const sortedStudents = [...students].sort((a, b) => (a.absen || 0) - (b.absen || 0));

          Swal.fire({
            title: "Salin Semua Akun Siswa",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 text-left mt-3 font-sans">
                <p class="text-xs text-slate-400 leading-relaxed">
                  Anda akan menyalin detail login untuk <span class="text-cyan-400 font-bold">${sortedStudents.length} siswa</span>. Harap tentukan password default yang benar di bawah ini agar format yang disalin sesuai dengan yang Anda gunakan saat mendaftarkan mereka.
                </p>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Password Default Siswa</label>
                  <input type="text" id="copyDefaultPassword" value="Siswa@TKJ1_2026" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-mono">
                  <p class="text-[10px] text-slate-500 mt-1">Ubah atau sesuaikan jika password default yang benar berbeda (misal: <code class="text-cyan-400">Siswa@TKJ1</code>, <code class="text-cyan-400">siswa@tkj</code>, atau lainnya).</p>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Salin Akun Sekarang",
            cancelButtonText: "Batal",
            confirmButtonColor: "#06b6d4",
            cancelButtonColor: "#334155",
            focusConfirm: false,
            preConfirm: () => {
              const pwd = (document.getElementById("copyDefaultPassword") as HTMLInputElement).value.trim();
              if (!pwd) {
                Swal.showValidationMessage("Password default tidak boleh kosong!");
                return false;
              }
              return pwd;
            }
          }).then((res) => {
            if (res.isConfirmed && res.value) {
              const finalDefaultPassword = res.value;

              let text = `🔑 DAFTAR LOGIN HUB KELAS XII TKJ 1\n`;
              text += `Aplikasi: Hub XII TKJ 1\n`;
              text += `Link Akses: ${window.location.origin}\n`;
              text += `Password Default: ${finalDefaultPassword}\n`;
              text += `--------------------------------------------------\n\n`;

              sortedStudents.forEach((student: any) => {
                const email = student.email || `${student.name.toLowerCase().replace(/\s+/g, "")}@classhub.local`;
                text += `No. Absen ${student.absen || "-"}\n`;
                text += `👤 Nama: ${student.name}\n`;
                text += `📧 Email/Username: ${email}\n`;
                text += `🔑 Password Default: ${finalDefaultPassword}\n`;
                text += `--------------------------------------------------\n`;
              });

              text += `\n*Catatan: Harap segera login dan mengganti password default Anda di menu Profil demi keamanan akun Anda.*`;

              navigator.clipboard.writeText(text).then(() => {
                toast.success("Berhasil menyalin semua akun ke clipboard!");
                Swal.fire({
                  title: "Tersalin ke Clipboard! 🎉",
                  background: "#0f172a",
                  color: "#f8fafc",
                  html: `
                    <div class="text-left text-xs text-slate-300 space-y-2.5 mt-2">
                      <p>Detail akun untuk <strong class="text-cyan-400">${sortedStudents.length} siswa</strong> berhasil disalin dengan password <strong class="text-yellow-400">${finalDefaultPassword}</strong>.</p>
                      <p class="text-[11px] text-slate-400">Anda dapat langsung menempelkannya (Paste/CTRL+V) ke WhatsApp atau grup kelas untuk dibagikan.</p>
                      <div class="p-3 bg-slate-950 border border-slate-850 rounded-xl font-mono text-[10px] leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre">
${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                      </div>
                    </div>
                  `,
                  confirmButtonText: "Mantap",
                  confirmButtonColor: "#06b6d4"
                });
              }).catch(err => {
                Swal.fire("Gagal Menyalin", err.message, "error");
              });
            }
          });
        });
      }

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
