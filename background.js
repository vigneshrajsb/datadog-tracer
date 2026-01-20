const allResourceTypes = Object.values(
  chrome.declarativeNetRequest.ResourceType
);

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

// Create rules for all domains with fixed sequential integer IDs
const rules = async (traceID, tabID) => {
  const domains = await getDomainsFromSettings();

  return domains.map((domain, index) => ({
    id: index + 1, // Fixed sequential integers: 1, 2, 3, ...
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: "x-datadog-trace-id",
          value: traceID,
        },
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: "x-datadog-parent-id",
          value: "0",
        },
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: "x-datadog-origin",
          value: "synthetics-browser",
        },
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: "x-datadog-sampling-priority",
          value: "1",
        },
      ],
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: allResourceTypes,
      tabIds: [tabID],
    },
  }));
};

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  const tabId = request.tab;
  const traceId = request.trace;

  if (request.enable) {
    if (!traceId) console.error("TRACE ID NOT FOUND!!!!");

    const rulesToAdd = await rules(traceId, tabId);
    const ruleIds = rulesToAdd.map((rule) => rule.id);

    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIds, // remove existing rules with same IDs
      addRules: rulesToAdd,
    });

    // save to local storage with ruleIds for later removal
    chrome.storage.local.set({ tracer: { tabId, traceId, ruleIds } });

    chrome.tabs.group({ tabIds: tabId }, (groupId) => {
      chrome.tabGroups.update(groupId, {
        color: "green",
        title: "Tracing",
      });
    });

    chrome.action.setBadgeText({ text: "ON", tabId: tabId });
  } else {
    // Get stored ruleIds for removal
    const stored = await chrome.storage.local.get("tracer");
    const ruleIds = stored?.tracer?.ruleIds || [tabId]; // fallback for old format

    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIds,
    });

    // save to local storage
    chrome.storage.local.remove("tracer");
    chrome.tabs.ungroup(tabId);
    chrome.action.setBadgeText({ text: "OFF", tabId: tabId });
  }

  return true; // have to return a promise to avoid errors
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.runtime.openOptionsPage();
});

// Clean up when traced tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const stored = await chrome.storage.local.get("tracer");

  // Only clean up if the closed tab was the traced tab
  if (stored?.tracer?.tabId === tabId) {
    const ruleIds = stored.tracer.ruleIds || [];

    if (ruleIds.length > 0) {
      chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: ruleIds,
      });
    }

    chrome.storage.local.remove("tracer");
  }
});
