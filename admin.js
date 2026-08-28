// Admin Dashboard Configuration
// Default password has been updated.
const ADMIN_PASSWORD_HASH = "27e84d2dac5921cc3c0e11329d0f794309260228b329979532b379e20a0e04ad"; // SHA-256 of "kio2026@"

// State variables
let sessionUnlocked = false;
let newAccountsList = []; // Accounts created in the current session
let importedDatabase = {}; // Loaded from existing database.json

// Elements
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authPasswordInput = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');

const adminContainer = document.getElementById('admin-container');
const addAccountForm = document.getElementById('add-account-form');
const accUsername = document.getElementById('acc-username');
const accPassword = document.getElementById('acc-password');
const accExtra = document.getElementById('acc-extra');
const accCustomCode = document.getElementById('acc-custom-code');

const importDbFile = document.getElementById('import-db-file');
const codeList = document.getElementById('code-list');
const btnExportJson = document.getElementById('btn-export-json');
const btnExportTxt = document.getElementById('btn-export-txt');
const btnLogout = document.getElementById('btn-logout');

// --- Authentication ---

// Check if already unlocked in this session
if (sessionStorage.getItem('admin_authenticated') === 'true') {
  unlockAdminPanel();
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hide');
  
  const password = authPasswordInput.value;
  const passwordHash = await sha256Hex(password);
  
  if (passwordHash === ADMIN_PASSWORD_HASH) {
    sessionStorage.setItem('admin_authenticated', 'true');
    unlockAdminPanel();
  } else {
    authError.classList.remove('hide');
    authPasswordInput.value = '';
    authPasswordInput.focus();
  }
});

btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem('admin_authenticated');
  window.location.reload();
});

function unlockAdminPanel() {
  sessionUnlocked = true;
  authOverlay.classList.add('hide');
  adminContainer.classList.remove('hide');
}

// --- Cryptography Helpers ---

// ArrayBuffer to Base64 String
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// SHA-256 to Hex String
async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Import code as a raw AES-GCM Key (using its SHA-256 hash)
async function getCryptoKey(code) {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(code.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey);
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
}

// Encrypt payload using the code
async function encryptPayload(plaintext, code) {
  const key = await getCryptoKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedPlaintext
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

// Generate code format: GM-XXXX-XXXX-XXXX
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GM-${segment()}-${segment()}-${segment()}`;
}

// --- Import Database ---

importDbFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      importedDatabase = parsed;
      alert(`Banco de dados importado com sucesso! ${Object.keys(parsed).length} registros carregados.`);
      updateExportButtonsState();
    } catch (err) {
      alert("Erro ao ler o arquivo JSON. Certifique-se de que é um banco de dados válido.");
      importDbFile.value = '';
    }
  };
  reader.readAsText(file);
});

// --- UI & Accounts List Management ---

addAccountForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = accUsername.value.trim();
  const password = accPassword.value.trim();
  const extra = accExtra.value.trim();
  let code = accCustomCode.value.trim().toUpperCase();
  
  if (!code) {
    code = generateRandomCode();
  }
  
  // Add to session list
  newAccountsList.push({
    code: code,
    username: username,
    password: password,
    extra: extra
  });
  
  // Reset form inputs (except password/username for rapid entry, clear them anyways)
  accUsername.value = '';
  accPassword.value = '';
  accExtra.value = '';
  accCustomCode.value = '';
  
  renderCodesList();
  updateExportButtonsState();
  accUsername.focus();
});

function renderCodesList() {
  if (newAccountsList.length === 0) {
    codeList.innerHTML = '<div class="no-codes">Nenhuma conta adicionada nesta sessão.</div>';
    return;
  }
  
  codeList.innerHTML = '';
  
  newAccountsList.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'code-item';
    
    itemEl.innerHTML = `
      <div class="code-info">
        <span class="code-text">${item.code}</span>
        <span class="code-account-desc">User: ${item.username}</span>
      </div>
      <div class="code-actions">
        <button class="btn-icon copy" title="Copiar Código" onclick="copyTextToClipboard('${item.code}')">
          <i class="fa-regular fa-copy"></i>
        </button>
        <button class="btn-icon" title="Excluir" onclick="deleteSessionItem(${index})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    codeList.appendChild(itemEl);
  });
}

window.deleteSessionItem = function(index) {
  newAccountsList.splice(index, 1);
  renderCodesList();
  updateExportButtonsState();
};

window.copyTextToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Código copiado para a área de transferência!");
  } catch (err) {
    console.error("Falha ao copiar: ", err);
  }
};

function updateExportButtonsState() {
  const hasItems = newAccountsList.length > 0;
  const hasImported = Object.keys(importedDatabase).length > 0;
  
  btnExportJson.disabled = !(hasItems || hasImported);
  btnExportTxt.disabled = !hasItems;
}

// --- Export database.json ---

btnExportJson.addEventListener('click', async () => {
  // 1. Create a copy of the imported db (or empty object)
  const finalDatabase = { ...importedDatabase };
  
  // 2. Encrypt and add new session accounts to it
  for (const item of newAccountsList) {
    const rawPayload = JSON.stringify({
      username: item.username,
      password: item.password,
      extra: item.extra
    });
    
    try {
      const encryptedData = await encryptPayload(rawPayload, item.code);
      const codeHash = await sha256Hex(item.code);
      
      // Store in final database under code's SHA-256 hash
      finalDatabase[codeHash] = {
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv
      };
    } catch (err) {
      console.error(`Falha ao criptografar conta para o código ${item.code}: `, err);
      alert(`Erro na criptografia para o código: ${item.code}`);
      return;
    }
  }
  
  // 3. Trigger download of database.json
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalDatabase, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "database.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  
  alert("Arquivo database.json baixado com sucesso! Lembre-se de substituir o arquivo antigo por este na raiz do seu site.");
});

// --- Copy Codes for Sales (TXT format) ---

btnExportTxt.addEventListener('click', () => {
  if (newAccountsList.length === 0) return;
  
  let txtOutput = "=== CÓDIGOS DE ENTREGA GAMERMARKET ===\n\n";
  newAccountsList.forEach(item => {
    txtOutput += `Código: ${item.code}\nConta: ${item.username}\nSenha: ${item.password}\n`;
    if (item.extra) {
      txtOutput += `Instruções: ${item.extra}\n`;
    }
    txtOutput += "--------------------------------------\n";
  });
  
  navigator.clipboard.writeText(txtOutput)
    .then(() => {
      alert("Lista de entrega copiada para a área de transferência! Cole em um arquivo .txt ou diretamente no painel do GamerMarket.");
    })
    .catch(err => {
      console.error(err);
      alert("Falha ao copiar lista. Veja os logs do console.");
    });
});
