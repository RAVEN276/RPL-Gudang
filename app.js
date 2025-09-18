// ============ Util & Storage ============
const db = {
  load(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  },
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

const KEYS = {
  USERS: 'smg_users',
  KAT: 'smg_kategori',
  ITEMS: 'smg_items',
  TX: 'smg_transaksi'
};

function uid(prefix='ID') { return `${prefix}-${Math.random().toString(36).slice(2,10)}`; }
function todayStr() { return new Date().toISOString().slice(0,10); }

// ============ Seed Data ============
function seed() {
  if (!db.load(KEYS.USERS, null)) {
    const users = [
      {id: uid('U'), username:'admin', nama:'Admin Gudang', role:'ADMIN', password:'admin123'},
      {id: uid('U'), username:'staf', nama:'Staf Gudang', role:'STAF', password:'staf123'},
      {id: uid('U'), username:'manajer', nama:'Manajer Gudang', role:'MANAJER', password:'manajer123'},
      {id: uid('U'), username:'produksi', nama:'Manajer Produksi', role:'PRODUKSI', password:'produksi123'},
    ];
    db.save(KEYS.USERS, users);
  }
  if (!db.load(KEYS.KAT, null)) {
    db.save(KEYS.KAT, [
      {id: uid('K'), nama:'Plastik'},
      {id: uid('K'), nama:'Tinta'},
      {id: uid('K'), nama:'Kayu'},
      {id: uid('K'), nama:'Kertas'},
      {id: uid('K'), nama:'ATK Jadi'}
    ]);
  }
  if (!db.load(KEYS.ITEMS, null)) {
    db.save(KEYS.ITEMS, [
      {id: uid('I'), kode:'BB-PLS-01', nama:'Plastik Granul', kategori:'Plastik', tipe:'BAHAN_BAKU', stok:500, min:100, barcode:'PLS001'},
      {id: uid('I'), kode:'BB-TNT-01', nama:'Tinta Biru', kategori:'Tinta', tipe:'BAHAN_BAKU', stok:200, min:50, barcode:'TNT001'},
      {id: uid('I'), kode:'BJ-PLP-01', nama:'Pulpen Biru', kategori:'ATK Jadi', tipe:'BARANG_JADI', stok:1000, min:200, barcode:'PLP001'},
    ]);
  }
  if (!db.load(KEYS.TX, null)) {
    db.save(KEYS.TX, []);
  }
}
seed();

// ============ State ============
let currentUser = null;

// ============ Elements ============
const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));

const pages = {
  login: el('#login-page'),
  app: el('#app'),
};
const views = {
  dashboard: el('#dashboard'),
  laporan: el('#laporan'),
  masterBarang: el('#master-barang'),
  masterKategori: el('#master-kategori'),
  masterPengguna: el('#master-pengguna'),
  masuk: el('#transaksi-masuk'),
  keluar: el('#transaksi-keluar'),
  verif: el('#verifikasi'),
  produksi: el('#produksi'),
  riwayat: el('#riwayat')
};

// ============ Auth ============
function login(username, password) {
  const users = db.load(KEYS.USERS, []);
  const found = users.find(u => u.username === username && u.password === password);
  if (found) {
    currentUser = { id: found.id, username: found.username, nama: found.nama, role: found.role };
    el('#user-name').textContent = currentUser.nama;
    el('#user-role').textContent = getRoleDisplayName(currentUser.role);
    
    pages.login.classList.remove('active');
    pages.app.classList.add('active');
    setRoleMenu(found.role);
    navigate('dashboard');
    refreshAll();
    
    // Initialize Feather icons for dynamic content
    feather.replace();
    return true;
  }
  return false;
}

function logout() {
  currentUser = null;
  pages.app.classList.remove('active');
  pages.login.classList.add('active');
  
  // Reset forms
  els('form').forEach(form => form.reset());
  
  // Clear active states
  els('.nav-item').forEach(item => item.classList.remove('active'));
}

