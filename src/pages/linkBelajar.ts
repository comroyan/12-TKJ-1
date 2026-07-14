import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { renderIcons, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderLinkBelajar(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Menghubungkan ke Link Belajar...</span>
    </div>
  `;

  let activeCategory = "Semua"; // Semua, Video, Tutorial, Forum, Tool
  let searchQuery = "";

  async function loadData() {
    try {
      // Fetch links without query-level sorting to prevent any potential Firestore index constraints
      const snap = await getDocs(collection(db, "studyLinks"));
      const customLinks = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(0)
        };
      });

      // Sort custom links in-memory by date descending
      customLinks.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      // Rich curated standard Indonesian TKJ links
      const defaultLinks = [
        {
          id: "def_mikrotik_id",
          title: "MikroTik Indonesia",
          desc: "Situs portal resmi komunitas dan distributor MikroTik di Indonesia. Berisi dokumentasi, artikel, jadwal sertifikasi MTCNA/MTCRE, dan forum.",
          url: "https://mikrotik.co.id",
          category: "Tutorial",
          isDefault: true
        },
        {
          id: "def_id_networkers",
          title: "ID-Networkers (IDN)",
          desc: "Pusat training IT networking terbesar di Indonesia (Cisco, MikroTik, Juniper, AWS). Menyediakan tutorial dan handbook gratis berkualitas tinggi.",
          url: "https://idn.id",
          category: "Tutorial",
          isDefault: true
        },
        {
          id: "def_cisco",
          title: "Cisco Networking Academy",
          desc: "Situs belajar resmi CCNA Cisco, materi dasar routing-switching, topologi Cisco Packet Tracer, dan sertifikasi jaringan.",
          url: "https://www.netacad.com",
          category: "Tutorial",
          isDefault: true
        },
        {
          id: "def_yt_tkj",
          title: "Linux Debian Server & Networking Tutorial",
          desc: "Kanal panduan video step-by-step konfigurasi Debian Server (DNS, DHCP, Mail, Web, FTP, Samba, Firewall) dan manajemen Mikrotik.",
          url: "https://www.youtube.com",
          category: "Video",
          isDefault: true
        },
        {
          id: "def_debian",
          title: "Debian Administrator's Handbook",
          desc: "Buku panduan lengkap administrator sistem operasi Debian Linux, mencakup administrasi server, instalasi paket, dan security.",
          url: "https://debian-handbook.info",
          category: "Tutorial",
          isDefault: true
        },
        {
          id: "def_subnet_calc",
          title: "Online IP Subnet Calculator",
          desc: "Alat bantu perhitungan CIDR subnetting, range host IP, broadcast, wildcard mask, dan pembagian segmen jaringan secara instan.",
          url: "https://www.subnet-calculator.com",
          category: "Tool",
          isDefault: true
        }
      ];

      const allLinks = [...customLinks, ...defaultLinks];
      renderUI(allLinks);
    } catch (e: any) {
      console.error(e);
      container.innerHTML = `<div class="p-6 text-red-400">Gagal memuat link belajar: ${e.message}</div>`;
    }
  }

  function renderUI(links: any[]) {
    const isTeacherOrAdmin = userSession.role === "Super Admin" || userSession.role === "Wakil" || userSession.role === "Sekretaris";

    const filtered = links.filter(l => {
      const matchSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === "Semua" || l.category === activeCategory;
      return matchSearch && matchCat;
    });

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn text-slate-100 font-sans">
        <!-- Top Bar -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold font-display text-white flex items-center gap-2">
              <i data-lucide="link" class="w-7 h-7 text-cyan-400"></i> Link Belajar XII TKJ 1
            </h1>
            <p class="text-slate-400 text-xs mt-1">Kumpulan video YouTube, tutorial jaringan, dan forum diskusi untuk referensi belajar mandiri.</p>
          </div>
          ${isTeacherOrAdmin ? `
            <button id="addStudyLinkBtn" class="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i> Tambah Link
            </button>
          ` : ""}
        </div>

        <!-- Filters & Search -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Categories Tabs -->
          <div class="md:col-span-2 flex flex-wrap gap-1.5">
            ${["Semua", "Video", "Tutorial", "Forum", "Tool"].map(cat => `
              <button class="cat-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeCategory === cat ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-cat="${cat}">
                ${cat}
              </button>
            `).join("")}
          </div>

          <!-- Search Input -->
          <div class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
            <input type="text" id="linkSearchInput" placeholder="Cari link belajar..." class="w-full bg-transparent text-xs border-none outline-none text-white placeholder-slate-600" value="${searchQuery}">
          </div>
        </div>

        <!-- Links Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filtered.length > 0 ? filtered.map(l => `
            <div class="p-5 glass rounded-3xl flex flex-col justify-between border border-slate-850 hover:border-cyan-500/20 transition-all relative group">
              <div>
                <div class="flex justify-between items-center mb-3">
                  <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded font-mono ${l.category === 'Video' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : l.category === 'Tutorial' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}">
                    ${l.category}
                  </span>
                  ${isTeacherOrAdmin && !l.isDefault ? `
                    <button class="delete-link-btn p-1.5 hover:bg-rose-500/10 rounded-xl text-slate-500 hover:text-rose-400 transition-colors" data-id="${l.id}">
                      <i data-lucide="trash2" class="w-4 h-4"></i>
                    </button>
                  ` : ""}
                </div>
                <h3 class="text-sm font-bold text-white line-clamp-1 leading-snug">${l.title}</h3>
                <p class="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">${l.desc}</p>
              </div>

              <div class="mt-4 pt-4 border-t border-slate-850">
                <a href="${l.url}" target="_blank" class="w-full py-2 bg-slate-900 hover:bg-slate-850 text-cyan-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5">
                  Kunjungi Situs <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                </a>
              </div>
            </div>
          `).join("") : `
            <div class="col-span-3 py-12 text-center text-slate-500 text-sm">
              Tidak ada link belajar yang cocok dengan pencarianmu.
            </div>
          `}
        </div>
      </div>
    `;

    renderIcons();

    // Attach Category Tab Switchers
    document.querySelectorAll(".cat-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderUI(links);
      });
    });

    // Search Input Event
    const linkSearchInput = document.getElementById("linkSearchInput") as HTMLInputElement;
    if (linkSearchInput) {
      linkSearchInput.addEventListener("input", () => {
        searchQuery = linkSearchInput.value;
        renderUI(links);
      });
    }

    // Add Link Event
    const addStudyLinkBtn = document.getElementById("addStudyLinkBtn");
    if (addStudyLinkBtn) {
      addStudyLinkBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Tambah Link Belajar Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Kategori</label>
                <select id="swLinkCat" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
                  <option value="Video">Video Belajar YouTube</option>
                  <option value="Tutorial">Web Tutorial / Handout</option>
                  <option value="Forum">Forum Jaringan / Komunitas</option>
                  <option value="Tool">Alat Simulasi / Tool Jaringan</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Link</label>
                <input type="text" id="swLinkTitle" placeholder="Contoh: Cisco Packet Tracer Tutorial" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Deskripsi Singkat</label>
                <textarea id="swLinkDesc" placeholder="Penjelasan isi link referensi ini..." class="w-full h-16 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm resize-none"></textarea>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">URL Tujuan</label>
                <input type="text" id="swLinkUrl" placeholder="https://..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#ef4444",
          confirmButtonText: "Simpan Link",
          cancelButtonText: "Batal",
          preConfirm: () => {
            const category = (document.getElementById("swLinkCat") as HTMLSelectElement).value;
            const title = (document.getElementById("swLinkTitle") as HTMLInputElement).value.trim();
            const desc = (document.getElementById("swLinkDesc") as HTMLTextAreaElement).value.trim();
            const url = (document.getElementById("swLinkUrl") as HTMLInputElement).value.trim();

            if (!title || !url) {
              Swal.showValidationMessage("Judul dan URL harus diisi.");
              return false;
            }

            return { category, title, desc, url };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            const { category, title, desc, url } = result.value;
            try {
              await addDoc(collection(db, "studyLinks"), {
                category,
                title,
                desc,
                url,
                createdAt: serverTimestamp()
              });
              toast.success("Link belajar berhasil disimpan!");
              loadData();
            } catch (err: any) {
              toast.error(err.message);
            }
          }
        });
      });
    }

    // Delete Link Event
    document.querySelectorAll(".delete-link-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Link Belajar", "Apakah kamu yakin ingin menghapus link belajar custom ini?");
        if (confirm) {
          try {
            await deleteDoc(doc(db, "studyLinks", id));
            toast.success("Link belajar berhasil dihapus.");
            loadData();
          } catch (e: any) {
            toast.error(e.message);
          }
        }
      });
    });
  }

  loadData();
}
