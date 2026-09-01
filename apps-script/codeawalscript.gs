// ============================================================
// FAMILY TREE - Google Apps Script API
// ============================================================
// 
// SETUP INSTRUCTIONS:
// 1. Buka Google Sheets baru di https://sheets.google.com
// 2. Buat 2 sheet dengan nama persis: "Persons" dan "Relationships"
// 3. Di sheet "Persons", tambahkan header di baris 1:
//    ID | Name | Gender | Birth Date | Photo URL | Notes
// 4. Di sheet "Relationships", tambahkan header di baris 1:
//    ID | Person ID | Related Person ID | Relationship Type
// 5. Buka menu Extensions > Apps Script
// 6. Hapus semua kode default, paste seluruh kode ini
// 7. Klik Deploy > New Deployment
// 8. Pilih type: Web App
// 9. Set "Execute as": Me
// 10. Set "Who has access": Anyone
// 11. Klik Deploy dan copy URL yang diberikan
// 12. Paste URL tersebut ke aplikasi Family Tree
//
// ============================================================

// ===== CONFIGURATION =====
const PERSONS_SHEET = 'Persons';
const RELATIONSHIPS_SHEET = 'Relationships';

// ===== AUTH =====
// PIN TIDAK disimpan di sini. Set sebagai Script Properties:
//   Project Settings > Script properties > Add:
//     USER_PIN   = pin untuk membuka aplikasi (role "viewer")
//     ADMIN_PIN  = pin untuk mode edit (role "admin")
// Aksi di bawah ini butuh role "admin"; selain itu cukup "viewer".
const WRITE_ACTIONS = [
  'createPerson',
  'updatePerson',
  'deletePerson',
  'createRelationship',
  'updateRelationship',
  'deleteRelationship'
];

function getPins_() {
  const p = PropertiesService.getScriptProperties();
  return {
    user: p.getProperty('USER_PIN') || '',
    admin: p.getProperty('ADMIN_PIN') || ''
  };
}

// Kembalikan "admin" | "viewer" | null
function roleForPin_(pin) {
  if (pin === undefined || pin === null) return null;
  const pins = getPins_();
  const s = String(pin);
  if (pins.admin && s === pins.admin) return 'admin';
  if (pins.user && s === pins.user) return 'viewer';
  return null;
}

function authError_(message) {
  return jsonResponse({
    success: false,
    code: 'AUTH',
    message: message || 'PIN salah atau sesi berakhir.'
  });
}

// Kembalikan { role } bila lolos, atau { error: <ContentService> } bila ditolak.
function requireRole_(pin, action) {
  const role = roleForPin_(pin);
  if (!role) return { error: authError_('PIN salah.') };
  if (WRITE_ACTIONS.indexOf(action) !== -1 && role !== 'admin') {
    return { error: authError_('Butuh PIN admin untuk aksi ini.') };
  }
  return { role: role };
}

// ===== HELPERS =====
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function generateId(prefix, sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return prefix + '001';
  const ids = data.slice(1).map(r => r[0]).filter(id => id && id.startsWith(prefix));
  if (ids.length === 0) return prefix + '001';
  const maxNum = Math.max(...ids.map(id => parseInt(id.replace(prefix, ''), 10)));
  return prefix + String(maxNum + 1).padStart(3, '0');
}

