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

function normalizeHeaderName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getHeaderMap(sheet) {
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = {};

  values.forEach((value, index) => {
    const key = normalizeHeaderName(value);
    if (key) headers[key] = index;
  });

  return headers;
}

function writePrestasiRow(payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('PRESTASI');
  if (!sheet) throw new Error('Sheet PRESTASI tidak ditemukan.');

  const headerMap = getHeaderMap(sheet);
  const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = Array(sheetHeaders.length).fill('');

  const nomorUrutIndex = headerMap.nomor_urut;
  const lastRowCount = sheet.getLastRow() || 1;
  const nomorUrut = Math.max(1, lastRowCount);

  if (nomorUrutIndex !== undefined) {
    row[nomorUrutIndex] = String(nomorUrut);
  }

  const fieldAliases = {
    nama_kegiatan: ['nama_kegiatan', 'nama_lomba', 'kegiatan'],
    penyelenggara: ['penyelenggara'],
    nis: ['nis', 'nis_siswa'],
    nama_siswa: ['nama_siswa', 'nama_peserta_didik', 'nama'],
    tanggal: ['tanggal', 'tgl', 'tanggal_pelaksanaan'],
    tempat: ['tempat', 'tempat_pelaksanaan', 'tempat_lomba'],
    tingkat_lomba: ['tingkat_lomba', 'tingkat', 'tingkat_lomba_1'],
    peringkat: ['peringkat', 'juara'],
    foto: ['foto', 'foto_kegiatan'],
    dokumen: ['dokumen', 'dokumen_pendukung'],
  };

  Object.entries(fieldAliases).forEach(([field, aliases]) => {
    const targetIndex = aliases
      .map((alias) => normalizeHeaderName(alias))
      .map((aliasKey) => headerMap[aliasKey])
      .find((index) => index !== undefined);

    if (targetIndex === undefined) {
      return;
    }

    const value = payload[field];
    row[targetIndex] = value !== undefined && value !== null ? String(value).trim() : '';
  });

  sheet.appendRow(row);
  return { success: true };
}

function findRowIndex(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;

  const headerRow = data[0] || [];
  const headerMap = {};
  headerRow.forEach((header, index) => {
    headerMap[normalizeHeaderName(header)] = index;
  });

  // 1. Try by row index (nomor_urut) if it's a valid row number
  const nomorUrut = parseInt(payload.nomor_urut, 10);
  if (!isNaN(nomorUrut) && nomorUrut >= 2 && nomorUrut <= data.length) {
    const candidateRow = data[nomorUrut - 1]; // 0-indexed in JS array
    // Verify if it matches key fields
    if (matchesKeyFields(candidateRow, headerMap, payload)) {
      return nomorUrut;
    }
  }

  // 2. Search all rows for a match on key fields
  for (let i = 1; i < data.length; i++) {
    if (matchesKeyFields(data[i], headerMap, payload)) {
      return i + 1; // 1-based row index in sheet
    }
  }

  // 3. Fallback to just the row number if we can't find a value-based match but the row number is provided and valid
  if (!isNaN(nomorUrut) && nomorUrut >= 2 && nomorUrut <= data.length) {
    return nomorUrut;
  }

  return -1;
}

function matchesKeyFields(row, headerMap, payload) {
  const fieldsToCompare = [
    { key: 'nama_siswa', aliases: ['nama_siswa', 'nama_peserta_didik', 'nama'] },
    { key: 'nis', aliases: ['nis', 'nis_siswa'] },
    { key: 'nama_kegiatan', aliases: ['nama_kegiatan', 'nama_lomba', 'kegiatan'] },
    { key: 'tanggal', aliases: ['tanggal', 'tgl', 'tanggal_pelaksanaan'] }
  ];

  for (const field of fieldsToCompare) {
    const sheetColIndex = field.aliases
      .map(alias => normalizeHeaderName(alias))
      .map(aliasKey => headerMap[aliasKey])
      .find(index => index !== undefined);

    if (sheetColIndex !== undefined) {
      const sheetVal = row[sheetColIndex];
      const payloadVal = payload[field.key];
      if (payloadVal !== undefined && payloadVal !== null && String(payloadVal).trim() !== '') {
        const sheetStr = getFormattedValue(sheetVal);
        const payloadStr = String(payloadVal).trim();
        if (sheetStr.toLowerCase() !== payloadStr.toLowerCase()) {
          return false;
        }
      }
    }
  }
  return true;
}

function getFormattedValue(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value || '').trim();
}

