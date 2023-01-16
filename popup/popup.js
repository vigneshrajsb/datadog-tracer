const info = document.getElementById("info");

const traceLbl = document.getElementById("traceID");
const traceLink = document.getElementById("link");
const errorCard = document.getElementById("error");
const errorMsg = document.getElementById("errorMessage");

const toggleInput = document.getElementById("toggle");

toggleInput.addEventListener("click", async () => {
  if (toggleInput.checked) {
    const savedSettings = await chrome.storage.local.get("tracerSettings");
    const domain = savedSettings?.tracerSettings?.domain;

    // get tab info
    const tab = await getCurrentTab();

    // check if current tab url has domain in URL. post error to avoid confusion
    if (!tab.url.includes(domain)) {
      errorCard.style.display = "block";
      errorMsg.innerHTML = "Tracing cannot be activated!! Domain doesn't match";
      toggleInput.checked = false;
      return;
    }

    // random value
    const traceId = `${Date.now()}${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    // set popup state
    traceLbl.innerHTML = traceId;
    traceLink.href = `https://app.datadoghq.com/apm/trace/${traceId}`;

    info.style.display = "block";

    // send message to add session rules
    chrome.runtime.sendMessage({ trace: traceId, tab: tab.id, enable: true });
  } else {
    // set popup state
    info.style.display = "none";
    errorCard.style.display = "none";
    let status = await getTracerStatus();
    // send message to remove session rules
    chrome.runtime.sendMessage({ enable: false, tab: status.tab });
  }
});

// get current tab object
const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
};

const getTracerStatus = async () => {
  const response = await chrome.storage.local.get("tracer");
  return { tab: response?.tracer?.tabId, trace: response?.tracer?.traceId };
};

const startUp = async () => {
  const status = await getTracerStatus();
  const isActive = Boolean(status?.tab);

  if (!isActive) return;

  // set popup state
  info.style.display = "block";

  toggleInput.checked = true;

  traceLbl.innerHTML = status.trace;
  traceLink.href = `https://app.datadoghq.com/apm/trace/${status.trace}`;
};

// STARTUP
startUp();
