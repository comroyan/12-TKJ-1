import { 
  createIcons, 
  Home, 
  User, 
  Calendar, 
  BookOpen, 
  Clock, 
  DollarSign, 
  Award, 
  Grid, 
  Image, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  FileUp, 
  ListTodo, 
  ShieldAlert, 
  Heart, 
  Users, 
  MessageSquare, 
  PhoneCall,
  Search,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Paperclip,
  CheckSquare,
  Square,
  Lock,
  Menu,
  X,
  Info,
  CalendarDays,
  FileCheck,
  Send,
  Camera
} from "lucide";
import Swal from "sweetalert2";
import { addSubmission } from "../firebase/db";

// Currency Formatter
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

// Date Formatter
export function formatDate(dateInput: any): string {
  if (!dateInput) return "-";
  let date: Date;
  if (dateInput.toDate && typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

// Short Date Formatter
export function formatShortDate(dateInput: any): string {
  if (!dateInput) return "-";
  let date: Date;
  if (dateInput.toDate && typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

// Global Toast Notifications
export const toast = {
  success: (title: string) => {
    Swal.fire({
      icon: "success",
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#1e293b",
      color: "#f8fafc"
    });
  },
  error: (title: string) => {
    Swal.fire({
      icon: "error",
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#1e293b",
      color: "#f8fafc"
    });
  },
  info: (title: string) => {
    Swal.fire({
      icon: "info",
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#1e293b",
      color: "#f8fafc"
    });
  }
};

// Confirm Dialog
export async function confirmDialog(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#06b6d4",
    cancelButtonColor: "#ef4444",
    confirmButtonText: "Ya, lanjutkan",
    cancelButtonText: "Batal",
    background: "#0f172a",
    color: "#f8fafc"
  });
  return result.isConfirmed;
}

// Lucide Icon Renderer
export function renderIcons() {
  createIcons({
    icons: {
      Home, 
      User, 
      Calendar, 
      BookOpen, 
      Clock, 
      DollarSign, 
      Award, 
      Grid, 
      Image, 
      FileText, 
      SettingsIcon, 
      LogOut, 
      Bell, 
      FileUp, 
      ListTodo, 
      ShieldAlert, 
      Heart, 
      Users, 
      MessageSquare, 
      PhoneCall,
      Search,
      Plus,
      Trash2,
      Edit,
      CheckCircle,
      XCircle,
      FileSpreadsheet,
      Download,
      AlertTriangle,
      RotateCcw,
      Sparkles,
      Paperclip,
      CheckSquare,
      Square,
      Lock,
      Menu,
      X,
      Info,
      CalendarDays,
      FileCheck,
      Send,
      Camera
    }
  });
}

// Export CSV / Excel Helper
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Print/PDF Helper
export function printPDF(title: string, headers: string[], rows: string[][]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: right; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        <div class="footer">
          <p>ClassHub XII TKJ 1 - Pusat Manajemen Digital Kelas</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

// Check if current week of the year is odd (ganjil)
export function isOddWeek(dateInput: Date = new Date()): boolean {
  const d = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo % 2 !== 0;
}

let activeBackendBase = "https://ais-dev-i66yyju5cwidah224f6iqz-705381100555.asia-southeast1.run.app";

// Dynamic active backend detection to always route through the running container (Dev or Pre)
if (typeof window !== "undefined") {
  const currentOrigin = window.location.origin;
  if (currentOrigin.includes("run.app")) {
    activeBackendBase = currentOrigin;
  } else {
    const devUrl = "https://ais-dev-i66yyju5cwidah224f6iqz-705381100555.asia-southeast1.run.app";
    const preUrl = "https://ais-pre-i66yyju5cwidah224f6iqz-705381100555.asia-southeast1.run.app";

    // Fast parallel ping to find whichever is active right now
    Promise.any([
      fetch(`${devUrl}/api/health`).then(res => { if (res.ok) return devUrl; throw new Error(); }),
      fetch(`${preUrl}/api/health`).then(res => { if (res.ok) return preUrl; throw new Error(); })
    ]).then(url => {
      activeBackendBase = url;
      console.log("ClassHub: Terhubung ke backend aktif:", url);
    }).catch(() => {
      // Default to dev container as it's the active workspace container
      activeBackendBase = devUrl;
    });
  }
}

// Get correct API / resource URL when running statically on external hosts like Vercel
export function getApiUrl(path: string): string {
  if (!path) return "";
  if (
    path.startsWith("http://") || 
    path.startsWith("https://") || 
    path.startsWith("data:") || 
    path.startsWith("blob:")
  ) {
    return path;
  }
  const currentOrigin = window.location.origin;
  
  // Robust check for previews, sandbox, local and container environments to prevent routing to dead external URLs
  if (
    currentOrigin.includes("googleusercontent.com") ||
    currentOrigin.includes("aistudio.google") ||
    currentOrigin.includes("google.com") ||
    currentOrigin.includes("localhost") ||
    currentOrigin.includes("127.0.0.1") ||
    currentOrigin.includes("run.app")
  ) {
    return path;
  }
  
  // External deployments (e.g. Vercel or GitHub Pages)
  if (
    currentOrigin.includes("vercel.app") ||
    currentOrigin.includes("github.io") ||
    (!currentOrigin.includes("run.app") && !currentOrigin.includes("localhost") && !currentOrigin.includes("127.0.0.1"))
  ) {
    return `${activeBackendBase}${path.startsWith("/") ? path : "/" + path}`;
  }
  return path;
}

// Client-side image compression utility to prevent exceeding Firestore sizes & speed up uploads
export async function compressImage(file: File, maxW = 1200, maxH = 1200, quality = 0.75): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            // Only return compressed if it's actually smaller
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Reusable server-side upload helper which avoids CORS, with automatic browser-side Firebase Storage fallback
export async function uploadFileToServer(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; fileUrl: string; fileName: string; storage: string }> {
  // Always compress images client-side before any upload attempt to ensure small sizes and Firestore compatibility
  let fileToUpload = file;
  if (file.type.startsWith("image/")) {
    try {
      fileToUpload = await compressImage(file);
      console.log(`Image compressed from ${(file.size / 1024).toFixed(1)}KB to ${(fileToUpload.size / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.warn("Gagal mengompresi gambar, menggunakan file asli:", err);
    }
  }

  // 1. Try SERVER-SIDE upload FIRST
  // This is extremely fast, avoids CORS/sandbox issues, has native progress updates, and handles Firebase upload asynchronously.
  try {
    const result = await new Promise<{ success: boolean; fileUrl: string; fileName: string; storage: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Keep server-side timeout short (15 seconds)
      const uploadTimeout = setTimeout(() => {
        xhr.abort();
        reject(new Error("Timeout mengunggah ke server (15 detik)"));
      }, 15000);

      xhr.open("POST", getApiUrl("/api/upload"));

      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      xhr.onload = () => {
        clearTimeout(uploadTimeout);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("Respon server tidak valid"));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error || `Gagal mengunggah berkas (${xhr.status})`));
          } catch {
            reject(new Error(`Gagal mengunggah berkas dengan kode status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        clearTimeout(uploadTimeout);
        reject(new Error("Koneksi jaringan gagal saat mengunggah berkas ke server"));
      };

      xhr.send(formData);
    });
    return result;
  } catch (serverError: any) {
    console.warn("Server-side upload failed. Falling back to direct browser-to-Firebase Storage upload...", serverError);

    // 2. Fallback to direct browser-to-Firebase Storage upload
    try {
      const { storage } = await import("../firebase/config");
      const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
      
      const safeName = `${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const storageRef = ref(storage, `uploads/${safeName}`);
      
      return await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
        
        // Timeout of 20 seconds for direct client-to-cloud upload
        const storageTimeout = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error("Timeout mengunggah langsung ke Firebase Storage (20 detik)"));
        }, 20000);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            if (onProgress) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(progress);
            }
          },
          (err) => {
            clearTimeout(storageTimeout);
            reject(err);
          },
          async () => {
            clearTimeout(storageTimeout);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                success: true,
                fileUrl: downloadUrl,
                fileName: fileToUpload.name,
                storage: "firebase_browser"
              });
            } catch (urlErr: any) {
              reject(urlErr);
            }
          }
        );
      });
    } catch (firebaseError: any) {
      console.warn("Direct Firebase Storage upload failed too. Using ultimate local base64 fallback...", firebaseError);
      
      // 3. Ultimate Fallback: Base64 data-URL inline storage for files (only if size is < 1.0MB to safeguard Firestore limit)
      try {
        if (fileToUpload.size > 0.7 * 1024 * 1024) {
          throw new Error("Ukuran berkas melebihi batas simpan luring (700KB).");
        }
        
        if (onProgress) {
          onProgress(50);
        }
        
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Gagal membaca berkas lokal"));
          reader.readAsDataURL(fileToUpload);
        });
        
        if (onProgress) {
          onProgress(100);
        }
        
        return {
          success: true,
          fileUrl: base64Url,
          fileName: fileToUpload.name,
          storage: "base64"
        };
      } catch (base64Err: any) {
        throw new Error("Semua metode unggah gagal: " + base64Err.message);
      }
    }
  }
}

// Browser System Notification Helpers
export function sendLocalSystemNotification(title: string, body: string) {
  if (!("Notification" in window)) {
    console.warn("Browser ini tidak mendukung notifikasi sistem.");
    return;
  }

  if (Notification.permission === "granted") {
    try {
      const options = {
        body,
        icon: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=192&h=192&fit=crop",
        badge: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=96&h=96&fit=crop",
        vibrate: [200, 100, 200],
        tag: "classhub-notif",
        renotify: true
      };

      // Check if service worker is registered and ready for full mobile support
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        }).catch((err) => {
          console.warn("Service worker failed showing notification, using fallback:", err);
          try {
            new Notification(title, options);
          } catch (fallbackErr) {
            console.error("Fallback notification failed:", fallbackErr);
          }
        });
      } else {
        // Fallback for standard desktop browsers
        new Notification(title, options);
      }
    } catch (e) {
      console.warn("Gagal menampilkan notifikasi sistem:", e);
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    toast.error("Browser Anda tidak mendukung notifikasi sistem.");
    return false;
  }

  try {
    const permission = await Notification.permission;
    if (permission === "granted") {
      toast.success("Notifikasi sistem HP/Desktop sudah aktif! 🎉");
      sendLocalSystemNotification("Notifikasi Aktif!", "Anda akan menerima pengumuman penting XII TKJ 1 langsung di layar HP/Desktop Anda.");
      return true;
    }

    const requested = await Notification.requestPermission();
    if (requested === "granted") {
      toast.success("Notifikasi sistem HP/Desktop berhasil diaktifkan! 🎉");
      sendLocalSystemNotification("Notifikasi Aktif!", "Anda akan menerima pengumuman penting XII TKJ 1 langsung di layar HP/Desktop Anda.");
      return true;
    } else {
      toast.info("Izin notifikasi ditolak atau diblokir. Silakan aktifkan izin notifikasi di setelan browser Anda.");
      return false;
    }
  } catch (err: any) {
    console.error("Gagal meminta izin notifikasi:", err);
    return false;
  }
}

export async function openSubmitTaskModal(task: any, userSession: any, onSuccess: () => void) {
  const isKelompok = task.type === "Kelompok";
  let selectedFile: File | null = null;
  let members: { name: string; absen: number }[] = [
    { name: userSession.name, absen: userSession.absen || 0 }
  ];

  const { value: formValues } = await Swal.fire({
    title: "Kumpulkan Tugas",
    background: "#0f172a",
    color: "#f8fafc",
    confirmButtonColor: "#06b6d4",
    cancelButtonColor: "#334155",
    confirmButtonText: "Kirim Tugas",
    cancelButtonText: "Batal",
    showCancelButton: true,
    html: `
      <div class="space-y-4 text-left font-sans mt-2">
        <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span class="text-[10px] font-mono text-cyan-400 block uppercase">Mata Pelajaran</span>
          <span class="text-xs font-semibold text-slate-300 block">${task.subject}</span>
          <span class="text-sm font-bold text-white block mt-1">${task.title}</span>
        </div>

        ${isKelompok ? `
          <div>
            <label class="block text-xs text-slate-400 font-semibold mb-1.5">Anggota Kelompok</label>
            <div id="modal-members-list" class="space-y-2 mb-2">
              <div class="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                <span class="text-xs font-bold text-white flex-1">${userSession.name} (Absen ${userSession.absen || 0})</span>
                <span class="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase">Ketua</span>
              </div>
            </div>
            <div class="flex gap-2">
              <input type="text" id="modal-member-name" placeholder="Nama Anggota Baru" class="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500">
              <input type="number" id="modal-member-absen" placeholder="Absen" class="w-20 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500">
              <button type="button" id="modal-add-member-btn" class="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-colors">Tambah</button>
            </div>
          </div>
        ` : ""}

        <div>
          <label class="block text-xs text-slate-400 font-semibold mb-1.5">Upload File Lampiran</label>
          <div id="modal-dropzone" class="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 rounded-2xl p-6 text-center cursor-pointer transition-all relative group">
            <input type="file" id="modal-file-input" class="hidden" accept=".zip,.rar,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.pkt,.pkz">
            <div id="modal-dropzone-content" class="space-y-2">
              <div class="inline-flex p-3 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:scale-115 transition-transform">
                <i data-lucide="cloud-lightning" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-semibold text-slate-300">Tarik berkas ke sini atau <span class="text-cyan-400 underline">pilih dari folder</span></p>
              <p class="text-[9px] text-slate-500 font-mono">ZIP, RAR, PDF, DOCX, PNG, PKT (Maks. 50MB)</p>
            </div>
            <div id="modal-selected-file" class="hidden flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl text-left">
              <div class="flex items-center gap-3 overflow-hidden">
                <div class="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <i data-lucide="file-text" class="w-4 h-4"></i>
                </div>
                <div class="overflow-hidden">
                  <p id="modal-filename" class="text-xs font-bold text-white truncate"></p>
                  <p id="modal-filesize" class="text-[9px] text-slate-500 font-mono"></p>
                </div>
              </div>
              <button type="button" id="modal-remove-file-btn" class="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>

        <div id="modal-progress-container" class="hidden space-y-1.5 p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
          <div class="flex justify-between text-[10px] font-bold font-mono">
            <span class="text-slate-400" id="modal-progress-status">Mengunggah ke server...</span>
            <span class="text-cyan-400" id="modal-progress-pct">0%</span>
          </div>
          <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
            <div id="modal-progress-bar" class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `,
    didOpen: () => {
      const dropzone = document.getElementById("modal-dropzone") as HTMLDivElement;
      const fileInput = document.getElementById("modal-file-input") as HTMLInputElement;
      const dropzoneContent = document.getElementById("modal-dropzone-content") as HTMLDivElement;
      const selectedFileState = document.getElementById("modal-selected-file") as HTMLDivElement;
      const filenameEl = document.getElementById("modal-filename") as HTMLParagraphElement;
      const filesizeEl = document.getElementById("modal-filesize") as HTMLParagraphElement;
      const removeBtn = document.getElementById("modal-remove-file-btn") as HTMLButtonElement;

      function handleFile(file: File) {
        if (file.size > 50 * 1024 * 1024) {
          Swal.showValidationMessage("Ukuran berkas maksimal 50MB!");
          return;
        }
        selectedFile = file;
        filenameEl.textContent = file.name;
        filesizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        
        dropzoneContent.classList.add("hidden");
        selectedFileState.classList.remove("hidden");
      }

      dropzone.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files[0]) {
          handleFile(fileInput.files[0]);
        }
      });

      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("border-cyan-500", "bg-cyan-950/10");
      });

      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("border-cyan-500", "bg-cyan-950/10");
      });

      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("border-cyan-500", "bg-cyan-950/10");
        if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = "";
        selectedFileState.classList.add("hidden");
        dropzoneContent.classList.remove("hidden");
      });

      if (isKelompok) {
        const membersList = document.getElementById("modal-members-list") as HTMLDivElement;
        const addMemberBtn = document.getElementById("modal-add-member-btn") as HTMLButtonElement;
        const memberNameInput = document.getElementById("modal-member-name") as HTMLInputElement;
        const memberAbsenInput = document.getElementById("modal-member-absen") as HTMLInputElement;

        addMemberBtn.addEventListener("click", () => {
          const name = memberNameInput.value.trim();
          const absenVal = memberAbsenInput.value.trim();
          const absen = parseInt(absenVal || "0", 10);

          if (!name) {
            Swal.showValidationMessage("Nama anggota tidak boleh kosong!");
            return;
          }

          members.push({ name, absen });

          const row = document.createElement("div");
          row.className = "flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800 animate-fadeIn";
          row.innerHTML = `
            <span class="text-xs font-bold text-white flex-1">${name} (Absen ${absen})</span>
            <button type="button" class="modal-remove-member-btn p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          `;

          row.querySelector(".modal-remove-member-btn")?.addEventListener("click", () => {
            members = members.filter(m => m.name !== name);
            row.remove();
          });

          membersList.appendChild(row);
          memberNameInput.value = "";
          memberAbsenInput.value = "";
        });
      }
    },
    preConfirm: async () => {
      if (!selectedFile) {
        Swal.showValidationMessage("Silakan pilih file tugas terlebih dahulu!");
        return false;
      }

      const progressContainer = document.getElementById("modal-progress-container") as HTMLDivElement;
      const progressBar = document.getElementById("modal-progress-bar") as HTMLDivElement;
      const progressStatus = document.getElementById("modal-progress-status") as HTMLSpanElement;
      const progressPct = document.getElementById("modal-progress-pct") as HTMLSpanElement;

      progressContainer.classList.remove("hidden");

      try {
        progressStatus.textContent = "Mengunggah berkas...";
        const uploadResult = await uploadFileToServer(selectedFile, (pct) => {
          progressBar.style.width = pct + "%";
          progressPct.textContent = pct + "%";
        });

        if (!uploadResult || !uploadResult.fileUrl) {
          throw new Error("Gagal mengunggah berkas");
        }

        progressStatus.textContent = "Menyimpan ke database...";
        const payload = {
          taskId: task.id,
          taskTitle: task.title,
          subject: task.subject,
          userId: userSession.uid,
          userName: userSession.name,
          absen: userSession.absen || 0,
          fileName: selectedFile.name,
          fileUrl: uploadResult.fileUrl,
          status: "Menunggu Pemeriksaan",
          feedback: "",
          taskType: task.type || "Individu",
          members: members
        };

        await addSubmission(payload);
        return true;
      } catch (err: any) {
        Swal.showValidationMessage("Error: " + err.message);
        return false;
      }
    }
  });

  if (formValues) {
    Swal.fire({
      icon: "success",
      title: "Tugas Terkumpul!",
      text: "Tugas Anda berhasil diunggah ke server ClassHub.",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#06b6d4"
    });
    onSuccess();
  }
}

