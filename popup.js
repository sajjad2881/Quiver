document.addEventListener('DOMContentLoaded', () => {
  const snippetContent = document.getElementById('snippet-content');
  const snippetTags = document.getElementById('snippet-tags');
  const addBtn = document.getElementById('add-btn');
  const searchInput = document.getElementById('search-input');
  const tagFilter = document.getElementById('tag-filter');
  const snippetList = document.getElementById('snippet-list');

  let snippets = [];

  // Load snippets from storage
  chrome.storage.local.get(['snippets'], (result) => {
    snippets = result.snippets || [];
    updateSnippetList();
    updateTagFilter();
  });

  // Add new snippet
  addBtn.addEventListener('click', () => {
    const content = snippetContent.value.trim();
    const tags = snippetTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);

    if (content) {
      snippets.push({ content, tags });
      chrome.storage.local.set({ snippets });
      snippetContent.value = '';
      snippetTags.value = '';
      updateSnippetList();
      updateTagFilter();
    }
  });

  // Search and filter snippets
  searchInput.addEventListener('input', updateSnippetList);
  tagFilter.addEventListener('change', updateSnippetList);

  function updateSnippetList() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedTag = tagFilter.value;

    const filteredSnippets = snippets.filter(snippet => {
      const contentMatch = snippet.content.toLowerCase().includes(searchTerm);
      const tagMatch = selectedTag === '' || snippet.tags.includes(selectedTag);
      return contentMatch && tagMatch;
    });

    snippetList.innerHTML = '';
    filteredSnippets.forEach(snippet => {
      const li = document.createElement('li');
      li.textContent = snippet.content;
      li.addEventListener('click', () => {
        copyToClipboard(snippet.content);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'pasteSnippet', content: snippet.content });
        });
      });
      snippetList.appendChild(li);
    });
  }

  function updateTagFilter() {
    const allTags = new Set(snippets.flatMap(snippet => snippet.tags));
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    allTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Snippet copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  function loadSnippets() {
    chrome.storage.local.get(['snippets'], (result) => {
      snippets = result.snippets || [];
      updateSnippetList();
      updateTagFilter();
    });
  }

  loadSnippets();
});