function findRowIndex(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) return i + 1; // 1-based row number
  }
  return -1;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== GET HANDLERS =====
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    const pin = e.parameter.pin;

    // Cek PIN ke server (dipakai layar kunci & login admin di frontend)
    if (action === 'verifyPin') {
      const role = roleForPin_(pin);
      if (!role) return authError_('PIN salah.');
      return jsonResponse({ success: true, role: role });
    }

    const gate = requireRole_(pin, action);
    if (gate.error) return gate.error;

    switch (action) {
      case 'getPersons':
        return jsonResponse({ success: true, data: getPersons() });
      
      case 'getRelationships':
        return jsonResponse({ success: true, data: getRelationships() });
      
      case 'getPerson':
        return jsonResponse(getPerson(e.parameter.id));
      
      case 'getAll':
        return jsonResponse({
          success: true,
          data: {
            persons: getPersons(),
            relationships: getRelationships()
          }
        });
      
      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function getPersons() {
  const sheet = getSheet(PERSONS_SHEET);
  const data = sheetToArray(sheet);
  return data.map(p => ({
    id: String(p['ID'] || ''),
    name: String(p['Name'] || ''),
    gender: String(p['Gender'] || ''),
    birthDate: p['Birth Date'] ? Utilities.formatDate(new Date(p['Birth Date']), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
    photoUrl: String(p['Photo URL'] || ''),
    notes: String(p['Notes'] || '')
  }));
}

function getRelationships() {
  const sheet = getSheet(RELATIONSHIPS_SHEET);
  const data = sheetToArray(sheet);
  return data.map(r => ({
    id: String(r['ID'] || ''),
    personId: String(r['Person ID'] || ''),
    relatedPersonId: String(r['Related Person ID'] || ''),
    type: String(r['Relationship Type'] || '')
  }));
}

function getPerson(id) {
  const persons = getPersons();
  const person = persons.find(p => p.id === id);
  if (!person) return { success: false, message: 'Person not found' };
  return { success: true, data: person };
}

// ===== POST HANDLERS =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';

    const gate = requireRole_(data.pin, action);
    if (gate.error) return gate.error;

    switch (action) {
      case 'createPerson':
        return jsonResponse(createPerson(data));
      
      case 'updatePerson':
        return jsonResponse(updatePerson(data));
      
      case 'deletePerson':
        return jsonResponse(deletePerson(data.id));
      
      case 'createRelationship':
        return jsonResponse(createRelationship(data));
      
      case 'updateRelationship':
        return jsonResponse(updateRelationship(data));
      
      case 'deleteRelationship':
        return jsonResponse(deleteRelationship(data.id));
      
      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function createPerson(data) {
  const sheet = getSheet(PERSONS_SHEET);
  const id = generateId('P', sheet);
  
  sheet.appendRow([
    id,
    data.name || '',
    data.gender || '',
    data.birthDate || '',
    data.photoUrl || '',
    data.notes || ''
  ]);
  
  return {
    success: true,
    data: {
      id: id,
      name: data.name || '',
      gender: data.gender || '',
      birthDate: data.birthDate || '',
      photoUrl: data.photoUrl || '',
      notes: data.notes || ''
    }
  };
}

function updatePerson(data) {
  const sheet = getSheet(PERSONS_SHEET);
  const row = findRowIndex(sheet, data.id);
  if (row === -1) return { success: false, message: 'Person not found' };
  
  const range = sheet.getRange(row, 2, 1, 5); // Columns B-F
  range.setValues([[
    data.name || '',
    data.gender || '',
    data.birthDate || '',
    data.photoUrl || '',
    data.notes || ''
  ]]);
  
  return {
    success: true,
    data: {
      id: data.id,
      name: data.name || '',
      gender: data.gender || '',
      birthDate: data.birthDate || '',
      photoUrl: data.photoUrl || '',
      notes: data.notes || ''
    }
  };
}

function deletePerson(id) {
  const sheet = getSheet(PERSONS_SHEET);
  const row = findRowIndex(sheet, id);
  if (row === -1) return { success: false, message: 'Person not found' };
  
  // Also delete related relationships
  const relSheet = getSheet(RELATIONSHIPS_SHEET);
  const relData = relSheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = relData.length - 1; i >= 1; i--) {
    if (relData[i][1] === id || relData[i][2] === id) {
      rowsToDelete.push(i + 1);
    }
  }
  // Delete from bottom up to preserve indices
  rowsToDelete.forEach(r => relSheet.deleteRow(r));
  
  sheet.deleteRow(row);
  return { success: true, data: { id: id } };
}

function createRelationship(data) {
  const sheet = getSheet(RELATIONSHIPS_SHEET);
  const id = generateId('R', sheet);
  
  // Check for duplicate
  const existing = getRelationships();
  const isDuplicate = existing.some(r =>
    (r.personId === data.personId && r.relatedPersonId === data.relatedPersonId && r.type === data.type) ||
    (r.personId === data.relatedPersonId && r.relatedPersonId === data.personId && r.type === data.type)
  );
  
  if (isDuplicate) {
    return { success: false, message: 'Relationship already exists' };
  }
  
  sheet.appendRow([
    id,
    data.personId || '',
    data.relatedPersonId || '',
    data.type || ''
  ]);
  
  return {
    success: true,
    data: {
      id: id,
      personId: data.personId || '',
      relatedPersonId: data.relatedPersonId || '',
      type: data.type || ''
    }
  };
}

function updateRelationship(data) {
  const sheet = getSheet(RELATIONSHIPS_SHEET);
  const row = findRowIndex(sheet, data.id);
  if (row === -1) return { success: false, message: 'Relationship not found' };
  
  const range = sheet.getRange(row, 2, 1, 3);
  range.setValues([[
    data.personId || '',
    data.relatedPersonId || '',
    data.type || ''
  ]]);
  
  return { success: true, data: data };
}

function deleteRelationship(id) {
  const sheet = getSheet(RELATIONSHIPS_SHEET);
  const row = findRowIndex(sheet, id);
  if (row === -1) return { success: false, message: 'Relationship not found' };
  
  sheet.deleteRow(row);
  return { success: true, data: { id: id } };
}