function getRoleDisplayName(role) {
  const roleNames = {
    'ADMIN': 'Admin Gudang',
    'STAF': 'Staf Gudang', 
    'MANAJER': 'Manajer Gudang',
    'PRODUKSI': 'Manajer Produksi'
  };
  return roleNames[role] || role;
}

el('#login-form').addEventListener('submit', (e)=>{
  e.preventDefault();
  const u = el('#login-username').value.trim();
  const p = el('#login-password').value;
  
  // Add loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span>Masuk...</span>';
  submitBtn.disabled = true;
  
  setTimeout(() => {
    if (!login(u,p)) {
      alert('Username atau password salah');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }, 500);
});

el('#btn-logout').addEventListener('click', logout);

// ============ Menu & Navigation ============
function setRoleMenu(role) {
  els('.nav-section').forEach(section => {
    section.style.display = '';
    if (section.classList.contains('role-admin') && role !== 'ADMIN') section.style.display = 'none';
    if (section.classList.contains('role-staf') && role !== 'STAF') section.style.display = 'none';
    if (section.classList.contains('role-manajer') && role !== 'MANAJER') section.style.display = 'none';
    if (section.classList.contains('role-produksi') && role !== 'PRODUKSI') section.style.display = 'none';
  });
  
  els('.nav-item').forEach(item => {
    item.style.display = '';
    if (item.classList.contains('role-admin') && role !== 'ADMIN') item.style.display = 'none';
    if (item.classList.contains('role-staf') && role !== 'STAF') item.style.display = 'none';
    if (item.classList.contains('role-manajer') && role !== 'MANAJER') item.style.display = 'none';
    if (item.classList.contains('role-produksi') && role !== 'PRODUKSI') item.style.display = 'none';
  });
}

els('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    els('.nav-item').forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    navigate(item.dataset.target);
  });
});

function navigate(viewId) {
  els('.view').forEach(v => v.classList.remove('active'));
  el(`#${viewId}`).classList.add('active');
  
  // Update page title
  const titles = {
    'dashboard': 'Dashboard',
    'laporan': 'Laporan Inventori',
    'master-barang': 'Master Barang',
    'master-kategori': 'Master Kategori',
    'master-pengguna': 'Pengguna',
    'transaksi-masuk': 'Barang Masuk',
    'transaksi-keluar': 'Barang Keluar',  
    'verifikasi': 'Verifikasi Transaksi',
    'produksi': 'Ketersediaan Bahan',
    'riwayat': 'Riwayat Transaksi'
  };
  
  const pageTitle = el('#page-title');
  if (pageTitle) pageTitle.textContent = titles[viewId] || 'Dashboard';
  
  // Load view data
  if (viewId === 'laporan') renderLaporan();
  if (viewId === 'master-barang') renderBarang();
  if (viewId === 'master-kategori') renderKategori();
  if (viewId === 'master-pengguna') renderUser();
  if (viewId === 'transaksi-masuk') fillBarangSelects();
  if (viewId === 'transaksi-keluar') fillBarangSelects();
  if (viewId === 'verifikasi') renderVerifikasi();
  if (viewId === 'produksi') renderProduksi();
  if (viewId === 'riwayat') renderRiwayat();
  
  // Re-initialize icons for dynamic content
  setTimeout(() => feather.replace(), 100);
}

// ============ Helpers ============
function getItems() { return db.load(KEYS.ITEMS, []); }
function setItems(items) { db.save(KEYS.ITEMS, items); }
function getKategori() { return db.load(KEYS.KAT, []); }
function setKategori(k) { db.save(KEYS.KAT, k); }
function getUsers() { return db.load(KEYS.USERS, []); }
function setUsers(u) { db.save(KEYS.USERS, u); }
function getTx() { return db.load(KEYS.TX, []); }
function setTx(t) { db.save(KEYS.TX, t); }

