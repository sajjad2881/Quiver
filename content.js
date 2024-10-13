chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pasteSnippet') {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      activeElement.value += request.content;
    } else if (activeElement.isContentEditable) {
      document.execCommand('insertText', false, request.content);
    }
  } else if (request.action === 'getSelectedText') {
    let selectedText;
    
    if (document.contentType === 'application/pdf') {
      // For PDF files
      selectedText = getPDFSelection();
    } else {
      // For regular web pages
      const selection = window.getSelection();
      selectedText = selection.toString();
    }

    if (selectedText) {
      sendResponse({ text: selectedText });
      // Log the added snippet
      chrome.runtime.sendMessage({ 
        action: "logSnippetAdded", 
        snippet: { content: selectedText, url: window.location.href }
      });
    } else {
      sendResponse({ text: null });
    }
    return true; // Indicates that the response will be sent asynchronously
  }
});

function getPDFSelection() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;

  const textLayer = document.querySelector('.textLayer');
  if (!textLayer) return null;

  const selection = window.getSelection();
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const selectedElements = getSelectedElements(textLayer, range);
  
  return selectedElements.map(el => el.textContent).join(' ');
}

function getSelectedElements(container, range) {
  const selectedElements = [];
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  let currentNode = treeWalker.currentNode;

  while (currentNode) {
    if (range.intersectsNode(currentNode)) {
      selectedElements.push(currentNode.parentElement);
    }
    currentNode = treeWalker.nextNode();
  }

  return selectedElements;
}

// Notify that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

console.log("Content script loaded");
