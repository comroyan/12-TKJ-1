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
  let activeTool = "network"; // network, commands, cable, security, flashcards
  let querySearch = "";

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
              🃏 Flashcards TKJ
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
        </div>
      </div>
    `;

    renderIcons();

    // Attach tool tab listeners
    document.querySelectorAll(".tool-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
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
  }

  renderUI();
}
