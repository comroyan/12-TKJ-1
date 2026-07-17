import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { 
  getPracticeQuizzes, 
  addPracticeQuiz, 
  deletePracticeQuiz, 
  getPracticeSubmissions, 
  addPracticeSubmission 
} from "../firebase/db";
import { renderIcons, toast, formatShortDate } from "../utils/helpers";
import Swal from "sweetalert2";

// Subjects for the dropdown list
const SUBJECTS = [
  "Administrasi Infrastruktur Jaringan (AIJ)",
  "Administrasi Sistem Jaringan (ASJ)",
  "Teknologi Jaringan Berbasis Luas (WAN)",
  "Sistem Keamanan Jaringan",
  "Produk Kreatif dan Kewirausahaan (PKK)",
  "Bahasa Inggris",
  "Matematika",
  "Pendidikan Pancasila / PKn",
  "Bahasa Indonesia"
];

// Pre-configured default practice quizzes so the app has content immediately
const DEFAULT_QUIZZES = [
  {
    id: "default-aij-subnetting",
    title: "Latihan Soal Subnetting Jaringan",
    subject: "Administrasi Infrastruktur Jaringan (AIJ)",
    description: "Latihan mandiri pemahaman subnetting IP Address IPv4 kelas C untuk persiapan UKK.",
    createdBy: "system",
    createdByName: "Sistem Guru",
    createdAt: "2026-07-16T00:00:00Z",
    questions: [
      {
        number: "1",
        text: "Berapakah subnet mask subnetting dari prefix /27?",
        type: "mc4",
        options: ["255.255.255.192", "255.255.255.224", "255.255.255.240", "255.255.255.248"],
        correctOption: "B"
      },
      {
        number: "2",
        text: "Jika IP address adalah 192.168.10.130/28, berapa IP network dari host tersebut?",
        type: "mc5",
        options: ["192.168.10.128", "192.168.10.120", "192.168.10.0", "192.168.10.132", "192.168.10.144"],
        correctOption: "A"
      },
      {
        number: "3",
        text: "Jelaskan perbedaan mendasar antara routing statis dengan routing dinamis pada router Cisco/Mikrotik!",
        type: "essay",
        correctOption: "",
        referenceAnswer: "Routing statis dikonfigurasi secara manual oleh admin jaringan, sangat aman, cocok untuk skala kecil. Routing dinamis menggunakan protokol khusus (OSPF, RIP, BGP) untuk mempelajari rute secara otomatis, toleran terhadap kegagalan link, cocok untuk skala besar."
      }
    ]
  },
  {
    id: "default-asj-linux",
    title: "Latihan Konfigurasi Linux Server",
    subject: "Administrasi Sistem Jaringan (ASJ)",
    description: "Evaluasi teori administrasi sistem operasi jaringan berbasis Linux Debian.",
    createdBy: "system",
    createdByName: "Sistem Guru",
    createdAt: "2026-07-16T00:00:00Z",
    questions: [
      {
        number: "1",
        text: "Kombinasi tombol keyboard manakah yang digunakan untuk menyimpan (save) pengeditan file pada teks editor 'nano'?",
        type: "mc4",
        options: ["Ctrl + X lalu Y", "Ctrl + O lalu Enter", "Ctrl + S", "Ctrl + W"],
        correctOption: "B"
      },
      {
        number: "2",
        text: "Sebutkan minimal 3 jenis layanan (services) server beserta port default-nya yang biasa dikonfigurasi di TKJ!",
        type: "essay",
        correctOption: "",
        referenceAnswer: "1) SSH server berjalan pada port default 22, 2) Web Server (HTTP) berjalan pada port default 80, 3) DNS Server berjalan pada port default 53, 4) FTP Server berjalan pada port default 21."
      }
    ]
  }
];

// RJ-45 Wire Color Definitions for Crimping Simulator
interface WireColor {
  id: string;
  name: string;
  tailwindClass: string;
}

const WIRE_COLORS: WireColor[] = [
  { id: "WO", name: "Putih-Orange", tailwindClass: "bg-gradient-to-r from-orange-400 via-white to-orange-400 border-2 border-orange-400 text-slate-800" },
  { id: "O", name: "Orange", tailwindClass: "bg-orange-500 border-2 border-orange-600 text-white" },
  { id: "WG", name: "Putih-Hijau", tailwindClass: "bg-gradient-to-r from-emerald-400 via-white to-emerald-400 border-2 border-emerald-400 text-slate-800" },
  { id: "B", name: "Biru", tailwindClass: "bg-blue-600 border-2 border-blue-700 text-white" },
  { id: "WB", name: "Putih-Biru", tailwindClass: "bg-gradient-to-r from-blue-400 via-white to-blue-400 border-2 border-blue-400 text-slate-800" },
  { id: "G", name: "Hijau", tailwindClass: "bg-emerald-600 border-2 border-emerald-700 text-white" },
  { id: "WBR", name: "Putih-Cokelat", tailwindClass: "bg-gradient-to-r from-amber-700 via-white to-amber-700 border-2 border-amber-800 text-slate-800" },
  { id: "BR", name: "Cokelat", tailwindClass: "bg-amber-800 border-2 border-amber-900 text-white" }
];

// Correct sequence standards
const T568B_SEQUENCE = ["WO", "O", "WG", "B", "WB", "G", "WBR", "BR"];
const T568A_SEQUENCE = ["WG", "G", "WO", "B", "WB", "O", "WBR", "BR"];

