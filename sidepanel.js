document.addEventListener('DOMContentLoaded', function() {
  var socialActivityLink = document.getElementById('socialActivityLink');
  var extractStatsBtn = document.getElementById('extractStatsBtn');
  var statsResult = document.getElementById('statsResult');
  var usernameInput = document.getElementById('usernameInput');
  var saveUsernameBtn = document.getElementById('saveUsernameBtn');
  var copyJsonBtn = document.getElementById('copyJsonBtn');
  var configColumnsBtn = document.getElementById('configColumnsBtn');
  var columnConfig = document.getElementById('columnConfig');
  var columnList = document.getElementById('columnList');
  var saveColumnOrderBtn = document.getElementById('saveColumnOrderBtn');
  var cancelColumnOrderBtn = document.getElementById('cancelColumnOrderBtn');
  var resetColumnOrderBtn = document.getElementById('resetColumnOrderBtn');

  let extractedData = [];
  
  // Default column configuration
  const defaultColumns = [
    { id: 'author', label: 'Author', visible: true },
    { id: 'content', label: 'Content', visible: true },
    { id: 'impressions', label: 'Impressions', visible: true },
    { id: 'likes', label: 'Likes', visible: true },
    { id: 'comments', label: 'Comments', visible: true },
    { id: 'reposts', label: 'Reposts', visible: true },
    { id: 'totalEngagement', label: 'Total Engagement', visible: true },
    { id: 'url', label: 'URL', visible: true },
    { id: 'date', label: 'Date', visible: true },
    { id: 'postId', label: 'Post ID', visible: true }
  ];
  
  let columnOrder = [...defaultColumns];

  // Load saved username and column order
  chrome.storage.local.get(['linkedinUsername', 'columnOrder'], function(data) {
    if (data.linkedinUsername) {
      usernameInput.value = data.linkedinUsername;
      socialActivityLink.href = `https://www.linkedin.com/in/${data.linkedinUsername}/recent-activity/all/`;
    }
    if (data.columnOrder) {
      columnOrder = data.columnOrder;
    }
  });

  // Save username
  saveUsernameBtn.addEventListener('click', function() {
    const username = usernameInput.value;
    if (username) {
      chrome.storage.local.set({ 'linkedinUsername': username }, function() {
        socialActivityLink.href = `https://www.linkedin.com/in/${username}/recent-activity/all/`;
        // You can add a small confirmation message here if you like
      });
    }
  });

  socialActivityLink.addEventListener('click', function(event) {
    event.preventDefault();
    chrome.tabs.create({ url: socialActivityLink.href });
  });

  copyJsonBtn.addEventListener('click', function() {
    if (extractedData.length > 0) {
      const jsonString = JSON.stringify(extractedData, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
        copyJsonBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyJsonBtn.textContent = 'Copy as JSON';
        }, 2000);
      });
    }
  });

  // Column configuration handlers
  configColumnsBtn.addEventListener('click', function() {
    showColumnConfig();
  });

  saveColumnOrderBtn.addEventListener('click', function() {
    saveColumnOrder();
  });

  cancelColumnOrderBtn.addEventListener('click', function() {
    // Reload saved settings when canceling
    chrome.storage.local.get('columnOrder', function(data) {
      if (data.columnOrder) {
        columnOrder = data.columnOrder;
      } else {
        columnOrder = [...defaultColumns];
      }
      columnConfig.style.display = 'none';
      statsResult.style.display = 'block';
    });
  });

  resetColumnOrderBtn.addEventListener('click', function() {
    columnOrder = [...defaultColumns];
    showColumnConfig();
  });

  function showColumnConfig() {
    columnConfig.style.display = 'block';
    statsResult.style.display = 'none';
    
    // Clear and populate column list
    columnList.innerHTML = '';
    columnOrder.forEach((col, index) => {
      const li = document.createElement('li');
      li.dataset.columnId = col.id;
      li.dataset.index = index;
      li.innerHTML = `
        <div class="column-controls">
          <button class="arrow-btn up-btn" ${index === 0 ? 'disabled' : ''} data-index="${index}">▲</button>
          <button class="arrow-btn down-btn" ${index === columnOrder.length - 1 ? 'disabled' : ''} data-index="${index}">▼</button>
        </div>
        <label>
          <input type="checkbox" ${col.visible ? 'checked' : ''} data-column="${col.id}">
          ${col.label}
        </label>
      `;
      
      // Add arrow button listeners
      const upBtn = li.querySelector('.up-btn');
      const downBtn = li.querySelector('.down-btn');
      
      if (upBtn && !upBtn.disabled) {
        upBtn.addEventListener('click', () => moveColumn(index, -1));
      }
      
      if (downBtn && !downBtn.disabled) {
        downBtn.addEventListener('click', () => moveColumn(index, 1));
      }
      
      columnList.appendChild(li);
    });
  }

  function moveColumn(index, direction) {
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= columnOrder.length) return;
    
    // Swap in the array
    const temp = columnOrder[index];
    columnOrder[index] = columnOrder[newIndex];
    columnOrder[newIndex] = temp;
    
    // Re-render immediately
    showColumnConfig();
  }

  function saveColumnOrder() {
    // Update visibility based on checkboxes
    const checkboxes = columnList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const columnId = checkbox.dataset.column;
      const column = columnOrder.find(col => col.id === columnId);
      if (column) {
        column.visible = checkbox.checked;
      }
    });
    
    // Save to chrome storage
    chrome.storage.local.set({ 'columnOrder': columnOrder }, function() {
      columnConfig.style.display = 'none';
      statsResult.style.display = 'block';
      
      // Re-render table if data exists
      if (extractedData.length > 0) {
        renderTable(extractedData);
      }
    });
  }

  function renderTable(posts) {
    statsResult.innerHTML = '';
    const table = document.createElement('table');
    
    // Create header based on column order
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    columnOrder.forEach(col => {
      if (col.visible) {
        const th = document.createElement('th');
        th.textContent = col.label;
        headerRow.appendChild(th);
      }
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    posts.forEach(post => {
      const row = document.createElement('tr');
      
      columnOrder.forEach(col => {
        if (col.visible) {
          const td = document.createElement('td');
          
          switch(col.id) {
            case 'author':
              td.innerHTML = `<a href="${post.authorProfile}" target="_blank">${post.authorName}</a>`;
              break;
            case 'content':
              td.textContent = post.content;
              break;
            case 'impressions':
              td.textContent = post.impressions;
              break;
            case 'likes':
              td.textContent = post.likes;
              break;
            case 'comments':
              td.textContent = post.comments;
              break;
            case 'reposts':
              td.textContent = post.reposts;
              break;
            case 'totalEngagement':
              td.textContent = post.totalEngagement;
              break;
            case 'url':
              td.innerHTML = `<a href="${post.postUrl}" target="_blank">View Post</a>`;
              break;
            case 'date':
              td.textContent = post.datePosted;
              break;
            case 'postId':
              td.textContent = post.postId;
              break;
          }
          
          row.appendChild(td);
        }
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    statsResult.appendChild(table);
    
    copyJsonBtn.style.display = 'inline-block';
    configColumnsBtn.style.display = 'inline-block';
  }

  extractStatsBtn.addEventListener('click', function() {
    extractStatsBtn.disabled = true;
    extractStatsBtn.textContent = 'Extracting...';
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: scrapeStats
      }, (injectionResults) => {
        for (const frameResult of injectionResults) {
          const posts = frameResult.result;
          extractedData = posts;
          if (posts && posts.length > 0) {
            renderTable(posts);
            extractStatsBtn.disabled = false;
            extractStatsBtn.textContent = 'Extract Stats';
          } else {
            statsResult.innerHTML = '';
            statsResult.textContent = 'No stats found.';
            copyJsonBtn.style.display = 'none';
            configColumnsBtn.style.display = 'none';
            extractedData = [];
            extractStatsBtn.disabled = false;
            extractStatsBtn.textContent = 'Extract Stats';
          }
        }
      });
    });
  });
});

