document.addEventListener('DOMContentLoaded', () => {
  // Add this at the beginning of your DOMContentLoaded event listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "snippetAdded") {
      loadSnippets();
    }
  });

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

  const editModal = document.getElementById('edit-modal');
  const editSnippetContent = document.getElementById('edit-snippet-content');
  const editTagInput = document.getElementById('edit-tag-input');
  const editTagSuggestions = document.getElementById('edit-tag-suggestions');
  const editUrl = document.getElementById('edit-url');
  const saveEditBtn = document.getElementById('save-edit-btn');
  const closeBtn = document.querySelector('.close-btn');
  const deleteBtn = document.querySelector('.delete-btn');

  let snippets = [];
  let allTags = new Set();
  let selectedFilterTagsSet = new Set();
  let currentEditIndex = null;

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
      // Format the content only for manually added snippets
      const formattedContent = formatSnippetContent(content);
      snippets.push({ content: formattedContent, tags, isFormatted: true });
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
    filteredSnippets.forEach((snippet, index) => {
      const li = document.createElement('li');
      li.className = 'snippet-item';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'snippet-content';
      if (snippet.html) {
        const iframe = document.createElement('iframe');
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = 'auto';
        iframe.style.pointerEvents = 'none'; // Disable pointer events on iframe
        contentDiv.appendChild(iframe);

        iframe.onload = () => {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.open();
          doc.write(snippet.html);
          doc.close();
          iframe.style.height = doc.body.scrollHeight + 'px';
        };
      } else {
        contentDiv.textContent = snippet.content;
      }
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

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
          <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
          <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
        </svg>
      `;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click from triggering the snippet click event
        openEditModal(index);
      });

      const tagAndEditContainer = document.createElement('div');
      tagAndEditContainer.className = 'tag-edit-container';
      tagAndEditContainer.appendChild(tagDiv);
      tagAndEditContainer.appendChild(editBtn);
      li.appendChild(tagAndEditContainer);

      li.addEventListener('click', (e) => {
        // Prevent default behavior for all elements except the edit button
        if (!e.target.closest('.edit-btn')) {
          e.preventDefault();
          copyToClipboard(snippet.content, snippet.html);
        }
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

  function copyToClipboard(text, html) {
    if (navigator.clipboard && window.ClipboardItem) {
      const items = {};
      if (text) {
        items["text/plain"] = new Blob([text], { type: "text/plain" });
      }
      if (html) {
        items["text/html"] = new Blob([html], { type: "text/html" });
      }
      const clipboardItem = new ClipboardItem(items);
      navigator.clipboard.write([clipboardItem]).then(() => {
        console.log('Snippet copied to clipboard with formatting');
      }).catch(err => {
        console.error('Failed to copy with formatting: ', err);
        // Fallback to plain text
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            console.log('Snippet copied to clipboard as plain text');
          }).catch(err => {
            console.error('Failed to copy: ', err);
          });
        }
      });
    } else {
      console.error('Clipboard API not supported');
    }
  }

  function openEditModal(index) {
    currentEditIndex = index;
    const snippet = snippets[index];
    editSnippetContent.value = snippet.content;
    editTagInput.value = snippet.tags.join(', ');
    editUrl.value = snippet.url || '';
    editModal.style.display = 'block';
  }

  closeBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === editModal) {
      editModal.style.display = 'none';
    }
  });

  saveEditBtn.addEventListener('click', () => {
    if (currentEditIndex !== null) {
      const updatedContent = editSnippetContent.value.trim();
      const updatedTags = editTagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
      const updatedUrl = editUrl.value.trim();

      snippets[currentEditIndex] = {
        ...snippets[currentEditIndex],
        content: updatedContent,
        tags: updatedTags,
        url: updatedUrl
      };

      chrome.storage.local.set({ snippets }, () => {
        updateSnippetList();
        editModal.style.display = 'none';
      });
    }
  });

  deleteBtn.addEventListener('click', () => {
    if (currentEditIndex !== null) {
      const confirmDelete = confirm("Are you sure you want to delete this snippet?");
      if (confirmDelete) {
        snippets.splice(currentEditIndex, 1);
        chrome.storage.local.set({ snippets }, () => {
          updateSnippetList();
          editModal.style.display = 'none';
        });
      }
    }
  });

  // Modify the tab functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-snippets`).classList.add('active');

      // Reload snippets when switching to the "View Snippets" tab
      if (tabName === 'view') {
        loadSnippets();
      }
    });
  });

  const downloadDataBtn = document.getElementById('download-data-btn');

  downloadDataBtn.addEventListener('click', () => {
    chrome.storage.local.get(['snippets'], (result) => {
      const snippets = result.snippets || [];
      const data = snippets.map(snippet => {
        return `Content: ${snippet.content}\nTags: ${snippet.tags.join(', ')}\nURL: ${snippet.url || 'N/A'}\n\n`;
      }).join('---\n');

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'QuiverData.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // Modify the loadSnippets function to update the snippet list
  function loadSnippets() {
    chrome.storage.local.get(['snippets'], (result) => {
      snippets = result.snippets || [];
      updateSnippetList();
      updateAllTags();
      console.log('Loaded snippets:', snippets);
      console.log('All tags after loading:', allTags);
    });
  }

  loadSnippets();

  // Add this new function to format the snippet content
  function formatSnippetContent(content) {
    // Split into paragraphs, trim each paragraph, and remove empty ones
    const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p);
    return paragraphs.join('\n\n');
  }
});