export async function renderLatihan(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat Menu Latihan...</span>
    </div>
  `;

  // Determine if the user is Ketua Kelas/privileged
  const isKetuaKelas = userSession.role === "Super Admin" || 
                       userSession.role === "Ketua Kelas" || 
                       userSession.jabatan === "Ketua Kelas" ||
                       userSession.role === "Wakil" ||
                       userSession.role === "Sekretaris";

  // Active Tab: 'ulangan' (Teori/Exam) or 'praktek' (RJ45 Crimping)
  let activeTab = "ulangan"; 

  // Inside 'ulangan', we can be in state: 'list', 'taking', 'viewing-results'
  let ulanganSubState = "list"; 
  let selectedQuiz: any = null;
  let quizSubmissions: any[] = [];
  let studentSubmissions: any[] = []; // For ketua kelas log

  // Crimping simulator states
  let selectedCrimpingType = "straight"; // straight or crossover
  let selectedCrossoverSide = "A"; // Side A or Side B
  let currentWiresA = [...WIRE_COLORS].sort(() => Math.random() - 0.5); // Shuffle initially
  let currentWiresB = [...WIRE_COLORS].sort(() => Math.random() - 0.5); 
  let selectedWireIdx: number | null = null;

  async function loadDataAndRender() {
    try {
      // Load Quizzes from Firestore
      const dbQuizzes = await getPracticeQuizzes();
      const allQuizzes = [...DEFAULT_QUIZZES, ...dbQuizzes];

      // Load Submissions
      studentSubmissions = await getPracticeSubmissions();

      renderMainLayout(allQuizzes);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data latihan dari server.");
    }
  }

  function renderMainLayout(allQuizzes: any[]) {
    // Header section
    let headerHtml = `
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-slate-100 flex items-center gap-3">
          <i data-lucide="graduation-cap" class="text-rose-500 w-8 h-8"></i> Latihan & Ujian Kelas
        </h1>
        <p class="text-slate-400 text-sm mt-2">
          Pusat latihan soal ujian teori (ulangan) dan simulator praktikum kabel jaringan TKJ.
        </p>
      </div>
    `;

    // Tab buttons
    let tabsHtml = `
      <div class="flex gap-2 border-b border-slate-800 mb-6">
        <button id="btn-tab-ulangan" class="px-5 py-3 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
          activeTab === "ulangan"
            ? "border-rose-500 text-rose-400"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }">
          <i data-lucide="file-text" class="w-4 h-4"></i> Latihan Ulangan (Teori)
        </button>
        <button id="btn-tab-praktek" class="px-5 py-3 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
          activeTab === "praktek"
            ? "border-rose-500 text-rose-400"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }">
          <i data-lucide="cpu" class="w-4 h-4"></i> Latihan Praktek (Crimping RJ-45)
        </button>
      </div>
    `;

    let contentHtml = "";

    if (activeTab === "ulangan") {
      if (ulanganSubState === "list") {
        contentHtml = renderUlanganList(allQuizzes);
      } else if (ulanganSubState === "taking" && selectedQuiz) {
        contentHtml = renderQuizTaker();
      }
    } else if (activeTab === "praktek") {
      contentHtml = renderCrimpingSimulator();
    }

    container.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-6">
        ${headerHtml}
        ${tabsHtml}
        <div id="latihan-tab-content">
          ${contentHtml}
        </div>
      </div>
    `;

    // Bind event listeners
    bindTabEvents(allQuizzes);
    renderIcons();
  }

  // --- RENDERING TABS & PANELS ---

  function renderUlanganList(allQuizzes: any[]) {
    // Check which quizzes have been submitted by the current user
    const mySubmissions = studentSubmissions.filter((sub: any) => sub.userId === auth.currentUser?.uid);

    let listHtml = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 columns: Quiz list -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-200 flex items-center gap-2">
              <i data-lucide="book-open" class="text-emerald-400 w-5 h-5"></i> Daftar Latihan Ulangan
            </h2>
            ${
              isKetuaKelas
                ? `<button id="btn-create-quiz" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition">
                     <i data-lucide="plus" class="w-4 h-4"></i> Buat Latihan Soal
                   </button>`
                : ""
            }
          </div>

          <div class="grid grid-cols-1 gap-4">
            ${allQuizzes.length === 0 ? `
              <div class="glass rounded-2xl p-8 text-center text-slate-500">
                <i data-lucide="info" class="w-10 h-10 mx-auto mb-2 text-slate-400"></i>
                <p>Belum ada latihan ulangan yang tersedia.</p>
              </div>
            ` : allQuizzes.map((quiz: any) => {
              const completed = mySubmissions.find((sub: any) => sub.quizId === quiz.id);
              return `
                <div class="glass relative overflow-hidden p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span class="px-2 py-1 rounded bg-slate-800 text-[10px] text-rose-400 border border-slate-700 font-semibold uppercase tracking-wide">
                      ${quiz.subject}
                    </span>
                    <h3 class="text-lg font-bold text-slate-100 mt-2">${quiz.title}</h3>
                    <p class="text-slate-400 text-xs mt-1 line-clamp-2">${quiz.description || "Tidak ada deskripsi."}</p>
                    <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span class="flex items-center gap-1">
                        <i data-lucide="help-circle" class="w-3.5 h-3.5 text-slate-400"></i>
                        ${quiz.questions?.length || 0} Soal
                      </span>
                      <span class="flex items-center gap-1">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
                        Oleh: ${quiz.createdByName || "Anonim"}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 w-full md:w-auto justify-end">
                    ${
                      completed
                        ? `
                        <div class="text-right mr-2 hidden md:block">
                          <p class="text-[10px] text-slate-500">Skor Terakhir</p>
                          <p class="text-lg font-extrabold text-emerald-400">${completed.score}</p>
                        </div>
                        <button class="btn-retake-quiz w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition" data-id="${quiz.id}">
                          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Coba Lagi
                        </button>
                        `
                        : `
                        <button class="btn-start-quiz w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-rose-900/20" data-id="${quiz.id}">
                          <i data-lucide="play-circle" class="w-4 h-4"></i> Mulai Latihan
                        </button>
                        `
                    }
                    ${
                      isKetuaKelas && quiz.id !== "default-aij-subnetting" && quiz.id !== "default-asj-linux"
                        ? `
                        <button class="btn-delete-quiz p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition" data-id="${quiz.id}" title="Hapus Latihan">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                        `
                        : ""
                    }
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Right 1 column: Submissions and stats / Instructor Log -->
        <div class="space-y-6">
          <div class="glass p-6 rounded-3xl border border-slate-800">
            <h3 class="text-md font-bold text-slate-200 mb-4 flex items-center gap-2">
              <i data-lucide="award" class="text-amber-400 w-5 h-5"></i> Skor Latihan Anda
            </h3>
            ${mySubmissions.length === 0 ? `
              <p class="text-slate-500 text-xs text-center py-4">Anda belum menyelesaikan latihan ulangan.</p>
            ` : `
              <div class="space-y-3">
                ${mySubmissions.map((sub: any) => {
                  const quiz = allQuizzes.find((q: any) => q.id === sub.quizId);
                  return `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                      <div class="min-w-0 pr-2">
                        <p class="text-xs font-bold text-slate-300 truncate">${quiz?.title || "Latihan"}</p>
                        <p class="text-[10px] text-slate-500">${formatShortDate(sub.submittedAt)}</p>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs text-slate-400">${sub.totalCorrect || 0}/${sub.totalMcQuestions || 0} PG</span>
                        <span class="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                          ${sub.score || 0}
                        </span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>

          ${
            isKetuaKelas
              ? `
              <div class="glass p-6 rounded-3xl border border-slate-800">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-md font-bold text-slate-200 flex items-center gap-2">
                    <i data-lucide="shield" class="text-rose-400 w-5 h-5"></i> Rekap Nilai Siswa (Ketua)
                  </h3>
                </div>
                ${studentSubmissions.length === 0 ? `
                  <p class="text-slate-500 text-xs text-center py-4">Belum ada siswa yang mengumpulkan.</p>
                ` : `
                  <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
                    ${studentSubmissions.map((sub: any) => {
                      const quiz = allQuizzes.find((q: any) => q.id === sub.quizId);
                      return `
                        <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="text-xs font-bold text-slate-200">${sub.userName}</p>
                              <p class="text-[10px] text-slate-500">Absen ${sub.absen || "-"} • ${formatShortDate(sub.submittedAt)}</p>
                            </div>
                            <span class="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                              Skor: ${sub.score}
                            </span>
                          </div>
                          <div class="text-[10px] bg-slate-950/60 p-2 rounded text-slate-400 truncate">
                            <span class="font-bold text-rose-400">Latihan:</span> ${quiz?.title || "Latihan Terhapus"}
                          </div>
                          <button class="btn-view-detail-submission self-end text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1" data-id="${sub.id}">
                            <i data-lucide="eye" class="w-3 h-3"></i> Detail Jawaban
                          </button>
                        </div>
                      `;
                    }).join("")}
                  </div>
                `}
              </div>
              `
              : ""
          }
        </div>
      </div>
    `;
    return listHtml;
  }

  function renderQuizTaker() {
    if (!selectedQuiz) return "";

    return `
      <div class="glass p-6 md:p-8 rounded-3xl border border-slate-800 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="border-b border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wide">
              ${selectedQuiz.subject}
            </span>
            <h2 class="text-2xl font-bold text-slate-100 mt-2">${selectedQuiz.title}</h2>
            <p class="text-slate-400 text-sm mt-1">${selectedQuiz.description || ""}</p>
          </div>
          <button id="btn-cancel-quiz" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5">
            <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Kembali
          </button>
        </div>

        <!-- Questions List -->
        <form id="quiz-form" class="space-y-8">
          ${selectedQuiz.questions.map((q: any, index: number) => {
            const isMc = q.type === "mc4" || q.type === "mc5";
            const optionsCount = q.type === "mc5" ? 5 : 4;
            const optionLabels = ["A", "B", "C", "D", "E"].slice(0, optionsCount);

            return `
              <div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <div class="flex items-start gap-3">
                  <span class="bg-rose-500 text-white font-mono text-xs font-bold px-2 py-1 rounded mt-0.5">
                    No. ${q.number || (index + 1)}
                  </span>
                  <div class="flex-1">
                    <p class="text-slate-200 font-semibold leading-relaxed whitespace-pre-wrap">${q.text}</p>
                    
                    ${
                      isMc
                        ? `
                        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          ${optionLabels.map((lbl, oIdx) => {
                            const optionText = q.options && q.options[oIdx] ? q.options[oIdx] : `Pilihan ${lbl}`;
                            return `
                              <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer transition">
                                <input type="radio" name="question-${index}" value="${lbl}" required class="w-4 h-4 text-rose-500 focus:ring-rose-500/20 bg-slate-800 border-slate-700">
                                <span class="font-bold text-rose-400 text-sm">${lbl}.</span>
                                <span class="text-slate-300 text-sm">${optionText}</span>
                              </label>
                            `;
                          }).join("")}
                        </div>
                        `
                        : `
                        <div class="mt-4">
                          <textarea name="question-${index}" placeholder="Tuliskan jawaban essay Anda di sini..." required rows="4" class="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition"></textarea>
                        </div>
                        `
                    }
                  </div>
                </div>
              </div>
            `;
          }).join("")}

          <!-- Submit Bar -->
          <div class="border-t border-slate-800 pt-6 flex justify-end gap-3">
            <button type="button" id="btn-cancel-quiz-bottom" class="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition">
              Batalkan
            </button>
            <button type="submit" class="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-rose-950/50">
              <i data-lucide="check-circle" class="w-5 h-5"></i> Kumpulkan Latihan
            </button>
          </div>
        </form>
      </div>
    `;
  }

  function renderCrimpingSimulator() {
    const isCrossover = selectedCrimpingType === "crossover";
    const currentWires = selectedCrossoverSide === "A" || !isCrossover ? currentWiresA : currentWiresB;

    let wireHtml = currentWires.map((wire, idx) => {
      const isSelected = selectedWireIdx === idx;
      return `
        <div 
          class="wire-node flex flex-col items-center justify-between cursor-pointer transition duration-300 p-2 rounded-xl border-2 hover:scale-105 select-none ${
            isSelected 
              ? "border-rose-500 ring-2 ring-rose-500/30 scale-105 shadow-lg" 
              : "border-slate-800 bg-slate-900/50"
          }" 
          data-index="${idx}"
        >
          <div class="w-8 h-24 rounded-t-md relative shadow-inner flex flex-col justify-between py-1 ${wire.tailwindClass}">
            <!-- Stripe indicator for White striped cables -->
            ${wire.id.startsWith("W") ? `<div class="absolute inset-y-0 left-1/3 right-1/3 bg-white/40"></div>` : ""}
            <div class="text-[8px] font-bold text-center drop-shadow z-10 select-none">${idx + 1}</div>
          </div>
          <div class="text-[9px] mt-1 font-semibold text-slate-300 text-center select-none w-14 truncate">
            ${wire.name}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="glass p-6 md:p-8 rounded-3xl border border-slate-800 max-w-4xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">
              <i data-lucide="cable" class="text-rose-500 w-5 h-5"></i> Simulator Crimping Kabel RJ-45
            </h2>
            <p class="text-slate-400 text-xs mt-1">
              Atur urutan warna kabel LAN dengan mengklik 2 kabel untuk menukar posisinya hingga urutan benar!
            </p>
          </div>
          <div class="flex gap-2">
            <button id="btn-crimp-straight" class="px-4 py-1.5 rounded-xl text-xs font-bold border transition ${
              selectedCrimpingType === "straight"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200"
            }">
              Straight-through
            </button>
            <button id="btn-crimp-crossover" class="px-4 py-1.5 rounded-xl text-xs font-bold border transition ${
              selectedCrimpingType === "crossover"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200"
            }">
              Crossover
            </button>
          </div>
        </div>

        ${
          isCrossover
            ? `
            <div class="flex items-center gap-2 mb-6 bg-slate-900/40 border border-slate-800 p-2 rounded-2xl w-fit">
              <span class="text-xs text-slate-400 font-semibold px-2">Pilih Sisi Kabel:</span>
              <button id="btn-side-a" class="px-4 py-1 rounded-lg text-xs font-bold transition ${
                selectedCrossoverSide === "A"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:text-slate-100"
              }">Ujung A (T568B)</button>
              <button id="btn-side-b" class="px-4 py-1 rounded-lg text-xs font-bold transition ${
                selectedCrossoverSide === "B"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:text-slate-100"
              }">Ujung B (T568A)</button>
            </div>
            `
            : ""
        }

        <!-- RJ-45 Plug Representation -->
        <div class="flex flex-col items-center justify-center p-8 bg-slate-950/40 border border-slate-800/80 rounded-3xl relative overflow-hidden mb-6">
          <div class="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-rose-500/5 blur-3xl"></div>
          
          <div class="text-center mb-6">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 uppercase tracking-wider">
              Konektor RJ-45 (Sisi Kuningan Menghadap Anda)
            </span>
            <p class="text-[10px] text-slate-500 mt-2">Urutan Pin dihitung dari Pin 1 (Paling Kiri) ke Pin 8 (Paling Kanan)</p>
          </div>

          <!-- RJ-45 Connector Visual Mock -->
          <div class="w-full max-w-lg bg-slate-900/90 border-2 border-slate-700/60 rounded-t-3xl pt-6 pb-2 px-6 relative flex flex-col items-center shadow-2xl">
            <!-- Brass Pins -->
            <div class="grid grid-cols-8 gap-2 w-full mb-3">
              ${[1, 2, 3, 4, 5, 6, 7, 8].map(num => `
                <div class="flex flex-col items-center">
                  <div class="w-3 h-6 bg-amber-400 rounded-sm shadow-md animate-pulse"></div>
                  <span class="text-[9px] font-bold text-amber-500 font-mono mt-1">Pin ${num}</span>
                </div>
              `).join("")}
            </div>

            <!-- Wire slots visual layout inside RJ45 connector body -->
            <div class="grid grid-cols-8 gap-2 w-full bg-slate-950/80 border border-slate-800 p-3 rounded-xl min-h-32">
              ${currentWires.map((wire, idx) => `
                <div class="flex flex-col items-center justify-start h-full">
                  <div class="w-4 h-20 rounded-t relative ${wire.tailwindClass} transition-all duration-300 shadow">
                    ${wire.id.startsWith("W") ? `<div class="absolute inset-y-0 left-1/3 right-1/3 bg-white/40"></div>` : ""}
                  </div>
                  <span class="text-[8px] font-bold text-slate-400 font-mono mt-1">${idx + 1}</span>
                </div>
              `).join("")}
            </div>

            <!-- Lock Clip tab on the back (just aesthetic) -->
            <div class="w-16 h-8 bg-slate-800/80 border border-slate-700 rounded-b-md absolute -top-8 shadow-md"></div>
          </div>

          <!-- RJ45 Sheath/Cable boot body -->
          <div class="w-48 h-10 bg-slate-800 border-x border-slate-700 flex items-center justify-center relative">
            <div class="absolute -bottom-8 w-24 h-16 bg-slate-600 rounded-b-xl border-x border-b border-slate-500"></div>
          </div>
        </div>

        <!-- Wire Pool / Sorting Workspace -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-4 h-4 text-rose-400"></i> Klik kabel pertama lalu klik kabel kedua untuk menukarnya
            </p>
            <button id="btn-shuffle-wires" class="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1">
              <i data-lucide="shuffle" class="w-3.5 h-3.5"></i> Acak Ulang
            </button>
          </div>

          <!-- Horizontal Wire Selector -->
          <div class="grid grid-cols-4 md:grid-cols-8 gap-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
            ${wireHtml}
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button id="btn-test-crimping" class="w-full md:w-auto bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50">
              <i data-lucide="shield-check" class="w-5 h-5"></i> Cek Hasil Crimping
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --- INTERACTIVE ACTIONS & LISTENERS ---

  function bindTabEvents(allQuizzes: any[]) {
    // Tab switching
    const tabUlangan = document.getElementById("btn-tab-ulangan");
    const tabPraktek = document.getElementById("btn-tab-praktek");

    if (tabUlangan) {
      tabUlangan.addEventListener("click", () => {
        activeTab = "ulangan";
        ulanganSubState = "list";
        selectedQuiz = null;
        renderMainLayout(allQuizzes);
      });
    }

    if (tabPraktek) {
      tabPraktek.addEventListener("click", () => {
        activeTab = "praktek";
        renderMainLayout(allQuizzes);
      });
    }

    // LIST SUB-STATE EVENTS
    if (activeTab === "ulangan" && ulanganSubState === "list") {
      // Start Quiz Buttons
      const startBtns = document.querySelectorAll(".btn-start-quiz, .btn-retake-quiz");
      startBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const quizId = btn.getAttribute("data-id");
          selectedQuiz = allQuizzes.find(q => q.id === quizId);
          if (selectedQuiz) {
            ulanganSubState = "taking";
            renderMainLayout(allQuizzes);
          }
        });
      });

      // Delete Quiz Button (Ketua Kelas only)
      const deleteBtns = document.querySelectorAll(".btn-delete-quiz");
      deleteBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
          const quizId = btn.getAttribute("data-id");
          if (!quizId) return;

          const result = await Swal.fire({
            title: "Hapus Latihan?",
            text: "Anda yakin ingin menghapus latihan ini secara permanen?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
            background: "#1e293b",
            color: "#f1f5f9",
            confirmButtonColor: "#ef4444"
          });

          if (result.isConfirmed) {
            try {
              await deletePracticeQuiz(quizId);
              toast.success("Latihan berhasil dihapus.");
              loadDataAndRender();
            } catch (err) {
              console.error(err);
              toast.error("Gagal menghapus latihan.");
            }
          }
        });
      });

      // View Student Submission details (Ketua Kelas only)
      const viewSubmissionBtns = document.querySelectorAll(".btn-view-detail-submission");
      viewSubmissionBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const subId = btn.getAttribute("data-id");
          const submission = studentSubmissions.find((s: any) => s.id === subId);
          if (submission) {
            const quiz = allQuizzes.find((q: any) => q.id === submission.quizId);
            showSubmissionDetailsModal(submission, quiz);
          }
        });
      });

      // Create Quiz Button (Ketua Kelas only)
      const createQuizBtn = document.getElementById("btn-create-quiz");
      if (createQuizBtn) {
        createQuizBtn.addEventListener("click", () => {
          showCreateQuizModal();
        });
      }
    }

    // TAKING QUIZ EVENTS
    if (activeTab === "ulangan" && ulanganSubState === "taking" && selectedQuiz) {
      const cancelQuizBtn = document.getElementById("btn-cancel-quiz");
      const cancelQuizBtnBottom = document.getElementById("btn-cancel-quiz-bottom");
      const quizForm = document.getElementById("quiz-form") as HTMLFormElement;

      const exitQuiz = () => {
        ulanganSubState = "list";
        selectedQuiz = null;
        renderMainLayout(allQuizzes);
      };

      if (cancelQuizBtn) cancelQuizBtn.addEventListener("click", exitQuiz);
      if (cancelQuizBtnBottom) cancelQuizBtnBottom.addEventListener("click", exitQuiz);

      if (quizForm) {
        quizForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          // Calculate correct answers
          let totalMcQuestions = 0;
          let totalCorrect = 0;
          const userAnswers: { [key: string]: string } = {};

          selectedQuiz.questions.forEach((q: any, index: number) => {
            const inputVal = (quizForm.elements as any)[`question-${index}`];
            let value = "";
            if (inputVal) {
              if (q.type === "mc4" || q.type === "mc5") {
                totalMcQuestions++;
                value = inputVal.value; // Selected radio button letter (A, B, C, D, etc.)
                if (value === q.correctOption) {
                  totalCorrect++;
                }
              } else {
                value = inputVal.value; // Essay textarea text
              }
            }
            userAnswers[q.number || (index + 1)] = value;
          });

          // Score out of 100
          const score = totalMcQuestions > 0 ? Math.round((totalCorrect / totalMcQuestions) * 100) : 100;

          try {
            await addPracticeSubmission({
              quizId: selectedQuiz.id,
              userId: auth.currentUser?.uid || "anonymous",
              userName: userSession.name || "Siswa",
              absen: userSession.absen || 0,
              answers: userAnswers,
              score,
              totalCorrect,
              totalMcQuestions,
            });

            // Display Score Success Modal with Review
            Swal.fire({
              title: `Skor Anda: ${score}`,
              html: `
                <div class="text-left space-y-4 text-sm mt-4 text-slate-300">
                  <p class="font-bold text-center text-slate-200">Hasil Latihan Telah Dikumpulkan!</p>
                  <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 max-h-80 overflow-y-auto pr-1">
                    ${selectedQuiz.questions.map((q: any, idx: number) => {
                      const ansNum = q.number || (idx + 1);
                      const studentAns = userAnswers[ansNum] || "Tidak Dijawab";
                      const isCorrect = q.correctOption ? studentAns === q.correctOption : true;
                      
                      return `
                        <div class="border-b border-slate-800 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                          <p class="font-bold text-xs text-rose-400">No. ${ansNum}</p>
                          <p class="text-xs text-slate-200">${q.text}</p>
                          <p class="text-xs mt-1">Jawaban Anda: <span class="font-semibold ${q.correctOption ? (isCorrect ? 'text-emerald-400' : 'text-rose-400') : 'text-sky-300'}">${studentAns}</span></p>
                          ${q.correctOption ? `<p class="text-[10px] text-slate-500">Kunci Jawaban: <span class="font-bold text-emerald-400">${q.correctOption}</span></p>` : ""}
                          ${q.referenceAnswer ? `<p class="text-[10px] text-slate-500 italic mt-1">Saran Kunci: ${q.referenceAnswer}</p>` : ""}
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
              `,
              icon: score >= 75 ? "success" : "info",
              confirmButtonText: "Selesai",
              background: "#1e293b",
              color: "#f1f5f9",
              confirmButtonColor: "#f43f5e"
            }).then(() => {
              exitQuiz();
              loadDataAndRender();
            });

          } catch (err) {
            console.error(err);
            toast.error("Gagal mengumpulkan jawaban.");
          }
        });
      }
    }

    // PRACTICAL CRIMPING EVENTS
    if (activeTab === "praktek") {
      const btnStraight = document.getElementById("btn-crimp-straight");
      const btnCrossover = document.getElementById("btn-crimp-crossover");
      const btnSideA = document.getElementById("btn-side-a");
      const btnSideB = document.getElementById("btn-side-b");
      const btnShuffle = document.getElementById("btn-shuffle-wires");
      const btnTestCrimping = document.getElementById("btn-test-crimping");

      if (btnStraight) {
        btnStraight.addEventListener("click", () => {
          selectedCrimpingType = "straight";
          selectedWireIdx = null;
          renderMainLayout(allQuizzes);
        });
      }

      if (btnCrossover) {
        btnCrossover.addEventListener("click", () => {
          selectedCrimpingType = "crossover";
          selectedCrossoverSide = "A";
          selectedWireIdx = null;
          renderMainLayout(allQuizzes);
        });
      }

      if (btnSideA) {
        btnSideA.addEventListener("click", () => {
          selectedCrossoverSide = "A";
          selectedWireIdx = null;
          renderMainLayout(allQuizzes);
        });
      }

      if (btnSideB) {
        btnSideB.addEventListener("click", () => {
          selectedCrossoverSide = "B";
          selectedWireIdx = null;
          renderMainLayout(allQuizzes);
        });
      }

      if (btnShuffle) {
        btnShuffle.addEventListener("click", () => {
          if (selectedCrimpingType === "crossover" && selectedCrossoverSide === "B") {
            currentWiresB.sort(() => Math.random() - 0.5);
          } else {
            currentWiresA.sort(() => Math.random() - 0.5);
          }
          selectedWireIdx = null;
          renderMainLayout(allQuizzes);
        });
      }

      // Wire swapping logic
      const nodes = document.querySelectorAll(".wire-node");
      nodes.forEach(node => {
        node.addEventListener("click", () => {
          const clickedIdx = parseInt(node.getAttribute("data-index") || "0");
          const isCrossover = selectedCrimpingType === "crossover";
          const currentWires = selectedCrossoverSide === "A" || !isCrossover ? currentWiresA : currentWiresB;

          if (selectedWireIdx === null) {
            selectedWireIdx = clickedIdx;
            renderMainLayout(allQuizzes);
          } else {
            // Swap the elements
            const temp = currentWires[selectedWireIdx];
            currentWires[selectedWireIdx] = currentWires[clickedIdx];
            currentWires[clickedIdx] = temp;

            selectedWireIdx = null;
            renderMainLayout(allQuizzes);
          }
        });
      });

      // Verification of Crimping
      if (btnTestCrimping) {
        btnTestCrimping.addEventListener("click", () => {
          const isCrossover = selectedCrimpingType === "crossover";
          
          if (!isCrossover) {
            // Straight-through needs both sides T568B
            const sideAIds = currentWiresA.map(w => w.id);
            const isCorrect = JSON.stringify(sideAIds) === JSON.stringify(T568B_SEQUENCE);

            evaluateCrimpingResult(isCorrect, sideAIds, T568B_SEQUENCE, "Straight-through (T568B)");
          } else {
            // Crossover needs Side A to be T568B, and Side B to be T568A
            const sideAIds = currentWiresA.map(w => w.id);
            const sideBIds = currentWiresB.map(w => w.id);

            const sideACorrect = JSON.stringify(sideAIds) === JSON.stringify(T568B_SEQUENCE);
            const sideBCorrect = JSON.stringify(sideBIds) === JSON.stringify(T568A_SEQUENCE);

            const isCorrect = sideACorrect && sideBCorrect;

            if (!sideACorrect) {
              evaluateCrimpingResult(false, sideAIds, T568B_SEQUENCE, "Crossover Ujung A (T568B)");
            } else if (!sideBCorrect) {
              evaluateCrimpingResult(false, sideBIds, T568A_SEQUENCE, "Crossover Ujung B (T568A)");
            } else {
              evaluateCrimpingResult(true, sideAIds, T568B_SEQUENCE, "Crossover");
            }
          }
        });
      }
    }
  }

  function evaluateCrimpingResult(isCorrect: boolean, arrangedIds: string[], correctIds: string[], cableType: string) {
    if (isCorrect) {
      Swal.fire({
        title: "Crimping Berhasil!",
        text: `Selamat! Urutan kabel ${cableType} yang Anda buat sudah 100% BENAR. Pin kuningan terkoneksi sempurna!`,
        icon: "success",
        background: "#1e293b",
        color: "#f1f5f9",
        confirmButtonColor: "#10b981",
        confirmButtonText: "Bagus!"
      });
    } else {
      // Create detailed error diagnostics
      let diagnosticHtml = arrangedIds.map((arrangedId, idx) => {
        const correctId = correctIds[idx];
        const isPinOk = arrangedId === correctId;
        const arrangedName = WIRE_COLORS.find(w => w.id === arrangedId)?.name || "Kosong";
        const correctName = WIRE_COLORS.find(w => w.id === correctId)?.name || "Kosong";

        return `
          <div class="flex items-center justify-between p-2 rounded bg-slate-900 border ${isPinOk ? 'border-emerald-500/20' : 'border-rose-500/30'} text-xs">
            <span class="font-mono font-bold text-slate-400">Pin ${idx + 1}</span>
            <div class="flex items-center gap-2">
              <span class="${isPinOk ? 'text-emerald-400' : 'text-rose-400 line-through'}">${arrangedName}</span>
              ${!isPinOk ? `<span class="text-emerald-400 font-semibold">→ ${correctName}</span>` : `<span class="text-emerald-400 font-bold">✓ OK</span>`}
            </div>
          </div>
        `;
      }).join("");

      Swal.fire({
        title: "Kabel Gagal Konek (RTO)",
        html: `
          <div class="text-left space-y-4">
            <p class="text-xs text-slate-300">
              Oops! Ada kesalahan urutan kabel pada susunan <span class="text-rose-400 font-bold">${cableType}</span> Anda. Hal ini menyebabkan kegagalan koneksi data (Loss/Unreachable).
            </p>
            <div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              ${diagnosticHtml}
            </div>
          </div>
        `,
        icon: "error",
        background: "#1e293b",
        color: "#f1f5f9",
        confirmButtonColor: "#f43f5e",
        confirmButtonText: "Perbaiki Susunan"
      });
    }
  }

  // --- MODALS (QUIZ CREATION & ANSWER REVIEWS) ---

  function showSubmissionDetailsModal(submission: any, quiz: any) {
    if (!quiz) {
      Swal.fire({
        title: "Detail Jawaban",
        text: "Data latihan soal untuk pengumpulan ini sudah tidak tersedia (Dihapus).",
        icon: "error",
        background: "#1e293b",
        color: "#f1f5f9"
      });
      return;
    }

    Swal.fire({
      title: `Jawaban Siswa: ${submission.userName}`,
      html: `
        <div class="text-left space-y-4 text-sm text-slate-300 max-h-[70vh] overflow-y-auto pr-2 mt-4">
          <p class="text-xs">Absen: ${submission.absen || "-"} • Skor: <span class="font-bold text-rose-400">${submission.score}</span> • Tanggal: ${formatShortDate(submission.submittedAt)}</p>
          <div class="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-4">
            ${quiz.questions.map((q: any, idx: number) => {
              const ansNum = q.number || (idx + 1);
              const studentAns = submission.answers[ansNum] || "Tidak Dijawab";
              const isMc = q.type === "mc4" || q.type === "mc5";
              const isCorrect = q.correctOption ? studentAns === q.correctOption : true;

              return `
                <div class="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p class="font-bold text-xs text-rose-400">No. ${ansNum}</p>
                  <p class="text-xs text-slate-200 mt-1">${q.text}</p>
                  
                  <div class="mt-2 text-xs">
                    <p>Jawaban Siswa: <span class="font-bold ${isMc ? (isCorrect ? 'text-emerald-400' : 'text-rose-400') : 'text-sky-300'}">${studentAns}</span></p>
                    ${q.correctOption ? `<p class="text-[10px] text-slate-500">Kunci Jawaban: <span class="font-bold text-emerald-400">${q.correctOption}</span></p>` : ""}
                    ${q.referenceAnswer ? `<p class="text-[10px] text-slate-500 italic mt-1">Saran Kunci: ${q.referenceAnswer}</p>` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `,
      confirmButtonText: "Tutup",
      background: "#1e293b",
      color: "#f1f5f9",
      confirmButtonColor: "#f43f5e"
    });
  }

  function showCreateQuizModal() {
    let quizQuestions: any[] = [
      {
        number: "1",
        text: "",
        type: "mc4",
        options: ["", "", "", ""],
        correctOption: "A",
        referenceAnswer: ""
      }
    ];

    function renderModalContent() {
      return `
        <div class="text-left space-y-4 text-slate-200 max-h-[70vh] overflow-y-auto pr-2" id="create-quiz-container">
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Latihan</label>
            <input type="text" id="quiz-title-input" placeholder="Contoh: Ulangan Harian Subnetting" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-sm focus:outline-none focus:border-rose-500 transition">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Mata Pelajaran (Subject)</label>
              <select id="quiz-subject-select" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-sm focus:outline-none focus:border-rose-500 transition">
                ${SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi Ringkas</label>
              <input type="text" id="quiz-desc-input" placeholder="Contoh: Kerjakan mandiri untuk persiapan UKK" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-sm focus:outline-none focus:border-rose-500 transition">
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Daftar Pertanyaan & Soal</h4>
              <button type="button" id="btn-add-modal-question" class="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Tambah Soal
              </button>
            </div>

            <div id="modal-questions-list" class="space-y-4">
              <!-- Rendered Questions dynamically -->
            </div>
          </div>
        </div>
      `;
    }

    function renderQuestionBuilder() {
      const parentList = document.getElementById("modal-questions-list");
      if (!parentList) return;

      parentList.innerHTML = quizQuestions.map((q, idx) => {
        const isMc = q.type === "mc4" || q.type === "mc5";
        return `
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 relative">
            <button type="button" class="btn-remove-modal-q absolute top-2 right-2 text-slate-500 hover:text-rose-400 transition" data-idx="${idx}" title="Hapus Soal">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">Nomor Soal (Bebas/Terserah Anda)</label>
                <input type="text" class="input-modal-q-num w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none focus:border-rose-500" value="${q.number}" data-idx="${idx}">
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">Tipe Soal</label>
                <select class="select-modal-q-type w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none focus:border-rose-500" data-idx="${idx}">
                  <option value="mc4" ${q.type === 'mc4' ? 'selected' : ''}>Pilihan Ganda A B C D</option>
                  <option value="mc5" ${q.type === 'mc5' ? 'selected' : ''}>Pilihan Ganda A B C D E</option>
                  <option value="essay" ${q.type === 'essay' ? 'selected' : ''}>Essay / Jawaban Bebas</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-slate-500 font-semibold mb-1">Isi/Teks Pertanyaan</label>
              <textarea class="textarea-modal-q-text w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-lg p-2 text-slate-200 text-xs focus:outline-none" rows="2" placeholder="Tuliskan pertanyaan disini..." data-idx="${idx}">${q.text}</textarea>
            </div>

            ${
              isMc
                ? `
                <div class="space-y-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                  <span class="block text-[10px] text-slate-400 font-semibold mb-1">Isi Pilihan Jawaban & Kunci:</span>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${[1, 2, 3, 4, 5].slice(0, q.type === "mc5" ? 5 : 4).map((num) => {
                      const label = ["A", "B", "C", "D", "E"][num - 1];
                      const val = q.options[num - 1] || "";
                      return `
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold text-rose-400 font-mono">${label}</span>
                          <input type="text" class="input-modal-q-opt-val w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 text-xs focus:outline-none" placeholder="Teks pilihan..." data-idx="${idx}" data-opt-idx="${num - 1}" value="${val}">
                        </div>
                      `;
                    }).join("")}
                  </div>
                  <div class="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span class="text-[10px] text-slate-500 font-semibold">Pilih Kunci Jawaban Benar:</span>
                    <select class="select-modal-q-key bg-slate-950 border border-slate-800 rounded p-1 text-xs text-rose-400 font-bold focus:outline-none" data-idx="${idx}">
                      ${["A", "B", "C", "D", "E"].slice(0, q.type === "mc5" ? 5 : 4).map(lbl => `
                        <option value="${lbl}" ${q.correctOption === lbl ? 'selected' : ''}>Kunci: ${lbl}</option>
                      `).join("")}
                    </select>
                  </div>
                </div>
                `
                : `
                <div>
                  <label class="block text-[10px] text-slate-500 font-semibold mb-1">Saran Kunci Jawaban Essay (Kunci Referensi Siswa)</label>
                  <textarea class="textarea-modal-q-ref w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none" rows="2" placeholder="Tuliskan kata kunci/jawaban referensi..." data-idx="${idx}">${q.referenceAnswer || ""}</textarea>
                </div>
                `
            }
          </div>
        `;
      }).join("");

      bindQuestionEvents();
      renderIcons();
    }

    function bindQuestionEvents() {
      // Remove Question
      const removeBtns = document.querySelectorAll(".btn-remove-modal-q");
      removeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx") || "0");
          quizQuestions.splice(idx, 1);
          renderQuestionBuilder();
        });
      });

      // Track input changes to preserve states
      const numInputs = document.querySelectorAll(".input-modal-q-num");
      numInputs.forEach(inp => {
        inp.addEventListener("input", (e) => {
          const idx = parseInt(inp.getAttribute("data-idx") || "0");
          quizQuestions[idx].number = (e.target as HTMLInputElement).value;
        });
      });

      const textAreas = document.querySelectorAll(".textarea-modal-q-text");
      textAreas.forEach(area => {
        area.addEventListener("input", (e) => {
          const idx = parseInt(area.getAttribute("data-idx") || "0");
          quizQuestions[idx].text = (e.target as HTMLTextAreaElement).value;
        });
      });

      const types = document.querySelectorAll(".select-modal-q-type");
      types.forEach(sel => {
        sel.addEventListener("change", (e) => {
          const idx = parseInt(sel.getAttribute("data-idx") || "0");
          const val = (e.target as HTMLSelectElement).value;
          quizQuestions[idx].type = val;
          if (val === "mc4" || val === "mc5") {
            const count = val === "mc5" ? 5 : 4;
            quizQuestions[idx].options = Array(count).fill("");
            quizQuestions[idx].correctOption = "A";
          } else {
            quizQuestions[idx].options = [];
            quizQuestions[idx].correctOption = "";
          }
          renderQuestionBuilder();
        });
      });

      const optValInputs = document.querySelectorAll(".input-modal-q-opt-val");
      optValInputs.forEach(inp => {
        inp.addEventListener("input", (e) => {
          const idx = parseInt(inp.getAttribute("data-idx") || "0");
          const optIdx = parseInt(inp.getAttribute("data-opt-idx") || "0");
          quizQuestions[idx].options[optIdx] = (e.target as HTMLInputElement).value;
        });
      });

      const qKeys = document.querySelectorAll(".select-modal-q-key");
      qKeys.forEach(sel => {
        sel.addEventListener("change", (e) => {
          const idx = parseInt(sel.getAttribute("data-idx") || "0");
          quizQuestions[idx].correctOption = (e.target as HTMLSelectElement).value;
        });
      });

      const qRefs = document.querySelectorAll(".textarea-modal-q-ref");
      qRefs.forEach(area => {
        area.addEventListener("input", (e) => {
          const idx = parseInt(area.getAttribute("data-idx") || "0");
          quizQuestions[idx].referenceAnswer = (e.target as HTMLTextAreaElement).value;
        });
      });
    }

    Swal.fire({
      title: "Buat Latihan Baru",
      html: renderModalContent(),
      showCancelButton: true,
      confirmButtonText: "Simpan Latihan",
      cancelButtonText: "Batal",
      background: "#1e293b",
      color: "#f1f5f9",
      confirmButtonColor: "#e11d48",
      didOpen: () => {
        // Build initial question list
        renderQuestionBuilder();

        // Add question button inside modal listener
        const addQBtn = document.getElementById("btn-add-modal-question");
        if (addQBtn) {
          addQBtn.addEventListener("click", () => {
            quizQuestions.push({
              number: (quizQuestions.length + 1).toString(),
              text: "",
              type: "mc4",
              options: ["", "", "", ""],
              correctOption: "A",
              referenceAnswer: ""
            });
            renderQuestionBuilder();
          });
        }
      },
      preConfirm: () => {
        const title = (document.getElementById("quiz-title-input") as HTMLInputElement)?.value;
        const subject = (document.getElementById("quiz-subject-select") as HTMLSelectElement)?.value;
        const description = (document.getElementById("quiz-desc-input") as HTMLInputElement)?.value;

        if (!title) {
          Swal.showValidationMessage("Judul latihan wajib diisi!");
          return false;
        }

        // Validate that there is at least 1 question
        if (quizQuestions.length === 0) {
          Swal.showValidationMessage("Minimal harus membuat 1 soal!");
          return false;
        }

        // Validate individual questions
        for (let i = 0; i < quizQuestions.length; i++) {
          const q = quizQuestions[i];
          if (!q.text.trim()) {
            Swal.showValidationMessage(`Teks soal pada nomor ${q.number || (i + 1)} tidak boleh kosong!`);
            return false;
          }
          if (q.type === "mc4" || q.type === "mc5") {
            const count = q.type === "mc5" ? 5 : 4;
            for (let j = 0; j < count; j++) {
              if (!q.options[j] || !q.options[j].trim()) {
                Swal.showValidationMessage(`Teks Pilihan ${["A", "B", "C", "D", "E"][j]} pada soal nomor ${q.number || (i + 1)} harus diisi!`);
                return false;
              }
            }
          }
        }

        return {
          title,
          subject,
          description,
          createdBy: auth.currentUser?.uid || "system",
          createdByName: userSession.name || "Ketua Kelas",
          questions: quizQuestions
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          await addPracticeQuiz(result.value);
          toast.success("Latihan soal berhasil disimpan ke Firestore!");
          loadDataAndRender();
        } catch (err) {
          console.error(err);
          toast.error("Gagal menyimpan latihan.");
        }
      }
    });
  }

  // Initial call to load from Firestore and render
  loadDataAndRender();
}