function scrapeStats() {
  return new Promise((resolve) => {
    // This helper function must be defined inside the scope of the injected script.
    function getAbsoluteDate(numericId) {
      if (numericId === 'N/A' || !numericId) {
        return 'N/A';
      }
      try {
        const asBinary = BigInt(numericId).toString(2);
        const first41Chars = asBinary.slice(0, 41);
        const timestamp = parseInt(first41Chars, 2);
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        // This can fail if the post ID is not a valid number, which can happen.
        return 'N/A';
      }
    }

    const interval = 100; // ms
    const maxScrolls = 50; // to prevent infinite loops
    let scrolls = 0;

    const scrollInterval = setInterval(() => {
      scrolls++;
      const currentScroll = window.scrollY;
      window.scrollTo(0, document.body.scrollHeight);

      if (window.scrollY === currentScroll || scrolls >= maxScrolls) {
        clearInterval(scrollInterval);
        // Wait a bit for the last posts to load
        setTimeout(() => {
          const posts = document.querySelectorAll('.feed-shared-update-v2');
          const postsData = [];
          posts.forEach(post => {
            const impressionsEl = post.querySelector('.ca-entry-point__num-views strong');
            let impressions = 'N/A';
            if (impressionsEl) {
                const impressionsText = impressionsEl.innerText.trim(); // e.g., "5,055 impressions"
                impressions = impressionsText.split(' ')[0].replace(/,/g, ''); // e.g., "5055"
            }

            const authorNameEl = post.querySelector('.update-components-actor__title span[aria-hidden="true"]');
            const authorName = authorNameEl ? authorNameEl.innerText.trim() : 'N/A';

            const authorProfileEl = post.querySelector('.update-components-actor__meta-link');
            const authorProfile = authorProfileEl ? authorProfileEl.href : '#';

            const contentEl = post.querySelector('.update-components-text');
            const content = contentEl ? contentEl.innerText.trim() : 'N/A';

            const analyticsLinkEl = post.querySelector('a.analytics-entry-point');
            let postUrl = '#';
            let postId = 'N/A';
            let fullUrn = 'N/A';

            if (analyticsLinkEl) {
                const href = analyticsLinkEl.getAttribute('href');
                const urn = href.split('/')[3];
                if (urn) {
                    fullUrn = urn; // e.g., urn:li:activity:7198699341484134400
                    postId = urn.split(':').pop(); // e.g., 7198699341484134400
                    postUrl = `https://www.linkedin.com/feed/update/${fullUrn}/`;
                }
            }

            const datePosted = getAbsoluteDate(postId);

            const socialCounts = post.querySelector('.social-details-social-counts');
            let likes = 0;
            let comments = 0;
            let reposts = 0;

            if (socialCounts) {
              // First, try to find the fallback number which is more reliable
              const fallbackLikesEl = socialCounts.querySelector('.social-details-social-counts__social-proof-fallback-number');
              if (fallbackLikesEl) {
                likes = parseInt(fallbackLikesEl.innerText.replace(/,/g, ''), 10) || 0;
              } else {
                // If not found, try the other selector and parse the text
                const likesEl = socialCounts.querySelector('.social-details-social-counts__reactions-count, .social-details-social-counts__count-value');
                if (likesEl) {
                  const likesText = likesEl.innerText.trim();
                  const match = likesText.match(/[\d,]+/);
                  if (match) {
                    likes = parseInt(match[0].replace(/,/g, ''), 10) || 0;
                  }
                }
              }

              const commentsEl = socialCounts.querySelector('.social-details-social-counts__comments .social-details-social-counts__count-value');
              if (commentsEl) {
                comments = parseInt(commentsEl.innerText.split(' ')[0].replace(/,/g, '')) || 0;
              }

              const repostsEl = socialCounts.querySelector('button[aria-label*="repost"] span');
              if (repostsEl) {
                reposts = parseInt(repostsEl.innerText.split(' ')[0].replace(/,/g, '')) || 0;
              }
            }

            const totalEngagement = likes + comments + reposts;

            postsData.push({ 
              impressions: impressions,
              authorName: authorName,
              authorProfile: authorProfile,
              content: content,
              postUrl: postUrl,
              datePosted: datePosted,
              postId: postId,
              likes: likes,
              comments: comments,
              reposts: reposts,
              totalEngagement: totalEngagement
            });
          });
          resolve(postsData);
        }, 2000); // Wait 2 seconds for final content to load
      }
    }, interval);
  });
}
