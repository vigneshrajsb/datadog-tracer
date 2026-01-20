const domainsInput = document.getElementById("domains");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const statusMsg = document.getElementById("status");
const error = document.getElementById("error");
const errorMsg = document.getElementById("errorMessage");

// Parse textarea input: split by newlines, trim whitespace, filter empty lines
function parseDomainsInput(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

saveButton.addEventListener("click", async () => {
  const domains = parseDomainsInput(domainsInput.value);

  if (domains.length === 0) {
    setErrorMessage("Please enter at least one valid domain");
    return;
  }

  await chrome.storage.local.set({
    tracerSettings: { domains },
  });
  setStatus("Settings saved successfully!");
});

domainsInput.addEventListener("focus", async () => {
  error.style.display = "hidden";
  errorMsg.innerHTML = "";

  statusMsg.style.display = "hidden";
  statusMsg.innerHTML = "";
});

resetButton.addEventListener("click", async () => {
  try {
    await chrome.storage.local.remove(["tracerSettings", "tracer"]);
    domainsInput.value = "";
    setStatus("Reset successful!");
  } catch (error) {
    setErrorMessage(error.message);
  } finally {
  }
});

function setErrorMessage(err) {
  error.style.display = "block";
  errorMsg.innerHTML = `ERROR!!! ${err}`;
  statusMsg.style.display = "hidden";
  statusMsg.innerHTML = "";
}

function setStatus(message) {
  statusMsg.style.display = "block";
  statusMsg.innerHTML = message;
}

const startUp = async () => {
  const savedSettings = await chrome.storage.local.get("tracerSettings");
  const settings = savedSettings?.tracerSettings;

  if (!settings) return;

  // Migration: if old single domain exists, convert to domains array
  if (settings.domain && !settings.domains) {
    const domains = [settings.domain];
    await chrome.storage.local.set({
      tracerSettings: { domains },
    });
    domainsInput.value = domains.join("\n");
    setStatus("Migrated single domain to new format");
    return;
  }

  if (settings.domains && settings.domains.length > 0) {
    domainsInput.value = settings.domains.join("\n");
  }
};

// STARTUP
startUp();
