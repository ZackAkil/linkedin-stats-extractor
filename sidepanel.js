document.addEventListener('DOMContentLoaded', function() {
  var socialActivityLink = document.getElementById('socialActivityLink');
  var extractStatsBtn = document.getElementById('extractStatsBtn');
  var statsResult = document.getElementById('statsResult');
  var usernameInput = document.getElementById('usernameInput');
  var saveUsernameBtn = document.getElementById('saveUsernameBtn');
  var copyJsonBtn = document.getElementById('copyJsonBtn');

  let extractedData = [];

  // Load saved username and update link
  chrome.storage.local.get('linkedinUsername', function(data) {
    if (data.linkedinUsername) {
      usernameInput.value = data.linkedinUsername;
      socialActivityLink.href = `https://www.linkedin.com/in/${data.linkedinUsername}/recent-activity/all/`;
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

    extractStatsBtn.addEventListener('click', function() {
    extractStatsBtn.disabled = true;
    extractStatsBtn.textContent = 'Extracting...';
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: scrapeStats
      }, (injectionResults) => {
        statsResult.innerHTML = '';
        for (const frameResult of injectionResults) {
          const posts = frameResult.result;
          extractedData = posts;
          if (posts && posts.length > 0) {
            const table = document.createElement('table');
            table.innerHTML = `
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Content</th>
                  <th>Impressions</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Reposts</th>
                  <th>Total Engagement</th>
                  <th>URL</th>
                  <th>Date</th>
                  <th>Post ID</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            `;
            const tbody = table.querySelector('tbody');
            posts.forEach(post => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td><a href="${post.authorProfile}" target="_blank">${post.authorName}</a></td>
                <td>${post.content}</td>
                <td>${post.impressions}</td>
                <td>${post.likes}</td>
                <td>${post.comments}</td>
                <td>${post.reposts}</td>
                <td>${post.totalEngagement}</td>
                <td><a href="${post.postUrl}" target="_blank">View Post</a></td>
                <td>${post.datePosted}</td>
                <td>${post.postId}</td>
              `;
              tbody.appendChild(row);
            });
            statsResult.appendChild(table);
            copyJsonBtn.style.display = 'inline-block';
            extractStatsBtn.disabled = false;
            extractStatsBtn.textContent = 'Extract Stats';
          } else {
            statsResult.textContent = 'No stats found.';
            copyJsonBtn.style.display = 'none';
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
              const likesEl = socialCounts.querySelector('.social-details-social-counts__reactions-count');
              if (likesEl) {
                likes = parseInt(likesEl.innerText.replace(/,/g, '')) || 0;
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
