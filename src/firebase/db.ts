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

// --- CACHING ENGINE TO PREVENT LAG UNDER HEAVY LOAD OR POOR CONCURRENCY ---
interface CacheEntry {
  data: any;
  timestamp: number;
}

const MEMORY_CACHE: { [key: string]: CacheEntry } = {};
// 20 seconds TTL is highly effective to prevent duplicate calls during navigation 
// and reduce active reads, while maintaining up-to-date real-time state.
const DEFAULT_TTL_MS = 20 * 1000; 

export function invalidateCache(prefix?: string) {
  if (prefix) {
    // Invalidate Memory Cache
    Object.keys(MEMORY_CACHE).forEach(key => {
      if (key === prefix || key.startsWith(prefix + "_") || key.startsWith(prefix + "/")) {
        delete MEMORY_CACHE[key];
      }
    });
    // Invalidate localStorage Cache
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("classhub_cache_")) {
          const cacheKey = key.substring("classhub_cache_".length);
          if (cacheKey === prefix || cacheKey.startsWith(prefix + "_") || cacheKey.startsWith(prefix + "/")) {
            localStorage.removeItem(key);
            i--; // Adjust index since we removed an item
          }
        }
      }
    } catch (e) {
      console.warn("Gagal membersihkan cache lokal:", e);
    }
  } else {
    // Invalidate All Memory Cache
    Object.keys(MEMORY_CACHE).forEach(key => delete MEMORY_CACHE[key]);
    // Invalidate All localStorage Cache
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("classhub_cache_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Gagal membersihkan semua cache lokal:", e);
    }
  }
}

