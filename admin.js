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
const namaSiswaSelect = document.getElementById('namaSiswaSelect');
const nisInput = document.getElementById('nisInput');

let studentList = [];

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

function renderAdminRows(rows) {
  adminTableBody.innerHTML = '';

  if (!rows || rows.length === 0) {
    adminSummary.textContent = '0 data';
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Belum ada data prestasi</td>
      </tr>
    `;
    return;
  }

  adminSummary.textContent = `${rows.length} data`;

  rows.slice(0, 20).forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.nama_siswa || '-'}</td>
      <td>${row.nama_kegiatan || '-'}</td>
      <td>${row.tingkat_lomba || '-'}</td>
      <td>${row.peringkat || '-'}</td>
      <td>${row.tanggal || '-'}</td>
    `;
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

function renderStudentOptions(filterText = '') {
  if (!namaSiswaSelect) return;

  const term = String(filterText || '').trim().toLowerCase();
  const filteredStudents = studentList.filter((student) => {
    const name = String(student.nama || '').trim().toLowerCase();
    const nis = String(student.nis || '').trim().toLowerCase();
    if (!term) return true;
    return name.includes(term) || nis.includes(term);
  });

  const currentValue = namaSiswaSelect.value;
  namaSiswaSelect.innerHTML = '<option value="">Pilih nama siswa</option>';

  if (!filteredStudents.length) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Data siswa tidak ditemukan';
    emptyOption.disabled = true;
    namaSiswaSelect.appendChild(emptyOption);
    return;
  }

  filteredStudents.forEach((student) => {
    const option = document.createElement('option');
    option.value = String(student.nama || '').trim();
    option.dataset.nis = String(student.nis || '').trim();
    option.textContent = `${student.nama || 'Nama tidak tersedia'}${student.nis ? ` (${student.nis})` : ''}`;
    if (currentValue && option.value === currentValue) {
      option.selected = true;
    }
    namaSiswaSelect.appendChild(option);
  });

  if (currentValue) {
    const selected = filteredStudents.find((student) => String(student.nama || '').trim() === currentValue);
    if (selected) {
      nisInput.value = String(selected.nis || '').trim();
    }
  }
}

async function fetchStudentList() {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/gviz/tq?tqx=out:json&sheet=DATASISWA`);
    if (!response.ok) {
      throw new Error('Gagal memuat data siswa');
    }

    const text = await response.text();
    const { rows, cols } = parseGvizResponse(text);

    const headers = cols.map((col) => String(col.label || col.id || '').trim().toLowerCase());

    studentList = rows.map((item) => {
      const values = item.c || [];
      const row = {};
      headers.forEach((key, index) => {
        const value = getCellValue(values[index]);
        row[key] = value;
      });

      const nis = String(row.nis || row['nis_siswa'] || '').trim();
      const nama = String(row.nama_peserta_didik || row.nama_siswa || row.nama || '').trim();
      if (!nis && !nama) {
        return null;
      }
      return { nis, nama };
    }).filter(Boolean);

    renderStudentOptions();
  } catch (error) {
    console.error('Gagal memuat data siswa:', error);
    if (namaSiswaSelect) {
      namaSiswaSelect.innerHTML = '<option value="">Data siswa belum tersedia</option>';
    }
  }
}

async function fetchPrestasiData() {
  showLoading(true);
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${PUBLIC_SHEET_ID}/gviz/tq?tqx=out:json`);
    const text = await response.text();

    const cleaned = text.replace(/\/\*.*?\*\//gs, '').replace(/google.visualization.Query.setResponse\(/, '').replace(/\);?$/, '');
    const payload = JSON.parse(cleaned);
    const rows = payload.table && Array.isArray(payload.table.rows) ? payload.table.rows : [];

    const data = rows.map((item) => {
      const values = item.c || [];
      const result = {};

      const columns = [
        'id',
        'nama_kegiatan',
        'penyelenggara',
        'nis',
        'nama_siswa',
        'tanggal',
        'tempat',
        'tingkat_lomba',
        'peringkat',
        'foto',
        'dokumen'
      ];

      columns.forEach((key, index) => {
        const cell = values[index];
        result[key] = cell && cell.v !== undefined ? cell.v : '';
      });

      return result;
    });

    renderAdminRows(data);
  } catch (error) {
    console.error('Gagal memuat data prestasi:', error);
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Gagal memuat data. Periksa koneksi atau sheet publik.</td>
      </tr>
    `;
    adminSummary.textContent = 'Gagal memuat';
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

async function submitPrestasi(payload) {
  showLoading(true);
  try {
    const formData = new FormData();
    formData.append('action', 'addPrestasi');

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });

    const fotoFile = payload.fotoFile;
    const dokumenFile = payload.dokumenFile;

    if (fotoFile instanceof File && fotoFile.size > 0) {
      formData.set('fotoFile', fotoFile, fotoFile.name);
    }

    if (dokumenFile instanceof File && dokumenFile.size > 0) {
      formData.set('dokumenFile', dokumenFile, dokumenFile.name);
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: formData
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

    formStatus.textContent = 'Prestasi berhasil disimpan.';
    prestasiForm.reset();
    if (nisInput) nisInput.value = '';
    if (namaSiswaSelect) {
      namaSiswaSelect.value = '';
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
  namaSiswaSearch.addEventListener('input', (event) => {
    renderStudentOptions(event.target.value);
  });
}

if (namaSiswaSelect) {
  namaSiswaSelect.addEventListener('change', (event) => {
    const chosen = event.target.value;
    const selected = studentList.find((student) => String(student.nama || '').trim() === chosen);
    nisInput.value = selected ? String(selected.nis || '').trim() : '';
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
  updateAuthView();
  loginError.textContent = '';
  formStatus.textContent = '';
  loginForm.reset();
});

prestasiForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(prestasiForm);
  const payload = Object.fromEntries(formData.entries());

  const session = getSession();
  if (!session) {
    formStatus.textContent = 'Silakan login dulu.';
    return;
  }

  payload.user = session.user || 'admin';
  payload.fotoFile = formData.get('fotoFile');
  payload.dokumenFile = formData.get('dokumenFile');

  await submitPrestasi(payload);
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
