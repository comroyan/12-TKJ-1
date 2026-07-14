import { getSchedules, saveSchedule, getPickets, savePicket, getStudentUsers } from "../firebase/db";
import { renderIcons, toast, isOddWeek } from "../utils/helpers";
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
    const [schedules, pickets, students] = await Promise.all([
      getSchedules(),
      getPickets(),
      getStudentUsers()
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
                      ${sched.subjects && sched.subjects.length > 0 ? sched.subjects.map((s: any) => `
                        <div class="p-2.5 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-1">
                          <span class="text-xs font-semibold text-white block">${s.subject}</span>
                          <span class="text-[10px] text-slate-400 block">${s.teacher}</span>
                          <span class="inline-block text-[9px] font-mono font-medium text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 mt-1">${s.time}</span>
                        </div>
                      `).join("") : `<p class="text-xs text-slate-500 italic py-2">Libur / Kosong</p>`}
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
  }

  loadAndRender();
}
