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
const btnCopyAll = document.getElementById('btn-copy-all');

// --- Verification Sequence Logic ---

const verificationSteps = [
  { progress: 15, status: "Handshake seguro", log: "Conectando ao servidor..." },
  { progress: 35, status: "Verificação humana", log: "Avaliando assinatura de segurança..." },
  { progress: 60, status: "Validando Token", log: "Consultando banco de dados SQLite..." },
  { progress: 85, status: "Registrando Acesso", log: "Vinculando e bloqueando IP de segurança..." },
  { progress: 100, status: "Concluído", log: "Credenciais liberadas com sucesso!" }
];

async function runVerificationAnimation() {
  inputView.classList.add('hide');
  verifyingView.classList.remove('hide');
  
  for (const step of verificationSteps) {
    verifyStatus.innerText = step.status;
    verifyLog.innerText = step.log;
    verifyProgress.style.width = `${step.progress}%`;
    
    // Simulate natural processing delay for each step
    await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 200));
  }
}

// --- Form Submission ---

redeemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorAlert.classList.add('hide');
  
  const rawCode = redeemCodeInput.value.trim();
  if (!rawCode) return;

  try {
    // 1. Call Backend Redeem API
    const response = await fetch('/api/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: rawCode })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Erro ao resgatar código.");
      return;
    }

    // 2. Play simulated loading animation
    await runVerificationAnimation();

    // 3. Populate credentials
    const creds = data.credentials;

    if (creds.username) {
      accountUser.innerText = creds.username;
      fieldUserContainer.classList.remove('hide');
    } else {
      fieldUserContainer.classList.add('hide');
    }

    if (creds.password) {
      accountPass.innerText = creds.password;
      fieldPassContainer.classList.remove('hide');
    } else {
      fieldPassContainer.classList.add('hide');
    }

    if (creds.extra) {
      accountExtra.innerText = creds.extra;
      fieldExtraContainer.classList.remove('hide');
    } else {
      fieldExtraContainer.classList.add('hide');
    }
    
    // 4. Reveal account view
    verifyingView.classList.add('hide');
    revealView.classList.remove('hide');

  } catch (err) {
    console.error(err);
    showError("Erro ao comunicar com o servidor. Verifique sua conexão.");
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

// --- Copy All (User + Password) Action ---
btnCopyAll.addEventListener('click', async () => {
  const userText = accountUser.innerText;
  const passText = accountPass.innerText;
  const textToCopy = `Usuário: ${userText}\nSenha: ${passText}`;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Visually indicate success
    btnCopyAll.classList.add('copied');
    const originalText = btnCopyAll.innerHTML;
    btnCopyAll.innerHTML = '<i class="fa-solid fa-check"></i> Dados Copiados!';
    
    setTimeout(() => {
      btnCopyAll.classList.remove('copied');
      btnCopyAll.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    console.error("Falha ao copiar tudo: ", err);
  }
});
