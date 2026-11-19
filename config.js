// config.js
const CONFIG = {
    // REEMPLAZA ESTA URL con la de tu despliegue de Apps Script
    API_URL: "https://script.google.com/macros/s/AKfycbxyRCuI3o80jOxF7bxBrNFhfrGLzKrm8rDtErZhC30bE3tif_y6QDKFmRQwjL9jJIMWLg/exec", 
    COLORS: {
        primary: "#094062", 
        secondary: "#05b700", 
        accent: "#f9c900" 
    }
};

const UI = {
    getHeader: () => `
        <header style="background-color: ${CONFIG.COLORS.primary}; color: white; padding: 20px; text-align: center; border-bottom: 5px solid ${CONFIG.COLORS.accent};">
            <img src="logo.png" alt="Logo" style="height: 80px; vertical-align: middle; margin-right: 15px;">
            <div style="display: inline-block; vertical-align: middle; text-align: left;">
                
                <h2 style="margin: 0; font-size: 18px; color: ${CONFIG.COLORS.accent};">GESTIÓN DE ACTAS DE GRADO</h2>
            </div>
            ${localStorage.getItem('role') ? `<button onclick="logout()" style="float: right; margin-top: 20px; background: ${CONFIG.COLORS.secondary}; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-weight:bold;">Cerrar Sesión</button>` : ''}
        </header>
    `,
    getStyles: () => `
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background-color: #f4f7f6; }
            .container { padding: 20px; max-width: 1200px; margin: auto; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px;}
            input, select, button { padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px; }
            button { background-color: ${CONFIG.COLORS.primary}; color: white; border: none; cursor: pointer; font-weight: bold;}
            button:hover { opacity: 0.9; }
            .btn-green { background-color: ${CONFIG.COLORS.secondary}; }
            .btn-danger { background-color: #d9534f; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: ${CONFIG.COLORS.primary}; color: white; }
            .search-bar { width: 100%; padding: 12px; margin-bottom: 15px; border: 2px solid ${CONFIG.COLORS.accent}; }
        </style>
    `
};

async function apiCall(data) {
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    return response.json();
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function filterTable(inputId, tableId) {
    const input = document.getElementById(inputId).value.toUpperCase();
    const table = document.getElementById(tableId);
    const tr = table.getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        let textContent = tr[i].textContent || tr[i].innerText;
        tr[i].style.display = textContent.toUpperCase().indexOf(input) > -1 ? "" : "none";
    }
}
