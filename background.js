const allResourceTypes = Object.values(
  chrome.declarativeNetRequest.ResourceType
);

const rules = async (traceID, tabID) => {
  const savedSettings = await chrome.storage.local.get("tracerSettings");
  const domain = savedSettings?.tracerSettings?.domain;

  return [
    {
      id: tabID,
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
        urlFilter: `*.${domain}`,
        resourceTypes: allResourceTypes,
        tabIds: [tabID],
      },
    },
  ];
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

    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: rulesToAdd.map((rule) => rule.id), // remove existing rules and rule set
      addRules: rulesToAdd,
    });

    // save to local storage
    chrome.storage.local.set({ tracer: { tabId, traceId } });

    chrome.tabs.group({ tabIds: tabId }, (groupId) => {
      chrome.tabGroups.update(groupId, {
        color: "green",
        title: "Tracing",
      });
    });

    chrome.action.setBadgeText({ text: "ON", tabId: tabId });
  } else {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId], // remove existing rules
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