function findItemById(id) { return getItems().find(i=>i.id===id); }
function findItemByKode(kode) { return getItems().find(i=>i.kode===kode); }

function lowStockCount() {
  return getItems().filter(i=>i.stok <= i.min).length;
}

function pushNotif(msg) {
  const n = parseInt(el('#notif-count').textContent || '0',10) + 1;
  el('#notif-count').textContent = n;
  console.log('NOTIF:', msg);
  
  // Show toast notification (you can implement a proper toast system)
  if (window.showToast) {
    window.showToast(msg, 'warning');
  }
}

// ============ Dashboard ============
function renderDashboard() {
  const items = getItems();
  el('#stat-total-item').textContent = items.length;
  const baku = items.filter(i=>i.tipe==='BAHAN_BAKU').reduce((a,b)=>a+b.stok,0);
  const jadi = items.filter(i=>i.tipe==='BARANG_JADI').reduce((a,b)=>a+b.stok,0);
  el('#stat-stok-baku').textContent = baku;
  el('#stat-stok-jadi').textContent = jadi;
  const low = lowStockCount();
  el('#stat-low-stock').textContent = low;
  el('#notif-count').textContent = String(low);
  drawMiniChart();
}

function drawMiniChart() {
  const c = el('#mini-chart');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  
  const items = getItems();
  if (items.length === 0) {
    ctx.fillStyle = '#8e9297';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data untuk ditampilkan', c.width/2, c.height/2);
    return;
  }
  
  const labels = items.slice(0,10).map(i=>i.kode);
  const data = items.slice(0,10).map(i=>i.stok);
  const max = Math.max(10, ...data);
  const pad = 40, w = c.width - pad*2, h = c.height - pad*2;
  
  // Draw bars
  ctx.fillStyle = '#5865f2';
  labels.forEach((lab, idx) => {
    const barWidth = w / labels.length * 0.8;
    const barHeight = (data[idx] / max) * h;
    const x = pad + (idx * (w / labels.length)) + (w / labels.length - barWidth) / 2;
    const y = pad + h - barHeight;
    
    ctx.fillRect(x, y, barWidth, barHeight);
  });
  
  // Draw axes
  ctx.strokeStyle = '#4f545c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, pad + h);
  ctx.lineTo(pad + w, pad + h);
  ctx.stroke();
  
  // Draw labels
  ctx.fillStyle = '#8e9297';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lab, idx) => {
    const x = pad + (idx * (w / labels.length)) + (w / labels.length) / 2;
    ctx.fillText(lab, x, pad + h + 20);
  });
}

// ============ Laporan ============
function renderLaporan() {
  const tbody = el('#table-laporan tbody');
  tbody.innerHTML = '';
  getItems().forEach(it=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${it.kode}</strong></td>
      <td>${it.nama}</td>
      <td><span class="badge">${it.kategori}</span></td>
      <td>${it.tipe.replace('_',' ')}</td>
      <td><span class="badge-dot ${it.stok <= it.min ? 'crit' : it.stok <= it.min*1.5 ? 'low' : 'ok'}"></span>${it.stok}</td>
      <td>${it.min}</td>
    `;
    tbody.appendChild(tr);
  });
}

el('#btn-export-csv').addEventListener('click', ()=>{
  const rows = [['Kode','Nama','Kategori','Tipe','Stok','Min']];
  getItems().forEach(it=> rows.push([it.kode,it.nama,it.kategori,it.tipe,it.stok,it.min]));
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadText('laporan.csv', csv);
});

el('#btn-export-json').addEventListener('click', ()=>{
  downloadText('laporan.json', JSON.stringify(getItems(), null, 2));
});

function downloadText(filename, text) {
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============ Master Kategori ============
function renderKategori() {
  const ul = el('#list-kategori');
  ul.innerHTML = '';
  getKategori().forEach(k=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${k.nama}</span>
      <div>
        <button class="btn btn-ghost btn-sm" data-act="edit">
          <i data-feather="edit-2"></i>
          Edit
        </button>
        <button class="btn btn-ghost btn-sm" data-act="del">
          <i data-feather="trash-2"></i>
          Hapus
        </button>
      </div>`;
    li.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
      el('#kategori-id').value = k.id;
      el('#kategori-nama').value = k.nama;
    });
    li.querySelector('[data-act="del"]').addEventListener('click', ()=>{
      const items = getItems();
      if (items.some(i=>i.kategori===k.nama)) { 
        alert('Kategori digunakan oleh barang'); 
        return; 
      }
      if (confirm(`Hapus kategori "${k.nama}"?`)) {
        setKategori(getKategori().filter(x=>x.id!==k.id));
        renderKategori(); 
        fillKategoriSelect(); 
        renderBarang();
      }
    });
    ul.appendChild(li);
  });
  
  // Re-initialize icons
  feather.replace();
}

