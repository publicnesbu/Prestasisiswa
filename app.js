const SHEET_ID = '1z6Duylri5Y1KMQD77l87mACsHcH73Q-LwXbbN2eIpEg';
const sheets = {
  prestasi: 'PRESTASI',
  datasiswa: 'DATASISWA',
};

const SITE_URL = window.location.href.split('#')[0].split('?')[0];

const totalRowsEl = document.getElementById('totalRows');
const totalStudentsEl = document.getElementById('totalStudents');
const lastUpdatedEl = document.getElementById('lastUpdated');
const resultCountEl = document.getElementById('resultCount');
const prestasiFeed = document.getElementById('prestasiFeed');
const feedEmpty = document.getElementById('feedEmpty');
const feedEmptyText = document.getElementById('feedEmptyText');
const searchInput = document.getElementById('searchInput');
const loadingOverlay = document.getElementById('loadingOverlay');
const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
const photoLightbox = document.getElementById('photoLightbox');
const photoLightboxImage = document.getElementById('photoLightboxImage');
const photoLightboxClose = document.getElementById('photoLightboxClose');
const studentListModal = document.getElementById('studentListModal');
const studentListItems = document.getElementById('studentListItems');
const studentListClose = document.getElementById('studentListClose');

let allRows = [];
let allStudents = [];
let studentMap = {};
let currentFilter = 'all';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setLoading(active) {
  loadingOverlay.hidden = !active;
}

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const jsonText = text.replace(/^[^\{]*/, '').replace(/\);?$/, '');
  return JSON.parse(jsonText).table;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCellValue(cell) {
  if (!cell) return '';
  if (typeof cell.v !== 'undefined' && cell.v !== null) {
    if (String(cell.v).startsWith('Date(') && cell.f) return cell.f;
    return cell.v;
  }
  if (typeof cell.f !== 'undefined' && cell.f !== null) return cell.f;
  return '';
}

function parseGoogleDate(value) {
  if (!value && value !== 0) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const gviz = text.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gviz) return new Date(Number(gviz[1]), Number(gviz[2]), Number(gviz[3]));
  const date = new Date(value);
  if (date.getTime() && !text.includes('0000-00-00')) return date;
  return null;
}

function parseDateValue(value) {
  const date = parseGoogleDate(value);
  return date ? date.getTime() : 0;
}

function formatDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const rangeParts = text.split(/\s+sampai\s+/i);

  const formatSingleDate = (dateValue) => {
    const date = parseGoogleDate(dateValue);
    return date
      ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : String(dateValue).trim();
  };

  if (rangeParts.length > 1) {
    return `${formatSingleDate(rangeParts[0])} sampai ${formatSingleDate(rangeParts[1])}`;
  }

  return formatSingleDate(text);
}

function isDriveFolderUrl(source) {
  if (!source) return false;
  const text = String(source).trim();
  return /\/folders\//i.test(text) || /drive\.google\.com\/drive\/folders/i.test(text);
}

function extractDriveId(source) {
  if (!source) return '';
  const text = String(source).trim();

  const directId = text.match(/(?:id=|\/d\/|\/folders\/)([A-Za-z0-9_-]{10,})/i);
  if (directId && directId[1]) return directId[1];

  const fallback = text.match(/[-\w]{10,}/g);
  return fallback && fallback.length ? fallback[fallback.length - 1] : '';
}

function driveThumbnailUrl(source, size = 640) {
  const id = extractDriveId(source);
  if (!id) return '';
  return `https://drive.google.com/thumbnail?authuser=0&sz=w${size}&id=${id}`;
}

function isTopRank(rank) {
  const text = String(rank || '').trim().toLowerCase();
  return /^(1|juara\s*1|pertama|emas|gold)/.test(text);
}

function levelPillClass(level) {
  const text = String(level || '').toLowerCase();
  if (text.includes('internasional')) return 'feed-pill feed-pill--intl';
  if (text.includes('nasional')) return 'feed-pill feed-pill--nas';
  return 'feed-pill';
}

