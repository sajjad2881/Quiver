document.addEventListener('DOMContentLoaded', () => {
  // Add this at the beginning of your DOMContentLoaded event listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "snippetAdded") {
      loadSnippets();
    }
  });

  const snippetContent = document.getElementById('snippet-content');
  const snippetUrl = document.getElementById('snippet-url');
  const snippetShortcut = document.getElementById('snippet-shortcut');
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
  const closeEditBtn = document.querySelector('#edit-modal .close-btn');
  const deleteBtn = document.querySelector('.delete-btn');

  let snippets = [];
  let allTags = new Set();
  let selectedFilterTagsSet = new Set();
  let currentEditIndex = null;

  const tagIconBtn = document.getElementById('tag-icon-btn');

  // Modify the add new snippet functionality
  addBtn.addEventListener('click', () => {
    const content = snippetContent.value.trim();
    const url = snippetUrl.value.trim();
    const shortcut = snippetShortcut.value.trim();
    const tags = Array.from(selectedTags.children).map(tag => tag.textContent.slice(0, -1));

    if (content) {
      const formattedContent = formatSnippetContent(content);
      const newSnippet = { 
        content: formattedContent, 
        tags, 
        url, 
        isFormatted: true 
      };

      chrome.storage.local.get(['snippets', 'shortcuts'], (result) => {
        const snippets = result.snippets || [];
        const shortcuts = result.shortcuts || [];

        snippets.push(newSnippet);

        if (shortcut && shortcut.startsWith('/')) {
          // Check for existing shortcut
          const existingShortcut = shortcuts.find(s => s.trigger === shortcut);
          if (existingShortcut) {
            const confirmReassign = confirm(`The shortcut "${shortcut}" is already in use. Do you want to reassign it to this snippet?`);
            if (confirmReassign) {
              // Remove the existing shortcut
              const index = shortcuts.findIndex(s => s.trigger === shortcut);
              shortcuts.splice(index, 1);
            } else {
              // If user doesn't want to reassign, don't add the new shortcut
              chrome.storage.local.set({ snippets }, () => {
                snippetContent.value = '';
                snippetUrl.value = '';
                snippetShortcut.value = '';
                selectedTags.innerHTML = '';
                loadSnippets();
                updateAllTags();
                alert('Snippet added successfully without shortcut!');
              });
              return;
            }
          }
          // Add the new shortcut
          shortcuts.push({ trigger: shortcut, replacement: formattedContent });
        }

        chrome.storage.local.set({ snippets, shortcuts }, () => {
          snippetContent.value = '';
          snippetUrl.value = '';
          snippetShortcut.value = '';
          selectedTags.innerHTML = '';
          loadSnippets();
          updateAllTags();
          
          if (shortcut) {
            alert(`Snippet added with shortcut: ${shortcut}`);
          } else {
            alert('Snippet added successfully!');
          }
        });
      });
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

  tagFilterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && tagFilterInput.value.trim()) {
      e.preventDefault();
      addFilterTag(tagFilterInput.value.trim());
      tagFilterInput.value = '';
      // Keep the dropdown visible after adding a tag
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
        // Keep the dropdown visible after selecting a tag
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
    chrome.storage.local.get(['shortcuts', 'snippets'], (result) => {
      const shortcuts = result.shortcuts || [];
      snippets = result.snippets || [];

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
          iframe.style.pointerEvents = 'none';
          contentDiv.appendChild(iframe);

          iframe.onload = () => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(highlightMatch(snippet.html, searchTerm));
            doc.close();
            iframe.style.height = doc.body.scrollHeight + 'px';
          };
        } else {
          // For manually added snippets, use pre-wrap to preserve formatting
          contentDiv.style.whiteSpace = 'pre-wrap';
          contentDiv.innerHTML = highlightMatch(snippet.content, searchTerm);
        }
        li.appendChild(contentDiv);

        if (snippet.url) {
          const urlDiv = document.createElement('div');
          urlDiv.className = 'snippet-url';
          //urlDiv.textContent = `Source: ${snippet.url}`;
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

        const createShortcutBtn = document.createElement('button');
        createShortcutBtn.className = 'create-shortcut-btn';
        createShortcutBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
            <path fill-rule="evenodd" d="M11.622 1.602a.75.75 0 0 1 .756 0l2.25 1.313a.75.75 0 0 1-.756 1.295L12 3.118 10.128 4.21a.75.75 0 1 1-.756-1.295l2.25-1.313ZM5.898 5.81a.75.75 0 0 1-.27 1.025l-1.14.665 1.14.665a.75.75 0 1 1-.756 1.295L3.75 8.806v.944a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .372-.648l2.25-1.312a.75.75 0 0 1 1.026.27Zm12.204 0a.75.75 0 0 1 1.026-.27l2.25 1.312a.75.75 0 0 1 .372.648v2.25a.75.75 0 0 1-1.5 0v-.944l-1.122.654a.75.75 0 1 1-.756-1.295l1.14-.665-1.14-.665a.75.75 0 0 1-.27-1.025Zm-9 5.25a.75.75 0 0 1 1.026-.27L12 11.882l1.872-1.092a.75.75 0 1 1 .756 1.295l-1.878 1.096V15a.75.75 0 0 1-1.5 0v-1.82l-1.878-1.095a.75.75 0 0 1-.27-1.025ZM3 13.5a.75.75 0 0 1 .75.75v1.82l1.878 1.095a.75.75 0 1 1-.756 1.295l-2.25-1.312a.75.75 0 0 1-.372-.648v-2.25A.75.75 0 0 1 3 13.5Zm18 0a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-.372.648l-2.25 1.312a.75.75 0 1 1-.756-1.295l1.878-1.096V14.25a.75.75 0 0 1 .75-.75Zm-9 5.25a.75.75 0 0 1 .75.75v.944l1.122-.654a.75.75 0 1 1 .756 1.295l-2.25 1.313a.75.75 0 0 1-.756 0l-2.25-1.313a.75.75 0 1 1 .756-1.295l1.122.654V19.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
          </svg>
        `;
        createShortcutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openShortcutModal(index);
        });

        const tagAndEditContainer = document.createElement('div');
        tagAndEditContainer.className = 'tag-edit-container';

        // Add URL display and link functionality
        if (snippet.url) {
          const urlText = snippet.url.replace(/^https?:\/\//, '').substring(0, 12) + (snippet.url.length > 12 ? '...' : '');
          const urlLink = document.createElement('a');
          urlLink.href = snippet.url;
          urlLink.className = 'snippet-url-link';
          urlLink.textContent = urlText;
          urlLink.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: snippet.url });
          });

          // Add copy link button
          const copyLinkBtn = document.createElement('button');
          copyLinkBtn.className = 'copy-link-btn';
          copyLinkBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
              <path fill-rule="evenodd" d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z" clip-rule="evenodd" />
            </svg>
          `;
          copyLinkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(snippet.url).then(() => {
              showCopiedLinkMessage();
            });
          });

          tagAndEditContainer.appendChild(tagDiv);
          tagAndEditContainer.appendChild(urlLink);
          tagAndEditContainer.appendChild(copyLinkBtn);
          tagAndEditContainer.appendChild(editBtn);
          tagAndEditContainer.appendChild(createShortcutBtn);
        } else {
          tagAndEditContainer.appendChild(tagDiv);
          tagAndEditContainer.appendChild(editBtn);
          tagAndEditContainer.appendChild(createShortcutBtn);
        }

        li.appendChild(tagAndEditContainer);

        li.addEventListener('click', (e) => {
          // Prevent default behavior for all elements except the edit button
          if (!e.target.closest('.edit-btn')) {
            e.preventDefault();
            copyToClipboard(snippet.content, snippet.html);
          }
        });

        // Update this part to show shortcuts
        const shortcutsForSnippet = shortcuts.filter(s => s.replacement === snippet.content);
        if (shortcutsForSnippet.length > 0) {
          const shortcutDiv = document.createElement('div');
          shortcutDiv.className = 'snippet-shortcuts';
          shortcutDiv.textContent = '' + shortcutsForSnippet.map(s => s.trigger).join(', ');
          li.insertBefore(shortcutDiv, tagAndEditContainer);
        }

        snippetList.appendChild(li);
      });
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

  // Add this function at the top level of your popup.js file
  function showCopiedMessage() {
    const message = document.createElement('div');
    message.textContent = 'Snippet copied to clipboard';
    message.style.position = 'fixed';
    message.style.bottom = '20px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';
    message.style.backgroundColor = '#A4B0F5';
    message.style.color = 'white';
    message.style.padding = '10px 20px';
    message.style.borderRadius = '5px';
    message.style.zIndex = '1000';
    message.style.transition = 'opacity 0.5s';

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(message);
      }, 500);
    }, 2000);
  }

  // Then, modify the copyToClipboard function:
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
        showCopiedMessage(); // Add this line
      }).catch(err => {
        console.error('Failed to copy with formatting: ', err);
        // Fallback to plain text
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            console.log('Snippet copied to clipboard as plain text');
            showCopiedMessage(); // Add this line
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

  closeEditBtn.addEventListener('click', () => {
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
    chrome.storage.local.get(['snippets', 'shortcuts'], (result) => {
      const snippets = result.snippets || [];
      const shortcuts = result.shortcuts || [];

      let data = "Snippets:\n\n";
      snippets.forEach((snippet, index) => {
        data += `Snippet ${index + 1}:\n`;
        data += `Content: ${snippet.content}\n`;
        data += `Tags: ${snippet.tags.join(', ')}\n`;
        data += `URL: ${snippet.url || 'N/A'}\n`;

        // Add shortcuts for this snippet
        const snippetShortcuts = shortcuts.filter(s => s.replacement === snippet.content);
        if (snippetShortcuts.length > 0) {
          data += `Shortcuts: ${snippetShortcuts.map(s => s.trigger).join(', ')}\n`;
        }

        data += '\n---\n\n';
      });

      // Add a separate section for all shortcuts
      data += "All Shortcuts:\n\n";
      shortcuts.forEach((shortcut, index) => {
        data += `Shortcut ${index + 1}:\n`;
        data += `Trigger: ${shortcut.trigger}\n`;
        data += `Replacement: ${shortcut.replacement}\n\n`;
      });

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

  const shortcutModal = document.getElementById('shortcut-modal');
  const closeShortcutBtn = document.getElementById('close-shortcut-btn');
  const existingShortcuts = document.getElementById('existing-shortcuts');
  const newShortcutInput = document.getElementById('new-shortcut-input');
  const addShortcutBtn = document.getElementById('add-shortcut-btn');

  let currentSnippetIndex = null;

  function openShortcutModal(snippetIndex) {
    currentSnippetIndex = snippetIndex;
    const snippet = snippets[snippetIndex];
    shortcutModal.style.display = 'block';
    updateExistingShortcuts();
  }

  function updateExistingShortcuts() {
    chrome.storage.local.get('shortcuts', (result) => {
      const shortcuts = result.shortcuts || [];
      const snippet = snippets[currentSnippetIndex];
      const snippetShortcuts = shortcuts.filter(s => s.replacement === snippet.content);

      existingShortcuts.innerHTML = '';
      snippetShortcuts.forEach(shortcut => {
        const shortcutDiv = document.createElement('div');
        shortcutDiv.className = 'existing-shortcut';
        shortcutDiv.textContent = shortcut.trigger;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-icon-btn';
        deleteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
            <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
          </svg>
        `;
        deleteBtn.addEventListener('click', () => deleteShortcut(shortcut.trigger));
        deleteBtn.style.float = 'right';
        
        shortcutDiv.appendChild(deleteBtn);
        existingShortcuts.appendChild(shortcutDiv);
      });
    });
  }

  function deleteShortcut(trigger) {
    chrome.storage.local.get('shortcuts', (result) => {
      let shortcuts = result.shortcuts || [];
      shortcuts = shortcuts.filter(s => s.trigger !== trigger);
      chrome.storage.local.set({ shortcuts }, () => {
        updateExistingShortcuts();
        updateSnippetList();
      });
    });
  }

  addShortcutBtn.addEventListener('click', () => {
    const newShortcut = newShortcutInput.value.trim();
    if (newShortcut && newShortcut.startsWith('/')) {
      createShortcut(currentSnippetIndex, newShortcut);
      newShortcutInput.value = '';
    } else {
      alert("Shortcut must start with '/'");
    }
  });

  closeShortcutBtn.addEventListener('click', () => {
    shortcutModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === shortcutModal) {
      shortcutModal.style.display = 'none';
    }
  });

  function createShortcut(snippetIndex, shortcut) {
    const snippet = snippets[snippetIndex];
    chrome.storage.local.get('shortcuts', (result) => {
      const shortcuts = result.shortcuts || [];
      const existingShortcut = shortcuts.find(s => s.trigger === shortcut);

      if (existingShortcut) {
        const confirmReassign = confirm(`The shortcut "${shortcut}" is already in use. Do you want to reassign it to this snippet?`);
        if (confirmReassign) {
          const updatedShortcuts = shortcuts.filter(s => s.trigger !== shortcut);
          updatedShortcuts.push({ trigger: shortcut, replacement: snippet.content });
          chrome.storage.local.set({ shortcuts: updatedShortcuts }, () => {
            updateExistingShortcuts();
            updateSnippetList();
          });
        }
      } else {
        shortcuts.push({ trigger: shortcut, replacement: snippet.content });
        chrome.storage.local.set({ shortcuts }, () => {
          updateExistingShortcuts();
          updateSnippetList();
        });
      }
    });
  }

  // Toggle the visibility of the tag filter input and icon
  tagIconBtn.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent the click from bubbling up
    if (tagFilterInput.style.display === 'none') {
      tagFilterInput.style.display = 'block';
      tagFilterDropdown.style.display = 'block'; // Show dropdown when input is shown
      tagIconBtn.style.display = 'none'; // Hide the icon
      tagFilterInput.focus();
    }
  });

  // Hide the tag filter input and show the icon when clicking outside
  document.addEventListener('click', (event) => {
    if (!tagFilterInput.contains(event.target) && !tagFilterDropdown.contains(event.target)) {
      tagFilterInput.style.display = 'none';
      tagFilterDropdown.style.display = 'none';
      tagIconBtn.style.display = 'flex'; // Show the icon
    }
  });

  // Ensure the icon is shown when the input is hidden
  tagFilterInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (tagFilterInput.style.display === 'none') {
        tagIconBtn.style.display = 'flex';
      }
    }, 200);
  });

  const openAddSnippetModalBtn = document.getElementById('open-add-snippet-modal');
  const addSnippetModal = document.getElementById('add-snippet-modal');
  const closeAddSnippetBtn = document.getElementById('close-add-snippet-btn');

  // Open the add snippet modal
  openAddSnippetModalBtn.addEventListener('click', () => {
    addSnippetModal.style.display = 'block';
  });

  // Close the add snippet modal
  closeAddSnippetBtn.addEventListener('click', () => {
    addSnippetModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === addSnippetModal) {
      addSnippetModal.style.display = 'none';
    }
  });

  // Add this new function to show the "Link Copied" message
  function showCopiedLinkMessage() {
    const message = document.createElement('div');
    message.textContent = 'Link copied to clipboard';
    message.style.position = 'fixed';
    message.style.bottom = '20px';
    message.style.right = '20px';
    message.style.transform = 'none';
    message.style.backgroundColor = '#A4B0F5';
    message.style.color = 'white';
    message.style.padding = '10px 20px';
    message.style.borderRadius = '5px';
    message.style.zIndex = '1000';
    message.style.transition = 'opacity 0.5s';

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(message);
      }, 500);
    }, 2000);
  }
});