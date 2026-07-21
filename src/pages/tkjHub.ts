import { renderIcons, toast } from "../utils/helpers";
import Swal from "sweetalert2";

// Port TCP/UDP Reference Data
const PORT_REFERENCES = [
  { port: "20/21", protocol: "FTP", description: "File Transfer Protocol (Transfer Berkas)" },
  { port: "22", protocol: "SSH", description: "Secure Shell (Akses Shell Terenkripsi)" },
  { port: "23", protocol: "Telnet", description: "Telecommunication Network (Akses Shell Tidak Terenkripsi)" },
  { port: "25", protocol: "SMTP", description: "Simple Mail Transfer Protocol (Pengiriman Email)" },
  { port: "53", protocol: "DNS", description: "Domain Name System (Penerjemah Nama Domain ke IP)" },
  { port: "80", protocol: "HTTP", description: "Hypertext Transfer Protocol (Akses Website Default)" },
  { port: "110", protocol: "POP3", description: "Post Office Protocol v3 (Penerimaan Email)" },
  { port: "143", protocol: "IMAP", description: "Internet Message Access Protocol (Manajemen Email Server)" },
  { port: "443", protocol: "HTTPS", description: "HTTP Secure (Akses Website Aman Terenkripsi)" },
  { port: "3306", protocol: "MySQL", description: "Database Server MySQL Default" },
  { port: "3389", protocol: "RDP", description: "Remote Desktop Protocol (Akses GUI Windows Jauh)" },
  { port: "8080/8291", protocol: "MikroTik Winbox / WebFig", description: "Port administrasi GUI routerboard MikroTik" }
];

// Commands Database
const COMMANDS_DATABASE: { [key: string]: { cmd: string; desc: string; example: string }[] } = {
  Linux: [
    { cmd: "apt update && apt upgrade", desc: "Memperbarui daftar paket repositori dan meningkatkan versi paket Linux.", example: "sudo apt update -y" },
    { cmd: "nano /etc/network/interfaces", desc: "Mengedit file konfigurasi alamat IP Debian Server.", example: "nano /etc/network/interfaces" },
    { cmd: "systemctl restart bind9", desc: "Memulai ulang layanan DNS Server BIND9.", example: "systemctl restart bind9" },
    { cmd: "ip a", desc: "Menampilkan semua interface jaringan dan alamat IP yang terpasang.", example: "ip a" },
    { cmd: "ping -c 4 8.8.8.8", desc: "Mengirim paket ICMP Echo Request ke host tujuan sebanyak 4 kali.", example: "ping -c 4 google.com" }
  ],
  CMD: [
    { cmd: "ipconfig /all", desc: "Menampilkan konfigurasi TCP/IP lengkap untuk semua adapter jaringan.", example: "ipconfig /all" },
    { cmd: "ping -t", desc: "Melakukan ping terus-menerus ke target hingga dihentikan (Ctrl+C).", example: "ping 192.168.1.1 -t" },
    { cmd: "tracert", desc: "Melacak rute hop yang dilewati paket data menuju host tujuan.", example: "tracert google.com" },
    { cmd: "nslookup", desc: "Mengecek alamat IP atau name server dari sebuah domain.", example: "nslookup google.com" },
    { cmd: "netsh wlan show profiles", desc: "Menampilkan profil jaringan Wi-Fi yang pernah terhubung.", example: "netsh wlan show profiles" }
  ],
  PowerShell: [
    { cmd: "Get-NetIPAddress", desc: "Mengambil konfigurasi alamat IP adapter jaringan Windows.", example: "Get-NetIPAddress" },
    { cmd: "Test-Connection", desc: "Mengirim ICMP echo request ke komputer lokal atau remote.", example: "Test-Connection google.com" },
    { cmd: "Resolve-DnsName", desc: "Melakukan pencarian nama DNS secara detail.", example: "Resolve-DnsName google.com" },
    { cmd: "Get-Service", desc: "Menampilkan daftar status service yang berjalan di Windows.", example: "Get-Service" }
  ],
  MikroTik: [
    { cmd: "/ip address add", desc: "Menambahkan alamat IP baru pada interface fisik tertentu.", example: "/ip address add address=192.168.1.1/24 interface=ether1" },
    { cmd: "/ip dhcp-client add", desc: "Mengaktifkan DHCP Client pada interface agar mendapat IP otomatis.", example: "/ip dhcp-client add interface=ether1 disabled=no" },
    { cmd: "/ip firewall nat add", desc: "Menambahkan konfigurasi NAT Masquerade agar klien lokal dapat internetan.", example: "/ip firewall nat add chain=srcnat action=masquerade out-interface=ether1" },
    { cmd: "/system reset-configuration", desc: "Mereset semua konfigurasi Routerboard ke setelan pabrik default.", example: "/system reset-configuration" }
  ],
  Cisco: [
    { cmd: "enable", desc: "Memasuki mode Privileged EXEC (Privileged Mode).", example: "Router> enable" },
    { cmd: "configure terminal", desc: "Memasuki mode konfigurasi global router/switch.", example: "Router# configure terminal" },
    { cmd: "interface gigabitethernet 0/0", desc: "Memasuki mode konfigurasi interface tertentu.", example: "Router(config)# interface g0/0" },
    { cmd: "ip address", desc: "Mengonfigurasi alamat IP dan subnet mask pada interface.", example: "Router(config-if)# ip address 192.168.1.1 255.255.255.0" },
    { cmd: "no shutdown", desc: "Mengaktifkan interface secara fisik (menyalakan port).", example: "Router(config-if)# no shutdown" }
  ]
};

// TKJ Flashcards
const TKJ_FLASHCARDS = [
  { q: "Apa kepanjangan dari OSI Layer?", a: "Open Systems Interconnection" },
  { q: "Layer ke-4 pada OSI Layer adalah...", a: "Transport Layer (protokol TCP/UDP)" },
  { q: "Berapa subnet mask default dari kelas C?", a: "255.255.255.0 (/24)" },
  { q: "Berapa kecepatan maksimal kategori kabel Cat5e?", a: "1000 Mbps (1 Gbps) dengan frekuensi 100 MHz" },
  { q: "Sebutkan nomor port default Protokol HTTPS!", a: "Port 443" },
  { q: "Alat pengupas kabel FO (Fiber Optic) bernama...", a: "Stripper / Miller Stripper" },
  { q: "Perangkat yang menggabungkan kabel FO dengan pemanas laser adalah...", a: "Fusion Splicer" }
];

