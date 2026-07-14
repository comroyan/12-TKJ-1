import { 
  getStudentUsers, 
  getClassFunds, 
  getTasks, 
  getAgendas, 
  getSchedules, 
  getPickets 
} from "../firebase/db";
import { formatRupiah, renderIcons } from "../utils/helpers";
import Chart from "chart.js/auto";

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

  // Fetch all dashboard relevant data in parallel
  const [students, funds, tasks, agendas, schedules, pickets] = await Promise.all([
    getStudentUsers(),
    getClassFunds(),
    getTasks(),
    getAgendas(),
    getSchedules(),
    getPickets()
  ]);

  // Calculate Cash Balance
  const approvedFunds = funds.filter((f: any) => f.status === "approved" || !f.status);
  const totalIn = approvedFunds.filter((f: any) => f.type === "in").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
  const totalOut = approvedFunds.filter((f: any) => f.type === "out").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
  const cashBalance = totalIn - totalOut;

  // Next lesson & picket calculation
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayDay = days[new Date().getDay()];
  const todaySchedules = (schedules.find((s: any) => s.id === todayDay) || { subjects: [] }) as any;
  const todayPickets = (pickets.find((p: any) => p.id === todayDay) || { members: [] }) as any;

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

  // Countdowns calculations (Target: Year 2026/2027 milestones)
  const milestoneGraduation = new Date("2027-05-15T08:00:00").getTime();
  const milestoneUKK = new Date("2027-02-20T08:00:00").getTime();
  const milestonePKL = new Date("2026-09-01T08:00:00").getTime();
  const milestonePerpisahan = new Date("2027-05-20T10:00:00").getTime();

  function getCountdownString(targetTime: number): string {
    const diff = targetTime - Date.now();
    if (diff <= 0) return "Selesai/Lewat";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} Hari ${hours} Jam`;
  }

  // Dashboard HTML
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 glass rounded-3xl relative overflow-hidden">
        <div class="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div>
          <h1 class="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Halo, ${userSession.name}! <span class="animate-bounce">👋</span>
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

      <!-- Quick Countdown Widgets Grid -->
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
            <div class="relative w-full h-72">
              <canvas id="cashFlowChart"></canvas>
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
                    <span class="w-1.5 h-1.5 rounded-full ${m.done ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}"></span>
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
        <div class="p-6 glass rounded-3xl flex flex-col justify-between relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/20">
          <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl"></div>
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
          <h3 class="text-lg font-bold font-display text-white flex items-center gap-2 mb-3">
            <i data-lucide="book-open" class="w-5 h-5 text-yellow-400"></i> Pelajaran Hari Ini (${todayDay})
          </h3>
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

  // Draw chart
  const canvas = document.getElementById("cashFlowChart") as HTMLCanvasElement;
  if (canvas) {
    // Collect monthly fund summary
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
    // Keep only last 6 months to make it gorgeous
    const displayMonths = [];
    const displayIn = [];
    const displayOut = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonth - i + 12) % 12;
      displayMonths.push(months[idx]);
      displayIn.push(monthlyDataIn[idx]);
      displayOut.push(monthlyDataOut[idx]);
    }

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: displayMonths,
        datasets: [
          {
            label: "Kas Masuk (Rp)",
            data: displayIn,
            backgroundColor: "rgba(16, 185, 129, 0.6)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: "Kas Keluar (Rp)",
            data: displayOut,
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#94a3b8", font: { family: "Inter" } }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8" }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8" }
          }
        }
      }
    });
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

  // Live network ping diagnostics (TKJ style)
  const updatePingMetric = async () => {
    const elPing = document.getElementById("dash-ping");
    if (!elPing) return;
    try {
      const t0 = performance.now();
      await fetch(window.location.origin, { method: "HEAD", cache: "no-store" });
      const t1 = performance.now();
      elPing.innerText = `${Math.round(t1 - t0)} ms`;
    } catch {
      elPing.innerText = "Offline";
    }
  };
  updatePingMetric();
}
