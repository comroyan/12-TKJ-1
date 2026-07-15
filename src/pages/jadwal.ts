import { getSchedules, saveSchedule, getPickets, savePicket, getStudentUsers, getTasks, addTask, createNotification } from "../firebase/db";
import { renderIcons, toast, isOddWeek, formatDate } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderJadwal(container: HTMLElement, userSession: any) {
  // Local state to keep tab and week type selection active
  const calendarIsOdd = isOddWeek();
  let selectedWeekType = calendarIsOdd ? "ganjil" : "genap";
  let activeTab = "lessons"; // "lessons" or "pickets"

  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat data jadwal & piket...</span>
    </div>
  `;

  async function loadAndRender() {
    const [schedules, pickets, students, tasks] = await Promise.all([
      getSchedules(),
      getPickets(),
      getStudentUsers(),
      getTasks()
    ]);

    const isEditor = userSession.role === "Super Admin" || 
                     userSession.role === "Sekretaris" || 
                     userSession.role === "Ketua Kelas" || 
                     userSession.jabatan === "Ketua Kelas" || 
                     userSession.role === "Wakil";
                     
    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    const currentDay = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="book-open" class="text-cyan-400 w-7 h-7"></i> Jadwal & Piket XII TKJ 1
            </h1>
            <p class="text-slate-400 text-sm mt-1">Koordinasi mingguan jadwal pelajaran sekolah dan pembagian shift piket kebersihan.</p>
          </div>
        </div>

        <!-- Tomorrow's Tasks Alert Banner -->
        ${(() => {
          const today = new Date();
          const tomorrowStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toDateString();
          
          const tomorrowTasks = tasks.filter((t: any) => {
            if (t.status !== "pending") return false;
            const dl = new Date(t.deadline);
            return dl.toDateString() === tomorrowStr;
          });

          if (tomorrowTasks.length === 0) {
            return `
              <div class="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center gap-3 text-xs text-slate-400">
                <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><i data-lucide="check-circle" class="w-4 h-4"></i></div>
                <div>
                  <span class="font-bold text-slate-200 block">Bebas Tugas Esok Hari!</span>
                  <span class="text-[11px] text-slate-400">Tidak ada tugas kelas yang perlu dikumpulkan besok. Selamat bersenang-senang!</span>
                </div>
              </div>
            `;
          }

          return `
            <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div class="flex items-start gap-3">
                <div class="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl shrink-0"><i data-lucide="alert-triangle" class="w-5 h-5 animate-bounce"></i></div>
                <div>
                  <span class="font-extrabold text-amber-400 text-sm">Penting: Ada ${tomorrowTasks.length} Tugas Dikumpulkan Besok!</span>
                  <div class="mt-1.5 space-y-1">
                    ${tomorrowTasks.map((t: any) => `
                      <div class="flex items-center gap-1.5 text-slate-300">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <strong class="text-white">[Mapel: ${t.subject}]</strong> ${t.title}
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>
              <button id="goToTugasPageBtn" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] transition-all self-start md:self-center">
                Buka Planner Tugas
              </button>
            </div>
          `;
        })()}

        <!-- Tab Selector (Lessons vs Picket) -->
        <div class="flex border-b border-slate-800 gap-6">
          <button id="tabLessons" class="pb-3 text-sm font-semibold border-b-2 ${activeTab === 'lessons' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'} transition-colors">Jadwal Pelajaran</button>
          <button id="tabPickets" class="pb-3 text-sm font-semibold border-b-2 ${activeTab === 'pickets' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'} transition-colors">Jadwal Piket</button>
        </div>

        <!-- Lessons Container -->
        <div id="lessonsSection" class="space-y-6 ${activeTab === 'lessons' ? '' : 'hidden'}">
          <!-- Odd/Even Week Indicator and Switcher -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 font-medium">Minggu Aktif (Kalender):</span>
              <span class="px-2.5 py-1 text-xs font-semibold rounded-lg ${calendarIsOdd ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} flex items-center gap-1">
                <i data-lucide="calendar-days" class="w-3.5 h-3.5"></i>
                Minggu ${calendarIsOdd ? 'Ganjil' : 'Genap'}
              </span>
            </div>
            <div class="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button id="btnGanjil" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedWeekType === 'ganjil' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}">
                Minggu Ganjil ${calendarIsOdd ? '<span class="w-1.5 h-1.5 rounded-full bg-slate-950"></span>' : ''}
              </button>
              <button id="btnGenap" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedWeekType === 'genap' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}">
                Minggu Genap ${!calendarIsOdd ? '<span class="w-1.5 h-1.5 rounded-full bg-slate-950"></span>' : ''}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            ${days.map(day => {
              const weekDayId = `${day}_${selectedWeekType}`;
              let sched = schedules.find((s: any) => s.id === weekDayId) as any;
              let isUsingFallback = false;

              if (!sched) {
                // Fallback to the general day schedule if no specific week-type schedule is saved yet
                sched = schedules.find((s: any) => s.id === day) || { subjects: [] };
                isUsingFallback = sched.subjects && sched.subjects.length > 0;
              }

              const isToday = day === currentDay;

              return `
                <div class="glass rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${isToday ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/5 bg-slate-900/40' : 'bg-slate-950/20'}">
                  ${isToday ? `<span class="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[10px] font-bold uppercase rounded-lg">Hari Ini</span>` : ""}
                  <div>
                    <h3 class="text-lg font-bold font-display ${isToday ? 'text-cyan-400' : 'text-slate-200'} mb-1">${day}</h3>
                    <span class="text-[9px] text-slate-500 block mb-3 font-mono">
                      ${isUsingFallback ? "Default (Klik ubah untuk pisahkan)" : `Minggu ${selectedWeekType === 'ganjil' ? 'Ganjil' : 'Genap'}`}
                    </span>
                    <div class="space-y-3">
                      ${sched.subjects && sched.subjects.length > 0 ? sched.subjects.map((s: any) => {
                        const matchingTasks = tasks.filter((t: any) => 
                          t.status === "pending" && 
                          t.subject.toLowerCase().trim() === s.subject.toLowerCase().trim()
                        );
                        
                        return `
                          <div class="p-2.5 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-1 relative group/sub">
                            <span class="text-xs font-semibold text-white block">${s.subject}</span>
                            <span class="text-[10px] text-slate-400 block">${s.teacher}</span>
                            <span class="inline-block text-[9px] font-mono font-medium text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 mt-1">${s.time}</span>
                            
                            <!-- Add task shortcut button for class editors next to each subject -->
                            ${isEditor ? `
                              <button class="addSubjectTaskBtn absolute top-2.5 right-2.5 p-1 bg-slate-900 hover:bg-yellow-500 hover:text-slate-950 text-yellow-500 rounded-lg opacity-0 group-hover/sub:opacity-100 transition-opacity duration-200 cursor-pointer" data-subject="${s.subject}" title="Tambah Tugas untuk pelajaran ini">
                                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                              </button>
                            ` : ""}

                            <!-- Linked active tasks list -->
                            ${matchingTasks.length > 0 ? `
                              <div class="mt-2 pt-2 border-t border-slate-800/60 space-y-1.5">
                                <span class="text-[9px] font-extrabold text-yellow-500 uppercase tracking-wider block">Tugas Aktif (${matchingTasks.length}):</span>
                                ${matchingTasks.map((t: any) => `
                                  <div class="text-[10px] text-slate-300 flex items-start gap-1">
                                    <span class="w-1 h-1 rounded-full bg-yellow-400 mt-1.5 shrink-0 animate-pulse"></span>
                                    <div>
                                      <span class="font-semibold block text-slate-200 leading-snug">${t.title}</span>
                                      <span class="text-[9px] text-slate-500 font-mono">Dl: ${formatDate(t.deadline)}</span>
                                    </div>
                                  </div>
                                `).join("")}
                              </div>
                            ` : ""}
                          </div>
                        `;
                      }).join("") : `<p class="text-xs text-slate-500 italic py-2">Libur / Kosong</p>`}
                    </div>
                  </div>
                  ${isEditor ? `
                    <button class="editSchedBtn w-full mt-4 py-2 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-xs font-semibold text-cyan-400 rounded-xl transition-all" data-day="${day}">
                      Ubah Jadwal
                    </button>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Pickets Container -->
        <div id="picketsSection" class="space-y-6 ${activeTab === 'pickets' ? '' : 'hidden'}">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            ${days.map(day => {
              const picket = (pickets.find((p: any) => p.id === day) || { members: [] }) as any;
              const isToday = day === currentDay;

              return `
                <div class="glass rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ${isToday ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/5 bg-slate-900/40' : 'bg-slate-950/20'}">
                  ${isToday ? `<span class="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[10px] font-bold uppercase rounded-lg">Hari Ini</span>` : ""}
                  <div>
                    <h3 class="text-lg font-bold font-display ${isToday ? 'text-cyan-400' : 'text-slate-200'} mb-3">${day}</h3>
                    <div class="space-y-2">
                      ${picket.members && picket.members.length > 0 ? picket.members.map((m: any) => `
                        <div class="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                          <span class="text-xs font-medium text-slate-200 line-clamp-1">${m.name}</span>
                          <span class="w-2.5 h-2.5 rounded-full ${m.done ? 'bg-emerald-400 shadow-md shadow-emerald-400/20' : 'bg-rose-400/80'}" title="${m.done ? 'Selesai Piket' : 'Belum Piket'}"></span>
                        </div>
                      `).join("") : `<p class="text-xs text-slate-500 italic py-2">Belum diatur</p>`}
                    </div>
                  </div>
                  ${isEditor ? `
                    <button class="editPicketBtn w-full mt-4 py-2 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-xs font-semibold text-cyan-400 rounded-xl transition-all" data-day="${day}">
                      Atur Petugas
                    </button>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Tab switcher logic
    const tabLessons = document.getElementById("tabLessons") as HTMLButtonElement;
    const tabPickets = document.getElementById("tabPickets") as HTMLButtonElement;

    if (tabLessons) {
      tabLessons.addEventListener("click", () => {
        activeTab = "lessons";
        loadAndRender();
      });
    }

    if (tabPickets) {
      tabPickets.addEventListener("click", () => {
        activeTab = "pickets";
        loadAndRender();
      });
    }

    // Week selector logic
    const btnGanjil = document.getElementById("btnGanjil");
    const btnGenap = document.getElementById("btnGenap");

    if (btnGanjil) {
      btnGanjil.addEventListener("click", () => {
        selectedWeekType = "ganjil";
        loadAndRender();
      });
    }

    if (btnGenap) {
      btnGenap.addEventListener("click", () => {
        selectedWeekType = "genap";
        loadAndRender();
      });
    }

    // Edit Lesson Schedule Listener
    document.querySelectorAll(".editSchedBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const day = btn.dataset.day;
        const weekDayId = `${day}_${selectedWeekType}`;
        let currentSched = schedules.find((s: any) => s.id === weekDayId) as any;

        if (!currentSched) {
          // Fallback to default day config
          currentSched = schedules.find((s: any) => s.id === day) || { subjects: [] };
        }

        let formHtml = `<div class="space-y-3 text-left mt-2 font-sans overflow-y-auto max-h-[350px]">`;
        for (let i = 0; i < 4; i++) {
          const sub = currentSched.subjects[i] || { subject: "", teacher: "", time: "" };
          formHtml += `
            <div class="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
              <span class="text-xs font-bold text-cyan-400 block">Mata Pelajaran ${i + 1}</span>
              <div class="grid grid-cols-2 gap-2">
                <input type="text" id="sub-${i}" placeholder="Mapel" value="${sub.subject}" class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
                <input type="text" id="time-${i}" placeholder="Jam (07:00-08:30)" value="${sub.time}" class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
              </div>
              <input type="text" id="teacher-${i}" placeholder="Nama Guru Pengajar" value="${sub.teacher}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
            </div>
          `;
        }
        formHtml += `</div>`;

        Swal.fire({
          title: `Atur Jadwal ${day} (Minggu ${selectedWeekType === 'ganjil' ? 'Ganjil' : 'Genap'})`,
          background: "#0f172a",
          color: "#f8fafc",
          html: formHtml,
          showCancelButton: true,
          confirmButtonText: "Simpan Jadwal",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const subjects = [];
            for (let i = 0; i < 4; i++) {
              const subject = (document.getElementById(`sub-${i}`) as HTMLInputElement).value.trim();
              const teacher = (document.getElementById(`teacher-${i}`) as HTMLInputElement).value.trim();
              const time = (document.getElementById(`time-${i}`) as HTMLInputElement).value.trim();
              if (subject) {
                subjects.push({ subject, teacher, time });
              }
            }
            return { subjects };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await saveSchedule(weekDayId, result.value);
              toast.success(`Jadwal ${day} (${selectedWeekType === 'ganjil' ? 'Ganjil' : 'Genap'}) berhasil diperbarui!`);
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal menyimpan", err.message, "error");
            }
          }
        });
      });
    });

    // Edit Picket Shifts Listener
    document.querySelectorAll(".editPicketBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const day = btn.dataset.day;
        const currentPicket = (pickets.find((p: any) => p.id === day) || { members: [] }) as any;

        // Render member selectors
        let formHtml = `
          <p class="text-xs text-slate-400 text-left mb-3">Pilih siswa yang bertugas piket hari ${day}:</p>
          <div class="grid grid-cols-2 gap-2 text-left mt-2 max-h-[300px] overflow-y-auto pr-1">
        `;
        students.forEach((student: any) => {
          const isSelected = currentPicket.members.some((m: any) => m.userId === student.id);
          formHtml += `
            <label class="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors">
              <input type="checkbox" name="picketMember" value="${student.id}" data-name="${student.name}" ${isSelected ? 'checked' : ''} class="accent-cyan-500">
              <span class="text-xs text-slate-200 line-clamp-1">${student.name}</span>
            </label>
          `;
        });
        formHtml += `</div>`;

        Swal.fire({
          title: `Atur Piket Hari ${day}`,
          background: "#0f172a",
          color: "#f8fafc",
          html: formHtml,
          showCancelButton: true,
          confirmButtonText: "Simpan Piket",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const selectedBoxes = document.querySelectorAll("input[name='picketMember']:checked");
            const members = Array.from(selectedBoxes).map((box: any) => ({
              userId: box.value,
              name: box.dataset.name,
              done: currentPicket.members.find((m: any) => m.userId === box.value)?.done || false
            }));
            return { members };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await savePicket(day, result.value);
              toast.success(`Jadwal piket hari ${day} berhasil dikonfigurasi!`);
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal menyimpan", err.message, "error");
            }
          }
        });
      });
    });

    // Go to Tugas page banner button click listener
    const goToTugasPageBtn = document.getElementById("goToTugasPageBtn");
    if (goToTugasPageBtn) {
      goToTugasPageBtn.addEventListener("click", () => {
        const btn = document.querySelector(`.nav-item[data-page="tugas"]`) as HTMLButtonElement;
        if (btn) btn.click();
      });
    }

    // Add subject task click listener
    document.querySelectorAll(".addSubjectTaskBtn").forEach((btn: any) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const subject = btn.dataset.subject;

        Swal.fire({
          title: `Tambah Tugas: ${subject}`,
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Tugas</label>
                <input type="text" id="newTaskTitle" placeholder="Misal: Latihan Soal Bab 3 atau Praktikum Cisco" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-sans">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi & Instruksi</label>
                <textarea id="newTaskDesc" placeholder="Tulis instruksi lengkap tugas di sini..." class="w-full h-24 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm resize-none font-sans"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Prioritas</label>
                  <select id="newTaskPriority" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-sans">
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Jenis Tugas</label>
                  <select id="newTaskType" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-sans">
                    <option value="Individu">Individu</option>
                    <option value="Kelompok">Kelompok</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Tanggal Deadline</label>
                <input type="date" id="newTaskDeadline" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-sans">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "✓ Tambah Tugas",
          cancelButtonText: "Batal",
          confirmButtonColor: "#eab308",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const title = (document.getElementById("newTaskTitle") as HTMLInputElement).value.trim();
            const description = (document.getElementById("newTaskDesc") as HTMLTextAreaElement).value.trim();
            const priority = (document.getElementById("newTaskPriority") as HTMLSelectElement).value;
            const type = (document.getElementById("newTaskType") as HTMLSelectElement).value;
            const deadline = (document.getElementById("newTaskDeadline") as HTMLInputElement).value;

            if (!title || !deadline) {
              Swal.showValidationMessage("Harap isi Judul dan Tanggal Deadline!");
              return false;
            }

            return {
              title,
              description,
              priority,
              type,
              deadline,
              subject,
              status: "pending",
              createdBy: userSession.name
            };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              // Add task
              await addTask(result.value);

              // Send real-time notification
              const notificationTitle = `Tugas Baru: ${subject}`;
              const notificationContent = `Tugas "${result.value.title}" baru saja ditambahkan oleh ${userSession.name}. Deadline: ${formatDate(result.value.deadline)}.`;
              await createNotification(notificationTitle, notificationContent, "warning");

              toast.success("Tugas baru berhasil ditambahkan & notifikasi terkirim!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    });
  }

  loadAndRender();
}
