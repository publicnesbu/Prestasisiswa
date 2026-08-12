const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbLAg8UGZV_ML_3pry9iuToPsP429XTnfwc4na6Cz1a98YuWo5Y-fhldsrB_mA91tR/exec';
const PUBLIC_SHEET_ID = '1z6Duylri5Y1KMQD77l87mACsHcH73Q-LwXbbN2eIpEg';
const STORAGE_KEY = 'prestasiAdminSession';

const loginContainer = document.getElementById('loginContainer');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const logoutBtn = document.getElementById('logoutBtn');
const adminUserBadge = document.getElementById('adminUserBadge');
const prestasiForm = document.getElementById('prestasiForm');
const formStatus = document.getElementById('formStatus');
const adminTableBody = document.getElementById('adminTableBody');
const adminSummary = document.getElementById('adminSummary');
const loadingOverlay = document.getElementById('loadingOverlay');
const namaSiswaSearch = document.getElementById('namaSiswaSearch');
const studentPickerMenu = document.getElementById('studentPickerMenu');
const nisInput = document.getElementById('nisInput');
const nomorUrutInput = document.getElementById('nomorUrutInput');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let studentList = [];
let currentEditRowId = null;

function showLoading(state) {
  if (!loadingOverlay) return;
  loadingOverlay.hidden = !state;
}

function setSession(userData) {
  if (!userData || typeof userData !== 'object') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  adminUserBadge.textContent = userData.nama || userData.nama_user || userData.user || 'Admin';
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  if (adminUserBadge) {
    adminUserBadge.textContent = 'Belum login';
  }
  if (logoutBtn) {
    logoutBtn.hidden = true;
  }
}

