import { getTasks, getSubmissions, getMySubmissions, addSubmission, updateSubmissionFeedback, deleteSubmission, writeAuditLog, getStudentUsers, addTask } from "../firebase/db";
import { renderIcons, formatDate, toast, confirmDialog, getApiUrl, uploadFileToServer } from "../utils/helpers";
import Swal from "sweetalert2";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

export async function renderSubmissions(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat portal pengumpulan tugas...</span>
    </div>
  `;

  // Detect special privileges
  const isAllViewer = userSession.role === "Super Admin" || 
                      userSession.role === "Wakil" || 
                      userSession.role === "Sekretaris" || 
                      userSession.jabatan?.toLowerCase().includes("ketua") || 
                      userSession.jabatan?.toLowerCase().includes("guru") || 
                      userSession.jabatan?.toLowerCase().includes("wali");

  let activeTabSubmissions = "review";

  function attachViewFileBtnListeners() {
    document.querySelectorAll(".view-file-btn").forEach((btn: any) => {
      if (btn.classList.contains("listener-attached")) return;
      btn.classList.add("listener-attached");

      btn.addEventListener("click", (e: Event) => {
        e.preventDefault();
        const fileUrl = btn.getAttribute("data-url") || "";
        const fileName = btn.getAttribute("data-name") || "Berkas Tugas";
        
        const isBase64 = fileUrl.startsWith("data:");
        const isImage = isBase64 
          ? fileUrl.startsWith("data:image/") 
          : /\.(png|jpe?g|gif|svg|webp)$/i.test(fileUrl);
        const isPdf = isBase64 
          ? fileUrl.startsWith("data:application/pdf") 
          : /\.pdf$/i.test(fileUrl);

        let previewHtml = "";
        if (isImage) {
          previewHtml = `
            <div class="flex flex-col items-center gap-3">
              <div class="max-h-[350px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2 flex items-center justify-center w-full">
                <img src="${fileUrl}" class="max-w-full h-auto rounded-lg" style="object-fit: contain;" alt="Pratinjau Gambar" referrerPolicy="no-referrer" />
              </div>
              <p class="text-[11px] text-slate-500 font-mono text-center">Pratinjau Gambar • Format: ${isBase64 ? 'Base64' : 'Cloud Storage'}</p>
            </div>
          `;
        } else if (isPdf) {
          previewHtml = `
            <div class="flex flex-col items-center gap-3">
              <div class="w-full h-[180px] rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div class="p-3 bg-rose-500/10 text-rose-400 rounded-full mb-2">
                  <i data-lucide="file-text" class="w-10 h-10"></i>
                </div>
                <p class="text-xs font-bold text-slate-200 truncate w-full px-4">${fileName}</p>
                <p class="text-[10px] text-slate-500 mt-1">Dokumen PDF (Gunakan tombol unduh di bawah)</p>
              </div>
            </div>
          `;
        } else {
          const ext = fileName.split(".").pop()?.toUpperCase() || "Berkas";
          const isPkt = ext === "PKT";
          previewHtml = `
            <div class="flex flex-col items-center gap-3">
              <div class="w-full h-[180px] rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div class="p-3 ${isPkt ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'} rounded-full mb-2">
                  <i data-lucide="${isPkt ? 'file-check' : 'file-archive'}" class="w-10 h-10"></i>
                </div>
                <p class="text-xs font-bold text-slate-200 truncate w-full px-4">${fileName}</p>
                <p class="text-[10px] text-slate-500 mt-1">${isPkt ? 'Berkas Simulasi Cisco Packet Tracer (.PKT)' : `Berkas ${ext}`} (Gunakan tombol unduh di bawah)</p>
              </div>
            </div>
          `;
        }

        Swal.fire({
          title: "Pratinjau & Unduh Berkas",
          background: "#0f172a",
          color: "#f8fafc",
          width: isImage ? "600px" : "450px",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div class="flex items-start gap-3 p-3 bg-slate-900 border border-slate-850 rounded-2xl">
                <div class="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <i data-lucide="paperclip" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-slate-200 truncate" title="${fileName}">${fileName}</p>
                  <p class="text-[10px] text-slate-500 mt-0.5 font-mono truncate">Sumber: ${isBase64 ? 'Data URL (Luring/Fallback)' : 'Cloud Storage'}</p>
                </div>
              </div>
              ${previewHtml}
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Unduh Berkas",
          cancelButtonText: "Tutup",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          didOpen: () => {
            renderIcons();
          }
        }).then((result) => {
          if (result.isConfirmed) {
            try {
              if (isBase64) {
                const link = document.createElement("a");
                link.href = fileUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                const link = document.createElement("a");
                link.href = getApiUrl(fileUrl);
                link.target = "_blank";
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
              toast.success("Mengeksekusi pengunduhan berkas...");
            } catch (dlErr: any) {
              toast.error("Gagal mengunduh: " + dlErr.message);
            }
          }
        });
      });
    });
  }

  async function loadAndRender() {
    try {
      const [allTasks, allSubmissions, mySubmissions, allStudents] = await Promise.all([
        getTasks(),
        isAllViewer ? getSubmissions() : Promise.resolve([]),
        getMySubmissions(userSession.uid),
        getStudentUsers()
      ]);

      if (isAllViewer) {
        container.innerHTML = `
          <div class="space-y-6 animate-fadeIn">
            <!-- Tabs Switcher -->
            <div class="flex border-b border-slate-800 gap-6">
              <button id="btnTabReview" class="pb-3 text-sm font-semibold border-b-2 ${activeTabSubmissions === 'review' ? 'border-yellow-500 text-yellow-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'} transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="shield-check" class="w-4 h-4"></i> Konsol Peninjau
              </button>
              <button id="btnTabSubmit" class="pb-3 text-sm font-semibold border-b-2 ${activeTabSubmissions === 'submit' ? 'border-cyan-500 text-cyan-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'} transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="upload-cloud" class="w-4 h-4"></i> Kirim & Riwayat Saya
              </button>
            </div>
            
            <div id="subPageContent"></div>
          </div>
        `;
        renderIcons();

        const subPageContent = document.getElementById("subPageContent") as HTMLElement;

        if (activeTabSubmissions === "review") {
          renderTeacherView(allTasks, allSubmissions, subPageContent);
        } else {
          renderStudentView(allTasks, mySubmissions, allStudents, subPageContent);
        }

        document.getElementById("btnTabReview")?.addEventListener("click", () => {
          activeTabSubmissions = "review";
          loadAndRender();
        });

        document.getElementById("btnTabSubmit")?.addEventListener("click", () => {
          activeTabSubmissions = "submit";
          loadAndRender();
        });
      } else {
        renderStudentView(allTasks, mySubmissions, allStudents, container);
      }
    } catch (error: any) {
      container.innerHTML = `
        <div class="p-6 text-center glass rounded-3xl max-w-md mx-auto">
          <i data-lucide="alert-octagon" class="w-12 h-12 text-rose-500 mx-auto mb-3"></i>
          <h3 class="text-lg font-bold text-white">Gagal Memuat Data</h3>
          <p class="text-xs text-slate-400 mt-2">${error.message}</p>
          <button id="retryBtn" class="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl font-bold text-xs hover:bg-cyan-400 transition-colors">Coba Lagi</button>
        </div>
      `;
      renderIcons();
      document.getElementById("retryBtn")?.addEventListener("click", loadAndRender);
    }
  }

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // STUDENT VIEW (Submit & View Confirmation)
  // -------------------------------------------------------------------------
  function renderStudentView(tasks: any[], submissions: any[], students: any[], targetContainer: HTMLElement = container) {
    // Only pending or unresolved tasks are ideal for submission
    const activeTasks = tasks.filter(t => t.status !== "completed");

    targetContainer.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
            <i data-lucide="upload-cloud" class="text-cyan-400 w-7 h-7 animate-pulse"></i> Pengumpulan Tugas Siswa
          </h1>
          <p class="text-slate-400 text-sm mt-1">Unggah berkas tugas Anda secara langsung ke server ClassHub. Hanya Ketua Kelas dan Guru yang dapat melihat berkas Anda.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Form Submission (Left Column - 5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            <div class="glass rounded-3xl p-6 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-950/40 via-slate-900/10 to-cyan-950/5">
              <h2 class="text-base font-bold text-white mb-4 flex items-center gap-2">
                <i data-lucide="file-plus" class="text-cyan-400 w-4 h-4"></i> Kirim Tugas Baru
              </h2>

              <form id="submissionForm" class="space-y-4">
                <!-- Dropdown Task -->
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1.5">Pilih Tugas / Mata Pelajaran</label>
                  <select id="subTaskId" required class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:border-cyan-500 text-slate-200 text-sm outline-none transition-colors">
                    <option value="" disabled selected>-- Pilih Tugas Kelas --</option>
                    ${activeTasks.map(t => `<option value="${t.id}" data-title="${t.title}" data-subject="${t.subject}" data-type="${t.type || 'Individu'}">${t.subject} - ${t.title} (${t.type || 'Individu'})</option>`).join("")}
                    ${tasks.filter(t => t.status === "completed").map(t => `<option value="${t.id}" data-title="${t.title}" data-subject="${t.subject}" data-type="${t.type || 'Individu'}">[Arsip] ${t.subject} - ${t.title} (${t.type || 'Individu'})</option>`).join("")}
                  </select>
                </div>

                <!-- Dynamic Members Section -->
                <div id="membersContainer" class="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl hidden space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-300">Daftar Anggota Kelompok</span>
                    <button type="button" id="addMemberBtn" class="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1">
                      <i data-lucide="plus" class="w-3 h-3"></i> Tambah Anggota
                    </button>
                  </div>
                  <div id="membersList" class="space-y-2">
                    <!-- Dynamic Member Rows will be injected here -->
                  </div>
                </div>

                <!-- Drag & Drop Uploader Zone -->
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1.5">Upload File / Lampiran Tugas</label>
                  
                  <div id="dropzone" class="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 hover:bg-cyan-950/5 rounded-2xl p-6 text-center cursor-pointer transition-all relative group">
                    <input type="file" id="fileInput" class="hidden" accept=".zip,.rar,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg">
                    <div id="dropzoneContent" class="space-y-2">
                      <div class="inline-flex p-3 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                        <i data-lucide="cloud-lightning" class="w-6 h-6"></i>
                      </div>
                      <p class="text-xs font-semibold text-slate-300">Tarik berkas ke sini atau <span class="text-cyan-400 underline">pilih dari folder</span></p>
                      <p class="text-[10px] text-slate-500 font-mono">ZIP, PDF, DOCX, PNG (Maks. 50MB)</p>
                    </div>
                    
                    <!-- Selected File State -->
                    <div id="selectedFileState" class="hidden flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl text-left">
                      <div class="flex items-center gap-3 overflow-hidden">
                        <div class="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                          <i data-lucide="file-text" id="selectedFileIcon" class="w-5 h-5"></i>
                        </div>
                        <div class="overflow-hidden">
                          <p id="selectedFileName" class="text-xs font-bold text-white truncate"></p>
                          <p id="selectedFileSize" class="text-[10px] text-slate-500 font-mono"></p>
                        </div>
                      </div>
                      <button type="button" id="removeFileBtn" class="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors">
                        <i data-lucide="x" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Live Uploading Progress (Initially Hidden) -->
                <div id="uploadProgressContainer" class="hidden space-y-2 p-4 bg-slate-950 rounded-2xl border border-slate-850">
                  <div class="flex items-center justify-between text-xs font-mono">
                    <span class="text-cyan-400 animate-pulse flex items-center gap-1">
                      <i data-lucide="activity" class="w-3.5 h-3.5"></i> Mengirim Berkas...
                    </span>
                    <span id="progressPercentage" class="text-slate-300 font-bold">0%</span>
                  </div>
                  <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div id="progressBar" class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-0 transition-all duration-300"></div>
                  </div>
                  <p class="text-[9px] text-slate-500 font-mono text-center">Uploading to secure ClassHub cluster node...</p>
                </div>

                <button type="submit" id="submitSubBtn" class="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer">
                  <i data-lucide="send" class="w-4 h-4"></i> Kirim Tugas Siswa
                </button>
              </form>
            </div>
          </div>

          <!-- Submissions List / History (Right Column - 7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            <div class="glass rounded-3xl p-6 border border-slate-800">
              <h2 class="text-base font-bold text-white mb-4 flex items-center gap-2">
                <i data-lucide="clipboard-check" class="text-cyan-400 w-4 h-4"></i> Riwayat & Konfirmasi Pengumpulan
              </h2>

              <div class="space-y-4">
                ${submissions.length > 0 ? submissions.map(s => {
                  let statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  let statusIcon = "clock";
                  let statusText = "Menunggu Konfirmasi";

                  if (s.status === "Disetujui") {
                    statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    statusIcon = "check-circle";
                    statusText = "Tugas Disetujui";
                  } else if (s.status === "Perlu Revisi") {
                    statusColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                    statusIcon = "alert-circle";
                    statusText = "Perlu Revisi";
                  }

                  const isKelompok = s.taskType === "Kelompok";
                  const typeBadge = isKelompok 
                    ? `<span class="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 shrink-0"><i data-lucide="users" class="w-3 h-3"></i> Kelompok</span>`
                    : `<span class="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 shrink-0"><i data-lucide="user" class="w-3 h-3"></i> Individu</span>`;

                  return `
                    <div class="p-5 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-2xl space-y-3 transition-colors relative group">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <span class="text-[10px] font-mono text-slate-500 uppercase block">${s.subject}</span>
                          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                            <h3 class="text-sm font-bold text-white">${s.taskTitle}</h3>
                            ${typeBadge}
                          </div>
                        </div>
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${statusColor}">
                          <i data-lucide="${statusIcon}" class="w-3.5 h-3.5"></i> ${statusText}
                        </span>
                      </div>

                      ${s.members && s.members.length > 0 ? `
                        <div class="flex flex-wrap gap-1.5 p-3 bg-slate-900/60 border border-slate-850/40 rounded-xl">
                          <span class="text-[10px] font-mono text-slate-500 w-full mb-1 flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i> Anggota Kelompok (${s.members.length}):</span>
                          ${s.members.map((m: any) => `
                            <span class="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-850 text-slate-300">
                              ${m.name} <span class="text-slate-500 font-mono text-[9px]">(Absen ${m.absen})</span>
                            </span>
                          `).join("")}
                        </div>
                      ` : ""}

                      <div class="p-3 bg-slate-900 border border-slate-850/60 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-2 overflow-hidden">
                          <i data-lucide="file-text" class="text-slate-400 w-4 h-4 shrink-0"></i>
                          <span class="text-xs text-slate-300 font-mono truncate" title="${s.fileName}">${s.fileName}</span>
                        </div>
                        <button class="view-file-btn p-1.5 bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 text-slate-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer" data-url="${s.fileUrl}" data-name="${s.fileName || 'Lihat Berkas'}" title="Pratinjau / Unduh Berkas">
                          <i data-lucide="eye" class="w-3 h-3"></i>
                          <span class="text-[9px] font-bold">Buka</span>
                        </button>
                      </div>

                      <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Dikirim pada: ${formatDate(s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt))}</span>
                        <button class="deleteSubBtn p-1 bg-slate-900 border border-slate-850 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 rounded-lg transition-all opacity-0 group-hover:opacity-100" data-id="${s.id}">
                          <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>

                      ${s.feedback ? `
                        <div class="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-xl mt-2 text-xs">
                          <span class="font-bold text-cyan-400 block mb-1">Feedback Pemeriksa:</span>
                          <p class="text-slate-300 italic">"${s.feedback}"</p>
                        </div>
                      ` : ""}
                    </div>
                  `;
                }).join("") : `
                  <div class="py-12 text-center text-slate-500">
                    <div class="inline-flex p-4 bg-slate-800/20 rounded-full mb-3"><i data-lucide="file-question" class="w-8 h-8 text-slate-600"></i></div>
                    <p class="text-sm">Belum ada pengumpulan tugas yang Anda kirimkan.</p>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // -------------------------------------------------------------------------
    // DYNAMIC MEMBERS LIST MANAGEMENT
    // -------------------------------------------------------------------------
    const subTaskIdSelect = document.getElementById("subTaskId") as HTMLSelectElement;
    const membersContainer = document.getElementById("membersContainer") as HTMLDivElement;
    const membersList = document.getElementById("membersList") as HTMLDivElement;
    const addMemberBtn = document.getElementById("addMemberBtn") as HTMLButtonElement;

    let memberIndex = 0;

    function createMemberRow(index: number, name = "", absen = "", isCurrentUser = false) {
      const selectHtml = `
        <select class="member-name-input flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs outline-none focus:border-cyan-500" ${isCurrentUser ? 'disabled' : ''}>
          ${isCurrentUser 
            ? `<option value="${name}" selected>${name}</option>` 
            : `
              <option value="" disabled selected>-- Pilih Siswa --</option>
              ${students.map((s: any) => `<option value="${s.name}" data-absen="${s.absen}">${s.name} (Absen ${s.absen})</option>`).join("")}
              <option value="custom">-- Tulis Nama Lain --</option>
            `
          }
        </select>
        <input type="text" class="member-custom-name hidden flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs outline-none focus:border-cyan-500" placeholder="Tulis nama siswa...">
      `;

      const row = document.createElement("div");
      row.className = "flex items-center gap-2 member-row";
      row.innerHTML = `
        <div class="flex-1 flex gap-2">
          ${selectHtml}
          <input type="number" class="member-absen-input w-16 px-2 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs text-center outline-none focus:border-cyan-500" placeholder="Absen" value="${absen}" ${isCurrentUser ? 'disabled' : ''}>
        </div>
        ${!isCurrentUser ? `
          <button type="button" class="remove-member-btn p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors">
            <i data-lucide="minus-circle" class="w-4 h-4 shrink-0"></i>
          </button>
        ` : `<div class="w-7 shrink-0"></div>`}
      `;

      const nameSelect = row.querySelector(".member-name-input") as HTMLSelectElement;
      const customInput = row.querySelector(".member-custom-name") as HTMLInputElement;
      const absenInput = row.querySelector(".member-absen-input") as HTMLInputElement;

      if (nameSelect) {
        nameSelect.addEventListener("change", () => {
          if (nameSelect.value === "custom") {
            nameSelect.classList.add("hidden");
            customInput.classList.remove("hidden");
            customInput.focus();
            absenInput.value = "";
          } else {
            const selectedOpt = nameSelect.options[nameSelect.selectedIndex];
            const selectedAbsen = selectedOpt.getAttribute("data-absen") || "";
            absenInput.value = selectedAbsen;
          }
        });
      }

      return row;
    }

    function resetMembers() {
      membersList.innerHTML = "";
      memberIndex = 0;
      const userRow = createMemberRow(memberIndex++, userSession.name, userSession.absen || "", true);
      membersList.appendChild(userRow);
      renderIcons();
    }

    subTaskIdSelect.addEventListener("change", () => {
      const selectedOpt = subTaskIdSelect.options[subTaskIdSelect.selectedIndex];
      const taskType = selectedOpt.getAttribute("data-type") || "Individu";

      if (taskType === "Kelompok") {
        membersContainer.classList.remove("hidden");
        resetMembers();
      } else {
        membersContainer.classList.add("hidden");
        membersList.innerHTML = "";
      }
    });

    addMemberBtn.addEventListener("click", () => {
      const row = createMemberRow(memberIndex++, "", "", false);
      membersList.appendChild(row);
      renderIcons();

      const removeBtn = row.querySelector(".remove-member-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          row.remove();
        });
      }
    });

    // -------------------------------------------------------------------------
    // FILE DRAG & DROP & SUBMIT EVENT HANDLERS
    // -------------------------------------------------------------------------
    const dropzone = document.getElementById("dropzone") as HTMLDivElement;
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const dropzoneContent = document.getElementById("dropzoneContent") as HTMLDivElement;
    const selectedFileState = document.getElementById("selectedFileState") as HTMLDivElement;
    const selectedFileName = document.getElementById("selectedFileName") as HTMLParagraphElement;
    const selectedFileSize = document.getElementById("selectedFileSize") as HTMLParagraphElement;
    const selectedFileIcon = document.getElementById("selectedFileIcon") as HTMLElement;
    const removeFileBtn = document.getElementById("removeFileBtn") as HTMLButtonElement;

    const submissionForm = document.getElementById("submissionForm") as HTMLFormElement;
    const submitSubBtn = document.getElementById("submitSubBtn") as HTMLButtonElement;
    const uploadProgressContainer = document.getElementById("uploadProgressContainer") as HTMLDivElement;
    const progressBar = document.getElementById("progressBar") as HTMLDivElement;
    const progressPercentage = document.getElementById("progressPercentage") as HTMLSpanElement;

    let selectedFile: File | null = null;

    // Trigger file selection via click
    dropzone.addEventListener("click", (e) => {
      if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target as Node)) {
        fileInput.click();
      }
    });

    // Handle drag over
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-cyan-500", "bg-cyan-950/10");
    });

    // Handle drag leave
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("border-cyan-500", "bg-cyan-950/10");
    });

    // Handle drop file
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-cyan-500", "bg-cyan-950/10");
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    // Handle change input file
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });

    function handleFileSelect(file: File) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Ukuran file melebihi batas maksimal 50MB!");
        return;
      }

      selectedFile = file;
      dropzoneContent.classList.add("hidden");
      selectedFileState.classList.remove("hidden");
      selectedFileName.textContent = file.name;
      selectedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      // Dynamically select file icon based on extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["zip", "rar", "7z"].includes(ext || "")) {
        selectedFileIcon.setAttribute("data-lucide", "file-archive");
        selectedFileIcon.className = "w-5 h-5 text-yellow-500";
      } else if (["pdf"].includes(ext || "")) {
        selectedFileIcon.setAttribute("data-lucide", "file-text");
        selectedFileIcon.className = "w-5 h-5 text-rose-500";
      } else if (["png", "jpg", "jpeg", "gif"].includes(ext || "")) {
        selectedFileIcon.setAttribute("data-lucide", "image");
        selectedFileIcon.className = "w-5 h-5 text-emerald-500";
      } else if (ext === "pkt") {
        selectedFileIcon.setAttribute("data-lucide", "file-check");
        selectedFileIcon.className = "w-5 h-5 text-amber-400 animate-pulse";
      } else {
        selectedFileIcon.setAttribute("data-lucide", "file-code");
        selectedFileIcon.className = "w-5 h-5 text-cyan-500";
      }
      renderIcons();
    }

    // Remove file selection
    removeFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedFile = null;
      fileInput.value = "";
      selectedFileState.classList.add("hidden");
      dropzoneContent.classList.remove("hidden");
    });

    // Submit assignment
    submissionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const taskId = (document.getElementById("subTaskId") as HTMLSelectElement).value;
      const selectEl = document.getElementById("subTaskId") as HTMLSelectElement;
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      
      const taskTitle = selectedOption.getAttribute("data-title") || "";
      const subject = selectedOption.getAttribute("data-subject") || "";
      const taskType = selectedOption.getAttribute("data-type") || "Individu";

      if (!taskId) {
        toast.error("Silakan pilih tugas yang ingin dikumpulkan.");
        return;
      }

      if (!selectedFile) {
        toast.error("Harap lampirkan/unggah file tugas Anda.");
        return;
      }

      // Collect members
      const members: any[] = [];
      if (taskType === "Kelompok") {
        const memberRows = document.querySelectorAll(".member-row");
        memberRows.forEach(row => {
          const nameSelect = row.querySelector(".member-name-input") as HTMLSelectElement;
          const customInput = row.querySelector(".member-custom-name") as HTMLInputElement;
          const absenInput = row.querySelector(".member-absen-input") as HTMLInputElement;

          let name = "";
          if (nameSelect && !nameSelect.classList.contains("hidden")) {
            name = nameSelect.value;
          } else if (customInput) {
            name = customInput.value.trim();
          }

          const absen = parseInt(absenInput?.value || "0", 10);
          if (name) {
            members.push({ name, absen });
          }
        });
      } else {
        members.push({
          name: userSession.name,
          absen: userSession.absen || 0
        });
      }

      // Start uploading animation
      submitSubBtn.disabled = true;
      uploadProgressContainer.classList.remove("hidden");

      progressBar.style.width = "0%";
      progressPercentage.textContent = "0%";

      try {
        if (!selectedFile) {
          throw new Error("Berkas lampiran tidak ditemukan.");
        }

        console.log("Mencoba unggah berkas melalui server ke Firebase Storage...");
        
        const uploadResult = await uploadFileToServer(selectedFile, (progress) => {
          progressBar.style.width = progress + "%";
          progressPercentage.textContent = progress + "%";
        });

        const fileUrl = uploadResult.fileUrl;

        // Ensure we have a valid URL
        if (!fileUrl) {
          throw new Error("Tautan berkas kosong atau tidak valid.");
        }

        progressBar.style.width = "100%";
        progressPercentage.textContent = "100%";

        const submissionPayload = {
          taskId,
          taskTitle,
          subject,
          userId: userSession.uid,
          userName: userSession.name,
          absen: userSession.absen || 0,
          fileName: selectedFile.name,
          fileUrl: fileUrl, // URL link to file
          status: "Menunggu Pemeriksaan",
          feedback: "",
          taskType,
          members
        };

        await addSubmission(submissionPayload);
        toast.success("Tugas Anda berhasil diunggah!");
        
        // Reset selected file in form
        selectedFile = null;
        fileInput.value = "";
        selectedFileState.classList.add("hidden");
        dropzoneContent.classList.remove("hidden");
        
        loadAndRender();
      } catch (err: any) {
        Swal.fire("Gagal Mengirim", err.message, "error");
        submitSubBtn.disabled = false;
        uploadProgressContainer.classList.add("hidden");
      }
    });

    // Delete submission
    document.querySelectorAll(".deleteSubBtn").forEach((btn: any) => {
      btn.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const confirm = await confirmDialog("Hapus Pengumpulan", "Apakah Anda yakin ingin menghapus arsip pengumpulan tugas ini?");
        if (confirm) {
          try {
            await deleteSubmission(btn.dataset.id);
            toast.success("Arsip pengumpulan berhasil dihapus.");
            loadAndRender();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      });
    });

    attachViewFileBtnListeners();
  }

  // -------------------------------------------------------------------------
  // TEACHER & CLASS LEADER VIEW (View All, Confirm, Give Feedback)
  // -------------------------------------------------------------------------
  function renderTeacherView(tasks: any[], submissions: any[], targetContainer: HTMLElement = container) {
    // Calculate Stats
    const totalSubmissions = submissions.length;
    const pendingCount = submissions.filter(s => s.status === "Menunggu Pemeriksaan").length;
    const approvedCount = submissions.filter(s => s.status === "Disetujui").length;
    const revisionCount = submissions.filter(s => s.status === "Perlu Revisi").length;

    targetContainer.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="shield-check" class="text-yellow-400 w-7 h-7"></i> Peninjau Tugas Kelas
            </h1>
            <p class="text-slate-400 text-sm mt-1">Konsol audit khusus Ketua Kelas & Guru untuk memeriksa berkas pengumpulan tugas siswa.</p>
          </div>
          <div>
            <button id="addTeacherTaskBtn" class="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-yellow-500/10 transition-all duration-300">
              <i data-lucide="plus" class="w-4 h-4"></i> Tambah Tugas
            </button>
          </div>
        </div>

        <!-- Stats Overview Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-5 glass rounded-2xl border border-slate-800 bg-slate-900/40">
            <span class="text-[10px] uppercase font-mono tracking-wider text-slate-500">Total Pengumpulan</span>
            <div class="flex items-center gap-2.5 mt-1">
              <span class="text-3xl font-extrabold text-white font-mono">${totalSubmissions}</span>
              <span class="text-xs text-slate-400">Berkas</span>
            </div>
          </div>
          
          <div class="p-5 glass rounded-2xl border border-amber-500/20 bg-amber-950/5">
            <span class="text-[10px] uppercase font-mono tracking-wider text-amber-500">Menunggu Review</span>
            <div class="flex items-center gap-2.5 mt-1">
              <span class="text-3xl font-extrabold text-amber-400 font-mono">${pendingCount}</span>
              <span class="text-xs text-amber-500 animate-pulse">Pending</span>
            </div>
          </div>

          <div class="p-5 glass rounded-2xl border border-emerald-500/20 bg-emerald-950/5">
            <span class="text-[10px] uppercase font-mono tracking-wider text-emerald-500">Telah Disetujui</span>
            <div class="flex items-center gap-2.5 mt-1">
              <span class="text-3xl font-extrabold text-emerald-400 font-mono">${approvedCount}</span>
              <span class="text-xs text-emerald-500">OK</span>
            </div>
          </div>

          <div class="p-5 glass rounded-2xl border border-rose-500/20 bg-rose-950/5">
            <span class="text-[10px] uppercase font-mono tracking-wider text-rose-500">Perlu Revisi</span>
            <div class="flex items-center gap-2.5 mt-1">
              <span class="text-3xl font-extrabold text-rose-400 font-mono">${revisionCount}</span>
              <span class="text-xs text-rose-500">Revisi</span>
            </div>
          </div>
        </div>

        <!-- Filter & Search Panel -->
        <div class="p-4 glass rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="text" id="studentSearch" placeholder="Cari nama siswa atau absen..." class="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-yellow-500 text-slate-100 placeholder-slate-600 text-xs outline-none transition-colors">
          </div>

          <div>
            <select id="taskFilter" class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-yellow-500 text-slate-100 text-xs outline-none transition-colors">
              <option value="">Semua Tugas Kelas</option>
              ${tasks.map(t => `<option value="${t.id}">${t.subject} - ${t.title}</option>`).join("")}
            </select>
          </div>

          <div>
            <select id="statusFilter" class="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:border-yellow-500 text-slate-100 text-xs outline-none transition-colors">
              <option value="">Semua Status Review</option>
              <option value="Menunggu Pemeriksaan">Menunggu Pemeriksaan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Perlu Revisi">Perlu Revisi</option>
            </select>
          </div>
        </div>

        <!-- Submissions Grid/Table -->
        <div class="glass rounded-3xl overflow-hidden border border-slate-800">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900/60 border-b border-slate-850 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th class="py-4 px-6">Siswa (Absen)</th>
                  <th class="py-4 px-6">Mata Pelajaran & Tugas</th>
                  <th class="py-4 px-6">File Lampiran</th>
                  <th class="py-4 px-6">Tanggal Pengiriman</th>
                  <th class="py-4 px-6">Status</th>
                  <th class="py-4 px-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody id="submissionTableBody">
                <!-- Rows loaded dynamically -->
              </tbody>
            </table>
          </div>
          <div id="emptySubmissions" class="hidden py-12 text-center text-slate-500">
            <div class="inline-flex p-4 bg-slate-800/10 rounded-full mb-3"><i data-lucide="clipboard-list" class="w-8 h-8 text-slate-600"></i></div>
            <p class="text-sm">Tidak ada berkas tugas yang cocok dengan pencarian.</p>
          </div>
        </div>
      </div>
    `;

    renderIcons();

    const tableBody = document.getElementById("submissionTableBody") as HTMLTableSectionElement;
    const emptyState = document.getElementById("emptySubmissions") as HTMLDivElement;
    const studentSearch = document.getElementById("studentSearch") as HTMLInputElement;
    const taskFilter = document.getElementById("taskFilter") as HTMLSelectElement;
    const statusFilter = document.getElementById("statusFilter") as HTMLSelectElement;

    function renderRows() {
      const searchVal = studentSearch.value.trim().toLowerCase();
      const taskVal = taskFilter.value;
      const statusVal = statusFilter.value;

      const filtered = submissions.filter(s => {
        const matchSearch = s.userName.toLowerCase().includes(searchVal) || String(s.absen).includes(searchVal);
        const matchTask = !taskVal || s.taskId === taskVal;
        const matchStatus = !statusVal || s.status === statusVal;
        return matchSearch && matchTask && matchStatus;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
      }

      emptyState.classList.add("hidden");
      tableBody.innerHTML = filtered.map(s => {
        let badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
        if (s.status === "Disetujui") {
          badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        } else if (s.status === "Perlu Revisi") {
          badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
        }

        return `
          <tr class="border-b border-slate-850 hover:bg-slate-900/20 transition-colors">
            <td class="py-4 px-6">
              <div class="flex items-start gap-3">
                <div class="w-8.5 h-8.5 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5">
                  ${s.absen}
                </div>
                <div>
                  <span class="text-xs font-bold text-white block leading-none">
                    ${s.userName}
                    ${s.taskType === "Kelompok" 
                      ? `<span class="ml-1.5 text-[8px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">Kelompok</span>` 
                      : `<span class="ml-1.5 text-[8px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400">Individu</span>`
                    }
                  </span>
                  <span class="text-[10px] text-slate-500 block mt-1 font-mono">Pengirim Absen ${s.absen}</span>
                  
                  ${s.members && s.members.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mt-2.5 max-w-xs">
                      ${s.members.map((m: any) => `
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono" title="${m.name} (Absen ${m.absen})">
                          ${m.name} <span class="text-slate-500">(${m.absen})</span>
                        </span>
                      `).join("")}
                    </div>
                  ` : ""}
                </div>
              </div>
            </td>
            <td class="py-4 px-6">
              <span class="text-[10px] font-mono text-slate-500 uppercase block">${s.subject}</span>
              <span class="text-xs font-semibold text-slate-200 mt-0.5 block">${s.taskTitle}</span>
            </td>
            <td class="py-4 px-6">
              <div class="flex items-center gap-2 max-w-xs overflow-hidden font-sans">
                <i data-lucide="file-text" class="text-slate-400 w-3.5 h-3.5 shrink-0"></i>
                ${s.fileUrl && s.fileUrl.includes("classhub-storage.local") ? `
                  <button class="text-xs text-slate-500 hover:text-slate-400 line-through truncate cursor-pointer text-left simulated-file-btn" data-filename="${s.fileName || 'berkas'}">
                    ${s.fileName || 'Berkas Uji Coba'} <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono ml-1 shrink-0">Simulasi</span>
                  </button>
                ` : `
                  <button class="view-file-btn text-xs text-cyan-400 hover:underline truncate cursor-pointer text-left font-semibold" data-url="${s.fileUrl}" data-name="${s.fileName || 'Lihat Berkas'}" title="Pratinjau & Unduh Berkas">
                    ${s.fileName || 'Lihat Berkas'}
                  </button>
                `}
              </div>
            </td>
            <td class="py-4 px-6">
              <span class="text-xs text-slate-400 font-mono">${formatDate(s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt))}</span>
            </td>
            <td class="py-4 px-6">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-lg ${badgeColor}">
                ${s.status}
              </span>
            </td>
            <td class="py-4 px-6 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button class="reviewBtn px-2.5 py-1.5 bg-slate-900 hover:bg-yellow-500 hover:text-slate-950 border border-slate-850 text-slate-300 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1" data-id="${s.id}" data-feedback="${s.feedback || ''}" data-status="${s.status}">
                  <i data-lucide="edit-3" class="w-3 h-3"></i> Tinjau
                </button>
                <button class="deleteSubBtn p-1.5 bg-slate-900 border border-slate-850 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-colors" data-id="${s.id}">
                  <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      renderIcons();
      attachViewFileBtnListeners();

      // Attach simulated file click warnings
      document.querySelectorAll(".simulated-file-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          Swal.fire({
            title: "Berkas Simulasi",
            text: `Berkas "${btn.dataset.filename}" adalah data contoh (simulasi) dari sistem lama sebelum fitur upload aktif. Harap minta siswa bersangkutan untuk mengunggah ulang tugas aslinya.`,
            icon: "info",
            background: "#0f172a",
            color: "#f8fafc",
            confirmButtonText: "Mengerti",
            confirmButtonColor: "#334155"
          });
        });
      });

      // Attach Actions
      document.querySelectorAll(".reviewBtn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const subId = btn.dataset.id;
          const curStatus = btn.dataset.status;
          const curFeedback = btn.dataset.feedback;

          Swal.fire({
            title: "Tinjau Tugas Siswa",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 text-left mt-4 font-sans">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Status Pengumpulan</label>
                  <select id="revStatus" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm">
                    <option value="Menunggu Pemeriksaan" ${curStatus === 'Menunggu Pemeriksaan' ? 'selected' : ''}>Menunggu Pemeriksaan</option>
                    <option value="Disetujui" ${curStatus === 'Disetujui' ? 'selected' : ''}>Setujui / Lolos Pemeriksaan</option>
                    <option value="Perlu Revisi" ${curStatus === 'Perlu Revisi' ? 'selected' : ''}>Perlu Revisi</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Catatan / Feedback Evaluasi</label>
                  <textarea id="revFeedback" placeholder="Masukkan saran perbaikan, nilai, atau catatan konfirmasi tugas..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-yellow-500 text-white outline-none text-sm h-24 resize-none">${curFeedback}</textarea>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Simpan Keputusan",
            cancelButtonText: "Batal",
            confirmButtonColor: "#eab308",
            cancelButtonColor: "#334155",
            preConfirm: () => {
              const status = (document.getElementById("revStatus") as HTMLSelectElement).value;
              const feedback = (document.getElementById("revFeedback") as HTMLTextAreaElement).value.trim();
              return { status, feedback };
            }
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                await updateSubmissionFeedback(subId, result.value.status, result.value.feedback);
                toast.success("Hasil peninjauan berhasil disimpan!");
                loadAndRender();
              } catch (err: any) {
                Swal.fire("Gagal", err.message, "error");
              }
            }
          });
        });
      });

      document.querySelectorAll(".deleteSubBtn").forEach((btn: any) => {
        btn.addEventListener("click", async () => {
          const confirm = await confirmDialog("Hapus Berkas", "Apakah Anda yakin ingin menghapus arsip pengumpulan ini?");
          if (confirm) {
            try {
              await deleteSubmission(btn.dataset.id);
              toast.success("Arsip pengumpulan berhasil dihapus.");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Error", err.message, "error");
            }
          }
        });
      });
    }

    const addTeacherTaskBtn = document.getElementById("addTeacherTaskBtn");
    if (addTeacherTaskBtn) {
      addTeacherTaskBtn.addEventListener("click", () => {
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
              await writeAuditLog("Create Task", `Membuat Tugas Baru: [${result.value.subject}] ${result.value.title}`);
              toast.success("Tugas berhasil ditambahkan ke kelas!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    }

    studentSearch.addEventListener("input", renderRows);
    taskFilter.addEventListener("change", renderRows);
    statusFilter.addEventListener("change", renderRows);

    renderRows();
  }

  loadAndRender();
}
