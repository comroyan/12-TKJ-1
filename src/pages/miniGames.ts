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
  { id: "av_ai_hacker", name: "AI Cybernetist Hacker Avatar", cost: 400, type: "avatar", preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&h=120&fit=crop" },
  { id: "av_datacenter", name: "NOC Data Center Master Avatar", cost: 650, type: "avatar", preview: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=120&h=120&fit=crop" },
  { id: "fr_neon", name: "Cyberpunk Neon Frame", cost: 150, type: "frame", preview: "ring-4 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]" },
  { id: "fr_matrix", name: "Matrix Green Rain Frame", cost: 250, type: "frame", preview: "ring-4 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse" },
  { id: "fr_gold", name: "Golden Network Master Frame", cost: 300, type: "frame", preview: "ring-4 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]" },
  { id: "fr_solar", name: "Solar Plasma Flare Frame", cost: 500, type: "frame", preview: "ring-4 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)]" },
  { id: "fr_dark_matter", name: "Dark Matter Eclipse Frame", cost: 750, type: "frame", preview: "ring-4 ring-purple-600 shadow-[0_0_25px_rgba(147,51,234,0.9)] animate-pulse" },
  { id: "bd_ping", name: "⚡ Ping Master 1ms Badge", cost: 300, type: "badge", preview: "⚡ Ping Master" },
  { id: "bd_genius", name: "🧠 Genius TKJ Badge", cost: 400, type: "badge", preview: "🧠 Genius TKJ" },
  { id: "bd_legend", name: "👑 Sysadmin Legend Badge", cost: 600, type: "badge", preview: "👑 Sysadmin Legend" },
  { id: "bd_linus", name: "🐧 Linux Kernel Contributor Badge", cost: 700, type: "badge", preview: "🐧 Kernel Contributor" },
  { id: "bd_godmode", name: "👑 Network Overlord Badge", cost: 999, type: "badge", preview: "👑 Network Overlord" }
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
  let activeGame: "cable" | "memory" | "quiz" | "spin" | "subnetting" | "port_defense" | "terminal_hacker" | null = null;

  const isKetuaKelas = userSession.role === "Super Admin" || 
                       userSession.role === "Ketua Kelas" || 
                       userSession.jabatan === "Ketua Kelas" ||
                       userSession.role === "Guru" ||
                       (userSession.jabatan && userSession.jabatan.toLowerCase().includes("ketua"));

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
            
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base font-bold text-white">${userSession.name}</h2>
                <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">Rank XII TKJ 1</span>
              </div>
              
              <!-- Badges Cabinet (Immediate Visual feedback) -->
              <div class="flex flex-wrap gap-1">
                ${badges.map(b => `
                  <span class="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-950/60 text-amber-400 font-mono border border-slate-800 flex items-center gap-1">
                    <span class="w-1 h-1 rounded-full bg-amber-400"></span> ${b}
                  </span>
                `).join("")}
              </div>

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
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                <!-- Game 5: IP Subnetting Speedrun -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-blue-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl">
                      <i data-lucide="network" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">IP Subnetting Speedrun</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Uji kecepatan menghitung IP Subnetting, Network, Broadcast, dan jumlah Host secara akurat berpacu dengan waktu!</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="subnetting">
                    Mulai Speedrun
                  </button>
                </div>

                <!-- Game 6: Cyber Port Defense -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-rose-500/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl">
                      <i data-lucide="shield-alert" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">Cyber Port Defense</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Lindungi server sekolah dari ancaman siber! Blokir serangan dengan mencocokkan protokol jaringan ke port firewall yang tepat.</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="port_defense">
                    Pertahankan Firewall
                  </button>
                </div>

                <!-- Game 7: Linux Terminal Hacker -->
                <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-emerald-400/30 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">
                      <i data-lucide="terminal" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white">Linux Terminal Hacker</h3>
                    <p class="text-[11px] text-slate-400 leading-relaxed">Jadilah hacker handal! Selesaikan misi administrasi server Linux dengan mengetikkan perintah-perintah CMD jaringan secara presisi.</p>
                  </div>
                  <button class="launch-game-btn w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer" data-game="terminal_hacker">
                    Akses Terminal 💻
                  </button>
                </div>
              </div>
            ` : ""}

            <!-- TAB: SHOP & INVENTORY -->
            ${activeTab === 'shop' ? `
              <div class="space-y-8">
                
                <!-- SECTION 1: MY INVENTORY (Lemari Profil Saya) -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <i data-lucide="package" class="w-4 h-4"></i>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-white uppercase tracking-wider">📦 Lemari Profil Saya (Inventaris)</h3>
                      <p class="text-[10px] text-slate-400">Gunakan dan kelola item-item yang sudah kamu beli agar langsung terpasang di profilmu</p>
                    </div>
                  </div>

                  ${(() => {
                    const ownedItems = SHOP_ITEMS.filter(item => inventory.includes(item.id));
                    if (ownedItems.length === 0) {
                      return `
                        <div class="p-6 bg-slate-900/10 border border-slate-850 rounded-2xl text-center space-y-1.5 max-w-sm">
                          <h4 class="text-xs font-bold text-slate-300">Inventarismu Masih Kosong 📦</h4>
                          <p class="text-[10px] text-slate-500 leading-relaxed">
                            Ayo kumpulkan koin emas dengan memenangkan mini-games di menu "Main Games" lalu beli item pertamamu di bawah ini!
                          </p>
                        </div>
                      `;
                    }

                    return `
                      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        ${ownedItems.map(item => {
                          const isEquipped = (item.type === "avatar" && equippedAvatar === item.preview) || 
                                             (item.type === "frame" && equippedFrame === item.preview);

                          return `
                            <div class="p-4 glass rounded-2xl flex flex-col justify-between border border-emerald-500/10 bg-slate-950/30 hover:border-emerald-500/30 transition-all relative">
                              <span class="absolute top-2 right-2 text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono px-1.5 py-0.5 rounded-full uppercase">Owned</span>
                              <div class="text-center space-y-2 pt-2">
                                ${item.type === 'avatar' ? `
                                  <div class="relative w-12 h-12 mx-auto">
                                    <img src="${item.preview}" class="w-12 h-12 rounded-full border border-slate-800 object-cover">
                                  </div>
                                ` : item.type === 'frame' ? `
                                  <div class="w-12 h-12 rounded-lg mx-auto bg-slate-900 flex items-center justify-center border border-slate-800 ${item.preview}">
                                    <span class="text-[8px] text-cyan-400 font-mono font-bold">FRAME</span>
                                  </div>
                                ` : `
                                  <div class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[9px] text-cyan-400 font-mono font-bold inline-block">
                                    ${item.preview}
                                  </div>
                                `}
                                
                                <div>
                                  <h4 class="font-bold text-slate-100 text-xs leading-tight">${item.name}</h4>
                                  <span class="text-[8px] text-slate-500 block uppercase font-mono mt-0.5">${item.type}</span>
                                </div>
                              </div>

                              <div class="mt-4 pt-2.5 border-t border-slate-850/80">
                                ${item.type !== "badge" ? `
                                  <button class="equip-item-btn w-full py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${isEquipped ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'}" data-id="${item.id}" data-type="${item.type}" data-preview="${item.preview}">
                                    ${isEquipped ? '✓ Sedang Dipakai' : 'Pasang di Profil'}
                                  </button>
                                ` : `
                                  <button class="w-full py-1.5 rounded-xl text-[10px] font-bold bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-850" disabled>
                                    Badge Selalu Aktif
                                  </button>
                                `}
                              </div>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    `;
                  })()}
                </div>

                <!-- SECTION 2: SHOP CATALOG (Belanja Item Baru) -->
                <div class="space-y-4 pt-6 border-t border-slate-850">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                      </div>
                      <div>
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">🛒 Katalog Toko Koin</h3>
                        <p class="text-[10px] text-slate-400">Tukarkan koin emasmu dengan berbagai item kosmetik eksklusif</p>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${SHOP_ITEMS.map(item => {
                      const owned = inventory.includes(item.id);
                      if (owned) return ""; // Only show unowned items in the shop catalog to keep it clean!

                      return `
                        <div class="p-4 glass rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-cyan-500/10 transition-all bg-slate-950/20">
                          <div class="text-center space-y-2.5">
                            ${item.type === 'avatar' ? `
                              <div class="relative w-12 h-12 mx-auto">
                                <img src="${item.preview}" class="w-12 h-12 rounded-full border border-slate-800 object-cover">
                              </div>
                            ` : item.type === 'frame' ? `
                              <div class="w-12 h-12 rounded-lg mx-auto bg-slate-900 flex items-center justify-center border border-slate-850 ${item.preview}">
                                <span class="text-[8px] text-cyan-400 font-mono font-bold">FRAME</span>
                              </div>
                            ` : `
                              <div class="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 font-bold text-[9px] text-cyan-400 inline-block font-mono">
                                ${item.preview}
                              </div>
                            `}
                            
                            <div>
                              <h4 class="font-bold text-slate-100 text-xs leading-snug">${item.name}</h4>
                              <span class="text-[8px] text-slate-500 block uppercase font-mono mt-0.5">${item.type}</span>
                            </div>
                          </div>

                          <div class="mt-4 pt-3 border-t border-slate-850/80 flex flex-col gap-2">
                            <div class="flex items-center justify-between">
                              <span class="text-xs text-yellow-400 font-bold font-mono">🪙 ${item.cost} Koin</span>
                            </div>

                            <button class="buy-item-btn w-full py-1.5 rounded-xl text-[10px] font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer" data-id="${item.id}">
                              Beli Item
                            </button>
                          </div>
                        </div>
                      `;
                    }).join("")}

                    ${SHOP_ITEMS.filter(item => !inventory.includes(item.id)).length === 0 ? `
                      <div class="col-span-full p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center">
                        <span class="text-2xl block mb-1">🎉</span>
                        <h4 class="text-xs font-bold text-emerald-400">Semua Item Sukses Dibeli!</h4>
                        <p class="text-[10px] text-slate-500">Kamu telah memborong seluruh koleksi di Toko Koin.</p>
                      </div>
                    ` : ""}
                  </div>
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
                        ${isKetuaKelas ? `<th class="p-3 text-right">Aksi</th>` : ""}
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-850" id="leaderboardRows">
                      <tr>
                        <td colspan="${isKetuaKelas ? 5 : 4}" class="p-8 text-center text-slate-500 font-mono">Memuat data peringkat...</td>
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
      rowsContainer.innerHTML = snap.docs.map(docSnap => {
        index++;
        const data = docSnap.data();
        const badgeIcon = index === 1 ? "🥇" : index === 2 ? "🥈" : index === 3 ? "🥉" : `${index}`;
        
        let displayBadge = "";
        if (data.badges && data.badges.length > 0) {
          // Use latest custom badge or fallback
          const b = data.badges.filter((x: string) => x.includes("Genius") || x.includes("Legend") || x.includes("Overlord") || x.includes("Contributor") || x.includes("Master"));
          displayBadge = b.length > 0 ? b[b.length - 1] : data.badges[0];
        }

        return `
          <tr class="hover:bg-slate-900/40 transition-all">
            <td class="p-3 font-bold font-mono text-slate-400">${badgeIcon}</td>
            <td class="p-3">
              <div class="flex items-center gap-2">
                <div class="relative w-7 h-7 flex-shrink-0">
                  <img src="${data.equippedAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop'}" class="w-7 h-7 rounded-full object-cover border border-slate-800 ${data.equippedFrame || ''}">
                </div>
                <div class="flex flex-col">
                  <span class="font-bold text-slate-100">${data.name}</span>
                  ${displayBadge ? `<span class="text-[9px] text-amber-400 font-mono">${displayBadge}</span>` : ""}
                </div>
              </div>
            </td>
            <td class="p-3 font-mono text-cyan-400 font-bold">${data.level || 1}</td>
            <td class="p-3 font-mono text-slate-200 font-extrabold">${data.xp || 0} XP</td>
            ${isKetuaKelas ? `
              <td class="p-3 text-right">
                <button class="reset-player-btn p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]" data-uid="${docSnap.id}" data-name="${data.name || 'Siswa'}">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> Reset
                </button>
              </td>
            ` : ""}
          </tr>
        `;
      }).join("");

      renderIcons();

      if (isKetuaKelas) {
        rowsContainer.querySelectorAll(".reset-player-btn").forEach((btn: any) => {
          btn.addEventListener("click", async () => {
            playRetroSound("click");
            const targetUid = btn.dataset.uid;
            const targetName = btn.dataset.name;

            const confirm = await confirmDialog(
              "Reset Skor Siswa",
              `Apakah Anda yakin ingin me-reset skor game ${targetName}? Semua XP, Koin, Level, dan Item Toko milik siswa ini akan dikembalikan ke awal.`
            );

            if (confirm) {
              try {
                // Perform the reset in Firestore
                await setDoc(doc(db, "gameData", targetUid), {
                  uid: targetUid,
                  name: targetName,
                  xp: 10,
                  coins: 50,
                  level: 1,
                  badges: ["⚡ Pemula TKJ"],
                  inventory: [],
                  equippedAvatar: "",
                  equippedFrame: "",
                  updatedAt: new Date()
                });

                playRetroSound("success");
                toast.success(`Skor ${targetName} berhasil di-reset!`);
                
                // If it was the logged in user, refresh their local state too
                if (targetUid === userSession.uid) {
                  xp = 10;
                  coins = 50;
                  level = 1;
                  badges = ["⚡ Pemula TKJ"];
                  inventory = [];
                  equippedAvatar = "";
                  equippedFrame = "";
                }

                renderUI().then(() => {
                  loadLeaderboard();
                });
              } catch (e: any) {
                toast.error(`Gagal me-reset: ${e.message}`);
              }
            }
          });
        });
      }
    } catch (e) {
      rowsContainer.innerHTML = `<tr><td colspan="${isKetuaKelas ? 5 : 4}" class="p-4 text-center text-red-400">Gagal memuat: ${(e as any).message}</td></tr>`;
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
    } else if (activeGame === "subnetting") {
      initSubnettingGame(playground);
    } else if (activeGame === "port_defense") {
      initPortDefenseGame(playground);
    } else if (activeGame === "terminal_hacker") {
      initTerminalHackerGame(playground);
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

  // -------------------------------------------------------------
  // GAME 5: IP SUBNETTING SPEEDRUN
  // -------------------------------------------------------------
  function initSubnettingGame(p: HTMLElement) {
    let timer: any = null;
    let timeLeft = 45;
    let score = 0;
    let correctCount = 0;
    let combo = 0;
    let maxCombo = 0;
    let currentQuestion: {
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    } | null = null;
    let gameActive = false;

    function generateQuestion() {
      const qType = Math.floor(Math.random() * 5);
      
      const cidrs = [24, 25, 26, 27, 28, 29, 30];
      const cidr = cidrs[Math.floor(Math.random() * cidrs.length)];
      
      const masks: Record<number, string> = {
        24: "255.255.255.0",
        25: "255.255.255.128",
        26: "255.255.255.192",
        27: "255.255.255.224",
        28: "255.255.255.240",
        29: "255.255.255.248",
        30: "255.255.255.252"
      };

      const usableHosts: Record<number, number> = {
        24: 254,
        25: 126,
        26: 62,
        27: 30,
        28: 14,
        29: 6,
        30: 2
      };

      const blockSizes: Record<number, number> = {
        24: 256,
        25: 128,
        26: 64,
        27: 32,
        28: 16,
        29: 8,
        30: 4
      };

      // Helper function to shuffle options and return the shuffled list with updated correct index
      function shuffleAndGetIndex(opts: string[], correctVal: string): { shuffled: string[], index: number } {
        const shuffled = [...opts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return {
          shuffled,
          index: shuffled.indexOf(correctVal)
        };
      }

      if (qType === 0) {
        const correctMask = masks[cidr];
        const optionsSet = new Set<string>([correctMask]);
        while (optionsSet.size < 4) {
          const fakeCidr = cidrs[Math.floor(Math.random() * cidrs.length)];
          optionsSet.add(masks[fakeCidr]);
        }
        const options = Array.from(optionsSet);
        const { shuffled, index } = shuffleAndGetIndex(options, correctMask);

        return {
          question: `Berapakah subnet mask default untuk prefix CIDR <strong>/${cidr}</strong>?`,
          options: shuffled,
          answerIndex: index,
          explanation: `Prefix /${cidr} bernilai ${correctMask}`
        };
      } else if (qType === 1) {
        const correctHosts = usableHosts[cidr];
        const optionsSet = new Set<string>([correctHosts.toString()]);
        while (optionsSet.size < 4) {
          const fakeHosts = usableHosts[cidrs[Math.floor(Math.random() * cidrs.length)]];
          optionsSet.add(fakeHosts.toString());
        }
        const options = Array.from(optionsSet);
        const { shuffled, index } = shuffleAndGetIndex(options, correctHosts.toString());

        return {
          question: `Berapa jumlah IP host yang dapat digunakan (usable hosts) pada prefix CIDR <strong>/${cidr}</strong>?`,
          options: shuffled,
          answerIndex: index,
          explanation: `Host usable = 2^(32 - ${cidr}) - 2 = ${correctHosts} host.`
        };
      } else if (qType === 2) {
        const subnetsCount = Math.pow(2, cidr - 24);
        const optionsSet = new Set<string>([subnetsCount.toString()]);
        while (optionsSet.size < 4) {
          const fakeCidr = cidrs[Math.floor(Math.random() * cidrs.length)];
          const fakeSubnets = Math.pow(2, fakeCidr - 24);
          optionsSet.add(fakeSubnets.toString());
        }
        const options = Array.from(optionsSet);
        const { shuffled, index } = shuffleAndGetIndex(options, subnetsCount.toString());

        return {
          question: `Berapa jumlah subnet Class C yang terbentuk dari pembagian prefix CIDR <strong>/${cidr}</strong>?`,
          options: shuffled,
          answerIndex: index,
          explanation: `Subnet terbentuk = 2^(${cidr} - 24) = ${subnetsCount} subnet.`
        };
      } else if (qType === 3) {
        const testCidrs = [26, 27, 28, 29, 30];
        const activeCidr = testCidrs[Math.floor(Math.random() * testCidrs.length)];
        const bSize = blockSizes[activeCidr];
        const hostOctet = Math.floor(Math.random() * 254) + 1;
        const netOctet = Math.floor(hostOctet / bSize) * bSize;
        
        const correctNet = `192.168.1.${netOctet}`;
        const optionsSet = new Set<string>([correctNet]);
        while (optionsSet.size < 4) {
          const fakeNetOctet = Math.floor(Math.random() * 254) + 1;
          const roundedFake = Math.floor(fakeNetOctet / bSize) * bSize;
          optionsSet.add(`192.168.1.${roundedFake}`);
        }
        if (optionsSet.size < 4) {
          optionsSet.add(`192.168.1.0`);
          optionsSet.add(`192.168.1.128`);
          optionsSet.add(`192.168.1.64`);
          optionsSet.add(`192.168.1.192`);
        }
        const options = Array.from(optionsSet).slice(0, 4);
        const { shuffled, index } = shuffleAndGetIndex(options, correctNet);

        return {
          question: `Tentukan Network Address dari host dengan alamat IP <strong>192.168.1.${hostOctet}/${activeCidr}</strong>!`,
          options: shuffled,
          answerIndex: index,
          explanation: `Ukuran blok = ${bSize}. Kelipatan terkecil terdekat dari ${hostOctet} adalah ${netOctet}.`
        };
      } else {
        const testCidrs = [26, 27, 28, 29, 30];
        const activeCidr = testCidrs[Math.floor(Math.random() * testCidrs.length)];
        const bSize = blockSizes[activeCidr];
        const hostOctet = Math.floor(Math.random() * 254) + 1;
        const netOctet = Math.floor(hostOctet / bSize) * bSize;
        const correctBroadcast = `192.168.1.${netOctet + bSize - 1}`;
        
        const optionsSet = new Set<string>([correctBroadcast]);
        while (optionsSet.size < 4) {
          const fakeNet = Math.floor(Math.random() * 254) + 1;
          const roundedFake = Math.floor(fakeNet / bSize) * bSize;
          optionsSet.add(`192.168.1.${roundedFake + bSize - 1}`);
        }
        if (optionsSet.size < 4) {
          optionsSet.add(`192.168.1.63`);
          optionsSet.add(`192.168.1.127`);
          optionsSet.add(`192.168.1.191`);
          optionsSet.add(`192.168.1.255`);
        }
        const options = Array.from(optionsSet).slice(0, 4);
        const { shuffled, index } = shuffleAndGetIndex(options, correctBroadcast);

        return {
          question: `Tentukan Broadcast Address dari host dengan alamat IP <strong>192.168.1.${hostOctet}/${activeCidr}</strong>!`,
          options: shuffled,
          answerIndex: index,
          explanation: `Network = ${netOctet}, Blok = ${bSize}. Broadcast = Network + Blok - 1 = ${netOctet + bSize - 1}`
        };
      }
    }

    function renderIntro() {
      p.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto font-sans text-center py-6">
          <div class="space-y-2">
            <div class="inline-flex p-4 bg-blue-500/10 text-blue-400 rounded-3xl animate-bounce">
              <i data-lucide="network" class="w-10 h-10"></i>
            </div>
            <h2 class="text-xl font-extrabold text-white font-sans tracking-tight">⚡ IP Subnetting Speedrun Challenge</h2>
            <p class="text-xs text-slate-400 leading-relaxed max-w-md mx-auto font-sans">
              Jawablah pertanyaan subnetting secepat dan seakurat mungkin dalam waktu <strong>45 detik</strong>. Dapatkan bonus koin, XP, dan pecahkan rekor kelas!
            </p>
          </div>

          <div class="p-5 bg-slate-950/50 border border-slate-850 rounded-2xl text-left space-y-3">
            <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <i data-lucide="shield-alert" class="w-4 h-4 text-amber-500"></i> Aturan Main:
            </h3>
            <ul class="text-xs text-slate-400 space-y-1.5 list-disc pl-4 font-sans">
              <li>Mulai dengan jatah waktu <strong class="text-white">45 Detik</strong>.</li>
              <li>Jawaban <strong class="text-emerald-400">BENAR</strong>: <span class="text-emerald-400">+10 poin</span> x Combo Multiplier + <span class="text-cyan-400">Bonus Waktu +2s!</span></li>
              <li>Jawaban <strong class="text-rose-400">SALAH</strong>: <span class="text-rose-400">Penalti Waktu -5s</span> & Combo pecah kembali ke x0.</li>
              <li>Selesaikan tantangan untuk mendapatkan Koin Emas & XP nyata!</li>
            </ul>
          </div>

          <button id="startSpeedrunBtn" class="px-8 py-3.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all cursor-pointer w-full shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2">
            <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i> MULAI SPEEDRUN SEKARANG
          </button>
        </div>
      `;

      renderIcons();

      const startBtn = document.getElementById("startSpeedrunBtn");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          playRetroSound("click");
          startGame();
        });
      }
    }

    function startGame() {
      gameActive = true;
      score = 0;
      timeLeft = 45;
      correctCount = 0;
      combo = 0;
      maxCombo = 0;
      loadNextQuestion();
      
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (!gameActive) {
          clearInterval(timer);
          return;
        }

        timeLeft--;
        updateTimerUI();

        if (timeLeft <= 0) {
          clearInterval(timer);
          endGame();
        } else {
          if (timeLeft <= 10) {
            playRetroSound("tick");
          }
        }
      }, 1000);
    }

    function updateTimerUI() {
      const bar = document.getElementById("subnetTimerBar");
      const text = document.getElementById("subnetTimerText");
      if (bar && text) {
        text.innerText = `${timeLeft}s`;
        const percentage = Math.max(0, Math.min(100, (timeLeft / 45) * 100));
        bar.style.width = `${percentage}%`;
        
        if (timeLeft <= 10) {
          bar.className = "bg-rose-500 h-full absolute left-0 top-0 transition-all duration-300 animate-pulse";
          text.className = "text-rose-400 font-extrabold animate-pulse";
        } else {
          bar.className = "bg-blue-500 h-full absolute left-0 top-0 transition-all duration-300";
          text.className = "text-slate-300 font-bold";
        }
      }
    }

    function loadNextQuestion() {
      currentQuestion = generateQuestion();
      renderQuestionUI();
    }

    function renderQuestionUI() {
      if (!currentQuestion) return;

      p.innerHTML = `
        <div class="space-y-6 max-w-xl mx-auto font-sans">
          
          <div class="grid grid-cols-3 items-center gap-4 p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-xs font-mono">
            <div class="text-left">
              <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Score</span>
              <span class="text-white font-extrabold text-base">${score}</span>
            </div>
            
            <div class="text-center space-y-1">
              <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Waktu</span>
              <div class="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div id="subnetTimerBar" class="bg-blue-500 h-full absolute left-0 top-0 transition-all duration-300" style="width: ${(timeLeft/45)*100}%"></div>
              </div>
              <span id="subnetTimerText" class="text-slate-300 font-bold">${timeLeft}s</span>
            </div>

            <div class="text-right">
              <span class="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Streak</span>
              <span class="text-yellow-400 font-extrabold text-base">x${combo}</span>
            </div>
          </div>

          <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4 relative overflow-hidden shadow-xl">
            <div class="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <span class="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] uppercase tracking-wider font-extrabold border border-blue-500/20 font-mono">
              IP Subnetting Core
            </span>
            <p class="text-base text-slate-100 font-medium leading-relaxed">
              ${currentQuestion.question}
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="subnetOptionsContainer">
            ${currentQuestion.options.map((option, idx) => `
              <button class="subnet-option-btn p-4 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-blue-500/40 text-slate-300 hover:text-white rounded-2xl text-xs font-semibold text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]" data-index="${idx}">
                <span>${option}</span>
                <span class="w-5 h-5 rounded-lg bg-slate-900 border border-slate-880 text-slate-500 text-[10px] flex items-center justify-center font-bold uppercase group-hover:border-blue-500/30 group-hover:text-blue-400">
                  ${String.fromCharCode(65 + idx)}
                </span>
              </button>
            `).join("")}
          </div>

          <div id="extraTimeFeedback" class="h-6 text-center text-xs font-bold font-mono transition-all opacity-0"></div>
        </div>
      `;

      const btns = p.querySelectorAll(".subnet-option-btn");
      btns.forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const chosenIdx = parseInt(btn.dataset.index);
          evaluateAnswer(chosenIdx, btn);
        });
      });
    }

    function evaluateAnswer(chosen: number, btnElement: HTMLElement) {
      if (!currentQuestion) return;

      const correct = chosen === currentQuestion.answerIndex;
      
      const allBtns = p.querySelectorAll(".subnet-option-btn");
      allBtns.forEach((b: any) => b.setAttribute("disabled", "true"));

      const feedback = document.getElementById("extraTimeFeedback")!;

      if (correct) {
        playRetroSound("success");
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        
        correctCount++;
        const addedScore = 10 * Math.min(5, combo);
        score += addedScore;
        timeLeft += 2;
        
        btnElement.setAttribute("class", "subnet-option-btn p-4 bg-emerald-950/40 border border-emerald-500 text-emerald-400 rounded-2xl text-xs font-semibold text-left transition-all flex items-center justify-between");
        feedback.setAttribute("class", "h-6 text-center text-xs font-bold font-mono text-emerald-400 opacity-100 transition-all");
        feedback.innerHTML = `<span class="animate-bounce inline-block">Benar! +${addedScore} Poin & Waktu +2s (Streak x${combo})</span>`;
      } else {
        playRetroSound("error");
        combo = 0;
        timeLeft = Math.max(0, timeLeft - 5);
        
        btnElement.setAttribute("class", "subnet-option-btn p-4 bg-rose-950/40 border border-rose-500 text-rose-400 rounded-2xl text-xs font-semibold text-left transition-all flex items-center justify-between");
        
        const correctBtn: any = allBtns[currentQuestion.answerIndex];
        if (correctBtn) {
          correctBtn.setAttribute("class", "subnet-option-btn p-4 bg-emerald-950/20 border border-emerald-500/50 text-emerald-400 rounded-2xl text-xs font-semibold text-left transition-all flex items-center justify-between");
        }

        feedback.setAttribute("class", "h-6 text-center text-xs font-bold font-mono text-rose-400 opacity-100 transition-all");
        feedback.innerHTML = `<span class="animate-pulse inline-block">Salah! Penalti Waktu -5s. ${currentQuestion.explanation}</span>`;
      }

      setTimeout(() => {
        if (gameActive) {
          loadNextQuestion();
        }
      }, 1500);
    }

    async function endGame() {
      gameActive = false;
      if (timer) clearInterval(timer);

      const earnedXp = Math.min(50, Math.floor(score / 4) + 10);
      const earnedCoins = Math.min(30, Math.floor(score / 8) + 5);

      if (score > 0) {
        await addRewards(earnedXp, earnedCoins, `IP Subnetting Speedrun (${correctCount} Benar, Max Combo x${maxCombo})`);
      } else {
        Swal.fire({
          icon: "info",
          title: "Waktu Habis! ⌛",
          text: "Kamu belum berhasil mengumpulkan poin. Coba lagi untuk asah kemampuan subnetting kamu!",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonText: "Coba Lagi",
          confirmButtonColor: "#06b6d4"
        }).then(() => {
          activeGame = null;
          renderUI();
        });
      }
    }

    renderIntro();
  }

  // -------------------------------------------------------------
  // GAME 6: CYBER PORT DEFENSE (FIREWALL HERO)
  // -------------------------------------------------------------
  function initPortDefenseGame(p: HTMLElement) {
    const GAME_PROTOCOLS = [
      { name: "HTTP (Hypertext Transfer Protocol)", port: "80", desc: "Permintaan website standar tanpa enkripsi keamanan SSL/TLS.", type: "TRAFFIC" },
      { name: "HTTPS (HTTP Secure)", port: "443", desc: "Permintaan halaman web aman terenkripsi SSL/TLS.", type: "SECURE" },
      { name: "SSH (Secure Shell)", port: "22", desc: "Akses terminal konsol remote secara aman terenkripsi.", type: "SYSTEM" },
      { name: "FTP (File Transfer Protocol)", port: "21", desc: "Koneksi unggah/unduh berkas file antara server & client.", type: "FILE" },
      { name: "DNS (Domain Name System)", port: "53", desc: "Resolusi nama domain website menjadi alamat IP komputer.", type: "ROUTING" },
      { name: "SMTP (Simple Mail Transfer)", port: "25", desc: "Pengiriman pesan surat elektronik email antar mail server.", type: "MAIL" },
      { name: "DHCP Server Protocol", port: "67", desc: "Alokasi alamat IP secara otomatis kepada host client.", type: "BROADCAST" },
      { name: "RDP (Remote Desktop)", port: "3389", desc: "Akses visual desktop jarak jauh sistem operasi Windows.", type: "REMOTE" },
      { name: "Telnet (Unsecure Remote)", port: "23", desc: "Remote terminal lawas dengan transmisi teks biasa.", type: "THREAT" },
      { name: "MySQL Database Query", port: "3306", desc: "Komunikasi data basis data relasional server MySQL.", type: "DATABASE" },
      { name: "POP3 (Post Office Protocol v3)", port: "110", desc: "Mengambil surat email masuk dari server ke client lokal.", type: "MAIL" },
      { name: "IMAP (Mail Service Sync)", port: "143", desc: "Akses dan sinkronisasi email aktif secara multi-device.", type: "MAIL" },
      { name: "NTP (Network Time Protocol)", port: "123", desc: "Sinkronisasi waktu tanggal perangkat router & switch.", type: "SYSTEM" },
      { name: "SNMP (Network Management)", port: "161", desc: "Monitoring status traffic pada device router/switch.", type: "MONITOR" }
    ];

    let score = 0;
    let shields = 3;
    let combo = 0;
    let maxCombo = 0;
    let currentProtocol: any = null;
    let options: string[] = [];
    let gameActive = false;
    let timer: any = null;
    let timeLeft = 100;
    let feedbackText = "";
    let feedbackType: "success" | "error" | "info" = "info";

    function renderIntro() {
      p.innerHTML = `
        <div class="max-w-xl mx-auto p-6 glass rounded-3xl border border-slate-850 space-y-6 text-center animate-fadeIn">
          <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-3xl">
            <i data-lucide="shield-alert" class="w-8 h-8"></i>
          </div>
          
          <div class="space-y-2">
            <h3 class="text-xl font-extrabold text-white">Cyber Port Defense</h3>
            <p class="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Firewall server sekolah dalam bahaya! Lindungi sistem dari ancaman luar dengan mengarahkan paket protokol ke Port TCP/UDP yang benar sebelum penetrasi berhasil.
            </p>
          </div>

          <div class="p-4 bg-slate-950/50 rounded-2xl border border-slate-850/80 text-left space-y-3 font-sans">
            <h4 class="text-xs font-bold text-slate-300 flex items-center gap-1">
              <i data-lucide="info" class="w-3.5 h-3.5 text-rose-400"></i> Panduan Bermain:
            </h4>
            <ul class="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Kamu dibekali <strong class="text-rose-400">3 Shield Pertahanan (HP)</strong>.</li>
              <li>Pilih tombol Port yang tepat sesuai protokol yang muncul di layar.</li>
              <li>Batas waktu berpikir akan bertambah cepat seiring skor kamu bertambah!</li>
              <li>Combo berturut-turut memberikan bonus skor berlipat ganda!</li>
            </ul>
          </div>

          <button id="startDefenseBtn" class="w-full py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-2xl text-xs tracking-wider transition-all cursor-pointer">
            MULAI PERTAHANAN FIREWALL 🛡️
          </button>
        </div>
      `;

      renderIcons();

      const btn = document.getElementById("startDefenseBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          playRetroSound("click");
          startGame();
        });
      }
    }

    function startGame() {
      score = 0;
      shields = 3;
      combo = 0;
      maxCombo = 0;
      gameActive = true;
      feedbackText = "Sistem Firewall Siap! Menunggu paket traffic...";
      feedbackType = "info";
      
      loadNextProtocol();
    }

    function loadNextProtocol() {
      if (!gameActive) return;

      // Select random protocol
      currentProtocol = GAME_PROTOCOLS[Math.floor(Math.random() * GAME_PROTOCOLS.length)];

      // Generate 4 unique options
      const correctPort = currentProtocol.port;
      const optionsSet = new Set<string>([correctPort]);
      
      while (optionsSet.size < 4) {
        const randProto = GAME_PROTOCOLS[Math.floor(Math.random() * GAME_PROTOCOLS.length)];
        optionsSet.add(randProto.port);
      }
      
      options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
      timeLeft = 100;

      renderPlayground();

      // Configure dynamic speed based on score
      const speed = Math.max(30, 100 - Math.floor(score / 5)); // speeds up over time
      
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        timeLeft -= 1.5;
        const progressBar = document.getElementById("threatProgressBar");
        if (progressBar) {
          progressBar.style.width = `${timeLeft}%`;
          if (timeLeft <= 30) {
            progressBar.classList.remove("bg-rose-500");
            progressBar.classList.add("bg-red-600", "animate-pulse");
          }
        }

        if (timeLeft <= 0) {
          clearInterval(timer);
          handleTimeOut();
        }
      }, speed);
    }

    function handleTimeOut() {
      shields -= 1;
      combo = 0;
      playRetroSound("error");
      feedbackText = `🚨 PENETRASI BERHASIL! ${currentProtocol.name} menyusup via Port <strong>${currentProtocol.port}</strong>.`;
      feedbackType = "error";

      if (shields <= 0) {
        endGame();
      } else {
        renderPlayground();
        setTimeout(loadNextProtocol, 1800);
      }
    }

    function checkAnswer(chosenPort: string) {
      if (timer) clearInterval(timer);

      if (chosenPort === currentProtocol.port) {
        combo += 1;
        maxCombo = Math.max(maxCombo, combo);
        const points = 10 + (combo * 2);
        score += points;
        playRetroSound("success");
        feedbackText = `✓ BLOKIR BERHASIL! ${currentProtocol.name} aman di Port <strong>${chosenPort}</strong> (+${points} poin).`;
        feedbackType = "success";
      } else {
        shields -= 1;
        combo = 0;
        playRetroSound("error");
        feedbackText = `❌ SALAH BLOKIR! ${currentProtocol.name} seharusnya berjalan di Port <strong>${currentProtocol.port}</strong>.`;
        feedbackType = "error";
      }

      if (shields <= 0) {
        endGame();
      } else {
        renderPlayground();
        setTimeout(loadNextProtocol, 1800);
      }
    }

    function renderPlayground() {
      // Dynamic color styles for feed
      let feedbackClass = "bg-slate-950/40 text-slate-400 border-slate-850";
      if (feedbackType === "success") {
        feedbackClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      } else if (feedbackType === "error") {
        feedbackClass = "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-bounce";
      }

      const shieldIndicators = Array.from({ length: 3 }).map((_, i) => {
        if (i < shields) {
          return `<i data-lucide="shield" class="w-5 h-5 text-rose-500 fill-rose-500/30"></i>`;
        }
        return `<i data-lucide="shield-off" class="w-5 h-5 text-slate-700"></i>`;
      }).join("");

      p.innerHTML = `
        <div class="max-w-xl mx-auto p-6 glass rounded-3xl border border-slate-850 space-y-6 animate-fadeIn">
          
          <!-- Game Stats Header -->
          <div class="flex items-center justify-between border-b border-slate-850 pb-4">
            <div class="flex items-center gap-1.5 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
              <span class="text-[10px] font-bold text-rose-400 font-mono">SHIELDS:</span>
              <div class="flex items-center gap-1">${shieldIndicators}</div>
            </div>
            
            <div class="text-right space-y-0.5">
              <div class="text-xs text-slate-400 font-mono">Skor: <strong class="text-cyan-400 font-extrabold">${score}</strong></div>
              ${combo > 1 ? `<div class="text-[10px] text-yellow-400 font-mono font-bold">Combo x${combo}!</div>` : ""}
            </div>
          </div>

          <!-- Alert Container representing Incoming Traffic -->
          <div class="relative p-5 bg-slate-950 rounded-2xl border-2 border-dashed border-rose-500/30 overflow-hidden text-center space-y-3">
            <div class="absolute top-0 left-0 h-1 bg-rose-500 transition-all duration-100" id="threatProgressBar" style="width: ${timeLeft}%"></div>
            
            <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-[9px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-widest font-mono">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              ANCAMAN MASUK: ${currentProtocol.type}
            </div>
            
            <h4 class="text-base font-extrabold text-white">${currentProtocol.name}</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">${currentProtocol.desc}</p>
          </div>

          <!-- Options Grid -->
          <div class="grid grid-cols-2 gap-4">
            ${options.map(port => `
              <button class="port-opt-btn p-4 bg-slate-900 hover:bg-slate-850 hover:border-cyan-500/40 text-slate-200 border border-slate-850 rounded-2xl text-center font-mono text-sm font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center gap-1" data-port="${port}">
                <span class="text-[10px] text-slate-500 font-normal font-sans">PORT</span>
                <span class="text-lg text-cyan-400">${port}</span>
              </button>
            `).join("")}
          </div>

          <!-- Terminal Log / Audit Feed -->
          <div class="p-3 rounded-xl border text-[10px] font-mono leading-relaxed text-center ${feedbackClass}">
            ${feedbackText}
          </div>
        </div>
      `;

      renderIcons();

      // Bind buttons click
      p.querySelectorAll(".port-opt-btn").forEach((btn: any) => {
        btn.addEventListener("click", () => {
          const port = btn.dataset.port;
          checkAnswer(port);
        });
      });
    }

    async function endGame() {
      gameActive = false;
      if (timer) clearInterval(timer);

      const earnedXp = Math.min(60, Math.floor(score / 3) + 10);
      const earnedCoins = Math.min(40, Math.floor(score / 6) + 5);

      if (score > 0) {
        await addRewards(earnedXp, earnedCoins, `Cyber Port Defense (${score} Poin, Max Combo x${maxCombo})`);
      } else {
        Swal.fire({
          icon: "error",
          title: "Firewall Bobol! 💥",
          text: "Semua shield pelindung hancur! Latih lagi hafalan Port standar jaringanmu untuk memperkuat firewall server.",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonText: "Coba Lagi",
          confirmButtonColor: "#f43f5e"
        }).then(() => {
          activeGame = null;
          renderUI();
        });
      }
    }

    renderIntro();
  }

  // -------------------------------------------------------------
  // GAME 7: LINUX TERMINAL HACKER
  // -------------------------------------------------------------
  function initTerminalHackerGame(p: HTMLElement) {
    const TERMINAL_MISSIONS = [
      {
        objective: "Periksa koneksi jaringan ke DNS Google di IP 8.8.8.8",
        command: "ping 8.8.8.8",
        help: "Gunakan perintah ping diikuti oleh alamat IP tujuan: 'ping 8.8.8.8'",
        outputs: [
          "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.",
          "64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=14.2 ms",
          "64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=12.1 ms",
          "--- 8.8.8.8 ping statistics ---",
          "2 packets transmitted, 2 received, 0% packet loss, time 1002ms",
          "rtt min/avg/max/mdev = 12.145/13.210/14.275/1.065 ms"
        ]
      },
      {
        objective: "Tampilkan semua alamat IP dan konfigurasi interface jaringan aktif",
        command: "ifconfig",
        aliases: ["ip a", "ip address"],
        help: "Gunakan perintah 'ifconfig' atau 'ip a' untuk melihat adapter jaringan.",
        outputs: [
          "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
          "        inet 192.168.1.105  netmask 255.255.255.0  broadcast 192.168.1.255",
          "        inet6 fe80::a00:27ff:fe8e:d121  prefixlen 64  scopeid 0x20<link>",
          "        ether 08:00:27:8e:d1:21  txqueuelen 1000  (Ethernet)",
          "        RX packets 451203  bytes 29845110 (29.8 MB)",
          "        TX packets 210294  bytes 18290314 (18.2 MB)"
        ]
      },
      {
        objective: "Uji rute perjalanan paket (routing hop) menuju domain google.com",
        command: "traceroute google.com",
        aliases: ["tracert google.com"],
        help: "Gunakan perintah 'traceroute' diikuti domain tujuan.",
        outputs: [
          "traceroute to google.com (142.250.4.138), 30 hops max, 60 byte packets",
          " 1  192.168.1.1 (192.168.1.1)  1.214 ms  1.105 ms  0.995 ms",
          " 2  10.0.0.1 (10.0.0.1)  4.321 ms  4.112 ms  3.905 ms",
          " 3  180.252.12.1 (180.252.12.1)  12.450 ms  14.215 ms  15.110 ms",
          " 4  142.250.4.138 (142.250.4.138)  16.320 ms  15.980 ms  15.850 ms"
        ]
      },
      {
        objective: "Lihat daftar file dalam direktori saat ini",
        command: "ls",
        aliases: ["ls -la", "dir"],
        help: "Ketik perintah 'ls' untuk melihat list berkas dalam folder.",
        outputs: [
          "total 24",
          "drwxr-xr-x  2 root root 4096 Jul 15 22:30 .",
          "drwxr-xr-x 12 root root 4096 Jul 15 22:15 ..",
          "-rw-r--r--  1 root root  421 Jul 15 22:25 config.conf",
          "-rwxr-xr-x  1 root root 1024 Jul 15 22:30 firewall.sh",
          "-rw-r--r--  1 root root 8192 Jul 15 22:28 web_log.txt"
        ]
      },
      {
        objective: "Masuk atau berpindah ke direktori konfigurasi '/etc/network'",
        command: "cd /etc/network",
        help: "Gunakan perintah cd diikuti alamat direktori: 'cd /etc/network'",
        outputs: [
          "Successfully moved directory.",
          "Current directory path: /etc/network"
        ]
      },
      {
        objective: "Tampilkan isi berkas file konfigurasi 'config.conf' di layar",
        command: "cat config.conf",
        help: "Gunakan perintah 'cat config.conf' untuk membaca isi file.",
        outputs: [
          "# ClassHub Web Server Configuration",
          "PORT=80",
          "MAX_CONNECTIONS=1000",
          "SSL_ENABLED=false",
          "FIREWALL_STATUS=active"
        ]
      },
      {
        objective: "Berikan izin eksekusi (executable permission) pada file 'firewall.sh'",
        command: "chmod +x firewall.sh",
        aliases: ["chmod 755 firewall.sh"],
        help: "Ketik perintah: 'chmod +x firewall.sh'",
        outputs: [
          "Permissions updated successfully for 'firewall.sh'.",
          "-rwxr-xr-x 1 root root 1024 Jul 15 22:30 firewall.sh"
        ]
      },
      {
        objective: "Temukan alamat IP dari domain website 'smkn1-net.sch.id' menggunakan DNS resolver",
        command: "nslookup smkn1-net.sch.id",
        aliases: ["dig smkn1-net.sch.id"],
        help: "Gunakan 'nslookup' diikuti nama domain.",
        outputs: [
          "Server:         192.168.1.1",
          "Address:        192.168.1.1#53",
          "",
          "Non-authoritative answer:",
          "Name:   smkn1-net.sch.id",
          "Address: 103.245.10.45"
        ]
      },
      {
        objective: "Hubungkan ke server remote via SSH dengan username 'admin' ke IP '10.0.0.5'",
        command: "ssh admin@10.0.0.5",
        help: "Gunakan perintah: 'ssh admin@10.0.0.5'",
        outputs: [
          "The authenticity of host '10.0.0.5 (10.0.0.5)' can't be established.",
          "Warning: Permanently added '10.0.0.5' (ECDSA) to the list of known hosts.",
          "admin@10.0.0.5's password: ***",
          "Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-generic x86_64)"
        ]
      },
      {
        objective: "Lakukan scanning port terbuka pada IP target '192.168.1.1' menggunakan NMAP",
        command: "nmap 192.168.1.1",
        help: "Gunakan perintah: 'nmap 192.168.1.1'",
        outputs: [
          "Starting Nmap 7.80 ( https://nmap.org ) at 2026-07-16 00:30 UTC",
          "Nmap scan report for 192.168.1.1",
          "Not shown: 996 closed ports",
          "PORT     STATE SERVICE",
          "22/tcp   open  ssh",
          "53/tcp   open  domain",
          "80/tcp   open  http",
          "443/tcp  open  https",
          "Nmap done: 1 IP address (1 host up) scanned in 0.15 seconds"
        ]
      },
      {
        objective: "Unduh file script setup 'http://192.168.1.50/setup.sh' via terminal",
        command: "wget http://192.168.1.50/setup.sh",
        aliases: ["curl -O http://192.168.1.50/setup.sh"],
        help: "Ketik perintah: 'wget http://192.168.1.50/setup.sh'",
        outputs: [
          "--2026-07-16 00:32:15--  http://192.168.1.50/setup.sh",
          "Connecting to 192.168.1.50:80... connected.",
          "HTTP request sent, awaiting response... 200 OK",
          "Length: 2048 (2.0K) [application/x-sh]",
          "Saving to: 'setup.sh'",
          "setup.sh            100%[===================>]   2.00K  --.-KB/s    in 0s      ",
          "2026-07-16 00:32:15 (145 MB/s) - 'setup.sh' saved [2048/2048]"
        ]
      }
    ];

    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let currentMission: any = null;
    let gameActive = false;
    let timer: any = null;
    let timeLeft = 60; // 60 seconds
    let terminalHistory: string[] = [
      "ClassHub OS 2026.07 (tty1) - Powered by Linux Kernel",
      "Welcome to ClassHub Secure Shell (SSH) Console v1.0.4",
      "Type standard commands or use the helper panel if you get stuck.",
      "----------------------------------------------------------------",
      "system initialized. listening for socket requests..."
    ];
    let usedMissionIndexes: number[] = [];
    let isAutocompleteUsedForCurrent = false;

    function renderIntro() {
      p.innerHTML = `
        <div class="max-w-xl mx-auto p-6 glass rounded-3xl border border-slate-850 space-y-6 text-center animate-fadeIn">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
            <i data-lucide="terminal" class="w-8 h-8"></i>
          </div>
          
          <div class="space-y-2">
            <h3 class="text-xl font-extrabold text-white">Linux Terminal Hacker</h3>
            <p class="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Selesaikan misi-misi administrasi sistem dan uji penetrasi jaringan dengan mengetikkan perintah Shell Linux/CMD secara tepat di terminal virtual!
            </p>
          </div>

          <div class="p-4 bg-slate-950/50 rounded-2xl border border-slate-850/80 text-left space-y-3 font-sans">
            <h4 class="text-xs font-bold text-slate-300 flex items-center gap-1">
              <i data-lucide="info" class="w-3.5 h-3.5 text-emerald-400"></i> Aturan Speedrun:
            </h4>
            <ul class="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Kamu dibekali waktu awal <strong class="text-emerald-400">60 Detik</strong>.</li>
              <li>Ketik perintah lengkap lalu tekan <strong class="text-white">Enter</strong> untuk menjalankan.</li>
              <li>Setiap jawaban yang benar akan menambah waktu <strong class="text-emerald-400">+8 detik</strong> dan memberikan poin.</li>
              <li>Combo berlipat meningkatkan bonus poin!</li>
              <li>Tersedia tombol <strong class="text-yellow-400">Hint</strong> dan <strong class="text-cyan-400">Autofill</strong> jika kamu lupa sintaks perintah.</li>
            </ul>
          </div>

          <button id="startTerminalBtn" class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs tracking-wider transition-all cursor-pointer">
            MASUK CONSOLE TERMINAL 💻
          </button>
        </div>
      `;

      renderIcons();

      const btn = document.getElementById("startTerminalBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          playRetroSound("click");
          startGame();
        });
      }
    }

    function startGame() {
      score = 0;
      combo = 0;
      maxCombo = 0;
      timeLeft = 60;
      gameActive = true;
      usedMissionIndexes = [];
      terminalHistory = [
        "ClassHub OS 2026.07 (tty1) - Powered by Linux Kernel",
        "Welcome to ClassHub Secure Shell (SSH) Console v1.0.4",
        "Type standard commands or use the helper panel if you get stuck.",
        "----------------------------------------------------------------",
        "system initialized. listening for socket requests..."
      ];
      
      loadNextMission();
      
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        timeLeft -= 1;
        const bar = document.getElementById("terminalProgressBar");
        const timeVal = document.getElementById("terminalTimeValue");
        
        if (bar) bar.style.width = `${Math.min(100, (timeLeft / 60) * 100)}%`;
        if (timeVal) timeVal.innerText = `${timeLeft}s`;

        if (timeLeft <= 0) {
          clearInterval(timer);
          endGame();
        }
      }, 1000);
    }

    function loadNextMission() {
      if (!gameActive) return;

      isAutocompleteUsedForCurrent = false;

      // Select random mission from TERMINAL_MISSIONS
      let randIndex = Math.floor(Math.random() * TERMINAL_MISSIONS.length);
      
      // Prevent immediate duplicate if possible
      if (usedMissionIndexes.length < TERMINAL_MISSIONS.length) {
        while (usedMissionIndexes.includes(randIndex)) {
          randIndex = Math.floor(Math.random() * TERMINAL_MISSIONS.length);
        }
        usedMissionIndexes.push(randIndex);
      } else {
        usedMissionIndexes = [randIndex];
      }

      currentMission = TERMINAL_MISSIONS[randIndex];
      renderPlayground();
      
      // Auto-focus input
      const input = document.getElementById("terminalCmdInput") as HTMLInputElement;
      if (input) {
        input.focus();
        // Force focus on click anywhere in terminal box
        const box = document.getElementById("terminalConsoleBox");
        if (box) {
          box.addEventListener("click", () => input.focus());
        }
      }
    }

    function processCommand(typed: string) {
      const cleanTyped = typed.trim().toLowerCase();
      if (!cleanTyped) return;

      // Log the entered command
      terminalHistory.push(`root@classhub-server:~# ${typed}`);

      const targetCmd = currentMission.command.toLowerCase();
      const aliases = currentMission.aliases ? currentMission.aliases.map(a => a.toLowerCase()) : [];

      if (cleanTyped === targetCmd || aliases.includes(cleanTyped)) {
        // Correct answer
        playRetroSound("success");
        combo += 1;
        maxCombo = Math.max(maxCombo, combo);

        // Score formulation
        let basePoints = 15;
        if (isAutocompleteUsedForCurrent) {
          basePoints = 5; // Penalty for autocomplete
        }
        const points = basePoints + (combo * 3);
        score += points;

        // Print output to terminal
        currentMission.outputs.forEach((line: string) => {
          terminalHistory.push(line);
        });
        terminalHistory.push(`[SUCCESS] OK. Target mission accomplished (+${points} XP)`);
        terminalHistory.push("");

        // Reward time
        timeLeft = Math.min(100, timeLeft + 8);
        
        toast.success(`Misi Berhasil! +${points} Poin`);
        
        loadNextMission();
      } else if (cleanTyped === "clear") {
        terminalHistory = [`root@classhub-server:~# clear`];
        renderPlayground();
      } else if (cleanTyped === "help" || cleanTyped === "hint") {
        playRetroSound("click");
        terminalHistory.push(`[HINT] ${currentMission.help}`);
        terminalHistory.push("");
        timeLeft = Math.max(5, timeLeft - 3); // hint costs 3 seconds
        renderPlayground();
      } else {
        // Wrong answer
        playRetroSound("error");
        combo = 0;
        terminalHistory.push(`bash: command not found: ${typed}`);
        terminalHistory.push(`Type 'hint' or click the Hint button if you need help.`);
        terminalHistory.push("");
        
        timeLeft = Math.max(0, timeLeft - 4); // wrong answer costs 4 seconds
        toast.error("Gagal! Perintah tidak sesuai.");
        
        renderPlayground();
      }

      // Auto scroll terminal to bottom
      const logArea = document.getElementById("terminalHistoryLog");
      if (logArea) {
        logArea.scrollTop = logArea.scrollHeight;
      }
    }

    function renderPlayground() {
      const formattedHistory = terminalHistory.map(line => {
        if (line.startsWith("root@classhub-server")) {
          return `<div class="text-slate-300 font-bold">${line}</div>`;
        }
        if (line.startsWith("[SUCCESS]")) {
          return `<div class="text-emerald-400 font-extrabold animate-pulse">${line}</div>`;
        }
        if (line.startsWith("[HINT]")) {
          return `<div class="text-yellow-400 font-semibold italic">${line}</div>`;
        }
        if (line.startsWith("bash: command")) {
          return `<div class="text-red-400 font-bold">${line}</div>`;
        }
        return `<div class="text-emerald-500">${line}</div>`;
      }).join("");

      p.innerHTML = `
        <div class="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          
          <!-- LEFT SIDEBAR: MISSION STATEMENT -->
          <div class="md:col-span-1 space-y-4 flex flex-col justify-between">
            <div class="p-5 glass rounded-3xl border border-slate-850 space-y-4">
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Misi Aktif
                </span>
                <span id="terminalTimeValue" class="text-xs font-mono font-bold text-yellow-400">${timeLeft}s</span>
              </div>

              <div class="space-y-1">
                <span class="text-[9px] text-slate-500 font-mono uppercase">TARGET TINDAKAN:</span>
                <div class="p-3.5 bg-emerald-950/20 rounded-2xl border border-emerald-500/20 text-slate-100 font-sans text-xs font-bold leading-relaxed">
                  ${currentMission.objective}
                </div>
              </div>

              <!-- STATS ROW -->
              <div class="grid grid-cols-2 gap-2.5 pt-2">
                <div class="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-center">
                  <div class="text-[9px] text-slate-500 font-mono">SKOR</div>
                  <div class="text-sm font-bold text-cyan-400 font-mono">${score}</div>
                </div>
                <div class="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-center">
                  <div class="text-[9px] text-slate-500 font-mono">COMBO</div>
                  <div class="text-sm font-bold text-yellow-400 font-mono">x${combo}</div>
                </div>
              </div>
            </div>

            <!-- BUTTON ACTIONS FOR EASY PLAYING -->
            <div class="p-4 glass rounded-3xl border border-slate-850 space-y-2 bg-slate-950/10">
              <span class="text-[9px] text-slate-500 font-mono block text-center uppercase">Bantuan Darurat (TKJ Console)</span>
              
              <div class="grid grid-cols-2 gap-2">
                <button id="getHintBtn" class="py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1">
                  <i data-lucide="help-circle" class="w-3 h-3"></i> Tampilkan Hint
                </button>
                
                <button id="autofillBtn" class="py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1">
                  <i data-lucide="sparkles" class="w-3 h-3"></i> Autofill Cmd
                </button>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDE: ACTIVE RETRO TERMINAL -->
          <div class="md:col-span-2 flex flex-col space-y-3">
            
            <!-- PROGRESS TIMER BAR -->
            <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
              <div id="terminalProgressBar" class="h-full bg-emerald-500 transition-all duration-300" style="width: ${Math.min(100, (timeLeft / 60) * 100)}%"></div>
            </div>

            <!-- CONSOLE CONTAINER -->
            <div id="terminalConsoleBox" class="flex-1 min-h-[340px] bg-slate-950 rounded-2xl border border-slate-850 p-4 font-mono text-xs flex flex-col justify-between shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] overflow-hidden">
              
              <!-- History Output Log -->
              <div id="terminalHistoryLog" class="flex-1 overflow-y-auto space-y-1.5 max-h-[290px] pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                ${formattedHistory}
              </div>

              <!-- Input Command Prompt line -->
              <div class="flex items-center gap-2 border-t border-slate-850 pt-3 mt-3">
                <span class="text-emerald-400 font-bold">root@classhub-server:~#</span>
                <input type="text" id="terminalCmdInput" class="bg-transparent border-none outline-none text-emerald-400 font-mono text-xs flex-1 w-full placeholder-emerald-800 focus:ring-0 focus:border-none p-0" placeholder="Ketik perintah di sini..." autocomplete="off" autofocus>
              </div>

            </div>
          </div>
        </div>
      `;

      renderIcons();

      // Auto-scroll log
      const logArea = document.getElementById("terminalHistoryLog");
      if (logArea) {
        logArea.scrollTop = logArea.scrollHeight;
      }

      // Bind actions
      const input = document.getElementById("terminalCmdInput") as HTMLInputElement;
      if (input) {
        input.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            const val = input.value;
            input.value = "";
            processCommand(val);
          }
        });
      }

      const hintBtn = document.getElementById("getHintBtn");
      if (hintBtn) {
        hintBtn.addEventListener("click", () => {
          processCommand("hint");
        });
      }

      const fillBtn = document.getElementById("autofillBtn");
      if (fillBtn) {
        fillBtn.addEventListener("click", () => {
          playRetroSound("click");
          if (input) {
            input.value = currentMission.command;
            isAutocompleteUsedForCurrent = true;
            input.focus();
            toast.info("Perintah terisi! Tekan Enter untuk mengeksekusi.");
          }
        });
      }
    }

    async function endGame() {
      gameActive = false;
      if (timer) clearInterval(timer);

      const earnedXp = Math.min(65, Math.floor(score / 3) + 12);
      const earnedCoins = Math.min(45, Math.floor(score / 6) + 6);

      if (score > 0) {
        await addRewards(earnedXp, earnedCoins, `Linux Terminal Hacker (${score} Poin, Max Combo x${maxCombo})`);
      } else {
        Swal.fire({
          icon: "error",
          title: "Sesi SSH Berakhir! ⌛",
          text: "Waktu server habis sebelum kamu berhasil menyelesaikan misi hacking apa pun. Pelajari lagi daftar perintah command line jaringan!",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonText: "Coba Lagi",
          confirmButtonColor: "#10b981"
        }).then(() => {
          activeGame = null;
          renderUI();
        });
      }
    }

    renderIntro();
  }

  loadGameProfile();
}

