import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  onSnapshot,
  increment
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./config";

// --- AUDIT LOGS ---
export async function writeAuditLog(action: string, details: string) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "logs"), {
      action,
      details,
      userId: user?.uid || "system",
      userName: user?.displayName || user?.email || "System/Guest",
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Gagal menulis audit log:", error);
  }
}

export async function getAuditLogs() {
  const path = "logs";
  try {
    const q = query(collection(db, path), orderBy("timestamp", "desc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// --- USERS / CLASS MEMBERS ---
export async function createStudentUser(uid: string, data: any) {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await writeAuditLog("Create Member", `Membuat akun siswa: ${data.name} (Absen ${data.absen})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStudentUser(uid: string, data: any) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp()
    });
    await writeAuditLog("Update Member", `Memperbarui profil siswa UID: ${uid}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentUser(uid: string, name: string) {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, "users", uid));
    await writeAuditLog("Delete Member", `Menghapus akun siswa: ${name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getStudentUsers() {
  const path = "users";
  try {
    const q = query(collection(db, path), orderBy("absen", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// --- LESSON SCHEDULES ---
export async function getSchedules() {
  const path = "schedules";
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveSchedule(id: string, data: any) {
  const path = `schedules/${id}`;
  try {
    await setDoc(doc(db, "schedules", id), data);
    await writeAuditLog("Save Schedule", `Menyimpan jadwal pelajaran hari: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CLEANING SHIFTS (PICKETS) ---
export async function getPickets() {
  const path = "pickets";
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function savePicket(id: string, data: any) {
  const path = `pickets/${id}`;
  try {
    await setDoc(doc(db, "pickets", id), data);
    await writeAuditLog("Save Picket", `Menyimpan jadwal piket hari: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CLASS FUND (UANG KAS) ---
export async function getClassFunds() {
  const path = "classFund";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addClassFundEntry(data: any) {
  const path = "classFund";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: data.date || serverTimestamp()
    });
    await writeAuditLog("Class Fund Entry", `Transaksi Kas Baru: Rp${data.amount} (${data.type}) oleh ${data.studentName || "Siswa"}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateClassFundStatus(id: string, status: string, approvedBy: string) {
  const path = `classFund/${id}`;
  try {
    await updateDoc(doc(db, "classFund", id), {
      status,
      updatedBy: approvedBy
    });
    await writeAuditLog("Class Fund Verify", `Konfirmasi status kas ID ${id} menjadi ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClassFundEntry(id: string) {
  const path = `classFund/${id}`;
  try {
    await deleteDoc(doc(db, "classFund", id));
    await writeAuditLog("Delete Class Fund", `Menghapus entri kas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- EVENT FUNDS (KEUANGAN ACARA) ---
export async function getEventFunds() {
  const path = "eventFunds";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addEventFundEntry(data: any) {
  const path = "eventFunds";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    await writeAuditLog("Event Fund Entry", `Transaksi Acara ${data.eventName}: Rp${data.amount} oleh ${data.studentName}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateEventFundStatus(id: string, status: string) {
  const path = `eventFunds/${id}`;
  try {
    await updateDoc(doc(db, "eventFunds", id), { status });
    await writeAuditLog("Event Fund Verify", `Verifikasi status kas Acara ID ${id} menjadi ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEventFundEntry(id: string) {
  const path = `eventFunds/${id}`;
  try {
    await deleteDoc(doc(db, "eventFunds", id));
    await writeAuditLog("Delete Event Fund", `Menghapus entri dana acara ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- ANNOUNCEMENTS ---
export async function getAnnouncements() {
  const path = "announcements";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addAnnouncement(data: any) {
  const path = "announcements";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    await writeAuditLog("Announcement Created", `Pengumuman baru dibuat: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnnouncement(id: string) {
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, "announcements", id));
    await writeAuditLog("Announcement Deleted", `Menghapus pengumuman ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AGENDA & CALENDAR ---
export async function getAgendas() {
  const path = "agenda";
  try {
    const q = query(collection(db, path), orderBy("date", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addAgendaItem(data: any) {
  const path = "agenda";
  try {
    const docRef = await addDoc(collection(db, path), data);
    await writeAuditLog("Agenda Created", `Agenda baru dibuat: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAgendaItem(id: string) {
  const path = `agenda/${id}`;
  try {
    await deleteDoc(doc(db, "agenda", id));
    await writeAuditLog("Agenda Deleted", `Menghapus agenda ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TASKS (TUGAS BERSAMA) ---
export async function getTasks() {
  const path = "tasks";
  try {
    const q = query(collection(db, path), orderBy("deadline", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addTask(data: any) {
  const path = "tasks";
  try {
    const docRef = await addDoc(collection(db, path), data);
    await writeAuditLog("Task Created", `Tugas baru dibuat: ${data.subject}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTaskStatus(id: string, status: string) {
  const path = `tasks/${id}`;
  try {
    await updateDoc(doc(db, "tasks", id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTask(id: string) {
  const path = `tasks/${id}`;
  try {
    await deleteDoc(doc(db, "tasks", id));
    await writeAuditLog("Task Deleted", `Menghapus tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- VOTING (POLLS) ---
export async function getPolls() {
  const path = "polls";
  try {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createPoll(data: any) {
  const path = "polls";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
    await writeAuditLog("Poll Created", `Voting kelas baru dibuat: ${data.question}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitVote(pollId: string, optionIndex: number, userId: string) {
  const path = `polls/${pollId}`;
  try {
    const pollDoc = doc(db, "polls", pollId);
    const snap = await getDoc(pollDoc);
    if (!snap.exists()) return;

    const pollData = snap.data();
    const options = pollData.options.map((opt: any, idx: number) => {
      // Remove user's previous vote from all options
      let votes = opt.votes || [];
      votes = votes.filter((v: string) => v !== userId);
      // Add user's vote to the selected option
      if (idx === optionIndex) {
        votes.push(userId);
      }
      return { ...opt, votes };
    });

    await updateDoc(pollDoc, { options });
    await writeAuditLog("Vote Submitted", `Siswa memberikan suara pada voting: ${pollData.question}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function closePoll(pollId: string, status: string) {
  const path = `polls/${pollId}`;
  try {
    await updateDoc(doc(db, "polls", pollId), { status });
    await writeAuditLog("Poll Closed", `Voting ID ${pollId} ditutup/diselesaikan`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePoll(pollId: string) {
  const path = `polls/${pollId}`;
  try {
    await deleteDoc(doc(db, "polls", pollId));
    await writeAuditLog("Poll Deleted", `Menghapus voting ID: ${pollId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- GALLERY ---
export async function getGallery() {
  const path = "gallery";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addGalleryPhoto(data: any) {
  const path = "gallery";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    await writeAuditLog("Gallery Uploaded", `Mengunggah foto kegiatan: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGalleryPhoto(id: string) {
  const path = `gallery/${id}`;
  try {
    await deleteDoc(doc(db, "gallery", id));
    await writeAuditLog("Gallery Photo Deleted", `Menghapus foto galeri ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- SHARED FILES ---
export async function getSharedFiles() {
  const path = "files";
  try {
    const q = query(collection(db, path), orderBy("uploadDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addSharedFile(data: any) {
  const path = "files";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      uploadDate: serverTimestamp()
    });
    await writeAuditLog("File Shared", `Membagikan file/tautan: ${data.name}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSharedFile(id: string) {
  const path = `files/${id}`;
  try {
    await deleteDoc(doc(db, "files", id));
    await writeAuditLog("File Deleted", `Menghapus file bersama ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- MEETINGS & MINUTES ---
export async function getMeetings() {
  const path = "meetings";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addMeeting(data: any) {
  const path = "meetings";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
    await writeAuditLog("Meeting Created", `Catatan rapat baru: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMeeting(id: string) {
  const path = `meetings/${id}`;
  try {
    await deleteDoc(doc(db, "meetings", id));
    await writeAuditLog("Meeting Deleted", `Menghapus catatan rapat ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- EQUIPMENT / INVENTORY (INVENTARIS) ---
export async function getInventory() {
  const path = "inventory";
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addInventoryItem(data: any) {
  const path = "inventory";
  try {
    const docRef = await addDoc(collection(db, path), data);
    await writeAuditLog("Inventory Added", `Menambah barang inventaris: ${data.name}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateInventoryItem(id: string, data: any) {
  const path = `inventory/${id}`;
  try {
    await updateDoc(doc(db, "inventory", id), data);
    await writeAuditLog("Inventory Updated", `Memperbarui status barang ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInventoryItem(id: string) {
  const path = `inventory/${id}`;
  try {
    await deleteDoc(doc(db, "inventory", id));
    await writeAuditLog("Inventory Deleted", `Menghapus barang inventaris ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- CONTACTS ---
export async function getContacts() {
  const path = "contacts";
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addContact(data: any) {
  const path = "contacts";
  try {
    const docRef = await addDoc(collection(db, path), data);
    await writeAuditLog("Contact Added", `Menambah kontak penting: ${data.name}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteContact(id: string) {
  const path = `contacts/${id}`;
  try {
    await deleteDoc(doc(db, "contacts", id));
    await writeAuditLog("Contact Deleted", `Menghapus kontak ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- NOTIFICATIONS ---
export async function getNotifications() {
  const path = "notifications";
  try {
    const q = query(collection(db, path), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createNotification(title: string, content: string, type: string) {
  const path = "notifications";
  try {
    await addDoc(collection(db, path), {
      title,
      content,
      type,
      date: serverTimestamp(),
      readBy: []
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markNotificationRead(id: string, userId: string) {
  const path = `notifications/${id}`;
  try {
    const docRef = doc(db, "notifications", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const readBy = snap.data().readBy || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await updateDoc(docRef, { readBy });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- SYSTEM SETTINGS ---
export async function getSystemSettings() {
  const path = "settings";
  try {
    const docRef = doc(db, path, "classhub_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    } else {
      const defaultSettings = {
        className: "XII TKJ 1",
        motto: "Networking our future, configuring our goals.",
        logoUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&h=128&fit=crop",
        theme: "dark",
        weeklyIuranRate: 5000
      };
      try {
        await setDoc(docRef, defaultSettings);
      } catch (writeErr) {
        console.warn("Failed to initialize default system settings in Firestore (non-admin user).", writeErr);
      }
      return defaultSettings;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateSystemSettings(data: any) {
  const path = "settings/classhub_config";
  try {
    await setDoc(doc(db, "settings", "classhub_config"), data, { merge: true });
    await writeAuditLog("Settings Changed", "Memperbarui konfigurasi ClassHub utama");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CLASSROOM DISCUSSIONS (CHAT) ---
export async function addDiscussionMessage(data: any) {
  const path = "discussions";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp(),
      reactions: {}
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDiscussionMessage(id: string) {
  const path = `discussions/${id}`;
  try {
    await deleteDoc(doc(db, "discussions", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleMessageReaction(messageId: string, emoji: string, userId: string) {
  const path = `discussions/${messageId}`;
  try {
    const docRef = doc(db, "discussions", messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const reactions = data.reactions || {};
    let users = reactions[emoji] || [];

    if (users.includes(userId)) {
      users = users.filter((u: string) => u !== userId);
    } else {
      users.push(userId);
    }

    if (users.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = users;
    }

    await updateDoc(docRef, { reactions });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- SUBMISSIONS (PENGUMPULAN TUGAS SISWA) ---
export async function getSubmissions() {
  const path = "submissions";
  try {
    const q = query(collection(db, path));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getTaskSubmissions(taskId: string) {
  const path = "submissions";
  try {
    const q = query(collection(db, path), where("taskId", "==", taskId));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getMySubmissions(userId: string) {
  const path = "submissions";
  try {
    const q = query(collection(db, path), where("userId", "==", userId));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addSubmission(data: any) {
  const path = "submissions";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      submittedAt: serverTimestamp()
    });
    await writeAuditLog("Submission Uploaded", `Siswa ${data.userName} mengumpulkan tugas ${data.taskTitle}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateSubmissionFeedback(id: string, status: string, feedback: string) {
  const path = `submissions/${id}`;
  try {
    await updateDoc(doc(db, "submissions", id), {
      status,
      feedback,
      updatedAt: serverTimestamp()
    });
    await writeAuditLog("Submission Evaluated", `Menilai/Konfirmasi pengumpulan tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubmission(id: string) {
  const path = `submissions/${id}`;
  try {
    await deleteDoc(doc(db, "submissions", id));
    await writeAuditLog("Submission Deleted", `Menghapus pengumpulan tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- COUNTDOWN SETTINGS ---
export async function getCountdownSettings() {
  try {
    const docRef = doc(db, "settings", "countdowns");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Gagal mengambil pengaturan countdown:", error);
  }
  // Return defaults if not set in Firestore
  return {
    graduation: "2027-05-15T08:00:00",
    ukk: "2027-02-20T08:00:00",
    pkl: "2026-09-01T08:00:00",
    perpisahan: "2027-05-20T10:00:00"
  };
}

export async function saveCountdownSettings(data: any) {
  const path = "settings/countdowns";
  try {
    await setDoc(doc(db, "settings", "countdowns"), {
      ...data,
      updatedAt: serverTimestamp()
    });
    await writeAuditLog("Save Countdowns", "Memperbarui konfigurasi target countdown dashboard");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


