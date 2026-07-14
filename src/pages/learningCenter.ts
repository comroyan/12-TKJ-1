import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase/config";
import { renderIcons, toast, formatShortDate, confirmDialog, getApiUrl, uploadFileToServer } from "../utils/helpers";
import Swal from "sweetalert2";

// Topics for Materials & Bank Soal
const SUBJECTS = [
  "Administrasi Infrastruktur Jaringan (AIJ)",
  "Administrasi Sistem Jaringan (ASJ)",
  "Teknologi Jaringan Berbasis Luas (WAN)",
  "Sistem Keamanan Jaringan",
  "Produk Kreatif dan Kewirausahaan (PKK)",
  "Bahasa Inggris",
  "Matematika",
  "Pendidikan Jasmani & Kesehatan"
];

// Sample Quiz Questions for Bank Soal
const QUIZ_QUESTIONS: { [key: string]: { q: string; options: string[]; answer: number; explanation: string }[] } = {
  "Administrasi Infrastruktur Jaringan (AIJ)": [
    {
      q: "Jika sebuah IP address adalah 192.168.1.50/26, berapa jumlah host yang dapat digunakan pada subnet tersebut?",
      options: ["30 host", "62 host", "126 host", "254 host"],
      answer: 1,
      explanation: "Subnet mask /26 memiliki jumlah total IP = 2^(32-26) = 64. Jumlah host yang dapat digunakan adalah 64 - 2 = 62 host (dikurangi Network ID dan Broadcast ID)."
    },
    {
      q: "Protocol routing manakah yang termasuk dalam kategori Exterior Gateway Protocol (EGP)?",
      options: ["OSPF", "RIP", "EIGRP", "BGP"],
      answer: 3,
      explanation: "BGP (Border Gateway Protocol) adalah satu-satunya routing protocol yang masuk dalam kategori Exterior Gateway Protocol (EGP) yang digunakan untuk menghubungkan antar Autonomous System (AS)."
    },
    {
      q: "Port default yang digunakan oleh protokol SSH (Secure Shell) adalah...",
      options: ["Port 21", "Port 22", "Port 23", "Port 80"],
      answer: 1,
      explanation: "Protokol SSH secara default berjalan pada port 22 untuk komunikasi terenkripsi."
    }
  ],
  "Administrasi Sistem Jaringan (ASJ)": [
    {
      q: "Command manakah di Linux Debian yang digunakan untuk mengonfigurasi IP address secara permanen?",
      options: ["nano /etc/network/interfaces", "ifconfig eth0 192.168.1.1", "ip addr add 192.168.1.1/24 dev eth0", "nano /etc/resolv.conf"],
      answer: 0,
      explanation: "Di Debian, konfigurasi IP permanen disimpan di file '/etc/network/interfaces'. Perintah 'ifconfig' hanya bersifat sementara."
    },
    {
      q: "Web server default Apache menyimpan file konfigurasi utama di direktori...",
      options: ["/var/www/html", "/etc/apache2/apache2.conf", "/usr/share/apache2", "/etc/nginx/nginx.conf"],
      answer: 1,
      explanation: "Konfigurasi utama Apache2 pada sistem berbasis Debian/Ubuntu terletak di '/etc/apache2/apache2.conf'."
    }
  ],
  "Sistem Keamanan Jaringan": [
    {
      q: "Jenis serangan siber yang membanjiri lalu lintas server dengan paket data palsu hingga server crash dinamakan...",
      options: ["Phishing", "DDoS (Distributed Denial of Service)", "Man-in-the-Middle", "SQL Injection"],
      answer: 1,
      explanation: "DDoS adalah serangan siber dengan membanjiri trafik jaringan menggunakan banyak komputer zombie agar layanan server mati."
    },
    {
      q: "Apakah fungsi utama dari DMZ (Demilitarized Zone) dalam sistem keamanan jaringan?",
      options: [
        "Memblokir semua akses internet",
        "Menyediakan subnet aman khusus untuk server publik (web, mail) terpisah dari jaringan internal",
        "Mengeksport password router",
        "Mengenkripsi folder pengguna lokal secara gratis"
      ],
      answer: 1,
      explanation: "DMZ memberikan zona penyangga antara internet luar yang tidak aman dengan jaringan lokal dalam yang sangat rahasia, menempatkan server publik di sana."
    }
  ]
};