function sortByDateDesc(rows) {
  return [...rows].sort((a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal));
}

function buildShareText(row) {
  const studentName = row.nama_siswa || row.nama_peserta_didik || 'Siswa SMKNESBU';
  const event = row.nama_kegiatan || 'Lomba';
  const rank = row.peringkat ? ` meraih ${row.peringkat}` : '';
  const level = row.tingkat_lomba ? ` (Tingkat ${row.tingkat_lomba})` : '';
  const place = row.tempat_pelaksanaan || row.tempat || '';
  const date = formatDate(row.tanggal);
  const meta = [date, place].filter(Boolean).join(' · ');

  return [
    `🏆 ${studentName}${rank} pada ${event}${level}!`,
    meta ? `📅 ${meta}` : '',
    '',
    'SMK Negeri 1 Bumijawa',
    '#SMKNESBU #PrestasiSiswa',
    SITE_URL,
  ].filter(Boolean).join('\n');
}

function buildShareLinks(text) {
  const encoded = encodeURIComponent(text);
  const url = encodeURIComponent(SITE_URL);
  return {
    whatsapp: `https://wa.me/?text=${encoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
    telegram: `https://t.me/share/url?url=${url}&text=${encoded}`,
  };
}

async function sharePrestasi(row) {
  const text = buildShareText(row);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Prestasi Siswa SMKNESBU', text, url: SITE_URL });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return true;
    }
  }
  return false;
}

async function copyShareText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function renderEmpty(message) {
  prestasiFeed.innerHTML = '';
  feedEmptyText.textContent = message;
  feedEmpty.hidden = false;
  resultCountEl.textContent = '';
}