export async function renderTKJHub(container: HTMLElement, userSession: any) {
  let activeTool = "network"; // network, commands, cable, security, flashcards, diagnostics, generator, cliLab, topology
  let querySearch = "";
  
  // Persistence variables for new interactive tools
  let diagInterval: any = null;
  let diagRunning = false;
  let selectedGenOS = "mikrotik";
  let selectedGenFeature = "ip";

  // --- STATE FOR CLI LAB SIMULATOR (Feature 2) ---
  let cliIpEther1 = "";
  let cliIpEther2 = "";
  let cliGateway = "";
  let cliDns = "";
  let cliTerminalLogs = [
    "Welcome to RouterOS Virtual CLI Lab (v7.12)",
    "Type 'help' or '?' to see a list of commands.",
    "--- MISSION: Configure ether1 IP to 192.168.1.2/24 and add gateway 192.168.1.1, then run '/ping 8.8.8.8' ---",
    ""
  ];

  // --- STATE FOR TOPOLOGY BUILDER (Feature 3) ---
  let topoPcIp = "192.168.10.2";
  let topoPcMask = "24";
  let topoPcGateway = "192.168.10.1";
  
  let topoRouterLanIp = "192.168.10.1";
  let topoRouterLanMask = "24";
  let topoRouterWanIp = "192.168.1.2";
  let topoRouterWanMask = "24";
  let topoRouterGateway = "192.168.1.1";
  let topoRouterNatEnabled = true;

  interface Connection {
    from: string;
    to: string;
    type: "straight" | "cross";
  }
  let topoConnections: Connection[] = [
    { from: "pc", to: "switch", type: "straight" },
    { from: "switch", to: "router", type: "straight" },
    { from: "router", to: "cloud", type: "straight" }
  ]; // Pre-connect standard topology
  let activeSelectedTopoDevice = "pc"; // pc, router, connections

  function renderUI() {
    container.innerHTML = `
      <div class="space-y-6 animate-fadeIn text-slate-100 font-sans">
        <!-- Main Top Bar -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold font-display text-white flex items-center gap-2">
              <i data-lucide="grid" class="w-7 h-7 text-cyan-400"></i> TKJ HUB
            </h1>
            <p class="text-slate-400 text-xs mt-1">Gudang alat, kalkulator, referensi kabel, perintah CLI, dan game kartu flashcard TKJ.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'network' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="network">
              🌐 Network Calc
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'commands' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="commands">
              💻 Command & Port
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'cable' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="cable">
              🔌 Wiring Kabel
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'security' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="security">
              🔑 QR & Pass Gen
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'flashcards' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="flashcards">
              🃏 Flashcards
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'diagnostics' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="diagnostics">
              🔍 Diagnostik Ping
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'generator' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="generator">
              ⚙️ Script Generator
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'cliLab' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="cliLab">
              🖥️ CLI Lab Simulator
            </button>
            <button class="tool-tab-btn px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 transition-all ${activeTool === 'topology' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}" data-tool="topology">
              🖧 Topology Builder
            </button>
          </div>
        </div>

        <div id="tkjToolContent" class="space-y-6">
          <!-- 1. TOOL: NETWORK CALCULATORS & BYTE CONVERTER -->
          ${activeTool === 'network' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Subnet & CIDR Calculator -->
              <div class="lg:col-span-2 p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="award" class="text-cyan-400 w-4 h-4"></i> Kalkulator IP Subnetting & CIDR
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">IP Address</label>
                    <input type="text" id="calcIp" value="192.168.1.1" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm font-mono">
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Prefix CIDR (/24 - /30)</label>
                    <select id="calcPrefix" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none text-sm font-mono">
                      ${Array.from({ length: 31 }, (_, i) => i + 1).map(p => `
                        <option value="${p}" ${p === 24 ? 'selected' : ''}>/${p}</option>
                      `).join("")}
                    </select>
                  </div>
                </div>

                <div class="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">Subnet Mask:</span>
                    <span class="text-cyan-400 font-bold" id="resSubnet">255.255.255.0</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">Network ID:</span>
                    <span class="text-white font-bold" id="resNetwork">192.168.1.0</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">First Usable IP:</span>
                    <span class="text-white font-bold" id="resFirst">192.168.1.1</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">Last Usable IP:</span>
                    <span class="text-white font-bold" id="resLast">192.168.1.254</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">Broadcast Address:</span>
                    <span class="text-white font-bold" id="resBroadcast">192.168.1.255</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-800">
                    <span class="text-slate-400">Wildcard Mask:</span>
                    <span class="text-white font-bold" id="resWildcard">0.0.0.255</span>
                  </div>
                  <div class="flex justify-between py-1.5">
                    <span class="text-slate-400">Jumlah Host Dapat Digunakan:</span>
                    <span class="text-emerald-400 font-extrabold" id="resHosts">254 Host</span>
                  </div>
                </div>
              </div>

              <!-- Byte Converter -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Byte & Bit Converter</h3>
                <div class="space-y-4 text-xs">
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Nilai Data</label>
                    <input type="number" id="byteInputVal" value="1" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none font-mono">
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Dari Satuan</label>
                    <select id="byteUnitFrom" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                      <option value="bit">Bit (b)</option>
                      <option value="byte" selected>Byte (B)</option>
                      <option value="kb">Kilobyte (KB)</option>
                      <option value="mb">Megabyte (MB)</option>
                      <option value="gb">Gigabyte (GB)</option>
                    </select>
                  </div>
                  <div class="space-y-2 pt-2 border-t border-slate-800 font-mono text-xs">
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ke Bits:</span>
                      <span id="byteResBits" class="text-white">8 b</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ke Bytes:</span>
                      <span id="byteResBytes" class="text-white">1 B</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ke Kilobytes (KB):</span>
                      <span id="byteResKB" class="text-white">0.001 KB</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ke Megabytes (MB):</span>
                      <span id="byteResMB" class="text-white">0 MB</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Ke Gigabytes (GB):</span>
                      <span id="byteResGB" class="text-white">0 GB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 2. TOOL: SEARCHABLE COMMANDS & TCP/UDP PORT REFERENCES -->
          ${activeTool === 'commands' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Left Search Commands -->
              <div class="lg:col-span-2 p-6 glass rounded-3xl space-y-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-bold text-white uppercase tracking-wider">Perpustakaan CLI Commands</h3>
                  <select id="cliSystemSelect" class="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-white outline-none">
                    <option value="Linux">Linux Debian</option>
                    <option value="CMD">Windows CMD</option>
                    <option value="PowerShell">PowerShell</option>
                    <option value="MikroTik">MikroTik RouterOS</option>
                    <option value="Cisco">Cisco IOS</option>
                  </select>
                </div>

                <div class="flex items-center gap-3 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
                  <input type="text" id="commandSearchInput" placeholder="Cari sintaks command atau kegunaannya..." class="w-full bg-transparent text-xs border-none outline-none text-white placeholder-slate-600">
                </div>

                <div class="space-y-3 max-h-[350px] overflow-y-auto pr-1" id="commandResults">
                  <!-- Injected via JavaScript -->
                </div>
              </div>

              <!-- Right Ports list -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Standard TCP/UDP Ports</h3>
                <div class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400"></i>
                  <input type="text" id="portSearchInput" placeholder="Cari nama protocol / nomor port..." class="w-full bg-transparent text-xs border-none outline-none text-white placeholder-slate-600">
                </div>
                <div class="space-y-2 max-h-[350px] overflow-y-auto pr-1" id="portResults">
                  <!-- Injected via JS -->
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 3. TOOL: UTP CABLE WIRING STANDARDS -->
          ${activeTool === 'cable' ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- T568A Standard Card -->
              <div class="p-6 glass rounded-3xl space-y-4 border-l-4 border-l-emerald-500">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-bold text-white font-display">Susunan T568A (Standar A)</h3>
                  <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] font-bold">Standard A</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">Digunakan di ujung kabel untuk membuat kabel Cross, atau di kedua ujung untuk kabel Straight standar A.</p>
                <div class="grid grid-cols-8 gap-1.5 font-mono text-center pt-3">
                  ${[
                    { color: "Putih Hijau", class: "bg-emerald-500/25 border-emerald-500 text-emerald-400" },
                    { color: "Hijau", class: "bg-emerald-600 text-slate-950 font-bold" },
                    { color: "Putih Orange", class: "bg-amber-500/25 border-amber-500 text-amber-400" },
                    { color: "Biru", class: "bg-blue-600 text-white font-bold" },
                    { color: "Putih Biru", class: "bg-blue-500/25 border-blue-500 text-blue-400" },
                    { color: "Orange", class: "bg-amber-600 text-slate-950 font-bold" },
                    { color: "Putih Cokelat", class: "bg-orange-800/25 border-orange-800 text-orange-400" },
                    { color: "Cokelat", class: "bg-orange-900 text-white font-bold" }
                  ].map((pin, idx) => `
                    <div class="p-2 border rounded-xl flex flex-col justify-between h-20 ${pin.class}">
                      <span class="text-[10px] font-extrabold">${idx + 1}</span>
                      <span class="text-[8px] font-bold leading-tight block truncate">${pin.color}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- T568B Standard Card -->
              <div class="p-6 glass rounded-3xl space-y-4 border-l-4 border-l-amber-500">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-bold text-white font-display">Susunan T568B (Standar B)</h3>
                  <span class="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono text-[10px] font-bold">Standard B (Paling Umum)</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">Standar paling populer yang umum dipakai untuk koneksi port LAN default di industri.</p>
                <div class="grid grid-cols-8 gap-1.5 font-mono text-center pt-3">
                  ${[
                    { color: "Putih Orange", class: "bg-amber-500/25 border-amber-500 text-amber-400" },
                    { color: "Orange", class: "bg-amber-600 text-slate-950 font-bold" },
                    { color: "Putih Hijau", class: "bg-emerald-500/25 border-emerald-500 text-emerald-400" },
                    { color: "Biru", class: "bg-blue-600 text-white font-bold" },
                    { color: "Putih Biru", class: "bg-blue-500/25 border-blue-500 text-blue-400" },
                    { color: "Hijau", class: "bg-emerald-600 text-slate-950 font-bold" },
                    { color: "Putih Cokelat", class: "bg-orange-800/25 border-orange-800 text-orange-400" },
                    { color: "Cokelat", class: "bg-orange-900 text-white font-bold" }
                  ].map((pin, idx) => `
                    <div class="p-2 border rounded-xl flex flex-col justify-between h-20 ${pin.class}">
                      <span class="text-[10px] font-extrabold">${idx + 1}</span>
                      <span class="text-[8px] font-bold leading-tight block truncate">${pin.color}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Difference guide straight and cross -->
              <div class="p-6 glass rounded-3xl space-y-2 md:col-span-2">
                <h4 class="text-sm font-bold text-white">Panduan Penggunaan Tipe Kabel:</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h5 class="font-bold text-emerald-400 mb-1">🔗 Kabel Straight-Through (T568B ke T568B)</h5>
                    <p class="leading-normal">Digunakan untuk menghubungkan **dua perangkat berbeda** kelas:</p>
                    <ul class="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                      <li>Komputer ke Switch</li>
                      <li>Switch ke Router</li>
                      <li>Access Point ke Switch</li>
                    </ul>
                  </div>
                  <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <h5 class="font-bold text-amber-400 mb-1">🔗 Kabel Crossover (T568A ke T568B)</h5>
                    <p class="leading-normal">Digunakan untuk menghubungkan **dua perangkat yang sama** kelas:</p>
                    <ul class="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                      <li>Komputer ke Komputer</li>
                      <li>Switch ke Switch</li>
                      <li>Router ke Router</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 4. TOOL: PASSWORD & QR GENERATORS -->
          ${activeTool === 'security' ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Password Gen -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Password Generator</h3>
                <div class="space-y-4 text-xs">
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Panjang Karakter (<span id="passLenVal">12</span>)</label>
                    <input type="range" id="passLenInput" min="6" max="32" value="12" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer">
                  </div>
                  <div class="space-y-2 text-slate-300">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" id="passInclSym" checked class="rounded border-slate-700 bg-slate-900 text-cyan-500">
                      Sertakan Simbol (!@#$%^&*)
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="checkbox" id="passInclNum" checked class="rounded border-slate-700 bg-slate-900 text-cyan-500">
                      Sertakan Angka (0-9)
                    </label>
                  </div>
                  <div class="pt-3">
                    <button id="generatePassBtn" class="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all">Generate Password</button>
                  </div>
                  <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
                    <span id="generatedPassDisplay" class="text-cyan-300 font-bold break-all select-all">PasswordAman123!</span>
                    <button id="copyPassBtn" class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Copy Password">
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <!-- QR Generator -->
              <div class="p-6 glass rounded-3xl space-y-4 text-center">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider text-left">Quick QR Code Generator</h3>
                <div class="space-y-4 text-left text-xs">
                  <div>
                    <label class="block text-xs text-slate-400 font-semibold mb-1">Teks / URL Tujuan</label>
                    <input type="text" id="qrTextInput" value="https://classhub.local" class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                  </div>
                  <div>
                    <button id="generateQrBtn" class="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-xs transition-all">Generate QR</button>
                  </div>
                </div>
                <div class="mx-auto w-32 h-32 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                  <img id="qrImageDisplay" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://classhub.local" class="w-full h-full object-contain">
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 5. TOOL: FLASHCARDS -->
          ${activeTool === 'flashcards' ? `
            <div class="max-w-md mx-auto p-6 text-center space-y-6">
              <span class="text-xs text-slate-500 font-mono font-bold uppercase block">Game Flashcard Ujian TKJ</span>
              
              <div id="flashcardBox" class="w-full h-64 bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-800 hover:border-cyan-500/20 p-8 flex flex-col justify-between shadow-xl cursor-pointer transition-all duration-500 transform relative group">
                <div class="absolute inset-0 bg-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span class="text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider" id="flashcardSide">Pertanyaan</span>
                <div class="flex items-center justify-center flex-1">
                  <h3 class="text-base font-bold text-slate-100 font-display leading-relaxed" id="flashcardText">Loading...</h3>
                </div>
                <span class="text-[9px] text-slate-500 font-sans italic block">Klik kartu untuk membalik jawaban</span>
              </div>

              <div class="flex justify-between items-center px-4">
                <button id="prevFlashcardBtn" class="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-white transition-all text-xs">◀ Prev</button>
                <span class="text-xs font-mono text-slate-400" id="flashcardProgress">1 / 10</span>
                <button id="nextFlashcardBtn" class="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-white transition-all text-xs">Next ▶</button>
              </div>
            </div>
          ` : ""}

          <!-- 6. TOOL: DIAGNOSTICS SIMULATOR -->
          ${activeTool === 'diagnostics' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Config Panel -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="activity" class="text-cyan-400 w-4 h-4"></i> Diagnostik Simulator
                </h3>
                <div class="space-y-3 text-xs">
                  <div>
                    <label class="block text-slate-400 font-semibold mb-1">Target Host</label>
                    <select id="diagTarget" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                      <option value="gateway">Internal Gateway (192.168.1.1)</option>
                      <option value="dns" selected>DNS Google (8.8.8.8)</option>
                      <option value="web">Web Sekolah (103.12.5.4)</option>
                      <option value="cloud">Hosting Cloud (172.217.1.100)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-slate-400 font-semibold mb-1">Kondisi Jaringan</label>
                    <select id="diagCondition" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                      <option value="stable">Lancar / Normal (0% Loss)</option>
                      <option value="intermittent">Jejaring Rontok / RTO Sebagian (25% Loss)</option>
                      <option value="rto">Kabel Terputus / RTO Total (100% Loss)</option>
                      <option value="unreachable">IP Konflik / Unreachable (Host Unreachable)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-slate-400 font-semibold mb-1">Metode Diagnostik</label>
                    <div class="grid grid-cols-2 gap-2 mt-1">
                      <label class="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/40">
                        <input type="radio" name="diagCmd" value="ping" checked class="text-cyan-500">
                        <span>Ping Test</span>
                      </label>
                      <label class="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/40">
                        <input type="radio" name="diagCmd" value="trace" class="text-cyan-500">
                        <span>Traceroute</span>
                      </label>
                    </div>
                  </div>
                  <div class="pt-2">
                    <button id="startDiagBtn" class="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                      <i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK
                    </button>
                  </div>
                </div>
              </div>

              <!-- Terminal & Visual Path -->
              <div class="lg:col-span-2 space-y-4">
                <!-- Visual Path -->
                <div class="p-6 glass rounded-3xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Topologi Jalur Paket</h4>
                  <div class="flex items-center justify-between px-2 py-4 relative bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                    <!-- Progress Connection lines -->
                    <div class="absolute top-[34px] left-[10%] right-[10%] h-0.5 bg-slate-800 z-0">
                      <div id="diagProgressLine" class="h-full bg-cyan-400 w-0 transition-all duration-300"></div>
                    </div>

                    <!-- Nodes -->
                    <div class="flex flex-col items-center z-10 w-12 text-center">
                      <div id="node-client" class="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center transition-all">
                        <i data-lucide="laptop" class="w-5 h-5"></i>
                      </div>
                      <span class="text-[9px] text-slate-400 mt-1.5 font-bold font-sans">Siswa (PC)</span>
                    </div>

                    <div class="flex flex-col items-center z-10 w-12 text-center">
                      <div id="node-switch" class="w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all">
                        <i data-lucide="layers" class="w-5 h-5"></i>
                      </div>
                      <span class="text-[9px] text-slate-400 mt-1.5 font-bold font-sans">Switch</span>
                    </div>

                    <div class="flex flex-col items-center z-10 w-12 text-center">
                      <div id="node-router" class="w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all">
                        <i data-lucide="router" class="w-5 h-5"></i>
                      </div>
                      <span class="text-[9px] text-slate-400 mt-1.5 font-bold font-sans">Router</span>
                    </div>

                    <div class="flex flex-col items-center z-10 w-12 text-center">
                      <div id="node-cloud" class="w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all">
                        <i data-lucide="globe" class="w-5 h-5"></i>
                      </div>
                      <span class="text-[9px] text-slate-400 mt-1.5 font-bold font-sans">ISP Internet</span>
                    </div>

                    <div class="flex flex-col items-center z-10 w-12 text-center">
                      <div id="node-target" class="w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all animate-none">
                        <i data-lucide="server" class="w-5 h-5"></i>
                      </div>
                      <span class="text-[9px] text-slate-400 mt-1.5 font-bold font-sans" id="nodeTargetLabel">Target</span>
                    </div>
                  </div>
                </div>

                <!-- Terminal -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs px-2">
                    <span class="text-slate-400 font-mono">CLI TERMINAL OUTPUT</span>
                    <button id="clearDiagBtn" class="text-[10px] text-slate-500 hover:text-white transition">Clear Terminal</button>
                  </div>
                  <div id="diagTerminal" class="bg-black text-emerald-400 font-mono p-4 rounded-3xl h-60 overflow-y-auto text-xs space-y-1 border border-slate-800 leading-relaxed shadow-inner">
                    <div class="text-slate-500 italic">Klik "Mulai Diagnostik" untuk memulai pengiriman paket ICMP...</div>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 7. TOOL: SCRIPT GENERATOR -->
          ${activeTool === 'generator' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Form Panel -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="terminal" class="text-cyan-400 w-4 h-4"></i> Generator Konfigurasi
                </h3>
                <div class="space-y-4 text-xs">
                  <div>
                    <label class="block text-slate-400 font-semibold mb-1">Sistem Operasi Router</label>
                    <select id="genOS" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                      <option value="mikrotik" selected>MikroTik RouterOS (Winbox CLI)</option>
                      <option value="cisco">Cisco IOS (CLI Console)</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-slate-400 font-semibold mb-1">Fitur Jaringan</label>
                    <select id="genFeature" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none">
                      <option value="ip" selected>Alamat IP & Default Route Gateway</option>
                      <option value="dhcp">DHCP Server Setup (Bagi IP Otomatis)</option>
                      <option value="nat">NAT Masquerade & Port Forwarding</option>
                      <option value="limit">Simple Queue (Limit Bandwidth User)</option>
                    </select>
                  </div>

                  <div id="genFieldsContainer" class="space-y-3 pt-2 border-t border-slate-800/60">
                    <!-- Dynamic fields injected here -->
                  </div>

                  <div class="pt-2">
                    <button id="generateScriptBtn" class="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                      <i data-lucide="code" class="w-4 h-4"></i> GENERATE SCRIPT
                    </button>
                  </div>
                </div>
              </div>

              <!-- Output Panel -->
              <div class="lg:col-span-2 space-y-4 flex flex-col">
                <div class="flex items-center justify-between text-xs px-2">
                  <span class="text-slate-400 font-mono">GENERATED SCRIPT CLI</span>
                  <button id="copyScriptBtn" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Script
                  </button>
                </div>

                <div class="flex-1 relative min-h-[300px]">
                  <pre class="absolute inset-0 bg-slate-950 p-5 rounded-3xl border border-slate-850 text-cyan-300 font-mono text-xs overflow-auto leading-relaxed shadow-2xl" id="scriptOutputArea"># Pilih fitur dan klik "Generate Script" di samping!</pre>
                </div>

                <div class="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
                  <h4 class="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <i data-lucide="info" class="w-4 h-4 text-cyan-400"></i> Cara Memasang di Router Fisik:
                  </h4>
                  <ol class="list-decimal list-inside text-[11px] text-slate-400 space-y-1 leading-normal" id="genInstructions">
                    <li>Pilih fitur konfigurasi dan sistem operasi router terlebih dahulu.</li>
                    <li>Sesuaikan parameter seperti interface fisik, IP, dan gateway yang dipakai.</li>
                    <li>Salin script dan paste-kan ke terminal router Anda (New Terminal MikroTik / Privileged mode Cisco).</li>
                  </ol>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 8. TOOL: CLI LAB SIMULATOR -->
          ${activeTool === 'cliLab' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              <!-- Sidebar Router Status -->
              <div class="p-6 glass rounded-3xl space-y-4">
                <div class="flex items-center gap-2 text-cyan-400 font-bold">
                  <i data-lucide="award" class="w-5 h-5 text-rose-500 animate-pulse"></i>
                  <h3 class="text-sm uppercase tracking-wider font-display">Target Misi Jaringan</h3>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
                  Set IP address Router di <strong>ether1</strong> ke <strong>192.168.1.2/24</strong>, tambahkan default route ke gateway <strong>192.168.1.1</strong>, lalu jalankan perintah <code>/ping 8.8.8.8</code>!
                </p>

                <div class="pt-2 border-t border-slate-800 space-y-3">
                  <h4 class="text-xs font-bold text-slate-400">STATUS ROUTER BOARD</h4>
                  <div class="space-y-2 font-mono text-[11px]">
                    <div class="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span class="text-slate-400">Interface ether1 IP:</span>
                      <span class="font-bold ${cliIpEther1 ? 'text-emerald-400' : 'text-amber-500'}">${cliIpEther1 || 'Belum Diatur'}</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span class="text-slate-400">Interface ether2 IP:</span>
                      <span class="font-bold ${cliIpEther2 ? 'text-emerald-400' : 'text-slate-500'}">${cliIpEther2 || 'Belum Diatur'}</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span class="text-slate-400">Default Gateway WAN:</span>
                      <span class="font-bold ${cliGateway ? 'text-emerald-400' : 'text-amber-500'}">${cliGateway || 'Belum Diatur'}</span>
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <h4 class="text-[11px] font-bold text-white mb-2 flex items-center gap-1">
                    <i data-lucide="info" class="w-3.5 h-3.5 text-cyan-400"></i> Cheat Sheet Perintah:
                  </h4>
                  <ul class="list-disc list-inside text-[10px] text-slate-400 space-y-1.5 font-mono">
                    <li>/ip address add address=192.168.1.2/24 interface=ether1</li>
                    <li>/ip route add gateway=192.168.1.1</li>
                    <li>/ip address print</li>
                    <li>/ping 8.8.8.8</li>
                  </ul>
                </div>
              </div>

              <!-- Terminal Area -->
              <div class="lg:col-span-2 flex flex-col space-y-3">
                <div class="flex items-center justify-between text-xs px-2 font-mono text-slate-400">
                  <span>TERMINAL MIKROTIK (ROUTEROS SIMULATOR)</span>
                  <button id="cliResetBtn" class="text-rose-400 hover:text-rose-300 font-bold transition flex items-center gap-1">
                    <i data-lucide="refresh-cw" class="w-3 h-3"></i> Reset Router
                  </button>
                </div>
                <div class="flex-1 bg-black rounded-3xl p-5 border border-slate-800 font-mono text-xs flex flex-col min-h-[400px] shadow-2xl relative overflow-hidden">
                  <!-- Output Container -->
                  <div id="cliTerminalArea" class="flex-1 overflow-y-auto space-y-1.5 text-emerald-400 leading-relaxed pr-1 mb-3 max-h-[340px]">
                    ${cliTerminalLogs.map(log => `<div>${log}</div>`).join("")}
                  </div>
                  
                  <!-- Input Row -->
                  <div class="flex items-center gap-2 border-t border-slate-850 pt-3 text-slate-300">
                    <span class="whitespace-nowrap font-bold text-cyan-400">[admin@MikroTik] &gt;</span>
                    <input type="text" id="cliTerminalInput" class="flex-1 bg-transparent border-none outline-none text-emerald-300 font-mono text-xs focus:ring-0 p-0" placeholder="Ketik perintah di sini... (Ketik 'help' untuk daftar perintah)" autofocus autocomplete="off">
                  </div>
                </div>
              </div>
            </div>
          ` : ""}

          <!-- 9. TOOL: NETWORK TOPOLOGY BUILDER -->
          ${activeTool === 'topology' ? `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              <!-- Topologi Canvas & Connections -->
              <div class="lg:col-span-2 space-y-4">
                <div class="p-6 glass rounded-3xl space-y-4">
                  <div class="flex justify-between items-center">
                    <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
                      <i data-lucide="layers" class="text-cyan-400 w-4 h-4"></i> Desain Topologi & Visual Link
                    </h3>
                    <span class="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-lg font-mono">Real-Time Validation</span>
                  </div>

                  <!-- Topology Canvas Area -->
                  <div class="bg-slate-950/60 border border-slate-850 rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-around gap-6 min-h-[220px]">
                    <!-- Background Grid Effect -->
                    <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>
                    
                    <!-- Node 1: PC Client -->
                    <div class="flex flex-col items-center z-10 w-24 text-center cursor-pointer group topo-node" data-device="pc">
                      <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeSelectedTopoDevice === 'pc' ? 'bg-cyan-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700'}">
                        <i data-lucide="laptop" class="w-7 h-7"></i>
                      </div>
                      <span class="text-xs font-bold text-white mt-2">Siswa PC</span>
                      <span class="text-[9px] text-slate-500 font-mono mt-0.5">${topoPcIp}/${topoPcMask}</span>
                    </div>

                    <!-- Cable Indicator: PC to Switch -->
                    <div class="h-6 sm:h-0.5 sm:w-16 flex items-center justify-center relative">
                      ${(() => {
                        const conn = topoConnections.find(c => (c.from === "pc" && c.to === "switch") || (c.from === "switch" && c.to === "pc"));
                        if (!conn) return `<span class="text-[10px] text-slate-600 font-mono">Terputus</span>`;
                        return `
                          <div class="absolute inset-x-0 h-0.5 ${conn.type === 'straight' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 border-dashed border-t-2'}"></div>
                          <span class="absolute -top-4 text-[8px] font-mono font-bold ${conn.type === 'straight' ? 'text-emerald-400' : 'text-rose-400'}">${conn.type === 'straight' ? 'Straight' : 'Cross'}</span>
                        `;
                      })()}
                    </div>

                    <!-- Node 2: Switch -->
                    <div class="flex flex-col items-center z-10 w-24 text-center cursor-pointer group topo-node" data-device="switch">
                      <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeSelectedTopoDevice === 'switch' ? 'bg-cyan-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700'}">
                        <i data-lucide="layers" class="w-7 h-7"></i>
                      </div>
                      <span class="text-xs font-bold text-white mt-2">LAN Switch</span>
                      <span class="text-[9px] text-slate-500 font-mono mt-0.5">L2 Switch</span>
                    </div>

                    <!-- Cable Indicator: Switch to Router -->
                    <div class="h-6 sm:h-0.5 sm:w-16 flex items-center justify-center relative">
                      ${(() => {
                        const conn = topoConnections.find(c => (c.from === "switch" && c.to === "router") || (c.from === "router" && c.to === "switch"));
                        if (!conn) return `<span class="text-[10px] text-slate-600 font-mono">Terputus</span>`;
                        return `
                          <div class="absolute inset-x-0 h-0.5 ${conn.type === 'straight' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 border-dashed border-t-2'}"></div>
                          <span class="absolute -top-4 text-[8px] font-mono font-bold ${conn.type === 'straight' ? 'text-emerald-400' : 'text-rose-400'}">${conn.type === 'straight' ? 'Straight' : 'Cross'}</span>
                        `;
                      })()}
                    </div>

                    <!-- Node 3: Router -->
                    <div class="flex flex-col items-center z-10 w-24 text-center cursor-pointer group topo-node" data-device="router">
                      <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeSelectedTopoDevice === 'router' ? 'bg-cyan-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700'}">
                        <i data-lucide="router" class="w-7 h-7"></i>
                      </div>
                      <span class="text-xs font-bold text-white mt-2">MikroTik Router</span>
                      <span class="text-[9px] text-slate-500 font-mono mt-0.5">WAN/LAN GW</span>
                    </div>

                    <!-- Cable Indicator: Router to Cloud -->
                    <div class="h-6 sm:h-0.5 sm:w-16 flex items-center justify-center relative">
                      ${(() => {
                        const conn = topoConnections.find(c => (c.from === "router" && c.to === "cloud") || (c.from === "cloud" && c.to === "router"));
                        if (!conn) return `<span class="text-[10px] text-slate-600 font-mono">Terputus</span>`;
                        return `
                          <div class="absolute inset-x-0 h-0.5 ${conn.type === 'straight' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 border-dashed border-t-2'}"></div>
                          <span class="absolute -top-4 text-[8px] font-mono font-bold ${conn.type === 'straight' ? 'text-emerald-400' : 'text-rose-400'}">${conn.type === 'straight' ? 'Straight' : 'Cross'}</span>
                        `;
                      })()}
                    </div>

                    <!-- Node 4: ISP Cloud -->
                    <div class="flex flex-col items-center z-10 w-24 text-center cursor-pointer group topo-node" data-device="cloud">
                      <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeSelectedTopoDevice === 'cloud' ? 'bg-cyan-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700'}">
                        <i data-lucide="globe" class="w-7 h-7"></i>
                      </div>
                      <span class="text-xs font-bold text-white mt-2">ISP Cloud</span>
                      <span class="text-[9px] text-slate-500 font-mono mt-0.5">8.8.8.8 / WAN</span>
                    </div>
                  </div>

                  <!-- Cable Configuration Tool -->
                  <div class="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                    <h4 class="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
                      <i data-lucide="git-commit" class="text-cyan-400 w-4 h-4"></i> Hubungkan / Ubah Sambungan Kabel Jaringan
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label class="block text-slate-400 mb-1 text-[10px]">Dari Perangkat</label>
                        <select id="topoCableFrom" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white">
                          <option value="pc">Siswa PC</option>
                          <option value="switch">LAN Switch</option>
                          <option value="router">MikroTik Router</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-slate-400 mb-1 text-[10px]">Ke Perangkat</label>
                        <select id="topoCableTo" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white">
                          <option value="switch">LAN Switch</option>
                          <option value="router">MikroTik Router</option>
                          <option value="cloud">ISP Cloud</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-slate-400 mb-1 text-[10px]">Jenis Kabel UTP</label>
                        <select id="topoCableType" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white">
                          <option value="straight">Straight-Through (Lurus)</option>
                          <option value="cross">Crossover (Silang)</option>
                        </select>
                      </div>
                      <div class="flex items-end">
                        <button id="topoConnectBtn" class="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all">
                          Pasang Kabel
                        </button>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2" id="topoCurrentConnections">
                      <!-- Render current connections list -->
                    </div>
                  </div>
                </div>
              </div>

              <!-- Device Details & Control Console -->
              <div class="p-6 glass rounded-3xl space-y-4 flex flex-col justify-between">
                <div>
                  <div class="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                    <i data-lucide="settings" class="w-4 h-4"></i>
                    <h3 class="text-xs uppercase tracking-wider font-display">Konfigurasi Perangkat</h3>
                  </div>
                  <span class="text-[11px] text-slate-500">Klik salah satu perangkat di samping untuk mengubah parameternya!</span>

                  <!-- Parameter Editor Forms based on selected device -->
                  <div id="topoConfigEditorPanel" class="mt-4 pt-3 border-t border-slate-800 space-y-3 text-xs">
                    <!-- Dynamic content injected here based on activeSelectedTopoDevice -->
                  </div>
                </div>

                <!-- Diagnostics run section -->
                <div class="pt-4 border-t border-slate-850 space-y-3">
                  <button id="topoTestPingBtn" class="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10">
                    <i data-lucide="activity" class="w-5 h-5"></i> TES KONEKSI JARINGAN
                  </button>
                  <div id="topoDiagConsole" class="bg-slate-950 border border-slate-850 p-4 rounded-2xl h-44 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 leading-relaxed">
                    <div class="text-slate-500 italic">Klik tombol di atas untuk memulai pengiriman paket data dari PC Siswa menuju ISP Cloud...</div>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    renderIcons();

    // Attach tool tab listeners
    document.querySelectorAll(".tool-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        // Clear any running diagnostic intervals
        if (diagInterval) {
          clearInterval(diagInterval);
          diagInterval = null;
        }
        diagRunning = false;
        activeTool = btn.dataset.tool;
        renderUI();
      });
    });

    // Subnetting calculator listeners
    if (activeTool === "network") {
      const calcIp = document.getElementById("calcIp") as HTMLInputElement;
      const calcPrefix = document.getElementById("calcPrefix") as HTMLSelectElement;

      const updateSubnetCalc = () => {
        const ip = calcIp.value.trim();
        const prefix = parseInt(calcPrefix.value);

        if (!ip || isNaN(prefix)) return;

        // Perform standard subnet logic
        const ipOctets = ip.split(".").map(o => parseInt(o));
        if (ipOctets.length !== 4 || ipOctets.some(o => isNaN(o) || o < 0 || o > 255)) {
          return; // invalid IP
        }

        // Subnet Mask computation
        let mask = [0, 0, 0, 0];
        let bits = prefix;
        for (let i = 0; i < 4; i++) {
          if (bits >= 8) {
            mask[i] = 255;
            bits -= 8;
          } else {
            mask[i] = 256 - Math.pow(2, 8 - bits);
            bits = 0;
          }
        }

        // Wildcard Mask
        const wildcard = mask.map(m => 255 - m);

        // Network Address
        const network = ipOctets.map((o, idx) => o & mask[idx]);

        // Hosts count
        const hostCount = prefix >= 31 ? 0 : Math.pow(2, 32 - prefix) - 2;

        // Broadcast Address
        const broadcast = network.map((n, idx) => n | wildcard[idx]);

        // Usable ranges
        const firstUsable = [...network];
        if (prefix < 31) firstUsable[3] += 1;

        const lastUsable = [...broadcast];
        if (prefix < 31) lastUsable[3] -= 1;

        // Write results to DOM
        const resSubnet = document.getElementById("resSubnet");
        const resNetwork = document.getElementById("resNetwork");
        const resFirst = document.getElementById("resFirst");
        const resLast = document.getElementById("resLast");
        const resBroadcast = document.getElementById("resBroadcast");
        const resWildcard = document.getElementById("resWildcard");
        const resHosts = document.getElementById("resHosts");

        if (resSubnet) resSubnet.innerText = mask.join(".");
        if (resNetwork) resNetwork.innerText = network.join(".");
        if (resFirst) resFirst.innerText = firstUsable.join(".");
        if (resLast) resLast.innerText = lastUsable.join(".");
        if (resBroadcast) resBroadcast.innerText = broadcast.join(".");
        if (resWildcard) resWildcard.innerText = wildcard.join(".");
        if (resHosts) resHosts.innerText = `${hostCount.toLocaleString()} Host`;
      };

      calcIp.addEventListener("input", updateSubnetCalc);
      calcPrefix.addEventListener("change", updateSubnetCalc);
      updateSubnetCalc(); // run first

      // Byte Converter
      const byteInputVal = document.getElementById("byteInputVal") as HTMLInputElement;
      const byteUnitFrom = document.getElementById("byteUnitFrom") as HTMLSelectElement;

      const updateByteCalc = () => {
        const val = parseFloat(byteInputVal.value);
        const from = byteUnitFrom.value;
        if (isNaN(val)) return;

        // Convert to base: bit
        let bits = 0;
        if (from === "bit") bits = val;
        else if (from === "byte") bits = val * 8;
        else if (from === "kb") bits = val * 8 * 1024;
        else if (from === "mb") bits = val * 8 * 1024 * 1024;
        else if (from === "gb") bits = val * 8 * 1024 * 1024 * 1024;

        // Convert outward
        const bBits = bits;
        const bBytes = bits / 8;
        const bKB = bBytes / 1024;
        const bMB = bKB / 1024;
        const bGB = bMB / 1024;

        document.getElementById("byteResBits")!.innerText = `${bBits.toLocaleString()} b`;
        document.getElementById("byteResBytes")!.innerText = `${bBytes.toLocaleString()} B`;
        document.getElementById("byteResKB")!.innerText = `${bKB.toLocaleString(undefined, { maximumFractionDigits: 4 })} KB`;
        document.getElementById("byteResMB")!.innerText = `${bMB.toLocaleString(undefined, { maximumFractionDigits: 6 })} MB`;
        document.getElementById("byteResGB")!.innerText = `${bGB.toLocaleString(undefined, { maximumFractionDigits: 8 })} GB`;
      };

      byteInputVal.addEventListener("input", updateByteCalc);
      byteUnitFrom.addEventListener("change", updateByteCalc);
      updateByteCalc();
    }

    // Commands List & Ports List
    if (activeTool === "commands") {
      const cliSystemSelect = document.getElementById("cliSystemSelect") as HTMLSelectElement;
      const commandSearchInput = document.getElementById("commandSearchInput") as HTMLInputElement;
      const commandResults = document.getElementById("commandResults") as HTMLDivElement;

      const updateCommandsList = () => {
        const sys = cliSystemSelect.value;
        const search = commandSearchInput.value.toLowerCase().trim();
        const commands = COMMANDS_DATABASE[sys] || [];

        const filtered = commands.filter(c => c.cmd.toLowerCase().includes(search) || c.desc.toLowerCase().includes(search));

        if (filtered.length > 0) {
          commandResults.innerHTML = filtered.map(c => `
            <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between font-mono text-xs">
              <div class="flex justify-between items-center mb-1">
                <span class="text-cyan-400 font-bold break-all select-all font-mono">${c.cmd}</span>
                <span class="text-[9px] text-slate-500 uppercase">${sys}</span>
              </div>
              <p class="text-[11px] text-slate-300 font-sans mt-1 leading-normal">${c.desc}</p>
              <span class="text-[9px] text-slate-500 mt-2 block italic">Contoh: ${c.example}</span>
            </div>
          `).join("");
        } else {
          commandResults.innerHTML = `<p class="text-center py-6 text-slate-500 text-xs">Tidak ada command yang cocok.</p>`;
        }
      };

      cliSystemSelect.addEventListener("change", updateCommandsList);
      commandSearchInput.addEventListener("input", updateCommandsList);
      updateCommandsList();

      // Ports List
      const portSearchInput = document.getElementById("portSearchInput") as HTMLInputElement;
      const portResults = document.getElementById("portResults") as HTMLDivElement;

      const updatePortsList = () => {
        const search = portSearchInput.value.toLowerCase().trim();
        const filtered = PORT_REFERENCES.filter(p => p.port.includes(search) || p.protocol.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));

        if (filtered.length > 0) {
          portResults.innerHTML = filtered.map(p => `
            <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono text-[10px] mr-1.5">${p.port}</span>
                <span class="font-bold text-white font-mono">${p.protocol}</span>
                <p class="text-[10px] text-slate-400 mt-1 leading-snug">${p.description}</p>
              </div>
            </div>
          `).join("");
        } else {
          portResults.innerHTML = `<p class="text-center py-4 text-slate-500 text-xs">Port tidak ditemukan.</p>`;
        }
      };

      portSearchInput.addEventListener("input", updatePortsList);
      updatePortsList();
    }

    // Password Gen and QR Generator
    if (activeTool === "security") {
      const passLenInput = document.getElementById("passLenInput") as HTMLInputElement;
      const passLenVal = document.getElementById("passLenVal") as HTMLSpanElement;
      const passInclSym = document.getElementById("passInclSym") as HTMLInputElement;
      const passInclNum = document.getElementById("passInclNum") as HTMLInputElement;
      const generatePassBtn = document.getElementById("generatePassBtn");
      const generatedPassDisplay = document.getElementById("generatedPassDisplay") as HTMLSpanElement;
      const copyPassBtn = document.getElementById("copyPassBtn");

      passLenInput.addEventListener("input", () => {
        passLenVal.innerText = passLenInput.value;
      });

      const makePassword = () => {
        const len = parseInt(passLenInput.value);
        const hasSym = passInclSym.checked;
        const hasNum = passInclNum.checked;

        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (hasNum) chars += "0123456789";
        if (hasSym) chars += "!@#$%^&*()_+~|}{[]:;?><";

        let generated = "";
        for (let i = 0; i < len; i++) {
          generated += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        generatedPassDisplay.innerText = generated;
      };

      if (generatePassBtn) generatePassBtn.addEventListener("click", makePassword);
      if (copyPassBtn) {
        copyPassBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(generatedPassDisplay.innerText);
          toast.success("Password tersalin!");
        });
      }

      // QR Generator
      const qrTextInput = document.getElementById("qrTextInput") as HTMLInputElement;
      const generateQrBtn = document.getElementById("generateQrBtn");
      const qrImageDisplay = document.getElementById("qrImageDisplay") as HTMLImageElement;

      if (generateQrBtn) {
        generateQrBtn.addEventListener("click", () => {
          const txt = qrTextInput.value.trim();
          if (!txt) {
            toast.error("Silakan isi teks / URL terlebih dahulu.");
            return;
          }
          qrImageDisplay.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(txt)}`;
          toast.success("QR Code ter-generate!");
        });
      }
    }

    // Flashcard events
    if (activeTool === "flashcards") {
      let fIdx = 0;
      let side = "question"; // question, answer

      const flashcardBox = document.getElementById("flashcardBox") as HTMLDivElement;
      const flashcardSide = document.getElementById("flashcardSide") as HTMLSpanElement;
      const flashcardText = document.getElementById("flashcardText") as HTMLHeadingElement;
      const flashcardProgress = document.getElementById("flashcardProgress") as HTMLSpanElement;
      const prevFlashcardBtn = document.getElementById("prevFlashcardBtn");
      const nextFlashcardBtn = document.getElementById("nextFlashcardBtn");

      const drawCard = () => {
        const card = TKJ_FLASHCARDS[fIdx];
        flashcardProgress.innerText = `${fIdx + 1} / ${TKJ_FLASHCARDS.length}`;

        if (side === "question") {
          flashcardSide.innerText = "Pertanyaan";
          flashcardSide.className = "text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider";
          flashcardText.innerText = card.q;
        } else {
          flashcardSide.innerText = "Jawaban Resmi";
          flashcardSide.className = "text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider";
          flashcardText.innerText = card.a;
        }
      };

      flashcardBox.addEventListener("click", () => {
        // Toggle flip rotation animation
        flashcardBox.classList.toggle("rotate-y-180");
        side = side === "question" ? "answer" : "question";
        drawCard();
      });

      prevFlashcardBtn?.addEventListener("click", () => {
        fIdx = (fIdx - 1 + TKJ_FLASHCARDS.length) % TKJ_FLASHCARDS.length;
        side = "question";
        drawCard();
      });

      nextFlashcardBtn?.addEventListener("click", () => {
        fIdx = (fIdx + 1) % TKJ_FLASHCARDS.length;
        side = "question";
        drawCard();
      });

      drawCard();
    }

    // --- NEW INTERACTIVE TOOL: DIAGNOSTICS SIMULATOR EVENTS ---
    if (activeTool === "diagnostics") {
      const startDiagBtn = document.getElementById("startDiagBtn") as HTMLButtonElement;
      const clearDiagBtn = document.getElementById("clearDiagBtn") as HTMLButtonElement;
      const diagTerminal = document.getElementById("diagTerminal") as HTMLDivElement;
      const diagProgressLine = document.getElementById("diagProgressLine") as HTMLDivElement;

      const nodeClient = document.getElementById("node-client") as HTMLDivElement;
      const nodeSwitch = document.getElementById("node-switch") as HTMLDivElement;
      const nodeRouter = document.getElementById("node-router") as HTMLDivElement;
      const nodeCloud = document.getElementById("node-cloud") as HTMLDivElement;
      const nodeTarget = document.getElementById("node-target") as HTMLDivElement;
      const nodeTargetLabel = document.getElementById("nodeTargetLabel") as HTMLSpanElement;

      const diagTarget = document.getElementById("diagTarget") as HTMLSelectElement;
      const updateTargetLabel = () => {
        if (!diagTarget || !nodeTargetLabel) return;
        const val = diagTarget.value;
        if (val === "gateway") nodeTargetLabel.innerText = "Router LAN (192.168.1.1)";
        else if (val === "dns") nodeTargetLabel.innerText = "DNS Google (8.8.8.8)";
        else if (val === "web") nodeTargetLabel.innerText = "Web Sekolah (103.12.5.4)";
        else if (val === "cloud") nodeTargetLabel.innerText = "Hosting Cloud (172.217.1.100)";
      };
      if (diagTarget) {
        diagTarget.addEventListener("change", updateTargetLabel);
        updateTargetLabel();
      }

      if (clearDiagBtn && diagTerminal) {
        clearDiagBtn.addEventListener("click", () => {
          diagTerminal.innerHTML = `<div class="text-slate-500 italic">Terminal dibersihkan...</div>`;
        });
      }

      if (startDiagBtn && diagTerminal && diagProgressLine) {
        startDiagBtn.addEventListener("click", () => {
          if (diagRunning) {
            if (diagInterval) {
              clearInterval(diagInterval);
              diagInterval = null;
            }
            diagRunning = false;
            startDiagBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK`;
            diagProgressLine.style.width = "0%";
            
            [nodeClient, nodeSwitch, nodeRouter, nodeCloud, nodeTarget].forEach(node => {
              if (node) {
                node.className = "w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all";
              }
            });
            if (nodeClient) nodeClient.className = "w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center transition-all";
            
            diagTerminal.innerHTML += `<div class="text-red-400 font-bold">--- DIAGNOSTIK DIHENTIKAN OLEH USER ---</div>`;
            diagTerminal.scrollTop = diagTerminal.scrollHeight;
            renderIcons();
            return;
          }

          diagRunning = true;
          startDiagBtn.innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> HENTIKAN`;
          renderIcons();

          const targetVal = diagTarget ? diagTarget.value : "dns";
          const conditionVal = (document.getElementById("diagCondition") as HTMLSelectElement)?.value || "stable";
          const cmdVal = (document.querySelector('input[name="diagCmd"]:checked') as HTMLInputElement)?.value || "ping";

          let targetIp = "8.8.8.8";
          let targetName = "dns.google";
          if (targetVal === "gateway") { targetIp = "192.168.1.1"; targetName = "router.local"; }
          else if (targetVal === "web") { targetIp = "103.12.5.4"; targetName = "website-sekolah.sch.id"; }
          else if (targetVal === "cloud") { targetIp = "172.217.1.100"; targetName = "internal.cloud"; }

          diagTerminal.innerHTML = `<div class="text-slate-300 font-bold">Memulai sesi ${cmdVal.toUpperCase()} ke ${targetName} (${targetIp})...</div>`;
          
          [nodeClient, nodeSwitch, nodeRouter, nodeCloud, nodeTarget].forEach(node => {
            if (node) node.className = "w-10 h-10 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center transition-all";
          });
          if (nodeClient) nodeClient.className = "w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-all";

          let step = 0;
          let packetCount = 0;
          let rttTotal = 0;
          let packetSuccess = 0;

          const runStep = () => {
            if (!diagRunning) return;

            if (step === 0) {
              diagProgressLine.style.width = "25%";
              if (nodeSwitch) nodeSwitch.className = "w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-all animate-pulse";
              diagTerminal.innerHTML += `<div class="text-slate-400">[info] Mengirim sinyal fisik Ethernet ke Switch terdekat... OK</div>`;
            }
            else if (step === 1) {
              if (conditionVal === "rto") {
                diagProgressLine.style.width = "40%";
                diagProgressLine.className = "h-full bg-red-500 transition-all duration-300";
                if (nodeSwitch) nodeSwitch.className = "w-10 h-10 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 flex items-center justify-center transition-all";
                diagTerminal.innerHTML += `<div class="text-red-500 font-bold">[error] Sinyal fisik terputus! Kabel LAN terlepas / rusak di port Switch!</div>`;
                
                diagInterval = setInterval(() => {
                  if (packetCount < 4) {
                    diagTerminal.innerHTML += `<div class="text-red-400">Request timed out. (icmp_seq=${packetCount + 1})</div>`;
                    diagTerminal.scrollTop = diagTerminal.scrollHeight;
                    packetCount++;
                  } else {
                    clearInterval(diagInterval);
                    diagTerminal.innerHTML += `<div class="text-yellow-400 mt-2">Saran Pemecahan Masalah:</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">1. Periksa sambungan fisik kabel RJ45 dari komputer ke Switch.</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">2. Pastikan lampu indikator port LAN di Switch menyala.</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">3. Coba lakukan crimping ulang kabel UTP jika terdapat pin longgar.</div>`;
                    startDiagBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK`;
                    diagRunning = false;
                    renderIcons();
                  }
                }, 800);
                return;
              }

              diagProgressLine.style.width = "50%";
              if (nodeRouter) nodeRouter.className = "w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-all animate-pulse";
              diagTerminal.innerHTML += `<div class="text-slate-400">[info] Menghubungi Local Gateway Router (${targetVal === "gateway" ? targetIp : "192.168.1.1"})... OK</div>`;
            }
            else if (step === 2) {
              if (conditionVal === "unreachable") {
                diagProgressLine.style.width = "50%";
                if (nodeRouter) nodeRouter.className = "w-10 h-10 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 flex items-center justify-center transition-all";
                diagTerminal.innerHTML += `<div class="text-red-500 font-bold">[error] Router mendeteksi kesalahan rute / IP Conflict!</div>`;
                
                diagInterval = setInterval(() => {
                  if (packetCount < 4) {
                    diagTerminal.innerHTML += `<div class="text-red-400">From 192.168.1.1: Destination Host Unreachable. (icmp_seq=${packetCount + 1})</div>`;
                    diagTerminal.scrollTop = diagTerminal.scrollHeight;
                    packetCount++;
                  } else {
                    clearInterval(diagInterval);
                    diagTerminal.innerHTML += `<div class="text-yellow-400 mt-2">Saran Pemecahan Masalah:</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">1. Pastikan IP Address komputer Anda tidak duplikat dengan perangkat lain (IP Conflict).</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">2. Periksa apakah setelan Default Gateway di konfigurasi IP Anda sudah tepat mengarah ke 192.168.1.1.</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">3. Pastikan routing statis / dinamis di dalam Router dikonfigurasi dengan benar.</div>`;
                    startDiagBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK`;
                    diagRunning = false;
                    renderIcons();
                  }
                }, 800);
                return;
              }

              if (targetVal === "gateway") {
                diagProgressLine.style.width = "100%";
                if (nodeTarget) nodeTarget.className = "w-10 h-10 rounded-full bg-emerald-500 border border-emerald-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30";
                step = 4;
                runStep();
                return;
              }

              diagProgressLine.style.width = "75%";
              if (nodeCloud) nodeCloud.className = "w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-all animate-pulse";
              diagTerminal.innerHTML += `<div class="text-slate-400">[info] Meneruskan paket melalui interface WAN ke ISP Backbone... OK</div>`;
            }
            else if (step === 3) {
              diagProgressLine.style.width = "100%";
              if (nodeTarget) nodeTarget.className = "w-10 h-10 rounded-full bg-emerald-500 border border-emerald-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30";
              diagTerminal.innerHTML += `<div class="text-slate-400">[info] Mencapai server tujuan ${targetName} (${targetIp})... OK</div>`;
            }
            else {
              if (cmdVal === "ping") {
                diagTerminal.innerHTML += `<div class="text-emerald-400 font-bold mt-2">PING ${targetIp} (${targetIp}) 56(84) bytes of data.</div>`;
                diagInterval = setInterval(() => {
                  if (packetCount < 4) {
                    if (conditionVal === "intermittent" && Math.random() < 0.4) {
                      diagTerminal.innerHTML += `<div class="text-red-400">Request timed out. (icmp_seq=${packetCount + 1})</div>`;
                    } else {
                      const rtt = Math.floor(10 + Math.random() * 15);
                      rttTotal += rtt;
                      packetSuccess++;
                      diagTerminal.innerHTML += `<div class="text-emerald-400">64 bytes from ${targetIp}: icmp_seq=${packetCount + 1} ttl=56 time=${rtt}.2 ms</div>`;
                    }
                    diagTerminal.scrollTop = diagTerminal.scrollHeight;
                    packetCount++;
                  } else {
                    clearInterval(diagInterval);
                    const avgRtt = packetSuccess > 0 ? (rttTotal / packetSuccess).toFixed(1) : "0.0";
                    const lossRate = ((4 - packetSuccess) / 4) * 100;
                    
                    diagTerminal.innerHTML += `<div class="text-cyan-400 font-bold mt-2">--- ${targetIp} ping statistics ---</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300">4 packets transmitted, ${packetSuccess} received, ${lossRate}% packet loss, time 3004ms</div>`;
                    diagTerminal.innerHTML += `<div class="text-slate-300">rtt min/avg/max = 10.1/${avgRtt}/24.8 ms</div>`;

                    if (lossRate > 0) {
                      diagTerminal.innerHTML += `<div class="text-yellow-400 mt-2">Saran Pemecahan Masalah:</div>`;
                      diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">1. Terdeteksi Packet Loss sebesar ${lossRate}%. Jaringan sedang tidak stabil / padat.</div>`;
                      diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">2. Periksa utilisasi bandwidth pada router (apakah ada user mengunduh berkas besar).</div>`;
                      diagTerminal.innerHTML += `<div class="text-slate-300 pl-4">3. Hubungi ISP jika masalah kelambatan rute tetap berlanjut.</div>`;
                    } else {
                      diagTerminal.innerHTML += `<div class="text-emerald-400 font-extrabold mt-1">✓ JALUR KONEKSI BERSIH & SANGAT STABIL! SIAP DIGUNAKAN.</div>`;
                    }
                    
                    startDiagBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK`;
                    diagRunning = false;
                    renderIcons();
                  }
                }, 800);
              } else {
                diagTerminal.innerHTML += `<div class="text-emerald-400 font-bold mt-2">traceroute to ${targetIp}, 30 hops max, 60 byte packets</div>`;
                let hop = 1;
                diagInterval = setInterval(() => {
                  if (hop === 1) {
                    diagTerminal.innerHTML += `<div class="text-slate-300"> 1  router.local (192.168.1.1)  1.124 ms  1.082 ms  1.010 ms</div>`;
                  } else if (hop === 2 && targetVal !== "gateway") {
                    diagTerminal.innerHTML += `<div class="text-slate-300"> 2  10.100.24.1 (10.100.24.1)  4.324 ms  4.110 ms  3.992 ms</div>`;
                  } else if (hop === 3 && targetVal !== "gateway") {
                    if (conditionVal === "intermittent") {
                      diagTerminal.innerHTML += `<div class="text-slate-300"> 3  *  *  *</div>`;
                    } else {
                      diagTerminal.innerHTML += `<div class="text-slate-300"> 3  isp-backbone (180.250.3.1)  12.332 ms  12.012 ms  11.890 ms</div>`;
                    }
                  } else if (hop === 4 && targetVal !== "gateway") {
                    diagTerminal.innerHTML += `<div class="text-emerald-400 font-bold"> 4  ${targetName} (${targetIp})  ${Math.floor(15 + Math.random() * 5)}.210 ms  14.882 ms  14.112 ms</div>`;
                  } else {
                    clearInterval(diagInterval);
                    diagTerminal.innerHTML += `<div class="text-emerald-400 font-extrabold mt-2">✓ TRACEROUTE COMPLETED SUCCESSFULLY!</div>`;
                    startDiagBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> MULAI DIAGNOSTIK`;
                    diagRunning = false;
                    renderIcons();
                    return;
                  }
                  diagTerminal.scrollTop = diagTerminal.scrollHeight;
                  hop++;
                }, 700);
              }
              return;
            }

            diagTerminal.scrollTop = diagTerminal.scrollHeight;
            step++;
            setTimeout(runStep, 900);
          };

          runStep();
        });
      }
    }

    // --- NEW INTERACTIVE TOOL: SCRIPT GENERATOR EVENTS ---
    if (activeTool === "generator") {
      const genOS = document.getElementById("genOS") as HTMLSelectElement;
      const genFeature = document.getElementById("genFeature") as HTMLSelectElement;
      const genFieldsContainer = document.getElementById("genFieldsContainer") as HTMLDivElement;
      const generateScriptBtn = document.getElementById("generateScriptBtn");
      const copyScriptBtn = document.getElementById("copyScriptBtn");
      const scriptOutputArea = document.getElementById("scriptOutputArea") as HTMLPreElement;
      const genInstructions = document.getElementById("genInstructions") as HTMLOListElement;

      const updateFields = () => {
        if (!genOS || !genFeature || !genFieldsContainer) return;
        const os = genOS.value;
        const feature = genFeature.value;
        
        let fieldsHtml = "";
        if (feature === "ip") {
          fieldsHtml = `
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Interface Fisik WAN</label>
              <input type="text" id="fieldInterface" value="${os === 'mikrotik' ? 'ether1' : 'GigabitEthernet0/1'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">IP Address & Subnet</label>
              <input type="text" id="fieldIp" value="${os === 'mikrotik' ? '192.168.88.2/24' : '192.168.88.2 255.255.255.0'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Gateway IP Address</label>
              <input type="text" id="fieldGateway" value="192.168.88.1" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
          `;
        } else if (feature === "dhcp") {
          fieldsHtml = `
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Interface Lokal (LAN)</label>
              <input type="text" id="fieldInterface" value="${os === 'mikrotik' ? 'ether2' : 'GigabitEthernet0/2'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">IP Address Router LAN</label>
              <input type="text" id="fieldIp" value="${os === 'mikrotik' ? '192.168.10.1/24' : '192.168.10.1 255.255.255.0'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Rentang Pool DHCP</label>
              <input type="text" id="fieldPool" value="192.168.10.10-192.168.10.100" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">DNS Server</label>
              <input type="text" id="fieldDns" value="8.8.8.8" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
          `;
        } else if (feature === "nat") {
          fieldsHtml = `
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Interface Internet (WAN)</label>
              <input type="text" id="fieldInterface" value="${os === 'mikrotik' ? 'ether1' : 'GigabitEthernet0/1'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div class="space-y-2 pt-1 border-t border-slate-850">
              <label class="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" id="fieldForwardCheck" class="rounded bg-slate-950 border-slate-800 text-cyan-500">
                Sertakan Port Forwarding
              </label>
              <div id="forwardContainer" class="hidden space-y-2 pl-4 border-l border-slate-800">
                <div>
                  <label class="block text-[10px] text-slate-500 mb-0.5">Port Publik Terbuka</label>
                  <input type="text" id="fieldExtPort" value="80" class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded outline-none text-white text-[11px] font-mono">
                </div>
                <div>
                  <label class="block text-[10px] text-slate-500 mb-0.5">IP Server Lokal</label>
                  <input type="text" id="fieldIntIp" value="192.168.10.50" class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded outline-none text-white text-[11px] font-mono">
                </div>
              </div>
            </div>
          `;
        } else if (feature === "limit") {
          fieldsHtml = `
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Target IP / Network LAN</label>
              <input type="text" id="fieldIp" value="${os === 'mikrotik' ? '192.168.10.0/24' : '192.168.10.0'}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono">
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Batas Upload Maksimum</label>
              <select id="fieldUpload" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none">
                <option value="512k">512 Kbps</option>
                <option value="1M">1 Mbps</option>
                <option value="2M" selected>2 Mbps</option>
                <option value="5M">5 Mbps</option>
                <option value="10M">10 Mbps</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Batas Download Maksimum</label>
              <select id="fieldDownload" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none">
                <option value="1M">1 Mbps</option>
                <option value="2M">2 Mbps</option>
                <option value="5M" selected>5 Mbps</option>
                <option value="10M">10 Mbps</option>
                <option value="20M">20 Mbps</option>
              </select>
            </div>
          `;
        }

        genFieldsContainer.innerHTML = fieldsHtml;

        const fCheck = document.getElementById("fieldForwardCheck") as HTMLInputElement;
        const fCont = document.getElementById("forwardContainer") as HTMLDivElement;
        if (fCheck && fCont) {
          fCheck.addEventListener("change", () => {
            fCont.style.display = fCheck.checked ? "block" : "none";
          });
        }
      };

      if (genOS) {
        genOS.addEventListener("change", () => {
          selectedGenOS = genOS.value;
          updateFields();
        });
      }
      if (genFeature) {
        genFeature.addEventListener("change", () => {
          selectedGenFeature = genFeature.value;
          updateFields();
        });
      }
      updateFields();

      if (generateScriptBtn) {
        generateScriptBtn.addEventListener("click", () => {
          const os = genOS ? genOS.value : "mikrotik";
          const feat = genFeature ? genFeature.value : "ip";

          const interfaceVal = (document.getElementById("fieldInterface") as HTMLInputElement)?.value || "";
          const ipVal = (document.getElementById("fieldIp") as HTMLInputElement)?.value || "";
          const gatewayVal = (document.getElementById("fieldGateway") as HTMLInputElement)?.value || "";
          const poolVal = (document.getElementById("fieldPool") as HTMLInputElement)?.value || "";
          const dnsVal = (document.getElementById("fieldDns") as HTMLInputElement)?.value || "";
          const fCheck = (document.getElementById("fieldForwardCheck") as HTMLInputElement)?.checked || false;
          const extPort = (document.getElementById("fieldExtPort") as HTMLInputElement)?.value || "80";
          const intIp = (document.getElementById("fieldIntIp") as HTMLInputElement)?.value || "";
          const uploadSpeed = (document.getElementById("fieldUpload") as HTMLSelectElement)?.value || "2M";
          const downloadSpeed = (document.getElementById("fieldDownload") as HTMLSelectElement)?.value || "5M";

          let script = "";
          let instruct = "";

          if (os === "mikrotik") {
            if (feat === "ip") {
              script = `# --- KELAS XII TKJ 1 ROUTER BOARD SCRIPT ---
# Konfigurasi IP Address & Default Route Gateway WAN
/ip address add address=${ipVal} interface=${interfaceVal} comment="IP Publik dari ISP"

# Menambahkan rute default mengarah ke IP Gateway ISP
/ip route add gateway=${gatewayVal} comment="Rute default ke Gateway WAN"

# Mengatur Server Resolver DNS
/ip dns set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

# Cetak kesuksesan di log terminal MikroTik
/log info "IP Address & Default Route WAN Terkonfigurasi Berhasil!"`;

              instruct = `<li>Salin baris script di atas sepenuhnya.</li>
<li>Buka Winbox, klik tombol <strong>New Terminal</strong> di sidebar kiri.</li>
<li>Klik kanan di terminal MikroTik, lalu pilih <strong>Paste</strong>.</li>
<li>Ketik <code>/ip route print</code> untuk memeriksa apakah rute sudah aktif.</li>`;
            } else if (feat === "dhcp") {
              script = `# --- KELAS XII TKJ 1 ROUTER BOARD SCRIPT ---
# Konfigurasi IP LAN Router Board
/ip address add address=${ipVal} interface=${interfaceVal} comment="IP LAN Router Gateway"

# Membuat Kolam Alamat (IP Pool) untuk Client
/ip pool add name=dhcp_pool ranges=${poolVal}

# Mengaktifkan DHCP Server di interface LAN
/ip dhcp-server add name=dhcp_lan interface=${interfaceVal} address-pool=dhcp_pool disabled=no

# Mengatur informasi rute dan DNS yang dibagikan ke Client DHCP
/ip dhcp-server network add address=${ipVal.split('.')[0] + '.' + ipVal.split('.')[1] + '.' + ipVal.split('.')[2] + '.0/24'} gateway=${ipVal.split('/')[0]} dns-server=${dnsVal}`;

              instruct = `<li>Pastikan port LAN terpasang pada interface <strong>${interfaceVal}</strong> router Anda.</li>
<li>Buka <strong>New Terminal</strong> di Winbox, lalu paste-kan kode di atas.</li>
<li>Periksa client Anda apakah sudah mendapatkan IP otomatis dari rentang <code>${poolVal}</code>.</li>`;
            } else if (feat === "nat") {
              script = `# --- KELAS XII TKJ 1 ROUTER BOARD SCRIPT ---
# Membuat NAT Masquerade agar semua klien LAN dapat berselancar internet
/ip firewall nat add chain=srcnat out-interface=${interfaceVal} action=masquerade comment="Sharing Internet ke Klien"`;

              if (fCheck) {
                script += `\n\n# Konfigurasi Port Forwarding (DST-NAT) dari publik ke Server Internal\n/ip firewall nat add chain=dstnat dst-port=${extPort} protocol=tcp in-interface=${interfaceVal} action=dst-nat to-addresses=${intIp} to-ports=${extPort} comment="Akses Server Internal"`;
              }

              instruct = `<li>Script NAT Masquerade akan membagi bandwidth internet interface WAN <strong>${interfaceVal}</strong> ke klien.</li>
<li>Paste script ini ke terminal Winbox.</li>
<li>Uji koneksi dengan ping dari PC klien ke <code>8.8.8.8</code>.</li>`;
            } else if (feat === "limit") {
              script = `# --- KELAS XII TKJ 1 ROUTER BOARD SCRIPT ---
# Membatasi Kecepatan Maksimum Klien (Upload/Download)
/queue simple add name="Batas_LAN_Klien" target=${ipVal} max-limit=${uploadSpeed}/${downloadSpeed} comment="Limit Simple Kelas XII TKJ 1"`;

              instruct = `<li>Pastikan target IP / Network <strong>${ipVal}</strong> sesuai dengan subnet LAN Anda.</li>
<li>Paste script di terminal Winbox.</li>
<li>Buka menu <strong>Queues</strong> di Winbox untuk memantau warna indikator saat klien beraktivitas.</li>`;
            }
          } else {
            if (feat === "ip") {
              script = `! --- KELAS XII TKJ 1 CISCO IOS SCRIPT ---
enable
configure terminal
!
interface ${interfaceVal}
 description KONEKSI_KE_INTERNET_WAN
 ip address ${ipVal}
 no shutdown
exit
!
! Menambahkan default route gateway ISP
ip route 0.0.0.0 0.0.0.0 ${gatewayVal}
!
! Mengatur nameserver DNS
ip name-server 8.8.8.8
!
end
write`;

              instruct = `<li>Buka sambungan Console / SSH ke Router Cisco Anda.</li>
<li>Masuk ke mode konfigurasi dengan mengetikkan <code>enable</code> dan <code>configure terminal</code>.</li>
<li>Copy-paste baris script di atas ke CLI terminal.</li>
<li>Ketik <code>show ip route</code> untuk memverifikasi rute gateway.</li>`;
            } else if (feat === "dhcp") {
              const baseNet = ipVal.split(' ')[0].split('.').slice(0, 3).join('.');
              script = `! --- KELAS XII TKJ 1 CISCO IOS SCRIPT ---
enable
configure terminal
!
! Mengecualikan IP statis router agar tidak crash terbagi otomatis
ip dhcp excluded-address ${baseNet}.1 ${baseNet}.9
!
! Membuat pool DHCP baru
ip dhcp pool POOL_XII_TKJ_1
 network ${ipVal}
 default-router ${baseNet}.1
 dns-server ${dnsVal}
exit
!
! Mengaktifkan port interface LAN
interface ${interfaceVal}
 description GATEWAY_LAN
 ip address ${ipVal}
 no shutdown
end
write`;

              instruct = `<li>Sambungkan PC klien ke interface <strong>${interfaceVal}</strong> Router Cisco.</li>
<li>Paste script di atas ke konfigurasi global CLI Cisco.</li>
<li>Ketik <code>show ip dhcp binding</code> untuk melihat alokasi IP otomatis.</li>`;
            } else if (feat === "nat") {
              script = `! --- KELAS XII TKJ 1 CISCO IOS SCRIPT ---
enable
configure terminal
!
! Mengatur peran interface NAT
interface ${interfaceVal}
 ip nat outside
exit
!
interface GigabitEthernet0/2
 ip nat inside
exit
!
! Membuat Access List yang diizinkan untuk internetan
access-list 1 permit 192.168.10.0 0.0.0.255
!
! Mengaktifkan Overload NAT (PAT)
ip nat inside source list 1 interface ${interfaceVal} overload`;

              if (fCheck) {
                script += `\n!\n! Port Forwarding DST-NAT statis ke Server Internal\nip nat inside source static tcp ${intIp} ${extPort} interface ${interfaceVal} ${extPort}`;
              }

              script += `\nend\nwrite`;

              instruct = `<li>Pastikan interface luar (WAN) adalah <strong>${interfaceVal}</strong>.</li>
<li>Paste-kan ke CLI router Cisco Anda.</li>
<li>Gunakan <code>show ip nat translations</code> untuk memantau pemetaan NAT.</li>`;
            } else if (feat === "limit") {
              script = `! --- KELAS XII TKJ 1 CISCO IOS SCRIPT ---
enable
configure terminal
!
! Membuat access list pemicu traffic client
access-list 101 permit ip any ${ipVal} 0.0.0.255
!
! Menggolongkan traffic ke Class Map
class-map MATCH_XII_TKJ
 match access-group 101
exit
!
! Menentukan batas kecepatan bandwidth di Policy Map
policy-map LIMIT_XII_TKJ
 class MATCH_XII_XII_TKJ
  police 5000000 conform-action transmit exceed-action drop
exit
!
! Memasang policy-map ke interface fisik LAN
interface GigabitEthernet0/2
 service-policy output LIMIT_XII_TKJ
end
write`;

              instruct = `<li>Script ini membatasi client LAN di port <strong>GigabitEthernet0/2</strong> dengan batas 5 Mbps.</li>
<li>Paste-kan script konfigurasi ke CLI Cisco.</li>
<li>Gunakan <code>show policy-map interface GigabitEthernet0/2</code> untuk memantau kelancaran traffic.</li>`;
            }
          }

          if (scriptOutputArea) scriptOutputArea.innerText = script;
          if (genInstructions) genInstructions.innerHTML = instruct;
          toast.success("Script berhasil dihasilkan!");
        });
      }

      if (copyScriptBtn) {
        copyScriptBtn.addEventListener("click", () => {
          if (!scriptOutputArea) return;
          const code = scriptOutputArea.innerText;
          if (code.startsWith("# Pilih") || code.startsWith("! Pilih")) {
            toast.error("Silakan generate script terlebih dahulu!");
            return;
          }
          navigator.clipboard.writeText(code);
          toast.success("Script tersalin ke clipboard!");
        });
      }
    }

    // --- NEW INTERACTIVE TOOL: CLI LAB SIMULATOR EVENTS ---
    if (activeTool === "cliLab") {
      const cliInput = document.getElementById("cliTerminalInput") as HTMLInputElement;
      const cliArea = document.getElementById("cliTerminalArea") as HTMLDivElement;
      const cliReset = document.getElementById("cliResetBtn");

      if (cliReset) {
        cliReset.addEventListener("click", () => {
          cliIpEther1 = "";
          cliIpEther2 = "";
          cliGateway = "";
          cliDns = "";
          cliTerminalLogs = [
            "Welcome to RouterOS Virtual CLI Lab (v7.12)",
            "Type 'help' or '?' to see a list of commands.",
            "--- MISSION: Configure ether1 IP to 192.168.1.2/24 and add gateway 192.168.1.1, then run '/ping 8.8.8.8' ---",
            ""
          ];
          renderUI();
          toast.success("Router board berhasil di-reboot & di-reset!");
        });
      }

      if (cliInput) {
        if (cliArea) cliArea.scrollTop = cliArea.scrollHeight;

        cliInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const cmd = cliInput.value.trim();
            if (!cmd) return;

            cliTerminalLogs.push(`[admin@MikroTik] &gt; ${cmd}`);
            
            const cleanCmd = cmd.toLowerCase().trim();
            if (cleanCmd === "help" || cleanCmd === "?") {
              cliTerminalLogs.push(
                "Daftar perintah yang didukung simulator:",
                "  /ip address add address=[IP/CIDR] interface=[ether1|ether2]",
                "  /ip address print  - menampilkan daftar IP address",
                "  /ip route add gateway=[IP]",
                "  /ip route print    - menampilkan daftar routing",
                "  /ping [IP]         - menguji koneksi (contoh: /ping 8.8.8.8)",
                "  /system resource print - menampilkan spesifikasi router",
                "  clear              - membersihkan layar terminal"
              );
            } else if (cleanCmd.startsWith("/ip address add")) {
              const addrMatch = cmd.match(/address=([^\s]+)/);
              const intMatch = cmd.match(/interface=([^\s]+)/);

              if (addrMatch && intMatch) {
                const address = addrMatch[1];
                const interfaceName = intMatch[1].toLowerCase();

                if (interfaceName === "ether1") {
                  cliIpEther1 = address;
                  cliTerminalLogs.push("✓ IP address ditambahkan di ether1.");
                } else if (interfaceName === "ether2") {
                  cliIpEther2 = address;
                  cliTerminalLogs.push("✓ IP address ditambahkan di ether2.");
                } else {
                  cliTerminalLogs.push("Error: interface tidak dikenali (hanya ether1 atau ether2).");
                }
              } else {
                cliTerminalLogs.push("Error: sintaks salah. Contoh: /ip address add address=192.168.1.2/24 interface=ether1");
              }
            } else if (cleanCmd === "/ip address print" || cleanCmd === "/ip address pr") {
              cliTerminalLogs.push(
                "Flags: D - dynamic, X - disabled, I - inactive, A - active",
                " #   ADDRESS            NETWORK         INTERFACE",
                ` 0   ${cliIpEther1 || 'unassigned'}     ${cliIpEther1 ? cliIpEther1.split('.')[0] + '.' + cliIpEther1.split('.')[1] + '.' + cliIpEther1.split('.')[2] + '.0' : 'unassigned'}   ether1`,
                ` 1   ${cliIpEther2 || 'unassigned'}     ${cliIpEther2 ? cliIpEther2.split('.')[0] + '.' + cliIpEther2.split('.')[1] + '.' + cliIpEther2.split('.')[2] + '.0' : 'unassigned'}   ether2`
              );
            } else if (cleanCmd.startsWith("/ip route add")) {
              const gwMatch = cmd.match(/gateway=([^\s]+)/);
              if (gwMatch) {
                cliGateway = gwMatch[1];
                cliTerminalLogs.push("✓ Gateway route ditambahkan.");
              } else {
                cliTerminalLogs.push("Error: sintaks salah. Contoh: /ip route add gateway=192.168.1.1");
              }
            } else if (cleanCmd === "/ip route print" || cleanCmd === "/ip route pr") {
              cliTerminalLogs.push(
                "Flags: X - disabled, A - active, D - dynamic, C - connect, S - static, R - rip",
                " #      DST-ADDRESS        GATEWAY            DISTANCE",
                ` 0  AS  0.0.0.0/0          ${cliGateway || 'unassigned'}         1`
              );
            } else if (cleanCmd.startsWith("/ping")) {
              const targetMatch = cmd.match(/\/ping\s+([^\s]+)/);
              if (targetMatch) {
                const target = targetMatch[1];
                if (target === "8.8.8.8") {
                  const isIpOk = cliIpEther1.includes("192.168.1.") && !cliIpEther1.startsWith("192.168.1.1/");
                  const isGwOk = cliGateway === "192.168.1.1";

                  if (isIpOk && isGwOk) {
                    cliTerminalLogs.push(
                      "  SEQ HOST                                     SIZE TTL TIME  STATUS",
                      "    0 8.8.8.8                                    56  64 24ms",
                      "    1 8.8.8.8                                    56  64 25ms",
                      "    2 8.8.8.8                                    56  64 22ms",
                      "  sent=3 received=3 packet-loss=0% min-rtt=22ms avg-rtt=23ms max-rtt=25ms",
                      "",
                      "🏆 MISI BERHASIL! Router Board Anda terhubung sempurna ke internet!"
                    );
                    Swal.fire({
                      title: "Misi CLI Berhasil!",
                      text: "Luar biasa! Anda berhasil mengonfigurasi IP address dan default gateway MikroTik ke internet!",
                      icon: "success",
                      confirmButtonText: "Mantap!"
                    });
                  } else if (!isIpOk) {
                    cliTerminalLogs.push(
                      "  SEQ HOST                                     SIZE TTL TIME  STATUS",
                      "    0 192.168.1.2                              ping: transmission failed",
                      "  sent=1 received=0 packet-loss=100%",
                      "Error: IP ether1 tidak berada di subnet yang sama dengan gateway (192.168.1.x/24) atau belum dikonfigurasi!"
                    );
                  } else {
                    cliTerminalLogs.push(
                      "  SEQ HOST                                     SIZE TTL TIME  STATUS",
                      "    0 8.8.8.8                                    host unreachable",
                      "  sent=1 received=0 packet-loss=100%",
                      "Error: Default route gateway belum diset ke 192.168.1.1!"
                    );
                  }
                } else {
                  cliTerminalLogs.push(`pinging ${target}... host unreachable.`);
                }
              } else {
                cliTerminalLogs.push("Error: tentukan target host untuk di-ping. Contoh: /ping 8.8.8.8");
              }
            } else if (cleanCmd === "/system resource print" || cleanCmd === "/system res pr") {
              cliTerminalLogs.push(
                "uptime: 2h41m15s",
                "version: 7.12 (stable)",
                "cpu: MIPSBE",
                "cpu-count: 1",
                "cpu-frequency: 650MHz",
                "free-memory: 112.5MiB",
                "total-memory: 128.0MiB"
              );
            } else if (cleanCmd === "clear") {
              cliTerminalLogs = [];
            } else {
              cliTerminalLogs.push("bad command name (line 1 column 1)");
            }

            cliInput.value = "";
            renderUI();
          }
        });
      }
    }

    // --- NEW INTERACTIVE TOOL: TOPOLOGY BUILDER EVENTS ---
    if (activeTool === "topology") {
      document.querySelectorAll(".topo-node").forEach((node: any) => {
        node.addEventListener("click", () => {
          activeSelectedTopoDevice = node.dataset.device;
          renderUI();
        });
      });

      const editPanel = document.getElementById("topoConfigEditorPanel");
      if (editPanel) {
        if (activeSelectedTopoDevice === "pc") {
          editPanel.innerHTML = `
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-white uppercase">Siswa PC LAN Client</span>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">IP Address</label>
                <input type="text" id="inpPcIp" value="${topoPcIp}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Prefix Subnet</label>
                <input type="text" id="inpPcMask" value="${topoPcMask}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Default Gateway IP</label>
                <input type="text" id="inpPcGateway" value="${topoPcGateway}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
            </div>
          `;
          document.getElementById("inpPcIp")?.addEventListener("input", (e: any) => { topoPcIp = e.target.value; });
          document.getElementById("inpPcMask")?.addEventListener("input", (e: any) => { topoPcMask = e.target.value; });
          document.getElementById("inpPcGateway")?.addEventListener("input", (e: any) => { topoPcGateway = e.target.value; });
        } else if (activeSelectedTopoDevice === "router") {
          editPanel.innerHTML = `
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-white uppercase">MikroTik Router Board</span>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Port 2 LAN IP (Gateway Klien)</label>
                <input type="text" id="inpRouterLanIp" value="${topoRouterLanIp}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Port 1 WAN IP (Dari ISP)</label>
                <input type="text" id="inpRouterWanIp" value="${topoRouterWanIp}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Default Gateway WAN (IP Cloud ISP)</label>
                <input type="text" id="inpRouterGateway" value="${topoRouterGateway}" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white font-mono text-xs">
              </div>
              <div class="pt-1">
                <label class="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" id="inpRouterNat" ${topoRouterNatEnabled ? "checked" : ""} class="rounded bg-slate-950 border-slate-800 text-cyan-500">
                  Aktifkan NAT Masquerade
                </label>
              </div>
            </div>
          `;
          document.getElementById("inpRouterLanIp")?.addEventListener("input", (e: any) => { topoRouterLanIp = e.target.value; });
          document.getElementById("inpRouterWanIp")?.addEventListener("input", (e: any) => { topoRouterWanIp = e.target.value; });
          document.getElementById("inpRouterGateway")?.addEventListener("input", (e: any) => { topoRouterGateway = e.target.value; });
          document.getElementById("inpRouterNat")?.addEventListener("change", (e: any) => { topoRouterNatEnabled = e.target.checked; });
        } else if (activeSelectedTopoDevice === "switch") {
          editPanel.innerHTML = `
            <div class="space-y-2 text-slate-400 leading-relaxed text-[11px]">
              <p class="font-bold text-white text-xs mb-1">LAN SWITCH LAYER 2</p>
              <p>Switch bekerja pada OSI Layer 2 (Data Link) menggunakan tabel MAC Address untuk mem-forward data frame secara transparan.</p>
              <p>Tidak memerlukan konfigurasi IP Address Layer 3 untuk melakukan fungsinya dalam jaringan lokal ini.</p>
            </div>
          `;
        } else if (activeSelectedTopoDevice === "cloud") {
          editPanel.innerHTML = `
            <div class="space-y-2 text-slate-400 leading-relaxed text-[11px]">
              <p class="font-bold text-white text-xs mb-1">INTERNET CLOUD GATEWAY</p>
              <p>Mempresentasikan gateway internet global publik dengan alamat IP server DNS global <strong>8.8.8.8</strong>.</p>
              <p>Gateway hulu ISP diset pada IP <strong>192.168.1.1</strong>.</p>
            </div>
          `;
        }
      }

      const connList = document.getElementById("topoCurrentConnections");
      if (connList) {
        connList.innerHTML = topoConnections.map((conn, idx) => {
          return `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300 animate-fadeIn">
              <span class="text-white font-bold uppercase">${conn.from}</span>
              <span class="text-cyan-400">↔</span>
              <span class="text-white font-bold uppercase">${conn.to}</span>
              <span class="text-slate-500">(${conn.type})</span>
              <button class="delete-conn-btn text-rose-400 hover:text-rose-300 ml-1 font-bold" data-idx="${idx}">×</button>
            </div>
          `;
        }).join("");

        document.querySelectorAll(".delete-conn-btn").forEach((btn: any) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.idx);
            topoConnections.splice(idx, 1);
            renderUI();
            toast.success("Kabel dicopot!");
          });
        });
      }

      const connectBtn = document.getElementById("topoConnectBtn");
      if (connectBtn) {
        connectBtn.addEventListener("click", () => {
          const fromVal = (document.getElementById("topoCableFrom") as HTMLSelectElement).value;
          const toVal = (document.getElementById("topoCableTo") as HTMLSelectElement).value;
          const typeVal = (document.getElementById("topoCableType") as HTMLSelectElement).value as "straight" | "cross";

          if (fromVal === toVal) {
            toast.error("Tidak bisa menyambungkan perangkat ke dirinya sendiri!");
            return;
          }

          const exists = topoConnections.some(c => 
            (c.from === fromVal && c.to === toVal) || (c.from === toVal && c.to === fromVal)
          );

          if (exists) {
            toast.error("Kedua perangkat tersebut sudah terhubung kabel!");
            return;
          }

          topoConnections.push({ from: fromVal, to: toVal, type: typeVal });
          renderUI();
          toast.success("Kabel berhasil terpasang!");
        });
      }

      const testPingBtn = document.getElementById("topoTestPingBtn");
      const diagConsole = document.getElementById("topoDiagConsole");
      if (testPingBtn && diagConsole) {
        testPingBtn.addEventListener("click", () => {
          diagConsole.innerHTML = `<div class="text-cyan-400 font-bold">🚀 MEMULAI TES DIAGNOSTIK JARINGAN (PC -&gt; ISP)...</div>`;
          
          const logStep = (msg: string, status: "info" | "success" | "error" = "info") => {
            const colorClass = status === "success" ? "text-emerald-400" : status === "error" ? "text-rose-400" : "text-slate-400";
            diagConsole.innerHTML += `<div class="${colorClass} mt-1">${msg}</div>`;
            diagConsole.scrollTop = diagConsole.scrollHeight;
          };

          setTimeout(() => {
            logStep("1. Memeriksa kabel fisik PC menuju Switch...");
            const pcToSwitch = topoConnections.find(c => (c.from === "pc" && c.to === "switch") || (c.from === "switch" && c.to === "pc"));
            if (!pcToSwitch) {
              logStep("❌ GAGAL: PC dan Switch tidak terhubung kabel!", "error");
              return;
            }
            if (pcToSwitch.type !== "straight") {
              logStep("❌ GAGAL: PC dan Switch harus dihubungkan dengan kabel Straight-Through (Lurus), bukan Crossover!", "error");
              return;
            }
            logStep("✓ Kabel PC ke Switch OK (Straight-Through)", "success");

            setTimeout(() => {
              logStep("2. Memeriksa kabel fisik Switch menuju Router...");
              const switchToRouter = topoConnections.find(c => (c.from === "switch" && c.to === "router") || (c.from === "router" && c.to === "switch"));
              if (!switchToRouter) {
                logStep("❌ GAGAL: Switch dan Router tidak terhubung kabel!", "error");
                return;
              }
              if (switchToRouter.type !== "straight") {
                logStep("❌ GAGAL: Switch dan Router harus dihubungkan dengan kabel Straight-Through (Lurus)!", "error");
                return;
              }
              logStep("✓ Kabel Switch ke Router OK (Straight-Through)", "success");

              setTimeout(() => {
                logStep("3. Memvalidasi Alamat IP & Subnet PC dengan Router LAN...");
                const pcOctets = topoPcIp.split(".");
                const lanOctets = topoRouterLanIp.split(".");
                const isSameSubnet = pcOctets[0] === lanOctets[0] && pcOctets[1] === lanOctets[1] && pcOctets[2] === lanOctets[2];
                
                if (!isSameSubnet) {
                  logStep(`❌ GAGAL: IP PC (${topoPcIp}) dan IP LAN Router (${topoRouterLanIp}) tidak satu subnet!`, "error");
                  return;
                }
                logStep("✓ IP Subnet PC & Router LAN sesuai", "success");

                setTimeout(() => {
                  logStep("4. Memeriksa keselarasan Default Gateway PC...");
                  if (topoPcGateway !== topoRouterLanIp) {
                    logStep(`❌ GAGAL: Default Gateway PC (${topoPcGateway}) tidak mengarah ke IP LAN Router (${topoRouterLanIp})!`, "error");
                    return;
                  }
                  logStep("✓ Default Gateway PC sesuai", "success");

                  setTimeout(() => {
                    logStep("5. Memeriksa kabel fisik Router menuju ISP Cloud...");
                    const routerToCloud = topoConnections.find(c => (c.from === "router" && c.to === "cloud") || (c.from === "cloud" && c.to === "router"));
                    if (!routerToCloud) {
                      logStep("❌ GAGAL: Router dan ISP Cloud tidak terhubung kabel!", "error");
                      return;
                    }
                    if (routerToCloud.type !== "straight") {
                      logStep("❌ GAGAL: Router dan ISP Cloud harus menggunakan kabel Straight-Through!", "error");
                      return;
                    }
                    logStep("✓ Kabel Router ke ISP Cloud OK (Straight-Through)", "success");

                    setTimeout(() => {
                      logStep("6. Memvalidasi Rute Gateway WAN Router...");
                      if (topoRouterGateway !== "192.168.1.1") {
                        logStep(`❌ GAGAL: Gateway WAN Router (${topoRouterGateway}) tidak mengarah ke Gateway ISP (192.168.1.1)!`, "error");
                        return;
                      }
                      logStep("✓ Default Route WAN Router sesuai", "success");

                      setTimeout(() => {
                        logStep("7. Memeriksa fitur NAT Masquerade pada Router...");
                        if (!topoRouterNatEnabled) {
                          logStep("❌ GAGAL: NAT Masquerade dinonaktifkan di Router! Klien LAN tidak dapat menerjemahkan IP private ke internet!", "error");
                          return;
                        }
                        logStep("✓ NAT Masquerade aktif", "success");

                        setTimeout(() => {
                          logStep("⚡ Mengirim paket ICMP ping dari 192.168.10.2 ke 8.8.8.8...");
                          logStep("Reply dari 8.8.8.8: bytes=32 time=24ms TTL=54");
                          logStep("Reply dari 8.8.8.8: bytes=32 time=22ms TTL=54");
                          logStep("✓ DIAGNOSTIK SUKSES: Koneksi internet berhasil terbentuk sepenuhnya!", "success");
                          
                          Swal.fire({
                            title: "Koneksi Sukses Terbentuk!",
                            text: "Luar biasa! Seluruh konfigurasi kabel fisik dan parameter IP Layer 3 terpasang dengan sempurna!",
                            icon: "success",
                            confirmButtonText: "Selesai"
                          });
                        }, 800);
                      }, 700);
                    }, 700);
                  }, 700);
                }, 700);
              }, 700);
            }, 700);
          }, 700);
        });
      }
    }
  }

  renderUI();
}
