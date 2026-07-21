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

