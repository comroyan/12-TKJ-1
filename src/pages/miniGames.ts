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
  { id: "fr_neon", name: "Cyberpunk Neon Frame", cost: 150, type: "frame", preview: "border-4 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]" },
  { id: "fr_gold", name: "Golden Network Master Frame", cost: 300, type: "frame", preview: "border-4 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" },
  { id: "th_slate", name: "Cosmic Dark Slate Theme", cost: 250, type: "theme", preview: "bg-slate-900" },
  { id: "bd_genius", name: "🧠 Genius TKJ Badge", cost: 500, type: "badge", preview: "🧠 Genius TKJ" }
];

// Sample Quiz Database for Games
const GAME_QUIZZES = [
  { q: "Apa nama protokol yang digunakan untuk mengirim email?", options: ["HTTP", "FTP", "SMTP", "POP3"], answer: 2 },
  { q: "IP Address 10.0.0.1 termasuk dalam kelas...", options: ["Kelas A", "Kelas B", "Kelas C", "Kelas D"], answer: 0 },
  { q: "Kabel UTP yang digunakan untuk menghubungkan PC langsung ke PC adalah...", options: ["Straight", "Cross", "Rollover", "Console"], answer: 1 },
  { q: "Port default dari Web Server HTTPS adalah...", options: ["Port 80", "Port 22", "Port 443", "Port 8080"], answer: 2 },
  { q: "RouterOS adalah sistem operasi milik vendor...", options: ["Cisco", "MikroTik", "Juniper", "Huawei"], answer: 1 },
  { q: "Perangkat yang bekerja pada OSI Layer 2 (Data Link) adalah...", options: ["Hub", "Router", "Switch Layer 2", "Repeater"], answer: 2 },
  { q: "Singkatan dari WAN adalah...", options: ["Wide Area Network", "Wifi Area Network", "Web Access Network", "World Access Node"], answer: 0 }
];

