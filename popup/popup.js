const info = document.getElementById("info");

const traceLbl = document.getElementById("traceID");
const traceLink = document.getElementById("link");
const errorCard = document.getElementById("error");
const errorMsg = document.getElementById("errorMessage");

const toggleInput = document.getElementById("toggle");

// Get domains from settings with backward compatibility
async function getDomainsFromSettings() {
  const savedSettings = await chrome.storage.local.get("tracerSettings");
  const settings = savedSettings?.tracerSettings;

  if (!settings) return [];

  // New format: domains array
  if (settings.domains && Array.isArray(settings.domains)) {
    return settings.domains;
  }

  // Old format: single domain (backward compatibility)
  if (settings.domain) {
    return [settings.domain];
  }

  return [];
}

toggleInput.addEventListener("click", async () => {
  if (toggleInput.checked) {
    const domains = await getDomainsFromSettings();

    // Check if domains are configured
    if (domains.length === 0) {
      errorCard.style.display = "block";
      errorMsg.innerHTML =
        "No domains configured! Please add domains in the extension options.";
      toggleInput.checked = false;
      return;
    }

    // get tab info
    const tab = await getCurrentTab();

    // check if current tab url matches any configured domain
    const matchesDomain = domains.some((domain) => tab.url.includes(domain));
    if (!matchesDomain) {
      errorCard.style.display = "block";
      errorMsg.innerHTML =
        "Tracing cannot be activated!! The current tab doesn't match any configured domain.";
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