el('#form-kategori').addEventListener('submit', (e)=>{
  e.preventDefault();
  const id = el('#kategori-id').value || uid('K');
  const nama = el('#kategori-nama').value.trim();
  if (!nama) return;
  const list = getKategori();
  const exist = list.find(k=>k.id===id);
  if (exist) exist.nama = nama; else list.push({id, nama});
  setKategori(list);
  e.target.reset();
  renderKategori(); fillKategoriSelect(); renderBarang();
});

el('#kategori-reset').addEventListener('click', ()=> el('#form-kategori').reset());

function fillKategoriSelect() {
  const sel = el('#barang-kategori');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih kategori</option>';
  getKategori().forEach(k=>{
    const opt = document.createElement('option');
    opt.value = k.nama; opt.textContent = k.nama;
    sel.appendChild(opt);
  });
}

// ============ Master Barang ============
function renderBarang() {
  fillKategoriSelect();
  const tbody = el('#table-barang tbody');
  const q = (el('#barang-cari')?.value||'').toLowerCase();
  tbody.innerHTML = '';
  getItems()
    .filter(it => it.nama.toLowerCase().includes(q) || it.kode.toLowerCase().includes(q))
    .forEach(it=>{
      const tr = document.createElement('tr');
      const statusDot = it.stok<=it.min ? 'crit' : it.stok<=it.min*1.5 ? 'low' : 'ok';
      tr.innerHTML = `
        <td><strong>${it.kode}</strong></td>
        <td>${it.nama}</td>
        <td><span class="badge">${it.kategori}</span></td>
        <td>${it.tipe.replace('_',' ')}</td>
        <td><span class="badge-dot ${statusDot}"></span>${it.stok}</td>
        <td>${it.min}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-act="edit">
            <i data-feather="edit-2"></i>
          </button>
          <button class="btn btn-ghost btn-sm" data-act="del">
            <i data-feather="trash-2"></i>
          </button>
        </td>
      `;
      tr.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
        el('#barang-id').value = it.id;
        el('#barang-kode').value = it.kode;
        el('#barang-nama').value = it.nama;
        el('#barang-kategori').value = it.kategori;
        el('#barang-tipe').value = it.tipe;
        el('#barang-min').value = it.min;
        el('#barang-barcode').value = it.barcode||'';
      });
      tr.querySelector('[data-act="del"]').addEventListener('click', ()=>{
        const tx = getTx();
        if (tx.some(t=>t.itemId===it.id)) { 
          alert('Barang memiliki transaksi'); 
          return; 
        }
        if (confirm(`Hapus barang "${it.nama}"?`)) {
          setItems(getItems().filter(x=>x.id!==it.id));
          renderBarang(); 
          refreshAll();
        }
      });
      tbody.appendChild(tr);
    });
    
  // Re-initialize icons
  feather.replace();
}

el('#barang-cari')?.addEventListener('input', renderBarang);

