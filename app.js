// app.js — WMS ATK (Discord-like UI) — fixed & complete

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const store = {
    load(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    save(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  };

  const nowISO = () => new Date().toISOString();
  const fmtDT = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };
  const setVisible = (el, visible) => {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  };

  // ---------- State ----------
  let role = store.load('role', 'Admin');

  // inventory: {kode,nama,kategori,tipe,batch,stok,min}
  let inventory = store.load('inventory', [
    {kode:'BK-PLS', nama:'Plastik Granul', kategori:'Bahan Baku', tipe:'Bahan', batch:'LOT-PLS-01', stok:1200, min:500},
    {kode:'BK-TNK', nama:'Tinta Hitam',     kategori:'Bahan Baku', tipe:'Bahan', batch:'LOT-TNK-02', stok:200,  min:300},
    {kode:'BJ-PLP', nama:'Pulpen 0.5mm',    kategori:'Barang Jadi',tipe:'Jadi',  batch:'SR-PLP-03',  stok:150,  min:100},
    {kode:'BJ-BKS', nama:'Buku Tulis 40lbr',kategori:'Barang Jadi',tipe:'Jadi',  batch:'SR-BKS-04',  stok:60,   min:120},
  ]);

  // transaksi masuk/keluar: {ts,kode,qty,batch?}/{ts,kode,qty,tujuan?}
  let transIn  = store.load('transIn',  []);
  let transOut = store.load('transOut', []);
  // absensi: {ts, aksi}
  let absen    = store.load('absen',    []);

  // ---------- Role UI ----------
  function applyRole() {
    $('#roleLabel') && ($('#roleLabel').textContent = `Role: ${role}`);
    const isAdminOrMgr = (role === 'Admin' || role === 'Manajer');
    // Kontrol tombol global
    setVisible($('#btnAddItem'), isAdminOrMgr);
    $('#primaryAction') && ($('#primaryAction').textContent = role === 'Staf' ? 'Catat Transaksi' : 'Tambah Barang');
    // Render ulang agar kolom Aksi menyesuaikan
    renderInventory();
  }

  // ---------- Router ----------
  const views = $$('.view');
  function showView(name) {
    views.forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  }

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // ---------- Derived helpers ----------
  const byKode = (k) => inventory.findIndex(x => x.kode.trim().toUpperCase() === k.trim().toUpperCase());
  const lowStock = () => inventory.filter(x => Number(x.stok) <= Number(x.min));

  function persistAll() {
    store.save('role', role);
    store.save('inventory', inventory);
    store.save('transIn', transIn);
    store.save('transOut', transOut);
    store.save('absen', absen);
  }

  // ---------- Render: Dashboard ----------
  function renderDashboard() {
    const elSKU  = $('#metricSKU');
    const elStk  = $('#metricStock');
    const elLow  = $('#metricLow');
    if (elSKU) elSKU.textContent = String(inventory.length);
    if (elStk) elStk.textContent = String(inventory.reduce((a, b) => a + Number(b.stok || 0), 0));
    if (elLow) elLow.textContent = String(lowStock().length);

    const tbody = $('#lowStockTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    lowStock().forEach(it => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${it.kode}</td>
        <td>${it.nama}</td>
        <td>${it.kategori}</td>
        <td>${it.stok}</td>
        <td>${it.min}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- Render: Inventori ----------
  function renderInventory() {
    const tbody = $('#invTable tbody');
    if (!tbody) return;
    const q = ($('#searchInput')?.value || '').trim().toLowerCase();
    const isAdminOrMgr = (role === 'Admin' || role === 'Manajer');
    tbody.innerHTML = '';
    inventory
      .filter(it =>
        !q ||
        it.kode.toLowerCase().includes(q) ||
        it.nama.toLowerCase().includes(q) ||
        it.kategori.toLowerCase().includes(q) ||
        it.batch.toLowerCase().includes(q)
      )
      .forEach((it, idx) => {
        const tr = document.createElement('tr');
        const low = Number(it.stok) <= Number(it.min);
        tr.innerHTML = `
          <td>${it.kode}</td>
          <td>${it.nama}</td>
          <td>${it.kategori}</td>
          <td>${it.tipe}</td>
          <td>${it.batch}</td>
          <td>${it.stok}${low ? ' <span class="badge low">LOW</span>' : ''}</td>
          <td>${it.min}</td>
          <td>
            <div class="actions row">
              <button class="btn outline btn-edit" data-idx="${idx}" ${isAdminOrMgr ? '' : 'style="display:none"'}>Edit</button>
              <button class="btn outline btn-del"  data-idx="${idx}" ${isAdminOrMgr ? '' : 'style="display:none"'}>Hapus</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

    // Bind actions
    $$('.btn-edit', tbody).forEach(b => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx);
        const cur = inventory[i];
        if (!cur) return;
        const nama = prompt('Nama barang:', cur.nama);
        if (nama == null) return;
        const kategori = prompt('Kategori:', cur.kategori);
        if (kategori == null) return;
        const tipe = prompt('Tipe (Bahan/Jadi):', cur.tipe);
        if (tipe == null) return;
        const batch = prompt('Batch/Serial:', cur.batch);
        if (batch == null) return;
        const stok = Number(prompt('Stok:', cur.stok));
        if (Number.isNaN(stok)) return alert('Stok tidak valid');
        const min = Number(prompt('Min:', cur.min));
        if (Number.isNaN(min)) return alert('Min tidak valid');
        inventory[i] = {...cur, nama, kategori, tipe, batch, stok, min};
        persistAll();
        renderInventory();
        renderDashboard();
      });
    });
    $$('.btn-del', tbody).forEach(b => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.idx);
        const cur = inventory[i];
        if (!cur) return;
        if (!confirm(`Hapus ${cur.kode} - ${cur.nama}?`)) return;
        inventory.splice(i, 1);
        persistAll();
        renderInventory();
        renderDashboard();
      });
    });
  }

  // ---------- Render: Transaksi ----------
  function renderTransIn() {
    const tbody = $('#inTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    transIn.slice().reverse().forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDT(t.ts)}</td>
        <td>${t.kode}</td>
        <td>${t.qty}</td>
        <td>${t.batch || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  function renderTransOut() {
    const tbody = $('#outTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    transOut.slice().reverse().forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDT(t.ts)}</td>
        <td>${t.kode}</td>
        <td>${t.qty}</td>
        <td>${t.tujuan || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- Render: Absensi ----------
  function renderAbsen() {
    const tbody = $('#absenTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    absen.slice().reverse().forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDT(a.ts)}</td>
        <td>${a.aksi}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- Actions: Inventori ----------
  $('#btnAddItem')?.addEventListener('click', () => {
    const kode = prompt('Kode barang (unik):', '');
    if (!kode) return;
    if (byKode(kode) >= 0) return alert('Kode sudah ada');
    const nama = prompt('Nama barang:', '');
    if (nama == null) return;
    const kategori = prompt('Kategori:', 'Bahan Baku');
    if (kategori == null) return;
    const tipe = prompt('Tipe (Bahan/Jadi):', 'Bahan');
    if (tipe == null) return;
    const batch = prompt('Batch/Serial:', '');
    if (batch == null) return;
    const stok = Number(prompt('Stok awal:', '0'));
    if (Number.isNaN(stok)) return alert('Stok tidak valid');
    const min = Number(prompt('Min stok:', '0'));
    if (Number.isNaN(min)) return alert('Min tidak valid');
    inventory.push({kode: kode.trim().toUpperCase(), nama, kategori, tipe, batch, stok, min});
    persistAll();
    renderInventory();
    renderDashboard();
  });

  // ---------- Actions: Transaksi ----------
  $('#formIn')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const kode = String(fd.get('kode') || '').trim().toUpperCase();
    const qty  = Number(fd.get('qty') || 0);
    const batch= String(fd.get('batch') || '').trim();
    if (!kode || qty <= 0) return alert('Input tidak valid');
    const i = byKode(kode);
    if (i < 0) return alert('Kode barang tidak ditemukan');
    inventory[i].stok = Number(inventory[i].stok) + qty;
    if (batch) inventory[i].batch = batch;
    transIn.push({ts: nowISO(), kode, qty, batch});
    persistAll();
    e.target.reset();
    renderInventory();
    renderTransIn();
    renderDashboard();
  });

  $('#formOut')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const kode = String(fd.get('kode') || '').trim().toUpperCase();
    const qty  = Number(fd.get('qty') || 0);
    const tujuan = String(fd.get('tujuan') || '').trim();
    if (!kode || qty <= 0) return alert('Input tidak valid');
    const i = byKode(kode);
    if (i < 0) return alert('Kode barang tidak ditemukan');
    if (Number(inventory[i].stok) < qty) return alert('Stok tidak mencukupi');
    inventory[i].stok = Number(inventory[i].stok) - qty;
    transOut.push({ts: nowISO(), kode, qty, tujuan});
    persistAll();
    e.target.reset();
    renderInventory();
    renderTransOut();
    renderDashboard();
  });

  // ---------- Actions: Export ----------
  function toCSV(rows) {
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    };
    return rows.map(r => r.map(esc).join(',')).join('\n');
  }
  function download(name, mime, content) {
    const blob = new Blob([content], {type: mime});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  $('#exportCSV')?.addEventListener('click', () => {
    const rows = [
      ['Tipe','Tanggal','Kode','Jumlah','Batch/Tujuan','Nama','Kategori','Batch','Stok','Min']
    ];
    // Inventory snapshot
    inventory.forEach(it => {
      rows.push(['INVENTORI','',it.kode,'','',it.nama,it.kategori,it.batch,it.stok,it.min]);
    });
    // Transaksi
    transIn.forEach(t => rows.push(['MASUK', t.ts, t.kode, t.qty, t.batch || '-', '', '', '', '', '']));
    transOut.forEach(t => rows.push(['KELUAR',t.ts, t.kode, t.qty, t.tujuan || '-', '', '', '', '', '']));
    download(`wms-export-${Date.now()}.csv`, 'text/csv;charset=utf-8', toCSV(rows));
  });

  $('#exportJSON')?.addEventListener('click', () => {
    const payload = {inventory, transIn, transOut, exportedAt: nowISO()};
    download(`wms-export-${Date.now()}.json`, 'application/json', JSON.stringify(payload, null, 2));
  });

  $('#exportPDF')?.addEventListener('click', () => {
    alert('Export PDF masih placeholder — gunakan CSV/JSON untuk saat ini.');
  });

  // ---------- Actions: Absensi ----------
  $('#btnCheckIn')?.addEventListener('click', () => {
    absen.push({ts: nowISO(), aksi: 'Check-in'});
    persistAll();
    renderAbsen();
  });
  $('#btnCheckOut')?.addEventListener('click', () => {
    absen.push({ts: nowISO(), aksi: 'Check-out'});
    persistAll();
    renderAbsen();
  });

  // ---------- Actions: Global ----------
  $('#themeToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('alt-theme');
  });

  $('#notifyBtn')?.addEventListener('click', () => {
    const lows = lowStock();
    if (!lows.length) return alert('Tidak ada stok rendah.');
    alert('Stok rendah:\n' + lows.map(x => `${x.kode} - ${x.nama} (stok ${x.stok} <= min ${x.min})`).join('\n'));
  });

  $('#primaryAction')?.addEventListener('click', () => {
    if (role === 'Staf') showView('transaksi-masuk');
    else showView('inventori');
  });

  $('#refreshDashboard')?.addEventListener('click', renderDashboard);

  // Role selection
  $$('.role').forEach(b => {
    b.addEventListener('click', () => {
      role = b.dataset.role || 'Staf';
      persistAll();
      applyRole();
      alert(`Role diubah ke: ${role}`);
    });
  });

  // Search
  $('#searchInput')?.addEventListener('input', () => {
    renderInventory();
  });

  // ---------- Initial load ----------
  applyRole();
  renderInventory();
  renderDashboard();
  renderTransIn();
  renderTransOut();
  renderAbsen();

  // Default view
  showView('dashboard');
});