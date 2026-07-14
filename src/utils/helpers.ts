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