function initializeAdminState() {
  const session = getSession();

  if (session) {
    if (adminUserBadge) {
      adminUserBadge.textContent = session.nama || session.nama_user || session.user || 'Admin';
    }
    if (logoutBtn) {
      logoutBtn.hidden = false;
    }
    if (loginContainer) {
      loginContainer.hidden = true;
      loginContainer.style.display = 'none';
    }
    if (adminSection) {
      adminSection.hidden = false;
      adminSection.style.display = 'block';
    }
  } else {
    clearSession();
    if (loginContainer) {
      loginContainer.hidden = false;
      loginContainer.style.display = 'block';
    }
    if (adminSection) {
      adminSection.hidden = true;
      adminSection.style.display = 'none';
    }
  }

  if (adminTableBody) {
    adminTableBody.innerHTML = '';
  }
  if (adminSummary) {
    adminSummary.textContent = '0 data';
  }
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

function renderAdminRows(rows) {
  adminTableBody.innerHTML = '';

  if (!rows || rows.length === 0) {
    adminSummary.textContent = '0 data';
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Belum ada data prestasi</td>
      </tr>
    `;
    return;
  }

  adminSummary.textContent = `${rows.length} data`;

  rows.slice(0, 20).forEach((row) => {
    const tr = document.createElement('tr');
    const rowId = row.nomor_urut || row.no || row.no_urut || '';
    const tanggalText = formatDateForDisplay(row.tanggal);

    tr.innerHTML = `
      <td>${row.nomor_urut || row.no || row.no_urut || '-'}</td>
      <td>${row.nama_siswa || '-'}</td>
      <td>${row.nama_kegiatan || '-'}</td>
      <td>${row.tingkat_lomba || '-'}</td>
      <td>${row.peringkat || '-'}</td>
      <td>${tanggalText}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-action-btn edit-btn" data-row-id="${rowId}" aria-label="Edit prestasi" title="Edit">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button type="button" class="table-action-btn delete-btn" data-row-id="${rowId}" aria-label="Hapus prestasi" title="Hapus">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2h3a1 1 0 0 1 0 2H5a1 1 0 1 1 0-2h3l1-2zm2 7.5v5h2v-5h-2zm-4 0v5h2v-5H7zm8 0v5h2v-5h-2z"/></svg>
          </button>
        </div>
      </td>
    `;

    const editBtn = tr.querySelector('.edit-btn');
    const deleteBtn = tr.querySelector('.delete-btn');

    editBtn.addEventListener('click', () => openEditRow(row));
    deleteBtn.addEventListener('click', () => deleteRowById(rowId));

    adminTableBody.appendChild(tr);
  });
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
  });

  const currentValue = namaSiswaSearch.value;
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

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'student-suggestion-item';
    item.innerHTML = `
      <span class="student-suggestion-name">${nama}</span>
      <span class="student-suggestion-meta">${kelas || 'Tanpa kelas'}${nis ? ` - ${nis}` : ''}</span>
    `;

    item.addEventListener('click', () => {
      namaSiswaSearch.value = nama;
      nisInput.value = nis;
      studentPickerMenu.hidden = true;
    });

    studentPickerMenu.appendChild(item);
  });

  studentPickerMenu.hidden = false;

  if (currentValue) {
    const selected = filteredStudents.find((student) => String(student.nama || '').trim().toLowerCase() === currentValue.trim().toLowerCase());
    if (selected) {
      nisInput.value = String(selected.nis || '').trim();
    }
  }
}

async function fetchStudentList() {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('DATASISWA')}`);
    if (!response.ok) {
      throw new Error('Gagal memuat data siswa');
    }

    const text = await response.text();
    const { rows } = parseGvizResponse(text);

    studentList = rows
      .map((item) => {
        const values = item && Array.isArray(item.c) ? item.c : [];
        const nis = String(getCellValue(values[0]) || '').trim();
        const nama = String(getCellValue(values[1]) || '').trim();
        const kelas = String(getCellValue(values[2]) || '').trim();
        const jenisKelamin = String(getCellValue(values[3]) || '').trim();

        const hasValidNis = /^\d{8,}$/.test(nis.replace(/\s+/g, ''));
        const isHeader = ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nis.toLowerCase()) || ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nama.toLowerCase());

        if (!nama || !hasValidNis || isHeader) {
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
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent('PRESTASI')}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const { rows, cols } = parseGvizResponse(text);
    const headers = cols.map((col) => String(col.label || col.id || ''));

    const data = rows
      .map((item) => {
        const values = item.c || [];
        const row = {};
        headers.forEach((header, index) => {
          row[normalizeKey(header)] = getCellValue(values[index]);
        });

        const nomorUrut = String(pickValue(row, ['nomor_urut', 'no', 'no_urut']) || '').trim();
        const nis = String(pickValue(row, ['nis', 'nis_siswa', 'nomor_induk', 'nomor_induk_siswa']) || '').trim();
        const namaSiswa = String(pickValue(row, ['nama_siswa', 'nama_peserta_didik', 'nama']) || '').trim();
        const namaKegiatan = String(pickValue(row, ['nama_kegiatan', 'kegiatan']) || '').trim();
        const tingkat = String(pickValue(row, ['tingkat_lomba', 'tingkat']) || '').trim();
        const peringkat = String(pickValue(row, ['peringkat', 'juara']) || '').trim();
        const tanggal = String(pickValue(row, ['tanggal', 'tgl', 'tanggal_lomba', 'tanggal_pelaksanaan']) || '').trim();
        const penyelenggara = String(pickValue(row, ['penyelenggara']) || '').trim();
        const tempat = String(pickValue(row, ['tempat', 'tempat_pelaksanaan', 'tempat_lomba']) || '').trim();

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
        };
      })
      .filter(Boolean);

    renderAdminRows(data);
  } catch (error) {
    console.error('Gagal memuat data prestasi:', error);
    if (adminTableBody) {
      adminTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">Gagal memuat data. Periksa koneksi atau sheet publik.</td>
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
      throw new Error('Endpoint login tidak mengembalikan JSON. Pastikan Apps Script sudah dideploy sebagai Web App dan URL yang dipakai benar.');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Username atau password salah');
    }

    setSession(result.user || { user: username, nama: username });
    loginForm.reset();
    loginError.textContent = '';
    return true;
  } catch (error) {
    loginError.textContent = error.message || 'Gagal login';
    clearSession();
    return false;
  } finally {
    showLoading(false);
  }
}

function resetEditState() {
  currentEditRowId = null;
  if (nomorUrutInput) nomorUrutInput.value = '';
  if (cancelEditBtn) cancelEditBtn.hidden = true;
  const submitButton = prestasiForm?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Simpan Prestasi';
  }
}

