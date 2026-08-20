const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbLAg8UGZV_ML_3pry9iuToPsP429XTnfwc4na6Cz1a98YuWo5Y-fhldsrB_mA91tR/exec';
const PUBLIC_SHEET_ID = '1z6Duylri5Y1KMQD77l87mACsHcH73Q-LwXbbN2eIpEg';
const STORAGE_KEY = 'prestasiAdminSession';

const loginContainer = document.getElementById('loginContainer');
const adminSection = document.getElementById('adminSection');
const adminMain = document.getElementById('adminMain');
const adminTopbar = document.getElementById('adminTopbar');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');
const logoutBtn = document.getElementById('logoutBtn');
const adminUserBadge = document.getElementById('adminUserBadge');
const logoutBtnAlt = document.getElementById('logoutBtnAlt');
const adminUserBadgeDashboard = document.getElementById('adminUserBadgeDashboard');

// Modal Elements
const prestasiModal = document.getElementById('prestasiModal');
const prestasiForm = document.getElementById('prestasiForm');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const openAddModalBtnAlt = document.getElementById('openAddModalBtnAlt');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

const adminTableBody = document.getElementById('adminTableBody');
const adminSummary = document.getElementById('adminSummary');
const adminStatTotal = document.getElementById('adminStatTotal');
const adminStatStudents = document.getElementById('adminStatStudents');
const adminStatYear = document.getElementById('adminStatYear');
const adminLevelFilter = document.getElementById('adminLevelFilter');
const adminYearFilter = document.getElementById('adminYearFilter');
const adminDataScope = document.getElementById('adminDataScope');
const loadingOverlay = document.getElementById('loadingOverlay');
const namaSiswaSearch = document.getElementById('namaSiswaSearch');
const studentPickerMenu = document.getElementById('studentPickerMenu');
const nisInput = document.getElementById('nisInput');
const nomorUrutInput = document.getElementById('nomorUrutInput');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

// User Management Elements
const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');
const userTableBody = document.getElementById('userTableBody');
const userSummary = document.getElementById('userSummary');
const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const cancelUserModalBtn = document.getElementById('cancelUserModalBtn');
const adminTabNav = document.getElementById('adminTabNav');
const userSection = document.getElementById('userSection');

let studentList = [];
let currentEditRowId = null;
let allUserData = [];
let isPrestasiSubmitting = false;

