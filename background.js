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
    const selectedText = info.selectionText;
    const pageUrl = tab.url; // Capture the URL of the current tab

    if (selectedText) {
      chrome.storage.local.get(['snippets'], (result) => {
        const snippets = result.snippets || [];
        snippets.push({ content: selectedText, tags: [], url: pageUrl }); // Save the URL with the snippet
        chrome.storage.local.set({ snippets }, () => {
          console.log('Snippet added to Quiver with URL:', pageUrl);
        });
      });
    }
  }
});