function updatePrestasiRow(payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('PRESTASI');
  if (!sheet) throw new Error('Sheet PRESTASI tidak ditemukan.');

  const targetRowIndex = findRowIndex(sheet, payload);
  if (targetRowIndex === -1) {
    throw new Error('Data prestasi yang akan diupdate tidak ditemukan.');
  }

  const data = sheet.getDataRange().getValues();
  const headerRow = data[0] || [];
  const headerMap = {};
  headerRow.forEach((header, index) => {
    headerMap[normalizeHeaderName(header)] = index;
  });

  const fieldAliases = {
    nama_kegiatan: ['nama_kegiatan', 'nama_lomba', 'kegiatan'],
    penyelenggara: ['penyelenggara'],
    nis: ['nis', 'nis_siswa'],
    nama_siswa: ['nama_siswa', 'nama_peserta_didik', 'nama'],
    tanggal: ['tanggal', 'tgl', 'tanggal_pelaksanaan'],
    tempat: ['tempat', 'tempat_pelaksanaan', 'tempat_lomba'],
    tingkat_lomba: ['tingkat_lomba', 'tingkat', 'tingkat_lomba_1'],
    peringkat: ['peringkat', 'juara'],
    foto: ['foto', 'foto_kegiatan'],
    dokumen: ['dokumen', 'dokumen_pendukung'],
  };

  const updatedRow = Array(headerRow.length).fill('');
  if (headerMap.nomor_urut !== undefined) {
    updatedRow[headerMap.nomor_urut] = String(payload.nomor_urut || '');
  }

  Object.entries(fieldAliases).forEach(([field, aliases]) => {
    const targetHeader = aliases
      .map((alias) => normalizeHeaderName(alias))
      .find((aliasKey) => headerMap[aliasKey] !== undefined);

    if (!targetHeader) return;

    const columnIndex = headerMap[targetHeader];
    const value = payload[field];
    updatedRow[columnIndex] = value !== undefined && value !== null ? String(value).trim() : '';
  });

  // Preserve existing photo/document if no new file is uploaded
  const existingRow = data[targetRowIndex - 1];
  const fotoHeaderIdx = headerMap.foto;
  if (fotoHeaderIdx !== undefined && !updatedRow[fotoHeaderIdx]) {
    updatedRow[fotoHeaderIdx] = String(existingRow[fotoHeaderIdx] || '').trim();
  }
  const docHeaderIdx = headerMap.dokumen;
  if (docHeaderIdx !== undefined && !updatedRow[docHeaderIdx]) {
    updatedRow[docHeaderIdx] = String(existingRow[docHeaderIdx] || '').trim();
  }

  sheet.getRange(targetRowIndex, 1, 1, headerRow.length).setValues([updatedRow]);
  return { success: true, row: targetRowIndex };
}

function decodeUrlValue(value) {
  return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
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
      const decodedKey = decodeUrlValue(key || '');
      const decodedValue = decodeUrlValue(rest.join('=') || '');
      if (decodedKey) {
        result[decodedKey] = decodedValue;
      }
    });

    return result;
  }
}

function normalizeFormValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0] || '').replace(/\+/g, ' ').trim() : '';
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\+/g, ' ').trim();
}