/* ── Toast Notification Function ── */
function showToast(message, type = 'success', title = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const defaultTitles = {
    success: 'Berhasil',
    error: 'Terjadi Kesalahan',
    info: 'Informasi',
    warning: 'Peringatan'
  };

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  toast.innerHTML = `
    <div class="toast-icon-wrap" aria-hidden="true">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title || defaultTitles[type] || 'Notifikasi'}</div>
      <p class="toast-message">${message}</p>
    </div>
    <button type="button" class="toast-close" aria-label="Tutup notifikasi">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="toast-progress" aria-hidden="true"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    if (toast.classList.contains('toast--closing')) return;
    toast.classList.add('toast--closing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 260);
  };

  closeBtn.addEventListener('click', dismiss);
  setTimeout(dismiss, 3500);

  container.appendChild(toast);
}

/* ── Modal Control Functions ── */
function openPrestasiModal(mode = 'add', rowData = null) {
  if (!prestasiModal) return;

  const formTitle = document.getElementById('formTitle');
  const formModeBadge = document.getElementById('formModeBadge');
  const submitBtnText = document.getElementById('submitBtnText');

  if (mode === 'edit' && rowData) {
    currentEditRowId = String(rowData.nomor_urut || rowData.no || '').trim();
    populateFormFromRow(rowData);
    if (formTitle) formTitle.textContent = 'Edit Data Prestasi';
    if (formModeBadge) {
      formModeBadge.textContent = 'Mode Edit';
      formModeBadge.className = 'form-badge form-badge--edit';
    }
    if (submitBtnText) submitBtnText.textContent = 'Perbarui Data';
  } else {
    resetEditState();
    if (formTitle) formTitle.textContent = 'Tambah Prestasi Baru';
    if (formModeBadge) {
      formModeBadge.textContent = 'Entri Baru';
      formModeBadge.className = 'form-badge form-badge--new';
    }
    if (submitBtnText) submitBtnText.textContent = 'Simpan Prestasi';
  }

  prestasiModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closePrestasiModal() {
  if (!prestasiModal) return;
  prestasiModal.hidden = true;
  document.body.style.overflow = '';
  resetEditState();
  if (prestasiForm) prestasiForm.reset();
  if (nisInput) nisInput.value = '';
  if (namaSiswaSearch) namaSiswaSearch.value = '';
  if (studentPickerMenu) {
    studentPickerMenu.hidden = true;
    studentPickerMenu.innerHTML = '';
  }
  // Reset multi-student state
  selectedStudents = [];
  renderSelectedChips();
}

function showLoading(state) {
  if (!loadingOverlay) return;
  loadingOverlay.hidden = !state;
}

function setSession(userData) {
  if (!userData || typeof userData !== 'object') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  const userName = userData.nama || userData.nama_user || userData.user || 'Admin';
  if (adminUserBadge) adminUserBadge.textContent = userName;
  if (adminUserBadgeDashboard) adminUserBadgeDashboard.textContent = userName;
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  if (adminUserBadge) adminUserBadge.textContent = 'Belum login';
  if (adminUserBadgeDashboard) adminUserBadgeDashboard.textContent = 'Belum login';
  if (logoutBtn) logoutBtn.hidden = true;
  if (logoutBtnAlt) logoutBtnAlt.hidden = true;
}

function initializeAdminState() {
  updateAuthView();
}

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const hasUserId = parsed.user || parsed.nama || parsed.nama_user;
    return hasUserId ? parsed : null;
  } catch (error) {
    return null;
  }
}

function normalizeDateForInput(value) {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const gvizMatch = raw.match(/Date\((\d+),(\d+),(\d+)/i);
  if (gvizMatch) {
    const [, year, month, day] = gvizMatch;
    const date = new Date(Number(year), Number(month), Number(day));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
  };

  const numericMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (numericMatch) {
    const [, d, m, y] = numericMatch;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const namedMatch = raw.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (namedMatch) {
    const [, d, m, y] = namedMatch;
    const monthIndex = monthMap[String(m).slice(0, 3).toLowerCase()];
    if (monthIndex !== undefined) {
      return `${y}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

function formatDateForDisplay(value) {
  if (!value) return '-';

  const raw = String(value).trim();
  if (!raw) return '-';

  const normalized = normalizeDateForInput(raw);
  if (!normalized) return raw.replace(/\s+/g, ' ');

  const date = new Date(normalized + 'T00:00:00');
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  return raw.replace(/\s+/g, ' ');
}

let allAdminPrestasiData = [];

function levelBadgeClass(level) {
  const text = String(level || '').toLowerCase();
  if (text.includes('internasional')) return 'table-level-badge table-level-badge--intl';
  if (text.includes('nasional')) return 'table-level-badge table-level-badge--nas';
  return 'table-level-badge';
}

function renderAdminRows(rows) {
  adminTableBody.innerHTML = '';

  if (!rows || rows.length === 0) {
    adminSummary.textContent = '0 data';
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Belum ada data prestasi yang sesuai.</td>
      </tr>
    `;
    return;
  }

  adminSummary.textContent = `${rows.length} data`;

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    const rowId = row.nomor_urut || row.no || row.no_urut || '';
    const tanggalText = formatDateForDisplay(row.tanggal);
    const tingkat = row.tingkat_lomba || '-';
    const peringkat = row.peringkat || '-';

    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td>
        <div style="font-weight: 700; color: #fff;">${row.nama_siswa || '-'}</div>
        ${row.nis ? `<div style="font-size: 0.72rem; color: #94a3b8;">NIS: ${row.nis}</div>` : ''}
      </td>
      <td>
        <div style="font-weight: 600;">${row.nama_kegiatan || '-'}</div>
        ${row.penyelenggara ? `<div style="font-size: 0.72rem; color: #94a3b8;">${row.penyelenggara}</div>` : ''}
      </td>
      <td><span class="${levelBadgeClass(tingkat)}">${tingkat}</span></td>
      <td>${peringkat !== '-' ? `<span class="table-rank-badge">${peringkat}</span>` : '-'}</td>
      <td style="white-space: nowrap; color: #94a3b8; font-size: 0.78rem;">${tanggalText}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn edit-btn" data-row-id="${rowId}" aria-label="Edit prestasi" title="Edit Data">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="table-action-btn delete-btn" data-row-id="${rowId}" aria-label="Hapus prestasi" title="Hapus Data">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </td>
    `;

    const editBtn = tr.querySelector('.edit-btn');
    const deleteBtn = tr.querySelector('.delete-btn');

    editBtn.addEventListener('click', () => openEditRow(row));
    deleteBtn.addEventListener('click', () => deleteRowById(row));

    adminTableBody.appendChild(tr);
  });
}

function getRowYear(row) {
  const firstDate = String(row.tanggal || '').split(/\s+sampai\s+/i)[0];
  const normalized = normalizeDateForInput(firstDate);
  return normalized ? normalized.slice(0, 4) : '';
}

function updateAdminStats(rows) {
  const currentYear = String(new Date().getFullYear());
  const students = new Set(rows.map((row) => String(row.nis || row.nama_siswa || '').trim()).filter(Boolean));
  const thisYear = rows.filter((row) => getRowYear(row) === currentYear).length;

  if (adminStatTotal) adminStatTotal.textContent = rows.length;
  if (adminStatStudents) adminStatStudents.textContent = students.size;
  if (adminStatYear) adminStatYear.textContent = thisYear;
}

