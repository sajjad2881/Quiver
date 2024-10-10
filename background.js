chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['snippets'], (result) => {
    if (!result.snippets) {
      chrome.storage.local.set({ snippets: [] });
    }
  });

  chrome.contextMenus.create({
    id: "addToTextQuiver",
    title: "Add to TextQuiver",
    contexts: ["selection"]
  });
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToTextQuiver") {
    const selectedText = info.selectionText;
    if (selectedText) {
      chrome.storage.local.get(['snippets'], (result) => {
        const snippets = result.snippets || [];
        snippets.push({ content: selectedText, tags: [] });
        chrome.storage.local.set({ snippets }, () => {
          console.log('Snippet added to TextQuiver');
        });
      });
    }
  }
});