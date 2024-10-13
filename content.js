chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pasteSnippet') {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      activeElement.value += request.content;
    } else if (activeElement.isContentEditable) {
      document.execCommand('insertText', false, request.content);
    }
  } else if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      
      // Replace <br> tags with newline characters
      const formattedText = div.innerHTML.replace(/<br\s*\/?>/gi, '\n');
      
      // Remove all other HTML tags
      const plainText = formattedText.replace(/<[^>]+>/g, '');
      
      sendResponse({ text: plainText });

      // Log the added snippet
      chrome.runtime.sendMessage({ 
        action: "logSnippetAdded", 
        snippet: { content: plainText, url: window.location.href }
      });
    } else {
      sendResponse({ text: null });
    }
    return true; // Indicates that the response will be sent asynchronously
  }
});

// Notify that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

console.log("Content script loaded");