function populateAdminYearFilter(rows) {
  if (!adminYearFilter) return;
  const selected = adminYearFilter.value || 'all';
  const years = [...new Set(rows.map(getRowYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  adminYearFilter.innerHTML = '<option value="all">Semua tahun</option>';
  years.forEach((year) => {
    adminYearFilter.insertAdjacentHTML('beforeend', `<option value="${year}">${year}</option>`);
  });
  adminYearFilter.value = years.includes(selected) ? selected : 'all';
}

function filterAdminRows() {
  const term = String(adminSearchInput?.value || '').trim().toLowerCase();
  const level = adminLevelFilter?.value || 'all';
  const year = adminYearFilter?.value || 'all';
  const filtered = allAdminPrestasiData.filter((row) => {
    const combined = [row.nomor_urut, row.nama_siswa, row.nis, row.nama_kegiatan, row.penyelenggara, row.tingkat_lomba, row.peringkat, row.tempat, formatDateForDisplay(row.tanggal)].join(' ').toLowerCase();
    return (!term || combined.includes(term))
      && (level === 'all' || String(row.tingkat_lomba).toLowerCase() === level.toLowerCase())
      && (year === 'all' || getRowYear(row) === year);
  });
  renderAdminRows(filtered);
}

function getAccessiblePrestasiRows(rows) {
  const session = getSession();
  if (!session || String(session.role || '').toLowerCase() === 'admin') return rows;

  const identities = [session.user, session.nama_user, session.nama]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  return rows.filter((row) => identities.includes(String(row.oleh || '').trim().toLowerCase()));
}

function getCellValue(cell) {
  if (!cell) return '';
  if (typeof cell === 'object') {
    if (cell.v !== undefined) return cell.v;
    if (cell.f !== undefined) return cell.f;
  }
  return cell;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseGvizResponse(text) {
  const cleaned = text
    .replace(/\/\*.*?\*\//gs, '')
    .replace(/google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);?$/, '');

  const payload = JSON.parse(cleaned);
  const rows = payload.table && Array.isArray(payload.table.rows) ? payload.table.rows : [];
  const cols = payload.table && Array.isArray(payload.table.cols) ? payload.table.cols : [];

  return { rows, cols };
}

function pickValue(item, aliases) {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function isHeaderLike(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  const lowered = normalizeKey(text);
  return ['no', 'nama_kegiatan', 'penyelenggara', 'nama_siswa', 'nis', 'tanggal', 'tempat_pelaksanaan', 'tingkat_lomba', 'peringkat', 'dokumen', 'foto', 'nama_peserta_didik', 'kelas', 'jenis_kelamin'].includes(lowered);
}

/* ── Multi-Student Picker State ── */
let selectedStudents = []; // [{ nama, nis }]

function renderSelectedChips() {
  const chipsContainer = document.getElementById('selectedStudentsChips');
  const hiddenInput = document.getElementById('namaSiswaHiddenInput');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';
  chipsContainer.hidden = selectedStudents.length === 0;

  selectedStudents.forEach((student, idx) => {
    const chip = document.createElement('div');
    chip.className = 'student-chip';
    chip.innerHTML = `
      <span class="student-chip-name">${student.nama}</span>
      <span class="student-chip-nis">${student.nis}</span>
      <button type="button" class="student-chip-remove" aria-label="Hapus ${student.nama}" data-idx="${idx}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    chip.querySelector('.student-chip-remove').addEventListener('click', () => {
      selectedStudents.splice(idx, 1);
      renderSelectedChips();
    });
    chipsContainer.appendChild(chip);
  });

  // Update hidden inputs - store comma-separated for reference
  if (hiddenInput) hiddenInput.value = selectedStudents.map((s) => s.nama).join(', ');
  // Sync nisInput to show all NIS (or first for edit compat)
  if (nisInput) nisInput.value = selectedStudents.map((s) => s.nis).join(', ');
}

function addStudentToSelection(nama, nis) {
  const already = selectedStudents.find((s) => s.nis === nis || s.nama.toLowerCase() === nama.toLowerCase());
  if (already) return; // avoid duplicates
  selectedStudents.push({ nama, nis });
  renderSelectedChips();
}

function renderStudentOptions(filterText = '') {
  if (!studentPickerMenu || !namaSiswaSearch) return;

  const term = String(filterText || '').trim().toLowerCase();
  if (!term) {
    studentPickerMenu.innerHTML = '';
    studentPickerMenu.hidden = true;
    return;
  }

  const filteredStudents = studentList.filter((student) => {
    const name = String(student.nama || '').trim().toLowerCase();
    const nis = String(student.nis || '').trim().toLowerCase();
    const kelas = String(student.kelas || '').trim().toLowerCase();
    return name.includes(term) || nis.includes(term) || kelas.includes(term);
  }).slice(0, 30); // max 30 results

  studentPickerMenu.innerHTML = '';

  if (!filteredStudents.length) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'student-suggestion-empty';
    emptyItem.textContent = 'Data siswa tidak ditemukan';
    studentPickerMenu.appendChild(emptyItem);
    studentPickerMenu.hidden = false;
    return;
  }

  filteredStudents.forEach((student) => {
    const nama = String(student.nama || '').trim() || 'Nama tidak tersedia';
    const nis = String(student.nis || '').trim();
    const kelas = String(student.kelas || '').trim();
    const alreadySelected = selectedStudents.some((s) => s.nis === nis || s.nama.toLowerCase() === nama.toLowerCase());

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'student-suggestion-item' + (alreadySelected ? ' student-suggestion-item--selected' : '');
    item.innerHTML = `
      <span class="student-suggestion-name">${nama}</span>
      <span class="student-suggestion-meta">${kelas || 'Tanpa kelas'}${nis ? ` • ${nis}` : ''}</span>
      ${alreadySelected ? '<span class="student-suggestion-check">&#10003;</span>' : ''}
    `;

    // Use mousedown instead of click to fire before blur
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent input blur
      if (alreadySelected) {
        // deselect
        const idx = selectedStudents.findIndex((s) => s.nis === nis || s.nama.toLowerCase() === nama.toLowerCase());
        if (idx !== -1) selectedStudents.splice(idx, 1);
        renderSelectedChips();
      } else {
        addStudentToSelection(nama, nis);
      }
      namaSiswaSearch.value = '';
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
      namaSiswaSearch.focus();
    });

    studentPickerMenu.appendChild(item);
  });

  studentPickerMenu.hidden = false;
}

function parseCSV(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => normalizeKey(h));
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    return row;
  });
}

async function fetchStudentList() {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/export?format=csv&sheet=${encodeURIComponent('DATASISWA')}&_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Gagal memuat data siswa');
    }

    const text = await response.text();
    const rows = parseCSV(text);

    studentList = rows
      .map((row) => {
        const nis = String(row.nis || '').trim();
        const nama = String(row.nama_peserta_didik || '').trim();
        const kelas = String(row.kelas || '').trim();
        const jenisKelamin = String(row.jenis_kelamin || '').trim();

        const isHeader = ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nis.toLowerCase()) || ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nama.toLowerCase());

        if (!nama || !nis || isHeader) {
          return null;
        }

        return {
          nis,
          nama,
          kelas,
          jenis_kelamin: jenisKelamin,
        };
      })
      .filter(Boolean);

    renderStudentOptions();
  } catch (error) {
    console.error('Gagal memuat data siswa:', error);
    if (studentPickerMenu) {
      studentPickerMenu.innerHTML = '';
      studentPickerMenu.hidden = true;
    }
  }
}

async function fetchPrestasiData() {
  showLoading(true);
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('PRESTASI')}&_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const { rows, cols } = parseGvizResponse(text);
    const headers = cols.map((col) => String(col.label || col.id || ''));

    const data = rows
      .map((item, index) => {
        const values = item.c || [];
        const row = {};
        headers.forEach((header, idx) => {
          row[normalizeKey(header)] = getCellValue(values[idx]);
        });

        const nomorUrutVal = String(pickValue(row, ['nomor_urut', 'no', 'no_urut']) || '').trim();
        const nomorUrut = nomorUrutVal || String(index + 2);
        const nis = String(pickValue(row, ['nis', 'nis_siswa', 'nomor_induk', 'nomor_induk_siswa']) || '').trim();
        const namaSiswa = String(pickValue(row, ['nama_siswa', 'nama_peserta_didik', 'nama']) || '').trim();
        const namaKegiatan = String(pickValue(row, ['nama_kegiatan', 'kegiatan']) || '').trim();
        const tingkat = String(pickValue(row, ['tingkat_lomba', 'tingkat']) || '').trim();
        const peringkat = String(pickValue(row, ['peringkat', 'juara']) || '').trim();
        const tanggal = String(pickValue(row, ['tanggal', 'tgl', 'tanggal_lomba', 'tanggal_pelaksanaan']) || '').trim();
        const penyelenggara = String(pickValue(row, ['penyelenggara']) || '').trim();
        const tempat = String(pickValue(row, ['tempat', 'tempat_pelaksanaan', 'tempat_lomba']) || '').trim();
        const foto = String(pickValue(row, ['foto', 'foto_kegiatan']) || '').trim();
        const dokumen = String(pickValue(row, ['dokumen', 'dokumen_pendukung']) || '').trim();
        const oleh = String(pickValue(row, ['oleh', 'dibuat_oleh', 'pembuat']) || '').trim();

        if (!namaSiswa && !namaKegiatan && !tingkat && !peringkat && !tanggal && !penyelenggara && !tempat && !nis) {
          return null;
        }

        return {
          nomor_urut: nomorUrut,
          nis,
          nama_siswa: namaSiswa,
          nama_kegiatan: namaKegiatan,
          penyelenggara,
          tingkat_lomba: tingkat,
          peringkat,
          tanggal,
          tempat,
          foto,
          dokumen,
          oleh,
        };
      })
      .filter(Boolean);

    const visibleData = getAccessiblePrestasiRows(data);
    allAdminPrestasiData = visibleData;
    updateAdminStats(visibleData);
    populateAdminYearFilter(visibleData);
    if (adminDataScope) {
      const session = getSession();
      adminDataScope.textContent = session?.role === 'admin'
        ? 'Menampilkan seluruh data prestasi.'
        : `Menampilkan data yang dibuat oleh ${session?.nama_user || session?.user || 'akun ini'}.`;
    }
    filterAdminRows();
  } catch (error) {
    console.error('Gagal memuat data prestasi:', error);
    if (adminTableBody) {
      adminTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">Gagal memuat data. Periksa koneksi atau sheet publik.</td>
        </tr>
      `;
    }
    if (adminSummary) {
      adminSummary.textContent = 'Gagal memuat';
    }
  } finally {
    showLoading(false);
  }
}

async function loginUser(username, password) {
  showLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: new URLSearchParams({ action: 'login', user: username, password }).toString()
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Login response bukan JSON:', text.slice(0, 300));
      throw new Error('Endpoint login tidak mengembalikan JSON. Pastikan Apps Script sudah dideploy sebagai Web App.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Username atau password salah');
    }

    setSession(result.user || { user: username, nama: username });
    loginForm.reset();
    loginError.textContent = '';
    showToast('Selamat datang kembali, ' + (result.user?.nama || username) + '!', 'success', 'Login Berhasil');
    return true;
  } catch (error) {
    const errMsg = error.message || 'Gagal login';
    loginError.textContent = errMsg;
    showToast(errMsg, 'error', 'Login Gagal');
    clearSession();
    return false;
  } finally {
    showLoading(false);
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.classList.remove('loading');
      const span = loginSubmitBtn.querySelector('span');
      if (span) span.textContent = 'Masuk';
    }
  }
}

function resetEditState() {
  currentEditRowId = null;
  if (nomorUrutInput) nomorUrutInput.value = '';

  const formTitle = document.getElementById('formTitle');
  const formModeBadge = document.getElementById('formModeBadge');
  const submitBtnText = document.getElementById('submitBtnText');
  const fotoFileLabel = document.getElementById('fotoFileLabel');
  const dokumenFileLabel = document.getElementById('dokumenFileLabel');
  const fotoPreview = document.getElementById('fotoPreview');
  const dokumenFileMeta = document.getElementById('dokumenFileMeta');

  if (formTitle) formTitle.textContent = 'Tambah Prestasi Baru';
  if (formModeBadge) {
    formModeBadge.textContent = 'Entri Baru';
    formModeBadge.className = 'form-badge form-badge--new';
  }
  if (submitBtnText) submitBtnText.textContent = 'Simpan Prestasi';

  if (fotoFileLabel) fotoFileLabel.textContent = 'Pilih Foto Kegiatan';
  if (dokumenFileLabel) dokumenFileLabel.textContent = 'Pilih Dokumen / Sertifikat';
  if (fotoPreview) {
    fotoPreview.hidden = true;
    fotoPreview.removeAttribute('src');
  }
  if (dokumenFileMeta) {
    dokumenFileMeta.hidden = true;
    dokumenFileMeta.textContent = '';
  }
}

function populateFormFromRow(row) {
  if (!prestasiForm) return;

  const fields = {
    nama_kegiatan: row.nama_kegiatan || '',
    penyelenggara: row.penyelenggara || '',
    tanggal_mulai: normalizeDateForInput(String(row.tanggal || row.tanggal_pelaksanaan || '').split(/\s+sampai\s+/i)[0]),
    tanggal_selesai: normalizeDateForInput(String(row.tanggal || row.tanggal_pelaksanaan || '').split(/\s+sampai\s+/i)[1] || ''),
    tempat: row.tempat || '',
    tingkat_lomba: row.tingkat_lomba || 'Kabupaten',
    peringkat: row.peringkat || '',
    nomor_urut: row.nomor_urut || '',
  };

  Object.entries(fields).forEach(([field, value]) => {
    const input = prestasiForm.querySelector(`[name="${field}"]`);
    if (input) {
      input.value = value;
    }
  });

  if (nomorUrutInput) nomorUrutInput.value = String(row.nomor_urut || '').trim();

  // Populate single student in edit mode
  selectedStudents = [];
  const nama = String(row.nama_siswa || '').trim();
  const nis = String(row.nis || '').trim();
  if (nama) selectedStudents.push({ nama, nis });
  renderSelectedChips();
  if (namaSiswaSearch) namaSiswaSearch.value = '';
}

function openEditRow(row) {
  if (!row) return;
  openPrestasiModal('edit', row);
}

async function deleteRowById(row) {
  if (!row) return;
  const rowId = row.nomor_urut || '';
  if (!rowId) return;

  const confirmed = window.confirm('Apakah Anda yakin ingin menghapus data prestasi ini?');
  if (!confirmed) return;

  showLoading(true);
  try {
    const params = new URLSearchParams({
      action: 'deletePrestasi',
      nomor_urut: String(rowId),
      nama_siswa: String(row.nama_siswa || ''),
      nis: String(row.nis || ''),
      nama_kegiatan: String(row.nama_kegiatan || ''),
      tanggal: String(row.tanggal || '')
    });

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: params.toString()
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error('Respons delete bukan JSON.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghapus data');
    }

    showToast('Data prestasi berhasil dihapus dari database.', 'success', 'Data Dihapus');
    resetEditState();
    await fetchPrestasiData();
  } catch (error) {
    const errMsg = error.message || 'Gagal menghapus data.';
    showToast(errMsg, 'error', 'Gagal Menghapus');
  } finally {
    showLoading(false);
  }
}

async function submitPrestasi(payload, actionName = 'addPrestasi') {
  showLoading(true);
  try {
    if (actionName === 'updatePrestasi' && !String(payload.nomor_urut || '').trim()) {
      throw new Error('ID data untuk edit tidak ditemukan. Tutup form lalu buka Edit Data kembali.');
    }

    const fotoFile = payload.fotoFile;
    const dokumenFile = payload.dokumenFile;
    const plainPayload = { action: actionName };
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'fotoFile' || key === 'dokumenFile') return;
      if (value !== undefined && value !== null && value !== '') {
        plainPayload[key] = value;
      }
    });

    const hasFiles = (fotoFile instanceof File && fotoFile.size > 0) || (dokumenFile instanceof File && dokumenFile.size > 0);

    const fileToPayload = (file, prefix) => new Promise((resolve, reject) => {
      if (!(file instanceof File) || file.size === 0) {
        resolve();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({
        [`${prefix}Base64`]: String(reader.result).split(',')[1]
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, ''),
        [`${prefix}Name`]: file.name,
        [`${prefix}Type`]: file.type || 'application/octet-stream',
      });
      reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}.`));
      reader.readAsDataURL(file);
    });

    if (hasFiles) {
      const [fotoData, dokumenData] = await Promise.all([
        fileToPayload(fotoFile, 'fotoFile'),
        fileToPayload(dokumenFile, 'dokumenFile'),
      ]);
      [fotoData, dokumenData].filter(Boolean).forEach((fileData) => {
        Object.assign(plainPayload, fileData);
      });
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(plainPayload).toString()
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Tambah prestasi response bukan JSON:', text.slice(0, 300));
      throw new Error('Endpoint Apps Script tidak mengembalikan JSON. Pastikan Web App sudah di-deploy dengan akses Anyone.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menyimpan data');
    }

    const msg = actionName === 'updatePrestasi'
      ? 'Perubahan data prestasi berhasil disimpan.'
      : 'Prestasi siswa baru berhasil ditambahkan!';
    const toastTitle = actionName === 'updatePrestasi' ? 'Prestasi Diperbarui' : 'Prestasi Disimpan';

    showToast(msg, 'success', toastTitle);
    closePrestasiModal();
    await fetchPrestasiData();
    return true;
  } catch (error) {
    const errMsg = error.message || 'Gagal menyimpan prestasi.';
    showToast(errMsg, 'error', 'Gagal Menyimpan');
    return false;
  } finally {
    showLoading(false);
  }
}

function updateAuthView() {
  const session = getSession();
  const isLoggedIn = !!session;

  if (!isLoggedIn) {
    clearSession();
    closePrestasiModal();
    // Show full-screen login
    if (loginContainer) loginContainer.hidden = false;
    if (adminMain) adminMain.hidden = true;
    if (adminTopbar) adminTopbar.hidden = true;
    if (adminSection) adminSection.hidden = true;
    if (adminTableBody) adminTableBody.innerHTML = '';
    if (adminSummary) adminSummary.textContent = '0 data';
    return;
  }

  // Logged in — hide login screen, show dashboard
  if (loginContainer) loginContainer.hidden = true;
  if (adminMain) adminMain.hidden = false;
  if (adminTopbar) adminTopbar.hidden = false;
  if (adminSection) adminSection.hidden = false;
  if (logoutBtn) logoutBtn.hidden = false;
  if (logoutBtnAlt) logoutBtnAlt.hidden = false;

  const userName = session.nama || session.nama_user || session.user || 'Admin';
  if (adminUserBadge) adminUserBadge.textContent = userName;
  if (adminUserBadgeDashboard) adminUserBadgeDashboard.textContent = userName;

  fetchStudentList();
  fetchPrestasiData();

  // Show tab nav only for admin role
  if (session.role === 'admin') {
    if (adminTabNav) adminTabNav.hidden = false;
  } else {
    if (adminTabNav) adminTabNav.hidden = true;
    if (userSection) userSection.hidden = true;
  }
}

/* ── Tab Switching ── */
function showTab(tabName) {
  const session = getSession();
  if (tabName === 'users' && (!session || session.role !== 'admin')) return;

  const allTabBtns = document.querySelectorAll('.admin-tab-btn');
  allTabBtns.forEach((btn) => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (adminSection) adminSection.hidden = (tabName !== 'prestasi');
  if (userSection) userSection.hidden = (tabName !== 'users');

  if (tabName === 'users') {
    fetchUsers();
  }
}

if (adminTabNav) {
  adminTabNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-tab-btn');
    if (btn && btn.dataset.tab) {
      showTab(btn.dataset.tab);
    }
  });
}

/* ── User Management Functions ── */
function roleLabel(role) {
  if (role === 'admin') return '<span class="table-level-badge table-level-badge--nas">Admin</span>';
  if (role === 'guru_pembimbing') return '<span class="table-level-badge">Guru Pembimbing</span>';
  return `<span class="table-level-badge">${role}</span>`;
}

function renderUserRows(users) {
  if (!userTableBody) return;
  userTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    if (userSummary) userSummary.textContent = '0 user';
    userTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada pengguna terdaftar.</td></tr>';
    return;
  }

  if (userSummary) userSummary.textContent = `${users.length} user`;
  const session = getSession();

  users.forEach((user, index) => {
    const tr = document.createElement('tr');
    const isSelf = session && String(user.user).toLowerCase() === String(session.user || '').toLowerCase();
    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td><div style="font-weight: 700; color: #fff;">${user.nama_user || '-'}</div></td>
      <td><div style="color: #94a3b8; font-size: 0.85rem;">${user.user || '-'}</div></td>
      <td>${roleLabel(user.role)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn delete-btn"
            data-user-id="${user.id}"
            aria-label="Hapus user" title="${isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus User'}"
            ${isSelf ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </td>
    `;

    if (!isSelf) {
      const deleteBtn = tr.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => deleteUserById(user.id, user.nama_user));
    }

    userTableBody.appendChild(tr);
  });
}

