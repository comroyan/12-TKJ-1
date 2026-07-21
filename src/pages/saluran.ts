import { 
  getSaluranPosts, 
  addSaluranPost, 
  updateSaluranPost, 
  deleteSaluranPost, 
  getStudentUsers,
  createNotification
} from "../firebase/db";
import { renderIcons, formatDate, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderSaluran(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400 font-sans">Memuat Saluran Informasi Kelas...</span>
    </div>
  `;

  async function loadAndRender() {
    const [posts, students] = await Promise.all([
      getSaluranPosts(),
      getStudentUsers()
    ]);

    // Check if user is Class Officer/Privileged
    const isSAdmin = userSession.role === "Super Admin";
    const isKetuaKelas = userSession.role === "Ketua Kelas" || userSession.jabatan?.toLowerCase().includes("ketua");
    const isSekretaris = userSession.role === "Sekretaris" || userSession.jabatan?.toLowerCase().includes("sekre");
    const isBendahara = userSession.role === "Bendahara" || userSession.jabatan?.toLowerCase().includes("bendahara");
    const isWakil = userSession.role === "Wakil" || userSession.jabatan?.toLowerCase().includes("wakil");

    const isOfficer = isSAdmin || isKetuaKelas || isSekretaris || isBendahara || isWakil;

    // Follower count: size of students list (with fallback)
    const followerCount = students.length > 0 ? students.length : 32;

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn font-sans max-w-4xl mx-auto">
        
        <!-- WA Channel Profile Card -->
        <div class="glass p-6 rounded-3xl border border-slate-800 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
          
          <div class="flex items-center gap-4 relative z-10">
            <div class="relative">
              <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-md">
                <i data-lucide="radio" class="w-8 h-8 animate-pulse"></i>
              </div>
              <span class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>
            
            <div>
              <h1 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Saluran Resmi XII TKJ 1
                <span class="p-0.5 bg-blue-500 text-slate-950 rounded-full" title="Terverifikasi"><i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i></span>
              </h1>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                <i data-lucide="users" class="w-3.5 h-3.5"></i> ${followerCount} Pengikut • Saluran Siaran Kelas
              </p>
              <p class="text-[11px] text-slate-400 mt-1.5 max-w-lg leading-relaxed">
                Ruang koordinasi siaran terpusat. Informasi langsung dari Wali Kelas, Ketua Kelas, Sekretaris, dan Bendahara.
              </p>
            </div>
          </div>

          <!-- Action Button for Officers -->
          <div class="relative z-10 shrink-0 w-full md:w-auto">
            ${isOfficer ? `
              <button id="addBroadcastBtn" class="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer">
                <i data-lucide="send" class="w-4 h-4"></i> Buat Siaran Baru
              </button>
            ` : `
              <div class="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
                <i data-lucide="bell" class="w-3.5 h-3.5 text-emerald-400"></i> Mode Senyap: Hanya Admin yang dapat mengirim siaran
              </div>
            `}
          </div>
        </div>

        <!-- Filter and Search controls -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <i data-lucide="search" class="absolute left-3.5 top-3 w-4 h-4 text-slate-500"></i>
            <input type="text" id="searchBroadcast" placeholder="Cari info atau pengumuman..." class="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors">
          </div>
          <div class="flex gap-2">
            <select id="categoryFilter" class="px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-200 outline-none focus:border-cyan-500 transition-colors">
              <option value="">Semua Kategori</option>
              <option value="Pengumuman">📢 Pengumuman</option>
              <option value="Tugas">📝 Tugas & Akademik</option>
              <option value="Keuangan">💵 Kas & Keuangan</option>
              <option value="Kegiatan">📅 Kegiatan Kelas</option>
              <option value="Penting">⚠️ Sangat Penting</option>
            </select>
          </div>
        </div>

        <!-- Broadcast Feed Section -->
        <div id="broadcastsFeed" class="space-y-5">
          ${posts.length > 0 ? posts.map((post: any) => {
            const isLiked = post.likes && post.likes.includes(userSession.uid);
            const likesCount = post.likes ? post.likes.length : 0;
            
            // Generate visual category styling
            let catColor = "bg-slate-950/40 text-slate-400 border-slate-800";
            if (post.category === "Penting") {
              catColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            } else if (post.category === "Keuangan") {
              catColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            } else if (post.category === "Tugas") {
              catColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            } else if (post.category === "Kegiatan") {
              catColor = "bg-sky-500/10 text-sky-400 border-sky-500/20";
            } else if (post.category === "Pengumuman") {
              catColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
            }

            // Map Badge color for writer jabatan
            let jabBadge = "bg-slate-800 text-slate-300";
            const jabLower = post.authorJabatan?.toLowerCase() || "";
            if (jabLower.includes("ketua")) {
              jabBadge = "bg-amber-500/15 text-amber-400 border border-amber-500/20";
            } else if (jabLower.includes("sekre")) {
              jabBadge = "bg-teal-500/15 text-teal-400 border border-teal-500/20";
            } else if (jabLower.includes("bendahara")) {
              jabBadge = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
            } else if (jabLower.includes("wakil")) {
              jabBadge = "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20";
            } else if (jabLower.includes("wali") || jabLower.includes("guru") || post.role === "Super Admin") {
              jabBadge = "bg-rose-500/15 text-rose-400 border border-rose-500/20";
            }

            return `
              <div class="post-card glass p-5 rounded-3xl border border-slate-800 bg-slate-900/10 hover:bg-slate-900/20 transition-all flex flex-col gap-4 relative" data-title="${post.title?.toLowerCase()}" data-content="${post.content?.toLowerCase()}" data-category="${post.category || ''}">
                
                <!-- Post Header -->
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5">
                    <img src="${post.authorFoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop'}" class="w-9 h-9 rounded-xl object-cover border border-slate-800">
                    <div>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-bold text-slate-100">${post.authorName}</span>
                        <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${jabBadge}">${post.authorJabatan || "Pengurus Kelas"}</span>
                      </div>
                      <span class="text-[10px] text-slate-500 font-mono block mt-0.5">${formatDate(post.date)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${catColor}">
                      ${post.category || "Umum"}
                    </span>

                    <!-- Delete button for Super Admin or post author -->
                    ${(isSAdmin || post.authorId === userSession.uid) ? `
                      <button class="deletePostBtn p-1.5 bg-slate-950/60 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-850 rounded-lg text-slate-400 transition-colors cursor-pointer" data-id="${post.id}" title="Hapus Siaran">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : ""}
                  </div>
                </div>

                <!-- Post Body -->
                <div class="space-y-2.5">
                  <h3 class="text-sm font-bold text-slate-200 tracking-tight leading-snug">${post.title}</h3>
                  <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">${post.content}</p>
                </div>

                <!-- Post Footer (Reactions / Interactive like section) -->
                <div class="pt-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                  <button class="likePostBtn flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl transition-all border border-slate-850 cursor-pointer ${isLiked ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 font-bold' : ''}" data-id="${post.id}" data-likes='${JSON.stringify(post.likes || [])}'>
                    <i data-lucide="thumbs-up" class="w-3.5 h-3.5 ${isLiked ? 'fill-emerald-400' : ''}"></i>
                    <span>${isLiked ? 'Menyukai' : 'Suka'}</span>
                    <span class="px-1.5 py-0.2 bg-slate-800 rounded-md font-mono text-[10px]">${likesCount}</span>
                  </button>

                  <div class="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i> ${post.views || 0} Dilihat
                  </div>
                </div>

              </div>
            `;
          }).join("") : `
            <div class="py-16 text-center glass rounded-3xl border border-slate-800/80 bg-slate-900/10">
              <div class="inline-flex p-4.5 bg-slate-800/50 rounded-full text-slate-500 mb-4 animate-pulse">
                <i data-lucide="radio" class="w-10 h-10"></i>
              </div>
              <h3 class="text-sm font-bold text-slate-300">Saluran Sepi</h3>
              <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Belum ada info siaran terbaru yang dikirim oleh pengurus kelas di Saluran.</p>
            </div>
          `}
        </div>

      </div>
    `;

    renderIcons();

    // -----------------------------------------------------------------
    // SEARCH & FILTER FUNCTIONALITY
    // -----------------------------------------------------------------
    const searchInput = document.getElementById("searchBroadcast") as HTMLInputElement;
    const categorySelect = document.getElementById("categoryFilter") as HTMLSelectElement;
    const postCards = document.querySelectorAll(".post-card") as NodeListOf<HTMLElement>;

    function filterPosts() {
      const queryText = searchInput.value.toLowerCase().trim();
      const selectedCategory = categorySelect.value;

      postCards.forEach((card) => {
        const titleAttr = card.getAttribute("data-title") || "";
        const contentAttr = card.getAttribute("data-content") || "";
        const catAttr = card.getAttribute("data-category") || "";

        const matchesSearch = titleAttr.includes(queryText) || contentAttr.includes(queryText);
        const matchesCategory = selectedCategory === "" || catAttr === selectedCategory;

        if (matchesSearch && matchesCategory) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    }

    if (searchInput) searchInput.addEventListener("input", filterPosts);
    if (categorySelect) categorySelect.addEventListener("change", filterPosts);

    // Increment post views (async background, once per mount/session cached in local variables)
    // To minimize costs we'll increment the view count by 1 in Firestore on render
    posts.forEach(async (post: any) => {
      const viewKey = `viewed_saluran_${post.id}`;
      if (!sessionStorage.getItem(viewKey)) {
        sessionStorage.setItem(viewKey, "true");
        try {
          await updateSaluranPost(post.id, {
            views: (post.views || 0) + 1
          });
        } catch (e) {
          console.warn("Failed to increment views:", e);
        }
      }
    });

    // -----------------------------------------------------------------
    // EVENT: LIKE / UNLIKE SIARAN
    // -----------------------------------------------------------------
    document.querySelectorAll(".likePostBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        let likes = JSON.parse(btn.dataset.likes || "[]");
        const uid = userSession.uid;

        if (likes.includes(uid)) {
          // Unlike
          likes = likes.filter((l: string) => l !== uid);
        } else {
          // Like
          likes.push(uid);
        }

        try {
          await updateSaluranPost(id, { likes });
          loadAndRender();
        } catch (err: any) {
          toast.error("Gagal menanggapi siaran: " + err.message);
        }
      });
    });

    // -----------------------------------------------------------------
    // EVENT: CREATE BROADCAST (OFFICER-ONLY)
    // -----------------------------------------------------------------
    const addBroadcastBtn = document.getElementById("addBroadcastBtn");
    if (addBroadcastBtn) {
      addBroadcastBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Kirim Siaran Baru",
          text: "Gunakan saluran ini untuk menyebarkan informasi penting.",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Kategori Siaran</label>
                <select id="bcCategory" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-750 rounded-xl focus:border-emerald-500 text-white outline-none text-sm font-sans">
                  <option value="Pengumuman">📢 Pengumuman Kelas</option>
                  <option value="Tugas">📝 Tugas & Akademik</option>
                  <option value="Keuangan">💵 Kas & Keuangan</option>
                  <option value="Kegiatan">📅 Kegiatan Kelas</option>
                  <option value="Penting">⚠️ Sangat Penting (Prioritas)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Judul Info / Siaran</label>
                <input type="text" id="bcTitle" placeholder="Tulis judul siaran yang menarik..." class="w-full px-4 py-2.5 bg-slate-900 border border-slate-755 rounded-xl focus:border-emerald-500 text-white outline-none text-sm font-sans">
              </div>
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Isi Siaran / Pesan Informasi</label>
                <textarea id="bcContent" placeholder="Tulis isi pengumuman atau instruksi di sini..." class="w-full h-32 px-4 py-2 bg-slate-900 border border-slate-755 rounded-xl focus:border-emerald-500 text-white outline-none text-sm resize-none font-sans"></textarea>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "🚀 Kirim Siaran",
          cancelButtonText: "Batal",
          confirmButtonColor: "#10b981", // Emerald
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const title = (document.getElementById("bcTitle") as HTMLInputElement).value.trim();
            const content = (document.getElementById("bcContent") as HTMLTextAreaElement).value.trim();
            const category = (document.getElementById("bcCategory") as HTMLSelectElement).value;

            if (!title || !content) {
              Swal.showValidationMessage("Harap isi Judul dan Isi Pesan!");
              return false;
            }

            return {
              title,
              content,
              category,
              authorId: userSession.uid,
              authorName: userSession.name,
              authorJabatan: userSession.jabatan || userSession.role || "Wali Kelas",
              authorFoto: userSession.foto || ""
            };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await addSaluranPost(result.value);

              // Send real-time notification to class members
              const notificationTitle = `Siaran Saluran: ${result.value.category}`;
              const notificationContent = `📢 "${result.value.title}" oleh ${result.value.authorName} (${result.value.authorJabatan}).`;
              await createNotification(notificationTitle, notificationContent, "info");

              toast.success("Siaran berhasil dikirim ke saluran & notifikasi terkirim!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal", err.message, "error");
            }
          }
        });
      });
    }

    // -----------------------------------------------------------------
    // EVENT: DELETE POST
    // -----------------------------------------------------------------
    document.querySelectorAll(".deletePostBtn").forEach((btn: any) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        
        const confirmed = await confirmDialog(
          "Hapus Siaran?",
          "Siaran yang dihapus tidak dapat dipulihkan kembali dari feed."
        );

        if (confirmed) {
          try {
            await deleteSaluranPost(id);
            toast.success("Siaran berhasil dihapus!");
            loadAndRender();
          } catch (err: any) {
            toast.error("Gagal menghapus siaran: " + err.message);
          }
        }
      });
    });
  }

  loadAndRender();
}
