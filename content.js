chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === 'pasteSnippet') {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
      activeElement.value += request.content;
    } else if (activeElement.isContentEditable) {
      document.execCommand('insertText', false, request.content);
    }
  } else if (request.action === 'getSelectedText') {
    console.log("Getting selected text");
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      
      // Replace <br> and </p> tags with newline characters
      let formattedText = div.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
      
      // Remove all other HTML tags
      formattedText = formattedText.replace(/<[^>]+>/g, '');
      
      // Trim leading/trailing whitespace
      formattedText = formattedText.trim();
      
      // Split into paragraphs
      let paragraphs = formattedText.split(/\n{2,}/);
      
      // Process each paragraph
      paragraphs = paragraphs.map(paragraph => {
        // Split paragraph into lines
        let lines = paragraph.split('\n');
        
        // Trim each line and join with a space, but only if the line is not empty
        lines = lines.map(line => line.trim()).filter(line => line.length > 0);
        
        // If there's only one line, return it as is
        if (lines.length === 1) {
          return lines[0];
        }
        
        // If there are multiple lines, join them with a space
        return lines.join(' ');
      });
      
      // Join paragraphs with double newlines
      formattedText = paragraphs.join('\n\n');
      
      // Remove extra spaces
      formattedText = formattedText.replace(/ +/g, ' ');
      
      console.log("Formatted text:", formattedText);
      sendResponse({ text: formattedText });

      // Log the added snippet
      chrome.runtime.sendMessage({ 
        action: "logSnippetAdded", 
        snippet: { content: formattedText, url: window.location.href }
      });
    } else {
      console.log("No text selected");
      sendResponse({ text: null });
    }
    return true; // Indicates that the response will be sent asynchronously
  }
});

console.log("Content script loaded");