export async function renderMiniGames(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Menghubungkan ke Server Mini Games...</span>
    </div>
  `;

  let activeTab = "games"; // games, shop, leaderboard, profile

  // User Game Profile state
  let xp = 0;
  let coins = 0;
  let level = 1;
  let badges: string[] = ["⚡ Pemula TKJ"];
  let inventory: string[] = [];

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
          updatedAt: new Date()
        });
        xp = 10;
        coins = 50;
        level = 1;
        badges = ["⚡ Pemula TKJ"];
        inventory = [];
      }

      renderUI();
    } catch (err) {
      console.error(err);
      // Fallback local persistence if firestore fails
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
      badges.push(`🔥 Level ${level} Expert`);
    }

    await saveGameProfile();

    Swal.fire({
      icon: "success",
      title: "Game Selesai! 🎮",
      background: "#0f172a",
      color: "#f8fafc",
      html: `
        <div class="space-y-3">
          <p class="text-sm">Hebat! Kamu menyelesaikan permainan <strong>${gameName}</strong>.</p>
          <div class="flex justify-center gap-4 text-sm font-mono font-bold mt-2">
            <span class="text-cyan-400">✨ +${earnedXp} XP</span>
            <span class="text-yellow-400">🪙 +${earnedCoins} Coins</span>
          </div>
          ${didLevelUp ? `
            <div class="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mt-4">
              <span class="text-xs text-cyan-400 font-extrabold uppercase">LEVEL UP! 🎉</span>
              <p class="text-base text-white font-bold mt-1">Kamu naik ke Level ${level}!</p>
            </div>
          ` : ""}
        </div>
      `,
      confirmButtonText: "Keren!",
      confirmButtonColor: "#06b6d4"
    });

    renderUI();
  }

  async function renderUI() {
    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn text-slate-100 font-sans">
        <!-- Dashboard Header / Status Bar -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 glass rounded-3xl relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-950">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl font-bold font-mono">
              ${level}
            </div>
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2 leading-none">
                ${userSession.name} <span class="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">LVL ${level}</span>
              </h2>
              <p class="text-xs text-slate-400 mt-2 font-mono flex items-center gap-1">
                <span>XP: ${xp % 100}/100</span>
                <span class="w-20 bg-slate-800 h-1.5 rounded-full inline-block overflow-hidden mx-1">
                  <span class="bg-cyan-500 h-full block" style="width: ${xp % 100}%"></span>
                </span>
                <span>🪙 ${coins} Coins</span>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button class="game-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'games' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="games">
              🎮 Main Games
            </button>
            <button class="game-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'shop' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="shop">
              🛍️ Toko Coins
            </button>
            <button class="game-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTab === 'leaderboard' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tab="leaderboard">
              🏆 Leaderboard
            </button>
          </div>
        </div>

        <div id="gameTabContent">
          <!-- A. TAB: GAMES -->
          ${activeTab === 'games' ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Game Card 1 -->
              <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl mb-3">❓</div>
                  <h3 class="text-base font-bold text-white font-display">Quiz Duel TKJ</h3>
                  <p class="text-xs text-slate-400 leading-relaxed mt-1">Uji pemahamanmu tentang jaringan, OSI layer, subnets, & konfigurasi routerboard secara seru.</p>
                </div>
                <button id="playQuizGameBtn" class="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all mt-4 cursor-pointer">Main Sekarang</button>
              </div>

              <!-- Game Card 2 -->
              <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center text-xl mb-3">🎡</div>
                  <h3 class="text-base font-bold text-white font-display">Lucky Spin Harian</h3>
                  <p class="text-xs text-slate-400 leading-relaxed mt-1">Putar roda keberuntungan harianmu dan dapatkan hadiah instan koin emas atau XP gratis!</p>
                </div>
                <button id="playSpinGameBtn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold rounded-2xl text-xs transition-all mt-4 cursor-pointer">Putar Roda</button>
              </div>

              <!-- Game Card 3 -->
              <div class="p-6 glass rounded-3xl space-y-4 border border-slate-850 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-3">🧠</div>
                  <h3 class="text-base font-bold text-white font-display">Memory Card Match</h3>
                  <p class="text-xs text-slate-400 leading-relaxed mt-1">Pasangkan kartu bergambar perangkat hardware jaringan secepat mungkin untuk menguji memorimu.</p>
                </div>
                <button id="playMemoryGameBtn" class="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all mt-4 cursor-pointer">Uji Memori</button>
              </div>
            </div>
          ` : ""}

          <!-- B. TAB: COIN SHOP -->
          ${activeTab === 'shop' ? `
            <div class="space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Toko Penukaran Koin Emas</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${SHOP_ITEMS.map(item => {
                  const owned = inventory.includes(item.id);
                  return `
                    <div class="p-5 glass rounded-3xl flex flex-col justify-between border border-slate-850 hover:border-cyan-500/20 transition-all">
                      <div class="text-center">
                        ${item.type === 'avatar' ? `
                          <img src="${item.preview}" class="w-16 h-16 rounded-full mx-auto border-2 border-slate-800 object-cover">
                        ` : item.type === 'frame' ? `
                          <div class="w-16 h-16 rounded-xl mx-auto bg-slate-900 flex items-center justify-center border border-slate-800 ${item.preview}">
                            <span class="text-[10px] text-slate-500">FRAME</span>
                          </div>
                        ` : `
                          <div class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-bold text-sm text-cyan-400 inline-block font-mono">
                            ${item.preview}
                          </div>
                        `}
                        <h4 class="font-bold text-white mt-3 text-sm">${item.name}</h4>
                        <span class="text-xs text-slate-500 block uppercase font-mono mt-1">${item.type}</span>
                      </div>

                      <div class="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between">
                        <span class="text-xs text-yellow-400 font-bold font-mono">🪙 ${item.cost} Coins</span>
                        <button class="buy-item-btn px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${owned ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'}" data-id="${item.id}" ${owned ? 'disabled' : ''}>
                          ${owned ? 'Dimiliki' : 'Beli'}
                        </button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          ` : ""}

          <!-- C. TAB: LEADERBOARD -->
          ${activeTab === 'leaderboard' ? `
            <div class="max-w-2xl mx-auto p-6 glass rounded-3xl space-y-4">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider text-center">🏆 Papan Peringkat XII TKJ 1</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase bg-slate-950/30">
                      <th class="p-4">Rank</th>
                      <th class="p-4">Nama Siswa</th>
                      <th class="p-4">Level</th>
                      <th class="p-4">Total XP</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800" id="leaderboardRows">
                    <!-- Injected via Firestore -->
                  </tbody>
                </table>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    renderIcons();

    // Attach Tab Switchers
    document.querySelectorAll(".game-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        renderUI();
      });
    });

    // Buy Shop Item Event
    document.querySelectorAll(".buy-item-btn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const itemId = btn.dataset.id;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (coins < item.cost) {
          toast.error("Koin kamu tidak mencukupi untuk membeli item ini!");
          return;
        }

        const confirm = await confirmDialog("Beli Item Toko", `Beli ${item.name} seharga 🪙 ${item.cost} Coins?`);
        if (confirm) {
          coins -= item.cost;
          inventory.push(itemId);
          if (item.type === "badge") {
            badges.push(item.preview);
          }
          await saveGameProfile();
          toast.success("Item berhasil dibeli!");
          renderUI();
        }
      });
    });

    // Play QUIZ GAME Event
    const playQuizGameBtn = document.getElementById("playQuizGameBtn");
    if (playQuizGameBtn) {
      playQuizGameBtn.addEventListener("click", () => {
        let qIdx = 0;
        let correctCount = 0;

        function renderQuizRound() {
          const q = GAME_QUIZZES[qIdx];
          Swal.fire({
            title: `Quiz TKJ (Soal ${qIdx + 1}/${GAME_QUIZZES.length})`,
            background: "#0f172a",
            color: "#f8fafc",
            html: `
              <div class="space-y-4 text-left text-sm">
                <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl font-semibold text-slate-100">
                  ${q.q}
                </div>
                <div class="space-y-2">
                  ${q.options.map((opt, oIdx) => `
                    <button class="game-opt-btn w-full p-3 text-left bg-slate-900 border border-slate-800 text-xs hover:border-cyan-500 rounded-xl transition-all" data-idx="${oIdx}">
                      ${opt}
                    </button>
                  `).join("")}
                </div>
              </div>
            `,
            showCancelButton: true,
            cancelButtonText: "Keluar Sesi",
            cancelButtonColor: "#ef4444",
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
              document.querySelectorAll(".game-opt-btn").forEach((obtn: any) => {
                obtn.addEventListener("click", () => {
                  const selIdx = parseInt(obtn.dataset.idx);
                  if (selIdx === q.answer) {
                    correctCount++;
                  }
                  
                  if (qIdx < GAME_QUIZZES.length - 1) {
                    qIdx++;
                    renderQuizRound();
                  } else {
                    // Reward math
                    const xpReward = correctCount * 15;
                    const coinReward = correctCount * 10;
                    addRewards(xpReward, coinReward, "Quiz Duel TKJ");
                  }
                });
              });
            }
          });
        }

        renderQuizRound();
      });
    }

    // Play SPIN WHEEL Event
    const playSpinGameBtn = document.getElementById("playSpinGameBtn");
    if (playSpinGameBtn) {
      playSpinGameBtn.addEventListener("click", () => {
        const lastSpin = localStorage.getItem(`last_spin_${userSession.uid}`);
        const todayStr = new Date().toDateString();

        if (lastSpin === todayStr) {
          Swal.fire("Sesi Berakhir", "Kamu sudah memutar spin harian hari ini. Kembali lagi besok!", "info");
          return;
        }

        Swal.fire({
          title: "🎡 Lucky Spin Roda Keberuntungan",
          background: "#0f172a",
          color: "#f8fafc",
          text: "Klik Putar untuk memenangkan Koin & XP gratis hari ini!",
          showCancelButton: true,
          confirmButtonText: "🎯 PUTAR RODA!",
          confirmButtonColor: "#06b6d4"
        }).then((res) => {
          if (res.isConfirmed) {
            localStorage.setItem(`last_spin_${userSession.uid}`, todayStr);

            // Calculate spin rewards
            const prizes = [
              { name: "30 Coins", xp: 10, coins: 30 },
              { name: "50 Coins & 20 XP", xp: 20, coins: 50 },
              { name: "100 COINS MEGA!", xp: 30, coins: 100 },
              { name: "Zonk (Coba lagi besok)", xp: 5, coins: 0 }
            ];

            const won = prizes[Math.floor(Math.random() * prizes.length)];
            addRewards(won.xp, won.coins, `Lucky Spin Wheel (${won.name})`);
          }
        });
      });
    }

    // Play MEMORY MATCH GAME
    const playMemoryGameBtn = document.getElementById("playMemoryGameBtn");
    if (playMemoryGameBtn) {
      playMemoryGameBtn.addEventListener("click", () => {
        const items = ["Router", "Switch", "AccessPoint", "Hub", "Splicer", "FiberOptic"];
        let cards = [...items, ...items].sort(() => Math.random() - 0.5);
        let flipped: number[] = [];
        let matched: string[] = [];

        const displayNames: { [key: string]: string } = {
          "Router": "📟 Router",
          "Switch": "🎛️ Switch",
          "AccessPoint": "📶 AP Wi-Fi",
          "Hub": "🔌 LAN Hub",
          "Splicer": "⚡ Splicer",
          "FiberOptic": "🎗️ Fiber Optic"
        };

        function renderMemoryUI() {
          Swal.fire({
            title: "Uji Memori Jaringan (Cari Pasangan)",
            background: "#0f172a",
            color: "#f8fafc",
            width: "550px",
            html: `
              <div class="grid grid-cols-4 gap-2.5 max-w-md mx-auto pt-2">
                ${cards.map((c, idx) => {
                  const isFlipped = flipped.includes(idx) || matched.includes(c);
                  return `
                    <button class="memo-card w-full h-16 rounded-xl bg-slate-900 border ${isFlipped ? 'border-cyan-500 text-cyan-300 font-bold' : 'border-slate-850 text-transparent'} hover:bg-slate-800 text-xs transition-all duration-300 flex items-center justify-center font-mono" data-idx="${idx}" ${isFlipped ? 'disabled' : ''}>
                      ${isFlipped ? (displayNames[c] || c) : "❓"}
                    </button>
                  `;
                }).join("")}
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Selesai",
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
              document.querySelectorAll(".memo-card").forEach((mcard: any) => {
                mcard.addEventListener("click", () => {
                  const idx = parseInt(mcard.dataset.idx);
                  flipped.push(idx);
                  renderMemoryUI();

                  if (flipped.length === 2) {
                    const first = cards[flipped[0]];
                    const second = cards[flipped[1]];

                    if (first === second) {
                      matched.push(first);
                    }

                    setTimeout(() => {
                      flipped = [];
                      if (matched.length === items.length) {
                        addRewards(50, 40, "Memory Card Match");
                      } else {
                        renderMemoryUI();
                      }
                    }, 800);
                  }
                });
              });
            }
          });
        }

        renderMemoryUI();
      });
    }

    // Load Leaderboard from Firestore
    if (activeTab === "leaderboard") {
      const leaderboardRows = document.getElementById("leaderboardRows");
      if (leaderboardRows) {
        leaderboardRows.innerHTML = `
          <tr>
            <td colspan="4" class="p-8 text-center text-slate-500 font-mono text-xs">Memuat peringkat siswa...</td>
          </tr>
        `;
        try {
          const lq = query(collection(db, "gameData"), orderBy("xp", "desc"), limit(10));
          const snap = await getDocs(lq);
          
          let idx = 0;
          leaderboardRows.innerHTML = snap.docs.map(doc => {
            idx++;
            const data = doc.data();
            const badgeIcon = idx === 1 ? "🥇" : idx === 2 ? "🥈" : idx === 3 ? "🥉" : `${idx}`;
            return `
              <tr class="hover:bg-slate-900/40 transition-colors">
                <td class="p-4 font-bold text-slate-300 font-mono">${badgeIcon}</td>
                <td class="p-4 font-bold text-white flex items-center gap-2">
                  ${data.name} 
                  ${data.badges && data.badges.length > 0 ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">${data.badges[0]}</span>` : ""}
                </td>
                <td class="p-4 font-mono text-cyan-400 font-bold">${data.level || 1}</td>
                <td class="p-4 font-mono text-white font-extrabold">${data.xp || 0} XP</td>
              </tr>
            `;
          }).join("");
        } catch (e) {
          leaderboardRows.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-400">Gagal memuat: ${(e as any).message}</td></tr>`;
        }
      }
    }
  }

  loadGameProfile();
}
