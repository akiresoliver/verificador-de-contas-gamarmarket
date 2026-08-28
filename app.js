// Elements
const redeemForm = document.getElementById('redeem-form');
const redeemCodeInput = document.getElementById('redeem-code');
const errorAlert = document.getElementById('error-alert');
const errorMessage = document.getElementById('error-message');

const inputView = document.getElementById('input-view');
const verifyingView = document.getElementById('verifying-view');
const revealView = document.getElementById('reveal-view');

const verifyStatus = document.getElementById('verify-status');
const verifyProgress = document.getElementById('verify-progress');
const verifyLog = document.getElementById('verify-log');

const accountUser = document.getElementById('account-user');
const accountPass = document.getElementById('account-pass');
const accountExtra = document.getElementById('account-extra');
const fieldUserContainer = document.getElementById('field-user-container');
const fieldPassContainer = document.getElementById('field-pass-container');
const fieldExtraContainer = document.getElementById('field-extra-container');

const btnBack = document.getElementById('btn-back');

// --- Helper Cryptographic Functions ---

// Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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
    ['decrypt']
  );
}

// Decrypt the payload
async function decryptPayload(ciphertextBase64, ivBase64, code) {
  const key = await getCryptoKey(code);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertext = new Uint8Array(base64ToArrayBuffer(ciphertextBase64));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

// --- Verification Sequence Logic ---

const verificationSteps = [
  { progress: 10, status: "Handshake seguro", log: "Conectando ao banco descentralizado..." },
  { progress: 30, status: "Verificação humana", log: "Analisando heurística de comportamento..." },
  { progress: 55, status: "Localizando registro", log: "Buscando hash correspondente no banco de dados..." },
  { progress: 75, status: "Descriptografia", log: "Carregando chaves e descriptografando dados da conta..." },
  { progress: 95, status: "Finalizando", log: "Liberando credenciais de acesso..." },
  { progress: 100, status: "Concluído", log: "Sucesso!" }
];

async function runVerificationAnimation() {
  inputView.classList.add('hide');
  verifyingView.classList.remove('hide');
  
  for (const step of verificationSteps) {
    verifyStatus.innerText = step.status;
    verifyLog.innerText = step.log;
    verifyProgress.style.width = `${step.progress}%`;
    
    // Simulate natural processing delay for each step
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 500));
  }
}

// --- Form Submission ---

redeemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorAlert.classList.add('hide');
  
  const rawCode = redeemCodeInput.value.trim();
  if (!rawCode) return;

  try {
    // 1. Fetch database.json (cache-busting to ensure we always get the latest)
    const dbResponse = await fetch(`database.json?t=${Date.now()}`);
    if (!dbResponse.ok) {
      throw new Error("Erro ao carregar o banco de dados. Verifique se o arquivo database.json foi criado.");
    }
    
    const db = await dbResponse.json();
    
    // 2. Hash the code
    const codeHash = await sha256Hex(rawCode);
    
    // 3. Find in database
    if (!db[codeHash]) {
      showError("Código de resgate inválido ou já expirou.");
      return;
    }
    
    const record = db[codeHash];

    // 4. Play simulation verification animation
    await runVerificationAnimation();
    
    // 5. Decrypt
    try {
      const decryptedString = await decryptPayload(record.ciphertext, record.iv, rawCode);
      const accountData = JSON.parse(decryptedString);
      
      // Populate and reveal fields
      if (accountData.username) {
        accountUser.innerText = accountData.username;
        fieldUserContainer.classList.remove('hide');
      } else {
        fieldUserContainer.classList.add('hide');
      }

      if (accountData.password) {
        accountPass.innerText = accountData.password;
        fieldPassContainer.classList.remove('hide');
      } else {
        fieldPassContainer.classList.add('hide');
      }

      if (accountData.extra) {
        accountExtra.innerText = accountData.extra;
        fieldExtraContainer.classList.remove('hide');
      } else {
        fieldExtraContainer.classList.add('hide');
      }
      
      // Reveal account view
      verifyingView.classList.add('hide');
      revealView.classList.remove('hide');
      
    } catch (decryptErr) {
      console.error(decryptErr);
      verifyingView.classList.add('hide');
      inputView.classList.remove('hide');
      showError("Falha na descriptografia. O código está correto, mas a chave é incompatível.");
    }

  } catch (err) {
    console.error(err);
    showError(err.message || "Erro desconectado ao buscar conta.");
  }
});

function showError(msg) {
  errorMessage.innerText = msg;
  errorAlert.classList.remove('hide');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Navigation ---

btnBack.addEventListener('click', () => {
  revealView.classList.add('hide');
  inputView.classList.remove('hide');
  redeemCodeInput.value = '';
});

// --- Copy to Clipboard Utility ---

document.querySelectorAll('.btn-copy').forEach(button => {
  button.addEventListener('click', async () => {
    const targetId = button.getAttribute('data-target');
    const textToCopy = document.getElementById(targetId).innerText;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Visually indicate copy success
      button.classList.add('copied');
      const icon = button.querySelector('i');
      icon.className = 'fa-solid fa-check';
      
      setTimeout(() => {
        button.classList.remove('copied');
        icon.className = 'fa-regular fa-copy';
      }, 2000);
    } catch (err) {
      console.error("Falha ao copiar: ", err);
    }
  });
});
