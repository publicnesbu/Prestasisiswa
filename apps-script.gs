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

function updatePrestasiRow(payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('PRESTASI');
  if (!sheet) throw new Error('Sheet PRESTASI tidak ditemukan.');

  const data = sheet.getDataRange().getValues();
  const headerRow = data[0] || [];
  const headerMap = {};
  headerRow.forEach((header, index) => {
    headerMap[normalizeHeaderName(header)] = index;
  });

  const nomorUrut = normalizeFormValue(payload.nomor_urut || '');
  if (!nomorUrut) {
    throw new Error('Nomor urut tidak valid untuk update data.');
  }

  let targetRowIndex = -1;
  for (let index = 1; index < data.length; index += 1) {
    const currentValue = String(data[index][headerMap.nomor_urut] || '').trim();
    if (currentValue === nomorUrut) {
      targetRowIndex = index + 1;
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error('Data prestasi yang akan diupdate tidak ditemukan.');
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

  const updatedRow = Array(headerRow.length).fill('');
  updatedRow[headerMap.nomor_urut] = nomorUrut;

  Object.entries(fieldAliases).forEach(([field, aliases]) => {
    const targetHeader = aliases
      .map((alias) => normalizeHeaderName(alias))
      .find((aliasKey) => headerMap[aliasKey] !== undefined);

    if (!targetHeader) return;

    const columnIndex = headerMap[targetHeader];
    const value = payload[field];
    updatedRow[columnIndex] = value !== undefined && value !== null ? String(value).trim() : '';
  });

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
      if (!nomorUrut) {
        return jsonResponse({ success: false, message: 'Nomor urut tidak valid.' });
      }

      const sheet = getSpreadsheet().getSheetByName('PRESTASI');
      if (!sheet) {
        return jsonResponse({ success: false, message: 'Sheet PRESTASI tidak ditemukan.' });
      }

      const data = sheet.getDataRange().getValues();
      const headerRow = data[0] || [];
      const nomorUrutIndex = headerRow.findIndex((header) => normalizeHeaderName(header) === 'nomor_urut');

      if (nomorUrutIndex === -1) {
        return jsonResponse({ success: false, message: 'Kolom nomor_urut tidak ditemukan di sheet PRESTASI.' });
      }

      let deleted = false;
      for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
        const candidate = String(data[rowIndex][nomorUrutIndex] || '').trim();
        if (candidate === nomorUrut) {
          sheet.deleteRow(rowIndex + 1);
          deleted = true;
          break;
        }
      }

      if (!deleted) {
        return jsonResponse({ success: false, message: 'Data prestasi tidak ditemukan untuk dihapus.' });
      }

      return jsonResponse({ success: true, message: 'Data prestasi berhasil dihapus.' });
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