function doPost(e) {
  try {
    const contentType = e && e.postData && e.postData.type ? e.postData.type : '';
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';

    let body = {};
    if (contentType.indexOf('multipart/form-data') !== -1) {
      const multipartValues = Object.entries(e.parameter || {}).reduce((acc, [key, value]) => {
        acc[key] = normalizeFormValue(value);
        return acc;
      }, {});

      const parameterValues = Object.entries(e.parameters || {}).reduce((acc, [key, value]) => {
        const normalized = Array.isArray(value)
          ? value.map((item) => normalizeFormValue(item)).filter((item) => item !== '')
          : normalizeFormValue(value);

        acc[key] = Array.isArray(normalized) && normalized.length > 0 ? normalized[0] : normalized;
        return acc;
      }, {});

      body = { ...multipartValues, ...parameterValues };
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

    if (action === 'addPrestasi' || action === 'updatePrestasi') {
      const fotoFile = e && e.parameter && e.parameter.fotoFile ? e.parameter.fotoFile : null;
      const dokumenFile = e && e.parameter && e.parameter.dokumenFile ? e.parameter.dokumenFile : null;
      const payload = {
        ...(body.payload && typeof body.payload === 'object' ? body.payload : body),
        foto: '',
        dokumen: '',
      };

      const fallbackPayload = {
        nomor_urut: normalizeFormValue(body.nomor_urut || e.parameter && e.parameter.nomor_urut),
        nama_kegiatan: normalizeFormValue(body.nama_kegiatan || e.parameter && e.parameter.nama_kegiatan),
        penyelenggara: normalizeFormValue(body.penyelenggara || e.parameter && e.parameter.penyelenggara),
        nis: normalizeFormValue(body.nis || e.parameter && e.parameter.nis),
        nama_siswa: normalizeFormValue(body.nama_siswa || e.parameter && e.parameter.nama_siswa),
        tanggal: normalizeFormValue(body.tanggal || e.parameter && e.parameter.tanggal),
        tempat: normalizeFormValue(body.tempat || e.parameter && e.parameter.tempat),
        tingkat_lomba: normalizeFormValue(body.tingkat_lomba || e.parameter && e.parameter.tingkat_lomba),
        peringkat: normalizeFormValue(body.peringkat || e.parameter && e.parameter.peringkat),
      };

      Object.keys(fallbackPayload).forEach((key) => {
        if (fallbackPayload[key] !== '') {
          payload[key] = fallbackPayload[key];
        }
      });

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

      if (action === 'updatePrestasi') {
        const result = updatePrestasiRow(payload);
        return jsonResponse({ success: true, ...result });
      }

      const result = writePrestasiRow(payload);
      return jsonResponse({ success: true, ...result });
    }

    if (action === 'deletePrestasi') {
      const nomorUrut = normalizeFormValue(body.nomor_urut || e.parameter && e.parameter.nomor_urut);
      const payload = {
        nomor_urut: nomorUrut,
        nama_siswa: normalizeFormValue(body.nama_siswa || e.parameter && e.parameter.nama_siswa),
        nis: normalizeFormValue(body.nis || e.parameter && e.parameter.nis),
        nama_kegiatan: normalizeFormValue(body.nama_kegiatan || e.parameter && e.parameter.nama_kegiatan),
        tanggal: normalizeFormValue(body.tanggal || e.parameter && e.parameter.tanggal)
      };

      const sheet = getSpreadsheet().getSheetByName('PRESTASI');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet PRESTASI tidak ditemukan.' });
      }

      const targetRowIndex = findRowIndex(sheet, payload);
      if (targetRowIndex === -1) {
        return jsonResponse({ success: false, message: 'Data prestasi tidak ditemukan untuk dihapus.' });
      }

      sheet.deleteRow(targetRowIndex);
      return jsonResponse({ success: true, message: 'Data prestasi berhasil dihapus.' });
    }

    if (action === 'getUsers') {
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName('AKUN');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet AKUN tidak ditemukan.' });
      }
      const rows = sheet.getDataRange().getValues();
      const users = rows.slice(1).map((row) => ({
        id: String(row[0] || '').trim(),
        user: String(row[1] || '').trim(),
        nama_user: String(row[2] || '').trim(),
        role: String(row[4] || 'admin').trim(),
      })).filter((u) => u.user);
      return jsonResponse({ success: true, users });
    }

    if (action === 'addUser') {
      const namaUser = normalizeFormValue(body.nama_user || '');
      const user = normalizeFormValue(body.user || '');
      const password = normalizeFormValue(body.password || '');
      const role = normalizeFormValue(body.role || 'admin');

      if (!namaUser || !user || !password) {
        return jsonResponse({ success: false, message: 'Nama, username, dan password wajib diisi.' });
      }

      const validRoles = ['admin', 'guru_pembimbing'];
      if (!validRoles.includes(role)) {
        return jsonResponse({ success: false, message: 'Role tidak valid.' });
      }

      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName('AKUN');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet AKUN tidak ditemukan.' });
      }

      const rows = sheet.getDataRange().getValues();
      const duplicate = rows.slice(1).find((row) => String(row[1] || '').trim().toLowerCase() === user.toLowerCase());
      if (duplicate) {
        return jsonResponse({ success: false, message: 'Username sudah digunakan. Pilih username lain.' });
      }

      // Generate next ID
      const ids = rows.slice(1).map((row) => parseInt(row[0], 10)).filter((n) => !isNaN(n));
      const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

      sheet.appendRow([String(nextId), user, namaUser, password, role]);
      return jsonResponse({ success: true, message: 'User baru berhasil ditambahkan.' });
    }

    if (action === 'deleteUser') {
      const userId = normalizeFormValue(body.user_id || '');
      const requestingUser = normalizeFormValue(body.requesting_user || '');

      if (!userId) {
        return jsonResponse({ success: false, message: 'ID user tidak valid.' });
      }

      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName('AKUN');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet AKUN tidak ditemukan.' });
      }

      const data = sheet.getDataRange().getValues();
      let targetRow = -1;
      let targetUsername = '';

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === userId) {
          targetRow = i + 1;
          targetUsername = String(data[i][1] || '').trim();
          break;
        }
      }

      if (targetRow === -1) {
        return jsonResponse({ success: false, message: 'User tidak ditemukan.' });
      }

      if (targetUsername.toLowerCase() === requestingUser.toLowerCase()) {
        return jsonResponse({ success: false, message: 'Tidak dapat menghapus akun yang sedang digunakan.' });
      }

      sheet.deleteRow(targetRow);
      return jsonResponse({ success: true, message: 'User berhasil dihapus.' });
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