export async function renderLearningCenter(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Menghubungkan ke Learning Center...</span>
    </div>
  `;

  let activeTab = "materials"; // materials, quiz, summary, targets, pomodoro, stats, ai
  let searchMaterialQuery = "";
  let currentFilterSubject = "Semua";

  // Pomodoro States
  let pomodoroTimeLeft = 25 * 60;
  let pomodoroMaxTime = 25 * 60;
  let pomodoroInterval: any = null;
  let pomodoroIsRunning = false;
  let pomodoroMode = "work"; // work (25), break (5)
  let totalStudyMinutes = parseInt(localStorage.getItem(`study_mins_${userSession.uid}`) || "0");

  async function loadData() {
    try {
      // Fetch materials
      const matSnap = await getDocs(query(collection(db, "materials"), orderBy("createdAt", "desc")));
      const materials = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch bookmarks
      const bmarkSnap = await getDocs(query(collection(db, "bookmarks"), where("userId", "==", userSession.uid)));
      const bookmarks = bmarkSnap.docs.map(d => d.data().materialId);

      // Fetch quiz scores
      const scoreSnap = await getDocs(query(collection(db, "quizScores"), where("userId", "==", userSession.uid)));
      const quizScores = scoreSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      // Fetch study targets
      const targetSnap = await getDocs(query(collection(db, "studyTargets"), where("userId", "==", userSession.uid)));
      const studyTargets = targetSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      renderUI(materials, bookmarks, quizScores, studyTargets);
    } catch (err: any) {
      console.error(err);
      container.innerHTML = `<div class="p-6 text-red-400">Gagal memuat data: ${err.message}</div>`;
    }
  }

  function renderUI(materials: any[], bookmarks: any[], quizScores: any[], studyTargets: any[]) {
    const isTeacherOrAdmin = userSession.role === "Super Admin" || userSession.role === "Wakil" || userSession.role === "Sekretaris";

    const filteredMaterials = materials.filter((m: any) => {
      const matchSearch = m.title.toLowerCase().includes(searchMaterialQuery.toLowerCase()) || m.subject.toLowerCase().includes(searchMaterialQuery.toLowerCase());
      const matchSubject = currentFilterSubject === "Semua" || m.subject === currentFilterSubject;
      return matchSearch && matchSubject;
    });

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn text-slate-100 font-sans">
        <!-- Main Top Bar -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold font-display text-white flex items-center gap-2">
              <i data-lucide="book-open" class="w-7 h-7 text-cyan-400"></i> XII TKJ 1 Learning Center
            </h1>
            <p class="text-slate-400 text-xs mt-1">E-Learning terintegrasi untuk pendalaman teori kejuruan dan umum kelas.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'materials' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="materials">
              📚 Materi
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'quiz' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="quiz">
              📝 Bank Soal
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'summary' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="summary">
              📖 Ringkasan
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'targets' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="targets">
              🎯 Target
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'pomodoro' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="pomodoro">
              ⏳ Focus Timer
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'stats' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="stats">
              📊 Progress
            </button>
            <button class="tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'ai' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="ai">
              🤖 AI Belajar
            </button>
          </div>
        </div>

        <!-- Dynamic Tab Panel -->
        <div id="learningTabPanel" class="space-y-6">
          <!-- 1. TAB: MATERIALS -->
          ${activeTab === 'materials' ? `
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <!-- Left filter bar -->
              <div class="lg:col-span-1 space-y-4">
                <div class="p-5 glass rounded-2xl space-y-4">
                  <h3 class="text-sm font-bold text-white uppercase tracking-wider">Mata Pelajaran</h3>
                  <div class="space-y-1">
                    <button class="subject-filter-btn w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${currentFilterSubject === 'Semua' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-slate-800/40'}" data-subject="Semua">Semua Pelajaran</button>
                    ${SUBJECTS.map(subj => `
                      <button class="subject-filter-btn w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${currentFilterSubject === subj ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-slate-800/40'} truncate" data-subject="${subj}">${subj}</button>
                    `).join("")}
                  </div>
                </div>

                ${isTeacherOrAdmin ? `
                  <button id="addMaterialBtn" class="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <i data-lucide="plus" class="w-4 h-4"></i> Upload Materi
                  </button>
                ` : ""}
              </div>

              <!-- Right materials content -->
              <div class="lg:col-span-3 space-y-4">
                <div class="flex items-center gap-3 p-4 glass rounded-2xl">
                  <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
                  <input type="text" id="materialSearchInput" placeholder="Cari judul materi, topik atau mapel..." class="w-full bg-transparent text-sm border-none outline-none text-white placeholder-slate-600" value="${searchMaterialQuery}">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  ${filteredMaterials.length > 0 ? filteredMaterials.map((m: any) => {
                    const isBookmarked = bookmarks.includes(m.id);
                    return `
                      <div class="p-5 glass rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-cyan-500/30 transition-all relative group">
                        <div>
                          <div class="flex items-center justify-between mb-3">
                            <span class="px-2 py-1 text-[9px] font-bold font-mono rounded bg-slate-800 border border-slate-700 text-cyan-400 truncate max-w-[180px]">${m.subject}</span>
                            <div class="flex items-center gap-1">
                              <button class="bookmark-btn p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-amber-400 transition-colors" data-id="${m.id}" title="Bookmark">
                                <i data-lucide="${isBookmarked ? 'star-filled' : 'heart'}" class="w-4 h-4 ${isBookmarked ? 'text-amber-400 fill-amber-400' : ''}"></i>
                              </button>
                              ${isTeacherOrAdmin ? `
                                <button class="delete-material-btn p-1.5 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition-colors" data-id="${m.id}">
                                  <i data-lucide="trash2" class="w-4 h-4"></i>
                                </button>
                              ` : ""}
                            </div>
                          </div>
                          <h4 class="text-sm font-bold text-white line-clamp-2 leading-snug">${m.title}</h4>
                          <p class="text-xs text-slate-400 mt-2 line-clamp-2">${m.description || "Tidak ada deskripsi tambahan."}</p>
                        </div>

                        <div class="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between">
                          <span class="text-[10px] text-slate-500 font-mono">${formatShortDate(m.createdAt)}</span>
                          <a href="${m.url}" target="_blank" class="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5">
                            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Buka File
                          </a>
                        </div>
                      </div>
                    `;
                  }).join("") : `
                    <div class="col-span-2 py-12 text-center text-slate-500">
                      <p class="text-sm">Tidak ada materi pembelajaran yang ditemukan.</p>
                    </div>
                  `}
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 2. TAB: BANK SOAL -->
          ${activeTab === 'quiz' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Left selection -->
              <div class="lg:col-span-1 space-y-4">
                <div class="p-5 glass rounded-2xl space-y-4">
                  <h3 class="text-sm font-bold text-white uppercase tracking-wider">Pilih Latihan Soal</h3>
                  <div class="space-y-2">
                    ${Object.keys(QUIZ_QUESTIONS).map(subj => `
                      <button class="start-quiz-btn w-full p-4 text-left rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/20 transition-all flex flex-col justify-between" data-subject="${subj}">
                        <span class="text-xs text-cyan-400 font-bold font-mono uppercase mb-1">Latihan 1</span>
                        <span class="text-sm font-bold text-white">${subj}</span>
                        <span class="text-[10px] text-slate-500 mt-2">${QUIZ_QUESTIONS[subj].length} Soal • Pilihan Ganda • Timer</span>
                      </button>
                    `).join("")}
                  </div>
                </div>
              </div>

              <!-- Right history -->
              <div class="lg:col-span-2 p-5 glass rounded-2xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Riwayat Nilai Anda</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr class="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase bg-slate-950/30">
                        <th class="p-4">Tanggal</th>
                        <th class="p-4">Mata Pelajaran</th>
                        <th class="p-4">Skor</th>
                        <th class="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      ${quizScores.length > 0 ? quizScores.map((s: any) => `
                        <tr class="hover:bg-slate-900/40 transition-colors">
                          <td class="p-4 text-xs font-mono text-slate-400">${formatShortDate(s.timestamp)}</td>
                          <td class="p-4 font-bold text-white">${s.subject}</td>
                          <td class="p-4 font-bold ${s.score >= 75 ? 'text-emerald-400' : 'text-rose-400'} font-mono">${s.score} / 100</td>
                          <td class="p-4">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded ${s.score >= 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                              ${s.score >= 75 ? 'LULUS' : 'REMIDI'}
                            </span>
                          </td>
                        </tr>
                      `).join("") : `
                        <tr>
                          <td colspan="4" class="p-8 text-center text-slate-500">Belum ada riwayat pengerjaan soal.</td>
                        </tr>
                      `}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 3. TAB: RINGKASAN MATERI -->
          ${activeTab === 'summary' ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <i data-lucide="award" class="text-yellow-400 w-5 h-5"></i> Rumus Penting Jaringan (TKJ)
                </h3>
                <div class="space-y-3 font-mono">
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="text-xs font-bold text-cyan-400 uppercase">Jumlah Host per Subnet (IPv4)</h4>
                    <p class="text-lg font-bold text-white mt-1">2^(32 - n) - 2</p>
                    <p class="text-[10px] text-slate-500 mt-1">n adalah CIDR prefix (Contoh: /24, maka host = 2^8 - 2 = 254 host).</p>
                  </div>
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="text-xs font-bold text-cyan-400 uppercase">Jumlah Subnet</h4>
                    <p class="text-lg font-bold text-white mt-1">2^(n - subnet_asal)</p>
                    <p class="text-[10px] text-slate-500 mt-1">n adalah prefix baru, subnet_asal adalah default classful mask.</p>
                  </div>
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="text-xs font-bold text-cyan-400 uppercase">Perhitungan Wildcard Mask</h4>
                    <p class="text-lg font-bold text-white mt-1">255.255.255.255 - Subnet Mask</p>
                    <p class="text-[10px] text-slate-500 mt-1">Digunakan untuk ACL Cisco atau routing OSPF. Contoh /24: Wildcard = 0.0.0.255.</p>
                  </div>
                </div>
              </div>

              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <i data-lucide="file-text" class="text-cyan-400 w-5 h-5"></i> Catatan Mindmap & Ringkasan
                </h3>
                <div class="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-sm mb-1">ASJ: Layanan Web Server & DNS</h4>
                    <p>DNS berfungsi menerjemahkan domain ke IP address (menggunakan Bind9 pada Debian). Web server (Apache/Nginx) memproses file HTML/PHP dan melayani request HTTP port 80/443.</p>
                  </div>
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-sm mb-1">AIJ: Firewall & NAT</h4>
                    <p>NAT (Network Address Translation) menerjemahkan IP private lokal ke IP public internet. Masquerade di MikroTik adalah salah satu teknik termudah NAT.</p>
                  </div>
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h4 class="font-bold text-white text-sm mb-1">Materi WAN: Fiber Optic (FO)</h4>
                    <p>Media kabel kaca berkecepatan cahaya. Struktur FO terdiri dari Core, Cladding, Coating, Strength Member, dan Outer Jacket. Menggunakan alat Splice Splicer untuk menyambung.</p>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 4. TAB: TARGET BELAJAR -->
          ${activeTab === 'targets' ? `
            <div class="max-w-2xl mx-auto p-6 glass rounded-3xl space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                  <i data-lucide="list-todo" class="text-cyan-400 w-5 h-5"></i> Target Belajar Pribadi
                </h3>
                <button id="createTargetBtn" class="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Buat Target
                </button>
              </div>

              <div class="space-y-3" id="targetList">
                ${studyTargets.length > 0 ? studyTargets.map((t: any) => {
                  const percent = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
                  return `
                    <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                      <div class="flex items-center justify-between">
                        <div>
                          <h4 class="font-bold text-white text-sm">${t.title}</h4>
                          <p class="text-xs text-slate-400 mt-1">Selesaikan ${t.total} task</p>
                        </div>
                        <div class="flex items-center gap-2">
                          <button class="update-target-btn p-1.5 hover:bg-slate-800 rounded-xl text-cyan-400 transition-colors" data-id="${t.id}" data-current="${t.completed}" data-total="${t.total}">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                          </button>
                          <button class="delete-target-btn p-1.5 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition-colors" data-id="${t.id}">
                            <i data-lucide="trash2" class="w-4 h-4"></i>
                          </button>
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Progres Target</span>
                          <span>${t.completed} / ${t.total} (${percent}%)</span>
                        </div>
                        <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div class="bg-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("") : `
                  <div class="text-center py-10 text-slate-500 text-sm">
                    Belum membuat target belajar. Yuk, buat sekarang agar belajarmu lebih terarah!
                  </div>
                `}
              </div>
            </div>
          ` : ""}

          <!-- 5. TAB: FOCUS TIMER (POMODORO) -->
          ${activeTab === 'pomodoro' ? `
            <div class="max-w-md mx-auto p-8 glass rounded-3xl text-center space-y-6 relative overflow-hidden">
              <div class="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl"></div>
              
              <div>
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pomodoroMode === 'work' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                  ${pomodoroMode === 'work' ? '🔴 Sesi Fokus' : '🟢 Waktu Istirahat'}
                </span>
                <p class="text-xs text-slate-400 mt-2">Pomodoro: 25 menit belajar, 5 menit istirahat.</p>
              </div>

              <!-- Clock Display -->
              <div class="relative w-48 h-48 mx-auto flex items-center justify-center rounded-full border-4 border-slate-800/80">
                <svg class="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="rgba(6, 182, 212, 0.1)" stroke-width="6" fill="transparent"/>
                  <circle cx="96" cy="96" r="88" stroke="#06b6d4" stroke-width="6" fill="transparent"
                          stroke-dasharray="552" stroke-dashoffset="${552 - (552 * (pomodoroTimeLeft / pomodoroMaxTime))}"
                          class="transition-all duration-1000"/>
                </svg>
                <div class="text-3xl font-bold font-mono text-white" id="pomoCountdownDisplay">
                  ${Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, "0")}:${(pomodoroTimeLeft % 60).toString().padStart(2, "0")}
                </div>
              </div>

              <div class="flex justify-center gap-3">
                <button id="pomoStartBtn" class="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2">
                  <i data-lucide="play" class="w-4 h-4"></i> ${pomodoroIsRunning ? 'Pause' : 'Mulai'}
                </button>
                <button id="pomoResetBtn" class="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2">
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reset
                </button>
              </div>

              <div class="pt-4 border-t border-slate-850 text-xs text-slate-400">
                Total jam fokus belajarmu hari ini: <strong class="text-cyan-400 font-mono">${Math.round(totalStudyMinutes)} Menit</strong>
              </div>
            </div>
          ` : ""}

          <!-- 6. TAB: PROGRESS BELAJAR -->
          ${activeTab === 'stats' ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="p-6 glass rounded-3xl flex items-center gap-4">
                <div class="p-4 bg-cyan-500/10 text-cyan-400 rounded-2xl"><i data-lucide="clock" class="w-8 h-8"></i></div>
                <div>
                  <span class="text-xs text-slate-400 block font-medium">Waktu Belajar Fokus</span>
                  <span class="text-2xl font-bold text-white block mt-0.5">${totalStudyMinutes} Menit</span>
                </div>
              </div>

              <div class="p-6 glass rounded-3xl flex items-center gap-4">
                <div class="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl"><i data-lucide="book-open" class="w-8 h-8"></i></div>
                <div>
                  <span class="text-xs text-slate-400 block font-medium">Buku & Materi Selesai</span>
                  <span class="text-2xl font-bold text-white block mt-0.5">${materials.length} Topik</span>
                </div>
              </div>

              <div class="p-6 glass rounded-3xl flex items-center gap-4">
                <div class="p-4 bg-yellow-500/10 text-yellow-400 rounded-2xl"><i data-lucide="award" class="w-8 h-8"></i></div>
                <div>
                  <span class="text-xs text-slate-400 block font-medium">Target Belajar Tercapai</span>
                  <span class="text-2xl font-bold text-white block mt-0.5">${studyTargets.filter(t => t.completed >= t.total).length} Target</span>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 7. TAB: AI BELAJAR -->
          ${activeTab === 'ai' ? `
            <div class="max-w-3xl mx-auto glass rounded-3xl overflow-hidden flex flex-col h-[550px]">
              <div class="p-5 border-b border-slate-850 bg-slate-900/40 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-white">AI Belajar XII TKJ 1</h4>
                    <p class="text-[10px] text-slate-400">Tanyakan apa saja seputar router, subnetting, linux, server, dll.</p>
                  </div>
                </div>
                <button id="clearAiChatBtn" class="text-xs text-slate-400 hover:text-white transition-colors">Clear Chat</button>
              </div>

              <div class="flex-1 p-5 overflow-y-auto space-y-4" id="aiChatWindow">
                <!-- Welcome Assistant Bubble -->
                <div class="flex gap-3 max-w-[85%]">
                  <div class="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs shrink-0 font-bold">🤖</div>
                  <div class="p-3.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-200 leading-relaxed space-y-2">
                    <p>Halo! Saya Asisten Belajar AI XII TKJ 1. Ada materi pelajaran atau topologi jaringan yang ingin kamu bahas?</p>
                    <div class="flex flex-wrap gap-2 pt-1">
                      <button class="ai-quick-btn px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] hover:text-cyan-400 transition-colors" data-prompt="Jelaskan perbedaan Kabel Straight dan Kabel Cross">Kabel Straight vs Cross</button>
                      <button class="ai-quick-btn px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] hover:text-cyan-400 transition-colors" data-prompt="Bagaimana cara menghitung subnet mask /27?">Cara hitung subnet /27</button>
                      <button class="ai-quick-btn px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] hover:text-cyan-400 transition-colors" data-prompt="Berikan ringkasan perintah dasar Linux Debian Server">Linux Debian Command</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-4 border-t border-slate-850 bg-slate-950/20 flex gap-3">
                <input type="text" id="aiChatInput" placeholder="Ketik pertanyaanmu..." class="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500 text-slate-100 outline-none text-sm placeholder-slate-600">
                <button id="sendAiChatBtn" class="px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  Kirim <i data-lucide="send" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    renderIcons();

    // Attach Tab Switcher
    document.querySelectorAll(".tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        renderUI(materials, bookmarks, quizScores, studyTargets);
      });
    });

    // Material List Events
    const materialSearchInput = document.getElementById("materialSearchInput") as HTMLInputElement;
    if (materialSearchInput) {
      materialSearchInput.addEventListener("input", () => {
        searchMaterialQuery = materialSearchInput.value;
        renderUI(materials, bookmarks, quizScores, studyTargets);
      });
    }

    document.querySelectorAll(".subject-filter-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        currentFilterSubject = btn.dataset.subject;
        renderUI(materials, bookmarks, quizScores, studyTargets);
      });
    });

    // Bookmark Toggle Event
    document.querySelectorAll(".bookmark-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const materialId = btn.dataset.id;
        const isBookmarked = bookmarks.includes(materialId);

        try {
          if (isBookmarked) {
            // Remove Bookmark
            const qb = query(collection(db, "bookmarks"), where("userId", "==", userSession.uid), where("materialId", "==", materialId));
            const snap = await getDocs(qb);
            snap.forEach(async (docRef) => {
              await deleteDoc(doc(db, "bookmarks", docRef.id));
            });
            toast.success("Bookmark dihapus.");
          } else {
            // Add Bookmark
            await addDoc(collection(db, "bookmarks"), {
              userId: userSession.uid,
              materialId,
              timestamp: serverTimestamp()
            });
            toast.success("Materi berhasil di-bookmark!");
          }
          loadData();
        } catch (e: any) {
          toast.error(e.message);
        }
      });
    });

    // Upload Material Event
    const addMaterialBtn = document.getElementById("addMaterialBtn");
    if (addMaterialBtn) {
      addMaterialBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Upload Materi Pembelajaran Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Mata Pelajaran</label>
                <select id="swSubject" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  ${SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join("")}
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Materi</label>
                <input type="text" id="swTitle" placeholder="Contoh: Modul Subnetting IPv4" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi Ringkas</label>
                <textarea id="swDesc" placeholder="Materi dasar subnetting..." class="w-full h-16 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm resize-none"></textarea>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Link Google Drive / Youtube / Web (Opsional)</label>
                <input type="text" id="swLink" placeholder="https://drive.google.com/..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Upload File (PDF/PPT/DOCX - Opsional)</label>
                <input type="file" id="swFile" class="w-full text-slate-300 text-xs bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#ef4444",
          confirmButtonText: "Upload Sekarang",
          cancelButtonText: "Batal",
          preConfirm: () => {
            const subject = (document.getElementById("swSubject") as HTMLSelectElement).value;
            const title = (document.getElementById("swTitle") as HTMLInputElement).value.trim();
            const description = (document.getElementById("swDesc") as HTMLTextAreaElement).value.trim();
            const link = (document.getElementById("swLink") as HTMLInputElement).value.trim();
            const fileInput = document.getElementById("swFile") as HTMLInputElement;
            const file = fileInput.files ? fileInput.files[0] : null;

            if (!title) {
              Swal.showValidationMessage("Judul materi harus diisi.");
              return false;
            }

            return { subject, title, description, link, file };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Sedang mengunggah materi...",
              didOpen: () => { Swal.showLoading(); },
              allowOutsideClick: false,
              background: "#0f172a",
              color: "#f8fafc"
            });

            const { subject, title, description, link, file } = result.value;
            let fileUrl = link;

            try {
              if (file) {
                const uploadResult = await uploadFileToServer(file);
                fileUrl = uploadResult.fileUrl;
              }

              if (!fileUrl) {
                fileUrl = "https://drive.google.com"; // Fallback placeholder
              }

              await addDoc(collection(db, "materials"), {
                subject,
                title,
                description,
                url: fileUrl,
                uploaderName: userSession.name,
                createdAt: serverTimestamp()
              });

              Swal.fire({ icon: "success", title: "Materi berhasil diunggah!", background: "#0f172a", color: "#f8fafc" });
              loadData();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    }

    // Delete Material Event
    document.querySelectorAll(".delete-material-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Materi", "Hapus materi ini dari daftar secara permanen?");
        if (confirm) {
          try {
            await deleteDoc(doc(db, "materials", id));
            toast.success("Materi berhasil dihapus.");
            loadData();
          } catch (e: any) {
            toast.error(e.message);
          }
        }
      });
    });

    // Start Interactive Quiz Event (Bank Soal)
    document.querySelectorAll(".start-quiz-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const subject = btn.dataset.subject;
        const questions = QUIZ_QUESTIONS[subject];

        if (!questions) {
          Swal.fire("Latihan Belum Tersedia", "Mata pelajaran ini belum memiliki bank soal latihan.", "info");
          return;
        }

        // Initialize quiz session
        let currentQuestionIdx = 0;
        let score = 0;
        let quizTime = 5 * 60; // 5 mins
        let correctAnswersCount = 0;
        let selectedOptionIdx: number | null = null;
        let isRandom = true; // default randomize
        let quizTimerInterval: any = null;

        // Shuffle questions copy if requested
        const quizQuestions = isRandom ? [...questions].sort(() => Math.random() - 0.5) : [...questions];

        function playQuizUI() {
          const q = quizQuestions[currentQuestionIdx];
          const timerMin = Math.floor(quizTime / 60);
          const timerSec = (quizTime % 60).toString().padStart(2, "0");

          Swal.fire({
            title: `Latihan: ${subject}`,
            background: "#0f172a",
            color: "#f8fafc",
            width: "600px",
            html: `
              <div class="space-y-4 text-left">
                <!-- Header Info -->
                <div class="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                  <span class="text-slate-400">Pertanyaan <strong>${currentQuestionIdx + 1}</strong> dari ${quizQuestions.length}</span>
                  <span class="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">🕒 ${timerMin}:${timerSec}</span>
                </div>

                <!-- Question -->
                <div class="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-slate-100 font-semibold text-sm leading-relaxed">
                  ${q.q}
                </div>

                <!-- Options -->
                <div class="space-y-2">
                  ${q.options.map((opt, idx) => `
                    <button class="opt-btn w-full p-3.5 text-left text-xs bg-slate-900 border ${selectedOptionIdx === idx ? 'border-cyan-500 bg-cyan-500/5 text-cyan-300 font-bold' : 'border-slate-800 text-slate-300'} hover:bg-slate-850 rounded-xl transition-all" data-idx="${idx}">
                      ${String.fromCharCode(65 + idx)}. ${opt}
                    </button>
                  `).join("")}
                </div>
              </div>
            `,
            showCancelButton: true,
            cancelButtonText: "Keluar Sesi",
            cancelButtonColor: "#ef4444",
            confirmButtonText: currentQuestionIdx === quizQuestions.length - 1 ? "Selesai & Kirim" : "Lanjut ➜",
            confirmButtonColor: "#06b6d4",
            allowOutsideClick: false,
            didOpen: () => {
              // Option clicks
              document.querySelectorAll(".opt-btn").forEach((obtn: any) => {
                obtn.addEventListener("click", () => {
                  selectedOptionIdx = parseInt(obtn.dataset.idx);
                  playQuizUI();
                });
              });

              // Timer tick
              if (!quizTimerInterval) {
                quizTimerInterval = setInterval(() => {
                  quizTime--;
                  if (quizTime <= 0) {
                    clearInterval(quizTimerInterval);
                    submitQuizResult();
                  } else {
                    const disp = Swal.getHtmlContainer()?.querySelector(".font-mono");
                    if (disp) {
                      disp.textContent = `🕒 ${Math.floor(quizTime / 60)}:${(quizTime % 60).toString().padStart(2, "0")}`;
                    }
                  }
                }, 1000);
              }
            }
          }).then((res) => {
            if (res.isConfirmed) {
              if (selectedOptionIdx === null) {
                toast.error("Pilih salah satu jawaban terlebih dahulu!");
                playQuizUI();
                return;
              }

              // Check answer
              if (selectedOptionIdx === q.answer) {
                correctAnswersCount++;
              }

              if (currentQuestionIdx < quizQuestions.length - 1) {
                currentQuestionIdx++;
                selectedOptionIdx = null;
                playQuizUI();
              } else {
                // Submit Quiz
                clearInterval(quizTimerInterval);
                submitQuizResult();
              }
            } else {
              // Cancelled
              clearInterval(quizTimerInterval);
            }
          });
        }

        async function submitQuizResult() {
          Swal.fire({
            title: "Mengirim jawaban...",
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            background: "#0f172a",
            color: "#f8fafc"
          });

          // Calculate score
          const rawScore = Math.round((correctAnswersCount / quizQuestions.length) * 100);

          try {
            await addDoc(collection(db, "quizScores"), {
              userId: userSession.uid,
              userName: userSession.name,
              subject,
              score: rawScore,
              correct: correctAnswersCount,
              total: quizQuestions.length,
              timestamp: serverTimestamp()
            });

            // Display results with explanations
            Swal.fire({
              title: rawScore >= 75 ? "Selamat! Kamu Lulus 🎉" : "Terus Berjuang! Remidi 💪",
              background: "#0f172a",
              color: "#f8fafc",
              html: `
                <div class="space-y-4 text-left">
                  <div class="text-center">
                    <span class="text-4xl font-extrabold ${rawScore >= 75 ? 'text-emerald-400' : 'text-rose-400'} font-mono">${rawScore} / 100</span>
                    <p class="text-xs text-slate-400 mt-2">Menjawab benar ${correctAnswersCount} dari ${quizQuestions.length} pertanyaan.</p>
                  </div>
                  <div class="border-t border-slate-800 pt-3 space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    <h4 class="text-xs font-bold text-white uppercase">Pembahasan Jawaban:</h4>
                    ${quizQuestions.map((qq: any, qidx: number) => `
                      <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1.5">
                        <p class="font-bold text-slate-200">${qidx + 1}. ${qq.q}</p>
                        <p class="text-emerald-400">✓ Kunci Jawaban: ${qq.options[qq.answer]}</p>
                        <p class="text-slate-400 italic mt-1 leading-normal bg-slate-950 p-2 rounded-lg">${qq.explanation}</p>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `,
              confirmButtonText: "Tutup Latihan",
              confirmButtonColor: "#06b6d4"
            });

            loadData();
          } catch (e: any) {
            Swal.fire("Gagal", e.message, "error");
          }
        }

        playQuizUI();
      });
    });

    // Target Belajar: Create Target
    const createTargetBtn = document.getElementById("createTargetBtn");
    if (createTargetBtn) {
      createTargetBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Buat Target Belajar Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Target Belajar</label>
                <input type="text" id="targetTitle" placeholder="Contoh: Belajar Subnetting & Latihan Soal" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Jumlah Task / Sub-bab</label>
                <input type="number" id="targetTotal" min="1" value="3" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#ef4444",
          confirmButtonText: "Simpan Target",
          cancelButtonText: "Batal",
          preConfirm: () => {
            const title = (document.getElementById("targetTitle") as HTMLInputElement).value.trim();
            const total = parseInt((document.getElementById("targetTotal") as HTMLInputElement).value);
            if (!title || isNaN(total) || total < 1) {
              Swal.showValidationMessage("Judul target dan total task minimal 1.");
              return false;
            }
            return { title, total };
          }
        }).then(async (res) => {
          if (res.isConfirmed) {
            const { title, total } = res.value;
            try {
              await addDoc(collection(db, "studyTargets"), {
                userId: userSession.uid,
                title,
                total,
                completed: 0,
                createdAt: serverTimestamp()
              });
              toast.success("Target belajar ditambahkan!");
              loadData();
            } catch (err: any) {
              toast.error(err.message);
            }
          }
        });
      });
    }

    // Target Belajar: Update Target progress
    document.querySelectorAll(".update-target-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const current = parseInt(btn.dataset.current);
        const total = parseInt(btn.dataset.total);

        Swal.fire({
          title: "Update Progres Target Belajar",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Task Terselesaikan (${current} / ${total})</label>
                <input type="number" id="swTargetCompleted" min="0" max="${total}" value="${current}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#ef4444",
          confirmButtonText: "Update Progres",
          cancelButtonText: "Batal",
          preConfirm: () => {
            const completed = parseInt((document.getElementById("swTargetCompleted") as HTMLInputElement).value);
            if (isNaN(completed) || completed < 0 || completed > total) {
              Swal.showValidationMessage(`Jumlah selesai harus antara 0 dan ${total}.`);
              return false;
            }
            return { completed };
          }
        }).then(async (res) => {
          if (res.isConfirmed) {
            const { completed } = res.value;
            try {
              await updateDoc(doc(db, "studyTargets", id), { completed });
              toast.success("Progres target berhasil diperbarui!");
              loadData();
            } catch (err: any) {
              toast.error(err.message);
            }
          }
        });
      });
    });

    // Target Belajar: Delete Target
    document.querySelectorAll(".delete-target-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Target", "Hapus target belajar ini secara permanen?");
        if (confirm) {
          try {
            await deleteDoc(doc(db, "studyTargets", id));
            toast.success("Target belajar dihapus.");
            loadData();
          } catch (e: any) {
            toast.error(e.message);
          }
        }
      });
    });

    // Focus Timer Events (Pomodoro)
    const pomoStartBtn = document.getElementById("pomoStartBtn");
    const pomoResetBtn = document.getElementById("pomoResetBtn");
    if (pomoStartBtn && pomoResetBtn) {
      pomoStartBtn.addEventListener("click", () => {
        if (pomodoroIsRunning) {
          // Pause
          clearInterval(pomodoroInterval);
          pomodoroIsRunning = false;
          pomoStartBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Mulai`;
          renderIcons();
        } else {
          // Play
          pomodoroIsRunning = true;
          pomoStartBtn.innerHTML = `<i data-lucide="clock" class="w-4 h-4"></i> Pause`;
          renderIcons();

          pomodoroInterval = setInterval(() => {
            pomodoroTimeLeft--;
            if (pomodoroTimeLeft <= 0) {
              clearInterval(pomodoroInterval);
              pomodoroIsRunning = false;

              if (pomodoroMode === "work") {
                // Selesai Sesi Belajar
                totalStudyMinutes += 25;
                localStorage.setItem(`study_mins_${userSession.uid}`, totalStudyMinutes.toString());
                Swal.fire({
                  icon: "success",
                  title: "Sesi Fokus Selesai! 🎉",
                  text: "Hebat! Kamu telah fokus belajar selama 25 menit. Sekarang waktunya istirahat 5 menit.",
                  confirmButtonColor: "#10b981",
                  confirmButtonText: "Mulai Istirahat",
                  background: "#0f172a",
                  color: "#f8fafc"
                }).then(() => {
                  pomodoroMode = "break";
                  pomodoroTimeLeft = 5 * 60;
                  pomodoroMaxTime = 5 * 60;
                  renderUI(materials, bookmarks, quizScores, studyTargets);
                });
              } else {
                // Selesai Sesi Istirahat
                Swal.fire({
                  icon: "info",
                  title: "Istirahat Selesai! 💪",
                  text: "Waktu istirahat habis. Siap untuk kembali fokus belajar?",
                  confirmButtonColor: "#06b6d4",
                  confirmButtonText: "Mulai Sesi Fokus",
                  background: "#0f172a",
                  color: "#f8fafc"
                }).then(() => {
                  pomodoroMode = "work";
                  pomodoroTimeLeft = 25 * 60;
                  pomodoroMaxTime = 25 * 60;
                  renderUI(materials, bookmarks, quizScores, studyTargets);
                });
              }
            } else {
              // Update ticking display without full redraw
              const display = document.getElementById("pomoCountdownDisplay");
              if (display) {
                const m = Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, "0");
                const s = (pomodoroTimeLeft % 60).toString().padStart(2, "0");
                display.textContent = `${m}:${s}`;
              }
              // Update SVG dashoffset
              const circle = container.querySelector("circle[stroke-dasharray]");
              if (circle) {
                const offset = 552 - (552 * (pomodoroTimeLeft / pomodoroMaxTime));
                circle.setAttribute("stroke-dashoffset", offset.toString());
              }
            }
          }, 1000);
        }
      });

      pomoResetBtn.addEventListener("click", () => {
        clearInterval(pomodoroInterval);
        pomodoroIsRunning = false;
        pomodoroMode = "work";
        pomodoroTimeLeft = 25 * 60;
        pomodoroMaxTime = 25 * 60;
        renderUI(materials, bookmarks, quizScores, studyTargets);
      });
    }

    // AI Belajar Chat
    const sendAiChatBtn = document.getElementById("sendAiChatBtn");
    const aiChatInput = document.getElementById("aiChatInput") as HTMLInputElement;
    const aiChatWindow = document.getElementById("aiChatWindow") as HTMLDivElement;
    const clearAiChatBtn = document.getElementById("clearAiChatBtn");

    if (sendAiChatBtn && aiChatInput && aiChatWindow) {
      const handleSendAi = async (text: string) => {
        if (!text) return;

        // Append user bubble
        aiChatWindow.innerHTML += `
          <div class="flex gap-3 max-w-[85%] ml-auto justify-end">
            <div class="p-3.5 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-xs text-slate-100 font-medium">
              ${text}
            </div>
            <div class="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs shrink-0 font-bold">👤</div>
          </div>
        `;
        aiChatWindow.scrollTop = aiChatWindow.scrollHeight;

        // Reset input
        aiChatInput.value = "";

        // Typing loader bubble
        const loaderId = `ai-loader-${Date.now()}`;
        aiChatWindow.innerHTML += `
          <div class="flex gap-3 max-w-[85%]" id="${loaderId}">
            <div class="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs shrink-0 font-bold">🤖</div>
            <div class="p-3.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-1">
              <span class="spinner w-3.5 h-3.5 border-2"></span> AI sedang berpikir...
            </div>
          </div>
        `;
        aiChatWindow.scrollTop = aiChatWindow.scrollHeight;

        try {
          const res = await fetch(getApiUrl("/api/ai"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              context: `Mata Pelajaran Kelas XII TKJ 1: ${SUBJECTS.join(", ")}.`
            })
          });

          const data = await res.json();
          // Remove loader
          document.getElementById(loaderId)?.remove();

          if (data.error) {
            throw new Error(data.error);
          }

          // Append AI reply bubble
          aiChatWindow.innerHTML += `
            <div class="flex gap-3 max-w-[85%]">
              <div class="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs shrink-0 font-bold">🤖</div>
              <div class="p-3.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                ${data.text || "Mohon maaf, saya tidak menerima respons apa pun."}
              </div>
            </div>
          `;
          aiChatWindow.scrollTop = aiChatWindow.scrollHeight;
          renderIcons();
        } catch (err: any) {
          document.getElementById(loaderId)?.remove();
          aiChatWindow.innerHTML += `
            <div class="flex gap-3 max-w-[85%]">
              <div class="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xs shrink-0 font-bold">⚠️</div>
              <div class="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-semibold">
                Gagal memproses permintaan AI: ${err.message}
              </div>
            </div>
          `;
          aiChatWindow.scrollTop = aiChatWindow.scrollHeight;
        }
      };

      sendAiChatBtn.addEventListener("click", () => handleSendAi(aiChatInput.value.trim()));
      aiChatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSendAi(aiChatInput.value.trim());
      });

      // Quick prompt buttons
      document.querySelectorAll(".ai-quick-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          handleSendAi(btn.dataset.prompt);
        });
      });

      if (clearAiChatBtn) {
        clearAiChatBtn.addEventListener("click", () => {
          aiChatWindow.innerHTML = `
            <div class="flex gap-3 max-w-[85%]">
              <div class="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs shrink-0 font-bold">🤖</div>
              <div class="p-3.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-200 leading-relaxed">
                Chat dihapus. Tanyakan apa saja yang ingin kamu pelajari hari ini!
              </div>
            </div>
          `;
        });
      }
    }
  }

  loadData();
}
