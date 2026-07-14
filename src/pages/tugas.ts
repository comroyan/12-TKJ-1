import { getTasks, addTask, updateTaskStatus, deleteTask, getAgendas, addAgendaItem, deleteAgendaItem } from "../firebase/db";
import { renderIcons, formatDate, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderTugas(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat planner tugas & agenda...</span>
    </div>
  `;

  async function loadAndRender() {
    const [tasks, agendas] = await Promise.all([
      getTasks(),
      getAgendas()
    ]);

    const isEditor = userSession.role === "Super Admin" || 
                     userSession.role === "Sekretaris" || 
                     userSession.role === "Wakil" ||
                     (userSession.jabatan && (
                       userSession.jabatan.toLowerCase().includes("ketua") ||
                       userSession.jabatan.toLowerCase().includes("guru") ||
                       userSession.jabatan.toLowerCase().includes("wali")
                     ));

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="list-todo" class="text-yellow-400 w-7 h-7"></i> Tugas & Agenda Kelas
            </h1>
            <p class="text-slate-400 text-sm mt-1">Sistem pelacakan tugas bersama, jadwal ujian, pr, dan kalender kegiatan penting.</p>
          </div>
          <div class="flex items-center gap-2">
            ${isEditor ? `
              <button id="addAgendaBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all">
                <i data-lucide="calendar" class="w-4 h-4"></i> Buat Agenda
              </button>
              <button id="addTaskBtn" class="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-yellow-500/10 transition-all duration-300">
                <i data-lucide="plus" class="w-4 h-4"></i> Tambah Tugas
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Section Switcher Tab -->
        <div class="flex border-b border-slate-800 gap-6">
          <button id="tabTasks" class="pb-3 text-sm font-semibold border-b-2 border-yellow-500 text-yellow-400 transition-colors">Tugas Bersama (${tasks.filter((t: any) => t.status === "pending").length})</button>
          <button id="tabAgenda" class="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors">Kalender Agenda (${agendas.length})</button>
        </div>

        <!-- Tasks Section -->
        <div id="tasksSection" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${tasks.length > 0 ? tasks.map((t: any) => {
              const deadlineDate = new Date(t.deadline);
              const isOverdue = deadlineDate < new Date() && t.status === "pending";
              
              const priorityColors: any = {
                "Tinggi": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                "Sedang": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                "Rendah": "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              };

              const isKelompok = t.type === "Kelompok";
              const typeBadge = isKelompok 
                ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"><i data-lucide="users" class="w-3 h-3"></i> Kelompok</span>`
                : `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> Individu</span>`;

              return `
                <div class="glass rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between glass-card-hover border-t-4 ${t.status === 'completed' ? 'border-t-emerald-500' : isOverdue ? 'border-t-rose-600' : 'border-t-yellow-500'}">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-lg ${priorityColors[t.priority] || priorityColors['Sedang']}">
                          Prioritas ${t.priority}
                        </span>
                        ${typeBadge}
                      </div>
                      <span class="text-[10px] font-mono text-slate-400 uppercase">Mapel: ${t.subject}</span>
                    </div>

                    <h3 class="text-base font-bold text-white leading-snug ${t.status === 'completed' ? 'line-through text-slate-500' : ''}">${t.title}</h3>
                    <p class="text-xs text-slate-400 mt-2 leading-relaxed whitespace-pre-line">${t.description}</p>
                    
                    <div class="mt-4 p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-1">
                      <div class="flex items-center gap-2 text-xs text-slate-400">
                        <i data-lucide="clock" class="w-3.5 h-3.5 text-cyan-500"></i>
                        <span>Deadline: <strong class="text-slate-200 font-mono">${formatDate(t.deadline)}</strong></span>
                      </div>
                      ${isOverdue ? `<span class="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1"><i data-lucide="shield-alert" class="w-3 h-3"></i> TUGAS TERLEWAT DEADLINE</span>` : ""}
                    </div>
                  </div>

                  <div class="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                    <div>
                      <span class="text-[10px] uppercase text-slate-500 font-semibold block">Status Tugas</span>
                      <span class="text-xs font-bold ${t.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'} flex items-center gap-1 mt-0.5">
                        <span class="w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-400' : 'bg-yellow-400 animate-ping'}"></span>
                        ${t.status === 'completed' ? 'Selesai' : 'Pending'}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      ${isEditor ? (t.status === 'pending' ? `
                        <button class="completeTaskBtn px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all" data-id="${t.id}">
                          ✓ Selesai
                        </button>
                      ` : `
                        <button class="pendingTaskBtn px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all" data-id="${t.id}">
                          Unmark
                        </button>
                      `) : ""}
                      ${isEditor ? `
                        <button class="deleteTaskBtn p-2 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-xl transition-colors" data-id="${t.id}">
                          <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ""}
                    </div>
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="col-span-full py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="list-todo" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada tugas bersama yang dicatat.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Agenda Section (Hidden by default) -->
        <div id="agendaSection" class="space-y-6 hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${agendas.length > 0 ? agendas.map((a: any) => `
              <div class="glass rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-slate-950/20 to-purple-950/10 border-l-4 border-l-purple-500 glass-card-hover">
                <div class="absolute right-2 top-2 text-purple-500/5"><i data-lucide="calendar" class="w-16 h-16"></i></div>
                <div>
                  <div class="p-2 w-12 rounded-xl bg-purple-500/10 text-purple-400 font-bold text-center text-sm">
                    ${new Date(a.date).getDate()}<br/>
                    <span class="text-[9px] uppercase font-normal">${new Date(a.date).toLocaleString("id-ID", { month: "short" })}</span>
                  </div>

                  <h3 class="text-base font-bold text-white mt-3 leading-snug">${a.title}</h3>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">${a.description || ""}</p>
                </div>

                <div class="mt-6 pt-3 border-t border-slate-850 flex items-center justify-between">
                  <span class="text-[10px] text-slate-500 font-mono font-medium">${formatDate(a.date)}</span>
                  ${isEditor ? `
                    <button class="deleteAgendaBtn p-1.5 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-lg transition-colors" data-id="${a.id}">
                      <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                    </button>
                  ` : ""}
                </div>
              </div>
            `).join("") : `
              <div class="col-span-full py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="calendar" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada agenda kelas terdaftar.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Section triggers
    const tabTasks = document.getElementById("tabTasks") as HTMLButtonElement;
    const tabAgenda = document.getElementById("tabAgenda") as HTMLButtonElement;
    const tasksSection = document.getElementById("tasksSection") as HTMLDivElement;
    const agendaSection = document.getElementById("agendaSection") as HTMLDivElement;

    tabTasks.addEventListener("click", () => {
      tabTasks.className = "pb-3 text-sm font-semibold border-b-2 border-yellow-500 text-yellow-400 transition-colors";
      tabAgenda.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      tasksSection.classList.remove("hidden");
      agendaSection.classList.add("hidden");
    });

    tabAgenda.addEventListener("click", () => {
      tabAgenda.className = "pb-3 text-sm font-semibold border-b-2 border-yellow-500 text-yellow-400 transition-colors";
      tabTasks.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      agendaSection.classList.remove("hidden");
      tasksSection.classList.add("hidden");
    });

    // Task verification toggles
    document.querySelectorAll(".completeTaskBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        try {
          await updateTaskStatus(btn.dataset.id, "completed");
          toast.success("Tugas selesai ditandai!");
          loadAndRender();
        } catch (e: any) {
          Swal.fire("Error", e.message, "error");
        }
      });
    });

    document.querySelectorAll(".pendingTaskBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        try {
          await updateTaskStatus(btn.dataset.id, "pending");
          toast.success("Tugas diubah menjadi pending.");
          loadAndRender();
        } catch (e: any) {
          Swal.fire("Error", e.message, "error");
        }
      });
    });

    document.querySelectorAll(".deleteTaskBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus Tugas", "Apakah Anda yakin ingin menghapus tugas kelas ini?");
        if (confirm) {
          try {
            await deleteTask(btn.dataset.id);
            toast.success("Tugas kelas berhasil dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    document.querySelectorAll(".deleteAgendaBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus Agenda", "Apakah Anda yakin ingin menghapus agenda kegiatan ini?");
        if (confirm) {
          try {
            await deleteAgendaItem(btn.dataset.id);
            toast.success("Agenda kegiatan berhasil dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Forms triggers
    const addTaskBtn = document.getElementById("addTaskBtn") as HTMLButtonElement;
    if (addTaskBtn) {
      addTaskBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Tugas Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Mata Pelajaran</label>
                <input type="text" id="tSubject" placeholder="Contoh: Administrasi Sistem Jaringan" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Tugas</label>
                <input type="text" id="tTitle" placeholder="Contoh: Konfigurasi DNS & Web Server" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Batas Pengumpulan (Deadline)</label>
                  <input type="datetime-local" id="tDeadline" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-xs">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Prioritas</label>
                  <select id="tPriority" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm">
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang" selected>Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Tipe Tugas</label>
                <select id="tType" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm">
                  <option value="Individu" selected>Individu (Perorangan)</option>
                  <option value="Kelompok">Kelompok (Tim)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi & Instruksi Tugas</label>
                <textarea id="tDesc" placeholder="Sebutkan modul yang harus diselesaikan, link e-learning, atau rincian tugas kelompok..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm h-24 resize-none"></textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Tugas",
          cancelButtonText: "Batal",
          confirmButtonColor: "#eab308",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const subject = (document.getElementById("tSubject") as HTMLInputElement).value.trim();
            const title = (document.getElementById("tTitle") as HTMLInputElement).value.trim();
            const deadline = (document.getElementById("tDeadline") as HTMLInputElement).value;
            const priority = (document.getElementById("tPriority") as HTMLSelectElement).value;
            const type = (document.getElementById("tType") as HTMLSelectElement).value;
            const description = (document.getElementById("tDesc") as HTMLTextAreaElement).value.trim();

            if (!subject || !title || !deadline) {
              Swal.showValidationMessage("Harap isi semua kolom wajib!");
              return false;
            }
            return { subject, title, deadline, priority, type, description, status: "pending" };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addTask(result.value);
              toast.success("Tugas berhasil ditambahkan ke rencana belajar kelas!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    }

    if (isEditor) {
      const addAgendaBtn = document.getElementById("addAgendaBtn") as HTMLButtonElement;
      if (addAgendaBtn) {
        addAgendaBtn.addEventListener("click", () => {
          Swal.fire({
            title: "Buat Agenda Baru",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 text-left mt-4 font-sans">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Agenda</label>
                  <input type="text" id="aTitle" placeholder="Contoh: Try Out UKK Tahap 1" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Tanggal Kegiatan</label>
                  <input type="date" id="aDate" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi Kegiatan</label>
                  <textarea id="aDesc" placeholder="Jelaskan mengenai agenda ini..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-20 resize-none"></textarea>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Simpan Agenda",
            cancelButtonText: "Batal",
            confirmButtonColor: "#a855f7",
            cancelButtonColor: "#334155",
            preConfirm: () => {
              const title = (document.getElementById("aTitle") as HTMLInputElement).value.trim();
              const date = (document.getElementById("aDate") as HTMLInputElement).value;
              const description = (document.getElementById("aDesc") as HTMLTextAreaElement).value.trim();

              if (!title || !date) {
                Swal.showValidationMessage("Harap isi Judul dan Tanggal!");
                return false;
              }
              return { title, date, description };
            }
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await addAgendaItem(result.value);
                toast.success("Agenda baru ditambahkan ke Kalender!");
                loadAndRender();
              } catch (err: any) {
                Swal.fire("Gagal", err.message, "error");
              }
            }
          });
        });
      }
    }
  }

  loadAndRender();
}
