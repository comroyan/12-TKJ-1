import { getContacts, addContact, updateContact, deleteContact, getNotifications, createNotification, markNotificationRead } from "../firebase/db";
import { renderIcons, formatDate, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderContacts(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat pusat kontak & notifikasi...</span>
    </div>
  `;

  async function loadAndRender() {
    let contacts = await getContacts();
    const notifications = await getNotifications();

    const isEditor = userSession.role === "Super Admin" || userSession.role === "Sekretaris" || userSession.role === "Wakil" || userSession.role === "Bendahara";

    // Seed default contacts to Firestore so they are 100% customizable and editable!
    if (contacts.length === 0) {
      const defaultContacts = [
        { name: "Bapak Adi Sucipto, S.Pd", title: "Wali Kelas XII TKJ 1", hp: "6281234567890", notes: "NIP. 19850215 201012 1 002" },
        { name: "Ibu Erna Wati, M.T", title: "Kepala Program Studi TKJ", hp: "6281298765432", notes: "Guru Produktif Cisco CCNA" },
        { name: "Ibu Sulastri, S.Psi", title: "Guru Bimbingan Konseling", hp: "6281255554444", notes: "Konsultasi PKL & Karir" }
      ];
      for (const dc of defaultContacts) {
        await addContact(dc);
      }
      contacts = await getContacts();
    }

    // Mark unread notifications
    notifications.forEach((notif: any) => {
      const readBy = notif.readBy || [];
      if (!readBy.includes(userSession.uid)) {
        markNotificationRead(notif.id, userSession.uid);
      }
    });

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="phone-call" class="text-cyan-400 w-7 h-7"></i> Kontak & Notifikasi Penting
            </h1>
            <p class="text-slate-400 text-sm mt-1">Daftar kontak penting guru produktif, wali kelas, pengurus kelas, serta siaran info penting.</p>
          </div>
          <div class="flex items-center gap-2">
            ${isEditor ? `
              <button id="postNotifBtn" class="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all">
                <i data-lucide="bell" class="w-4 h-4"></i> Buat Pengumuman
              </button>
              <button id="addContactBtn" class="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg transition-all">
                <i data-lucide="plus" class="w-4 h-4"></i> Tambah Kontak
              </button>
            ` : ""}
          </div>
        </div>

        <!-- Tab Selector -->
        <div class="flex border-b border-slate-800 gap-6">
          <button id="tabContacts" class="pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors">Daftar Kontak Penting (${contacts.length})</button>
          <button id="tabNotifications" class="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors">Siaran Pengumuman (${notifications.length})</button>
        </div>

        <!-- Contacts Section -->
        <div id="contactsSection" class="space-y-6">
          <div>
            <h3 class="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">Daftar Kontak Resmi & Penting</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${contacts.map((c: any, idx: number) => {
                const borderColors = [
                  "border-l-rose-500 bg-slate-900/25", 
                  "border-l-purple-500 bg-slate-900/25", 
                  "border-l-amber-500 bg-slate-900/25",
                  "border-l-cyan-500 bg-slate-900/20",
                  "border-l-emerald-500 bg-slate-900/20",
                  "border-l-blue-500 bg-slate-900/20"
                ];
                const colorClass = borderColors[idx % borderColors.length];
                const iconMap = ["user", "award", "heart", "users", "phone"];
                const iconName = iconMap[idx % iconMap.length];

                return `
                  <div class="glass p-5 rounded-3xl flex items-center justify-between glass-card-hover border-l-4 ${colorClass}">
                    <div class="flex items-center gap-4">
                      <div class="p-3 bg-slate-800/80 text-cyan-400 rounded-2xl"><i data-lucide="${iconName}" class="w-6 h-6"></i></div>
                      <div>
                        <h4 class="text-sm font-bold text-white">${c.name}</h4>
                        <span class="text-[10px] text-cyan-400 font-semibold block uppercase tracking-wider">${c.title}</span>
                        <span class="text-[10px] text-slate-500 block">${c.notes || ""}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <a href="https://wa.me/${c.hp.replace(/\D/g, '')}" target="_blank" class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors" title="Hubungi WhatsApp">
                        <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
                      </a>
                      ${isEditor ? `
                        <button class="editContactBtn p-2 bg-slate-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 rounded-xl text-cyan-400 transition-colors" data-id="${c.id}" title="Edit Kontak">
                          <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                        </button>
                        <button class="deleteContactBtn p-2 bg-slate-950/80 hover:bg-rose-500 hover:text-slate-950 border border-slate-800 rounded-xl text-rose-400 transition-colors" data-id="${c.id}" title="Hapus Kontak">
                          <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ""}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Notifications Section (Hidden by default) -->
        <div id="notificationsSection" class="space-y-6 hidden">
          <div class="space-y-4 max-w-4xl">
            ${notifications.length > 0 ? notifications.map((n: any) => {
              const types: any = {
                "danger": "border-l-rose-500 bg-rose-500/5",
                "warning": "border-l-amber-500 bg-amber-500/5",
                "info": "border-l-cyan-500 bg-cyan-500/5"
              };

              return `
                <div class="glass p-5 rounded-3xl border-l-4 ${types[n.type] || 'border-l-cyan-500'} relative overflow-hidden flex items-start gap-4">
                  <div class="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 flex-shrink-0">
                    <i data-lucide="bell" class="w-5 h-5"></i>
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-bold text-white">${n.title}</h4>
                      <span class="text-[10px] font-mono text-slate-500">${formatDate(n.date)}</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed">${n.content}</p>
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="py-12 text-center">
                <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="bell" class="w-8 h-8"></i></div>
                <p class="text-slate-400">Belum ada pengumuman siaran resmi kelas.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    renderIcons();

    // Section triggers
    const tabContacts = document.getElementById("tabContacts") as HTMLButtonElement;
    const tabNotifications = document.getElementById("tabNotifications") as HTMLButtonElement;
    const contactsSection = document.getElementById("contactsSection") as HTMLDivElement;
    const notificationsSection = document.getElementById("notificationsSection") as HTMLDivElement;

    tabContacts.addEventListener("click", () => {
      tabContacts.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabNotifications.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      contactsSection.classList.remove("hidden");
      notificationsSection.classList.add("hidden");
    });

    tabNotifications.addEventListener("click", () => {
      tabNotifications.className = "pb-3 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-400 transition-colors";
      tabContacts.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white transition-colors";
      notificationsSection.classList.remove("hidden");
      contactsSection.classList.add("hidden");
    });

    // Delete contact listener
    document.querySelectorAll(".deleteContactBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Kontak", "Apakah Anda yakin ingin menghapus kontak ini dari daftar penting?");
        if (confirm) {
          try {
            await deleteContact(id);
            toast.success("Kontak terhapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Edit contact listener
    document.querySelectorAll(".editContactBtn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const c = contacts.find((contact: any) => contact.id === id);
        if (!c) return;

        Swal.fire({
          title: "Ubah/Edit Kontak",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap & Gelar</label>
                <input type="text" id="editCName" value="${c.name}" placeholder="Contoh: Bapak Drs. Bambang" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Peran / Jabatan</label>
                  <input type="text" id="editCTitle" value="${c.title}" placeholder="Contoh: Guru Pemrograman" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor WA (Awali 62)</label>
                  <input type="text" id="editCHp" value="${c.hp}" placeholder="Contoh: 6281..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Catatan Tambahan</label>
                <input type="text" id="editCNotes" value="${c.notes || ''}" placeholder="Misalnya: Pengawas industri PKL" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Perubahan",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const name = (document.getElementById("editCName") as HTMLInputElement).value.trim();
            const title = (document.getElementById("editCTitle") as HTMLInputElement).value.trim();
            const hp = (document.getElementById("editCHp") as HTMLInputElement).value.trim();
            const notes = (document.getElementById("editCNotes") as HTMLInputElement).value.trim();

            if (!name || !title || !hp) {
              Swal.showValidationMessage("Harap isi Nama, Jabatan, and No. WhatsApp!");
              return false;
            }
            return { name, title, hp, notes };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await updateContact(id, result.value);
              toast.success("Kontak berhasil diperbarui!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    });

    // Forms triggers
    if (isEditor) {
      const addContactBtn = document.getElementById("addContactBtn") as HTMLButtonElement;
      addContactBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Kontak Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Nama Lengkap & Gelar</label>
                <input type="text" id="cName" placeholder="Contoh: Bapak Drs. Bambang" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Peran / Jabatan</label>
                  <input type="text" id="cTitle" placeholder="Contoh: Guru Pemrograman" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
                <div>
                  <label class="block text-xs text-slate-400 font-semibold mb-1">Nomor WA (Awali 62)</label>
                  <input type="text" id="cHp" placeholder="Contoh: 6281..." class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Catatan Tambahan</label>
                <input type="text" id="cNotes" placeholder="Misalnya: Pengawas industri PKL" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Simpan Kontak",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const name = (document.getElementById("cName") as HTMLInputElement).value.trim();
            const title = (document.getElementById("cTitle") as HTMLInputElement).value.trim();
            const hp = (document.getElementById("cHp") as HTMLInputElement).value.trim();
            const notes = (document.getElementById("cNotes") as HTMLInputElement).value.trim();

            if (!name || !title || !hp) {
              Swal.showValidationMessage("Harap isi Nama, Jabatan, and No. WhatsApp!");
              return false;
            }
            return { name, title, hp, notes };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addContact(result.value);
              toast.success("Kontak penting berhasil didaftarkan!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });

      const postNotifBtn = document.getElementById("postNotifBtn") as HTMLButtonElement;
      postNotifBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Terbitkan Siaran Pengumuman",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Pengumuman</label>
                <input type="text" id="nTitle" placeholder="Contoh: Info Pembayaran UKK Tahap 2" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Kategori Kepentingan</label>
                <select id="nType" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
                  <option value="info">Info Umum / Edukasi</option>
                  <option value="warning">Sangat Penting / Urgent</option>
                  <option value="danger">Gawat / Jatuh Tempo Kas</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Pesan / Isi Siaran</label>
                <textarea id="nContent" placeholder="Jelaskan instruksi pengumuman secara lengkap..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm h-28 resize-none"></textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Kirim Siaran",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const title = (document.getElementById("nTitle") as HTMLInputElement).value.trim();
            const type = (document.getElementById("nType") as HTMLSelectElement).value;
            const content = (document.getElementById("nContent") as HTMLTextAreaElement).value.trim();

            if (!title || !content) {
              Swal.showValidationMessage("Judul dan Isi Pengumuman harus diisi!");
              return false;
            }
            return { title, type, content };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const val = result.value;
              await createNotification(val.title, val.content, val.type);
              toast.success("Pengumuman berhasil disiarkan ke seluruh kelas!");
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
