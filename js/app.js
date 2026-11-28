let currentUser = null;
let appData = {};
let activeTab = "Actas Individuales";
let editingRowIndex = null;
let hasExecutedSearch = false;
let currentFilteredRecords = [];

document.addEventListener("DOMContentLoaded", async () => {
  const rawUser = sessionStorage.getItem("siag_user");
  if (!rawUser) {
    window.location.href = "index.html";
    return;
  }
  currentUser = JSON.parse(rawUser);

  document.getElementById("userBadge").textContent = `${currentUser.nombre} | ${currentUser.rol}`;

  document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.removeItem("siag_user");
    window.location.href = "index.html";
  });

  if (currentUser.rol === "ADMINISTRADOR") {
    const tabsBar = document.getElementById("tabsBar");
    ["Usuarios", "Institucion", "Municipio"].forEach(tabName => {
      const btn = document.createElement("button");
      btn.className = "tab-btn";
      btn.dataset.tab = tabName;
      btn.textContent = tabName;
      tabsBar.appendChild(btn);
    });
  }

  document.getElementById("tabsBar").addEventListener("click", (e) => {
    if (!e.target.classList.contains("tab-btn")) return;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    activeTab = e.target.dataset.tab;
    hasExecutedSearch = false;
    currentFilteredRecords = [];
    renderWorkspace();
  });

  await loadAllData(false);
});

async function postApi(payload) {
  const loader = document.getElementById("loader");
  loader.classList.add("active");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return await res.json();
  } finally {
    loader.classList.remove("active");
  }
}

async function loadAllData(keepSearch = false) {
  const statusEl = document.getElementById("systemStatus");
  statusEl.textContent = "⏳ Cargando datos de validación del sistema...";

  const resp = await postApi({
    action: "getData",
    rol: currentUser.rol,
    usuarioNombre: currentUser.nombre
  });

  if (resp.success) {
    appData = resp.data;
    statusEl.textContent = "✅ Datos de validación cargados correctamente.";
    renderWorkspace(keepSearch);
  } else {
    statusEl.textContent = "⚠️ Error al cargar datos: " + resp.message;
  }
}

function renderWorkspace(keepSearch = false) {
  document.getElementById("searchInput").value = "";
  renderSearchFilters();
  renderRoleButtons();

  if (keepSearch && hasExecutedSearch) {
    ejecutarConsulta();
  } else {
    hasExecutedSearch = false;
    currentFilteredRecords = [];
    document.getElementById("emptyStateBox").classList.remove("hidden");
    document.getElementById("tableWrapper").classList.add("hidden");
    document.getElementById("recordCounter").textContent = "Sin consulta ejecutada";
  }
}

function renderSearchFilters() {
  const container = document.getElementById("searchFilters");
  const isAdmin = currentUser.rol === "ADMINISTRADOR";

  if ((activeTab === "Actas Individuales" || activeTab === "Actas Generales") && isAdmin) {
    const municipios = (appData["Municipio"]?.records || []).map(r => r.MUNICIPIO).filter(Boolean);
    container.innerHTML = `
      <div class="form-group" style="margin:0;">
        <label>Municipio</label>
        <select id="filterMunicipio" class="form-control">
          <option value="">Todos los municipios</option>
          ${municipios.map(m => `<option value="${m}">${m}</option>`).join("")}
        </select>
      </div>
      <div class="form-group" style="margin:0;">
        <label>Código DANE / Institución</label>
        <input type="text" id="filterDane" class="form-control" placeholder="Ej: 17001 o UNO">
      </div>
      <div class="form-group" style="margin:0;">
        <button type="button" class="btn btn-primary" style="width:100%;" onclick="ejecutarConsulta()">
          🔍 Consultar Registros
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="form-group" style="margin:0;">
        <button type="button" class="btn btn-primary" style="width:100%;" onclick="ejecutarConsulta()">
          🔍 Consultar Registros
        </button>
      </div>
    `;
  }
}

function renderRoleButtons() {
  const box = document.getElementById("roleActionButtons");
  box.innerHTML = "";

  const canCreate =
    currentUser.rol === "ADMINISTRADOR" ||
    (currentUser.rol === "OPERADOR" &&
      (activeTab === "Actas Individuales" || activeTab === "Actas Generales"));

  if (canCreate) {
    const btnNew = document.createElement("button");
    btnNew.className = "btn btn-success";
    btnNew.textContent = `+ Nuevo Registro en ${activeTab}`;
    btnNew.onclick = () => openCrudModal(null);
    box.appendChild(btnNew);
  }

  const btnExport = document.createElement("button");
  btnExport.className = "btn btn-primary";
  btnExport.textContent = "📊 Exportar Consultados a Excel";
  btnExport.onclick = exportarConsultadosExcel;
  box.appendChild(btnExport);
}

