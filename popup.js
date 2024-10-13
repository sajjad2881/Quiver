document.addEventListener('DOMContentLoaded', () => {
  const snippetContent = document.getElementById('snippet-content');
  const tagInput = document.getElementById('tag-input');
  const tagSuggestions = document.getElementById('tag-suggestions');
  const selectedTags = document.getElementById('selected-tags');
  const addBtn = document.getElementById('add-btn');
  const searchInput = document.getElementById('search-input');
  const tagFilter = document.getElementById('tag-filter');
  const snippetList = document.getElementById('snippet-list');
  const tagFilterInput = document.getElementById('tag-filter-input');
  const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
  const selectedFilterTags = document.getElementById('selected-filter-tags');

  let snippets = [];
  let allTags = new Set();
  let selectedFilterTagsSet = new Set();

  // Load snippets from storage
  chrome.storage.local.get(['snippets'], (result) => {
    snippets = result.snippets || [];
    updateSnippetList();
    updateTagFilter();
    updateAllTags();
  });

  // Add new snippet
  addBtn.addEventListener('click', () => {
    const content = snippetContent.value.trim();
    const tags = Array.from(selectedTags.children).map(tag => tag.textContent.slice(0, -1));

    if (content) {
      snippets.push({ content, tags });
      chrome.storage.local.set({ snippets });
      snippetContent.value = '';
      selectedTags.innerHTML = '';
      updateSnippetList();
      updateTagFilter();
      updateAllTags();
    }
  });

  // Tag input functionality
  tagInput.addEventListener('input', () => {
    const input = tagInput.value.trim().toLowerCase();
    if (input) {
      const suggestions = Array.from(allTags).filter(tag => tag.toLowerCase().includes(input));
      showTagSuggestions(suggestions);
    } else {
      tagSuggestions.style.display = 'none';
    }
  });

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && tagInput.value.trim()) {
      e.preventDefault();
      addTag(tagInput.value.trim());
      tagInput.value = '';
      tagSuggestions.style.display = 'none';
    }
  });

  function showTagSuggestions(suggestions) {
    tagSuggestions.innerHTML = '';
    suggestions.forEach(tag => {
      const div = document.createElement('div');
      div.textContent = tag;
      div.addEventListener('click', () => {
        addTag(tag);
        tagInput.value = '';
        tagSuggestions.style.display = 'none';
      });
      tagSuggestions.appendChild(div);
    });
    tagSuggestions.style.display = suggestions.length ? 'block' : 'none';
  }

  function addTag(tagText) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = tagText;
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-tag';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => tag.remove());
    tag.appendChild(removeBtn);
    selectedTags.appendChild(tag);
  }

  // Tag filter functionality
  tagFilterInput.addEventListener('input', () => {
    const input = tagFilterInput.value.trim().toLowerCase();
    if (input) {
      const suggestions = Array.from(allTags).filter(tag => tag.toLowerCase().includes(input) && !selectedFilterTagsSet.has(tag));
      showTagFilterSuggestions(suggestions);
    } else {
      tagFilterDropdown.style.display = 'none';
    }
  });

  tagFilterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && tagFilterInput.value.trim()) {
      e.preventDefault();
      addFilterTag(tagFilterInput.value.trim());
      tagFilterInput.value = '';
      tagFilterDropdown.style.display = 'none';
    }
  });

  function showTagFilterSuggestions(suggestions) {
    tagFilterDropdown.innerHTML = '';
    suggestions.forEach(tag => {
      const div = document.createElement('div');
      div.textContent = tag;
      div.addEventListener('click', () => {
        addFilterTag(tag);
        tagFilterInput.value = '';
        tagFilterDropdown.style.display = 'none';
      });
      tagFilterDropdown.appendChild(div);
    });
    tagFilterDropdown.style.display = suggestions.length ? 'block' : 'none';
  }

  function addFilterTag(tagText) {
    if (!selectedFilterTagsSet.has(tagText)) {
      selectedFilterTagsSet.add(tagText);
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.textContent = tagText;
      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-filter-tag';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        tag.remove();
        selectedFilterTagsSet.delete(tagText);
        updateSnippetList();
      });
      tag.appendChild(removeBtn);
      selectedFilterTags.appendChild(tag);
      updateSnippetList();
    }
  }

  // Search and filter snippets
  searchInput.addEventListener('input', updateSnippetList);

  function updateSnippetList() {
    const searchTerm = searchInput.value.toLowerCase();

    const filteredSnippets = snippets.filter(snippet => {
      const contentMatch = snippet.content.toLowerCase().includes(searchTerm);
      const tagMatch = selectedFilterTagsSet.size === 0 || snippet.tags.some(tag => selectedFilterTagsSet.has(tag));
      return contentMatch && tagMatch;
    });

    snippetList.innerHTML = '';
    filteredSnippets.forEach(snippet => {
      const li = document.createElement('li');
      const contentDiv = document.createElement('div');
      contentDiv.className = 'snippet-content';
      contentDiv.textContent = snippet.content;
      li.appendChild(contentDiv);

      const tagDiv = document.createElement('div');
      tagDiv.className = 'snippet-tags';
      snippet.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag;
        tagDiv.appendChild(tagSpan);
      });
      li.appendChild(tagDiv);

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

  function updateAllTags() {
    allTags = new Set(snippets.flatMap(snippet => snippet.tags));
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
      updateAllTags();
    });
  }

  // Add tab functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-snippets`).classList.add('active');
    });
  });

  loadSnippets();
});
