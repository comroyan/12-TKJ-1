import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import { db, storage } from "../firebase/config";
import { 
  addDiscussionMessage, 
  deleteDiscussionMessage, 
  toggleMessageReaction 
} from "../firebase/db";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { renderIcons, toast, formatDate } from "../utils/helpers";
import Swal from "sweetalert2";

// Elevated to file/module level to prevent duplicate snapshot memory leak on route changes
let globalUnsubscribeMessages: (() => void) | null = null;

export function renderDiskusi(container: HTMLElement, userSession: any) {
  // Unsubscribe from any previous instance's listener to prevent stacking multiple active Firestore streams
  if (globalUnsubscribeMessages) {
    try {
      globalUnsubscribeMessages();
    } catch (e) {
      console.warn("Gagal membersihkan listener diskusi lama:", e);
    }
    globalUnsubscribeMessages = null;
  }

  let activeChannel = "umum";

  const channels = [
    { id: "umum", name: "umum", desc: "Diskusi umum seputar kelas XII TKJ 1", icon: "message-square" },
    { id: "tugas-pr", name: "tugas-pr", desc: "Tanya jawab seputar tugas dan PR sekolah", icon: "book-open" },
    { id: "santai", name: "santai", desc: "Tongkrongan santai, canda tawa, & OOT", icon: "coffee" },
    { id: "pengumuman", name: "pengumuman", desc: "Pengumuman penting pengurus kelas", icon: "megaphone", adminOnlyWrite: true }
  ];

  // Render Layout Structure
  container.innerHTML = `
    <div class="h-[calc(100vh-120px)] md:h-[calc(100vh-70px)] flex flex-col md:flex-row gap-6">
      <!-- Sidebar Channels list -->
      <div class="w-full md:w-64 glass p-4 rounded-3xl flex flex-col justify-between shrink-0 border border-slate-800">
        <div>
          <div class="flex items-center gap-2 px-2 pb-4 border-b border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <i data-lucide="hash" class="w-4.5 h-4.5"></i>
            </div>
            <div>
              <h2 class="text-xs font-bold text-white uppercase tracking-wider">Saluran Diskusi</h2>
              <span class="text-[9px] text-slate-500 font-mono">Real-time Class Chat</span>
            </div>
          </div>

          <div class="space-y-1.5 mt-4" id="channelListContainer">
            <!-- Render channels dynamically -->
          </div>
        </div>

        <div class="mt-4 p-3.5 bg-slate-900/50 rounded-2xl border border-slate-850 text-[10px] text-slate-400 space-y-1 leading-relaxed">
          <p class="font-bold text-slate-300 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Panduan Diskusi:
          </p>
          <p>Harap saling menghormati. Gunakan bahasa yang sopan. Klik emoji di bawah pesan untuk bereaksi secara instan!</p>
        </div>
      </div>

      <!-- Chat area -->
      <div class="flex-1 glass rounded-3xl flex flex-col overflow-hidden border border-slate-800 h-full">
        <!-- Chat Header -->
        <div class="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/20">
          <div class="flex items-center gap-3">
            <span class="text-slate-500 font-light text-2xl">#</span>
            <div>
              <h3 class="text-sm font-bold text-white font-mono" id="activeChannelName">umum</h3>
              <p class="text-xs text-slate-400" id="activeChannelDesc">Diskusi umum seputar kelas XII TKJ 1</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 font-mono">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Sync
            </div>
          </div>
        </div>

        <!-- Chat Message Panel -->
        <div class="flex-1 p-6 overflow-y-auto space-y-4 scroll-hide bg-slate-950/20 flex flex-col-reverse" id="chatMessagePanel">
          <!-- Real-time messages will be injected here (in reverse order for ease of css layout/scroll) -->
          <div class="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
            <div class="spinner"></div>
            <span class="text-xs font-mono">Menghubungkan ke saluran...</span>
          </div>
        </div>

        <!-- Input Box Area -->
        <div class="p-4 border-t border-slate-850 bg-slate-900/10" id="chatInputArea">
          <!-- Rendered input box based on permissions -->
        </div>
      </div>
    </div>
  `;

  renderIcons();

  // Reference elements
  const channelListContainer = document.getElementById("channelListContainer") as HTMLElement;
  const activeChannelName = document.getElementById("activeChannelName") as HTMLElement;
  const activeChannelDesc = document.getElementById("activeChannelDesc") as HTMLElement;
  const chatMessagePanel = document.getElementById("chatMessagePanel") as HTMLElement;
  const chatInputArea = document.getElementById("chatInputArea") as HTMLElement;

  // Render Channel List sidebar
  function renderChannels() {
    channelListContainer.innerHTML = channels.map(ch => {
      const isSelected = ch.id === activeChannel;
      return `
        <button class="channel-btn w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-all ${
          isSelected 
            ? "bg-cyan-500/10 text-cyan-400 font-bold border-l-2 border-l-cyan-400" 
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }" data-id="${ch.id}">
          <i data-lucide="${ch.icon}" class="w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}"></i>
          <span class="truncate font-mono">#${ch.name}</span>
        </button>
      `;
    }).join("");

    renderIcons();

    // Event listener for channels
    document.querySelectorAll(".channel-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (id !== activeChannel) {
          switchChannel(id);
        }
      });
    });
  }

  // Switch Chat Channel
  function switchChannel(channelId: string) {
    activeChannel = channelId;
    const targetCh = channels.find(c => c.id === channelId)!;
    
    activeChannelName.innerText = targetCh.name;
    activeChannelDesc.innerText = targetCh.desc;

    renderChannels();
    setupMessagesListener();
    renderInputArea(targetCh);
  }

  // Render Message Input Area based on user session & adminOnlyWrite permission
  function renderInputArea(channel: any) {
    const isSAdmin = userSession.role === "Super Admin";
    const isWali = userSession.role === "Wali Kelas";
    const isPengurus = userSession.role === "Ketua Kelas" || userSession.role === "Wakil" || userSession.role === "Sekretaris" || userSession.role === "Bendahara";
    const canWrite = !channel.adminOnlyWrite || isSAdmin || isWali || isPengurus;

    if (!canWrite) {
      chatInputArea.innerHTML = `
        <div class="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center text-xs text-rose-400 flex items-center justify-center gap-2">
          <i data-lucide="lock" class="w-4 h-4"></i>
          Hanya pengurus kelas / admin yang diizinkan memposting pesan di saluran ini.
        </div>
      `;
      renderIcons();
      return;
    }

    chatInputArea.innerHTML = `
      <form id="sendMessageForm" class="flex items-center gap-3 relative">
        <label for="chatFileInput" class="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl cursor-pointer transition-all shrink-0" title="Unggah File / Gambar">
          <i data-lucide="paperclip" class="w-4 h-4"></i>
          <input type="file" id="chatFileInput" class="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar">
        </label>
        
        <div class="relative flex-1">
          <input type="text" id="chatMessageInput" required placeholder="Tulis pesan ke #${channel.name}..." class="w-full pl-4 pr-12 py-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl focus:border-cyan-500 text-slate-100 outline-none text-xs transition-colors" autocomplete="off">
          <button type="button" id="emojiHelperBtn" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 text-sm transition-all" title="Tambah Emoji">😊</button>
        </div>

        <button type="submit" id="sendMessageBtn" class="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer">
          <i data-lucide="send" class="w-4.5 h-4.5"></i>
        </button>
      </form>
      <div id="fileUploadPreview" class="hidden mt-2 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <!-- Rendered upload preview dynamically -->
      </div>
    `;

    renderIcons();

    // Event listeners inside input area
    const sendForm = document.getElementById("sendMessageForm") as HTMLFormElement;
    const msgInput = document.getElementById("chatMessageInput") as HTMLInputElement;
    const fileInput = document.getElementById("chatFileInput") as HTMLInputElement;
    const filePreview = document.getElementById("fileUploadPreview") as HTMLElement;
    const emojiHelperBtn = document.getElementById("emojiHelperBtn") as HTMLButtonElement;

    let attachedFile: File | null = null;

    // Emoji helper quick trigger
    if (emojiHelperBtn) {
      emojiHelperBtn.addEventListener("click", () => {
        const emojis = ["👍", "❤️", "😂", "🔥", "🙌", "💯", "🚀", "📢", "📚", "💻", "✨", "🙏"];
        Swal.fire({
          title: "Sisipkan Emoji",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="grid grid-cols-6 gap-2.5 p-2">
              ${emojis.map(e => `
                <button class="emoji-select-btn text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-slate-850 transition-all cursor-pointer" data-emoji="${e}">
                  ${e}
                </button>
              `).join("")}
            </div>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: "Tutup",
          cancelButtonColor: "#334155"
        });

        // Listen to select emoji
        document.body.addEventListener("click", function handleEmojiSelect(e: any) {
          const btn = e.target.closest(".emoji-select-btn");
          if (btn) {
            msgInput.value += btn.dataset.emoji;
            msgInput.focus();
            Swal.close();
            document.body.removeEventListener("click", handleEmojiSelect);
          }
        });
      });
    }

    // File selection preview
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error("File terlalu besar! Maksimal ukuran file 10MB.");
            fileInput.value = "";
            return;
          }
          attachedFile = file;
          const isImage = file.type.startsWith("image/");
          filePreview.classList.remove("hidden");
          filePreview.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="p-1.5 bg-slate-950 rounded-lg text-cyan-400">
                <i data-lucide="${isImage ? 'image' : 'file'}" class="w-3.5 h-3.5"></i>
              </span>
              <span class="truncate pr-4">${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
            <button type="button" id="removeAttachedFileBtn" class="text-slate-500 hover:text-rose-400 p-1 rounded-lg">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          `;
          renderIcons();

          document.getElementById("removeAttachedFileBtn")?.addEventListener("click", () => {
            attachedFile = null;
            fileInput.value = "";
            filePreview.classList.add("hidden");
            filePreview.innerHTML = "";
          });
        }
      });
    }

    // Form submission
    sendForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text && !attachedFile) return;

      const sendBtn = document.getElementById("sendMessageBtn") as HTMLButtonElement;
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span class="spinner w-4.5 h-4.5 border-slate-950 border-t-cyan-500"></span>`;

      try {
        let attachmentUrl = "";
        let attachmentType = "";
        let attachmentName = "";

        if (attachedFile) {
          toast.info("Mengunggah berkas...");
          const storageRef = ref(storage, `discussions/${Date.now()}-${attachedFile.name}`);
          const snapshot = await uploadBytes(storageRef, attachedFile);
          attachmentUrl = await getDownloadURL(snapshot.ref);
          attachmentType = attachedFile.type;
          attachmentName = attachedFile.name;
        }

        await addDiscussionMessage({
          channelId: activeChannel,
          text: text,
          userId: userSession.uid,
          userName: userSession.name,
          userFoto: userSession.foto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop",
          userRole: userSession.jabatan || "Siswa",
          attachmentUrl: attachmentUrl,
          attachmentType: attachmentType,
          attachmentName: attachmentName
        });

        // Reset state
        msgInput.value = "";
        attachedFile = null;
        if (fileInput) fileInput.value = "";
        filePreview.classList.add("hidden");
        filePreview.innerHTML = "";
      } catch (err: any) {
        toast.error("Gagal mengirim pesan: " + err.message);
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<i data-lucide="send" class="w-4.5 h-4.5"></i>`;
        renderIcons();
      }
    });
  }

  // Set up live Snapshot Listener for messages
  function setupMessagesListener() {
    // Unsubscribe previous channel listener
    if (globalUnsubscribeMessages) {
      globalUnsubscribeMessages();
    }

    const messagesQuery = query(
      collection(db, "discussions"),
      where("channelId", "==", activeChannel),
      limit(80)
    );

    globalUnsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const docs = snapshot.docs;
      
      if (docs.length === 0) {
        chatMessagePanel.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
            <div class="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <i data-lucide="message-square" class="w-5 h-5"></i>
            </div>
            <p class="text-xs font-semibold">Selamat datang di #${activeChannel}!</p>
            <p class="text-[10px] text-slate-600 max-w-xs text-center leading-normal">Belum ada pesan di sini. Jadilah orang pertama yang memulai obrolan hari ini!</p>
          </div>
        `;
        renderIcons();
        return;
      }

      // Sort client-side by createdAt descending (newest first) to avoid requiring composite indexes
      const sortedDocs = [...docs].sort((a, b) => {
        const dataA = a.data();
        const dataB = b.data();
        const timeA = dataA.createdAt ? (dataA.createdAt.toDate ? dataA.createdAt.toDate().getTime() : new Date(dataA.createdAt).getTime()) : Date.now();
        const timeB = dataB.createdAt ? (dataB.createdAt.toDate ? dataB.createdAt.toDate().getTime() : new Date(dataB.createdAt).getTime()) : Date.now();
        return timeB - timeA;
      });

      // We render messages in direct sequence, but since flex flex-col-reverse is used for smooth bottom alignment,
      // we need to render the most recent message at the bottom of the container.
      // Firestore query sorted desc means docs[0] is newest. Col-reverse means container renders bottom-to-top.
      // So putting docs in sequence fits perfectly!
      chatMessagePanel.innerHTML = sortedDocs.map(doc => {
        const msg = doc.data();
        const msgId = doc.id;
        const isSelf = msg.userId === userSession.uid;
        const msgDate = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : new Date();
        const formattedTime = formatDate(msgDate) + ", " + msgDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

        // Custom author badge colors based on role
        let badgeClass = "bg-slate-400/10 border-slate-400/20 text-slate-400";
        if (msg.userRole === "Super Admin" || msg.userRole === "Wali Kelas") {
          badgeClass = "bg-rose-400/10 border-rose-400/20 text-rose-400 font-bold";
        } else if (msg.userRole === "Ketua Kelas" || msg.userRole === "Wakil") {
          badgeClass = "bg-amber-400/10 border-amber-400/20 text-amber-400 font-bold";
        } else if (msg.userRole === "Bendahara") {
          badgeClass = "bg-teal-400/10 border-teal-400/20 text-teal-400";
        } else if (msg.userRole === "Sekretaris") {
          badgeClass = "bg-purple-400/10 border-purple-400/20 text-purple-400";
        }

        // Reactions listing
        const reactionsMap = msg.reactions || {};
        const reactionsHTML = Object.entries(reactionsMap).map(([emoji, uids]: [string, any]) => {
          const hasVoted = uids.includes(userSession.uid);
          return `
            <button class="msg-reaction-pill px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1.5 cursor-pointer transition-all ${
              hasVoted 
                ? "bg-cyan-500/15 border-cyan-400/35 text-cyan-400 font-extrabold" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            }" data-msgid="${msgId}" data-emoji="${emoji}">
              <span>${emoji}</span>
              <span class="text-[9px] font-mono">${uids.length}</span>
            </button>
          `;
        }).join("");

        // Image attachment preview
        let attachmentHTML = "";
        if (msg.attachmentUrl) {
          const isImage = msg.attachmentType?.startsWith("image/");
          if (isImage) {
            attachmentHTML = `
              <div class="mt-2.5 max-w-sm rounded-2xl overflow-hidden border border-slate-800 shadow-lg bg-slate-950/40 cursor-pointer hover:border-slate-700 transition-all">
                <img src="${msg.attachmentUrl}" class="max-h-48 w-full object-cover chat-img-preview" referrerPolicy="no-referrer">
              </div>
            `;
          } else {
            attachmentHTML = `
              <div class="mt-2 p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 max-w-sm">
                <div class="flex items-center gap-2 overflow-hidden">
                  <span class="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                  </span>
                  <div class="overflow-hidden">
                    <p class="text-[11px] font-bold text-slate-200 truncate leading-none mb-1">${msg.attachmentName || 'Berkas Bersama'}</p>
                    <span class="text-[8px] text-slate-500 font-mono uppercase">Dokumen</span>
                  </div>
                </div>
                <a href="${msg.attachmentUrl}" target="_blank" download class="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all shadow-md shadow-cyan-500/15">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                </a>
              </div>
            `;
          }
        }

        return `
          <div class="flex gap-3.5 group relative ${isSelf ? 'flex-row-reverse' : ''}">
            <!-- User photo -->
            <img src="${msg.userFoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop'}" class="w-9 h-9 rounded-xl object-cover border border-slate-850 shrink-0">
            
            <!-- Message body -->
            <div class="space-y-1 max-w-[70%]">
              <div class="flex items-center gap-2 flex-wrap ${isSelf ? 'justify-end' : ''}">
                <span class="text-xs font-bold text-white leading-none">${msg.userName}</span>
                <span class="px-1.5 py-0.2 border text-[8px] font-bold rounded font-mono uppercase tracking-wide leading-none ${badgeClass}">${msg.userRole}</span>
                <span class="text-[9px] text-slate-500 font-mono leading-none">${formattedTime}</span>
              </div>
              
              <div class="p-3.5 rounded-2xl text-xs leading-relaxed border ${
                isSelf 
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-50 text-right rounded-tr-none" 
                  : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
              }">
                <p class="whitespace-pre-wrap select-text break-words">${msg.text || ''}</p>
                ${attachmentHTML}
              </div>

              <!-- Reactions Bar -->
              <div class="flex items-center gap-1.5 flex-wrap ${isSelf ? 'justify-end' : ''} pt-1">
                ${reactionsHTML}
                
                <!-- Quick React Action Button -->
                <button class="quick-react-trigger opacity-0 group-hover:opacity-100 p-1 bg-slate-900/60 border border-slate-850 text-slate-500 hover:text-white rounded-lg transition-all cursor-pointer text-[10px]" data-msgid="${msgId}">
                  + 😊
                </button>
              </div>
            </div>

            <!-- Delete action shortcut -->
            ${isSelf || userSession.role === "Super Admin" ? `
              <button class="delete-msg-btn absolute opacity-0 group-hover:opacity-100 p-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer ${isSelf ? 'left-0' : 'right-0'}" data-id="${msgId}">
                <i data-lucide="trash" class="w-3.5 h-3.5"></i>
              </button>
            ` : ""}
          </div>
        `;
      }).join("");

      renderIcons();

      // Listeners for image modal preview
      document.querySelectorAll(".chat-img-preview").forEach((img: any) => {
        img.addEventListener("click", () => {
          Swal.fire({
            imageUrl: img.src,
            imageAlt: "Pratinjau Foto Chat",
            background: "#090d16",
            showConfirmButton: false,
            showCloseButton: true,
            confirmButtonColor: "#06b6d4"
          });
        });
      });

      // Reaction pill toggle listeners
      document.querySelectorAll(".msg-reaction-pill").forEach((pill: any) => {
        pill.addEventListener("click", async () => {
          const msgId = pill.dataset.msgid;
          const emoji = pill.dataset.emoji;
          await toggleMessageReaction(msgId, emoji, userSession.uid);
        });
      });

      // Quick react picker triggers
      document.querySelectorAll(".quick-react-trigger").forEach((trigger: any) => {
        trigger.addEventListener("click", () => {
          const msgId = trigger.dataset.msgid;
          const quickEmojis = ["👍", "❤️", "😂", "😮", "😢", "🚀"];
          Swal.fire({
            title: "Tambahkan Reaksi",
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="flex items-center justify-center gap-3 py-3">
                ${quickEmojis.map(e => `
                  <button class="quick-emoji-select text-2xl hover:scale-125 transition-all p-1 cursor-pointer" data-emoji="${e}">
                    ${e}
                  </button>
                `).join("")}
              </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "Batal",
            cancelButtonColor: "#334155"
          });

          document.body.addEventListener("click", function handleQuickEmojiSelect(e: any) {
            const btn = e.target.closest(".quick-emoji-select");
            if (btn) {
              const emoji = btn.dataset.emoji;
              toggleMessageReaction(msgId, emoji, userSession.uid);
              Swal.close();
              document.body.removeEventListener("click", handleQuickEmojiSelect);
            }
          });
        });
      });

      // Delete message listeners
      document.querySelectorAll(".delete-msg-btn").forEach((btn: any) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const result = await Swal.fire({
            title: "Hapus Pesan",
            text: "Hapus pesan ini dari ruang diskusi secara permanen?",
            icon: "warning",
            background: "#0f172a",
            color: "#f8fafc",
            showCancelButton: true,
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#334155"
          });

          if (result.isConfirmed) {
            try {
              await deleteDiscussionMessage(id);
              toast.success("Pesan terhapus!");
            } catch (err: any) {
              toast.error(err.message);
            }
          }
        });
      });
    }, (error) => {
      console.error("Gagal mendengarkan chat snapshot: ", error);
    });
  }

  // Initialize view
  renderChannels();
  switchChannel("umum");

  // Destroy listener on unmount
  container.addEventListener("DOMNodeRemovedFromDocument", () => {
    if (globalUnsubscribeMessages) {
      globalUnsubscribeMessages();
    }
  });
}
