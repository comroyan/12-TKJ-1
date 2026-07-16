import { 
  getStudentUsers, 
  getClassFunds, 
  getTasks, 
  getAgendas, 
  getSchedules, 
  getPickets,
  getCountdownSettings,
  saveCountdownSettings
} from "../firebase/db";
import { formatRupiah, renderIcons, isOddWeek, toast, requestNotificationPermission } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderDashboard(container: HTMLElement, userSession: any) {
  // Loading skeleton
  container.innerHTML = `
    <div class="space-y-6 animate-pulse">
      <div class="h-12 bg-slate-800 rounded-xl w-1/4"></div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="h-32 bg-slate-800 rounded-2xl"></div>
        <div class="h-32 bg-slate-800 rounded-2xl"></div>
        <div class="h-32 bg-slate-800 rounded-2xl"></div>
        <div class="h-32 bg-slate-800 rounded-2xl"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-96 bg-slate-800 rounded-3xl"></div>
        <div class="h-96 bg-slate-800 rounded-3xl"></div>
      </div>
    </div>
  `;

  // Fetch all dashboard relevant data in parallel including customizable countdown targets
  const [students, funds, tasks, agendas, schedules, pickets, countdownSettings] = await Promise.all([
    getStudentUsers(),
    getClassFunds(),
    getTasks(),
    getAgendas(),
    getSchedules(),
    getPickets(),
    getCountdownSettings()
  ]);

  // Check if current user has Class President/Editor privilege to edit countdowns
  const isKetuaKelas = userSession.role === "Super Admin" || 
                       userSession.role === "Ketua Kelas" || 
                       userSession.jabatan === "Ketua Kelas" || 
                       userSession.role === "Wakil" || 
                       userSession.role === "Sekretaris";

  // Calculate Cash Balance
  const approvedFunds = funds.filter((f: any) => f.status === "approved" || !f.status);
  const totalIn = approvedFunds.filter((f: any) => f.type === "in").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
  const totalOut = approvedFunds.filter((f: any) => f.type === "out").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
  const cashBalance = totalIn - totalOut;

  // Next lesson & picket calculation
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayDay = days[new Date().getDay()];
  const todayPickets = (pickets.find((p: any) => p.id === todayDay) || { members: [] }) as any;

  // Odd/Even week subject schedules resolving
  const calendarIsOdd = isOddWeek();
  const currentWeekType = calendarIsOdd ? "ganjil" : "genap";
  const todayWeekDayId = `${todayDay}_${currentWeekType}`;
  
  let todaySchedules = schedules.find((s: any) => s.id === todayWeekDayId) as any;
  if (!todaySchedules) {
    // Fallback to the default general day schedule
    todaySchedules = (schedules.find((s: any) => s.id === todayDay) || { subjects: [] }) as any;
  }

  // Filter tasks and agendas
  const pendingTasksCount = tasks.filter((t: any) => t.status === "pending").length;
  const upcomingEvents = agendas.filter((a: any) => new Date(a.date) >= new Date()).slice(0, 3);

  // Motivational Quotes
  const quotes = [
    { text: "Teknologi adalah alat, namun dalam hal memotivasi anak-anak dan membuat mereka bekerja sama, guru adalah yang terpenting.", author: "Bill Gates" },
    { text: "Networking is not about just connecting people. It's about connecting people with people, people with ideas, and people with opportunities.", author: "Michele Jennae" },
    { text: "Sukses bukanlah kunci kebahagiaan. Kebahagiaanlah kunci kesuksesan. Jika Anda menyukai apa yang Anda lakukan, Anda akan berhasil.", author: "Albert Schweitzer" },
    { text: "Konektivitas adalah hal yang luar biasa, tetapi pastikan Anda tetap terhubung dengan diri sendiri, impian Anda, dan tujuan mulia Anda.", author: "XII TKJ 1" }
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  // Get custom countdown target timestamps
  const settings = countdownSettings || {
    graduation: "2027-05-15T08:00:00",
    ukk: "2027-02-20T08:00:00",
    pkl: "2026-09-01T08:00:00",
    perpisahan: "2027-05-20T10:00:00"
  };
  const milestoneGraduation = new Date(settings.graduation || "2027-05-15T08:00:00").getTime();
  const milestoneUKK = new Date(settings.ukk || "2027-02-20T08:00:00").getTime();
  const milestonePKL = new Date(settings.pkl || "2026-09-01T08:00:00").getTime();
  const milestonePerpisahan = new Date(settings.perpisahan || "2027-05-20T10:00:00").getTime();

  function getCountdownString(targetTime: number): string {
    const diff = targetTime - Date.now();
    if (isNaN(diff) || diff <= 0) return "Selesai/Lewat";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${d} Hari ${h} Jam`;
  }

  // Dashboard HTML
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 glass rounded-3xl relative overflow-hidden">
        <div>
          <h1 class="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Halo, ${userSession.name || "Siswa"}! <span class="hover:scale-110 transition-transform duration-200">👋</span>
          </h1>
          <p class="text-slate-400 mt-1 text-sm">Selamat datang di ClassHub XII TKJ 1 — Pusat koordinasi digital kelas Anda.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs md:text-sm font-medium font-mono flex items-center gap-2 shadow-sm">
            <span class="status-dot bg-emerald-400"></span>
            <span>IP: 192.168.1.${userSession?.absen || 1}</span>
            <span class="text-slate-700 font-normal">|</span>
            <span>Ping: <span id="dash-ping" class="text-white font-semibold">Calculating...</span></span>
          </div>
        </div>
      </div>

      <!-- Notification Activation Banner if not granted -->
      ${("Notification" in window && Notification.permission !== "granted") ? `
        <div id="notifPermissionBanner" class="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <i data-lucide="bell" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white">Aktifkan Notifikasi Sistem HP</h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Dapatkan pengumuman penting XII TKJ 1 langsung di layar HP/Desktop Anda.</p>
            </div>
          </div>
          <button id="enableNotifBtn" class="w-full sm:w-auto px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl transition-all whitespace-nowrap">
            Aktifkan Sekarang
          </button>
        </div>
      ` : ""}

      <!-- Quick Countdown Grid Section with Ketua Kelas Edit Action -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold font-display tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <i data-lucide="clock" class="text-cyan-400 w-4 h-4"></i> Milestone & Kegiatan Kelas
          </h2>
          ${isKetuaKelas ? `
            <button id="editCountdownsBtn" class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[11px] font-semibold transition-all shadow-sm">
              <i data-lucide="edit" class="w-3 h-3"></i>
              Atur Countdown
            </button>
          ` : ""}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 glass stat-card rounded-2xl border-l-4 border-l-rose-500 relative overflow-hidden">
            <span class="text-xs text-slate-400 font-medium block">Countdown Kelulusan</span>
            <span class="text-base md:text-lg font-bold font-mono text-rose-400 mt-1 block" id="cd-grad">${getCountdownString(milestoneGraduation)}</span>
            <div class="absolute right-2 bottom-2 text-rose-500/10"><i data-lucide="award" class="w-8 h-8"></i></div>
          </div>
          <div class="p-4 glass stat-card rounded-2xl border-l-4 border-l-amber-500 relative overflow-hidden">
            <span class="text-xs text-slate-400 font-medium block">Countdown Ujian UKK</span>
            <span class="text-base md:text-lg font-bold font-mono text-amber-400 mt-1 block" id="cd-ukk">${getCountdownString(milestoneUKK)}</span>
            <div class="absolute right-2 bottom-2 text-amber-500/10"><i data-lucide="shield-alert" class="w-8 h-8"></i></div>
          </div>
          <div class="p-4 glass stat-card rounded-2xl border-l-4 border-l-cyan-500 relative overflow-hidden">
            <span class="text-xs text-slate-400 font-medium block">Countdown PKL</span>
            <span class="text-base md:text-lg font-bold font-mono text-cyan-400 mt-1 block" id="cd-pkl">${getCountdownString(milestonePKL)}</span>
            <div class="absolute right-2 bottom-2 text-cyan-500/10"><i data-lucide="calendar" class="w-8 h-8"></i></div>
          </div>
          <div class="p-4 glass stat-card rounded-2xl border-l-4 border-l-purple-500 relative overflow-hidden">
            <span class="text-xs text-slate-400 font-medium block">Countdown Perpisahan</span>
            <span class="text-base md:text-lg font-bold font-mono text-purple-400 mt-1 block" id="cd-perpisahan">${getCountdownString(milestonePerpisahan)}</span>
            <div class="absolute right-2 bottom-2 text-purple-500/10"><i data-lucide="heart" class="w-8 h-8"></i></div>
          </div>
        </div>
      </div>

      <!-- Quick Statistics Cards Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-6 glass stat-card rounded-3xl glass-card-hover flex items-center gap-4">
          <div class="p-3 bg-blue-500/10 text-blue-400 rounded-2xl"><i data-lucide="users" class="w-6 h-6"></i></div>
          <div>
            <span class="text-xs text-slate-400 block font-medium">Anggota Kelas</span>
            <span class="text-2xl font-bold text-white block mt-0.5">${students.length} Siswa</span>
          </div>
        </div>
        <div class="p-6 glass stat-card rounded-3xl glass-card-hover flex items-center gap-4">
          <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl"><i data-lucide="dollar-sign" class="w-6 h-6"></i></div>
          <div>
            <span class="text-xs text-slate-400 block font-medium">Kas Kelas</span>
            <span class="text-2xl font-bold text-emerald-400 block mt-0.5">${formatRupiah(cashBalance)}</span>
          </div>
        </div>
        <div class="p-6 glass stat-card rounded-3xl glass-card-hover flex items-center gap-4">
          <div class="p-3 bg-yellow-500/10 text-yellow-400 rounded-2xl"><i data-lucide="list-todo" class="w-6 h-6"></i></div>
          <div>
            <span class="text-xs text-slate-400 block font-medium">Tugas Tertunda</span>
            <span class="text-2xl font-bold text-white block mt-0.5">${pendingTasksCount} Tugas</span>
          </div>
        </div>
        <div class="p-6 glass stat-card rounded-3xl glass-card-hover flex items-center gap-4">
          <div class="p-3 bg-purple-500/10 text-purple-400 rounded-2xl"><i data-lucide="calendar" class="w-6 h-6"></i></div>
          <div>
            <span class="text-xs text-slate-400 block font-medium">Agenda Terdekat</span>
            <span class="text-2xl font-bold text-white block mt-0.5">${upcomingEvents.length} Kegiatan</span>
          </div>
        </div>
      </div>

      <!-- Main Layout Panels (Grid of Graph & Widgets) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chart Section -->
        <div class="lg:col-span-2 p-6 glass rounded-3xl flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold font-display text-white flex items-center gap-2">
                <i data-lucide="dollar-sign" class="w-5 h-5 text-emerald-400"></i> Aliran Keuangan Uang Kas
              </h2>
              <span class="text-xs text-slate-400">Kas Aktif</span>
            </div>
            <div class="relative w-full h-64 overflow-hidden" id="cashFlowChartContainer">
              <div class="flex items-center justify-center h-full text-slate-500 font-mono text-xs">
                Membuat grafik aliran kas...
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Info (Piket & Agenda) -->
        <div class="space-y-6">
          <!-- Today's Cleaning Duty -->
          <div class="p-6 glass stat-card picket-today rounded-3xl relative overflow-hidden">
            <h3 class="text-lg font-bold font-display text-white flex items-center gap-2 mb-3">
              <i data-lucide="clock" class="w-5 h-5 text-cyan-400"></i> Jadwal Piket Hari Ini (${todayDay})
            </h3>
            ${todayPickets.members && todayPickets.members.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${todayPickets.members.map((m: any) => `
                  <span class="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 text-xs flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${m.done ? 'bg-emerald-400' : 'bg-rose-500'}"></span>
                    ${m.name}
                  </span>
                `).join("")}
              </div>
            ` : `
              <p class="text-sm text-slate-400">Tidak ada jadwal piket hari ini.</p>
            `}
          </div>

          <!-- Quick Agenda Widget -->
          <div class="p-6 glass rounded-3xl">
            <h3 class="text-lg font-bold font-display text-white flex items-center gap-2 mb-3">
              <i data-lucide="calendar" class="w-5 h-5 text-purple-400"></i> Event Terdekat
            </h3>
            <div class="space-y-3">
              ${upcomingEvents.length > 0 ? upcomingEvents.map((e: any) => `
                <div class="flex items-start gap-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                  <div class="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs font-bold text-center min-w-[50px]">
                    ${new Date(e.date).getDate()}<br/>
                    <span class="text-[10px] uppercase font-normal">${new Date(e.date).toLocaleString("id-ID", { month: "short" })}</span>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-white leading-tight">${e.title}</h4>
                    <p class="text-xs text-slate-400 mt-1 leading-snug">${e.description || ""}</p>
                  </div>
                </div>
              `).join("") : `
                <div class="text-center py-4">
                  <p class="text-sm text-slate-400">Belum ada agenda terdekat.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- Motivation and Lesson Widget Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Motivation Quote -->
        <div class="p-6 glass rounded-3xl flex flex-col justify-between relative overflow-hidden bg-slate-900/40 border border-cyan-500/20">
          <div>
            <div class="flex items-center gap-1.5 mb-2 text-cyan-400 text-xs font-semibold tracking-wider uppercase">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Kutipan Motivasi TKJ
            </div>
            <p class="text-base md:text-lg italic text-slate-200 leading-relaxed font-serif">"${quote.text}"</p>
          </div>
          <span class="text-xs text-slate-400 mt-4 block text-right font-sans">— ${quote.author}</span>
        </div>

        <!-- Today's Schedule -->
        <div class="p-6 glass rounded-3xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold font-display text-white flex items-center gap-2">
              <i data-lucide="book-open" class="w-5 h-5 text-yellow-400"></i> Pelajaran Hari Ini (${todayDay})
            </h3>
            <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-850">
              Minggu ${calendarIsOdd ? 'Ganjil' : 'Genap'}
            </span>
          </div>
          <div class="space-y-2">
            ${todaySchedules.subjects && todaySchedules.subjects.length > 0 ? todaySchedules.subjects.map((s: any) => `
              <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-700/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center text-xs font-mono font-bold">
                    <i data-lucide="book-open" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold text-white">${s.subject}</h4>
                    <p class="text-xs text-slate-400 mt-0.5">${s.teacher}</p>
                  </div>
                </div>
                <span class="text-xs font-mono text-cyan-400 px-2 py-1 rounded-lg bg-cyan-500/10">${s.time}</span>
              </div>
            `).join("") : `
              <div class="text-center py-6">
                <p class="text-sm text-slate-400">Tidak ada jadwal pelajaran hari ini.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  renderIcons();

  // Attach countdown editor listener for Ketua Kelas
  if (isKetuaKelas) {
    const editBtn = document.getElementById("editCountdownsBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Konfigurasi Target Countdown",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left font-sans mt-2">
              <p class="text-xs text-slate-400 leading-snug mb-2">Tentukan tanggal dan waktu target untuk masing-masing milestone kelas XII TKJ 1:</p>
              <div>
                <label class="block text-xs font-bold text-rose-400 mb-1">Tanggal Kelulusan</label>
                <input type="datetime-local" id="set-graduation" value="${countdownSettings.graduation ? countdownSettings.graduation.substring(0, 16) : '2027-05-15T08:00'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-amber-400 mb-1">Tanggal Ujian UKK</label>
                <input type="datetime-local" id="set-ukk" value="${countdownSettings.ukk ? countdownSettings.ukk.substring(0, 16) : '2027-02-20T08:00'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-cyan-400 mb-1">Tanggal Mulai PKL</label>
                <input type="datetime-local" id="set-pkl" value="${countdownSettings.pkl ? countdownSettings.pkl.substring(0, 16) : '2026-09-01T08:00'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-purple-400 mb-1">Tanggal Perpisahan</label>
                <input type="datetime-local" id="set-perpisahan" value="${countdownSettings.perpisahan ? countdownSettings.perpisahan.substring(0, 16) : '2027-05-20T10:00'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs outline-none focus:border-cyan-500">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Target",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const gradVal = (document.getElementById("set-graduation") as HTMLInputElement).value;
            const ukkVal = (document.getElementById("set-ukk") as HTMLInputElement).value;
            const pklVal = (document.getElementById("set-pkl") as HTMLInputElement).value;
            const perpVal = (document.getElementById("set-perpisahan") as HTMLInputElement).value;
            
            if (!gradVal || !ukkVal || !pklVal || !perpVal) {
              Swal.showValidationMessage("Semua tanggal target harus diisi!");
              return false;
            }
            return {
              graduation: gradVal,
              ukk: ukkVal,
              pkl: pklVal,
              perpisahan: perpVal
            };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await saveCountdownSettings(result.value);
              toast.success("Target countdown berhasil diperbarui!");
              renderDashboard(container, userSession); // Re-render dashboard seamlessly
            } catch (err: any) {
              Swal.fire("Gagal menyimpan", err.message, "error");
            }
          }
        });
      });
    }
  }

  // Render custom HTML/CSS responsive bar chart to prevent canvas graphics feedback and GPU tearing in iframes
  const chartContainer = document.getElementById("cashFlowChartContainer");
  if (chartContainer) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const monthlyDataIn = Array(12).fill(0);
    const monthlyDataOut = Array(12).fill(0);

    approvedFunds.forEach((f: any) => {
      if (f.date) {
        let dateObj;
        if (f.date.toDate) dateObj = f.date.toDate();
        else dateObj = new Date(f.date);
        const m = dateObj.getMonth();
        if (f.type === "in") {
          monthlyDataIn[m] += (f.amount || 0);
        } else {
          monthlyDataOut[m] += (f.amount || 0);
        }
      }
    });

    const currentMonth = new Date().getMonth();
    const displayMonths = [];
    const displayIn = [];
    const displayOut = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonth - i + 12) % 12;
      displayMonths.push(months[idx]);
      displayIn.push(monthlyDataIn[idx]);
      displayOut.push(monthlyDataOut[idx]);
    }

    const maxVal = Math.max(...displayIn, ...displayOut, 1000);

    const formatCompactRupiah = (val: number): string => {
      if (val >= 1000000) {
        return `Rp ${(val / 1000000).toFixed(1).replace(/\.0$/, "")}jt`;
      }
      if (val >= 1000) {
        return `Rp ${(val / 1000).toFixed(0)}rb`;
      }
      return `Rp ${val}`;
    };

    chartContainer.innerHTML = `
      <div class="flex flex-col w-full h-full justify-between select-none animate-fadeIn">
        <div class="flex-1 flex items-stretch gap-4 h-[190px]">
          <!-- Y-Axis Labels -->
          <div class="flex flex-col justify-between text-[10px] text-slate-400 font-mono w-14 pb-5 pt-2 border-r border-slate-800/50 pr-2">
            <span>${formatCompactRupiah(maxVal)}</span>
            <span>${formatCompactRupiah(maxVal / 2)}</span>
            <span>Rp 0</span>
          </div>
          
          <!-- Chart Columns -->
          <div class="flex-1 grid grid-cols-6 gap-2 md:gap-4 relative pb-5">
            <!-- Grid lines -->
            <div class="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none opacity-5">
              <div class="border-b border-white w-full"></div>
              <div class="border-b border-white w-full"></div>
              <div class="border-b border-white w-full"></div>
            </div>
            
            ${displayMonths.map((m, idx) => {
              const valIn = displayIn[idx];
              const valOut = displayOut[idx];
              // Cap visual height to min 4% if has value so it doesn't look empty, and max 100%
              const pctIn = valIn > 0 ? Math.min(100, Math.max(4, (valIn / maxVal) * 100)) : 0;
              const pctOut = valOut > 0 ? Math.min(100, Math.max(4, (valOut / maxVal) * 100)) : 0;
              
              return `
                <div class="flex flex-col justify-end items-center h-full relative group">
                  <div class="flex items-end gap-1 md:gap-1.5 h-full w-full justify-center">
                    <!-- Bar In -->
                    <div class="w-3 md:w-5 bg-emerald-500/85 hover:bg-emerald-400 rounded-t-md transition-all duration-300 relative cursor-pointer" 
                         style="height: ${pctIn}%">
                      <!-- Custom Tooltip -->
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-30 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap">
                        Masuk: ${formatRupiah(valIn)}
                      </div>
                    </div>
                    
                    <!-- Bar Out -->
                    <div class="w-3 md:w-5 bg-rose-500/85 hover:bg-rose-400 rounded-t-md transition-all duration-300 relative cursor-pointer" 
                         style="height: ${pctOut}%">
                      <!-- Custom Tooltip -->
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-30 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap">
                        Keluar: ${formatRupiah(valOut)}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Month Label -->
                  <span class="absolute bottom-0 text-[10px] md:text-xs font-semibold text-slate-400 font-mono">${m}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
        
        <!-- Legend -->
        <div class="flex items-center justify-center gap-6 mt-1 text-[11px] font-medium">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
            <span class="text-slate-400">Kas Masuk</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
            <span class="text-slate-400">Kas Keluar</span>
          </div>
        </div>
      </div>
    `;
  }

  // Live updates of countdowns
  const interval = setInterval(() => {
    const elGrad = document.getElementById("cd-grad");
    const elUkk = document.getElementById("cd-ukk");
    const elPkl = document.getElementById("cd-pkl");
    const elPerpisahan = document.getElementById("cd-perpisahan");

    if (elGrad) elGrad.innerText = getCountdownString(milestoneGraduation);
    if (elUkk) elUkk.innerText = getCountdownString(milestoneUKK);
    if (elPkl) elPkl.innerText = getCountdownString(milestonePKL);
    if (elPerpisahan) elPerpisahan.innerText = getCountdownString(milestonePerpisahan);

    if (!elGrad && !elUkk && !elPkl && !elPerpisahan) {
      clearInterval(interval);
    }
  }, 1000 * 60); // Refresh every minute

  // Live network ping diagnostics (TKJ style - safe simulation)
  const updatePingMetric = async () => {
    const elPing = document.getElementById("dash-ping");
    if (!elPing) return;
    try {
      // Safe, lightweight local timing calculation
      const t0 = performance.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8 + 5));
      const t1 = performance.now();
      elPing.innerText = `${Math.round(t1 - t0)} ms`;
    } catch {
      elPing.innerText = "Offline";
    }
  };
  updatePingMetric();

  // Notification activation listener
  const enableNotifBtn = document.getElementById("enableNotifBtn");
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener("click", async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const banner = document.getElementById("notifPermissionBanner");
        if (banner) {
          banner.style.display = "none";
        }
      }
    });
  }
}
