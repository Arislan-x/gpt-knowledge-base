(() => {
  if (window.__cbvDeepSeekNetworkHook) {
    return;
  }
  window.__cbvDeepSeekNetworkHook = true;

  const SOURCE = "cbv:deepseek-network";
  const BUFFER_REQUEST_SOURCE = "cbv:deepseek-network-buffer-request";
  const MAX_TEXT_LENGTH = 1_500_000;
  const buffer = [];

  function shouldCapture(url) {
    const value = String(url || "").toLowerCase();
    return /deepseek|chat|conversation|message|completion|session|api/.test(value);
  }

  function emit(kind, url, responseText, requestText = "") {
    if (!responseText && !requestText) {
      return;
    }

    const packet = {
      source: SOURCE,
      kind,
      url: String(url || location.href),
      responseText: truncate(responseText),
      requestText: truncate(requestText),
      at: Date.now()
    };

    buffer.push(packet);
    while (buffer.length > 30) {
      buffer.shift();
    }

    window.postMessage(packet, location.origin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) {
      return;
    }
    if (event.data?.source !== BUFFER_REQUEST_SOURCE) {
      return;
    }
    for (const packet of buffer) {
      window.postMessage(packet, location.origin);
    }
  });

  function truncate(value) {
    const text = String(value || "");
    return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  }

  async function bodyToText(body) {
    try {
      if (!body) {
        return "";
      }
      if (typeof body === "string") {
        return body;
      }
      if (body instanceof URLSearchParams) {
        return body.toString();
      }
      if (body instanceof FormData) {
        return Array.from(body.entries()).map(([key, value]) => {
          return `${key}=${typeof value === "string" ? value : value?.name || "[file]"}`;
        }).join("&");
      }
      if (body instanceof Blob) {
        return await body.text();
      }
      if (body instanceof ArrayBuffer) {
        return new TextDecoder().decode(body);
      }
      if (ArrayBuffer.isView(body)) {
        return new TextDecoder().decode(body);
      }
    } catch {
      return "";
    }
    return "";
  }

  async function fetchRequestText(input, init) {
    if (init?.body) {
      return bodyToText(init.body);
    }
    try {
      if (input instanceof Request) {
        return await input.clone().text();
      }
    } catch {
      return "";
    }
    return "";
  }

  function requestUrl(input) {
    try {
      if (typeof input === "string") {
        return input;
      }
      if (input instanceof URL) {
        return input.href;
      }
      if (input instanceof Request) {
        return input.url;
      }
    } catch {
      return "";
    }
    return "";
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = async function patchedFetch(input, init) {
      const url = requestUrl(input);
      const capture = shouldCapture(url);
      const requestTextPromise = capture
        ? fetchRequestText(input, init)
        : Promise.resolve("");
      const response = await originalFetch.apply(this, arguments);

      if (capture) {
        const responseClone = response.clone();
        Promise.all([
          requestTextPromise,
          responseClone.text().catch(() => "")
        ]).then(([requestText, responseText]) => {
          emit("fetch", url, responseText, requestText);
        }).catch(() => {});
      }

      return response;
    };
  }

  const OriginalXHR = window.XMLHttpRequest;
  if (typeof OriginalXHR === "function") {
    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function patchedOpen(method, url) {
      this.__cbvUrl = String(url || "");
      return originalOpen.apply(this, arguments);
    };

    OriginalXHR.prototype.send = function patchedSend(body) {
      const url = this.__cbvUrl || "";
      const capture = shouldCapture(url);
      const requestTextPromise = capture ? bodyToText(body) : Promise.resolve("");

      if (capture) {
        this.addEventListener("loadend", () => {
          requestTextPromise.then((requestText) => {
            const responseText = typeof this.responseText === "string" ? this.responseText : "";
            emit("xhr", url, responseText, requestText);
          }).catch(() => {});
        });
      }

      return originalSend.apply(this, arguments);
    };
  }
})();
