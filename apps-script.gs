const SHEET_ID = '1z6Duylri5Y1KMQD77l87mACsHcH73Q-LwXbbN2eIpEg';
const PHOTO_FOLDER_ID = '1BCfH4hbHwjQoBc2jYT7JNmami7QqtQHi';
const DOC_FOLDER_ID = '1sU009ewxZzJJqLC05Vffm2kHBR7lYBRq';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getDriveUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function uploadFileToFolder(file, folderId) {
  if (!file || !file.getName || !folderId) return '';

  const folder = DriveApp.getFolderById(folderId);
  const uploaded = folder.createFile(file);
  const fileId = uploaded.getId();
  return getDriveUrl(fileId);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getHeaderMap(sheet) {
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = {};

  values.forEach((value, index) => {
    const key = String(value || '').trim().toLowerCase();
    if (key) headers[key] = index;
  });

  return headers;
}

function writePrestasiRow(payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('PRESTASI');
  if (!sheet) throw new Error('Sheet PRESTASI tidak ditemukan.');

  const headerMap = getHeaderMap(sheet);
  const fieldOrder = [
    'nama_kegiatan',
    'penyelenggara',
    'nis',
    'nama_siswa',
    'tanggal',
    'tempat',
    'tingkat_lomba',
    'peringkat',
    'foto',
    'dokumen',
  ];

  const maxCols = Math.max(sheet.getLastColumn(), fieldOrder.length);
  const row = Array(maxCols).fill('');

  fieldOrder.forEach((field) => {
    const columnIndex = headerMap[field] ?? fieldOrder.indexOf(field);
    if (columnIndex >= 0 && columnIndex < row.length) {
      row[columnIndex] = payload[field] || '';
    }
  });

  const headers = sheet.getRange(1, 1, 1, maxCols).getValues()[0];
  const normalized = headers.map((value, index) => {
    return row[index] || '';
  });

  sheet.appendRow(normalized);
  return { success: true };
}

function parseRequestBody(raw) {
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    const result = {};
    const pairs = raw.split('&');

    pairs.forEach((pair) => {
      if (!pair) return;
      const [key, ...rest] = pair.split('=');
      const decodedKey = decodeURIComponent(key || '');
      const decodedValue = decodeURIComponent((rest.join('=') || ''));
      if (decodedKey) {
        result[decodedKey] = decodedValue;
      }
    });

    return result;
  }
}

function doPost(e) {
  try {
    const contentType = e && e.postData && e.postData.type ? e.postData.type : '';
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';

    let body = {};
    if (contentType.indexOf('multipart/form-data') !== -1) {
      body = Object.fromEntries(Object.entries(e.parameter || {}).map(([key, value]) => [key, value && value.length > 1 ? value : value[0]]));
    } else {
      body = parseRequestBody(raw);
    }

    const action = body.action || 'addPrestasi';

    if (action === 'login') {
      const user = String(body.user || '').trim();
      const password = String(body.password || '').trim();

      if (!user || !password) {
        return jsonResponse({ success: false, message: 'Username dan password wajib diisi.' });
      }

      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName('AKUN');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet AKUN tidak ditemukan.' });
      }

      const rows = sheet.getDataRange().getValues();
      const userRow = rows.find((row) => {
        const sheetUser = String(row[1] || '').trim();
        const sheetPassword = String(row[3] || '').trim();
        return sheetUser.toLowerCase() === user.toLowerCase() && sheetPassword === password;
      });

      if (!userRow) {
        return jsonResponse({ success: false, message: 'Username atau password salah.' });
      }

      return jsonResponse({
        success: true,
        user: {
          user: String(userRow[1] || '').trim(),
          nama_user: String(userRow[2] || '').trim(),
          role: String(userRow[4] || 'admin').trim(),
        },
      });
    }

    if (action === 'addPrestasi') {
      const fotoFile = e && e.parameter && e.parameter.fotoFile ? e.parameter.fotoFile : null;
      const dokumenFile = e && e.parameter && e.parameter.dokumenFile ? e.parameter.dokumenFile : null;
      const payload = {
        ...(body.payload && typeof body.payload === 'object' ? body.payload : body),
        foto: '',
        dokumen: '',
      };

      if (fotoFile && typeof fotoFile.getName === 'function') {
        payload.foto = uploadFileToFolder(fotoFile, PHOTO_FOLDER_ID);
      }

      if (dokumenFile && typeof dokumenFile.getName === 'function') {
        payload.dokumen = uploadFileToFolder(dokumenFile, DOC_FOLDER_ID);
      }

      const required = ['nama_kegiatan', 'penyelenggara', 'nis', 'nama_siswa'];
      const missing = required.filter((field) => !String(payload[field] || '').trim());

      if (missing.length) {
        return jsonResponse({
          success: false,
          message: 'Kolom ' + missing.join(', ') + ' wajib diisi.',
        });
      }

      const result = writePrestasiRow(payload);
      return jsonResponse({ success: true, ...result });
    }

    return jsonResponse({ success: false, message: 'Action tidak dikenal.' });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : 'Terjadi kesalahan server.',
    });
  }
}

function doGet() {
  return jsonResponse({ success: true, message: 'Apps Script aktif.' });
}