async function fetchUsers() {
  showLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ action: 'getUsers' }).toString()
    });
    const text = await response.text();
    const result = JSON.parse(text);
    if (!result.success) throw new Error(result.message);
    allUserData = result.users || [];
    renderUserRows(allUserData);
  } catch (error) {
    showToast(error.message || 'Gagal memuat data user.', 'error', 'Gagal Memuat');
    if (userTableBody) userTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Gagal memuat data pengguna.</td></tr>';
  } finally {
    showLoading(false);
  }
}

async function deleteUserById(userId, namaUser) {
  if (!userId) return;
  const confirmed = window.confirm(`Hapus pengguna "${namaUser}"? Tindakan ini tidak dapat dibatalkan.`);
  if (!confirmed) return;

  const session = getSession();
  showLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({
        action: 'deleteUser',
        user_id: String(userId),
        requesting_user: String(session?.user || '')
      }).toString()
    });
    const result = JSON.parse(await response.text());
    if (!result.success) throw new Error(result.message);
    showToast('Pengguna berhasil dihapus.', 'success', 'User Dihapus');
    await fetchUsers();
  } catch (error) {
    showToast(error.message || 'Gagal menghapus user.', 'error', 'Gagal Hapus');
  } finally {
    showLoading(false);
  }
}

function openUserModal() {
  if (!userModal) return;
  if (userForm) userForm.reset();
  userModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeUserModal() {
  if (!userModal) return;
  userModal.hidden = true;
  document.body.style.overflow = '';
  if (userForm) userForm.reset();
}

if (openAddUserModalBtn) openAddUserModalBtn.addEventListener('click', openUserModal);
if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
if (cancelUserModalBtn) cancelUserModalBtn.addEventListener('click', closeUserModal);

if (userModal) {
  userModal.addEventListener('click', (e) => {
    if (e.target === userModal) closeUserModal();
  });
}

if (userForm) {
  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(userForm);
    const nama_user = String(fd.get('nama_user') || '').trim();
    const user = String(fd.get('user') || '').trim();
    const password = String(fd.get('password') || '').trim();
    const confirm_password = String(fd.get('confirm_password') || '').trim();
    const role = String(fd.get('role') || 'guru_pembimbing').trim();

    if (!nama_user || !user || !password) {
      showToast('Harap lengkapi semua field yang wajib diisi.', 'warning', 'Form Belum Lengkap');
      return;
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter.', 'warning', 'Password Lemah');
      return;
    }
    if (password !== confirm_password) {
      showToast('Password dan konfirmasi password tidak cocok.', 'warning', 'Password Tidak Cocok');
      return;
    }

    const submitBtn = document.getElementById('submitUserBtn');
    const submitBtnText = document.getElementById('submitUserBtnText');
    if (submitBtn) { submitBtn.disabled = true; }
    if (submitBtnText) submitBtnText.textContent = 'Menyimpan...';

    showLoading(true);
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ action: 'addUser', nama_user, user, password, role }).toString()
      });
      const result = JSON.parse(await response.text());
      if (!result.success) throw new Error(result.message);
      showToast('Pengguna baru berhasil ditambahkan!', 'success', 'User Ditambahkan');
      closeUserModal();
      await fetchUsers();
    } catch (error) {
      showToast(error.message || 'Gagal menambah user.', 'error', 'Gagal Menyimpan');
    } finally {
      showLoading(false);
      if (submitBtn) { submitBtn.disabled = false; }
      if (submitBtnText) submitBtnText.textContent = 'Simpan User';
    }
  });
}