function populateFormFromRow(row) {
  if (!prestasiForm) return;

  const fields = {
    nama_kegiatan: row.nama_kegiatan || '',
    penyelenggara: row.penyelenggara || '',
    tanggal: normalizeDateForInput(row.tanggal || row.tanggal_pelaksanaan || ''),
    tempat: row.tempat || '',
    tingkat_lomba: row.tingkat_lomba || 'Kabupaten',
    peringkat: row.peringkat || '',
    nis: row.nis || row.nis_siswa || '',
    nama_siswa: row.nama_siswa || '',
    nomor_urut: row.nomor_urut || '',
  };

  Object.entries(fields).forEach(([field, value]) => {
    const input = prestasiForm.querySelector(`[name="${field}"]`);
    if (input) {
      input.value = value;
    }
  });

  if (nisInput) nisInput.value = String(row.nis || '').trim();
  if (namaSiswaSearch) namaSiswaSearch.value = String(row.nama_siswa || '').trim();
  if (nomorUrutInput) nomorUrutInput.value = String(row.nomor_urut || '').trim();
}

function openEditRow(row) {
  if (!row) return;
  currentEditRowId = String(row.nomor_urut || '').trim();
  populateFormFromRow(row);
  formStatus.textContent = 'Mode edit aktif. Ubah data lalu simpan.';

  if (cancelEditBtn) cancelEditBtn.hidden = false;
  const submitButton = prestasiForm?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Update Prestasi';
  }
}

async function deleteRowById(rowId) {
  if (!rowId) return;

  const confirmed = window.confirm('Apakah Anda yakin ingin menghapus data prestasi ini?');
  if (!confirmed) return;

  showLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: new URLSearchParams({ action: 'deletePrestasi', nomor_urut: String(rowId) }).toString()
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

    formStatus.textContent = 'Data prestasi berhasil dihapus.';
    resetEditState();
    await fetchPrestasiData();
  } catch (error) {
    formStatus.textContent = error.message || 'Gagal menghapus data.';
  } finally {
    showLoading(false);
  }
}

async function submitPrestasi(payload, actionName = 'addPrestasi') {
  showLoading(true);
  try {
    const plainPayload = { action: actionName };
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'fotoFile' || key === 'dokumenFile') return;
      if (value !== undefined && value !== null && value !== '') {
        plainPayload[key] = value;
      }
    });

    const fotoFile = payload.fotoFile;
    const dokumenFile = payload.dokumenFile;
    const hasFiles = (fotoFile instanceof File && fotoFile.size > 0) || (dokumenFile instanceof File && dokumenFile.size > 0);

    let requestBody;
    let requestHeaders = {};

    if (hasFiles) {
      const formData = new FormData();
      Object.entries(plainPayload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (fotoFile instanceof File && fotoFile.size > 0) {
        formData.set('fotoFile', fotoFile, fotoFile.name);
      }

      if (dokumenFile instanceof File && dokumenFile.size > 0) {
        formData.set('dokumenFile', dokumenFile, dokumenFile.name);
      }

      requestBody = formData;
    } else {
      requestBody = new URLSearchParams(plainPayload).toString();
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody
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

    formStatus.textContent = actionName === 'updatePrestasi'
      ? 'Prestasi berhasil diperbarui.'
      : 'Prestasi berhasil disimpan.';

    prestasiForm.reset();
    resetEditState();
    if (nisInput) nisInput.value = '';
    if (namaSiswaSearch) {
      namaSiswaSearch.value = '';
      if (studentPickerMenu) {
        studentPickerMenu.hidden = true;
      }
      renderStudentOptions();
    }
    await fetchPrestasiData();
    return true;
  } catch (error) {
    formStatus.textContent = error.message || 'Gagal menyimpan prestasi.';
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
    loginContainer.hidden = false;
    adminSection.hidden = true;
    adminTableBody.innerHTML = '';
    adminSummary.textContent = '0 data';
    return;
  }

  loginContainer.hidden = true;
  adminSection.hidden = false;
  logoutBtn.hidden = false;
  adminUserBadge.textContent = session.nama || session.nama_user || session.user || 'Admin';
  fetchStudentList();
  fetchPrestasiData();
}

