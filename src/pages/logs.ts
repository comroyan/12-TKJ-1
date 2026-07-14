import { getAuditLogs } from "../firebase/db";
import { renderIcons, formatDate } from "../utils/helpers";

export async function renderLogs(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat log sistem...</span>
    </div>
  `;

  async function loadAndRender() {
    const logs = await getAuditLogs();

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn max-w-5xl mx-auto">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
            <i data-lucide="shield-alert" class="text-rose-500 w-7 h-7"></i> Audit Log Sistem (Super Admin Only)
          </h1>
          <p class="text-slate-400 text-sm mt-1">Rekaman riwayat seluruh aktivitas administratif, log transaksi, pendaftaran siswa, dan perubahan sistem.</p>
        </div>

        <!-- Terminal panel -->
        <div class="glass rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/70">
          <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span>
              <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-xs font-mono text-slate-400 ml-2">syslog@classhub-terminal</span>
            </div>
            <span class="text-[10px] font-mono text-slate-500">${logs.length} entri tercatat</span>
          </div>

          <div class="p-6 font-mono text-xs space-y-4 max-h-[550px] overflow-y-auto" id="logContent">
            ${logs.length > 0 ? logs.map((log: any) => `
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-900/80 space-y-1.5 hover:border-slate-800 transition-colors">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
                  <span class="text-cyan-400 font-bold">[${log.action || "ACTIVITY"}]</span>
                  <span class="text-slate-500">${formatDate(log.timestamp)}</span>
                </div>
                <p class="text-slate-300">${log.details || ""}</p>
                <div class="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-900/50">
                  <i data-lucide="user" class="w-3 h-3"></i>
                  <span>Operator: <strong class="text-slate-400">${log.userName || "System"}</strong> (UID: ${log.userId ? log.userId.substring(0, 8) : "system"})</span>
                </div>
              </div>
            `).join("") : `
              <p class="text-slate-500 text-center py-6">Terminal kosong. Belum ada aktivitas yang terekam.</p>
            `}
          </div>
        </div>
      </div>
    `;

    renderIcons();
  }

  loadAndRender();
}