// Student picker listeners
if (namaSiswaSearch) {
  if (studentPickerMenu) {
    studentPickerMenu.hidden = true;
  }

  namaSiswaSearch.addEventListener('input', (event) => {
    renderStudentOptions(event.target.value.trim());
  });

  namaSiswaSearch.addEventListener('focus', () => {
    const value = namaSiswaSearch.value.trim();
    if (value) {
      renderStudentOptions(value);
    } else {
      if (studentPickerMenu) {
        studentPickerMenu.hidden = true;
        studentPickerMenu.innerHTML = '';
      }
    }
  });

  namaSiswaSearch.addEventListener('blur', () => {
    // Small delay so mousedown on a suggestion can fire first
    setTimeout(() => {
      if (studentPickerMenu) {
        studentPickerMenu.hidden = true;
      }
    }, 150);
  });

  namaSiswaSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && studentPickerMenu) {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
      namaSiswaSearch.value = '';
    }
  });
}

if (studentPickerMenu) {
  document.addEventListener('click', (event) => {
    const isInsidePicker = event.target.closest('.student-picker');
    if (!isInsidePicker) {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
    }
  });
}

// Modal open buttons
if (openAddModalBtn) {
  openAddModalBtn.addEventListener('click', () => {
    openPrestasiModal('add');
  });
}

