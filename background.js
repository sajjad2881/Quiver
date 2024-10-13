chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['snippets'], (result) => {
    if (!result.snippets) {
      chrome.storage.local.set({ snippets: [] });
    }
  });

  chrome.contextMenus.create({
    id: "addToQuiver",
    title: "Add to Quiver",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToQuiver") {
    console.log("Add to Quiver clicked");
    chrome.tabs.sendMessage(tab.id, { action: "getSelectedText" }, (response) => {
      console.log("Response received:", response);
      if (response && response.text) {
        const selectedText = response.text;
        const pageUrl = tab.url;

        chrome.storage.local.get(['snippets'], (result) => {
          const snippets = result.snippets || [];
          snippets.push({ 
            content: selectedText, 
            tags: [], 
            url: pageUrl,
            isFormatted: true
          });
          chrome.storage.local.set({ snippets }, () => {
            console.log('Snippet added to Quiver with URL:', pageUrl);
            // Notify the popup that a new snippet has been added
            chrome.runtime.sendMessage({ action: "snippetAdded" });
          });
        });
      } else {
        console.log("No text received from content script");
      }
    });
  }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logSnippetAdded") {
    console.log("Snippet added:", request.snippet);
  }
});