function ejecutarConsulta() {
  const sheetObj = appData[activeTab];
  if (!sheetObj) return;

  hasExecutedSearch = true;
  const fMun = (document.getElementById("filterMunicipio")?.value || "").toLowerCase().trim();
  const fDane = (document.getElementById("filterDane")?.value || "").toLowerCase().trim();

  currentFilteredRecords = sheetObj.records.filter(rec => {
    const matchMun = !fMun || String(rec["MUNICIPIO"] || "").toLowerCase() === fMun;
    const matchDane = !fDane ||
      String(rec["CODDANE"] || "").toLowerCase().includes(fDane) ||
      String(rec["INSTITUCIÓN"] || rec["INSTITUCION"] || "").toLowerCase().includes(fDane);
    return matchMun && matchDane;
  });

  document.getElementById("searchInput").value = "";
  renderConsultedTable();
}

function filterTable(inputId, tableId) {
  const query = (document.getElementById(inputId)?.value || "").toLowerCase().trim();
  const sheetObj = appData[activeTab];
  if (!sheetObj) return;

  const baseList = hasExecutedSearch ? currentFilteredRecords : sheetObj.records;
  const filtered = !query
    ? baseList
    : baseList.filter(rec =>
        sheetObj.headers.some(h => String(rec[h] || "").toLowerCase().includes(query))
      );

  if (query && !hasExecutedSearch) {
    hasExecutedSearch = true;
    currentFilteredRecords = filtered;
    renderConsultedTable();
    document.getElementById("recordCounter").textContent =
      `Registros visibles: ${filtered.length}`;
    return;
  }

  const table = document.getElementById(tableId);
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  let visibleCount = 0;

  rows.forEach(row => {
    if (row.cells.length === 1 && row.cells[0].colSpan > 1) {
      row.style.display = "";
      return;
    }
    const text = row.textContent.toLowerCase();
    const match = !query || text.includes(query);
    row.style.display = match ? "" : "none";
    if (match) visibleCount++;
  });

  document.getElementById("recordCounter").textContent =
    `Registros visibles: ${visibleCount} de ${currentFilteredRecords.length} consultados`;
}

function renderConsultedTable() {
  const sheetObj = appData[activeTab];
  const thead = document.getElementById("tableHead");
  const tbody = document.getElementById("tableBody");
  const emptyBox = document.getElementById("emptyStateBox");
  const wrapper = document.getElementById("tableWrapper");

  if (!hasExecutedSearch) {
    emptyBox.classList.remove("hidden");
    wrapper.classList.add("hidden");
    return;
  }

  emptyBox.classList.add("hidden");
  wrapper.classList.remove("hidden");

  const headers = sheetObj.headers;
  thead.innerHTML = `<tr>
    ${headers.map(h => `<th>${h}</th>`).join("")}
    <th>Acciones</th>
  </tr>`;

  document.getElementById("recordCounter").textContent =
    `Registros consultados: ${currentFilteredRecords.length}`;

  if (currentFilteredRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" style="text-align:center; padding:20px;">No se encontraron registros para mostrar.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentFilteredRecords.map(rec => {
    let actionBtns = "";

    if (currentUser.rol === "ADMINISTRADOR") {
      actionBtns += `
        <button class="btn btn-primary btn-sm" onclick='openCrudModal(${JSON.stringify(rec)})'>Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRecord(${rec._rowIndex})">Eliminar</button>
      `;
    }

    if (activeTab === "Actas Individuales" || activeTab === "Actas Generales") {
      const tipoCarpeta = activeTab === "Actas Individuales" ? "INDIVIDUAL" : "GENERAL";
      const actaDato = rec["NUMERO ACTA"] || rec["NÚMERO ACTA"] || rec["RESOLUCIÓN"] || rec["RESOLUCION"] || "";
      const refDato = rec["NÚMERO DOCUMENTO"] || rec["NUMERO DOCUMENTO"] || rec["CODDANE"] || "";
      actionBtns += `
        <button class="btn btn-success btn-sm" onclick="consultarArchivo('${tipoCarpeta}', '${escapeAttr(actaDato)}', '${escapeAttr(refDato)}')">
          🔍 Consultar Archivo
        </button>
      `;
    }

    return `<tr>
      ${headers.map(h => `<td>${rec[h] || ""}</td>`).join("")}
      <td style="white-space: nowrap;">${actionBtns}</td>
    </tr>`;
  }).join("");
}

