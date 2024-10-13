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

// Add this code at the end of the file
(function () {
  let shortcuts = [];

  // Load shortcuts from storage
  chrome.storage.local.get('shortcuts', function (data) {
    if (data.shortcuts) {
      shortcuts = data.shortcuts;
    }
  });

  // Listen for changes in storage (in case user updates shortcuts)
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === 'local' && changes.shortcuts) {
      shortcuts = changes.shortcuts.newValue;
    }
  });

  // Add event listener to the document
  document.addEventListener('input', function (e) {
    const target = e.target;
    if (isEditable(target)) {
      handleInputEvent(target);
    }
  }, true);

  function isEditable(element) {
    return element.isContentEditable ||
           (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search' || element.type === 'email' || element.type === 'url')) ||
           element.tagName === 'TEXTAREA';
  }

  function handleInputEvent(element) {
    setTimeout(() => {
      const cursorPosition = getCaretPosition(element);
      const text = getTextBeforeCaret(element);
      shortcuts.forEach(function (shortcut) {
        if (text.endsWith(shortcut.trigger)) {
          replaceText(element, shortcut.trigger, shortcut.replacement);
        }
      });
    }, 0);
  }

  function getTextBeforeCaret(element) {
    if (element.isContentEditable) {
      const selection = document.getSelection();
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString();
    } else {
      const value = element.value;
      return value.substring(0, element.selectionEnd);
    }
  }

  function replaceText(element, trigger, replacement) {
    if (element.isContentEditable) {
      const selection = document.getSelection();
      const range = selection.getRangeAt(0);

      // Move the start of the range back by trigger.length
      for (let i = 0; i < trigger.length; i++) {
        if (range.startOffset === 0) {
          // Move to previous node
          const prevNode = getPreviousNode(range.startContainer);
          if (prevNode) {
            range.setStart(prevNode, prevNode.length || 0);
          }
        } else {
          range.setStart(range.startContainer, range.startOffset - 1);
        }
      }
      range.deleteContents();

      const newNode = document.createTextNode(replacement);
      range.insertNode(newNode);

      // Move caret to the end of the inserted text
      range.setStartAfter(newNode);
      range.setEndAfter(newNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const startPos = element.selectionEnd - trigger.length;
      const endPos = element.selectionEnd;
      const value = element.value;
      element.value = value.substring(0, startPos) + replacement + value.substring(endPos);
      element.selectionStart = element.selectionEnd = startPos + replacement.length;
    }
  }

  function getPreviousNode(node) {
    if (node.previousSibling) {
      return node.previousSibling;
    } else if (node.parentNode) {
      return getPreviousNode(node.parentNode);
    } else {
      return null;
    }
  }

  function getCaretPosition(element) {
    if (element.isContentEditable) {
      const selection = document.getSelection();
      return selection.focusOffset;
    } else {
      return element.selectionEnd;
    }
  }
})();