el('#form-barang').addEventListener('submit', (e)=>{
  e.preventDefault();
  const id = el('#barang-id').value || uid('I');
  const data = {
    id,
    kode: el('#barang-kode').value.trim(),
    nama: el('#barang-nama').value.trim(),
    kategori: el('#barang-kategori').value,
    tipe: el('#barang-tipe').value,
    stok: findItemById(id)?.stok ?? 0,
    min: parseInt(el('#barang-min').value,10) || 0,
    barcode: el('#barang-barcode').value.trim() || ''
  };
  const items = getItems();
  const existById = items.find(i=>i.id===id);
  const existKode = items.find(i=>i.kode===data.kode && i.id!==id);
  if (existKode) { alert('Kode barang sudah ada'); return; }
  if (existById) Object.assign(existById, data); else items.push(data);
  setItems(items);
  e.target.reset();
  renderBarang(); refreshAll();
});

el('#barang-reset').addEventListener('click', ()=> el('#form-barang').reset());

// ============ Pengguna ============
function renderUser() {
  const tbody = el('#table-user tbody');
  tbody.innerHTML = '';
  getUsers().forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.username}</strong></td>
      <td>${u.nama}</td>
      <td><span class="badge">${getRoleDisplayName(u.role)}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" data-act="edit">
          <i data-feather="edit-2"></i>
        </button>
        <button class="btn btn-ghost btn-sm" data-act="del">
          <i data-feather="trash-2"></i>
        </button>
      </td>
    `;
    tr.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
      el('#user-id').value = u.id;
      el('#user-username').value = u.username;
      el('#user-nama').value = u.nama;
      el('#user-role').value = u.role;
      el('#user-password').value = u.password;
    });
    tr.querySelector('[data-act="del"]').addEventListener('click', ()=>{
      if (u.username===currentUser?.username) { 
        alert('Tidak dapat menghapus pengguna aktif'); 
        return; 
      }
      if (confirm(`Hapus pengguna "${u.nama}"?`)) {
        setUsers(getUsers().filter(x=>x.id!==u.id)); 
        renderUser();
      }
    });
    tbody.appendChild(tr);
  });
  
  // Re-initialize icons
  feather.replace();
}

el('#form-user').addEventListener('submit', (e)=>{
  e.preventDefault();
  const id = el('#user-id').value || uid('U');
  const data = {
    id,
    username: el('#user-username').value.trim(),
    nama: el('#user-nama').value.trim(),
    role: el('#user-role').value,
    password: el('#user-password').value
  };
  const list = getUsers();
  const existUser = list.find(u=>u.username===data.username && u.id!==id);
  if (existUser) { alert('Username sudah dipakai'); return; }
  const existById = list.find(u=>u.id===id);
  if (existById) Object.assign(existById, data); else list.push(data);
  setUsers(list);
  e.target.reset(); renderUser();
});

el('#user-reset').addEventListener('click', ()=> el('#form-user').reset());

// ============ Transaksi ============
function fillBarangSelects() {
  const selIn = el('#masuk-barang');
  const selOut = el('#keluar-barang');
  if (selIn) {
    selIn.innerHTML='<option value="">Pilih barang</option>';
    getItems().forEach(i=>{
      const opt = document.createElement('option');
      opt.value = i.id; opt.textContent = `${i.kode} - ${i.nama} (Stok: ${i.stok})`;
      selIn.appendChild(opt);
    });
    el('#masuk-tgl').value = todayStr();
  }
  if (selOut) {
    selOut.innerHTML='<option value="">Pilih barang</option>';
    getItems().forEach(i=>{
      const opt = document.createElement('option');
      opt.value = i.id; opt.textContent = `${i.kode} - ${i.nama} (Stok: ${i.stok})`;
      selOut.appendChild(opt);
    });
    el('#keluar-tgl').value = todayStr();
  }
}

el('#form-masuk').addEventListener('submit', (e)=>{
  e.preventDefault();
  const itemId = el('#masuk-barang').value;
  const qty = parseInt(el('#masuk-qty').value,10);
  if (!itemId) { alert('Pilih barang terlebih dahulu'); return; }
  if (qty<=0) { alert('Jumlah harus > 0'); return; }
  const tx = getTx();
  const rec = {
    id: uid('T'),
    tgl: el('#masuk-tgl').value || todayStr(),
    jenis: 'MASUK',
    itemId,
    qty,
    batch: (el('#masuk-batch').value||'').trim(),
    info: (el('#masuk-sumber').value||'').trim(),
    by: currentUser?.username || 'unknown',
    status: 'PENDING'
  };
  tx.push(rec); setTx(tx);
  renderRiwayat(); renderVerifikasi();
  alert('Transaksi masuk dicatat menunggu verifikasi');
  e.target.reset(); fillBarangSelects();
});

el('#form-keluar').addEventListener('submit', (e)=>{
  e.preventDefault();
  const itemId = el('#keluar-barang').value;
  const qty = parseInt(el('#keluar-qty').value,10);
  const item = findItemById(itemId);
  if (!itemId) { alert('Pilih barang terlebih dahulu'); return; }
  if (qty<=0) { alert('Jumlah harus > 0'); return; }
  if (item && qty > item.stok) { alert('Stok tidak mencukupi'); return; }
  const tx = getTx();
  const rec = {
    id: uid('T'),
    tgl: el('#keluar-tgl').value || todayStr(),
    jenis: 'KELUAR',  
    itemId,
    qty,
    batch: (el('#keluar-batch').value||'').trim(),
    info: el('#keluar-tujuan').value,
    by: currentUser?.username || 'unknown',
    status: 'PENDING'
  };
  tx.push(rec); setTx(tx);
  renderRiwayat(); renderVerifikasi();
  alert('Transaksi keluar dicatat menunggu verifikasi');
  e.target.reset(); fillBarangSelects();
});

// ============ Verifikasi (Manajer) ============
function renderVerifikasi() {
  const tbody = el('#table-verifikasi tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  getTx().filter(t=>t.status==='PENDING').forEach(t=>{
    const it = findItemById(t.itemId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.tgl}</td>
      <td><span class="badge ${t.jenis === 'MASUK' ? 'success' : 'warning'}">${t.jenis}</span></td>
      <td>${it?.kode||'-'} - ${it?.nama||'-'}</td>
      <td><strong>${t.qty}</strong></td>
      <td>${t.batch||'-'}</td>
      <td>${t.by}</td>
      <td>
        <button class="btn btn-success btn-sm" data-act="ok">
          <i data-feather="check"></i>
          Setujui
        </button>
        <button class="btn btn-danger btn-sm" data-act="no">
          <i data-feather="x"></i>
          Tolak
        </button>
      </td>
    `;
    tr.querySelector('[data-act="ok"]').addEventListener('click', ()=>{
      approveTx(t.id);
    });
    tr.querySelector('[data-act="no"]').addEventListener('click', ()=>{
      rejectTx(t.id);
    });
    tbody.appendChild(tr);
  });
  
  // Re-initialize icons
  feather.replace();
}