async function fetchWithCache(key: string, fetchFn: () => Promise<any>, ttl: number = DEFAULT_TTL_MS): Promise<any> {
  const now = Date.now();
  
  // 1. Try memory cache first
  const cached = MEMORY_CACHE[key];
  if (cached && (now - cached.timestamp < ttl)) {
    return cached.data;
  }

  // 2. Try localStorage cache next (if not found in memory, or if memory cache expired)
  let localCachedData: any = null;
  let localTimestamp = 0;
  try {
    const localStr = localStorage.getItem(`classhub_cache_${key}`);
    if (localStr) {
      const parsed = JSON.parse(localStr);
      localCachedData = parsed.data;
      localTimestamp = parsed.timestamp;
      
      // If the localStorage cache is still fresh and memory cache didn't exist or was stale, populate memory cache and return
      if (now - localTimestamp < ttl) {
        MEMORY_CACHE[key] = {
          data: localCachedData,
          timestamp: localTimestamp
        };
        return localCachedData;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca cache lokal untuk key:", key, e);
  }

  try {
    const freshData = await fetchFn();
    // Save to memory cache
    MEMORY_CACHE[key] = {
      data: freshData,
      timestamp: now
    };
    // Save to localStorage cache for cross-session persistent loading
    try {
      localStorage.setItem(`classhub_cache_${key}`, JSON.stringify({
        data: freshData,
        timestamp: now
      }));
    } catch (e) {
      console.warn("Gagal menulis cache lokal untuk key:", key, e);
    }
    return freshData;
  } catch (error) {
    console.error(`Cache fetch failed for key: ${key}`, error);
    
    // 3. Fallback to expired memory or localStorage cache to prevent crashing/spinning under connection failure
    if (cached) {
      console.log(`Returning stale memory cache version for key: ${key}`);
      return cached.data;
    }
    if (localCachedData) {
      console.log(`Returning stale localStorage cache version for key: ${key}`);
      return localCachedData;
    }
    throw error;
  }
}

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
    invalidateCache("users");
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
    invalidateCache("users");
    await writeAuditLog("Update Member", `Memperbarui profil siswa UID: ${uid}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentUser(uid: string, name: string) {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, "users", uid));
    invalidateCache("users");
    await writeAuditLog("Delete Member", `Menghapus akun siswa: ${name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getStudentUsers() {
  const path = "users";
  return fetchWithCache("users", async () => {
    const q = query(collection(db, path), orderBy("absen", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

// --- LESSON SCHEDULES ---
export async function getSchedules() {
  const path = "schedules";
  return fetchWithCache("schedules", async () => {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function saveSchedule(id: string, data: any) {
  const path = `schedules/${id}`;
  try {
    await setDoc(doc(db, "schedules", id), data);
    invalidateCache("schedules");
    await writeAuditLog("Save Schedule", `Menyimpan jadwal pelajaran hari: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CLEANING SHIFTS (PICKETS) ---
export async function getPickets() {
  const path = "pickets";
  return fetchWithCache("pickets", async () => {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function savePicket(id: string, data: any) {
  const path = `pickets/${id}`;
  try {
    await setDoc(doc(db, "pickets", id), data);
    invalidateCache("pickets");
    await writeAuditLog("Save Picket", `Menyimpan jadwal piket hari: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- CLASS FUND (UANG KAS) ---
export async function getClassFunds() {
  const path = "classFund";
  return fetchWithCache("classFund", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addClassFundEntry(data: any) {
  const path = "classFund";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: data.date || serverTimestamp()
    });
    invalidateCache("classFund");
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
    invalidateCache("classFund");
    await writeAuditLog("Class Fund Verify", `Konfirmasi status kas ID ${id} menjadi ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClassFundEntry(id: string) {
  const path = `classFund/${id}`;
  try {
    await deleteDoc(doc(db, "classFund", id));
    invalidateCache("classFund");
    await writeAuditLog("Delete Class Fund", `Menghapus entri kas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- EVENT FUNDS (KEUANGAN ACARA) ---
export async function getEventFunds() {
  const path = "eventFunds";
  return fetchWithCache("eventFunds", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addEventFundEntry(data: any) {
  const path = "eventFunds";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    invalidateCache("eventFunds");
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
    invalidateCache("eventFunds");
    await writeAuditLog("Event Fund Verify", `Verifikasi status kas Acara ID ${id} menjadi ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEventFundEntry(id: string) {
  const path = `eventFunds/${id}`;
  try {
    await deleteDoc(doc(db, "eventFunds", id));
    invalidateCache("eventFunds");
    await writeAuditLog("Delete Event Fund", `Menghapus entri dana acara ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- ANNOUNCEMENTS ---
export async function getAnnouncements() {
  const path = "announcements";
  return fetchWithCache("announcements", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addAnnouncement(data: any) {
  const path = "announcements";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    invalidateCache("announcements");
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
    invalidateCache("announcements");
    await writeAuditLog("Announcement Deleted", `Menghapus pengumuman ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AGENDA & CALENDAR ---
export async function getAgendas() {
  const path = "agenda";
  return fetchWithCache("agenda", async () => {
    const q = query(collection(db, path), orderBy("date", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addAgendaItem(data: any) {
  const path = "agenda";
  try {
    const docRef = await addDoc(collection(db, path), data);
    invalidateCache("agenda");
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
    invalidateCache("agenda");
    await writeAuditLog("Agenda Deleted", `Menghapus agenda ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TASKS (TUGAS BERSAMA) ---
export async function getTasks() {
  const path = "tasks";
  return fetchWithCache("tasks", async () => {
    const q = query(collection(db, path), orderBy("deadline", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addTask(data: any) {
  const path = "tasks";
  try {
    const docRef = await addDoc(collection(db, path), data);
    invalidateCache("tasks");
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
    invalidateCache("tasks");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTask(id: string) {
  const path = `tasks/${id}`;
  try {
    await deleteDoc(doc(db, "tasks", id));
    invalidateCache("tasks");
    await writeAuditLog("Task Deleted", `Menghapus tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- VOTING (POLLS) ---
export async function getPolls() {
  const path = "polls";
  return fetchWithCache("polls", async () => {
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function createPoll(data: any) {
  const path = "polls";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
    invalidateCache("polls");
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
    invalidateCache("polls");
    await writeAuditLog("Vote Submitted", `Siswa memberikan suara pada voting: ${pollData.question}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function closePoll(pollId: string, status: string) {
  const path = `polls/${pollId}`;
  try {
    await updateDoc(doc(db, "polls", pollId), { status });
    invalidateCache("polls");
    await writeAuditLog("Poll Closed", `Voting ID ${pollId} ditutup/diselesaikan`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePoll(pollId: string) {
  const path = `polls/${pollId}`;
  try {
    await deleteDoc(doc(db, "polls", pollId));
    invalidateCache("polls");
    await writeAuditLog("Poll Deleted", `Menghapus voting ID: ${pollId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- GALLERY ---
export async function getGallery() {
  const path = "gallery";
  return fetchWithCache("gallery", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addGalleryPhoto(data: any) {
  const path = "gallery";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      date: serverTimestamp()
    });
    invalidateCache("gallery");
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
    invalidateCache("gallery");
    await writeAuditLog("Gallery Photo Deleted", `Menghapus foto galeri ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- SHARED FILES ---
export async function getSharedFiles() {
  const path = "files";
  return fetchWithCache("files", async () => {
    const q = query(collection(db, path), orderBy("uploadDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addSharedFile(data: any) {
  const path = "files";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      uploadDate: serverTimestamp()
    });
    invalidateCache("files");
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
    invalidateCache("files");
    await writeAuditLog("File Deleted", `Menghapus file bersama ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- MEETINGS & MINUTES ---
export async function getMeetings() {
  const path = "meetings";
  return fetchWithCache("meetings", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addMeeting(data: any) {
  const path = "meetings";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
    invalidateCache("meetings");
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
    invalidateCache("meetings");
    await writeAuditLog("Meeting Deleted", `Menghapus catatan rapat ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- EQUIPMENT / INVENTORY (INVENTARIS) ---
export async function getInventory() {
  const path = "inventory";
  return fetchWithCache("inventory", async () => {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addInventoryItem(data: any) {
  const path = "inventory";
  try {
    const docRef = await addDoc(collection(db, path), data);
    invalidateCache("inventory");
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
    invalidateCache("inventory");
    await writeAuditLog("Inventory Updated", `Memperbarui status barang ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInventoryItem(id: string) {
  const path = `inventory/${id}`;
  try {
    await deleteDoc(doc(db, "inventory", id));
    invalidateCache("inventory");
    await writeAuditLog("Inventory Deleted", `Menghapus barang inventaris ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- CONTACTS ---
export async function getContacts() {
  const path = "contacts";
  return fetchWithCache("contacts", async () => {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addContact(data: any) {
  const path = "contacts";
  try {
    const docRef = await addDoc(collection(db, path), data);
    invalidateCache("contacts");
    await writeAuditLog("Contact Added", `Menambah kontak penting: ${data.name}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateContact(id: string, data: any) {
  const path = `contacts/${id}`;
  try {
    await updateDoc(doc(db, "contacts", id), data);
    invalidateCache("contacts");
    await writeAuditLog("Contact Updated", `Memperbarui kontak ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteContact(id: string) {
  const path = `contacts/${id}`;
  try {
    await deleteDoc(doc(db, "contacts", id));
    invalidateCache("contacts");
    await writeAuditLog("Contact Deleted", `Menghapus kontak ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- NOTIFICATIONS ---
export async function getNotifications() {
  const path = "notifications";
  return fetchWithCache("notifications", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
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
    invalidateCache("notifications");
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
      invalidateCache("notifications");
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- SYSTEM SETTINGS ---
export async function getSystemSettings() {
  const path = "settings";
  return fetchWithCache("settings", async () => {
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
  });
}

export async function updateSystemSettings(data: any) {
  const path = "settings/classhub_config";
  try {
    await setDoc(doc(db, "settings", "classhub_config"), data, { merge: true });
    invalidateCache("settings");
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
  return fetchWithCache("submissions_all", async () => {
    const q = query(collection(db, path));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  });
}

export async function getTaskSubmissions(taskId: string) {
  const path = "submissions";
  return fetchWithCache(`submissions_task_${taskId}`, async () => {
    const q = query(collection(db, path), where("taskId", "==", taskId));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  });
}

export async function getMySubmissions(userId: string) {
  const path = "submissions";
  return fetchWithCache(`submissions_user_${userId}`, async () => {
    const q = query(collection(db, path), where("userId", "==", userId));
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a: any, b: any) => {
      const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return tB - tA;
    });
    return docs;
  });
}

export async function addSubmission(data: any) {
  const path = "submissions";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      submittedAt: serverTimestamp()
    });
    invalidateCache("submissions");
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
    invalidateCache("submissions");
    await writeAuditLog("Submission Evaluated", `Menilai/Konfirmasi pengumpulan tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubmission(id: string) {
  const path = `submissions/${id}`;
  try {
    await deleteDoc(doc(db, "submissions", id));
    invalidateCache("submissions");
    await writeAuditLog("Submission Deleted", `Menghapus pengumpulan tugas ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- COUNTDOWN SETTINGS ---
export async function getCountdownSettings() {
  return fetchWithCache("countdowns", async () => {
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
  });
}

export async function saveCountdownSettings(data: any) {
  const path = "settings/countdowns";
  try {
    await setDoc(doc(db, "settings", "countdowns"), {
      ...data,
      updatedAt: serverTimestamp()
    });
    invalidateCache("countdowns");
    await writeAuditLog("Save Countdowns", "Memperbarui konfigurasi target countdown dashboard");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- SALURAN (CHANNEL POSTS) ---
export async function getSaluranPosts() {
  const path = "saluran";
  return fetchWithCache("saluran", async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
}

export async function addSaluranPost(data: any) {
  const path = "saluran";
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      likes: [],
      views: 0,
      date: serverTimestamp()
    });
    invalidateCache("saluran");
    await writeAuditLog("Create Saluran Post", `Membuat postingan baru di Saluran: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateSaluranPost(id: string, data: any) {
  const path = `saluran/${id}`;
  try {
    await updateDoc(doc(db, "saluran", id), data);
    invalidateCache("saluran");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSaluranPost(id: string) {
  const path = `saluran/${id}`;
  try {
    await deleteDoc(doc(db, "saluran", id));
    invalidateCache("saluran");
    await writeAuditLog("Delete Saluran Post", `Menghapus postingan Saluran ID: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}



