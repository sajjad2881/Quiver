document.addEventListener('DOMContentLoaded', () => {
  const snippetContent = document.getElementById('snippet-content');
  const tagInput = document.getElementById('tag-input');
  const tagSuggestions = document.getElementById('tag-suggestions');
  const selectedTags = document.getElementById('selected-tags');
  const addBtn = document.getElementById('add-btn');
  const searchInput = document.getElementById('search-input');
  const tagFilterInput = document.getElementById('tag-filter-input');
  const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
  const selectedFilterTags = document.getElementById('selected-filter-tags');
  const snippetList = document.getElementById('snippet-list');

  let snippets = [];
  let allTags = new Set();
  let selectedFilterTagsSet = new Set();

  // Load snippets from storage
  chrome.storage.local.get(['snippets'], (result) => {
    snippets = result.snippets || [];
    updateSnippetList();
    updateAllTags();
    console.log('Loaded snippets:', snippets);
    console.log('All tags after loading:', allTags);
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
      updateAllTags();
    }
  });

  // Tag input functionality
  tagInput.addEventListener('focus', () => {
    showTagSuggestions(Array.from(allTags));
  });

  tagInput.addEventListener('input', () => {
    const input = tagInput.value.trim().toLowerCase();
    const suggestions = Array.from(allTags).filter(tag => tag.toLowerCase().includes(input));
    showTagSuggestions(suggestions);
  });

  tagInput.addEventListener('blur', () => {
    setTimeout(() => {
      tagSuggestions.style.display = 'none';
    }, 200);
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
    if (!Array.from(selectedTags.children).some(tag => tag.textContent.slice(0, -1) === tagText)) {
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
  }

  // Tag filter functionality
  tagFilterInput.addEventListener('focus', () => {
    showTagFilterSuggestions(Array.from(allTags).filter(tag => !selectedFilterTagsSet.has(tag)));
  });

  tagFilterInput.addEventListener('input', () => {
    const input = tagFilterInput.value.trim().toLowerCase();
    const suggestions = Array.from(allTags).filter(tag => tag.toLowerCase().includes(input) && !selectedFilterTagsSet.has(tag));
    showTagFilterSuggestions(suggestions);
  });

  tagFilterInput.addEventListener('blur', () => {
    setTimeout(() => {
      tagFilterDropdown.style.display = 'none';
    }, 200);
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
      contentDiv.innerHTML = highlightMatch(snippet.content, searchTerm);
      li.appendChild(contentDiv);

      if (snippet.url) {
        const urlDiv = document.createElement('div');
        urlDiv.className = 'snippet-url';
        urlDiv.textContent = `Source: ${snippet.url}`;
        li.appendChild(urlDiv);
      }

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

  function highlightMatch(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function updateAllTags() {
    allTags = new Set(snippets.flatMap(snippet => snippet.tags));
    console.log('Updated all tags:', allTags);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Snippet copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
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