function approveTx(id) {
  const list = getTx();
  const t = list.find(x=>x.id===id);
  if (!t) return;
  t.status = 'APPROVED';
  // update stok
  const items = getItems();
  const it = items.find(i=>i.id===t.itemId);
  if (it) {
    if (t.jenis==='MASUK') it.stok += t.qty;
    if (t.jenis==='KELUAR') it.stok = Math.max(0, it.stok - t.qty);
    setItems(items);
    if (it.stok<=it.min) pushNotif(`Stok menipis: ${it.nama} (${it.stok})`);
  }
  setTx(list);
  renderVerifikasi(); renderRiwayat(); renderDashboard(); renderLaporan(); renderProduksi(); renderBarang();
}

function rejectTx(id) {
  const list = getTx();
  const t = list.find(x=>x.id===id);
  if (!t) return;
  t.status = 'REJECTED';
  setTx(list);
  renderVerifikasi(); renderRiwayat();
}

// ============ Produksi ============
function renderProduksi() {
  const tbody = el('#table-produksi tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  getItems().filter(i=>i.tipe==='BAHAN_BAKU').forEach(i=>{
    const status = i.stok<=i.min ? 'KRITIS' : i.stok<=i.min*1.5 ? 'RENDAH' : 'AMAN';
    const statusClass = status==='KRITIS' ? 'danger' : status==='RENDAH' ? 'warning' : 'success';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${i.kode}</strong></td>
      <td>${i.nama}</td>
      <td><span class="badge-dot ${i.stok<=i.min ? 'crit' : i.stok<=i.min*1.5 ? 'low' : 'ok'}"></span>${i.stok}</td>
      <td>${i.min}</td>
      <td><span class="badge ${statusClass}">${status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ============ Riwayat ============
function renderRiwayat() {
  const tbody = el('#table-riwayat tbody');
  if (!tbody) return;
  const f = el('#riwayat-filter')?.value || 'ALL';
  const q = (el('#riwayat-cari')?.value||'').toLowerCase();
  tbody.innerHTML = '';
  getTx()
    .filter(t=> f==='ALL' ? true : t.jenis===f)
    .filter(t=>{
      const it = findItemById(t.itemId);
      const s = `${it?.nama||''} ${it?.kode||''} ${t.batch||''} ${t.by||''}`.toLowerCase();
      return s.includes(q);
    })
    .sort((a,b)=> b.tgl.localeCompare(a.tgl))
    .forEach(t=>{
      const it = findItemById(t.itemId);
      const tr = document.createElement('tr');
      const statusClass = t.status==='APPROVED' ? 'success' : t.status==='REJECTED' ? 'danger' : 'warning';
      tr.innerHTML = `
        <td>${t.tgl}</td>
        <td><span class="badge ${t.jenis === 'MASUK' ? 'success' : 'warning'}">${t.jenis}</span></td>
        <td>${it?.kode||'-'} - ${it?.nama||'-'}</td>
        <td><strong>${t.qty}</strong></td>
        <td>${t.batch||'-'}</td>
        <td>${t.info||'-'}</td>
        <td><span class="badge ${statusClass}">${t.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
}

el('#riwayat-filter')?.addEventListener('change', renderRiwayat);
el('#riwayat-cari')?.addEventListener('input', renderRiwayat);

// ============ Notifications ============
el('#notif-bell').addEventListener('click', ()=>{
  const lowStockItems = getItems().filter(i => i.stok <= i.min);
  if (lowStockItems.length === 0) {
    alert('Tidak ada notifikasi stok menipis saat ini.');
  } else {
    const itemNames = lowStockItems.map(i => `• ${i.nama} (${i.stok}/${i.min})`).join('\n');
    alert(`Stok Menipis (${lowStockItems.length} item):\n\n${itemNames}`);
  }
});

// ============ CSS Classes for dynamic badges ============
const style = document.createElement('style');
style.textContent = `
  .badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .badge.success {
    background: rgba(59, 165, 92, 0.1);
    color: var(--brand-success);
  }
  
  .badge.warning {
    background: rgba(250, 166, 26, 0.1);
    color: var(--brand-warning);
  }
  
  .badge.danger {
    background: rgba(237, 66, 69, 0.1);
    color: var(--brand-danger);
  }
  
  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .btn-sm i {
    width: 14px;
    height: 14px;
  }
`;
document.head.appendChild(style);

// ============ Refresh ============
function refreshAll() {
  renderDashboard();
  renderLaporan();
  renderBarang();
  renderKategori();
  renderUser();
  renderProduksi();
  renderRiwayat();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  refreshAll();
  feather.replace();
});