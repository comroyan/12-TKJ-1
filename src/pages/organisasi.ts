import { getStudentUsers } from "../firebase/db";
import { renderIcons } from "../utils/helpers";

export async function renderOrganisasi(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat struktur organisasi kelas...</span>
    </div>
  `;

  async function loadAndRender() {
    const students = await getStudentUsers();

    // Map roles based on Jabatan
    const ketua = students.find((s: any) => s.jabatan === "Ketua Kelas") || students.find((s: any) => s.role === "Super Admin");
    const wakil = students.find((s: any) => s.jabatan.toLowerCase().includes("wakil")) || null;
    const sekretaris = students.filter((s: any) => s.jabatan.toLowerCase().includes("sekretaris"));
    const bendahara = students.filter((s: any) => s.jabatan.toLowerCase().includes("bendahara"));
    const seksi = students.filter((s: any) => 
      !s.jabatan.toLowerCase().includes("ketua") && 
      !s.jabatan.toLowerCase().includes("wakil") && 
      !s.jabatan.toLowerCase().includes("sekretaris") && 
      !s.jabatan.toLowerCase().includes("bendahara") && 
      s.jabatan !== "Siswa"
    );

    function makeOfficerCard(officer: any, titleOverride?: string) {
      if (!officer) return `
        <div class="p-4 glass rounded-3xl opacity-50 border border-dashed border-slate-700 text-center text-slate-500">
          <p class="text-xs">Belum ditentukan</p>
        </div>
      `;

      return `
        <div class="glass p-4 rounded-3xl max-w-sm mx-auto text-center relative overflow-hidden group glass-card-hover border-t-4 border-t-cyan-500 bg-slate-900/40">
          <span class="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 bg-slate-950/80 border border-slate-800 text-slate-400 rounded-lg">Absen ${officer.absen}</span>
          <img src="${officer.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop'}" alt="${officer.name}" class="w-16 h-16 rounded-2xl mx-auto object-cover border border-slate-800 shadow-md">
          <h3 class="text-sm font-bold text-white mt-3 leading-snug group-hover:text-cyan-400 transition-colors">${officer.name}</h3>
          <span class="text-[10px] font-mono font-semibold text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-lg inline-block mt-1 uppercase">${titleOverride || officer.jabatan}</span>
          <p class="text-[10px] text-slate-400 italic mt-2 line-clamp-1">"${officer.bio || 'Configuring TKJ Goals'}"</p>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-12 animate-fadeIn max-w-5xl mx-auto pb-12">
        <!-- Header -->
        <div class="text-center">
          <h1 class="text-2xl font-bold text-white font-display flex items-center justify-center gap-2">
            <i data-lucide="award" class="text-cyan-400 w-7 h-7"></i> Struktur Organisasi Kelas
          </h1>
          <p class="text-slate-400 text-sm mt-1 max-w-xl mx-auto">Pengurus inti kelas XII TKJ 1 yang mengemban tugas koordinasi operasional pembelajaran.</p>
        </div>

        <!-- Hierarchical Tree Diagram Layout -->
        <div class="space-y-8">
          <!-- 1. Ketua Kelas -->
          <div class="text-center relative">
            ${makeOfficerCard(ketua, "Ketua Kelas")}
            <!-- Down line -->
            <div class="w-0.5 h-8 bg-cyan-500/30 mx-auto mt-4"></div>
          </div>

          <!-- 2. Wakil Ketua Kelas -->
          <div class="text-center relative">
            ${makeOfficerCard(wakil, "Wakil Ketua Kelas")}
            <!-- Down lines branching -->
            <div class="w-0.5 h-8 bg-cyan-500/30 mx-auto mt-4"></div>
            <div class="max-w-xl mx-auto relative h-px bg-cyan-500/30"></div>
            <div class="max-w-xl mx-auto flex justify-between px-24">
              <div class="w-0.5 h-6 bg-cyan-500/30"></div>
              <div class="w-0.5 h-6 bg-cyan-500/30"></div>
            </div>
          </div>

          <!-- 3. Secretaries & Treasurers Branches -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <!-- Secretaries Column -->
            <div class="space-y-4">
              <h4 class="text-center text-xs font-bold tracking-widest text-purple-400 uppercase mb-2">Divisi Sekretariat</h4>
              ${sekretaris.length > 0 ? sekretaris.map(s => makeOfficerCard(s)).join("") : makeOfficerCard(null)}
            </div>

            <!-- Treasurers Column -->
            <div class="space-y-4">
              <h4 class="text-center text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">Divisi Kebendaharaan</h4>
              ${bendahara.length > 0 ? bendahara.map(b => makeOfficerCard(b)).join("") : makeOfficerCard(null)}
            </div>
          </div>

          <!-- Down line to Sections -->
          <div class="w-0.5 h-10 bg-cyan-500/30 mx-auto mt-6"></div>
          <div class="max-w-4xl mx-auto relative h-px bg-cyan-500/30"></div>
          <div class="max-w-4xl mx-auto flex justify-between px-16">
            <div class="w-0.5 h-6 bg-cyan-500/30"></div>
            <div class="w-0.5 h-6 bg-cyan-500/30"></div>
            <div class="w-0.5 h-6 bg-cyan-500/30"></div>
          </div>

          <!-- 4. Section Leads (Seksi-seksi) -->
          <div>
            <h4 class="text-center text-xs font-bold tracking-widest text-amber-400 uppercase mb-6">Seksi Bidang Khusus</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${seksi.length > 0 ? seksi.map(s => makeOfficerCard(s)).join("") : `
                <div class="col-span-full text-center text-slate-500 py-6 italic text-xs">Belum ada seksi bidang khusus yang ditunjuk</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    renderIcons();
  }

  loadAndRender();
}