if (namaSiswaSearch) {
  if (studentPickerMenu) {
    studentPickerMenu.hidden = true;
  }

  namaSiswaSearch.addEventListener('input', (event) => {
    const value = event.target.value.trim();
    const chosen = studentList.find((student) => String(student.nama || '').trim().toLowerCase() === value.toLowerCase());

    if (chosen) {
      nisInput.value = String(chosen.nis || '').trim();
    } else if (!value) {
      nisInput.value = '';
    }

    renderStudentOptions(value);
  });

  namaSiswaSearch.addEventListener('focus', () => {
    const value = namaSiswaSearch.value.trim();
    if (value) {
      renderStudentOptions(value);
    } else {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
    }
  });

  namaSiswaSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && studentPickerMenu) {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
    }
  });

  namaSiswaSearch.addEventListener('change', (event) => {
    const chosen = studentList.find((student) => String(student.nama || '').trim().toLowerCase() === event.target.value.trim().toLowerCase());
    nisInput.value = chosen ? String(chosen.nis || '').trim() : '';
    if (studentPickerMenu) {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
    }
  });
}

if (studentPickerMenu) {
  document.addEventListener('click', (event) => {
    const isInsidePicker = event.target.closest('.student-picker');
    if (!isInsidePicker && !event.target.closest('.student-suggestion-item')) {
      studentPickerMenu.hidden = true;
      studentPickerMenu.innerHTML = '';
    }
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Username dan password harus diisi';
    return;
  }

  const success = await loginUser(username, password);
  if (success) {
    updateAuthView();
  }
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  resetEditState();
  updateAuthView();
  loginError.textContent = '';
  formStatus.textContent = '';
  loginForm.reset();
});

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', () => {
    prestasiForm.reset();
    resetEditState();
    formStatus.textContent = 'Edit dibatalkan.';
    if (nisInput) nisInput.value = '';
    if (namaSiswaSearch) namaSiswaSearch.value = '';
  });
}

prestasiForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const session = getSession();
  if (!session) {
    formStatus.textContent = 'Silakan login dulu.';
    return;
  }

  const formData = new FormData(prestasiForm);
  const payload = {
    nomor_urut: String(formData.get('nomor_urut') || currentEditRowId || '').trim(),
    nama_kegiatan: String(document.querySelector('[name="nama_kegiatan"]')?.value ?? formData.get('nama_kegiatan') ?? '').trim(),
    penyelenggara: String(document.querySelector('[name="penyelenggara"]')?.value ?? formData.get('penyelenggara') ?? '').trim(),
    nis: String((nisInput && nisInput.value) ?? formData.get('nis') ?? '').trim(),
    nama_siswa: String((namaSiswaSearch && namaSiswaSearch.value) ?? formData.get('nama_siswa') ?? '').trim(),
    tanggal: String(document.querySelector('[name="tanggal"]')?.value ?? formData.get('tanggal') ?? '').trim(),
    tempat: String(document.querySelector('[name="tempat"]')?.value ?? formData.get('tempat') ?? '').trim(),
    tingkat_lomba: String(document.querySelector('[name="tingkat_lomba"]')?.value ?? formData.get('tingkat_lomba') ?? '').trim(),
    peringkat: String(document.querySelector('[name="peringkat"]')?.value ?? formData.get('peringkat') ?? '').trim(),
    user: session.user || 'admin',
    fotoFile: formData.get('fotoFile'),
    dokumenFile: formData.get('dokumenFile'),
  };

  const requiredFields = ['nama_kegiatan', 'penyelenggara', 'nis', 'nama_siswa'];
  const missingFields = requiredFields.filter((field) => !String(payload[field] || '').trim());

  if (missingFields.length) {
    formStatus.textContent = `Kolom ${missingFields.join(', ')} wajib diisi.`;
    return;
  }

  const actionName = currentEditRowId ? 'updatePrestasi' : 'addPrestasi';
  await submitPrestasi(payload, actionName);
});

initializeAdminState();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeAdminState();
    updateAuthView();
  });
} else {
  updateAuthView();
}