function getStudentEntries(row) {
  const names = String(row.nama_siswa || row.nama_peserta_didik || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const nisList = String(row.nis || '')
    .split(',')
    .map((value) => value.trim());

  return names.map((nama, idx) => {
    const nis = nisList[idx] || '';
    const student = nis ? studentMap[nis] : null;
    const kelas = (idx === 0 ? row.kelas : '') || student?.kelas || '';
    return { nama, nis, kelas };
  });
}

function openStudentListModal(entries) {
  if (!studentListModal || !studentListItems) return;
  studentListItems.innerHTML = entries.map((entry) => `
    <li class="student-list__item">
      <span class="student-list__name">${escapeHtml(entry.nama)}</span>
      ${(entry.kelas || entry.nis) ? `<span class="student-list__meta">${[entry.kelas, entry.nis].filter(Boolean).map(escapeHtml).join(' · ')}</span>` : ''}
    </li>
  `).join('');
  studentListModal.hidden = false;
  document.body.classList.add('lightbox-open');
}

function closeStudentListModal() {
  if (!studentListModal) return;
  studentListModal.hidden = true;
  document.body.classList.remove('lightbox-open');
}

if (studentListClose) studentListClose.addEventListener('click', closeStudentListModal);
if (studentListModal) studentListModal.addEventListener('click', (event) => {
  if (event.target === studentListModal) closeStudentListModal();
});

function createFeedCard(row) {
  const docLink = row.dokumen || row.document || '';
  const photoSource = row.foto || row.photo || '';
  const photoUrl = driveThumbnailUrl(photoSource) || (isDriveFolderUrl(photoSource) ? '' : photoSource);
  const studentEntries = getStudentEntries(row);
  const studentName = row.nama_siswa || row.nama_peserta_didik || '';
  const kelas = row.kelas || '';
  const rank = row.peringkat || '';
  const level = row.tingkat_lomba || '';
  const event = row.nama_kegiatan || '';
  const organizer = row.penyelenggara || '';
  const place = row.tempat_pelaksanaan || row.tempat || '';
  const dateStr = formatDate(row.tanggal);
  const shareText = buildShareText(row);
  const links = buildShareLinks(shareText);
  const rankClass = isTopRank(rank) ? 'feed-rank feed-rank--top' : 'feed-rank';

  const article = document.createElement('article');
  article.className = 'feed-card';
  article.innerHTML = `
    <header class="feed-card__header">
      <img class="feed-card__avatar" src="logo.png" alt="" width="36" height="36">
      <div class="feed-card__author">
        <strong>smknesbu</strong>
        <span class="feed-card__date">${escapeHtml(dateStr || 'Prestasi Siswa')}</span>
        ${place ? `<span class="feed-card__place">${escapeHtml(place)}</span>` : ''}
      </div>
      ${level ? `<span class="${levelPillClass(level)}">${escapeHtml(level)}</span>` : ''}
    </header>

    <div class="feed-card__media">
      ${photoUrl
        ? `<img class="feed-card__photo" src="${escapeHtml(photoUrl)}" alt="Foto ${escapeHtml(studentName)}" loading="lazy">`
        : `<div class="feed-card__placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            <span>Prestasi SMKNESBU</span>
          </div>`}
      ${rank ? `<div class="${rankClass}">${escapeHtml(rank)}</div>` : ''}
    </div>

    <div class="feed-card__actions">
      <button class="feed-action feed-action--share" type="button" aria-label="Bagikan prestasi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
      ${docLink ? `<a class="feed-action feed-action--document" href="${escapeHtml(docLink)}" target="_blank" rel="noopener noreferrer" aria-label="Lihat dokumen" title="Lihat dokumen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </a>` : ''}
    </div>

    <div class="feed-card__body">
      <p class="feed-card__caption">
        ${studentEntries.length > 1
          ? `<strong>${escapeHtml(studentEntries[0].nama)}</strong>
             <span class="feed-card__kelas">& ${studentEntries.length - 1} siswa lainnya</span>
             <button class="feed-card__student-btn" type="button">Lihat Siswa (${studentEntries.length})</button>`
          : `<strong>${escapeHtml(studentName)}</strong>
             ${kelas ? `<span class="feed-card__kelas">· ${escapeHtml(kelas)}</span>` : ''}`}
      </p>
      <h3 class="feed-card__event">${escapeHtml(event)}</h3>
      ${organizer ? `<p class="feed-card__meta">${escapeHtml(organizer)}</p>` : ''}
      <p class="feed-card__tags">#SMKNESBU #PrestasiSiswa${level ? ` #${escapeHtml(level.replace(/\s+/g, ''))}` : ''}</p>
    </div>

    <div class="feed-share-menu" hidden>
      <p class="feed-share-menu__title">Bagikan ke</p>
      <div class="feed-share-menu__grid">
        <a class="share-link share-link--wa" href="${links.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="share-link share-link--fb" href="${links.facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a class="share-link share-link--x" href="${links.twitter}" target="_blank" rel="noopener noreferrer">X</a>
        <a class="share-link share-link--tg" href="${links.telegram}" target="_blank" rel="noopener noreferrer">Telegram</a>
        <button class="share-link share-link--copy" type="button">Salin Teks</button>
      </div>
    </div>
  `;

  const shareBtn = article.querySelector('.feed-action--share');
  const shareMenu = article.querySelector('.feed-share-menu');
  const copyBtn = article.querySelector('.share-link--copy');
  const photo = article.querySelector('.feed-card__photo');

  if (photo) {
    photo.addEventListener('error', () => {
      photo.hidden = true;
      const media = article.querySelector('.feed-card__media');
      if (media && !media.querySelector('.feed-card__photo-fallback')) {
        media.insertAdjacentHTML('beforeend', '<div class="feed-card__photo-fallback">Foto tidak dapat dimuat</div>');
      }
    });
    photo.addEventListener('click', () => {
      if (!photoLightbox || !photoLightboxImage) return;
      photoLightboxImage.src = photo.src;
      photoLightbox.hidden = false;
      document.body.classList.add('lightbox-open');
    });
  }

  shareBtn.addEventListener('click', async () => {
    const usedNative = await sharePrestasi(row);
    if (usedNative) return;
    const isOpen = !shareMenu.hidden;
    document.querySelectorAll('.feed-share-menu').forEach((menu) => { menu.hidden = true; });
    shareMenu.hidden = isOpen;
  });

  copyBtn.addEventListener('click', async () => {
    const ok = await copyShareText(shareText);
    copyBtn.textContent = ok ? 'Tersalin!' : 'Gagal';
    setTimeout(() => { copyBtn.textContent = 'Salin Teks'; }, 2000);
  });

  const studentBtn = article.querySelector('.feed-card__student-btn');
  if (studentBtn) {
    studentBtn.addEventListener('click', () => openStudentListModal(studentEntries));
  }

  return article;
}

function closePhotoLightbox() {
  if (!photoLightbox) return;
  photoLightbox.hidden = true;
  if (photoLightboxImage) photoLightboxImage.removeAttribute('src');
  document.body.classList.remove('lightbox-open');
}

if (photoLightboxClose) photoLightboxClose.addEventListener('click', closePhotoLightbox);
if (photoLightbox) photoLightbox.addEventListener('click', (event) => {
  if (event.target === photoLightbox) closePhotoLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePhotoLightbox();
    closeStudentListModal();
  }
});

function renderCards(rows) {
  prestasiFeed.innerHTML = '';
  feedEmpty.hidden = true;

  if (!rows.length) {
    renderEmpty('Data tidak ditemukan. Coba ubah kata kunci pencarian atau filter tingkat lomba.');
    return;
  }

  resultCountEl.textContent = `Menampilkan ${rows.length} dari ${allRows.length} prestasi · urut terbaru`;

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => fragment.appendChild(createFeedCard(row)));
  prestasiFeed.appendChild(fragment);
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filtered = allRows.filter((row) => {
    const level = String(row.tingkat_lomba || '').toLowerCase();
    const matchesFilter = currentFilter === 'all' || level.includes(currentFilter.toLowerCase());
    const combined = [
      row.nama_kegiatan,
      row.penyelenggara,
      row.nama_siswa,
      row.nis,
      row.peringkat,
      row.tempat_pelaksanaan,
      row.tingkat_lomba,
      row.kelas,
      row.jenis_kelamin,
    ].join(' ').toLowerCase();
    const matchesSearch = !searchTerm || combined.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });
  renderCards(sortByDateDesc(filtered));
}

function parseSheetToObjects(rows, headers) {
  const keys = (headers || []).map((col) => normalizeKey(col.label || col.id || 'col'));
  return rows.map((row) => {
    const cells = row.c || [];
    const item = {};
    cells.forEach((cell, idx) => {
      const key = keys[idx] || `col_${idx}`;
      item[key] = getCellValue(cell);
    });
    return item;
  });
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
  return lowered === 'nis' || lowered === 'nama_peserta_didik' || lowered === 'kelas' || lowered === 'jenis_kelamin'
    || lowered === 'no' || lowered === 'nama_kegiatan' || lowered === 'penyelenggara' || lowered === 'nama_siswa'
    || lowered === 'tanggal' || lowered === 'tempat_pelaksanaan' || lowered === 'tingkat_lomba' || lowered === 'peringkat'
    || lowered === 'dokumen' || lowered === 'foto';
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

async function fetchCSV(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

function createStudentList(rows) {
  const students = [];
  const map = {};

  rows.forEach((row) => {
    const nis = String(row.nis || '').trim();
    const nama = String(row.nama_peserta_didik || '').trim();
    const kelas = String(row.kelas || '').trim();
    const jenisKelamin = String(row.jenis_kelamin || '').trim();

    const isHeader = ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nis.toLowerCase()) || ['nis', 'nama peserta didik', 'kelas', 'jenis kelamin'].includes(nama.toLowerCase());

    if (!nama || !nis || isHeader) return;

    const student = { nis, nama_peserta_didik: nama, kelas, jenis_kelamin: jenisKelamin };
    students.push(student);
    if (nis) map[nis] = student;
  });

  return { students, map };
}

function updateStats() {
  totalRowsEl.textContent = allRows.length;
  totalStudentsEl.textContent = allStudents.length || '–';
  lastUpdatedEl.textContent = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function createPrestasiRows(rows, headers) {
  const objects = parseSheetToObjects(rows, headers)
    .filter((item) => {
      const values = Object.values(item).map((value) => String(value ?? '').trim());
      return values.some((value) => value.length > 0) && !values.every((value) => isHeaderLike(value));
    });

  return objects.map((item) => {
    const nis = String(pickValue(item, ['nis']) || '').trim();
    const student = studentMap[nis];

    const result = {
      ...item,
      nis,
      nama_siswa: String(pickValue(item, ['nama_siswa', 'nama_peserta_didik', 'nama']) || student?.nama_peserta_didik || '').trim(),
      nama_kegiatan: String(pickValue(item, ['nama_kegiatan', 'kegiatan', 'nama_lomba']) || '').trim(),
      penyelenggara: String(pickValue(item, ['penyelenggara']) || '').trim(),
      tanggal: String(pickValue(item, ['tanggal', 'tgl']) || '').trim(),
      tempat_pelaksanaan: String(pickValue(item, ['tempat_pelaksanaan', 'tempat']) || '').trim(),
      tempat: String(pickValue(item, ['tempat_pelaksanaan', 'tempat']) || '').trim(),
      tingkat_lomba: String(pickValue(item, ['tingkat_lomba', 'tingkat']) || '').trim(),
      peringkat: String(pickValue(item, ['peringkat', 'juara']) || '').trim(),
      dokumen: String(pickValue(item, ['dokumen', 'lampiran']) || '').trim(),
      foto: String(pickValue(item, ['foto', 'foto_kegiatan']) || '').trim(),
      kelas: item.kelas || student?.kelas || '',
      jenis_kelamin: item.jenis_kelamin || student?.jenis_kelamin || '',
      nama_peserta_didik: String(pickValue(item, ['nama_siswa', 'nama_peserta_didik', 'nama']) || student?.nama_peserta_didik || '').trim(),
    };

    if (nis && student) {
      result.kelas = result.kelas || student.kelas || '';
      result.jenis_kelamin = result.jenis_kelamin || student.jenis_kelamin || '';
      result.nama_peserta_didik = result.nama_peserta_didik || student.nama_peserta_didik || '';
      result.nama_siswa = result.nama_siswa || student.nama_peserta_didik || '';
    }

    return result;
  });
}

async function loadData() {
  try {
    setLoading(true);

    const [csvSiswa, dataPrestasi] = await Promise.all([
      fetchCSV(sheets.datasiswa),
      fetchSheet(sheets.prestasi),
    ]);

    const rowsSiswa = parseCSV(csvSiswa);
    const { students, map } = createStudentList(rowsSiswa);
    allStudents = students;
    studentMap = map;
    allRows = sortByDateDesc(createPrestasiRows(dataPrestasi.rows, dataPrestasi.cols || []));

    updateStats();
    applyFilters();
  } catch (error) {
    console.error(error);
    renderEmpty('Terjadi kesalahan saat memuat data. Pastikan spreadsheet sudah diatur publik dan nama sheet sesuai.');
  } finally {
    setLoading(false);
  }
}

searchInput.addEventListener('input', applyFilters);

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter || 'all';
    applyFilters();
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.feed-action--share') && !e.target.closest('.feed-share-menu')) {
    document.querySelectorAll('.feed-share-menu').forEach((menu) => { menu.hidden = true; });
  }
});

window.addEventListener('DOMContentLoaded', loadData);