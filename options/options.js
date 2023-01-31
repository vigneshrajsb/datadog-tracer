const domainInput = document.getElementById("domain");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const statusMsg = document.getElementById("status");
const error = document.getElementById("error");
const errorMsg = document.getElementById("errorMessage");

saveButton.addEventListener("click", async () => {
  const domainUrl = domainInput.value;

  if (!domainUrl) {
    setErrorMessage("Please enter a valid domain");
    return;
  }

  await chrome.storage.local.set({
    tracerSettings: { domain: domainUrl },
  });
  setStatus("Settings saved successfully!");
});

domainInput.addEventListener("focus", async () => {
  error.style.display = "hidden";
  errorMsg.innerHTML = "";

  statusMsg.style.display = "hidden";
  statusMsg.innerHTML = "";
});

resetButton.addEventListener("click", async () => {
  try {
    await chrome.storage.local.remove(["tracerSettings", "tracer"]);
    domainInput.value = "";
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
  const domain = savedSettings?.tracerSettings?.domain;

  if (!domain) return;

  domainInput.value = domain;
};

// STARTUP
startUp();
