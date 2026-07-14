import { 
  getMeetings, 
  addMeeting, 
  deleteMeeting, 
  getInventory, 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem 
} from "../firebase/db";
import { renderIcons, formatDate, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderMeetings(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat catatan rapat & inventaris...</span>
    </div>
  `;

  async function loadAndRender() {
    const [meetings, inventory] = await Promise.all([
      getMeetings(),
      getInventory()
    ]);

    const isEditor = userSession.role === "Super Admin" || userSession.role === "Sekretaris" || userSession.role === "Wakil";

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="file-text" class="text-cyan-400 w-7 h-7"></i> Logistik & Rapat Kelas
            </h1>
            <p class="text-slate-400 text-sm mt-1">Notulensi hasil musyawarah mufakat kelas dan manajemen inventaris hardware/alat TKJ kelas.</p>
          </div>
          <div class="flex items-center gap-2">
            ${isEditor ? `
              <button id="addInventoryBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i> Tambah Inventaris
              </button>
              <button id="addMeetingBtn" class="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg transition-all">
                <i data-lucide="file-check" class="w-4 h-4"></i> Catat Hasil Rapat
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="flex border-b border-slate-800 gap-6">
          <button id="tabMeetings" class="pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors">Notulensi Musyawarah (${meetings.length})</button>
          <button id="tabInventory" class="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors">Inventaris & Alat Kelas (${inventory.length})</button>
        </div>

        <!-- Meetings Section -->
        <div id="meetingsSection" class="space-y-6">
          <div class="space-y-4">
            ${meetings.length > 0 ? meetings.map((m: any) => `
              <div class="glass p-6 rounded-3xl relative overflow-hidden bg-slate-900/20 flex flex-col md:flex-row justify-between gap-6 glass-card-hover">
                <div class="space-y-3 max-w-3xl">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-lg">${formatDate(m.date)}</span>
                    <span class="text-xs text-slate-400">Pimpinan: <strong class="text-slate-200">${m.leader || "Ketua Kelas"}</strong></span>
                  </div>

                  <h3 class="text-lg font-bold text-white font-display leading-snug">${m.title}</h3>
                  <p class="text-xs text-slate-400 leading-relaxed whitespace-pre-line">${m.notes}</p>
                  
                  <div class="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>Hadir: <strong class="text-slate-200 font-mono">${m.attendees || "Semua Siswa"}</strong></span>
                  </div>
                </div>

                <div class="flex items-end justify-between md:flex-col md:items-end gap-3 pt-4 md:pt-0 border-t border-slate-800 md:border-0">
                  <span class="text-[10px] text-slate-500 font-mono block">Notulis: ${m.scribe || "Sekretaris"}</span>
                  ${isEditor ? `
                    <button class="deleteMeetingBtn p-2 bg-slate-950/80 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 rounded-xl text-slate-400 transition-colors" data-id="${m.id}">
                      <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                    </button>
                  ` : ""}
                </div>
              </div>
            `).join("") : `
              <div class="py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="file-text" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada catatan rapat kelas.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Inventory Section (Hidden by default) -->
        <div id="inventorySection" class="space-y-6 hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${inventory.length > 0 ? inventory.map((item: any) => {
              const statusColors: any = {
                "tersedia": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                "dipinjam": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                "rusak": "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              };

              return `
                <div class="glass p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between glass-card-hover bg-slate-900/20">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-lg ${statusColors[item.status] || 'bg-slate-800'}">
                        ${item.status}
                      </span>
                      <span class="text-xs text-slate-500 font-mono">Kode: ${item.code || "TKJ-00"}</span>
                    </div>

                    <h3 class="text-base font-bold text-white font-display leading-tight">${item.name}</h3>
                    <p class="text-xs text-slate-400 mt-2 leading-relaxed">Jumlah Total: <strong class="text-slate-200">${item.qty || 1} Pcs</strong></p>
                    <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">Keterangan: ${item.description || "Alat lab / kelas."}</p>
                  </div>

                  <div class="mt-6 pt-3 border-t border-slate-850 flex items-center justify-between">
                    <div>
                      ${item.borrowedBy ? `
                        <span class="text-[9px] uppercase text-slate-500 block">Peminjam</span>
                        <span class="text-xs font-semibold text-amber-400">${item.borrowedBy}</span>
                      ` : `
                        <span class="text-xs text-emerald-400 font-semibold">Tersedia dipinjam</span>
                      `}
                    </div>

                    <div class="flex items-center gap-1">
                      ${item.status === 'tersedia' ? `
                        <button class="borrowItemBtn px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all" data-id="${item.id}" data-name="${item.name}">
                          Pinjam Alat
                        </button>
                      ` : item.status === 'dipinjam' && (isEditor || item.borrowedBy === userSession.name) ? `
                        <button class="returnItemBtn px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all" data-id="${item.id}">
                          Kembalikan
                        </button>
                      ` : ""}

                      ${isEditor ? `
                        <button class="editItemStatusBtn p-1.5 bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 rounded-lg transition-colors" data-id="${item.id}" data-name="${item.name}">
                          <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                        </button>
                        <button class="deleteItemBtn p-1.5 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-lg transition-colors" data-id="${item.id}">
                          <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ""}
                    </div>
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="col-span-full py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="file-text" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada alat kelas terinventarisasi.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Section triggers
    const tabMeetings = document.getElementById("tabMeetings") as HTMLButtonElement;
    const tabInventory = document.getElementById("tabInventory") as HTMLButtonElement;
    const meetingsSection = document.getElementById("meetingsSection") as HTMLDivElement;
    const inventorySection = document.getElementById("inventorySection") as HTMLDivElement;

    tabMeetings.addEventListener("click", () => {
      tabMeetings.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabInventory.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      meetingsSection.classList.remove("hidden");
      inventorySection.classList.add("hidden");
    });

    tabInventory.addEventListener("click", () => {
      tabInventory.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabMeetings.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      inventorySection.classList.remove("hidden");
      meetingsSection.classList.add("hidden");
    });

    // Delete meeting
    document.querySelectorAll(".deleteMeetingBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus Notulensi Rapat", "Apakah Anda yakin ingin menghapus notulen rapat ini secara permanen?");
        if (confirm) {
          try {
            await deleteMeeting(btn.dataset.id);
            toast.success("Catatan rapat dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Borrow tool
    document.querySelectorAll(".borrowItemBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const confirm = await confirmDialog("Pinjam Alat Kelas", `Apakah Anda ingin mendaftarkan peminjaman barang "${name}" atas nama Anda?`);
        if (confirm) {
          try {
            await updateInventoryItem(id, {
              status: "dipinjam",
              borrowedBy: userSession.name
            });
            toast.success("Peminjaman berhasil dicatat!");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Return tool
    document.querySelectorAll(".returnItemBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Kembalikan Alat Kelas", "Konfirmasi pengembalian barang ini ke inventaris?");
        if (confirm) {
          try {
            await updateInventoryItem(id, {
              status: "tersedia",
              borrowedBy: null
            });
            toast.success("Barang dikembalikan ke rak kelas!");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Edit item status
    document.querySelectorAll(".editItemStatusBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        
        Swal.fire({
          title: `Ubah Status: ${name}`,
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Status Keberadaan</label>
                <select id="iStatus" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none">
                  <option value="tersedia">Tersedia / Rak</option>
                  <option value="dipinjam">Sedang Dipinjam</option>
                  <option value="rusak">Rusak / Bermasalah</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Peminjam Aktif (Kosongi jika di rak)</label>
                <input type="text" id="iBorrower" placeholder="Nama siswa" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Status",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const status = (document.getElementById("iStatus") as HTMLSelectElement).value;
            const borrower = (document.getElementById("iBorrower") as HTMLInputElement).value.trim();
            return { status, borrowedBy: borrower || null };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await updateInventoryItem(id, result.value);
              toast.success("Status barang diperbarui!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    });

    // Delete item
    document.querySelectorAll(".deleteItemBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const confirm = await confirmDialog("Hapus Inventaris", "Hapus barang ini dari daftar inventaris kelas?");
        if (confirm) {
          try {
            await deleteInventoryItem(btn.dataset.id);
            toast.success("Barang terhapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Create Notulensi
    if (isEditor) {
      const addMeetingBtn = document.getElementById("addMeetingBtn") as HTMLButtonElement;
      addMeetingBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Catat Notulensi Rapat Kelas",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans max-h-[400px] overflow-y-auto pr-1">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Topik Rapat / Pembahasan</label>
                <input type="text" id="rTitle" placeholder="Contoh: Rapat Koordinasi Kas & Uang Kas" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Tanggal Rapat</label>
                  <input type="date" id="rDate" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Pimpinan Sidang</label>
                  <input type="text" id="rLeader" value="${userSession.name}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Penulis Notulen (Scribe)</label>
                  <input type="text" id="rScribe" value="${userSession.name}" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Jumlah / Kehadiran Siswa</label>
                  <input type="text" id="rAttendees" value="32 Siswa" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Hasil & Catatan Keputusan Musyawarah</label>
                <textarea id="rNotes" placeholder="Sebutkan kesepakatan rapat, poin penting, and tugas yang dibagikan secara rinci..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-32 resize-none"></textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Terbitkan Notulen",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const title = (document.getElementById("rTitle") as HTMLInputElement).value.trim();
            const date = (document.getElementById("rDate") as HTMLInputElement).value;
            const leader = (document.getElementById("rLeader") as HTMLInputElement).value.trim();
            const scribe = (document.getElementById("rScribe") as HTMLInputElement).value.trim();
            const attendees = (document.getElementById("rAttendees") as HTMLInputElement).value.trim();
            const notes = (document.getElementById("rNotes") as HTMLTextAreaElement).value.trim();

            if (!title || !date || !notes) {
              Swal.showValidationMessage("Judul, Tanggal, dan Catatan rapat harus diisi!");
              return false;
            }
            return { title, date, leader, scribe, attendees, notes };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addMeeting(result.value);
              toast.success("Notulen rapat berhasil diterbitkan ke ClassHub!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });

      const addInventoryBtn = document.getElementById("addInventoryBtn") as HTMLButtonElement;
      addInventoryBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Alat Inventaris",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Alat / Hardware</label>
                <input type="text" id="iName" placeholder="Contoh: Tang Crimping RJ45, Switch Cisco" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Kode / Label Alat</label>
                  <input type="text" id="iCode" placeholder="Contoh: TKJ-CRM-01" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Jumlah Unit (Qty)</label>
                  <input type="number" id="iQty" value="1" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Keterangan Spesifikasi / Rak</label>
                <textarea id="iDesc" placeholder="Jelaskan kondisi fisik, penempatan laci/rak, dsb..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-16 resize-none"></textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Alat",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const name = (document.getElementById("iName") as HTMLInputElement).value.trim();
            const code = (document.getElementById("iCode") as HTMLInputElement).value.trim();
            const qty = parseInt((document.getElementById("iQty") as HTMLInputElement).value);
            const description = (document.getElementById("iDesc") as HTMLTextAreaElement).value.trim();

            if (!name || !code) {
              Swal.showValidationMessage("Nama dan Kode Alat wajib diisi!");
              return false;
            }
            return { name, code, qty, description, status: "tersedia", borrowedBy: null };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addInventoryItem(result.value);
              toast.success("Barang baru ditambahkan ke sistem inventaris!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    }
  }

  loadAndRender();
}
