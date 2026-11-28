document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("siag_user")) {
    window.location.href = "dashboard.html";
    return;
  }

  const loader = document.getElementById("loader");
  const loginBox = document.getElementById("loginBox");
  const resetBox = document.getElementById("resetBox");

  function showAlert(elId, msg, isError = true) {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.className = `alert ${isError ? "alert-error" : "alert-success"}`;
    el.classList.remove("hidden");
  }

  async function postApi(payload) {
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

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.getElementById("usuario").value;
    const clave = document.getElementById("clave").value;

    const resp = await postApi({ action: "login", usuario, clave });
    if (resp.success) {
      sessionStorage.setItem("siag_user", JSON.stringify(resp.user));
      window.location.href = "dashboard.html";
    } else {
      showAlert("alertBox", resp.message, true);
    }
  });

  document.getElementById("btnShowReset").addEventListener("click", () => {
    loginBox.classList.add("hidden");
    resetBox.classList.remove("hidden");
  });

  document.getElementById("btnBackLogin").addEventListener("click", () => {
    resetBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  document.getElementById("requestCodeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuarioOrEmail = document.getElementById("resetQuery").value;
    const resp = await postApi({ action: "requestReset", usuarioOrEmail });
    if (resp.success) {
      showAlert("resetAlert", resp.message, false);
      document.getElementById("resetTargetUser").value = resp.usuario;
      document.getElementById("confirmResetForm").classList.remove("hidden");
    } else {
      showAlert("resetAlert", resp.message, true);
    }
  });

  document.getElementById("confirmResetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuarioOrEmail = document.getElementById("resetTargetUser").value;
    const token = document.getElementById("resetToken").value;
    const nuevaClave = document.getElementById("newPassword").value;

    const resp = await postApi({ action: "confirmReset", usuarioOrEmail, token, nuevaClave });
    if (resp.success) {
      showAlert("resetAlert", resp.message, false);
      setTimeout(() => {
        document.getElementById("btnBackLogin").click();
      }, 2000);
    } else {
      showAlert("resetAlert", resp.message, true);
    }
  });
});