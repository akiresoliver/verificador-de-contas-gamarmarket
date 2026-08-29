let token = localStorage.getItem("gm_admin_token");

// Elements
const authOverlay = document.getElementById("auth-overlay");
const authForm = document.getElementById("auth-form");
const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const authErrorMsg = document.getElementById("auth-error-msg");

const adminContainer = document.getElementById("admin-container");
const btnLogout = document.getElementById("btn-logout");

const productSelect = document.getElementById("product-select");
const addCodesForm = document.getElementById("add-codes-form");
const codesInput = document.getElementById("codes-input");

const syncLimit = document.getElementById("sync-limit");
const btnSync = document.getElementById("btn-sync");

const createProductForm = document.getElementById("create-product-form");
const prodName = document.getElementById("prod-name");
const prodGmId = document.getElementById("prod-gm-id");
const prodVariant = document.getElementById("prod-variant");
const prodSeparator = document.getElementById("prod-separator");

const statAvailable = document.getElementById("stat-available");
const statSent = document.getElementById("stat-sent");
const statReserved = document.getElementById("stat-reserved");
const statRedeemed = document.getElementById("stat-redeemed");

const stockList = document.getElementById("stock-list");

// --- API Request Helper ---
async function api(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Un-authorized, force logout
      logout();
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    throw new Error(data.error || "Erro na comunicação com a API.");
  }

  return data;
}

// --- Session Handling ---
if (token) {
  unlockAdminPanel();
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hide");

  const user = authUsername.value.trim();
  const password = authPassword.value;

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ user, password })
    });

    token = data.token;
    localStorage.setItem("gm_admin_token", token);
    unlockAdminPanel();
  } catch (err) {
    authErrorMsg.innerText = err.message || "Erro ao fazer login.";
    authError.classList.remove("hide");
    authPassword.value = "";
    authPassword.focus();
  }
});

btnLogout.addEventListener("click", () => {
  logout();
});

function logout() {
  localStorage.removeItem("gm_admin_token");
  token = null;
  adminContainer.classList.add("hide");
  authOverlay.classList.remove("hide");
  authUsername.value = "";
  authPassword.value = "";
}

function unlockAdminPanel() {
  authOverlay.classList.add("hide");
  adminContainer.classList.remove("hide");
  loadProducts();
}

// --- Load Products Dropdown ---
async function loadProducts() {
  try {
    const products = await api("/api/products");
    
    productSelect.innerHTML = "";
    
    if (products.length === 0) {
      productSelect.innerHTML = '<option value="">Crie um produto abaixo primeiro...</option>';
      clearStatsAndStock();
      return;
    }

    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = `${product.name} (GM ID: #${product.gamemarket_id})`;
      productSelect.appendChild(option);
    });

    // Load active product stats & stock list
    loadProductDetails();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function clearStatsAndStock() {
  statAvailable.innerText = "0";
  statSent.innerText = "0";
  statReserved.innerText = "0";
  statRedeemed.innerText = "0";
  stockList.innerHTML = '<div class="no-codes">Nenhum produto cadastrado.</div>';
}

// --- Load Product Stats and Stock List ---
productSelect.addEventListener("change", loadProductDetails);

async function loadProductDetails() {
  const productId = productSelect.value;
  if (!productId) return;

  try {
    // 1. Fetch Stats
    const stats = await api(`/api/products/${productId}/stats`);
    statAvailable.innerText = stats.available;
    statSent.innerText = stats.sent;
    statReserved.innerText = stats.reserved;
    statRedeemed.innerText = stats.redeemed;

    // 2. Fetch Stock Codes
    const codes = await api(`/api/products/${productId}/codes`);
    renderStockList(codes);

  } catch (err) {
    console.error(err);
  }
}

// --- Render Stock Codes Table ---
function renderStockList(codes) {
  if (codes.length === 0) {
    stockList.innerHTML = '<div class="no-codes">Nenhum código cadastrado neste produto.</div>';
    return;
  }

  stockList.innerHTML = "";

  codes.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.className = "code-item";

    const badgeColor = getStatusBadgeColor(item.status);
    const ipText = item.ip ? ` | IP: ${item.ip}` : "";
    
    itemEl.innerHTML = `
      <div class="code-info">
        <span class="code-text">${escapeHtml(item.code)}</span>
        <span class="code-account-desc">Conta: ${escapeHtml(item.username)} (${escapeHtml(item.status).toUpperCase()}${ipText})</span>
      </div>
      <div class="code-actions">
        <button class="btn-icon copy" title="Copiar Código de Venda" onclick="copyTextToClipboard('${item.code}')">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>
    `;
    stockList.appendChild(itemEl);
  });
}

function getStatusBadgeColor(status) {
  if (status === 'available') return 'var(--accent-cyan)';
  if (status === 'sent') return 'var(--accent-purple)';
  if (status === 'redeemed') return 'var(--accent-green)';
  return 'var(--text-muted)';
}

window.copyTextToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Código de venda copiado!");
  } catch (err) {
    console.error("Falha ao copiar: ", err);
  }
};

// --- Create New Product ---
createProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = prodName.value.trim();
  const gamemarket_id = prodGmId.value.trim();
  const variant_index = Number(prodVariant.value || 0);
  const separator = prodSeparator.value || "--";

  try {
    await api("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name,
        gamemarket_id,
        variant_index,
        separator
      })
    });

    alert("Produto cadastrado com sucesso!");
    createProductForm.reset();
    prodVariant.value = "0";
    prodSeparator.value = "--";
    
    // Refresh product list and focus on the new one
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
});

// --- Add Codes / Credentials ---
addCodesForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const productId = productSelect.value;
  if (!productId) {
    alert("Selecione ou crie um produto antes de adicionar códigos.");
    return;
  }

  const rawCodes = codesInput.value;

  try {
    const result = await api(`/api/products/${productId}/codes`, {
      method: "POST",
      body: JSON.stringify({ codes: rawCodes })
    });

    alert(`Sucesso! ${result.added} contas adicionadas ao estoque.`);
    codesInput.value = "";

    // Automatically copy new delivery codes to clipboard if any were added
    if (result.codes && result.codes.length > 0) {
      const codesText = result.codes.join("\n");
      try {
        await navigator.clipboard.writeText(codesText);
        alert("Lista de códigos gerados copiada automaticamente para a sua área de transferência!");
      } catch (clipErr) {
        console.warn("Falha ao auto-copiar códigos: ", clipErr);
      }
    }

    // Refresh stock details
    loadProductDetails();

  } catch (err) {
    alert(err.message);
  }
});

// --- Sync with GamerMarket ---
btnSync.addEventListener("click", async () => {
  const productId = productSelect.value;
  if (!productId) return;

  const limit = Number(syncLimit.value || 20);

  btnSync.disabled = true;
  const originalHtml = btnSync.innerHTML;
  btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const result = await api(`/api/products/${productId}/sync`, {
      method: "POST",
      body: JSON.stringify({ limit })
    });

    alert(`Sucesso! ${result.sent} códigos enviados para o painel do GamerMarket.`);
    loadProductDetails();

  } catch (err) {
    alert(`Erro de sincronização: ${err.message}`);
  } finally {
    btnSync.disabled = false;
    btnSync.innerHTML = originalHtml;
  }
});

// --- Utilities ---
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