if (openAddModalBtnAlt) {
  openAddModalBtnAlt.addEventListener('click', () => {
    openPrestasiModal('add');
  });
}

// Modal close buttons
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closePrestasiModal);
}

if (cancelModalBtn) {
  cancelModalBtn.addEventListener('click', closePrestasiModal);
}

// Close modal on click outside (backdrop)
if (prestasiModal) {
  prestasiModal.addEventListener('click', (e) => {
    if (e.target === prestasiModal) {
      closePrestasiModal();
    }
  });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && prestasiModal && !prestasiModal.hidden) {
    closePrestasiModal();
  }
});

// Login Form Submit
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      loginError.textContent = 'Username dan password harus diisi';
      showToast('Username dan password harus diisi', 'warning', 'Form Belum Lengkap');
      return;
    }

    const success = await loginUser(username, password);
    if (success) {
      updateAuthView();
    }
  });
}

function handleLogout() {
  clearSession();
  resetEditState();
  updateAuthView();
  if (loginError) loginError.textContent = '';
  if (loginForm) loginForm.reset();
  showToast('Anda telah berhasil keluar dari sesi admin.', 'info', 'Logout Berhasil');
}

if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (logoutBtnAlt) logoutBtnAlt.addEventListener('click', handleLogout);

// Form Submit (Tambah & Edit Prestasi)
if (prestasiForm) {
  prestasiForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isPrestasiSubmitting) return;
    isPrestasiSubmitting = true;

    try {
      const session = getSession();
      if (!session) {
        showToast('Sesi habis. Silakan login kembali.', 'warning', 'Perhatian');
        return;
      }

      const formData = new FormData(prestasiForm);
      const basePayload = {
      nomor_urut: String(formData.get('nomor_urut') || currentEditRowId || '').trim(),
      nama_kegiatan: String(document.querySelector('[name="nama_kegiatan"]')?.value ?? formData.get('nama_kegiatan') ?? '').trim(),
      penyelenggara: String(document.querySelector('[name="penyelenggara"]')?.value ?? formData.get('penyelenggara') ?? '').trim(),
      tanggal_mulai: String(document.querySelector('[name="tanggal_mulai"]')?.value ?? formData.get('tanggal_mulai') ?? '').trim(),
      tanggal_selesai: String(document.querySelector('[name="tanggal_selesai"]')?.value ?? formData.get('tanggal_selesai') ?? '').trim(),
      tempat: String(document.querySelector('[name="tempat"]')?.value ?? formData.get('tempat') ?? '').trim(),
      tingkat_lomba: String(document.querySelector('[name="tingkat_lomba"]')?.value ?? formData.get('tingkat_lomba') ?? '').trim(),
      peringkat: String(document.querySelector('[name="peringkat"]')?.value ?? formData.get('peringkat') ?? '').trim(),
      user: session.user || 'admin',
      fotoFile: formData.get('fotoFile'),
      dokumenFile: formData.get('dokumenFile'),
      };

      basePayload.tanggal = basePayload.tanggal_selesai && basePayload.tanggal_selesai !== basePayload.tanggal_mulai
      ? `${basePayload.tanggal_mulai} sampai ${basePayload.tanggal_selesai}`
      : basePayload.tanggal_mulai;

    // Validate base fields
      const baseRequired = [
      { key: 'nama_kegiatan', label: 'Nama Kegiatan' },
      { key: 'penyelenggara', label: 'Penyelenggara' },
      { key: 'tanggal', label: 'Tanggal Pelaksanaan' },
      ];
      const missingBase = baseRequired.filter((f) => !String(basePayload[f.key] || '').trim());
      if (missingBase.length) {
        showToast(`Harap lengkapi: ${missingBase.map((f) => f.label).join(', ')}`, 'warning', 'Form Belum Lengkap');
        return;
      }

      if (selectedStudents.length === 0) {
        showToast('Harap pilih minimal satu siswa.', 'warning', 'Siswa Belum Dipilih');
        return;
      }

      const actionName = currentEditRowId ? 'updatePrestasi' : 'addPrestasi';

      if (actionName === 'updatePrestasi') {
      // Edit mode: always single student
      const student = selectedStudents[0];
      const payload = { ...basePayload, nama_siswa: student.nama, nis: student.nis };
      await submitPrestasi(payload, 'updatePrestasi');
        return;
      }

    // Add mode: submit one row per selected student
      showLoading(true);
      let successCount = 0;
      let failCount = 0;
      const studentsToSave = [...selectedStudents];
      for (const student of studentsToSave) {
      const payload = { ...basePayload, nama_siswa: student.nama, nis: student.nis };
      const ok = await submitPrestasi(payload, 'addPrestasi');
      if (ok) successCount++; else failCount++;
      }
      showLoading(false);

      if (successCount > 0) {
      const msg = selectedStudents.length > 1
        ? `${successCount} dari ${selectedStudents.length} data prestasi berhasil disimpan.`
        : 'Prestasi siswa berhasil ditambahkan!';
      showToast(msg, 'success', 'Prestasi Disimpan');
      closePrestasiModal();
      await fetchPrestasiData();
      }
      if (failCount > 0) {
        showToast(`${failCount} data gagal disimpan.`, 'error', 'Sebagian Gagal');
      }
    } finally {
      isPrestasiSubmitting = false;
    }
  });
}

