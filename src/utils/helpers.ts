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

// Get correct API / resource URL when running statically on external hosts like Vercel
export function getApiUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const currentOrigin = window.location.origin;
  if (
    currentOrigin.includes("vercel.app") ||
    currentOrigin.includes("github.io") ||
    (!currentOrigin.includes("run.app") && !currentOrigin.includes("localhost") && !currentOrigin.includes("127.0.0.1"))
  ) {
    const backendBase = "https://ais-pre-i66yyju5cwidah224f6iqz-705381100555.asia-southeast1.run.app";
    return `${backendBase}${path.startsWith("/") ? path : "/" + path}`;
  }
  return path;
}

// Reusable server-side upload helper which avoids CORS, with automatic browser-side Firebase Storage fallback
export async function uploadFileToServer(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; fileUrl: string; fileName: string; storage: string }> {
  try {
    // 1. Try uploading to Server first
    const result = await new Promise<{ success: boolean; fileUrl: string; fileName: string; storage: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      // Add a client-side timeout of 5.5 seconds to prevent hanging on slow network or scaled-down backend
      const uploadTimeout = setTimeout(() => {
        xhr.abort();
        reject(new Error("Timeout mengunggah ke server (5.5s)"));
      }, 5500);

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
        reject(new Error("Koneksi jaringan gagal saat mengunggah berkas"));
      };

      xhr.send(formData);
    });
    return result;
  } catch (error) {
    console.warn("Gagal mengunggah lewat server backend, mencoba fallback langsung ke Firebase Storage browser...", error);
    
    // 2. Fallback to direct client-side Firebase Storage Upload
    try {
      // Dynamic import to avoid circular dependencies and keep startup footprint light
      const { storage } = await import("../firebase/config");
      const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
      
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const storageRef = ref(storage, `fallback_uploads/${safeName}`);
      
      return await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            if (onProgress) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(progress);
            }
          },
          (err) => {
            console.error("Direct browser upload failed too:", err);
            reject(new Error("Gagal mengunggah berkas ke Firebase Storage langsung: " + err.message));
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                success: true,
                fileUrl: downloadUrl,
                fileName: file.name,
                storage: "firebase_browser"
              });
            } catch (urlErr: any) {
              reject(new Error("Gagal mendapatkan link unduhan berkas: " + urlErr.message));
            }
          }
        );
      });
    } catch (fallbackError: any) {
      console.error("Sistem upload backend maupun fallback browser keduanya gagal:", fallbackError);
      throw new Error("Gagal mengunggah berkas: " + (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)));
    }
  }
}