function escapeAttr(str) {
  return String(str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function exportarConsultadosExcel() {
  if (!hasExecutedSearch || currentFilteredRecords.length === 0) {
    alert("Primero consulte registros para poder exportar a Excel.");
    return;
  }

  const headers = appData[activeTab].headers;
  let tableHtml = `<table border="1"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>`;

  currentFilteredRecords.forEach(rec => {
    tableHtml += `<tr>${headers.map(h => `<td>${escapeHtml(rec[h] || "")}</td>`).join("")}</tr>`;
  });
  tableHtml += `</tbody></table>`;

  const blob = new Blob(
    [`\ufeff<html><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`],
    { type: "application/vnd.ms-excel;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `SIAG_${activeTab.replace(/\s+/g, "_")}_${fecha}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function consultarArchivo(tipo, resolucion, referencia) {
  const resp = await postApi({
    action: "findPdf",
    tipo,
    resolucion,
    referencia
  });

  if (resp.success && resp.url) {
    window.open(resp.url, "_blank", "noopener,noreferrer");
  } else {
    alert(resp.message || "No se encontró el archivo asociado.");
  }
}

function openCrudModal(record) {
  if (record && currentUser.rol !== "ADMINISTRADOR") {
    alert("Solo el administrador puede editar registros existentes.");
    return;
  }

  editingRowIndex = record ? record._rowIndex : null;
  const isNewActa = !record && (activeTab === "Actas Individuales" || activeTab === "Actas Generales");

  document.getElementById("crudModalTitle").textContent = record
    ? `Editar Registro en ${activeTab}`
    : `Nuevo Registro en ${activeTab}`;

  const pdfSection = document.getElementById("crudPdfSection");
  const pdfFileInput = document.getElementById("crudPdfFile");
  pdfFileInput.value = "";
  if (isNewActa) {
    pdfSection.classList.remove("hidden");
    pdfFileInput.required = true;
  } else {
    pdfSection.classList.add("hidden");
    pdfFileInput.required = false;
  }

  const headers = appData[activeTab].headers;
  const fieldsDiv = document.getElementById("crudFields");
  fieldsDiv.innerHTML = "";

  headers.forEach(h => {
    let val = record ? (record[h] || "") : "";
    if (!record && currentUser.rol === "OPERADOR" && (h === "CODDANE" || h === "USUARIO")) {
      val = currentUser.nombre;
    }

    let inputHtml = `<input type="text" name="${h}" class="form-control" value="${val}" required>`;

    if (h === "MUNICIPIO" && appData["Municipio"]) {
      const opts = appData["Municipio"].records.map(m =>
        `<option value="${m.MUNICIPIO}" ${String(m.MUNICIPIO).toUpperCase() === String(val).toUpperCase() ? "selected" : ""}>${m.MUNICIPIO}</option>`
      ).join("");
      inputHtml = `<select name="${h}" class="form-control" required><option value="">Seleccione...</option>${opts}</select>`;
    } else if (h === "TIPO DOCUMENTO" && appData["TDocumento"]) {
      const opts = appData["TDocumento"].records.map(t =>
        `<option value="${t.TIPO}" ${String(t.TIPO).toUpperCase() === String(val).toUpperCase() ? "selected" : ""}>${t.TIPO}</option>`
      ).join("");
      inputHtml = `<select name="${h}" class="form-control" required><option value="">Seleccione...</option>${opts}</select>`;
    } else if (h === "ROL") {
      inputHtml = `<select name="${h}" class="form-control" required>
        <option value="ADMINISTRADOR" ${val === "ADMINISTRADOR" ? "selected" : ""}>ADMINISTRADOR</option>
        <option value="OPERADOR" ${val === "OPERADOR" ? "selected" : ""}>OPERADOR</option>
      </select>`;
    } else if (h === "ESTADO") {
      inputHtml = `<select name="${h}" class="form-control" required>
        <option value="ACTIVO" ${val === "ACTIVO" ? "selected" : ""}>ACTIVO</option>
        <option value="INACTIVO" ${val === "INACTIVO" ? "selected" : ""}>INACTIVO</option>
      </select>`;
    }

    fieldsDiv.innerHTML += `
      <div class="form-group">
        <label>${h} *</label>
        ${inputHtml}
      </div>
    `;
  });

  document.getElementById("crudModal").classList.add("open");
}

document.getElementById("crudForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const record = {};

  for (const [k, v] of formData.entries()) {
    if (!String(v || "").trim()) {
      alert(`El campo "${k}" es obligatorio.`);
      return;
    }
    record[k] = String(v).trim();
  }

  const isNewActa = !editingRowIndex && (activeTab === "Actas Individuales" || activeTab === "Actas Generales");
  const fileInput = document.getElementById("crudPdfFile");
  const file = fileInput.files[0];

  if (isNewActa) {
    if (!file) {
      alert("Debe adjuntar un archivo en formato .PDF para guardar el registro.");
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Error: Solo se permiten archivos en formato .PDF");
      return;
    }
  }

  let pdfPayload = null;
  if (isNewActa && file) {
    const base64Data = await readFileAsBase64(file);
    pdfPayload = {
      action: "uploadPdf",
      tipo: activeTab === "Actas Individuales" ? "INDIVIDUAL" : "GENERAL",
      fileName: file.name,
      mimeType: file.type,
      base64Data
    };
  }

  const resp = await postApi({
    action: "saveRecord",
    rol: currentUser.rol,
    sheetName: activeTab,
    rowIndex: editingRowIndex,
    record,
    pdfPayload
  });

  alert(resp.message);
  if (resp.success) {
    closeModal("crudModal");
    await loadAllData(true);
  }
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deleteRecord(rowIndex) {
  if (!confirm("¿Está seguro de eliminar este registro permanentemente?")) return;
  const resp = await postApi({
    action: "deleteRecord",
    rol: currentUser.rol,
    sheetName: activeTab,
    rowIndex
  });
  alert(resp.message);
  if (resp.success) await loadAllData(true);
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}