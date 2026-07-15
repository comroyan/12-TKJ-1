import { getPolls, createPoll, submitVote, closePoll, deletePoll } from "../firebase/db";
import { renderIcons, toast, confirmDialog } from "../utils/helpers";
import Swal from "sweetalert2";

export async function renderVoting(container: HTMLElement, userSession: any) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
      <span class="ml-3 text-slate-400">Memuat modul jajak pendapat kelas...</span>
    </div>
  `;

  async function loadAndRender() {
    const polls = await getPolls();
    const isEditor = userSession.role === "Super Admin" || userSession.role === "Wakil" || userSession.role === "Sekretaris";

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white font-display flex items-center gap-2">
              <i data-lucide="message-square" class="text-cyan-400 w-7 h-7"></i> Voting Kelas
            </h1>
            <p class="text-slate-400 text-sm mt-1">Gunakan hak suara Anda untuk pengambilan keputusan kelas secara demokratis.</p>
          </div>
          ${isEditor ? `
            <button id="createPollBtn" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/10 transition-all duration-300">
              <i data-lucide="plus" class="w-4 h-4"></i> Buat Polling Baru
            </button>
          ` : ""}
        </div>

        <!-- Polls Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="pollsGrid">
          ${polls.length > 0 ? polls.map((p: any, pIdx: number) => {
            const hasVoted = p.options.some((o: any) => o.votes?.includes(userSession.uid));
            const totalVotes = p.options.reduce((acc: number, cur: any) => acc + (cur.votes?.length || 0), 0);
            const isClosed = p.status === "closed";

            return `
              <div class="glass rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between glass-card-hover ${isClosed ? 'border-l-4 border-l-slate-700 opacity-80' : 'border-l-4 border-l-cyan-500'}">
                <div>
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-xs font-mono font-semibold px-2 py-1 rounded-xl ${isClosed ? 'bg-slate-800 text-slate-400' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}">
                      ${isClosed ? 'Selesai/Ditutup' : 'Aktif'}
                    </span>
                    <span class="text-xs text-slate-400 font-medium font-mono">${totalVotes} Suara Masuk</span>
                  </div>

                  <h3 class="text-lg font-bold text-white font-display mb-3">${p.question}</h3>
                  
                  <!-- Options/Voting Matrix -->
                  <div class="space-y-3 mb-6">
                    ${p.options.map((o: any, oIdx: number) => {
                      const votesCount = o.votes?.length || 0;
                      const percent = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                      const isUserChoice = o.votes?.includes(userSession.uid);

                      return `
                        <div class="relative overflow-hidden p-3 rounded-2xl border ${isUserChoice ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-800 bg-slate-950/20'}">
                          <!-- Percent Bar Background -->
                          <div class="absolute inset-y-0 left-0 bg-cyan-500/10 rounded-l-2xl transition-all duration-500" style="width: ${percent}%"></div>
                          
                          <div class="relative flex items-center justify-between gap-4 text-xs font-medium">
                            <label class="flex items-center gap-3 cursor-pointer select-none">
                              ${!isClosed ? `
                                <input type="radio" name="poll-${p.id}" value="${oIdx}" ${isUserChoice ? 'checked' : ''} class="pollRadio accent-cyan-500" data-poll-id="${p.id}" data-opt-idx="${oIdx}">
                              ` : `
                                <span class="w-2 h-2 rounded-full ${isUserChoice ? 'bg-cyan-400' : 'bg-slate-700'}"></span>
                              `}
                              <span class="${isUserChoice ? 'text-cyan-400 font-bold' : 'text-slate-200'} leading-snug">${o.text}</span>
                            </label>
                            <span class="font-bold text-slate-300 font-mono">${percent}% (${votesCount})</span>
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>

                <!-- Footer Operations -->
                <div class="pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    ${isEditor ? `
                      ${!isClosed ? `
                        <button class="closePollBtn text-xs font-semibold px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl" data-id="${p.id}">
                          Tutup Voting
                        </button>
                      ` : ""}
                      <button class="deletePollBtn p-2 bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500 hover:text-slate-950 rounded-xl transition-colors" data-id="${p.id}">
                        <i data-lucide="trash2" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : ""}
                  </div>
                </div>
              </div>
            `;
          }).join("") : `
            <div class="col-span-full py-12 text-center">
              <div class="inline-flex p-4 bg-slate-800/50 rounded-full text-slate-500 mb-3"><i data-lucide="message-square" class="w-8 h-8"></i></div>
              <p class="text-slate-400">Belum ada pemungutan suara aktif.</p>
            </div>
          `}
        </div>
      </div>
    `;

    renderIcons();

    // Setup interactive radios for voting
    document.querySelectorAll(".pollRadio").forEach((radio: any) => {
      radio.addEventListener("change", async () => {
        const pollId = radio.dataset.pollId;
        const optIdx = parseInt(radio.dataset.optIdx);
        try {
          await submitVote(pollId, optIdx, userSession.uid);
          toast.success("Suara Anda berhasil direkam!");
          loadAndRender();
        } catch (e: any) {
          Swal.fire("Gagal memilih", e.message, "error");
        }
      });
    });

    // Close poll handler
    document.querySelectorAll(".closePollBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Tutup Voting", "Apakah Anda yakin ingin menyelesaikan voting ini? Anggota tidak akan bisa lagi mengirimkan pilihan.");
        if (confirm) {
          try {
            await closePoll(id, "closed");
            toast.success("Voting diselesaikan!");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });

    // Delete poll handler
    document.querySelectorAll(".deletePollBtn").forEach((btn: any) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirm = await confirmDialog("Hapus Voting", "Hapus voting ini secara permanen?");
        if (confirm) {
          try {
            await deletePoll(id);
            toast.success("Voting berhasil dihapus.");
            loadAndRender();
          } catch (e: any) {
            Swal.fire("Error", e.message, "error");
          }
        }
      });
    });



    // Create Poll (Super Admin or Class Officer only)
    if (isEditor) {
      const createPollBtn = document.getElementById("createPollBtn") as HTMLButtonElement;
      createPollBtn.addEventListener("click", () => {
        Swal.fire({
          title: "Buat Polling Baru",
          background: "#0f172a",
          color: "#f8fafc",
          html: `
            <div class="space-y-4 text-left mt-4 font-sans">
              <div>
                <label class="block text-xs text-slate-400 font-semibold mb-1">Pertanyaan Polling</label>
                <input type="text" id="pQuestion" placeholder="Contoh: Pilih destinasi study tour kelas?" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-sm">
              </div>
              <div class="space-y-2">
                <label class="block text-xs text-slate-400 font-semibold">Pilihan Jawaban</label>
                <input type="text" class="pOptionInput w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs" placeholder="Pilihan 1">
                <input type="text" class="pOptionInput w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs" placeholder="Pilihan 2">
                <input type="text" class="pOptionInput w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs" placeholder="Pilihan 3 (Opsional)">
                <input type="text" class="pOptionInput w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 text-white outline-none text-xs" placeholder="Pilihan 4 (Opsional)">
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Terbitkan Polling",
          cancelButtonText: "Batal",
          confirmButtonColor: "#06b6d4",
          cancelButtonColor: "#334155",
          preConfirm: () => {
            const question = (document.getElementById("pQuestion") as HTMLInputElement).value.trim();
            const optionInputs = document.querySelectorAll(".pOptionInput");
            const options: any[] = [];

            optionInputs.forEach((input: any) => {
              const text = input.value.trim();
              if (text) {
                options.push({ text, votes: [] });
              }
            });

            if (!question) {
              Swal.showValidationMessage("Pertanyaan polling harus diisi!");
              return false;
            }
            if (options.length < 2) {
              Swal.showValidationMessage("Harap sediakan minimal 2 pilihan jawaban!");
              return false;
            }

            return { question, options, status: "active" };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await createPoll(result.value);
              toast.success("Polling baru berhasil diterbitkan!");
              loadAndRender();
            } catch (err: any) {
              Swal.fire("Gagal menerbitkan", err.message, "error");
            }
          }
        });
      });
    }
  }

  loadAndRender();
}