// Password show/hide toggle
if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    if (eyeIcon) eyeIcon.hidden = isPassword;
    if (eyeOffIcon) eyeOffIcon.hidden = !isPassword;
    togglePassword.setAttribute('aria-label', isPassword ? 'Sembunyikan password' : 'Tampilkan password');
  });
}

// Login submit button loading state
if (loginForm) {
  loginForm.addEventListener('submit', () => {
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.classList.add('loading');
      const span = loginSubmitBtn.querySelector('span');
      if (span) span.textContent = 'Memproses...';
    }
  });
}

// File upload preview label listeners
const fotoFileInput = document.getElementById('fotoFileInput');
const dokumenFileInput = document.getElementById('dokumenFileInput');
const fotoFileLabel = document.getElementById('fotoFileLabel');
const dokumenFileLabel = document.getElementById('dokumenFileLabel');

if (fotoFileInput && fotoFileLabel) {
  fotoFileInput.addEventListener('change', () => {
    const file = fotoFileInput.files && fotoFileInput.files[0];
    const fotoPreview = document.getElementById('fotoPreview');
    if (file && (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024)) {
      fotoFileInput.value = '';
      if (fotoPreview) fotoPreview.hidden = true;
      showToast('Foto harus berupa gambar dan berukuran maksimal 10 MB.', 'warning', 'File Tidak Valid');
      fotoFileLabel.textContent = 'Pilih Foto Kegiatan';
      return;
    }
    fotoFileLabel.textContent = file ? file.name : 'Pilih Foto Kegiatan';
    if (fotoPreview && file) {
      fotoPreview.src = URL.createObjectURL(file);
      fotoPreview.hidden = false;
    } else if (fotoPreview) {
      fotoPreview.hidden = true;
    }
  });
}

