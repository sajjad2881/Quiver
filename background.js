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
    if (tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error injecting content script:", chrome.runtime.lastError);
          fallbackToSelectionText(info, tab);
          return;
        }
        chrome.tabs.sendMessage(tab.id, { action: "getSelectedText" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            fallbackToSelectionText(info, tab);
          } else if (response && response.text) {
            addSnippet(response.text, response.html, tab.url);
          } else {
            fallbackToSelectionText(info, tab);
          }
        });
      });
    } else {
      fallbackToSelectionText(info, tab);
    }
  }
});

function fallbackToSelectionText(info, tab) {
  if (info && info.selectionText) {
    addSnippet(info.selectionText, null, tab ? tab.url : '');
  } else {
    console.error("Unable to get selected text");
  }
}

function addSnippet(selectedText, selectedHtml, pageUrl) {
  if (!selectedText) {
    console.error("Invalid snippet data: No selected text");
    return;
  }

  chrome.storage.local.get(['snippets'], (result) => {
    const snippets = result.snippets || [];
    snippets.push({ 
      content: selectedText, 
      html: selectedHtml,
      tags: [], 
      url: pageUrl || '',
      isFormatted: !!selectedHtml
    });
    chrome.storage.local.set({ snippets }, () => {
      console.log('Snippet added to Quiver with URL:', pageUrl);
      chrome.runtime.sendMessage({ action: "snippetAdded" });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logSnippetAdded") {
    console.log("Snippet added:", request.snippet);
  }
});
