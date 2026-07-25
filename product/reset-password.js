(function initializePasswordReset() {
  const language = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  const copy = {
    zh: {
      pageTitle: "GPT 知识库 - 重置密码",
      title: "重置密码",
      description: "为你的 GPT 知识库云账户设置一个至少 8 位的新密码。",
      newPassword: "新密码",
      confirmPassword: "再次输入",
      save: "保存新密码",
      back: "返回产品页",
      invalidLink: "重置链接无效或已经过期，请回到扩展重新发送。",
      notConfigured: "密码重置服务尚未配置。",
      tooShort: "密码至少需要 8 个字符。",
      mismatch: "两次输入的密码不一致。",
      saving: "正在保存...",
      failed: "密码更新失败。",
      completed: "密码已更新。现在可以关闭本页并回到扩展登录。"
    },
    en: {
      pageTitle: "GPT Knowledge Base - Reset password",
      title: "Reset password",
      description: "Set a new password of at least 8 characters for your GPT Knowledge Base cloud account.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      save: "Save new password",
      back: "Back to product page",
      invalidLink: "This reset link is invalid or has expired. Request another one from the extension.",
      notConfigured: "Password reset is not configured.",
      tooShort: "Password must contain at least 8 characters.",
      mismatch: "The passwords do not match.",
      saving: "Saving...",
      failed: "Unable to update the password.",
      completed: "Password updated. You can close this page and sign in from the extension."
    }
  };
  const t = copy[language];
  const config = window.GPTKB_AUTH_CONFIG || {};
  const form = document.querySelector("#resetPasswordForm");
  const password = document.querySelector("#newPassword");
  const confirmation = document.querySelector("#confirmPassword");
  const submitButton = document.querySelector("#savePasswordButton");
  const status = document.querySelector("#resetPasswordStatus");
  const values = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = values.get("access_token") || "";
  const recoveryType = values.get("type") || "";
  const authError = values.get("error_description") || values.get("error") || "";

  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t.pageTitle;
  document.querySelector("#reset-title").textContent = t.title;
  document.querySelector("#reset-description").textContent = t.description;
  document.querySelector("#new-password-label").textContent = t.newPassword;
  document.querySelector("#confirm-password-label").textContent = t.confirmPassword;
  submitButton.textContent = t.save;
  document.querySelector("#reset-return").textContent = t.back;
  history.replaceState(null, "", location.pathname);

  if (authError) {
    disableForm(authError);
    return;
  }
  if (!accessToken || recoveryType !== "recovery") {
    disableForm(t.invalidLink);
    return;
  }
  if (!isConfigured()) {
    disableForm(t.notConfigured);
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (password.value.length < 8) {
      showStatus(t.tooShort, true);
      return;
    }
    if (password.value !== confirmation.value) {
      showStatus(t.mismatch, true);
      return;
    }

    submitButton.disabled = true;
    showStatus(t.saving);
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: password.value })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || body.error_description || body.error || t.failed);
      }

      password.value = "";
      confirmation.value = "";
      form.hidden = true;
      showStatus(t.completed);
    } catch (error) {
      showStatus(error?.message || String(error), true);
      submitButton.disabled = false;
    }
  });

  function isConfigured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "") &&
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey || "");
  }

  function disableForm(message) {
    form.hidden = true;
    showStatus(message, true);
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }
})();
