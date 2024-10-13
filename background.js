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
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getSelectedText,
    }, (injectionResults) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }

      const [{ result }] = injectionResults;
      if (result) {
        const selectedText = result;
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
      }
    });
  }
});

function getSelectedText() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    
    // Replace <br> tags with newline characters
    const formattedText = div.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    
    // Remove all other HTML tags
    const plainText = formattedText.replace(/<[^>]+>/g, '');
    
    return plainText;
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logSnippetAdded") {
    console.log("Snippet added:", request.snippet);
  }
});