if (dokumenFileInput && dokumenFileLabel) {
  dokumenFileInput.addEventListener('change', () => {
    const file = dokumenFileInput.files && dokumenFileInput.files[0];
    const dokumenFileMeta = document.getElementById('dokumenFileMeta');
    if (file && file.size > 10 * 1024 * 1024) {
      dokumenFileInput.value = '';
      showToast('Dokumen berukuran maksimal 10 MB.', 'warning', 'File Tidak Valid');
      dokumenFileLabel.textContent = 'Pilih Dokumen / Sertifikat';
      if (dokumenFileMeta) dokumenFileMeta.hidden = true;
      return;
    }
    dokumenFileLabel.textContent = file ? file.name : 'Pilih Dokumen / Sertifikat';
    if (dokumenFileMeta && file) {
      dokumenFileMeta.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      dokumenFileMeta.hidden = false;
    }
  });
}

// Admin table search filter
const adminSearchInput = document.getElementById('adminSearchInput');
if (adminSearchInput) {
  adminSearchInput.addEventListener('input', (e) => {
    localStorage.setItem('prestasiAdminSearch', e.target.value);
    filterAdminRows();
  });
}

[adminLevelFilter, adminYearFilter].forEach((filter) => {
  if (filter) filter.addEventListener('change', filterAdminRows);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateAuthView();
  });
} else {
  updateAuthView();
}
