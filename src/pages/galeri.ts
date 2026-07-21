import { 
  getGallery, 
  addGalleryPhoto, 
  deleteGalleryPhoto, 
  getSharedFiles, 
  addSharedFile, 
  deleteSharedFile 
} from "../firebase/db";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { renderIcons, formatDate, toast, confirmDialog, uploadFileToServer } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderGaleri(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat galeri & repositori...</span>
    </div>
  `;

  async function loadAndRender() {
    const [photos, files] = await Promise.all([
      getGallery(),
      getSharedFiles()
    ]);

    const isEditor = userSession.role === "Super Admin" || userSession.role === "Sekretaris" || userSession.role === "Wakil" || userSession.role === "Bendahara";

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="image" class="text-cyan-400 w-7 h-7"></i> Galeri & Berkas Kelas
            </h1>
            <p class="text-slate-400 text-sm mt-1">Simpan dokumentasi momen kebersamaan dan repositori link berkas materi belajar mengajar.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="addFileBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all">
              <i data-lucide="file-up" class="w-4 h-4"></i> Bagikan Link File
            </button>
            <button id="addPhotoBtn" class="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg transition-all">
              <i data-lucide="camera" class="w-4 h-4"></i> Unggah Foto
            </button>
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="flex border-b border-slate-800 gap-6">
          <button id="tabPhotos" class="pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors">Galeri Momen Kelas (${photos.length})</button>
          <button id="tabFiles" class="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors">Repositori Berkas & Link (${files.length})</button>
        </div>

        <!-- Photos Section -->
        <div id="photosSection" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${photos.length > 0 ? photos.map((p: any) => `
              <div class="glass rounded-3xl overflow-hidden relative group glass-card-hover bg-slate-900/20">
                <div class="relative aspect-video w-full overflow-hidden">
                  <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                </div>
                <div class="p-5">
                  <span class="text-[10px] font-mono text-slate-500 block uppercase">${formatDate(p.date)}</span>
                  <h3 class="text-base font-bold text-white mt-1 leading-snug">${p.title}</h3>
                  <p class="text-xs text-slate-400 mt-2 leading-relaxed">${p.description || ""}</p>
                  
                  <div class="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
                    <span class="text-[10px] text-slate-500">Oleh: ${p.uploadedBy || "Siswa"}</span>
                    ${isEditor || p.userId === userSession.uid ? `
                      <button class="deletePhotoBtn p-1.5 bg-slate-950/80 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 rounded-lg text-slate-400 transition-colors" data-id="${p.id}">
                        <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : ""}
                  </div>
                </div>
              </div>
            `).join("") : `
              <div class="col-span-full py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="image" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada foto yang diunggah ke galeri kelas.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Shared Files Section -->
        <div id="filesSection" class="space-y-6 hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${files.length > 0 ? files.map((f: any) => {
              const fileTypeIcons: any = {
                "pdf": "file-text",
                "canva": "image",
                "drive": "download",
                "github": "award",
                "other": "paperclip"
              };

              const colors: any = {
                "pdf": "text-rose-400 bg-rose-500/10 border border-rose-500/20",
                "canva": "text-blue-400 bg-blue-500/10 border border-blue-500/20",
                "drive": "text-amber-400 bg-amber-500/10 border border-amber-500/20",
                "github": "text-purple-400 bg-purple-500/10 border border-purple-500/20",
                "other": "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
              };

              return `
                <div class="glass p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between glass-card-hover bg-slate-900/20">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <span class="inline-block px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-lg ${colors[f.category] || colors['other']}">
                        ${f.category}
                      </span>
                      <span class="text-[9px] font-mono text-slate-500">${formatDate(f.uploadDate)}</span>
                    </div>

                    <h3 class="text-xs font-bold text-white line-clamp-2 leading-snug">${f.name}</h3>
                    <p class="text-[10px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">${f.description || "Tidak ada deskripsi."}</p>
                  </div>

                  <div class="mt-6 pt-3 border-t border-slate-850 flex items-center justify-between">
                    <a href="${f.url}" target="_blank" class="flex items-center gap-1 text-xs text-cyan-400 font-bold hover:underline">
                      <i data-lucide="paperclip" class="w-3.5 h-3.5"></i> Buka Link
                    </a>
                    ${isEditor || f.uploadedByUid === userSession.uid ? `
                      <button class="deleteFileBtn p-1.5 bg-slate-950/80 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 rounded-lg text-slate-400 transition-colors" data-id="${f.id}">
                        <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : ""}
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="col-span-full py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="file-up" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada file bersama yang dibagikan.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Section switcher tabs
    const tabPhotos = document.getElementById("tabPhotos") as HTMLButtonElement;
    const tabFiles = document.getElementById("tabFiles") as HTMLButtonElement;
    const photosSection = document.getElementById("photosSection") as HTMLDivElement;
    const filesSection = document.getElementById("filesSection") as HTMLDivElement;

    tabPhotos.addEventListener("click", () => {
      tabPhotos.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabFiles.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      photosSection.classList.remove("hidden");
      filesSection.classList.add("hidden");
    });

    tabFiles.addEventListener("click", () => {
      tabFiles.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabPhotos.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      filesSection.classList.remove("hidden");
      photosSection.classList.add("hidden");
    });

    // Delete photo listener
    document.querySelectorAll(".deletePhotoBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus Foto", "Apakah Anda yakin ingin menghapus foto ini dari galeri kelas?");
        if (confirm) {
          try {
            await deleteGalleryPhoto(btn.dataset.id);
            toast.success("Foto dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Delete file listener
    document.querySelectorAll(".deleteFileBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus File Berkas", "Hapus link file berkas bersama ini?");
        if (confirm) {
          try {
            await deleteSharedFile(btn.dataset.id);
            toast.success("File berkas berhasil dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Form inputs and uploads
    const addPhotoBtn = document.getElementById("addPhotoBtn") as HTMLButtonElement;
    addPhotoBtn.addEventListener("click", () => {
      Swal.fire({
        title: "Unggah Foto Momen Kelas",
        background: "#0f172a",
        color: "#f8fafc",
        html: `
          <div class="space-y-4 text-left mt-4 font-sans">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Foto / Kegiatan</label>
              <input type="text" id="pTitle" placeholder="Contoh: Kerja Kelompok di Lab TKJ" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">File Foto Kegiatan (Maks 4MB)</label>
              <input type="file" id="pPhotoFile" accept="image/*" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20">
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi Singkat</label>
              <textarea id="pDesc" placeholder="Kisah seru dibalik foto ini..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-16 resize-none"></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Unggah",
        cancelButtonText: "Batal",
        confirmButtonColor: "#06b6d4",
        cancelButtonColor: "#334155",
        preConfirm: () => {
          const title = (document.getElementById("pTitle") as HTMLInputElement).value.trim();
          const description = (document.getElementById("pDesc") as HTMLTextAreaElement).value.trim();
          const fileInput = document.getElementById("pPhotoFile") as HTMLInputElement;
          const file = fileInput?.files?.[0];

          if (!title || !file) {
            Swal.showValidationMessage("Judul dan File Foto harus diisi!");
            return false;
          }

          return { title, description, file };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          const { title, description, file } = result.value;

          // Open a custom modal dedicated for real-time progress visualization
          Swal.fire({
            title: "Mengunggah Foto...",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 font-sans text-center mt-3">
                <div class="flex items-center justify-center">
                  <div class="relative w-14 h-14 flex items-center justify-center">
                    <!-- Rotating loader ring -->
                    <div class="absolute inset-0 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
                    <i data-lucide="camera" class="w-5 h-5 text-cyan-400"></i>
                  </div>
                </div>

                <div class="space-y-1">
                  <p id="pUploadStatusText" class="text-xs text-slate-300 font-medium animate-pulse">Menyiapkan & mengompresi gambar...</p>
                  <p class="text-[10px] text-slate-500 font-mono" id="pUploadSizeText">${(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>

                <!-- Custom Glowing Progress Bar Track -->
                <div class="w-full bg-slate-950/80 border border-slate-800 rounded-full h-3 overflow-hidden relative p-[2px]">
                  <div id="pUploadProgressBar" class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[0%] rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                </div>

                <div class="flex justify-between items-center text-[10px] text-slate-400 font-mono px-0.5">
                  <span id="pUploadProgressPercent">0%</span>
                  <span id="pUploadProgressDetail">0.00 MB / ${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
            `,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              renderIcons();
            }
          });

          const progressBar = document.getElementById("pUploadProgressBar");
          const progressPercent = document.getElementById("pUploadProgressPercent");
          const progressDetail = document.getElementById("pUploadProgressDetail");
          const statusText = document.getElementById("pUploadStatusText");

          try {
            const uploadResult = await uploadFileToServer(file, (progress) => {
              if (statusText) statusText.textContent = "Mengunggah berkas ke server...";
              if (progressBar) progressBar.style.width = `${progress}%`;
              if (progressPercent) progressPercent.textContent = `${progress}%`;

              const totalMB = (file.size / (1024 * 1024)).toFixed(2);
              const currentMB = ((file.size * (progress / 100)) / (1024 * 1024)).toFixed(2);
              if (progressDetail) progressDetail.textContent = `${currentMB} MB / ${totalMB} MB`;
            });

            if (statusText) statusText.textContent = "Menyimpan ke basis data...";

            const imageUrl = uploadResult.fileUrl;
            await addGalleryPhoto({ 
              title, 
              description, 
              imageUrl, 
              uploadedBy: userSession.name, 
              userId: userSession.uid 
            });

            Swal.close();
            toast.success("Foto berhasil dipublikasikan di galeri kelas!");
            loadAndRender();
          } catch (err: any) {
            Swal.fire({
              title: "Gagal Mengunggah",
              text: err.message || "Terjadi kesalahan saat mengunggah foto.",
              icon: "error",
              background: "#0f172a",
              color: "#f8fafc",
              confirmButtonColor: "#ef4444"
            });
          }
        }
      });
    });

    const addFileBtn = document.getElementById("addFileBtn") as HTMLButtonElement;
    addFileBtn.addEventListener("click", () => {
      Swal.fire({
        title: "Bagikan Berkas Baru",
        background: "#0f172a",
        color: "#f8fafc",
        html: `
          <div class="space-y-4 text-left mt-4 font-sans">
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Berkas</label>
              <input type="text" id="fName" placeholder="Contoh: Modul Konfigurasi Debian 12" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Kategori File</label>
                <select id="fCategory" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                  <option value="pdf">Modul (PDF / PPT)</option>
                  <option value="drive">Google Drive Link</option>
                  <option value="canva">Link Canva / Desain</option>
                  <option value="github">Link Kode / GitHub</option>
                  <option value="other">Tautan Lainnya</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Link URL</label>
                <input type="url" id="fUrl" placeholder="https://..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs">
              </div>
            </div>
            <div>
              <label class="block text-xs text-slate-400 font-semibold mb-1">Keterangan Tambahan</label>
              <textarea id="fDesc" placeholder="Keterangan singkat mengenai berkas ini..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-16 resize-none"></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Simpan Berkas",
        cancelButtonText: "Batal",
        confirmButtonColor: "#06b6d4",
        cancelButtonColor: "#334155",
        preConfirm: () => {
          const name = (document.getElementById("fName") as HTMLInputElement).value.trim();
          const category = (document.getElementById("fCategory") as HTMLSelectElement).value;
          const url = (document.getElementById("fUrl") as HTMLInputElement).value.trim();
          const description = (document.getElementById("fDesc") as HTMLTextAreaElement).value.trim();

          if (!name || !url) {
            Swal.showValidationMessage("Nama berkas dan Tautan URL wajib diisi!");
            return false;
          }
          return { name, category, url, description, uploadedByUid: userSession.uid, uploadedByName: userSession.name };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await addSharedFile(result.value);
            toast.success("Berkas / Tautan belajar berhasil ditambahkan!");
            loadAndRender();
          } catch (err: any) {
            Swal.fire("Gagal", err.message, "error");
          }
        }
      });
    });
  }

  loadAndRender();
}
