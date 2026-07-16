import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { renderIcons, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

// Shop items
interface ShopItem {
  id: string;
  name: string;
  cost: number;
  type: "avatar" | "frame" | "theme" | "wallpaper" | "badge";
  preview: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "av_router", name: "Cisco Router Guru Avatar", cost: 200, type: "avatar", preview: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop" },
  { id: "av_hacker", name: "Cyber Security Pro Avatar", cost: 350, type: "avatar", preview: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop" },
  { id: "av_splicer", name: "Fiber Optic Master Splicer", cost: 500, type: "avatar", preview: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=120&h=120&fit=crop" },
  { id: "fr_neon", name: "Cyberpunk Neon Frame", cost: 150, type: "frame", preview: "ring-4 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]" },
  { id: "fr_gold", name: "Golden Network Master Frame", cost: 300, type: "frame", preview: "ring-4 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]" },
  { id: "fr_rainbow", name: "RGB Gamers Glow Frame", cost: 450, type: "frame", preview: "ring-4 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-pulse" },
  { id: "bd_genius", name: "🧠 Genius TKJ Badge", cost: 400, type: "badge", preview: "🧠 Genius TKJ" },
  { id: "bd_legend", name: "👑 Sysadmin Legend Badge", cost: 600, type: "badge", preview: "👑 Sysadmin Legend" }
];

// Sample Quiz Database for Games
const GAME_QUIZZES = [
  { q: "Apa nama protokol yang digunakan untuk mengirim email?", options: ["HTTP", "FTP", "SMTP", "POP3"], answer: 2 },
  { q: "IP Address 10.0.0.1 termasuk dalam kelas...", options: ["Kelas A", "Kelas B", "Kelas C", "Kelas D"], answer: 0 },
  { q: "Kabel UTP yang digunakan untuk menghubungkan PC langsung ke PC adalah...", options: ["Straight", "Cross", "Rollover", "Console"], answer: 1 },
  { q: "Port default dari Web Server HTTPS adalah...", options: ["Port 80", "Port 22", "Port 443", "Port 8080"], answer: 2 },
  { q: "RouterOS adalah sistem operasi milik vendor...", options: ["Cisco", "MikroTik", "Juniper", "Huawei"], answer: 1 },
  { q: "Perangkat yang bekerja pada OSI Layer 2 (Data Link) adalah...", options: ["Hub", "Router", "Switch Layer 2", "Repeater"], answer: 2 },
  { q: "Singkatan dari WAN adalah...", options: ["Wide Area Network", "Wifi Area Network", "Web Access Network", "World Access Node"], answer: 0 },
  { q: "Berapa jumlah pin pada konektor RJ-45 standar?", options: ["4 Pin", "6 Pin", "8 Pin", "10 Pin"], answer: 2 },
  { q: "Subnet mask default dari CIDR /24 adalah...", options: ["255.255.0.0", "255.255.255.0", "255.255.255.240", "255.255.255.128"], answer: 1 },
  { q: "Aplikasi GUI untuk mengonfigurasi perangkat MikroTik secara visual adalah...", options: ["PuTTY", "Cisco Packet Tracer", "Winbox", "Termius"], answer: 2 },
  { q: "Alamat IP loopback standar untuk protokol IPv4 adalah...", options: ["192.168.1.1", "127.0.0.1", "10.0.0.1", "172.16.0.1"], answer: 1 },
  { q: "Kabel fiber optic single-mode biasanya menggunakan cahaya berupa...", options: ["Laser", "LED", "Inframerah Biasa", "Neon"], answer: 0 }
];

// Web Audio API Synthesizer Helper
function playRetroSound(type: "click" | "success" | "error" | "coin" | "levelup" | "tick") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "tick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "coin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "levelup") {
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      osc.frequency.setValueAtTime(1318.51, now + 0.32);
      osc.frequency.setValueAtTime(1567.98, now + 0.4); // G6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    // Fail silently if audio is blocked or unsupported
  }
}

export async function renderMiniGames(container: HTMLElement, userSession: any) {
  // Styles for the card flips and matching games
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    .flip-card {
      perspective: 1000px;
    }
    .flip-card-inner {
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform-style: preserve-3d;
    }
    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }
    .flip-card-front, .flip-card-back {
      backface-visibility: hidden;
    }
    .flip-card-back {
      transform: rotateY(180deg);
    }
  `;
  document.head.appendChild(styleEl);

  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400 font-sans">Menghubungkan ke Server Mini Games...</span>
    </div>
  `;

  let activeTab = "games"; // games, shop, leaderboard
  let activeGame: "cable" | "memory" | "quiz" | "spin" | null = null;

  // User Game Profile state
  let xp = 0;
  let coins = 0;
  let level = 1;
  let badges: string[] = ["⚡ Pemula TKJ"];
  let inventory: string[] = [];
  let equippedAvatar = "";
  let equippedFrame = "";

  async function loadGameProfile() {
    try {
      const pDoc = await getDoc(doc(db, "gameData", userSession.uid));
      if (pDoc.exists()) {
        const data = pDoc.data();
        xp = data.xp || 0;
        coins = data.coins || 0;
        level = data.level || 1;
        badges = data.badges || ["⚡ Pemula TKJ"];
        inventory = data.inventory || [];
        equippedAvatar = data.equippedAvatar || "";
        equippedFrame = data.equippedFrame || "";
      } else {
        // Init profile
        await setDoc(doc(db, "gameData", userSession.uid), {
          uid: userSession.uid,
          name: userSession.name,
          xp: 10,
          coins: 50,
          level: 1,
          badges: ["⚡ Pemula TKJ"],
          inventory: [],
          equippedAvatar: "",
          equippedFrame: "",
          updatedAt: new Date()
        });
        xp = 10;
        coins = 50;
        level = 1;
        badges = ["⚡ Pemula TKJ"];
        inventory = [];
        equippedAvatar = "";
        equippedFrame = "";
      }

      renderUI();
    } catch (err) {
      console.error(err);
      renderUI();
    }
  }

  async function saveGameProfile() {
    try {
      await setDoc(doc(db, "gameData", userSession.uid), {
        uid: userSession.uid,
        name: userSession.name,
        xp,
        coins,
        level,
        badges,
        inventory,
        equippedAvatar,
        equippedFrame,
        updatedAt: new Date()
      }, { merge: true });
    } catch (e) {
      console.error("Gagal menyimpan game data:", e);
    }
  }

  async function addRewards(earnedXp: number, earnedCoins: number, gameName: string) {
    xp += earnedXp;
    coins += earnedCoins;
    
    // Check level up (every 100 XP = 1 Level)
    const newLevel = Math.floor(xp / 100) + 1;
    let didLevelUp = false;
    if (newLevel > level) {
      level = newLevel;
      didLevelUp = true;
      playRetroSound("levelup");
      badges.push(`🔥 Level ${level} Expert`);
    } else {
      playRetroSound("success");
    }

    await saveGameProfile();

    Swal.fire({
      icon: "success",
      title: "Game Selesai! 🎮",
      background: "#0f172a",
      color: "#f8fafc",
      html: `
        <div class="space-y-3 font-sans">
          <p class="text-sm">Selamat! Kamu menyelesaikan permainan <strong>${gameName}</strong>.</p>
          <div class="flex justify-center gap-4 text-sm font-mono font-bold mt-2">
            <span class="text-cyan-400">✨ +${earnedXp} XP</span>
            <span class="text-yellow-400">🪙 +${earnedCoins} Koin</span>
          </div>
          ${didLevelUp ? `
            <div class="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mt-4">
              <span class="text-xs text-cyan-400 font-extrabold uppercase">LEVEL UP! 🎉</span>
              <p class="text-base text-white font-bold mt-1">Kamu naik ke Level ${level}!</p>
            </div>
          ` : ""}
        </div>
      `,
      confirmButtonText: "Mantap!",
      confirmButtonColor: "#10b981"
    });

    renderUI();
  }

  async function renderUI() {
    // Generate equipped styles
    const avatarUrl = equippedAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";
    const frameClass = equippedFrame || "border border-slate-800";

    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn text-slate-100 font-sans max-w-5xl mx-auto">
        
        <!-- Game Profile Header Stats -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 glass rounded-3xl relative overflow-hidden bg-slate-900/40 border border-slate-800">
          <div class="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
          
          <div class="flex items-center gap-4 relative z-10">
            <div class="relative">
              <img src="${avatarUrl}" class="w-14 h-14 rounded-2xl object-cover ${frameClass}">
              <span class="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 font-bold font-mono text-[10px] w-5 h-5 rounded-lg flex items-center justify-center border-2 border-slate-950">
                ${level}
              </span>
            </div>
            
            <div class="space-y-1">
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                ${userSession.name} 
                <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">Rank XII TKJ 1</span>
              </h2>
              <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span class="flex items-center gap-1"><i data-lucide="award" class="w-3.5 h-3.5 text-cyan-400"></i> ${xp} XP</span>
                <span class="flex items-center gap-1"><i data-lucide="coins" class="w-3.5 h-3.5 text-yellow-500"></i> ${coins} Koin</span>
              </div>
              <!-- XP progress bar -->
              <div class="w-48 bg-slate-950 h-1.5 rounded-full overflow-hidden relative">
                <div class="bg-cyan-500 h-full absolute left-0 top-0 transition-all duration-300" style="width: ${xp % 100}%"></div>
              </div>
            </div>
          </div>

          <!-- Navigation Tab Controls -->
          <div class="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
            <button class="game-tab-btn px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'games' && !activeGame ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'}" data-tab="games">
              <i data-lucide="gamepad-2" class="w-3.5 h-3.5"></i> Main Games
            </button>
            <button class="game-tab-btn px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'shop' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'}" data-tab="shop">
              <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Toko Koin
            </button>
            <button class="game-tab-btn px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'leaderboard' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'}" data-tab="leaderboard">
              <i data-lucide="trophy" class="w-3.5 h-3.5"></i> Leaderboard
            </button>
          </div>
        </div>

        <div id="gameTabContent" class="animate-fadeIn">
          ${activeGame ? `
            <!-- ACTIVE GAME VIEWPORT -->
            <div id="activeGameViewport" class="p-6 glass rounded-3xl border border-slate-800 relative bg-slate-900/20">
              <div class="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
                <button id="exitGameBtn" class="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
                  <i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali ke Menu
                </button>
                <div class="flex items-center gap-3 font-mono text-xs">
                  <span class="px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-850 text-cyan-400 font-bold flex items-center gap-1">
                    <i data-lucide="coins" class="w-3.5 h-3.5 text-yellow-500"></i> ${coins}
                  </span>
                </div>
              </div>

              <!-- INJECT GAME INTERFACES DYNAMICALLY -->
              <div id="gamePlayground"></div>
            </div>
          ` : `
            <!-- TAB: GAMES GRID -->
            ${activeTab === 'games' ? `
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Game 1: Cable Arranger -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-emerald-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">
                      <i data-lucide="wrench" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">Cable Arranger T-568B</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Simulasikan pemasangan kabel UTP Straight pin 1 s.d 8 sesuai standar resmi dengan cara menukar posisi kabel.</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="cable">
                    Mulai Simulator
                  </button>
                </div>

                <!-- Game 2: Memory Match -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-cyan-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl">
                      <i data-lucide="sparkles" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">Memory Card Hardware</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Uji daya ingat visualmu dengan memasangkan kartu perangkat jaringan internet secepat mungkin.</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="memory">
                    Uji Memori
                  </button>
                </div>

                <!-- Game 3: TKJ Sprint Quiz -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-amber-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl">
                      <i data-lucide="zap" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">TKJ Sprint Quiz</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Jawab kuis kilat jaringan dengan batas waktu 15 detik per soal. Uji ilmu teorimu!</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="quiz">
                    Mulai Kuis
                  </button>
                </div>

                <!-- Game 4: Spin Wheel -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-purple-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">
                      <i data-lucide="star" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">Lucky Spin Wheel</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Putar roda keberuntungan harianmu secara interaktif untuk klaim hadiah Koin & XP gratis.</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="spin">
                    Putar Roda
                  </button>
                </div>
              </div>
            ` : ""}

            <!-- TAB: SHOP & INVENTORY -->
            ${activeTab === 'shop' ? `
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-white uppercase tracking-wider">Toko Penukaran Koin Emas & Inventaris</h3>
                  <span class="text-xs text-slate-400">Gunakan koin yang kamu menangkan untuk mendandani profilmu</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  ${SHOP_ITEMS.map(item => {
                    const owned = inventory.includes(item.id);
                    const isEquipped = (item.type === "avatar" && equippedAvatar === item.preview) || 
                                       (item.type === "frame" && equippedFrame === item.preview);

                    return `
                      <div class="p-5 glass rounded-3xl flex flex-col justify-between border border-slate-850 hover:border-cyan-500/10 transition-all bg-slate-950/20">
                        <div class="text-center space-y-3">
                          ${item.type === 'avatar' ? `
                            <div class="relative w-16 h-16 mx-auto">
                              <img src="${item.preview}" class="w-16 h-16 rounded-full border-2 border-slate-800 object-cover">
                            </div>
                          ` : item.type === 'frame' ? `
                            <div class="w-16 h-16 rounded-xl mx-auto bg-slate-900 flex items-center justify-center border border-slate-800 ${item.preview}">
                              <span class="text-[9px] text-cyan-400 font-mono font-bold">BINGKAI</span>
                            </div>
                          ` : `
                            <div class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-bold text-xs text-cyan-400 inline-block font-mono">
                              ${item.preview}
                            </div>
                          `}
                          
                          <div>
                            <h4 class="font-bold text-slate-100 text-sm leading-snug">${item.name}</h4>
                            <span class="text-[9px] text-slate-500 block uppercase font-mono mt-0.5">${item.type}</span>
                          </div>
                        </div>

                        <div class="mt-4 pt-4 border-t border-slate-850/80 flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <span class="text-xs text-yellow-400 font-bold font-mono">🪙 ${item.cost} Koin</span>
                            ${owned ? `
                              <span class="text-[10px] text-emerald-400 font-bold">Milik Kamu</span>
                            ` : ""}
                          </div>

                          ${owned ? `
                            ${item.type !== "badge" ? `
                              <button class="equip-item-btn w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isEquipped ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'}" data-id="${item.id}" data-type="${item.type}" data-preview="${item.preview}">
                                ${isEquipped ? '✓ Sedang Dipakai' : 'Pasang di Profil'}
                              </button>
                            ` : `
                              <button class="w-full py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800" disabled>
                                Badge Otomatis Aktif
                              </button>
                            `}
                          ` : `
                            <button class="buy-item-btn w-full py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer" data-id="${item.id}">
                              Beli Item
                            </button>
                          `}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            ` : ""}

            <!-- TAB: LEADERBOARD -->
            ${activeTab === 'leaderboard' ? `
              <div class="max-w-2xl mx-auto p-6 glass rounded-3xl space-y-4 border border-slate-800 bg-slate-900/10">
                <div class="text-center space-y-1">
                  <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <i data-lucide="crown" class="w-4 h-4 text-amber-400 animate-bounce"></i> Papan Peringkat XII TKJ 1
                  </h3>
                  <p class="text-xs text-slate-500">Peringkat siswa paling terampil dalam kuis dan tantangan kelas</p>
                </div>
                
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                        <th class="p-3">Rank</th>
                        <th class="p-3">Nama Siswa</th>
                        <th class="p-3">Level</th>
                        <th class="p-3">Total XP</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-850" id="leaderboardRows">
                      <tr>
                        <td colspan="4" class="p-8 text-center text-slate-500 font-mono">Memuat data peringkat...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ""}
          `}
        </div>

      </div>
    `;

    renderIcons();

    // Attach Game Launchers
    document.querySelectorAll(".launch-game-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        playRetroSound("click");
        activeGame = btn.dataset.game;
        renderUI().then(() => {
          initActiveGame();
        });
      });
    });

    // Attach Tab Switchers
    document.querySelectorAll(".game-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        playRetroSound("click");
        activeTab = btn.dataset.tab;
        activeGame = null;
        renderUI().then(() => {
          loadLeaderboard();
        });
      });
    });

    // Buy Shop Item Event
    document.querySelectorAll(".buy-item-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        playRetroSound("click");
        const itemId = btn.dataset.id;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (coins < item.cost) {
          playRetroSound("error");
          toast.error("Koin tidak mencukupi!");
          return;
        }

        const confirm = await confirmDialog("Konfirmasi Pembelian", `Beli ${item.name} seharga 🪙 ${item.cost} Koin?`);
        if (confirm) {
          coins -= item.cost;
          inventory.push(itemId);
          if (item.type === "badge") {
            badges.push(item.preview);
          }
          playRetroSound("coin");
          await saveGameProfile();
          toast.success("Pembelian Berhasil!");
          renderUI();
        }
      });
    });

    // Equip Item Event
    document.querySelectorAll(".equip-item-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        playRetroSound("click");
        const type = btn.dataset.type;
        const preview = btn.dataset.preview;

        if (type === "avatar") {
          equippedAvatar = equippedAvatar === preview ? "" : preview;
        } else if (type === "frame") {
          equippedFrame = equippedFrame === preview ? "" : preview;
        }

        await saveGameProfile();
        toast.success("Profil Diperbarui!");
        renderUI();
      });
    });

    // Exit Game Event
    const exitGameBtn = document.getElementById("exitGameBtn");
    if (exitGameBtn) {
      exitGameBtn.addEventListener("click", () => {
        playRetroSound("click");
        activeGame = null;
        renderUI();
      });
    }

    // Load leaderboard rows if active
    loadLeaderboard();
  }

  // Load Leaderboard Rows from Firestore
  async function loadLeaderboard() {
    const rowsContainer = document.getElementById("leaderboardRows");
    if (!rowsContainer) return;

    try {
      const lq = query(collection(db, "gameData"), orderBy("xp", "desc"), limit(10));
      const snap = await getDocs(lq);
      
      let index = 0;
      rowsContainer.innerHTML = snap.docs.map(doc => {
        index++;
        const data = doc.data();
        const badgeIcon = index === 1 ? "🥇" : index === 2 ? "🥈" : index === 3 ? "🥉" : `${index}`;
        
        let displayBadge = "";
        if (data.badges && data.badges.length > 0) {
          // Use latest custom badge or fallback
          const b = data.badges.filter((x: string) => x.includes("Genius") || x.includes("Legend"));
          displayBadge = b.length > 0 ? b[b.length - 1] : data.badges[0];
        }

        return `
          <tr class="hover:bg-slate-900/40 transition-all">
            <td class="p-3 font-bold font-mono text-slate-400">${badgeIcon}</td>
            <td class="p-3">
              <div class="flex items-center gap-2">
                <img src="${data.equippedAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop'}" class="w-6 h-6 rounded-md object-cover ${data.equippedFrame || ''}">
                <div class="flex flex-col">
                  <span class="font-bold text-slate-100">${data.name}</span>
                  ${displayBadge ? `<span class="text-[9px] text-amber-400 font-mono">${displayBadge}</span>` : ""}
                </div>
              </div>
            </td>
            <td class="p-3 font-mono text-cyan-400 font-bold">${data.level || 1}</td>
            <td class="p-3 font-mono text-slate-200 font-extrabold">${data.xp || 0} XP</td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      rowsContainer.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-400">Gagal memuat: ${(e as any).message}</td></tr>`;
    }
  }

  // GAME ROUTER & INITIALIZERS
  function initActiveGame() {
    const playground = document.getElementById("gamePlayground");
    if (!playground) return;

    if (activeGame === "cable") {
      initCableArranger(playground);
    } else if (activeGame === "memory") {
      initMemoryGame(playground);
    } else if (activeGame === "quiz") {
      initQuizSprint(playground);
    } else if (activeGame === "spin") {
      initSpinWheel(playground);
    }
  }

  // -------------------------------------------------------------
  // GAME 1: CABLE ARRANGER (T-568B STANDARD)
  // -------------------------------------------------------------
  function initCableArranger(p: HTMLElement) {
    const targetOrder = [
      "Putih-Oranye",
      "Oranye",
      "Putih-Hijau",
      "Biru",
      "Putih-Biru",
      "Hijau",
      "Putih-Cokelat",
      "Cokelat"
    ];

    const cableColors: any = {
      "Putih-Oranye": "border-l-8 border-l-amber-500 bg-slate-900 border border-slate-700",
      "Oranye": "bg-amber-500 text-slate-950 font-bold",
      "Putih-Hijau": "border-l-8 border-l-emerald-500 bg-slate-900 border border-slate-700",
      "Biru": "bg-blue-600 text-white font-bold",
      "Putih-Biru": "border-l-8 border-l-blue-500 bg-slate-900 border border-slate-700",
      "Hijau": "bg-emerald-600 text-white font-bold",
      "Putih-Cokelat": "border-l-8 border-l-amber-900 bg-slate-900 border border-slate-700",
      "Cokelat": "bg-amber-900 text-white font-bold"
    };

    // Random shuffle initial order
    let currentOrder = [...targetOrder].sort(() => Math.random() - 0.5);
    let selectedIdx: number | null = null;
    let secondsLeft = 35;
    let timerInterval: any = null;

    function renderGame() {
      p.innerHTML = `
        <div class="space-y-6 max-w-2xl mx-auto">
          <div class="text-center space-y-1">
            <h2 class="text-base font-bold text-white flex items-center justify-center gap-1.5">
              <i data-lucide="wrench" class="w-4 h-4 text-emerald-400"></i> Simulator Cable Splicer T-568B
            </h2>
            <p class="text-xs text-slate-400">Pilihlah kabel dan tukar posisinya hingga urutan Pin 1 - 8 lurus (Straight 568B) sempurna!</p>
          </div>

          <!-- Timer Bar and Indicator -->
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-400">Waktu Merakit:</span>
            <span class="text-amber-400 font-bold flex items-center gap-1">
              <i data-lucide="timer" class="w-3.5 h-3.5 animate-spin"></i> <span id="cableTimerSec">${secondsLeft}s</span>
            </span>
          </div>
          <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden relative">
            <div id="cableTimerBar" class="bg-emerald-500 h-full absolute left-0 top-0 transition-all duration-1000" style="width: 100%"></div>
          </div>

          <!-- RJ45 Schematic Representation -->
          <div class="p-6 bg-slate-950/60 border border-slate-800 rounded-3xl flex flex-col items-center">
            <div class="relative w-full max-w-md bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              <div class="absolute -top-3 px-3 py-0.5 bg-slate-950 border border-slate-850 text-[10px] font-mono text-cyan-400 uppercase rounded font-bold">Konektor RJ-45</div>
              
              <!-- 8 Pins grid -->
              <div class="grid grid-cols-8 gap-1.5 w-full pt-4 relative">
                ${currentOrder.map((cable, idx) => {
                  const isSelected = selectedIdx === idx;
                  const itemColor = cableColors[cable];
                  return `
                    <div class="flex flex-col items-center gap-2">
                      <span class="text-[10px] font-mono text-slate-500 font-bold">#${idx + 1}</span>
                      <button class="cable-pin-btn w-full h-28 rounded-xl ${itemColor} cursor-pointer hover:scale-[1.04] transition-all flex items-center justify-center relative shadow-lg ${isSelected ? 'ring-4 ring-cyan-400 animate-pulse' : ''}" data-idx="${idx}">
                        <div class="absolute inset-y-0 w-1 bg-white/10 left-1/2 -translate-x-1/2"></div>
                      </button>
                    </div>
                  `;
                }).join("")}
              </div>

              <!-- Plastic Clip -->
              <div class="w-20 h-6 bg-slate-800 border border-slate-750 rounded-b-xl mt-3 flex items-center justify-center">
                <div class="w-12 h-1 bg-slate-900 rounded-full"></div>
              </div>
            </div>
          </div>

          <!-- Helper list of correct sequence for training -->
          <div class="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-wrap gap-2 items-center justify-center">
            <span class="text-[10px] text-slate-500 font-bold uppercase font-mono mr-2">Panduan 568B:</span>
            ${targetOrder.map((c, i) => `
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">${i + 1}.${c}</span>
            `).join("")}
          </div>

          <!-- Bottom Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <button id="resetCableBtn" class="px-5 py-2.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-850 rounded-2xl text-xs font-bold cursor-pointer transition-all">
              Kocok Ulang
            </button>
            <button id="submitCableBtn" class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-extrabold cursor-pointer transition-all shadow-lg shadow-emerald-500/10">
              Crimp & Hubungkan 🔨
            </button>
          </div>
        </div>
      `;

      renderIcons();

      // Hook Swapper Event
      document.querySelectorAll(".cable-pin-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          playRetroSound("click");

          if (selectedIdx === null) {
            selectedIdx = idx;
            renderGame();
          } else {
            if (selectedIdx === idx) {
              selectedIdx = null;
            } else {
              // Swap
              const temp = currentOrder[selectedIdx];
              currentOrder[selectedIdx] = currentOrder[idx];
              currentOrder[idx] = temp;
              selectedIdx = null;
            }
            renderGame();
          }
        });
      });

      // Reset Button
      const resetBtn = document.getElementById("resetCableBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          playRetroSound("click");
          currentOrder = [...targetOrder].sort(() => Math.random() - 0.5);
          selectedIdx = null;
          renderGame();
        });
      }

      // Submit Button
      const submitBtn = document.getElementById("submitCableBtn");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          clearInterval(timerInterval);
          let matchCount = 0;
          currentOrder.forEach((c, idx) => {
            if (c === targetOrder[idx]) matchCount++;
          });

          if (matchCount === 8) {
            const coinReward = 35 + Math.floor(secondsLeft * 1.5);
            const xpReward = 45 + secondsLeft;
            addRewards(xpReward, coinReward, "Cable Splicer T-568B");
          } else {
            playRetroSound("error");
            Swal.fire({
              icon: "error",
              title: "Arus Pendek! ⚡",
              background: "#0f172a",
              color: "#f8fafc",
              text: `Gagal! Koneksi hanya berhasil ${Math.round((matchCount/8)*100)}%. Masih ada ${8 - matchCount} pin kabel yang tertukar posisi jabatannya.`,
              confirmButtonText: "Coba Lagi",
              confirmButtonColor: "#ef4444"
            }).then(() => {
              activeGame = "cable";
              initActiveGame();
            });
          }
        });
      }
    }

    // Start countdown
    timerInterval = setInterval(() => {
      secondsLeft--;
      const timerBar = document.getElementById("cableTimerBar");
      const timerSec = document.getElementById("cableTimerSec");

      if (timerSec) timerSec.innerText = `${secondsLeft}s`;
      if (timerBar) {
        const pct = (secondsLeft / 35) * 100;
        timerBar.style.width = `${pct}%`;
        if (pct < 30) {
          timerBar.className = "bg-rose-500 h-full absolute left-0 top-0 transition-all duration-1000";
        }
      }

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        playRetroSound("error");
        Swal.fire({
          icon: "error",
          title: "Waktu Habis! ⏰",
          background: "#0f172a",
          color: "#f8fafc",
          text: "Waktu merakit kabelmu telah habis. Coba lebih cepat ya!",
          confirmButtonText: "Ulangi Game",
          confirmButtonColor: "#3b82f6"
        }).then(() => {
          activeGame = "cable";
          initActiveGame();
        });
      }
    }, 1000);

    renderGame();
  }

  // -------------------------------------------------------------
  // GAME 2: MEMORY MATCH HARDWARE IN-PAGE
  // -------------------------------------------------------------
  function initMemoryGame(p: HTMLElement) {
    const hardwareItems = [
      { name: "Cisco Router", icon: "📟" },
      { name: "L3 Switch", icon: "🎛️" },
      { name: "AP Wi-Fi", icon: "📶" },
      { name: "Konektor RJ45", icon: "🔌" },
      { name: "Fiber Optic", icon: "🎗️" },
      { name: "Splicer FO", icon: "⚡" }
    ];

    // Double items and shuffle
    let deck = [...hardwareItems, ...hardwareItems]
      .map((item, id) => ({ ...item, uniqueId: id, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);

    let selectedCards: number[] = [];
    let moves = 0;
    let matchStreak = 1;
    let score = 0;

    function renderGame() {
      p.innerHTML = `
        <div class="space-y-6 max-w-2xl mx-auto font-sans">
          <div class="text-center space-y-1">
            <h2 class="text-base font-bold text-white flex items-center justify-center gap-1.5">
              <i data-lucide="sparkles" class="w-4 h-4 text-cyan-400"></i> Memori Perangkat Jaringan (TKJ)
            </h2>
            <p class="text-xs text-slate-400">Balik dan pasangkan dua kartu perangkat keras internet yang sama secepat mungkin!</p>
          </div>

          <!-- Info Stats Panel -->
          <div class="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 border border-slate-850 rounded-2xl text-center font-mono text-xs">
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Langkah</span>
              <span class="text-white font-extrabold" id="memoMoves">${moves}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Streak Multiplier</span>
              <span class="text-emerald-400 font-extrabold" id="memoStreak">x${matchStreak}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Poin Akurasi</span>
              <span class="text-cyan-400 font-extrabold" id="memoScore">${score} PTS</span>
            </div>
          </div>

          <!-- Memory Grid -->
          <div class="grid grid-cols-4 gap-3 max-w-md mx-auto pt-2">
            ${deck.map((card) => {
              const show = card.flipped || card.matched;
              return `
                <div class="flip-card w-full h-20 relative cursor-pointer ${show ? 'flipped' : ''}" data-id="${card.uniqueId}">
                  <div class="flip-card-inner absolute w-full h-full rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-all duration-300 flex items-center justify-center shadow-lg">
                    
                    <!-- Front Cover (Question Mark) -->
                    <div class="flip-card-front absolute w-full h-full flex items-center justify-center text-slate-600 font-extrabold text-lg select-none">
                      ❓
                    </div>

                    <!-- Back Cover (The Hardware) -->
                    <div class="flip-card-back absolute w-full h-full bg-cyan-500/10 border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center p-2 text-center select-none">
                      <span class="text-2xl">${card.icon}</span>
                      <span class="text-[8px] text-cyan-400 font-bold font-mono tracking-wide leading-none mt-1 uppercase">${card.name}</span>
                    </div>

                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;

      renderIcons();

      // Attach Click Event Listeners safely
      document.querySelectorAll(".flip-card").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.dataset.id);
          const card = deck.find(c => c.uniqueId === id);

          if (!card || card.flipped || card.matched || selectedCards.length >= 2) return;

          playRetroSound("click");
          card.flipped = true;
          selectedCards.push(id);
          renderGame();

          if (selectedCards.length === 2) {
            moves++;
            const firstCard = deck.find(c => c.uniqueId === selectedCards[0])!;
            const secondCard = deck.find(c => c.uniqueId === selectedCards[1])!;

            if (firstCard.name === secondCard.name) {
              // MATCHED!
              firstCard.matched = true;
              secondCard.matched = true;
              score += 150 * matchStreak;
              matchStreak++;
              playRetroSound("coin");
              selectedCards = [];

              // Check Win condition
              if (deck.every(c => c.matched)) {
                setTimeout(() => {
                  const coinsEarned = 25 + Math.floor(score / 80);
                  const xpEarned = 35 + Math.floor(score / 100);
                  addRewards(xpEarned, coinsEarned, "Memory Card Match");
                }, 600);
              } else {
                renderGame();
              }
            } else {
              // WRONG!
              matchStreak = 1;
              playRetroSound("error");
              setTimeout(() => {
                firstCard.flipped = false;
                secondCard.flipped = false;
                selectedCards = [];
                renderGame();
              }, 900);
            }
          }
        });
      });
    }

    renderGame();
  }

  // -------------------------------------------------------------
  // GAME 3: TKJ SPRINT QUIZ IN-PAGE
  // -------------------------------------------------------------
  function initQuizSprint(p: HTMLElement) {
    let qIdx = 0;
    let correctAnswers = 0;
    let score = 0;
    let secondsLeft = 15;
    let timerInterval: any = null;

    // Shuffle standard questions
    const shuffledQuizzes = [...GAME_QUIZZES].sort(() => Math.random() - 0.5).slice(0, 5);

    function startTimer() {
      clearInterval(timerInterval);
      secondsLeft = 15;
      timerInterval = setInterval(() => {
        secondsLeft--;
        const tSec = document.getElementById("quizTimerSec");
        const tBar = document.getElementById("quizTimerBar");

        if (tSec) tSec.innerText = `${secondsLeft}s`;
        if (tBar) {
          const pct = (secondsLeft / 15) * 100;
          tBar.style.width = `${pct}%`;
          if (pct < 30) {
            tBar.className = "bg-rose-500 h-full absolute left-0 top-0 transition-all duration-1000";
          }
        }

        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          evaluateChoice(-1); // Overtime
        }
      }, 1000);
    }

    function evaluateChoice(choiceIdx: number) {
      clearInterval(timerInterval);
      const q = shuffledQuizzes[qIdx];
      const isCorrect = choiceIdx === q.answer;

      if (isCorrect) {
        correctAnswers++;
        score += 100 + (secondsLeft * 10);
        playRetroSound("success");
      } else {
        playRetroSound("error");
      }

      // Render Feedback Screen inside playground
      p.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto font-sans text-center">
          <div class="inline-flex p-4 rounded-full ${isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border ${isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20'} animate-bounce mt-4">
            <i data-lucide="${isCorrect ? 'check-circle' : 'alert-triangle'}" class="w-10 h-10"></i>
          </div>

          <div class="space-y-1">
            <h3 class="text-lg font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}">
              ${isCorrect ? 'Jawaban Benar! 🎉' : choiceIdx === -1 ? 'Waktu Habis! ⏰' : 'Jawaban Salah! ❌'}
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              ${isCorrect ? `Kamu cepat! Tambahan poin kecepatan: <strong>+${secondsLeft * 10}</strong>` : `Jawaban yang benar adalah: <strong class="text-emerald-400">${q.options[q.answer]}</strong>`}
            </p>
          </div>

          <div class="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-xs text-left text-slate-300">
            <strong>Penjelasan Singkat:</strong> Perangkat dan protokol konfigurasi jaringan harus dioperasikan sesuai standar ISO & Vendor yang bersangkutan agar tidak terjadi kesalahan loopback atau tabrakan data (collision).
          </div>

          <button id="nextQuizBtn" class="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-colors w-full mt-2">
            ${qIdx < shuffledQuizzes.length - 1 ? 'Lanjut Soal Berikutnya' : 'Lihat Hasil Sprint'}
          </button>
        </div>
      `;

      renderIcons();

      const nextBtn = document.getElementById("nextQuizBtn");
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          playRetroSound("click");
          if (qIdx < shuffledQuizzes.length - 1) {
            qIdx++;
            renderRound();
          } else {
            // End Game!
            const finalCoins = 10 + Math.floor(score / 50);
            const finalXp = 20 + Math.floor(score / 40);
            addRewards(finalXp, finalCoins, `TKJ Sprint Quiz (${correctAnswers}/${shuffledQuizzes.length} Benar)`);
          }
        });
      }
    }

    function renderRound() {
      const q = shuffledQuizzes[qIdx];
      p.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto font-sans">
          <div class="text-center space-y-1">
            <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Soal ${qIdx + 1}/${shuffledQuizzes.length}</h2>
            <div class="flex items-center justify-between text-xs font-mono pt-1">
              <span class="text-slate-500">Poin: ${score}</span>
              <span class="text-amber-400 font-bold flex items-center gap-1">
                <i data-lucide="timer" class="w-3.5 h-3.5"></i> <span id="quizTimerSec">15s</span>
              </span>
            </div>
            <!-- Timer Bar -->
            <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden relative mt-1">
              <div id="quizTimerBar" class="bg-cyan-500 h-full absolute left-0 top-0 transition-all duration-1000" style="width: 100%"></div>
            </div>
          </div>

          <!-- Question Prompt -->
          <div class="p-6 bg-slate-950/60 border border-slate-850 rounded-2xl text-center text-sm font-bold text-white shadow-lg">
            ${q.q}
          </div>

          <!-- Answer options -->
          <div class="grid grid-cols-1 gap-2.5">
            ${q.options.map((opt, oIdx) => `
              <button class="quiz-opt-btn w-full p-4 text-left bg-slate-900 border border-slate-800 rounded-2xl text-xs hover:border-cyan-500 hover:bg-slate-900/60 transition-all cursor-pointer font-medium flex items-center gap-3 text-slate-300 hover:text-white" data-idx="${oIdx}">
                <span class="w-5 h-5 rounded-lg bg-slate-950 text-[10px] font-bold text-cyan-400 border border-slate-800 flex items-center justify-center font-mono">${String.fromCharCode(65 + oIdx)}</span>
                ${opt}
              </button>
            `).join("")}
          </div>
        </div>
      `;

      renderIcons();
      startTimer();

      document.querySelectorAll(".quiz-opt-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          evaluateChoice(idx);
        });
      });
    }

    renderRound();
  }

  // -------------------------------------------------------------
  // GAME 4: LUCKY SPIN WHEEL INTERACTIVE CANVAS
  // -------------------------------------------------------------
  function initSpinWheel(p: HTMLElement) {
    const lastSpinKey = `last_spin_${userSession.uid}`;
    const todayStr = new Date().toDateString();
    const alreadySpun = localStorage.getItem(lastSpinKey) === todayStr;

    p.innerHTML = `
      <div class="space-y-6 max-w-xl mx-auto font-sans text-center">
        <div class="space-y-1">
          <h2 class="text-base font-bold text-white">🎡 Lucky Spin Roda Keberuntungan</h2>
          <p class="text-xs text-slate-400">Putar roda harian secara interaktif untuk klaim hadiah koin gratis!</p>
        </div>

        <!-- Spin Area Container -->
        <div class="relative w-72 h-72 mx-auto flex items-center justify-center pt-2">
          <!-- Outer Ring Decor -->
          <div class="absolute w-[290px] h-[290px] rounded-full border-4 border-dashed border-cyan-500/20 animate-[spin_60s_linear_infinite]"></div>
          
          <!-- Canvas Wheel -->
          <canvas id="wheelCanvas" width="280" height="280" class="rounded-full shadow-[0_0_20px_rgba(6,182,212,0.15)]"></canvas>
          
          <!-- Pointer Arrow Fixed -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-rose-500 drop-shadow-md z-20"></div>
          
          <!-- Center Pin Decor -->
          <div class="absolute w-8 h-8 rounded-full bg-slate-950 border-4 border-cyan-400 flex items-center justify-center shadow-lg z-10">
            <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
          </div>
        </div>

        <!-- Wheel Controls -->
        <div class="space-y-2 pt-2">
          ${alreadySpun ? `
            <div class="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-500"></i> Mode Hiburan: Anda telah mengambil jatah hari ini
            </div>
            <button id="spinBtn" class="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl text-xs font-extrabold cursor-pointer transition-colors w-full shadow-lg shadow-cyan-500/10">
              Putar Gratis (Tanpa Hadiah) 🌀
            </button>
          ` : `
            <button id="spinBtn" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-extrabold cursor-pointer transition-colors w-full shadow-lg shadow-emerald-500/10">
              🎯 TARIK TUAS PUTAR RODA!
            </button>
          `}
        </div>
      </div>
    `;

    renderIcons();

    // Canvas drawing logic
    const canvas = document.getElementById("wheelCanvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const sectors = [
      { text: "15 Koin", color: "#1e1b4b", val: 15, isCoin: true },
      { text: "20 XP", color: "#064e3b", val: 20, isCoin: false },
      { text: "30 Koin", color: "#311042", val: 30, isCoin: true },
      { text: "35 XP", color: "#581c87", val: 35, isCoin: false },
      { text: "50 Koin", color: "#0f172a", val: 50, isCoin: true },
      { text: "Jackpot 🌟", color: "#854d0e", val: 100, isCoin: true },
      { text: "5 Koin", color: "#111827", val: 5, isCoin: true },
      { text: "Zonk 💨", color: "#450a0a", val: 0, isCoin: true }
    ];

    const numSectors = sectors.length;
    const arc = 2 * Math.PI / numSectors;
    let angle = 0;

    function drawWheel() {
      ctx.clearRect(0, 0, 280, 280);
      const cx = 140;
      const cy = 140;
      const r = 135;

      for (let i = 0; i < numSectors; i++) {
        const sectAngle = angle + i * arc;
        ctx.fillStyle = sectors[i].color;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, sectAngle, sectAngle + arc);
        ctx.closePath();
        ctx.fill();

        // White border line
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label rotation & drawing
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(sectAngle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(sectors[i].text, r - 15, 3);
        ctx.restore();
      }
    }

    drawWheel();

    // Spinning math animation
    let isSpinning = false;
    const spinBtn = document.getElementById("spinBtn")!;

    spinBtn.addEventListener("click", () => {
      if (isSpinning) return;
      isSpinning = true;
      spinBtn.setAttribute("disabled", "true");
      spinBtn.className = "px-6 py-3 bg-slate-800 text-slate-500 rounded-2xl text-xs font-bold cursor-not-allowed w-full";

      // Set rotating parameters
      const totalRotation = Math.PI * 10 + Math.random() * Math.PI * 2;
      let curVel = 0.35 + Math.random() * 0.15;
      const decelerate = 0.0035;

      let tickTrack = 0;

      function animate() {
        if (curVel <= 0) {
          // Completed!
          isSpinning = false;
          evaluatePrize();
          return;
        }

        angle += curVel;
        curVel -= decelerate;

        // Sound effect click on sector pass
        tickTrack += curVel;
        if (tickTrack >= arc) {
          playRetroSound("tick");
          tickTrack %= arc;
        }

        drawWheel();
        requestAnimationFrame(animate);
      }

      function evaluatePrize() {
        // Pointer is at -Math.PI / 2 (top center)
        // Find which index is pointing there
        const normAngle = (2 * Math.PI - (angle % (2 * Math.PI))) % (2 * Math.PI);
        const pointingIdx = Math.floor((normAngle + Math.PI / 2) % (2 * Math.PI) / arc);
        const won = sectors[pointingIdx];

        if (alreadySpun) {
          playRetroSound("success");
          Swal.fire({
            title: "Simulasi Putaran Selesai 🎡",
            text: `Kamu mendapatkan ${won.text}! (Mode uji coba gratis: Hadiah tidak ditambahkan ke profil asli)`,
            background: "#0f172a",
            color: "#f8fafc",
            confirmButtonText: "Keren!",
            confirmButtonColor: "#06b6d4"
          }).then(() => {
            activeGame = null;
            renderUI();
          });
        } else {
          // Real awards logic
          localStorage.setItem(lastSpinKey, todayStr);
          if (won.val > 0) {
            if (won.isCoin) {
              addRewards(15, won.val, `Lucky Spin (${won.text})`);
            } else {
              addRewards(won.val, 10, `Lucky Spin (${won.text})`);
            }
          } else {
            playRetroSound("error");
            Swal.fire({
              title: "Waduh, Zonk! 💨",
              text: "Roda berhenti di zona hampa udara. Coba lagi keberuntunganmu besok ya!",
              background: "#0f172a",
              color: "#f8fafc",
              confirmButtonText: "Selesai",
              confirmButtonColor: "#ef4444"
            }).then(() => {
              activeGame = null;
              renderUI();
            });
          }
        }
      }

      animate();
    });
  }

  loadGameProfile();
}
