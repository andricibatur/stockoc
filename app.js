// IndexedDB helper
const DB_NAME = "stockgudang";
const STORE_NAME = "items";
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = () => {
      db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

function addItem(item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAllItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function clearItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// UI & Logic
async function refreshTable() {
  const items = await getAllItems();
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";
  items.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  for (const it of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${it.tanggal}</td>
                    <td>${it.nama}</td>
                    <td>${it.kode}</td>
                    <td>${it.jumlah}</td>
                    <td>${it.jenis}</td>`;
    tbody.appendChild(tr);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  await refreshTable();

  // Form Submit
  document.getElementById("itemForm").addEventListener("submit", async e => {
    e.preventDefault();
    const item = {
      nama: document.getElementById("itemName").value.trim(),
      kode: document.getElementById("itemCode").value.trim(),
      jumlah: parseInt(document.getElementById("itemQty").value),
      tanggal: document.getElementById("itemDate").value,
      jenis: document.getElementById("itemType").value
    };
    if (!item.nama || !item.kode || !item.jumlah || !item.tanggal) return alert("Data belum lengkap!");
    await addItem(item);
    e.target.reset();
    await refreshTable();
  });

  // Export
  document.getElementById("exportBtn").onclick = async () => {
    const items = await getAllItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stockgudang.json";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  // Import
  document.getElementById("importBtn").onclick = () => {
    document.getElementById("importFile").click();
  };
  document.getElementById("importFile").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const json = JSON.parse(await file.text());
    if (!Array.isArray(json)) return alert("Format file salah!");
    await clearItems();
    for (const item of json) {
      // Remove id, will auto-increment
      delete item.id;
      await addItem(item);
    }
    await refreshTable();
    alert("Data berhasil di-import!");
  };
});
