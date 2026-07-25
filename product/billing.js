(function initializeBillingPage() {
  const config = window.GPTKB_BILLING_CONFIG || {};
  const status = document.querySelector("#billing-status");
  const progress = document.querySelector("#billing-progress");
  const retryButton = document.querySelector("#retryCheckoutButton");
  const transactionId = new URLSearchParams(location.search).get("_ptxn") || "";

  retryButton.addEventListener("click", openCheckout);

  if (!window.Paddle) {
    showError("Paddle 结账组件加载失败，请检查网络后重试。");
    return;
  }
  if (!config.clientToken) {
    showError("Paddle 客户端令牌尚未配置。");
    return;
  }
  if (!transactionId) {
    showError("缺少结账交易编号，请从扩展中重新选择套餐。");
    return;
  }

  if (config.environment === "sandbox") {
    window.Paddle.Environment.set("sandbox");
  }
  window.Paddle.Initialize({
    token: config.clientToken,
    eventCallback(event) {
      if (event.name === "checkout.completed") {
        status.textContent = "付款已完成。你可以返回扩展，套餐状态会在几秒内更新。";
        progress.classList.add("is-complete");
        retryButton.hidden = true;
      } else if (event.name === "checkout.closed") {
        status.textContent = "结账窗口已关闭。";
        progress.classList.remove("is-active");
        retryButton.hidden = false;
      } else if (event.name === "checkout.error") {
        showError("结账发生错误，请稍后重试。");
      }
    }
  });
  openCheckout();

  function openCheckout() {
    retryButton.hidden = true;
    status.textContent = "正在连接 Paddle 安全结账...";
    progress.classList.add("is-active");
    window.Paddle.Checkout.open({
      transactionId,
      settings: {
        displayMode: "overlay",
        locale: "zh",
        theme: "light"
      }
    });
  }

  function showError(message) {
    status.textContent = message;
    status.classList.add("is-error");
    progress.classList.remove("is-active");
    retryButton.hidden = false;
  }
})();
