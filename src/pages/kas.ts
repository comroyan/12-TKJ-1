import { 
  getClassFunds, 
  addClassFundEntry, 
  updateClassFundStatus, 
  deleteClassFundEntry,
  getEventFunds,
  addEventFundEntry,
  updateEventFundStatus,
  deleteEventFundEntry,
  getStudentUsers,
  getSystemSettings,
  updateSystemSettings
} from "../firebase/db";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { formatRupiah, formatDate, renderIcons, toast, confirmDialog, exportToCSV, printPDF, uploadFileToServer } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderKas(container: HTMLElement, userSession: any) {
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

  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat modul keuangan...</span>
    </div>
  `;

  // Weekly iuran settings rate (default to Rp 5,000)
  let weeklyIuranRate = parseInt(localStorage.getItem("config_weekly_iuran") || "5000");
  let activeTab = "matrix"; // default to the newly improved smart ledger!
  
  const todayDate = new Date();
  let selectedYear = todayDate.getFullYear();
  let selectedMonth = todayDate.getMonth(); // 0-11
  let studentSearchQuery = "";

  async function loadAndRender() {
    const [funds, eventFunds, allUsers, systemSettings] = await Promise.all([
      getClassFunds(),
      getEventFunds(),
      getStudentUsers(),
      getSystemSettings()
    ]);

    const students = allUsers.filter((s: any) => !isTeacher(s));

    if (systemSettings && systemSettings.weeklyIuranRate !== undefined) {
      weeklyIuranRate = systemSettings.weeklyIuranRate;
    }

    const isTreasurer = userSession.role === "Super Admin" || userSession.role === "Bendahara";

    // Regular Class Fund math (approved/confirmed transactions only)
    const approvedFunds = funds.filter((f: any) => f.status === "approved" || !f.status);
    const totalIn = approvedFunds.filter((f: any) => f.type === "in").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
    const totalOut = approvedFunds.filter((f: any) => f.type === "out").reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
    const regularBalance = totalIn - totalOut;

    // Special Event Funds math
    const approvedEvents = eventFunds.filter((f: any) => f.status === "approved");
    const eventBalance = approvedEvents.reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);

    // Calculate Payment status of each student for THIS CURRENT week (real-time)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Mon
    startOfWeek.setHours(0,0,0,0);

    const paidSidsThisWeek = new Set(
      approvedFunds
        .filter((f: any) => {
          if (f.type !== "in" || !f.date) return false;
          const entryDate = f.date.toDate ? f.date.toDate() : new Date(f.date);
          return entryDate >= startOfWeek;
        })
        .map((f: any) => f.userId)
    );

    // Dynamic ledger setup for the SELECTED Month and Year
    const monthNamesIndo = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const selectedMonthName = monthNamesIndo[selectedMonth];

    // Compute the days & weeks for the selected month
    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const weeksOfSelectedMonth: { weekNum: number; label: string; startDay: number; endDay: number; startDate: Date; endDate: Date }[] = [];

    const weekRanges = [
      { num: 1, start: 1, end: 7 },
      { num: 2, start: 8, end: 14 },
      { num: 3, start: 15, end: 21 },
      { num: 4, start: 22, end: 28 }
    ];
    if (totalDaysInMonth >= 29) {
      weeksOfSelectedMonth.push(...weekRanges.map(w => ({
        weekNum: w.num,
        label: `Minggu ${w.num} (${w.start}-${w.end} ${selectedMonthName.substring(0,3)})`,
        startDay: w.start,
        endDay: w.end,
        startDate: new Date(selectedYear, selectedMonth, w.start, 0, 0, 0, 0),
        endDate: new Date(selectedYear, selectedMonth, w.end, 23, 59, 59, 999)
      })));
      weeksOfSelectedMonth.push({
        weekNum: 5,
        label: `Minggu 5 (29-${totalDaysInMonth} ${selectedMonthName.substring(0,3)})`,
        startDay: 29,
        endDay: totalDaysInMonth,
        startDate: new Date(selectedYear, selectedMonth, 29, 0, 0, 0, 0),
        endDate: new Date(selectedYear, selectedMonth, totalDaysInMonth, 23, 59, 59, 999)
      });
    } else {
      weeksOfSelectedMonth.push(...weekRanges.map(w => ({
        weekNum: w.num,
        label: `Minggu ${w.num} (${w.start}-${w.num === 4 ? totalDaysInMonth : w.end} ${selectedMonthName.substring(0,3)})`,
        startDay: w.start,
        endDay: w.num === 4 ? totalDaysInMonth : w.end,
        startDate: new Date(selectedYear, selectedMonth, w.start, 0, 0, 0, 0),
        endDate: new Date(selectedYear, selectedMonth, w.num === 4 ? totalDaysInMonth : w.end, 23, 59, 59, 999)
      })));
    }

    // Filter funds for the selected year and month (including pending so they can be actioned/approved)
    const approvedOrPendingFundsForMonth = funds.filter((f: any) => {
      if (f.type !== "in" || f.status === "rejected") return false;
      if (!f.date) return false;
      const entryDate = f.date.toDate ? f.date.toDate() : new Date(f.date);
      return entryDate.getFullYear() === selectedYear && entryDate.getMonth() === selectedMonth;
    });

    // Match student IDs and week numbers to payments
    const studentPayments: { [studentId: string]: { [weekNum: number]: { paid: boolean; status: string; fundEntryId?: string; amount?: number } } } = {};

    students.forEach((s: any) => {
      studentPayments[s.id] = {};
      weeksOfSelectedMonth.forEach((w) => {
        studentPayments[s.id][w.weekNum] = { paid: false, status: "unpaid" };
      });
    });

    approvedOrPendingFundsForMonth.forEach((f: any) => {
      if (!f.userId) return;
      const entryDate = f.date.toDate ? f.date.toDate() : new Date(f.date);
      const day = entryDate.getDate();
      
      const week = weeksOfSelectedMonth.find(w => day >= w.startDay && day <= w.endDay);
      if (week && studentPayments[f.userId]) {
        studentPayments[f.userId][week.weekNum] = {
          paid: f.status === "approved" || !f.status,
          status: f.status || "approved",
          fundEntryId: f.id,
          amount: f.amount
        };
      }
    });

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn font-sans text-slate-100">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="dollar-sign" class="text-emerald-400 w-7 h-7"></i> Keuangan XII TKJ 1
            </h1>
            <p class="text-slate-400 text-xs mt-1">Pembukuan transparan uang kas bulanan, pengeluaran, iuran khusus acara, dan status pembayaran.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="exportCsvBtn" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all" title="Ekspor ke Excel/CSV">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
            </button>
            <button id="exportPdfBtn" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all" title="Cetak Laporan">
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
            ${isTreasurer ? `
              <button id="configIuranBtn" class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all" title="Pengaturan Iuran Mingguan">
                <i data-lucide="settings" class="w-4 h-4"></i>
              </button>
            ` : ""}
            <button id="addFundBtn" class="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-2xl shadow-md transition-all cursor-pointer">
              Catat Keuangan
            </button>
          </div>
        </div>

        <!-- Ledger Summary Balance Banner -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 glass rounded-3xl relative overflow-hidden bg-gradient-to-r from-slate-900 to-emerald-950/20 border border-emerald-500/20">
            <div class="absolute right-4 top-4 text-emerald-500/10"><i data-lucide="dollar-sign" class="w-20 h-20"></i></div>
            <span class="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">Saldo Uang Kas Kelas</span>
            <span class="text-3xl md:text-4xl font-extrabold text-white mt-1 block font-mono">${formatRupiah(regularBalance)}</span>
            <p class="text-xs text-slate-400 mt-2">Total Pemasukan: <strong class="text-emerald-400">${formatRupiah(totalIn)}</strong> | Total Pengeluaran: <strong class="text-rose-400">${formatRupiah(totalOut)}</strong></p>
          </div>

          <div class="p-6 glass rounded-3xl relative overflow-hidden bg-gradient-to-r from-slate-900 to-cyan-950/20 border border-cyan-500/20">
            <div class="absolute right-4 top-4 text-cyan-500/10"><i data-lucide="award" class="w-20 h-20"></i></div>
            <span class="text-xs text-cyan-400 font-semibold uppercase tracking-wider block">Saldo Dana Acara Khusus</span>
            <span class="text-3xl md:text-4xl font-extrabold text-white mt-1 block font-mono">${formatRupiah(eventBalance)}</span>
            <p class="text-xs text-slate-400 mt-2">Mencakup patungan study tour, hoodie, bukber, dan perpisahan.</p>
          </div>
        </div>

        <!-- Section Switcher Tabs -->
        <div class="flex flex-wrap border-b border-slate-800 gap-6">
          <button class="nav-tab-btn pb-3 text-sm font-semibold transition-colors ${activeTab === 'matrix' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400 hover:text-white'}" data-tab="matrix">Buku Iuran Kelas (Ledger)</button>
          <button class="nav-tab-btn pb-3 text-sm font-semibold transition-colors ${activeTab === 'regular' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-400 hover:text-white'}" data-tab="regular">Riwayat Buku Kas</button>
          <button class="nav-tab-btn pb-3 text-sm font-semibold transition-colors ${activeTab === 'events' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400 hover:text-white'}" data-tab="events">Iuran Acara</button>
          <button class="nav-tab-btn pb-3 text-sm font-semibold transition-colors ${activeTab === 'reports' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400 hover:text-white'}" data-tab="reports">Grafik & Laporan</button>
        </div>

        <!-- 1. TAB: REGULAR CASH (Riwayat Pembukuan Kas) -->
        ${activeTab === 'regular' ? `
          <div class="glass rounded-3xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/30">
              <h3 class="text-base font-bold text-white font-display">Riwayat Transaksi Uang Kas Kelas</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase bg-slate-950/30">
                    <th class="p-4">Tanggal</th>
                    <th class="p-4">Nama Siswa / Pengeluaran</th>
                    <th class="p-4">Deskripsi / Nota</th>
                    <th class="p-4">Jenis</th>
                    <th class="p-4">Jumlah</th>
                    <th class="p-4">Bukti</th>
                    <th class="p-4">Status</th>
                    ${isTreasurer ? `<th class="p-4 text-right">Aksi</th>` : ""}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  ${funds.length > 0 ? funds.map((f: any) => `
                    <tr class="hover:bg-slate-900/40 transition-colors">
                      <td class="p-4 font-mono text-xs text-slate-400">${formatDate(f.date)}</td>
                      <td class="p-4 font-semibold text-white">${f.studentName || "Belanja Kelas / Umum"}</td>
                      <td class="p-4 text-slate-300 text-xs">${f.description || "Uang Kas Mingguan"}</td>
                      <td class="p-4">
                        <span class="px-2 py-1 text-[10px] font-bold uppercase rounded-lg ${f.type === 'in' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                          ${f.type === 'in' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td class="p-4 font-bold ${f.type === 'in' ? 'text-emerald-400' : 'text-rose-400'} font-mono">${formatRupiah(f.amount)}</td>
                      <td class="p-4">
                        ${f.evidenceUrl ? `
                          <a href="${f.evidenceUrl}" target="_blank" class="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                            <i data-lucide="paperclip" class="w-3.5 h-3.5"></i> Lihat Bukti
                          </a>
                        ` : `<span class="text-xs text-slate-500 italic">Tanpa Bukti</span>`}
                      </td>
                      <td class="p-4">
                        <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          f.status === 'approved' || !f.status ? 'bg-emerald-500/10 text-emerald-400' : 
                          f.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                        }">
                          ${f.status || 'approved'}
                        </span>
                      </td>
                      ${isTreasurer ? `
                        <td class="p-4 text-right space-x-1">
                          ${f.status === 'pending' ? `
                            <button class="verifyFundBtn px-2.5 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all" data-id="${f.id}" data-status="approved">✓ Setuju</button>
                            <button class="verifyFundBtn px-2.5 py-1 text-xs font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 rounded-lg transition-all" data-id="${f.id}" data-status="rejected">✗ Tolak</button>
                          ` : ""}
                          <button class="deleteFundBtn p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-400 transition-colors" data-id="${f.id}">
                            <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                          </button>
                        </td>
                      ` : ""}
                    </tr>
                  `).join("") : `
                    <tr>
                      <td colspan="8" class="p-8 text-center text-slate-500">Belum ada transaksi kas kelas.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        ` : ""}

        <!-- 2. TAB: EVENT CASH -->
        ${activeTab === 'events' ? `
          <div class="glass rounded-3xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/30">
              <h3 class="text-base font-bold text-white font-display">Riwayat Iuran Khusus Kegiatan Acara</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase bg-slate-950/30">
                    <th class="p-4">Tanggal</th>
                    <th class="p-4">Nama Kegiatan</th>
                    <th class="p-4">Siswa Pembayar</th>
                    <th class="p-4">Jumlah Patungan</th>
                    <th class="p-4">Bukti TF</th>
                    <th class="p-4">Status</th>
                    ${isTreasurer ? `<th class="p-4 text-right">Aksi</th>` : ""}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  ${eventFunds.length > 0 ? eventFunds.map((ef: any) => `
                    <tr class="hover:bg-slate-900/40 transition-colors">
                      <td class="p-4 font-mono text-xs text-slate-400">${formatDate(ef.date)}</td>
                      <td class="p-4 font-bold text-white">${ef.eventName}</td>
                      <td class="p-4 text-slate-300 font-medium">${ef.studentName}</td>
                      <td class="p-4 font-bold text-cyan-400 font-mono">${formatRupiah(ef.amount)}</td>
                      <td class="p-4">
                        ${ef.evidenceUrl ? `
                          <a href="${ef.evidenceUrl}" target="_blank" class="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                            <i data-lucide="paperclip" class="w-3.5 h-3.5"></i> Lihat Bukti
                          </a>
                        ` : `<span class="text-xs text-slate-500 italic">Tanpa Bukti</span>`}
                      </td>
                      <td class="p-4">
                        <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          ef.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 
                          ef.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                        }">
                          ${ef.status}
                        </span>
                      </td>
                      ${isTreasurer ? `
                        <td class="p-4 text-right space-x-1">
                          ${ef.status === 'pending' ? `
                            <button class="verifyEventBtn px-2.5 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all" data-id="${ef.id}" data-status="approved">✓ Setuju</button>
                            <button class="verifyEventBtn px-2.5 py-1 text-xs font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 rounded-lg transition-all" data-id="${ef.id}" data-status="rejected">✗ Tolak</button>
                          ` : ""}
                          <button class="deleteEventBtn p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-400 transition-colors" data-id="${ef.id}">
                            <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                          </button>
                        </td>
                      ` : ""}
                    </tr>
                  `).join("") : `
                    <tr>
                      <td colspan="7" class="p-8 text-center text-slate-500">Belum ada iuran acara yang tercatat.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        ` : ""}

        <!-- 3. TAB: SMART LEDGER MATRIX (Buku Iuran Kelas Tinggal Centang) -->
        ${activeTab === 'matrix' ? (() => {
          // Filter & sorting students
          const filteredStudents = students.filter((s: any) => 
            s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
            (s.absen && String(s.absen).includes(studentSearchQuery))
          );
          filteredStudents.sort((a: any, b: any) => (a.absen || 0) - (b.absen || 0));

          return `
            <div class="space-y-6">
              <!-- Smart Filter & Month Navigation Bar -->
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900/60 rounded-3xl border border-slate-800">
                <div class="flex flex-wrap items-center gap-2.5">
                  <div class="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1.5 rounded-2xl border border-slate-850">
                    <!-- Previous Month button -->
                    <button id="prevMonthBtn" class="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-cyan-400 transition-all cursor-pointer">
                      <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </button>
                    <!-- Month Selector Dropdown -->
                    <select id="ledgerMonthSelect" class="bg-transparent border-none text-white text-xs font-bold py-1 px-2.5 outline-none cursor-pointer">
                      ${monthNamesIndo.map((m, idx) => `<option value="${idx}" ${selectedMonth === idx ? "selected" : ""} class="bg-slate-900">${m}</option>`).join("")}
                    </select>
                    <!-- Year Selector Dropdown -->
                    <select id="ledgerYearSelect" class="bg-transparent border-none text-white text-xs font-bold py-1 px-2.5 outline-none cursor-pointer">
                      ${[2025, 2026, 2027].map(y => `<option value="${y}" ${selectedYear === y ? "selected" : ""} class="bg-slate-900">${y}</option>`).join("")}
                    </select>
                    <!-- Next Month button -->
                    <button id="nextMonthBtn" class="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-cyan-400 transition-all cursor-pointer">
                      <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                  </div>
                  <span class="text-[11px] font-mono font-medium text-slate-400 bg-cyan-950/20 border border-cyan-500/10 px-3 py-2 rounded-2xl">
                    Tarif Mingguan: <strong class="text-cyan-400">${formatRupiah(weeklyIuranRate)}</strong>
                  </span>
                </div>

                <!-- Ledger Live Search -->
                <div class="flex items-center gap-2.5 px-3 py-2.5 bg-slate-950/80 border border-slate-850 rounded-2xl max-w-xs w-full">
                  <i data-lucide="search" class="w-4 h-4 text-slate-500"></i>
                  <input type="text" id="ledgerSearchInput" placeholder="Cari nama / absen siswa..." class="w-full bg-transparent text-xs border-none outline-none text-white placeholder-slate-600" value="${studentSearchQuery}">
                </div>
              </div>

              <!-- Interactive Ledger Book Grid -->
              <div class="glass rounded-3xl overflow-hidden border border-slate-850 shadow-2xl">
                <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 class="text-base font-bold text-white font-display">Buku Ledger Absensi & Iuran Uang Kas</h3>
                    <p class="text-xs text-slate-400 mt-1">
                      ${isTreasurer ? `
                        <span class="text-emerald-400 font-bold">Mode Bendahara</span>: Klik cell kosong untuk centang instan (Lunas), klik cell hijau untuk menghapus.
                      ` : `
                        <span class="text-cyan-400 font-bold">Siswa</span>: Klik cell Minggu kosong milik Anda sendiri untuk setor bukti transfer.
                      `}
                    </p>
                  </div>
                  <div class="flex items-center gap-3 text-xs">
                    <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Lunas</span>
                    <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Pending</span>
                    <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded border border-slate-700"></span> Belum Bayar</span>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr class="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold text-[11px] uppercase font-mono tracking-wider">
                        <th class="p-4 w-16 text-center">No</th>
                        <th class="p-4 min-w-[200px]">Nama Siswa</th>
                        ${weeksOfSelectedMonth.map(w => `
                          <th class="p-4 text-center">
                            <span class="block text-white font-extrabold text-xs">M${w.weekNum}</span>
                            <span class="block text-[9px] text-slate-500 font-normal mt-0.5">${w.startDay}-${w.endDay} ${selectedMonthName.substring(0,3)}</span>
                          </th>
                        `).join("")}
                        <th class="p-4 text-center w-28">Status Bulan ini</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-850 bg-slate-950/10">
                      ${filteredStudents.length > 0 ? filteredStudents.map((s: any) => {
                        let weeksPaidCount = 0;
                        weeksOfSelectedMonth.forEach(w => {
                          if (studentPayments[s.id]?.[w.weekNum]?.paid) {
                            weeksPaidCount++;
                          }
                        });
                        const totalWeeks = weeksOfSelectedMonth.length;
                        const progressPercent = Math.round((weeksPaidCount / totalWeeks) * 100);
                        const isSelf = s.id === userSession.uid;

                        return `
                          <tr class="transition-all duration-200 ${isSelf ? 'bg-cyan-950/20 border-l-2 border-l-cyan-400' : 'hover:bg-slate-900/30'}">
                            <!-- Absen Num -->
                            <td class="p-4 text-center font-mono text-xs ${isSelf ? 'text-cyan-400 font-black' : 'text-slate-400'}">
                              #${String(s.absen || 0).padStart(2, "0")}
                            </td>

                            <!-- Student Identity with custom initial letter badge -->
                            <td class="p-4">
                              <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${isSelf ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'bg-slate-800 text-slate-300'}">
                                  ${s.name.charAt(0).toUpperCase()}
                                </div>
                                <div class="max-w-[170px] truncate">
                                  <span class="text-xs font-bold block ${isSelf ? 'text-cyan-300' : 'text-white'} truncate" title="${s.name}">${s.name}</span>
                                  ${isSelf ? `<span class="px-1.5 py-0.2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[8px] font-bold uppercase rounded font-mono tracking-wide block w-max mt-0.5">Akun Saya</span>` : `<span class="text-[9px] text-slate-500 block">Siswa</span>`}
                                </div>
                              </div>
                            </td>

                            <!-- Dynamic Weekly cells with Checkboxes -->
                            ${weeksOfSelectedMonth.map(w => {
                              const pay = studentPayments[s.id]?.[w.weekNum] || { paid: false, status: "unpaid" };
                              
                              let cellClass = "";
                              let innerHTML = "";
                              
                              if (pay.status === "approved" || pay.status === "paid") {
                                cellClass = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-inner hover:bg-emerald-500/20";
                                innerHTML = `
                                  <div class="flex flex-col items-center justify-center gap-0.5">
                                    <span class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-md shadow-emerald-500/30">✓</span>
                                    <span class="text-[8px] font-mono font-bold text-emerald-500/80">${formatRupiah(pay.amount || weeklyIuranRate)}</span>
                                  </div>
                                `;
                              } else if (pay.status === "pending") {
                                cellClass = "border-amber-500/20 bg-amber-500/10 text-amber-400 animate-pulse hover:bg-amber-500/20";
                                innerHTML = `
                                  <div class="flex flex-col items-center justify-center gap-0.5">
                                    <span class="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-md shadow-amber-500/30">⏳</span>
                                    <span class="text-[7px] font-sans font-bold text-amber-500/80 uppercase">Pending</span>
                                  </div>
                                `;
                              } else {
                                // UNPAID
                                cellClass = "border-slate-800 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-600";
                                
                                if (isSelf) {
                                  innerHTML = `
                                    <div class="flex flex-col items-center justify-center py-1">
                                      <span class="px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[8px] rounded uppercase tracking-wider transition-all scale-95 group-hover:scale-100 flex items-center gap-0.5">
                                        <i data-lucide="upload-cloud" class="w-2.5 h-2.5"></i> Bayar
                                      </span>
                                      <span class="text-[8px] font-mono text-slate-500 mt-1">${formatRupiah(weeklyIuranRate)}</span>
                                    </div>
                                  `;
                                } else {
                                  innerHTML = `
                                    <div class="flex flex-col items-center justify-center group-hover:scale-105 transition-all">
                                      <div class="w-4.5 h-4.5 rounded border border-slate-700 group-hover:border-slate-600 flex items-center justify-center text-transparent text-[10px] font-bold">
                                        ✓
                                      </div>
                                      <span class="text-[8px] font-mono text-slate-500 mt-1">${formatRupiah(weeklyIuranRate)}</span>
                                    </div>
                                  `;
                                }
                              }

                              return `
                                <td class="p-2 text-center">
                                  <button class="ledger-cell-btn w-full py-2 rounded-2xl border transition-all duration-300 flex items-center justify-center cursor-pointer group ${cellClass}"
                                          data-sid="${s.id}" 
                                          data-sname="${s.name}" 
                                          data-week="${w.weekNum}" 
                                          data-startday="${w.startDay}" 
                                          data-endday="${w.endDay}"
                                          data-status="${pay.status}"
                                          data-entryid="${pay.fundEntryId || ''}">
                                    ${innerHTML}
                                  </button>
                                </td>
                              `;
                            }).join("")}

                            <!-- Progress Meter -->
                            <td class="p-4 text-center">
                              <div class="flex flex-col items-center gap-1">
                                <span class="text-xs font-bold ${weeksPaidCount === totalWeeks ? 'text-emerald-400' : weeksPaidCount > 0 ? 'text-cyan-400' : 'text-slate-500'} font-mono">
                                  ${weeksPaidCount}/${totalWeeks} M
                                </span>
                                <div class="w-16 h-1.5 bg-slate-850 rounded-full overflow-hidden">
                                  <div class="h-full bg-gradient-to-r ${weeksPaidCount === totalWeeks ? 'from-emerald-500 to-teal-500' : 'from-cyan-500 to-blue-500'} rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        `;
                      }).join("") : `
                        <tr>
                          <td colspan="${weeksOfSelectedMonth.length + 3}" class="p-12 text-center text-slate-500 text-xs">
                            Tidak ada siswa yang cocok dengan kriteria pencarian Anda.
                          </td>
                        </tr>
                      `}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        })() : ""}

        <!-- 4. TAB: AUTOMATIC REPORTS & ARUS KAS SVG GRAPH -->
        ${activeTab === 'reports' ? `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: SVG Flow Chart -->
            <div class="lg:col-span-2 p-6 glass rounded-3xl space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Grafik Arus Kas (Pemasukan vs Pengeluaran)</h3>
              
              <!-- Clean SVG bar charts representing current vs overall -->
              <div class="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 flex flex-col justify-between h-64">
                <div class="flex-1 flex items-end justify-around gap-6 h-40">
                  <!-- Pemasukan bar -->
                  <div class="flex flex-col items-center gap-2 w-full max-w-[80px]">
                    <span class="text-[10px] font-mono text-emerald-400 font-bold">${formatRupiah(totalIn)}</span>
                    <div class="w-full bg-emerald-500 rounded-t-xl transition-all duration-1000" style="height: 120px"></div>
                    <span class="text-xs text-slate-400">Pemasukan</span>
                  </div>

                  <!-- Pengeluaran bar -->
                  <div class="flex flex-col items-center gap-2 w-full max-w-[80px]">
                    <span class="text-[10px] font-mono text-rose-400 font-bold">${formatRupiah(totalOut)}</span>
                    <div class="w-full bg-rose-500 rounded-t-xl transition-all duration-1000" style="height: ${totalIn > 0 ? Math.round((totalOut / totalIn) * 120) : 10}px"></div>
                    <span class="text-xs text-slate-400">Pengeluaran</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Laporan Bulanan Rinci -->
            <div class="p-6 glass rounded-3xl space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Laporan Bulanan Transparan</h3>
              <div class="space-y-3 text-xs">
                <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <span class="text-slate-400 block font-semibold uppercase">Total Dana Terkumpul</span>
                  <span class="text-lg font-bold text-white mt-1 block font-mono">${formatRupiah(totalIn)}</span>
                </div>
                <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <span class="text-slate-400 block font-semibold uppercase">Total Belanja Kelas</span>
                  <span class="text-lg font-bold text-white mt-1 block font-mono">${formatRupiah(totalOut)}</span>
                </div>
                <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <span class="text-emerald-400 block font-bold uppercase">Kas Bersih Saat Ini</span>
                  <span class="text-xl font-extrabold text-white mt-1 block font-mono">${formatRupiah(regularBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        ` : ""}
      </div>
    `;

    renderIcons();

    // Attach Tab Event Listeners
    document.querySelectorAll(".nav-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        loadAndRender();
      });
    });

    // Ledger Dropdowns (Month & Year selectors)
    const ledgerMonthSelect = document.getElementById("ledgerMonthSelect") as HTMLSelectElement;
    if (ledgerMonthSelect) {
      ledgerMonthSelect.addEventListener("change", () => {
        selectedMonth = parseInt(ledgerMonthSelect.value);
        loadAndRender();
      });
    }

    const ledgerYearSelect = document.getElementById("ledgerYearSelect") as HTMLSelectElement;
    if (ledgerYearSelect) {
      ledgerYearSelect.addEventListener("change", () => {
        selectedYear = parseInt(ledgerYearSelect.value);
        loadAndRender();
      });
    }

    // Previous/Next Month Navigation Arrow Buttons
    const prevMonthBtn = document.getElementById("prevMonthBtn");
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener("click", () => {
        if (selectedMonth === 0) {
          selectedMonth = 11;
          selectedYear--;
        } else {
          selectedMonth--;
        }
        loadAndRender();
      });
    }

    const nextMonthBtn = document.getElementById("nextMonthBtn");
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener("click", () => {
        if (selectedMonth === 11) {
          selectedMonth = 0;
          selectedYear++;
        } else {
          selectedMonth++;
        }
        loadAndRender();
      });
    }

    // Ledger Live Search filter
    const ledgerSearchInput = document.getElementById("ledgerSearchInput") as HTMLInputElement;
    if (ledgerSearchInput) {
      ledgerSearchInput.addEventListener("input", () => {
        studentSearchQuery = ledgerSearchInput.value;
        // Re-render internally (faster than database trip)
        loadAndRender();
      });
    }

    // Ledger Interactive Checkbox / Cell Clicking Handler
    document.querySelectorAll(".ledger-cell-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const studentId = btn.dataset.sid;
        const studentName = btn.dataset.sname;
        const weekNum = parseInt(btn.dataset.week);
        const startDay = parseInt(btn.dataset.startday);
        const endDay = parseInt(btn.dataset.endday);
        const paidStatus = btn.dataset.status; // 'unpaid', 'pending', 'approved'
        const fundEntryId = btn.dataset.entryid;

        if (!isTreasurer) {
          // If NOT treasurer, students can only click to pay THEIR OWN unpaid cell
          if (studentId === userSession.uid) {
            if (paidStatus === "unpaid") {
              triggerQuickPayment(weekNum, startDay, endDay);
            } else if (paidStatus === "pending") {
              toast.info("Pembayaran kas Anda sedang ditinjau oleh Bendahara.");
            } else {
              toast.success("Anda sudah melunasi iuran kas untuk minggu ini!");
            }
          } else {
            toast.info(`Hanya Bendahara yang bisa mengedit pembayaran ${studentName}.`);
          }
          return;
        }

        // --- TREASURER ACTIONS (Tinggal Centang) ---
        if (paidStatus === "approved" || paidStatus === "paid") {
          // Double-check to remove/delete payment
          const confirm = await confirmDialog(
            "Hapus Catatan Pembayaran",
            `Hapus catatan iuran ${studentName} untuk Minggu ${weekNum} (${selectedMonthName} ${selectedYear})?`
          );
          if (confirm) {
            try {
              await deleteClassFundEntry(fundEntryId);
              toast.success(`Pembayaran ${studentName} Minggu ${weekNum} berhasil dihapus.`);
              loadAndRender();
            } catch (err: any) {
              toast.error(err.message);
            }
          }
        } else if (paidStatus === "pending") {
          // Quick dialog to approve or reject pending submission
          Swal.fire({
            title: "Tinjau Bukti Iuran",
            text: `Setujui iuran kas masuk dari ${studentName} untuk Minggu ${weekNum}?`,
            icon: "question",
            background: "#0f172a",
            color: "#f8fafc",
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: "✓ Setujui (Lunas)",
            denyButtonText: "✗ Tolak",
            cancelButtonText: "Batal",
            confirmButtonColor: "#10b981",
            denyButtonColor: "#ef4444",
            cancelButtonColor: "#334155"
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await updateClassFundStatus(fundEntryId, "approved", userSession.name);
                toast.success(`Iuran ${studentName} disetujui!`);
                loadAndRender();
              } catch (err: any) {
                toast.error(err.message);
              }
            } else if (result.isDenied) {
              try {
                await updateClassFundStatus(fundEntryId, "rejected", userSession.name);
                toast.success(`Iuran ${studentName} ditolak.`);
                loadAndRender();
              } catch (err: any) {
                toast.error(err.message);
              }
            }
          });
        } else {
          // UNPAID CELL -> Prompt for nominal first so they can change/customize it!
          Swal.fire({
            title: `Catat Iuran M${weekNum}`,
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="text-left space-y-3 text-xs mt-4 font-sans">
                <p class="text-slate-400">Catat pembayaran iuran untuk <strong>${studentName}</strong> pada Minggu ${weekNum} (${selectedMonthName} ${selectedYear}).</p>
                <div>
                  <label class="block font-semibold mb-1 text-slate-400">Nominal Pembayaran (Rupiah)</label>
                  <input type="number" id="manualCellAmount" value="${weeklyIuranRate}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "✓ Catat Lunas",
            cancelButtonText: "Batal",
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#334155",
            focusConfirm: true,
            preConfirm: () => {
              const amountVal = (document.getElementById("manualCellAmount") as HTMLInputElement).value;
              const parsed = parseInt(amountVal);
              if (isNaN(parsed) || parsed <= 0) {
                Swal.showValidationMessage("Harap masukkan nominal yang valid!");
                return false;
              }
              return parsed;
            }
          }).then(async (result) => {
            if (result.isConfirmed) {
              const paymentAmount = result.value;
              try {
                // Place the timestamp accurately inside that week's dates
                const currentDay = new Date().getDate();
                let paymentDay = Math.round((startDay + endDay) / 2);
                // If today matches the selected month and is within the week, use today's date
                if (new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear && currentDay >= startDay && currentDay <= endDay) {
                  paymentDay = currentDay;
                }
                
                const customDate = new Date(selectedYear, selectedMonth, paymentDay, 12, 0, 0, 0);

                toast.info(`Mencatat iuran ${studentName}...`);
                await addClassFundEntry({
                  userId: studentId,
                  studentName: studentName,
                  amount: paymentAmount,
                  type: "in",
                  description: `Iuran Kas M${weekNum} (${selectedMonthName} ${selectedYear})`,
                  evidenceUrl: "",
                  status: "approved",
                  date: customDate
                });

                toast.success(`Lunas! Iuran ${studentName} Minggu ${weekNum} sebesar ${formatRupiah(paymentAmount)} dicatat.`);
                loadAndRender();
              } catch (err: any) {
                toast.error(err.message);
              }
            }
          });
        }
      });
    });

    // Student Quick Payment Uploader
    const triggerQuickPayment = (weekNum: number, startDay: number, endDay: number) => {
      Swal.fire({
        title: `Setor Uang Kas M${weekNum}`,
        background: "#0f172a",
        color: "#f8fafc",
        html: `
          <div class="text-left space-y-4 text-xs mt-4 font-sans">
            <div class="p-3.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
              <p class="font-bold text-sm">Informasi Pembayaran:</p>
              <p class="mt-1">Iuran: <strong>Minggu ${weekNum} (${startDay}-${endDay} ${selectedMonthName} ${selectedYear})</strong></p>
              <p>Nominal Standar: <strong>${formatRupiah(weeklyIuranRate)}</strong></p>
            </div>
            
            <div>
              <label class="block font-semibold mb-1 text-slate-400">Nominal Pembayaran (Rupiah)</label>
              <input type="number" id="quickAmount" value="${weeklyIuranRate}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
            </div>

            <div>
              <label class="block font-semibold mb-1 text-slate-400">Unggah Bukti Transfer / SS Chat Bendahara (Maks 4MB)</label>
              <input type="file" id="quickReceipt" accept="image/*,application/pdf" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer">
            </div>

            <div>
              <label class="block font-semibold mb-1 text-slate-400">Catatan Tambahan (Misal: E-Wallet Gopay/OVO)</label>
              <textarea id="quickDesc" placeholder="Contoh: TF via OVO" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs h-16 resize-none"></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Kirim Bukti",
        cancelButtonText: "Batal",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#334155",
        preConfirm: async () => {
          const fileInput = document.getElementById("quickReceipt") as HTMLInputElement;
          const file = fileInput?.files?.[0];
          const desc = (document.getElementById("quickDesc") as HTMLTextAreaElement).value.trim();
          const amountInput = document.getElementById("quickAmount") as HTMLInputElement;
          const amount = parseInt(amountInput?.value || "0") || weeklyIuranRate;

          let evidenceUrl = "";
          if (file) {
            toast.info("Mengunggah bukti...");
            const uploadResult = await uploadFileToServer(file);
            evidenceUrl = uploadResult.fileUrl;
          }

          return { evidenceUrl, desc, amount };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          const { evidenceUrl, desc, amount } = result.value;
          try {
            const paymentDate = new Date(selectedYear, selectedMonth, Math.round((startDay + endDay) / 2), 12, 0, 0, 0);

            await addClassFundEntry({
              userId: userSession.uid,
              studentName: userSession.name,
              amount: amount,
              type: "in",
              description: `Iuran Kas M${weekNum} (${selectedMonthName} ${selectedYear}) ${desc ? '- ' + desc : ''}`,
              evidenceUrl: evidenceUrl,
              status: "pending",
              date: paymentDate
            });
            toast.success("Bukti pembayaran dikirim! Mohon tunggu persetujuan Bendahara.");
            loadAndRender();
          } catch (err: any) {
            Swal.fire("Gagal", err.message, "error");
          }
        }
      });
    };

    // Configuration for Weekly Iuran Rate
    const configIuranBtn = document.getElementById("configIuranBtn");
    if (configIuranBtn) {
      configIuranBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Pengaturan Iuran Mingguan",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left font-sans text-xs">
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Tarif Iuran Mingguan (Rupiah)</label>
                <input type="number" id="swWeeklyRate" value="${weeklyIuranRate}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: "#06b6d4",
          confirmButtonText: "Simpan Pengaturan",
          cancelButtonText: "Batal",
          preConfirm: () => {
            const val = parseInt((document.getElementById("swWeeklyRate") as HTMLInputElement).value);
            if (isNaN(val) || val < 0) {
              Swal.showValidationMessage("Tarif iuran harus valid!");
              return false;
            }
            return { val };
          }
        }).then(async (res) => {
          if (res.isConfirmed) {
            weeklyIuranRate = res.value.val;
            localStorage.setItem("config_weekly_iuran", weeklyIuranRate.toString());
            try {
              await updateSystemSettings({ weeklyIuranRate });
              toast.success("Pengaturan iuran berhasil disimpan secara global!");
            } catch (err: any) {
              toast.error("Gagal menyimpan iuran global: " + err.message);
            }
            loadAndRender();
          }
        });
      });
    }

    // WA / Telegram Reminder simulator trigger
    document.querySelectorAll(".send-wa-reminder-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const studentName = btn.dataset.name;
        const rate = btn.dataset.rate;

        Swal.fire({
          icon: "info",
          title: "Simulasi Kirim Pengingat Jaringan",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="text-left text-xs leading-relaxed space-y-2">
              <p>Mengirim pesan otomatis pengingat iuran kas lewat bot WhatsApp/Telegram:</p>
              <div class="p-3 bg-slate-950 rounded-xl font-mono border border-slate-800 text-slate-300">
                "Halo <strong>${studentName}</strong>, ini pengingat ramah untuk pembayaran iuran uang kas XII TKJ 1 minggu ini sebesar <strong>${formatRupiah(parseInt(rate))}</strong>. Silakan setor ke Bendahara kelas atau upload bukti transfer di ClassHub! Terima kasih."
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Kirim Sekarang",
          confirmButtonColor: "#10b981",
          cancelButtonText: "Batal"
        }).then((res) => {
          if (res.isConfirmed) {
            toast.success(`Berhasil mengirimkan notifikasi reminder ke ${studentName}!`);
          }
        });
      });
    });

    // Verification listeners
    document.querySelectorAll(".verifyFundBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.status;
        try {
          await updateClassFundStatus(id, status, userSession.name);
          toast.success(`Transaksi kas dikonfirmasi: ${status}`);
          loadAndRender();
        } catch (e: any) {
          Swal.fire("Error", e.message, "error");
        }
      });
    });

    document.querySelectorAll(".deleteFundBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Transaksi Kas", "Hapus transaksi ini secara permanen dari kas?");
        if (confirm) {
          try {
            await deleteClassFundEntry(id);
            toast.success("Transaksi terhapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    document.querySelectorAll(".verifyEventBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.status;
        try {
          await updateEventFundStatus(id, status);
          toast.success(`Iuran acara dikonfirmasi: ${status}`);
          loadAndRender();
        } catch (e: any) {
          Swal.fire("Error", e.message, "error");
        }
      });
    });

    document.querySelectorAll(".deleteEventBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Iuran Acara", "Hapus iuran patungan acara ini?");
        if (confirm) {
          try {
            await deleteEventFundEntry(id);
            toast.success("Transaksi terhapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Add Fund / Record Payment
    const addFundBtn = document.getElementById("addFundBtn") as HTMLButtonElement;
    if (addFundBtn) {
      addFundBtn.addEventListener("click", () => {
        const isSAdminOrTreas = userSession.role === "Super Admin" || userSession.role === "Bendahara";

        Swal.fire({
          title: "Catat Pembayaran / Kas Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans text-xs">
              <div>
                <label class="block font-semibold mb-1 text-slate-400">Kategori Keuangan</label>
                <select id="fCategory" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                  <option value="kas_regular">Uang Kas Kelas Bulanan</option>
                  <option value="kas_acara">Dana Patungan Kegiatan Acara</option>
                </select>
              </div>
              
              <div id="regularCashFields" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold mb-1 text-slate-400">Tipe Transaksi</label>
                    <select id="fType" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                      <option value="in">Kas Masuk (Iuran Siswa)</option>
                      ${isSAdminOrTreas ? `<option value="out">Kas Keluar (Belanja / Keperluan Kelas)</option>` : ""}
                    </select>
                  </div>
                  <div>
                    <label class="block font-semibold mb-1 text-slate-400">Jumlah Nominal (Rupiah)</label>
                    <input type="number" id="fAmount" value="${weeklyIuranRate}" placeholder="Contoh: 10000" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                  </div>
                </div>
                
                <div id="studentSelectWrapper">
                  <label class="block font-semibold mb-1 text-slate-400">Nama Siswa Pembayar</label>
                  <select id="fStudentUid" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                    ${isSAdminOrTreas ? `
                      <option value="">-- Pilihlah Siswa --</option>
                      ${students.map((s: any) => `<option value="${s.id}" data-name="${s.name}">${s.name} (Absen ${s.absen})</option>`).join("")}
                    ` : `
                      <option value="${userSession.uid}" data-name="${userSession.name}" selected>${userSession.name}</option>
                    `}
                  </select>
                </div>

                <div>
                  <label class="block font-semibold mb-1 text-slate-400">Unggah Bukti Transfer / Nota (Maks 4MB)</label>
                  <input type="file" id="fReceipt" accept="image/*,application/pdf" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20">
                </div>

                <div>
                  <label class="block font-semibold mb-1 text-slate-400">Catatan / Deskripsi Belanja</label>
                  <textarea id="fDesc" placeholder="Misalnya: Kas minggu ke-1, atau Beli spidol kelas" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-16 resize-none"></textarea>
                </div>
              </div>

              <!-- Event fields -->
              <div id="eventCashFields" class="space-y-4 hidden">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold mb-1 text-slate-400">Nama Kegiatan Acara</label>
                    <select id="fEventName" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                      <option value="Study Tour">Study Tour</option>
                      <option value="Buka Puasa Bersama">Buka Puasa Bersama (Bukber)</option>
                      <option value="Perpisahan">Uang Perpisahan Sekolah</option>
                      <option value="Kaos & Hoodie Kelas">Kaos & Hoodie XII TKJ 1</option>
                    </select>
                  </div>
                  <div>
                    <label class="block font-semibold mb-1 text-slate-400">Jumlah Iuran (Rp)</label>
                    <input type="number" id="fEventAmount" placeholder="Contoh: 50000" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                  </div>
                </div>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Kirim Kas",
          cancelButtonText: "Batal",
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#334155",
          didOpen: () => {
            const fCategory = document.getElementById("fCategory") as HTMLSelectElement;
            const regularFields = document.getElementById("regularCashFields") as HTMLDivElement;
            const eventFields = document.getElementById("eventCashFields") as HTMLDivElement;
            const fType = document.getElementById("fType") as HTMLSelectElement;
            const studentSelectWrapper = document.getElementById("studentSelectWrapper") as HTMLDivElement;

            fCategory.addEventListener("change", () => {
              if (fCategory.value === "kas_acara") {
                eventFields.classList.remove("hidden");
              } else {
                eventFields.classList.add("hidden");
              }
            });

            if (fType) {
              fType.addEventListener("change", () => {
                if (fType.value === "out") {
                  studentSelectWrapper.classList.add("hidden");
                } else {
                  studentSelectWrapper.classList.remove("hidden");
                }
              });
            }
          },
          preConfirm: async () => {
            const cat = (document.getElementById("fCategory") as HTMLSelectElement).value;
            const fileInput = document.getElementById("fReceipt") as HTMLInputElement;
            const file = fileInput?.files?.[0];

            let evidenceUrl = "";
            if (file) {
              toast.info("Mengunggah bukti transaksi...");
              const uploadResult = await uploadFileToServer(file);
              evidenceUrl = uploadResult.fileUrl;
            }

            if (cat === "kas_regular") {
              const type = (document.getElementById("fType") as HTMLSelectElement).value;
              const amount = parseFloat((document.getElementById("fAmount") as HTMLInputElement).value);
              const desc = (document.getElementById("fDesc") as HTMLTextAreaElement).value.trim();
              
              let studentName = "";
              let userId = "";

              if (type === "in") {
                const studentSelect = document.getElementById("fStudentUid") as HTMLSelectElement;
                userId = studentSelect.value;
                studentName = studentSelect.options[studentSelect.selectedIndex]?.dataset.name || "Siswa";
                if (!userId) {
                  Swal.showValidationMessage("Harap pilih siswa pembayar!");
                  return false;
                }
              }

              if (isNaN(amount) || amount <= 0) {
                Swal.showValidationMessage("Nominal kas harus valid!");
                return false;
              }

              return {
                category: "kas_regular",
                type,
                amount,
                description: desc,
                userId,
                studentName,
                evidenceUrl,
                status: isSAdminOrTreas ? "approved" : "pending"
              };
            } else {
              const eventName = (document.getElementById("fEventName") as HTMLSelectElement).value;
              const amount = parseFloat((document.getElementById("fEventAmount") as HTMLInputElement).value);
              const desc = (document.getElementById("fDesc") as HTMLTextAreaElement).value.trim();
              const studentSelect = document.getElementById("fStudentUid") as HTMLSelectElement;
              const userId = studentSelect.value;
              const studentName = studentSelect.options[studentSelect.selectedIndex]?.dataset.name || userSession.name;

              if (isNaN(amount) || amount <= 0) {
                Swal.showValidationMessage("Nominal iuran harus valid!");
                return false;
              }

              return {
                category: "kas_acara",
                eventId: eventName.replace(/\s+/g, "_").toLowerCase(),
                eventName,
                amount,
                userId,
                studentName,
                evidenceUrl,
                description: desc,
                status: isSAdminOrTreas ? "approved" : "pending"
              };
            }
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const val = result.value;
              if (val.category === "kas_regular") {
                await addClassFundEntry({
                  userId: val.userId,
                  studentName: val.studentName,
                  amount: val.amount,
                  type: val.type,
                  evidenceUrl: val.evidenceUrl,
                  description: val.description,
                  status: val.status
                });
              } else {
                await addEventFundEntry({
                  eventId: val.eventId,
                  eventName: val.eventName,
                  amount: val.amount,
                  userId: val.userId,
                  studentName: val.studentName,
                  evidenceUrl: val.evidenceUrl,
                  status: val.status
                });
              }
              toast.success("Catatan keuangan berhasil terkirim!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal menyimpan", err.message, "error");
            }
          }
        });
      });
    }

    // Exports Helpers
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
      const headers = ["Tanggal", "Nama Pembayar", "Keterangan", "Tipe", "Nominal", "Status"];
      const rows = funds.map((f: any) => [
        new Date(f.date?.toDate ? f.date.toDate() : f.date).toLocaleDateString(),
        f.studentName || "Umum",
        f.description || "Uang Kas",
        f.type === "in" ? "Masuk" : "Keluar",
        String(f.amount),
        f.status || "approved"
      ]);
      exportToCSV("Laporan_Kas_XII_TKJ_1", headers, rows);
      toast.success("Berhasil mengekspor Laporan Kas ke CSV!");
    });

    document.getElementById("exportPdfBtn")?.addEventListener("click", () => {
      const headers = ["Tanggal", "Nama Siswa", "Keterangan", "Tipe", "Nominal", "Status"];
      const rows = funds.map((f: any) => [
        new Date(f.date?.toDate ? f.date.toDate() : f.date).toLocaleDateString(),
        f.studentName || "Umum",
        f.description || "Uang Kas",
        f.type === "in" ? "Masuk" : "Keluar",
        formatRupiah(f.amount),
        f.status || "approved"
      ]);
      printPDF("Laporan Kas Transparan XII TKJ 1", headers, rows);
    });
  }

  loadAndRender();
}
