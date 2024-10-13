chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pasteSnippet') {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      activeElement.value += request.content;
    } else if (activeElement.isContentEditable) {
      document.execCommand('insertHTML', false, request.content);
    }
  } else if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());

      // Capture inline styles
      const elements = container.getElementsByTagName('*');
      for (let i = 0; i < elements.length; i++) {
        const computedStyle = window.getComputedStyle(elements[i]);
        let inlineStyle = '';
        for (let j = 0; j < computedStyle.length; j++) {
          const prop = computedStyle[j];
          inlineStyle += `${prop}:${computedStyle.getPropertyValue(prop)};`;
        }
        elements[i].setAttribute('style', inlineStyle);
      }

      const html = container.innerHTML;
      const text = container.textContent;

      sendResponse({ text, html });
      chrome.runtime.sendMessage({ 
        action: "logSnippetAdded", 
        snippet: { content: text, html: html, url: window.location.href }
      });
    } else {
      sendResponse({ text: null, html: null });
    }
  }
  return true; // Indicates that the response will be sent asynchronously
});

// Notify that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

console.log("Content script loaded");
