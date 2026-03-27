const API_BASE = (window.FILMHUB_API_BASE || window.location.origin).replace(/\/$/, "");

// Test if JavaScript is loading
console.log("app.js loaded successfully");

function setToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}

function resolveThumbnailPath(thumbnail) {
  if (!thumbnail) return "";
  const normalized = String(thumbnail).replace(/\\/g, "/");
  if (normalized.includes("/")) return normalized;
  return "thumbnails/" + normalized;
}


function setActiveTopNav(targetId) {
  const buttons = document.querySelectorAll(".top-link");
  buttons.forEach(btn => btn.classList.remove("active"));
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (target) target.classList.add("active");
}
function showHome() {
  setActiveTopNav("nav-home");
  loadFilms();
}

function showFAQ() {
  setActiveTopNav(null);
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Frequently Asked Questions</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">Quick answers about using FilmHub.</p>
    <div class="faq-list">
      <div class="faq-item">
        <h4>How do I search for a film?</h4>
        <p>Use the Search button at the top, type a title, and submit to see matching films.</p>
      </div>
      <div class="faq-item">
        <h4>How do categories work?</h4>
        <p>Select a category to filter films that match that genre.</p>
      </div>
      <div class="faq-item">
        <h4>How do I watch a film?</h4>
        <p>Open a film from Home or a category and press Play in the player.</p>
      </div>
      <div class="faq-item">
        <h4>How do points work?</h4>
        <p>View reward rule: 100 views = 1000 points. Watching other videos earns 1 point per 10 seconds watched. Guests do not earn points.</p>
      </div>
      <div class="faq-item">
        <h4>Why can't a video play?</h4>
        <p>Some browsers don't support MKV. Upload MP4 (H.264/AAC) for the most reliable playback.</p>
      </div>
      <div class="faq-item">
        <h4>Can I upload films?</h4>
        <p>Uploading is available to subscribed users with an approved subscription.</p>
      </div>
      <div class="faq-item">
        <h4>How do I contact support?</h4>
        <p>Email immanuelchibaka@gmail.com and include your account email for faster help.</p>
      </div>
    </div>
  `;
}

function showTerms() {
  setActiveTopNav(null);
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Terms of Service</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">By using FilmHub, you agree to the terms below.</p>
    <div class="faq-list">
      <div class="faq-item">
        <h4>Accounts and eligibility</h4>
        <p>Provide accurate account details and use the service only where it is permitted.</p>
      </div>
      <div class="faq-item">
        <h4>Content and uploads</h4>
        <p>You are responsible for the content you upload and must own or have rights to it.</p>
      </div>
      <div class="faq-item">
        <h4>Prohibited content</h4>
        <p>Do not upload illegal, harmful, or infringing content. We may remove content that violates these rules.</p>
      </div>
      <div class="faq-item">
        <h4>Points and rewards</h4>
        <p>View reward rule: 100 views = 1000 points. Watching other videos earns 1 point per 10 seconds watched. Points have no cash value unless redeemed under in-app rules.</p>
      </div>
      <div class="faq-item">
        <h4>Subscriptions and payments</h4>
        <p>Subscription features are available only after payment approval. Fees may change with notice.</p>
      </div>
      <div class="faq-item">
        <h4>Termination</h4>
        <p>We may suspend or terminate accounts for violations or abuse of the service.</p>
      </div>
      <div class="faq-item">
        <h4>Admin enforcement</h4>
        <p>Admins may suspend a video or an account when content or behavior violates the rules.</p>
      </div>
      <div class="faq-item">
        <h4>Disclaimer</h4>
        <p>The service is provided as-is without warranties. We are not liable for losses resulting from use.</p>
      </div>
      <div class="faq-item">
        <h4>Contact</h4>
        <p>Questions? Email immanuelchibaka@gmail.com.</p>
      </div>
    </div>
  `;
}
function showContact() {
  setActiveTopNav(null);
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Contact Us</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">We are here to help. Reach out anytime.</p>
    <div class="faq-list">
      <div class="faq-item">
        <h4>Email</h4>
        <p>immanuelchibaka@gmail.com</p>
      </div>
      <div class="faq-item">
        <h4>Phone</h4>
        <p>0996295313</p>
      </div>
    </div>
  `;
}
function handleInitialRoute() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path === "/faq") {
    history.replaceState(null, "", "/");
    showHome();
    return;
  }
  if (path === "/terms") {
    showTerms();
    return;
  }
  if (path === "/contact") {
    showContact();
    return;
  }
  showHome();
}

function showLogin() {
  console.log("showLogin called");
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Login</h2>
    <form id="login-form">
      <div><label>Email: <input type="email" name="email" required /></label></div>
      <div><label>Password: <input type="password" name="password" required /></label></div>
      <button type="submit">Login</button>
    </form>
    <div id="login-error" class="error"></div>
  `;
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const data = { email: form.email.value, password: form.password.value };
    try {
      const res = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok) {
          setToken(json.token);
          updateNav();
          showHome();
        } else {
          document.getElementById("login-error").innerText = json.message;
        }
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("login-error").innerText = "Server error - check console";
      }
    } catch (err) {
      document.getElementById("login-error").innerText = "Network error: " + err.message;
    }
  });
}

function showRegister() {
  console.log("showRegister called");
  const main = document.getElementById("main-content");
  if (!main) {
    console.error("main-content element not found");
    return;
  }

  // Get referral code from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

  main.innerHTML = `
    <h2>Register</h2>
    <form id="register-form">
      <div><label>Username: <input name="username" required /></label></div>
      <div><label>Email: <input type="email" name="email" required /></label></div>
      <div><label>Password: <input type="password" name="password" required /></label></div>
      ${referralCode ? `<p style="color: #4caf50; font-size: 14px;">&#127873; You have a referral code - you'll get both a great experience and your referrer will earn points!</p>` : ''}
      <button type="submit">Register</button>
    </form>
    <div id="register-error" class="error"></div>
  `;
  
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const data = { 
      username: form.username.value, 
      email: form.email.value, 
      password: form.password.value,
      referral_code: referralCode || undefined
    };
    
    try {
      const res = await fetch(API_BASE + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok) {
          alert("Registration successful, please log in");
          showLogin();
        } else {
          document.getElementById("register-error").innerText = json.message;
        }
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("register-error").innerText = "Server error";
      }
    } catch (err) {
      document.getElementById("register-error").innerText = "Network error: " + err.message;
    }
  });
}

async function loadFilms() {
  const main = document.getElementById("main-content");
  main.innerHTML = "<h2>Popular Movies</h2><div id=\"film-list\" class=\"films-grid\">Loading...</div>";
  try {
    const res = await fetch(API_BASE + "/api/films/films");
    const text = await res.text();
    try {
      const films = JSON.parse(text);
      if (!Array.isArray(films) || films.length === 0) {
        document.getElementById("film-list").innerHTML = "<p>No films available</p>";
        return;
      }
      const Token = getToken();
      const list = films.map(f => `
        <div class="film" data-id="${f.id}">
          <div class="film-thumbnail">
            ${f.thumbnail ? `<img src="${API_BASE}/uploads/${resolveThumbnailPath(f.thumbnail)}" alt="${f.title}">` : "&#127902;"}
            <div class="film-overlay">
              <div class="film-title">${f.title || "Untitled"}</div>
              <div class="film-meta">${f.category || "Unknown"}</div>
            </div>
          </div>
        </div>
      `).join("");
      document.getElementById("film-list").innerHTML = list;
      
      // Add click handlers to film cards
      document.querySelectorAll(".film").forEach(card => {
        card.addEventListener("click", (e) => {
          const filmData = films.find(f => f.id == card.getAttribute("data-id"));
          showFilmDetail(filmData);
        });
      });
    } catch (parseErr) {
      console.error("Films response was not JSON:", text);
      document.getElementById("film-list").innerHTML = "<p>Could not load films.</p>";
    }
  } catch (err) {
    console.error("Films fetch error:", err);
    document.getElementById("film-list").innerText = "Could not load films: " + err.message;
  }
}

function showFilmDetail(film) {
  const token = getToken();
  const user = parseToken();
  const main = document.getElementById("main-content");

  const videoPath = film.video_url || film.video || film.video_path || film.videoFile || "";
  const resolvedVideoPath = videoPath ? (String(videoPath).includes("/") ? String(videoPath).replace(/\\/g, "/") : "videos/" + String(videoPath)) : "";
  const videoUrl = resolvedVideoPath ? `${API_BASE}/uploads/${resolvedVideoPath}` : "";
  const filmId = film.id || film.film_id;
  const isMkv = videoUrl.toLowerCase().endsWith(".mkv");

  const pointsMessage = token ?
    '<div class="points-info">You are logged in - view reward rule: 100 views = 1000 points. Watching other videos earns 1 point per 10 seconds watched.</div>' :
    '<div class="points-info">You are watching as a guest - register to earn points. View reward rule: 100 views = 1000 points. Watching other videos earns 1 point per 10 seconds watched.</div>';

  const engagementControls = token ? `
    <div class="engagement-actions">
      <button id="like-btn" class="engagement-btn">&#128077;</button>
      <div class="reaction-group">
        <button class="reaction-btn" data-reaction="love">&#128525;</button>
        <button class="reaction-btn" data-reaction="wow">&#128558;</button>
        <button class="reaction-btn" data-reaction="funny">&#128514;</button>
        <button class="reaction-btn" data-reaction="sad">&#128546;</button>
        <button class="reaction-btn" data-reaction="fire">&#128293;</button>
      </div>
    </div>
  ` : `
    <div class="engagement-guest">Log in to like, react, comment, and rate.</div>
  `;

  const commentForm = token ? `
    <form id="comment-form" class="inline-form">
      <div><label>Comment: <input name="comment" required /></label></div>
      <button type="submit">Post Comment</button>
    </form>
  ` : "";

  const ratingForm = token ? `
    <form id="rating-form" class="inline-form">
      <div><label>Rating <span class="rating-star">&#9733;</span>: <select name="rating" required>
        <option value="">Select rating</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select></label></div>
      <button type="submit">Submit Rating</button>
    </form>
  ` : "";

  main.innerHTML = `
    <div class="watch-player">
      <div class="video-container">
        <div class="video-placeholder" data-video-url="${videoUrl}">
          <h3>${film.title || "Untitled"}</h3>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:12px;">
            <button class="play-btn">Play</button>
            ${videoUrl ? `<a class="download-btn" href="${videoUrl}" download>Download</a>` : ""}
          </div>
          ${isMkv ? `<div class="engagement-guest">Your browser may not support MKV playback. For in-browser play, upload MP4 (H.264/AAC).</div>` : ""}
          ${pointsMessage}
        </div>
      </div>
    </div>
    <div class="film-details">
      <h2>${film.title || "Untitled"}</h2>
      <div class="film-rating">Rating: ${film.rating ? `${film.rating} &#9733;` : "N/A"}</div>
      <div class="film-description">${film.description || "No description available"}</div>
      <button id="back-btn" class="play-btn" style="display: block; max-width: 200px;">Back to Films</button>
    </div>

    <div class="engagement-panel">
      <div id="engagement-stats" class="engagement-stats">Loading...</div>
      ${engagementControls}
    </div>
    <div id="engagement-error" class="error" style="display:none;"></div>

    <div class="comments-section">
      <h3>Comments</h3>
      <div id="comments-list">Loading...</div>
      ${commentForm}
    </div>

    <div class="ratings-section">
      <h3>Ratings</h3>
      <div id="ratings-list">Loading...</div>
      ${ratingForm}
    </div>
  `;

  const errBox = document.getElementById("engagement-error");
  const showEngagementError = (msg) => {
    if (!errBox) return;
    errBox.style.display = "block";
    errBox.innerText = msg;
  };
  const clearEngagementError = () => {
    if (!errBox) return;
    errBox.style.display = "none";
    errBox.innerText = "";
  };
  const parseJsonSafe = (text) => {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  };

  let lastWatchBucket = 0;
  let hasRecordedView = false;
  const recordView = () => {
    if (!filmId || hasRecordedView) return;
    hasRecordedView = true;
    fetch(API_BASE + "/api/films/" + filmId + "/view", {
      method: "POST"
    })
      .then(r => r.text())
      .then(() => {
        loadEngagement();
      })
      .catch(() => {
        // ignore view count errors
      });
  };
  const recordWatch = (seconds) => {
    if (!token || !filmId) return;
    fetch(API_BASE + "/api/films/watch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ film_id: filmId, seconds })
    })
      .then(async r => {
        const text = await r.text();
        const data = parseJsonSafe(text);
        if (!r.ok) {
          showEngagementError((data && data.message) || "Could not record watch.");
        }
      })
      .catch(() => {
        // ignore watch errors to avoid interrupting playback
      });
  };

  const playBtn = document.querySelector(".play-btn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      const placeholder = document.querySelector(".video-placeholder");
      const url = placeholder ? placeholder.getAttribute("data-video-url") : "";
      if (!url) {
        alert("Video file not available.");
        return;
      }
      const videoType = url.toLowerCase().endsWith(".mkv") ? "video/x-matroska" : "video/mp4";
      placeholder.innerHTML = `
        <video controls autoplay style="width:100%; max-height:520px; border-radius:12px; background:#000;">
          <source src="${url}" type="${videoType}">
          Your browser does not support the video tag.
        </video>
      `;
      recordView();
      const videoEl = placeholder.querySelector("video");
      if (videoEl && token) {
        const canPlay = videoEl.canPlayType && videoEl.canPlayType(videoType);
        if (!canPlay) {
          showEngagementError("This video format or codec is not supported by your browser. Re-upload as MP4 (H.264/AAC) for in-browser playback.");
        }
        const onTimeUpdate = () => {
          const bucket = Math.floor(videoEl.currentTime / 10);
          if (bucket > lastWatchBucket) {
            lastWatchBucket = bucket;
            recordWatch(videoEl.currentTime);
          }
        };
        videoEl.addEventListener("timeupdate", onTimeUpdate);
        videoEl.addEventListener("error", () => {
          showEngagementError("Video playback failed. Re-upload as MP4 (H.264/AAC) to fix black screen issues.");
        });
      }
    });
  }

  function loadEngagement() {
    if (!filmId) return;
    fetch(API_BASE + "/api/films/" + filmId + "/engagement")
      .then(r => r.text())
      .then(text => {
        const data = parseJsonSafe(text);
        if (!data) {
          document.getElementById("engagement-stats").innerText = "Could not load engagement";
          return;
        }
        const reactions = data.reactions || {};
        const emojiMap = {
          love: "&#128525;",
          wow: "&#128558;",
          funny: "&#128514;",
          sad: "&#128546;",
          fire: "&#128293;",
          like: "&#128077;"
        };
        const reactionSummary = Object.keys(reactions).map(k => `${emojiMap[k] || k}: ${reactions[k]}`).join(" | ") || "No reactions";
        document.getElementById("engagement-stats").innerHTML = `Views: ${data.views || 0} | Likes: ${data.likes || 0} | Comments: ${data.comments || 0} | Ratings: ${data.feedbacks || 0}<br>${reactionSummary}`;
      })
      .catch(() => {
        document.getElementById("engagement-stats").innerText = "Could not load engagement";
      });
  }

  function loadMyEngagement() {
    if (!token) return;
    if (!filmId) return;
    fetch(API_BASE + "/api/films/" + filmId + "/my-engagement", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const data = JSON.parse(text);
          const likeBtn = document.getElementById("like-btn");
          if (likeBtn) {
            likeBtn.classList.toggle("active", !!data.liked);
          }
          document.querySelectorAll(".reaction-btn").forEach(btn => {
            btn.classList.toggle("active", data.reaction && btn.getAttribute("data-reaction") === data.reaction);
          });
        } catch (e) {
          // ignore
        }
      })
      .catch(() => {
        // ignore
      });
  }

  function loadComments() {
    if (!filmId) return;
    fetch(API_BASE + "/api/films/" + filmId + "/comments")
      .then(r => r.text())
      .then(text => {
        const list = parseJsonSafe(text);
        if (!Array.isArray(list) || list.length === 0) {
          document.getElementById("comments-list").innerHTML = "<p>No comments yet.</p>";
          return;
        }
        const html = list.map(c => `<div class="comment-item"><strong>${c.username || "User"}:</strong> ${c.comment_text || c.comment || ""}</div>`).join("");
        document.getElementById("comments-list").innerHTML = html;
      })
      .catch(() => {
        document.getElementById("comments-list").innerHTML = "<p>Could not load comments.</p>";
      });
  }

  function loadRatings() {
    if (!filmId) return;
    fetch(API_BASE + "/api/films/" + filmId + "/feedback")
      .then(r => r.text())
      .then(text => {
        const list = parseJsonSafe(text);
        if (!Array.isArray(list) || list.length === 0) {
          document.getElementById("ratings-list").innerHTML = "<p>No ratings yet.</p>";
          return;
        }
        const html = list.map(f => {
          const ratingMarkup = f.rating ? `<span class="rating-badge"><span class="rating-star">&#9733;</span> ${f.rating}</span>` : "";
          const textPart = f.feedback_text || f.feedback || "";
          return `<div class="comment-item"><strong>${f.username || "User"}:</strong> ${ratingMarkup} ${textPart}</div>`;
        }).join("");
        document.getElementById("ratings-list").innerHTML = html;
      })
      .catch(() => {
        document.getElementById("ratings-list").innerHTML = "<p>Could not load ratings.</p>";
      });
  }

  if (token) {
    const likeBtn = document.getElementById("like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", () => {
        if (!filmId) {
          showEngagementError("Missing film id. Refresh and try again.");
          return;
        }
        fetch(API_BASE + "/api/films/" + filmId + "/like", {
          method: "POST",
          headers: { Authorization: "Bearer " + token }
        })
          .then(async r => {
            const text = await r.text();
            const data = parseJsonSafe(text);
            if (!r.ok) {
              showEngagementError((data && data.message) || "Could not update like.");
              return;
            }
            clearEngagementError();
            loadEngagement();
            loadMyEngagement();
          })
          .catch(() => showEngagementError("Network error while updating like."));
      });
    }

    document.querySelectorAll(".reaction-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!filmId) {
          showEngagementError("Missing film id. Refresh and try again.");
          return;
        }
        const reaction = btn.getAttribute("data-reaction");
        fetch(API_BASE + "/api/films/" + filmId + "/react", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ reaction })
        })
          .then(async r => {
            const text = await r.text();
            const data = parseJsonSafe(text);
            if (!r.ok) {
              showEngagementError((data && data.message) || "Could not update reaction.");
              return;
            }
            clearEngagementError();
            loadEngagement();
            loadMyEngagement();
          })
          .catch(() => showEngagementError("Network error while updating reaction."));
      });
    });

    const commentFormEl = document.getElementById("comment-form");
    if (commentFormEl) {
      commentFormEl.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!filmId) {
          showEngagementError("Missing film id. Refresh and try again.");
          return;
        }
        const form = e.target;
        const comment = form.comment.value.trim();
        if (!comment) {
          showEngagementError("Comment cannot be empty.");
          return;
        }
        fetch(API_BASE + "/api/films/" + filmId + "/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ comment })
        })
          .then(async r => {
            const text = await r.text();
            const data = parseJsonSafe(text);
            if (!r.ok) {
              showEngagementError((data && data.message) || "Could not post comment.");
              return;
            }
            clearEngagementError();
            form.reset();
            loadComments();
            loadEngagement();
          })
          .catch(() => showEngagementError("Network error while posting comment."));
      });
    }

    const ratingFormEl = document.getElementById("rating-form");
    if (ratingFormEl) {
      ratingFormEl.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!filmId) {
          showEngagementError("Missing film id. Refresh and try again.");
          return;
        }
        const form = e.target;
        const rating = form.rating.value;
        if (!rating) {
          showEngagementError("Please select a rating.");
          return;
        }
        fetch(API_BASE + "/api/films/" + filmId + "/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ rating })
        })
          .then(async r => {
            const text = await r.text();
            const data = parseJsonSafe(text);
            if (!r.ok) {
              showEngagementError((data && data.message) || "Could not submit rating.");
              return;
            }
            clearEngagementError();
            form.reset();
            loadRatings();
            loadEngagement();
          })
          .catch(() => showEngagementError("Network error while submitting rating."));
      });
    }
  }

  loadEngagement();
  loadMyEngagement();
  loadComments();
  loadRatings();

  document.getElementById("back-btn").addEventListener("click", loadFilms);
}

function showDiscovery() {
  setActiveTopNav("nav-discovery");
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Search Films</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">Type a film name and search.</p>
    <form id="search-form" style="max-width: 700px; margin: 0 0 24px 0;">
      <div style="display:flex; gap:12px; align-items:center;">
        <input id="search-input" name="q" placeholder="Search by film title..." style="flex:1;" required />
        <button type="submit" style="width:auto; padding:12px 18px;">Search</button>
      </div>
    </form>
    <div id="search-results" class="films-grid">Enter a film name to search.</div>
  `;

  const form = document.getElementById("search-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("search-input").value.trim();
    const resultsEl = document.getElementById("search-results");
    if (!query) {
      resultsEl.innerHTML = "<p>Please enter a search term.</p>";
      return;
    }
    resultsEl.innerHTML = "Searching...";
    fetch(API_BASE + "/api/films/search?q=" + encodeURIComponent(query))
      .then(res => res.text())
      .then(text => {
        try {
          const films = JSON.parse(text);
          if (!Array.isArray(films) || films.length === 0) {
            resultsEl.innerHTML = "<p>No films found.</p>";
            return;
          }
          const list = films.map(f => `
            <div class="film" data-id="${f.id}">
              <div class="film-thumbnail">
                ${f.thumbnail ? `<img src="${API_BASE}/uploads/${resolveThumbnailPath(f.thumbnail)}" alt="${f.title}">` : "&#127902;"}
                <div class="film-overlay">
                  <div class="film-title">${f.title || "Untitled"}</div>
                  <div class="film-meta">${f.category || "Unknown"}</div>
                </div>
              </div>
            </div>
          `).join("");
          resultsEl.innerHTML = list;
          document.querySelectorAll(".film").forEach(card => {
            card.addEventListener("click", () => {
              const filmData = films.find(x => String(x.id) === String(card.getAttribute("data-id")));
              if (filmData) showFilmDetail(filmData);
            });
          });
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          resultsEl.innerHTML = "<p>Could not load films.</p>";
        }
      })
      .catch(err => {
        console.error("Search error:", err);
        resultsEl.innerHTML = "<p>Search failed: " + err.message + "</p>";
      });
  });
}

function filterByCategory(category) {
  const categoryToNav = {
    "Drama": "nav-drama",
    "Educative": "nav-educative",
    "Comedies": "nav-comedies",
    "Dancing Videos": "nav-dancing",
    "Music Videos": "nav-music"
  };
  setActiveTopNav(categoryToNav[category] || null);
  const main = document.getElementById("main-content");
  main.innerHTML = `<h2>${category} Films</h2><div id="film-list" class="films-grid">Loading...</div>`;
  
  fetch(API_BASE + "/api/films/films")
    .then(res => res.text())
    .then(text => {
      try {
        const films = JSON.parse(text);
        if (!Array.isArray(films) || films.length === 0) {
          document.getElementById("film-list").innerHTML = "<p>No films available in this category</p>";
          return;
        }
        
        const filteredFilms = films.filter(f => f.category && f.category.toLowerCase() === category.toLowerCase());
        
        if (filteredFilms.length === 0) {
          document.getElementById("film-list").innerHTML = `<p>No ${category} films available</p>`;
          return;
        }
        
        const list = filteredFilms.map(f => `
          <div class="film" data-id="${f.id}">
            <div class="film-thumbnail">
              ${f.thumbnail ? `<img src="${API_BASE}/uploads/${resolveThumbnailPath(f.thumbnail)}" alt="${f.title}">` : "&#127902;"}
              <div class="film-overlay">
                <div class="film-title">${f.title || "Untitled"}</div>
                <div class="film-meta">${f.category || "Unknown"}</div>
              </div>
            </div>
          </div>
        `).join("");
        
        document.getElementById("film-list").innerHTML = list;
        
        // Add click handlers
        document.querySelectorAll(".film").forEach(card => {
          card.addEventListener("click", (e) => {
            const filmData = filteredFilms.find(f => f.id == card.getAttribute("data-id"));
            showFilmDetail(filmData);
          });
        });
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("film-list").innerHTML = "<p>Could not load films.</p>";
      }
    })
    .catch(err => {
      console.error("Filter error:", err);
      document.getElementById("film-list").innerText = "Could not load films: " + err.message;
    });
}

function showUpload() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  // check subscription status first
  fetch(API_BASE + "/api/subscriptions/mine", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(r => r.text())
    .then(text => {
      try {
        const data = JSON.parse(text);
        const hasApproved = Array.isArray(data) && data.some(s => s.status === "approved");
        if (!hasApproved) {
          const main = document.getElementById("main-content");
          main.innerHTML = `<h2>Subscription required</h2><p>You must subscribe before uploading films.</p><button id="go-subscribe">Subscribe</button>`;
          document.getElementById("go-subscribe").addEventListener("click", showSubscribe);
          return;
        }
        // user has subscription, show upload form
        const main = document.getElementById("main-content");
        main.innerHTML = `
      <h2>Upload Film</h2>
      <form id="upload-form" enctype="multipart/form-data">
        <div><label>Title: <input name="title" required /></label></div>
        <div><label>Description: <textarea name="description"></textarea></label></div>
        <div><label>Category: <select name="category" required>
          <option value="">Select a category</option>
          <option value="Drama">Drama</option>
          <option value="Educative">Educative</option>
          <option value="Comedies">Comedies</option>
          <option value="Dancing Videos">Dancing Videos</option>
          <option value="Music Videos">Music Videos</option>
        </select></label></div>
        <div><label>Video File: <input type="file" name="video" accept=".mp4,.mkv,video/mp4,video/x-matroska" required /></label></div>
        <div><label>Thumbnail: <input type="file" name="thumbnail" accept=".jpg,.jpeg,image/jpeg" required /></label></div>
        <button type="submit">Upload</button>
      </form>
      <div id="upload-error" class="error"></div>
      <div id="upload-success" class="success"></div>
    `;
        const uploadForm = document.getElementById("upload-form");
        if (uploadForm) {
          uploadForm.addEventListener("submit", async e => {
            e.preventDefault();
            const form = e.target;
            const fd = new FormData(form);
            
            // Clear previous messages
            document.getElementById("upload-error").innerText = "";
            document.getElementById("upload-success").innerText = "Uploading...";
            
            console.log("Uploading to:", API_BASE + "/api/films/upload");
            
            try {
              const res = await fetch(API_BASE + "/api/films/upload", {
                method: "POST",
                headers: {
                  Authorization: "Bearer " + token
                },
                body: fd
              });
              
              console.log("Upload response status:", res.status);
              const responseText = await res.text();
              console.log("Upload response text:", responseText);
              
              try {
                const json = JSON.parse(responseText);
                if (res.ok) {
                  document.getElementById("upload-success").innerText = "\u2713 " + (json.message || "Film uploaded successfully!");
                  document.getElementById("upload-error").innerText = "";
                  form.reset();
                  // Optionally refresh films list after successful upload
                  setTimeout(() => {
                    loadFilms();
                  }, 2000);
                } else {
                  document.getElementById("upload-error").innerText = json.message || "Error uploading film";
                  document.getElementById("upload-success").innerText = "";
                }
              } catch (parseErr) {
                console.error("Response was not JSON:", responseText);
                document.getElementById("upload-error").innerText = "Server returned invalid response: " + responseText.substring(0, 100);
                document.getElementById("upload-success").innerText = "";
              }
            } catch (err) {
              console.error("Upload error:", err);
              document.getElementById("upload-error").innerText = "Network error: " + err.message;
              document.getElementById("upload-success").innerText = "";
            }
          });
        } else {
          console.error("Upload form not found in DOM");
        }
      } catch (parseErr) {
        console.error("Subscription response was not JSON:", text);
        const main = document.getElementById("main-content");
        main.innerHTML = `<h2>Error</h2><p>Could not parse subscription response. Check console for details.</p><p style="color: #f44336; font-size: 12px;">${text.substring(0, 200)}</p>`;
      }
    })
    .catch(err => {
      console.error("Error checking subscriptions:", err);
      const main = document.getElementById("main-content");
      main.innerHTML = `<h2>Error</h2><p>Could not check subscription status: ${err.message}</p>`;
    });
}

// show subscription form / status
function showSubscribe() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Subscribe to Upload Films</h2>
    
    <div style="background: #0f151f; border: 2px solid var(--blue); padding: 20px; margin-bottom: 30px; border-radius: 8px;">
      <h3 style="margin-top: 0; color: var(--blue);">Payment Instructions</h3>
      <p style="color: var(--muted); margin-bottom: 10px;">Weekly subscription fee: MWK 2000 per week.</p>
      <p style="color: var(--muted); margin-bottom: 15px;">Send your payment to the following phone number and then submit your transaction ID below:</p>
      <div style="background: #121a26; padding: 15px; border-radius: 4px; margin-bottom: 15px; text-align: center;">
        <p style="margin: 0; color: var(--muted); font-size: 12px; margin-bottom: 5px;">PAYMENT PHONE NUMBERS</p>
        <p style="margin: 0; color: #4caf50; font-size: 32px; font-weight: bold; font-family: monospace;">0996295313</p>
        <p style="margin: 6px 0 0; color: #4caf50; font-size: 32px; font-weight: bold; font-family: monospace;">0889545231</p>
      </div>
      <p style="color: var(--muted); font-size: 14px;">Once you've sent the payment, enter your transaction ID below and wait for admin approval.</p>
    </div>

    <form id="subscribe-form">
      <p style="margin-bottom: 20px; color: var(--muted);">Submit your payment details below. Your access will be activated after admin approval.</p>
      <div><label>Transaction ID: <input name="transaction_id" placeholder="e.g., TXN123456" required /></label></div>
      <div><label>Amount (MWK): <input name="amount" type="number" step="0.01" placeholder="e.g., 2000" required /></label></div>
      <button type="submit">Submit Payment</button>
    </form>
    <div id="subscribe-error" class="error"></div>
    <div id="subscribe-success" class="success"></div>
    
    <h3>Your Submission Status</h3>
    <div id="subscribe-list">Loading...</div>
  `;

  document.getElementById("subscribe-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const data = { 
      transaction_id: form.transaction_id.value,
      amount: form.amount.value,
      auto_approve: false
    };
    try {
      const res = await fetch(API_BASE + "/api/subscriptions/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(data)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok) {
          document.getElementById("subscribe-success").innerText = json.message || "\u2713 Payment submitted successfully! You now have content creator privileges!";
          document.getElementById("subscribe-error").innerText = "";
          form.reset();
          setTimeout(() => loadSubscriptions(), 1000);
        } else {
          document.getElementById("subscribe-error").innerText = json.message || "Error submitting payment";
          document.getElementById("subscribe-success").innerText = "";
        }
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("subscribe-error").innerText = "Server error";
      }
    } catch (err) {
      document.getElementById("subscribe-error").innerText = "Network error: " + err.message;
      document.getElementById("subscribe-success").innerText = "";
    }
  });
  
  function loadSubscriptions() {
    fetch(API_BASE + "/api/subscriptions/mine", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          const listDiv = document.getElementById("subscribe-list");
          if (!list || list.length === 0) {
            listDiv.innerHTML = "<p>No submissions yet</p>";
            return;
          }
            listDiv.innerHTML = list.map(s => {
              const rawStatus = s.status || 'pending';
              const statusColor = rawStatus === 'pending' ? '#ff9800' : rawStatus === 'approved' ? '#4caf50' : '#f44336';
              return `<div style="background: #121a26; border-left: 4px solid ${statusColor}; padding: 15px; margin: 10px 0; border-radius: 4px;">
                <strong>Transaction ID:</strong> ${s.transaction_id}<br>
                <strong>Amount:</strong> MWK ${parseFloat(s.amount).toFixed(2)}<br>
                <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${String(rawStatus).toUpperCase()}</span><br>
                ${rawStatus === 'approved' ? '<span style="color: #4caf50;">Approved - You can now upload films!</span>' : ''}
              </div>`;
            }).join("");
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          document.getElementById("subscribe-list").innerHTML = "<p style=\"color: #f44336;\">Error loading subscriptions</p>";
        }
      })
      .catch(err => {
        console.error("Error loading subscriptions:", err);
        document.getElementById("subscribe-list").innerHTML = "<p style=\"color: #f44336;\">Error loading subscriptions: " + err.message + "</p>";
      });
  }
      
  loadSubscriptions();
}

// show invite / referral section
function showInvite() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  const user = parseToken();
  const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(user.email)}`;
  
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Invite Your Friends</h2>
    
    <div style="background: #121a26; border: 2px solid var(--blue); padding: 20px; margin: 30px 0; border-radius: 8px;">
      <h3 style="margin-top: 0; color: var(--blue);">Your Referral Earnings</h3>
      <div id="referral-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #0f151f; padding: 15px; border-radius: 4px; border-left: 3px solid #4caf50;">
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 5px;">POINTS EARNED</div>
          <div style="color: #4caf50; font-size: 28px; font-weight: bold;" id="points-earned">0</div>
        </div>
        <div style="background: #0f151f; padding: 15px; border-radius: 4px; border-left: 3px solid #2196F3;">
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 5px;">SUCCESSFUL REFERRALS</div>
          <div style="color: #2196F3; font-size: 28px; font-weight: bold;" id="referral-count">0</div>
        </div>
      </div>
      <div id="referral-list" style="margin-bottom: 20px;"></div>
    </div>
    
    <div style="background: #121a26; border: 2px solid var(--blue); padding: 20px; margin: 30px 0; border-radius: 8px;">
      <h3 style="margin-top: 0; color: var(--blue);">Share Your Invite Link</h3>
      <p style="color: var(--muted); margin-bottom: 15px;">Share this link with friends to join FilmHub. You'll earn 10 points for each successful referral!</p>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="invite-link-input" value="${inviteLink}" readonly style="flex: 1; padding: 10px; background: #0f151f; border: 1px solid #2b3b52; color: var(--text); border-radius: 4px; font-size: 14px;">
        <button type="button" id="copy-invite-btn" style="padding: 10px 20px; background: var(--blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Copy</button>
      </div>
    </div>
  `;

  // Copy invite link button
  document.getElementById("copy-invite-btn").addEventListener("click", () => {
    const inviteInput = document.getElementById("invite-link-input");
    inviteInput.select();
    document.execCommand("copy");
    const btn = document.getElementById("copy-invite-btn");
    const originalText = btn.innerText;
    btn.innerText = "Copied!";
    btn.style.background = "#4caf50";
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = "var(--blue)";
    }, 2000);
  });
  
  // Load referral stats
  function loadReferralStats() {
    fetch(API_BASE + "/api/users/referral-stats", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const stats = JSON.parse(text);
          document.getElementById("points-earned").innerText = stats.referral_points || 0;
          document.getElementById("referral-count").innerText = stats.referral_count || 0;
          
          const referralListDiv = document.getElementById("referral-list");
          if (stats.referrals && stats.referrals.length > 0) {
            referralListDiv.innerHTML = `
              <div style="padding: 10px 0; border-top: 1px solid #2b3b52;">
                <p style="color: var(--muted); font-size: 12px; margin: 10px 0;">YOUR REFERRALS:</p>
                ${stats.referrals.map(ref => `
                  <div style="background: #0f151f; padding: 10px; margin: 8px 0; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: var(--text);">${ref.referred_username}</strong><br>
                      <span style="color: var(--muted); font-size: 12px;">${ref.referred_email}</span>
                    </div>
                    <span style="color: #4caf50; font-weight: bold;">+${ref.points_awarded} pts</span>
                  </div>
                `).join("")}
              </div>
            `;
          } else {
            referralListDiv.innerHTML = '<p style="color: var(--muted); font-size: 12px;">No successful referrals yet. Share your invite link to start earning!</p>';
          }
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          document.getElementById("referral-list").innerHTML = '<p style="color: #f44336; font-size: 12px;">Error loading referral stats</p>';
        }
      })
      .catch(err => {
        console.error("Error loading referral stats:", err);
        document.getElementById("referral-list").innerHTML = '<p style="color: #f44336; font-size: 12px;">Error loading referral stats: ' + err.message + '</p>';
      });
  }
  
  loadReferralStats();
}

// show current user's uploaded videos
function showMyVideos() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }

  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>My Uploaded Videos</h2>
    <div id="my-videos-list">Loading...</div>
  `;

  fetch(API_BASE + "/api/films/mine", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(r => r.text())
    .then(text => {
      try {
        const list = JSON.parse(text);
        if (!Array.isArray(list) || list.length === 0) {
          document.getElementById("my-videos-list").innerHTML = "<p>No videos uploaded yet.</p>";
          return;
        }
        const html = list.map(f => {
          const thumb = f.thumbnail ? `${API_BASE}/uploads/${resolveThumbnailPath(f.thumbnail)}` : "";
          return `
            <div style="border: 1px solid #2b3b52; padding: 14px; margin: 12px 0; border-radius: 8px; background: #111826;">
              <div style="display:grid; grid-template-columns: 80px 1fr auto; gap:12px; align-items:center;">
                <div style="width:80px; height:60px; background:#1b2636; border-radius:6px; overflow:hidden;">
                  ${thumb ? `<img src="${thumb}" alt="${f.title || "Video"}" style="width:100%; height:100%; object-fit:cover;">` : ""}
                </div>
                <div>
                  <strong>${f.title || "Untitled"}</strong><br>
                  <span style="color: var(--muted);">${f.category || "Unknown"}</span><br>
                  <span style="color: var(--muted); font-size: 12px;">Views: ${f.view_count || 0} | View points: ${f.view_points || 0}</span>
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="play-btn my-view-btn" data-id="${f.id}" style="padding:8px 12px; margin:0;">View</button>
                  <button class="my-delete-btn" data-id="${f.id}" style="background:#ff6b6b; color:#000; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join("");
        document.getElementById("my-videos-list").innerHTML = html;

        document.querySelectorAll(".my-view-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            const film = list.find(x => String(x.id) === String(id));
            if (film) showFilmDetail(film);
          });
        });

        document.querySelectorAll(".my-delete-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            if (!confirm("Delete this video?")) return;
            btn.disabled = true;
            btn.innerText = "Deleting...";
            fetch(API_BASE + "/api/films/" + id, {
              method: "DELETE",
              headers: { Authorization: "Bearer " + token }
            })
              .then(r => r.text())
              .then(text => {
                try {
                  JSON.parse(text);
                  showMyVideos();
                } catch (parseErr) {
                  console.error("Response was not JSON:", text);
                  btn.disabled = false;
                  btn.innerText = "Delete";
                }
              })
              .catch(err => {
                console.error("Delete error:", err);
                btn.disabled = false;
                btn.innerText = "Delete";
              });
          });
        });
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("my-videos-list").innerHTML = "<p>Could not load videos.</p>";
      }
    })
    .catch(err => {
      document.getElementById("my-videos-list").innerHTML = "<p>Could not load videos: " + err.message + "</p>";
    });
}

// show points and withdrawal section
function showPoints() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }

  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Points & Withdrawals</h2>
    <div id="points-summary">Loading...</div>
    <form id="withdraw-form">
      <div><label>Points to withdraw: <input name="points" type="number" min="1" required /></label></div>
      <div><label>Mobile number: <input name="user_number" required /></label></div>
      <button type="submit">Request Withdrawal</button>
    </form>
    <div id="withdraw-error" class="error"></div>
    <div id="withdraw-success" class="success"></div>
    <h3>Your Withdrawal Requests</h3>
    <div id="withdraw-list">Loading...</div>
  `;

  function loadPoints() {
    fetch(API_BASE + "/api/users/points", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const data = JSON.parse(text);
          const points = Number(data.points || 0);
          const referralPoints = Number(data.referral_points || 0);
          const totalPoints = Number(data.total_points || (points + referralPoints));
          const viewCountTotal = Number(data.view_count_total || 0);
          const viewPointsTotal = Number(data.view_points_total || 0);
          const minWithdraw = Number(data.min_withdraw_points || 0);
          const pointsPerCurrency = Number(data.points_per_currency || 0);
          const currencySymbol = "MWK";
          const moneyValue = pointsPerCurrency > 0 ? (totalPoints / pointsPerCurrency).toFixed(2) : "0.00";
          const minMoneyValue = pointsPerCurrency > 0 ? (minWithdraw / pointsPerCurrency).toFixed(2) : "0.00";

          const summary = `
            <div style="background: #121a26; border: 2px solid #4caf50; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <div style="color: var(--muted); font-size: 12px; margin-bottom: 8px;">TOTAL POINTS</div>
              <div style="color: #4caf50; font-size: 28px; font-weight: bold;">${totalPoints}</div>
              <div style="color: var(--muted); margin-top: 8px;">Watch points: ${points} | Referral points: ${referralPoints}</div>
              <div style="color: var(--muted); margin-top: 8px;">Value: ${currencySymbol} ${moneyValue}</div>
              <div style="color: var(--muted); margin-top: 8px;">Minimum withdrawal: ${minWithdraw} points (${currencySymbol} ${minMoneyValue})</div>
              <div style="color: var(--muted); margin-top: 8px;">Uploader views: ${viewCountTotal} | View points earned: ${viewPointsTotal}</div>
              <div style="color: var(--muted); margin-top: 8px;">View reward rule: 100 views = 1000 points. Watching other videos earns 1 point per 10 seconds watched.</div>
            </div>
          `;
          document.getElementById("points-summary").innerHTML = summary;

          const pointsInput = document.querySelector("#withdraw-form input[name='points']");
          if (pointsInput && minWithdraw > 0) {
            pointsInput.min = String(minWithdraw);
          }
        } catch (parseErr) {
          console.error("Points response was not JSON:", text);
          document.getElementById("points-summary").innerHTML = "<p style=\"color: #f44336;\">Error loading points</p>";
        }
      })
      .catch(err => {
        console.error("Error loading points:", err);
        document.getElementById("points-summary").innerHTML = "<p style=\"color: #f44336;\">Error loading points: " + err.message + "</p>";
      });
  }

  loadPoints();

  function loadMyWithdrawals() {
    fetch(API_BASE + "/api/payments/mine", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          if (!Array.isArray(list) || list.length === 0) {
            document.getElementById("withdraw-list").innerHTML = "<p>No withdrawal requests yet</p>";
            return;
          }
          const html = list.map(w => {
            const rawStatus = w.status || "pending";
            const statusText = String(rawStatus).toUpperCase();
            const statusColor = rawStatus === "paid" ? "#4caf50" : rawStatus === "rejected" ? "#ff6b6b" : "#ff9800";
            return `<div style="border: 1px solid #2b3b52; padding: 12px; margin: 8px 0; border-radius: 6px; background: #111826;">
              <strong>Points:</strong> ${w.points_used || 0} | <strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span>
            </div>`;
          }).join("");
          document.getElementById("withdraw-list").innerHTML = html;
        } catch (parseErr) {
          console.error("Withdrawals response was not JSON:", text);
          document.getElementById("withdraw-list").innerHTML = "<p style=\"color: #f44336;\">Error loading withdrawals</p>";
        }
      })
      .catch(err => {
        document.getElementById("withdraw-list").innerHTML = "<p style=\"color: #f44336;\">Error loading withdrawals: " + err.message + "</p>";
      });
  }

  loadMyWithdrawals();

  document.getElementById("withdraw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const pointsToWithdraw = Number(form.points.value);
    const userNumber = form.user_number.value.trim();

    document.getElementById("withdraw-error").innerText = "";
    document.getElementById("withdraw-success").innerText = "Submitting...";

    try {
      const res = await fetch(API_BASE + "/api/payments/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ points: pointsToWithdraw, user_number: userNumber })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok) {
          document.getElementById("withdraw-success").innerText = json.message || "Withdrawal request submitted";
          document.getElementById("withdraw-error").innerText = "";
          form.reset();
          loadPoints();
          loadMyWithdrawals();
        } else {
          document.getElementById("withdraw-error").innerText = json.message || "Error requesting withdrawal";
          document.getElementById("withdraw-success").innerText = "";
        }
      } catch (parseErr) {
        console.error("Response was not JSON:", text);
        document.getElementById("withdraw-error").innerText = "Server error";
        document.getElementById("withdraw-success").innerText = "";
      }
    } catch (err) {
      document.getElementById("withdraw-error").innerText = "Network error: " + err.message;
      document.getElementById("withdraw-success").innerText = "";
    }
  });
}

// admin panel with tabs
function showAdmin() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Admin Panel</h2>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
      <button id="admin-tab-payments" style="background:var(--blue); color:#fff; border:none; padding:8px 14px; border-radius:4px; cursor:pointer;">Payment Approvals</button>
      <button id="admin-tab-videos" style="background:#1b2636; color:#eaf2ff; border:none; padding:8px 14px; border-radius:4px; cursor:pointer;">Manage Videos</button>
      <button id="admin-tab-withdrawals" style="background:#1b2636; color:#eaf2ff; border:none; padding:8px 14px; border-radius:4px; cursor:pointer;">Withdrawals</button>
      <button id="admin-tab-users" style="background:#1b2636; color:#eaf2ff; border:none; padding:8px 14px; border-radius:4px; cursor:pointer;">Manage Users</button>
    </div>
    <div id="admin-error" class="error" style="display:none;"></div>
    <div id="admin-content">Loading...</div>
  `;

  const errorDiv = document.getElementById("admin-error");
  const contentDiv = document.getElementById("admin-content");
  const btnPayments = document.getElementById("admin-tab-payments");
  const btnVideos = document.getElementById("admin-tab-videos");
  const btnWithdrawals = document.getElementById("admin-tab-withdrawals");
  const btnUsers = document.getElementById("admin-tab-users");
  const tabButtons = [btnPayments, btnVideos, btnWithdrawals, btnUsers];

  function setActive(btn) {
    tabButtons.forEach(b => {
      b.style.background = b === btn ? "var(--blue)" : "#1b2636";
      b.style.color = b === btn ? "#fff" : "#eaf2ff";
    });
  }

  function showError(msg) {
    errorDiv.style.display = "block";
    errorDiv.innerText = msg;
  }

  function clearError() {
    errorDiv.style.display = "none";
    errorDiv.innerText = "";
  }

  function loadPayments() {
    setActive(btnPayments);
    clearError();
    contentDiv.innerHTML = "Loading...";
    fetch(API_BASE + "/api/subscriptions/all", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          if (!Array.isArray(list) || list.length === 0) {
            contentDiv.innerHTML = "<p>No payment requests</p>";
            return;
          }
          const html = list.map(s => {
            const rawStatus = s.status || "pending";
            const statusText = String(rawStatus).toUpperCase();
            const statusColor = rawStatus === "pending" ? "#ff6b6b" : rawStatus === "approved" ? "#4caf50" : "#999";
            return `<div style="border: 2px solid var(--blue); padding: 20px; margin: 15px 0; border-radius: 8px; background: #111826;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                <div>
                  <strong>Creator:</strong> ${s.username || "Unknown"}<br>
                  <strong>Email:</strong> ${s.email || "N/A"}
                </div>
                <div>
                  <strong>Transaction ID:</strong> ${s.transaction_id || "N/A"}<br>
                  <strong>Amount:</strong> MWK ${parseFloat(s.amount || 0).toFixed(2)}
                </div>
              </div>
              <div style="border-top: 1px solid #2b3b52; padding-top: 10px;">
                <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span> ` +
              (rawStatus === "pending" ? `<button data-id="${s.id}" class="approve-btn" style="margin-left: 20px;">Approve Payment</button>` : "") +
              `</div>
            </div>`;
          }).join("");
          contentDiv.innerHTML = html;
          document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              btn.disabled = true;
              btn.innerText = "Approving...";
              fetch(API_BASE + "/api/subscriptions/approve/" + id, {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
              })
                .then(r => r.text())
                .then(text => {
                  try {
                    JSON.parse(text);
                    loadPayments();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error approving payment");
                    btn.disabled = false;
                    btn.innerText = "Approve Payment";
                  }
                })
                .catch(err => {
                  showError("Error approving payment: " + err.message);
                  btn.disabled = false;
                  btn.innerText = "Approve Payment";
                });
            });
          });
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          showError("Error loading payments: " + parseErr.message);
          contentDiv.innerHTML = "";
        }
      })
      .catch(err => {
        showError("Error loading payments: " + err.message);
        contentDiv.innerHTML = "";
      });
  }

  function loadVideos() {
    setActive(btnVideos);
    clearError();
    contentDiv.innerHTML = "Loading...";
    fetch(API_BASE + "/api/admin/films", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          if (!Array.isArray(list) || list.length === 0) {
            contentDiv.innerHTML = "<p>No videos found</p>";
            return;
          }
          const html = list.map(f => {
            const isSuspended = String(f.is_suspended || "") === "1" || f.is_suspended === 1 || f.is_suspended === true;
            const suspendLabel = isSuspended ? "Unsuspend" : "Suspend";
            const suspendColor = isSuspended ? "#4caf50" : "#ff9800";
            return `
            <div style="border: 1px solid #2b3b52; padding: 14px; margin: 10px 0; border-radius: 6px; background: #111826;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <strong>Title:</strong> ${f.title || "Untitled"}<br>
                  <strong>Category:</strong> ${f.category || "N/A"}<br>
                  <strong>Uploader:</strong> ${f.username || f.uploader_id || "N/A"}
                </div>
                <div style="text-align: right;">
                  <button data-id="${f.id}" data-suspended="${isSuspended ? "1" : "0"}" class="suspend-film-btn" style="background:${suspendColor}; color:#000; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-right:8px;">${suspendLabel}</button>
                  <button data-id="${f.id}" class="delete-film-btn" style="background:#ff6b6b; color:#000; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Remove</button>
                </div>
              </div>
            </div>
          `;
          }).join("");
          contentDiv.innerHTML = html;
          document.querySelectorAll(".suspend-film-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              const suspended = btn.getAttribute("data-suspended") === "1";
              const nextState = !suspended;
              btn.disabled = true;
              btn.innerText = nextState ? "Suspending..." : "Unsuspending...";
              fetch(API_BASE + "/api/admin/films/" + id + "/suspend", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token
                },
                body: JSON.stringify({ suspended: nextState })
              })
                .then(r => r.text().then(text => ({ ok: r.ok, text })))
                .then(({ ok, text }) => {
                  try {
                    const data = JSON.parse(text);
                    if (!ok) {
                      showError((data && data.message) || "Error updating video suspension");
                      btn.disabled = false;
                      btn.innerText = nextState ? "Suspend" : "Unsuspend";
                      return;
                    }
                    btn.setAttribute("data-suspended", nextState ? "1" : "0");
                    btn.innerText = nextState ? "Unsuspend" : "Suspend";
                    btn.style.background = nextState ? "#4caf50" : "#ff9800";
                    btn.disabled = false;
                    loadVideos();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error updating video suspension");
                    btn.disabled = false;
                    btn.innerText = nextState ? "Suspend" : "Unsuspend";
                  }
                })
                .catch(err => {
                  showError("Error updating video suspension: " + err.message);
                  btn.disabled = false;
                  btn.innerText = nextState ? "Suspend" : "Unsuspend";
                });
            });
          });
          document.querySelectorAll(".delete-film-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              btn.disabled = true;
              btn.innerText = "Removing...";
              fetch(API_BASE + "/api/admin/films/" + id, {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token }
              })
                .then(r => r.text())
                .then(text => {
                  try {
                    JSON.parse(text);
                    loadVideos();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error removing video");
                    btn.disabled = false;
                    btn.innerText = "Remove";
                  }
                })
                .catch(err => {
                  showError("Error removing video: " + err.message);
                  btn.disabled = false;
                  btn.innerText = "Remove";
                });
            });
          });
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          showError("Error loading videos: " + parseErr.message);
          contentDiv.innerHTML = "";
        }
      })
      .catch(err => {
        showError("Error loading videos: " + err.message);
        contentDiv.innerHTML = "";
      });
  }

  function loadWithdrawals() {
    setActive(btnWithdrawals);
    clearError();
    contentDiv.innerHTML = "Loading...";
    fetch(API_BASE + "/api/payments/all", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          if (!Array.isArray(list) || list.length === 0) {
            contentDiv.innerHTML = "<p>No withdrawal requests</p>";
            return;
          }
          const html = list.map(w => {
            const rawStatus = w.status || "pending";
            const statusText = String(rawStatus).toUpperCase();
            const statusColor = rawStatus === "paid" ? "#4caf50" : rawStatus === "rejected" ? "#ff6b6b" : "#ff9800";
            return `<div style="border: 1px solid #2b3b52; padding: 14px; margin: 10px 0; border-radius: 6px; background: #111826;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <strong>User:</strong> ${w.username || "Unknown"} (${w.email || "N/A"})<br>
                  <strong>Points:</strong> ${w.points_used || 0}<br>
                  <strong>Mobile:</strong> ${w.user_number || "N/A"}
                </div>
                <div style="text-align: right;">
                  <div style="margin-bottom: 8px;">
                    <strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span>
                  </div>
                  ${rawStatus !== "paid" ? `<button data-id="${w.id}" class="mark-paid-btn" style="background:#4caf50; color:#000; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Mark Paid</button>` : ""}
                </div>
              </div>
            </div>`;
          }).join("");
          contentDiv.innerHTML = html;
          document.querySelectorAll(".mark-paid-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              btn.disabled = true;
              btn.innerText = "Updating...";
              fetch(API_BASE + "/api/payments/withdrawals/" + id + "/status", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token
                },
                body: JSON.stringify({ status: "paid" })
              })
                .then(r => r.text())
                .then(text => {
                  try {
                    JSON.parse(text);
                    loadWithdrawals();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error updating withdrawal");
                    btn.disabled = false;
                    btn.innerText = "Mark Paid";
                  }
                })
                .catch(err => {
                  showError("Error updating withdrawal: " + err.message);
                  btn.disabled = false;
                  btn.innerText = "Mark Paid";
                });
            });
          });
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          showError("Error loading withdrawals: " + parseErr.message);
          contentDiv.innerHTML = "";
        }
      })
      .catch(err => {
        showError("Error loading withdrawals: " + err.message);
        contentDiv.innerHTML = "";
      });
  }

  function loadUsers() {
    setActive(btnUsers);
    clearError();
    contentDiv.innerHTML = "Loading...";
    fetch(API_BASE + "/api/subscriptions/users", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(r => r.text())
      .then(text => {
        try {
          const list = JSON.parse(text);
          if (!Array.isArray(list) || list.length === 0) {
            contentDiv.innerHTML = "<p>No users found</p>";
            return;
          }
          const html = list.map(u => {
            const role = u.role || "user";
            const isSuspended = String(u.is_suspended || "") === "1" || u.is_suspended === 1 || u.is_suspended === true;
            const suspendLabel = isSuspended ? "Unsuspend" : "Suspend";
            const suspendColor = isSuspended ? "#4caf50" : "#ff9800";
            return `<div style="border: 1px solid #2b3b52; padding: 14px; margin: 10px 0; border-radius: 6px; background: #111826;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <strong>User:</strong> ${u.username || "N/A"}<br>
                  <strong>Email:</strong> ${u.email || "N/A"}
                </div>
                <div style="text-align: right;">
                  <select data-id="${u.id}" class="role-select" style="padding:6px; background:#1b2636; color: var(--text); border:1px solid #2b3b52; border-radius:4px;">
                    <option value="user" ${role === "user" ? "selected" : ""}>user</option>
                    <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
                  </select>
                  <button data-id="${u.id}" data-suspended="${isSuspended ? "1" : "0"}" class="suspend-user-btn" style="background:${suspendColor}; color:#000; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; margin-left:8px;">${suspendLabel}</button>
                  <button data-id="${u.id}" class="delete-user-btn" style="background:#ff6b6b; color:#000; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; margin-left:8px;">Remove</button>
                </div>
              </div>
            </div>`;
          }).join("");
          contentDiv.innerHTML = html;

          document.querySelectorAll(".role-select").forEach(sel => {
            sel.addEventListener("change", () => {
              const id = sel.getAttribute("data-id");
              const role = sel.value;
              fetch(API_BASE + "/api/subscriptions/users/" + id + "/role", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token
                },
                body: JSON.stringify({ role })
              })
                .then(r => r.text())
                .then(text => {
                  try {
                    JSON.parse(text);
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error updating role");
                  }
                })
                .catch(err => {
                  showError("Error updating role: " + err.message);
                });
            });
          });

          document.querySelectorAll(".suspend-user-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              const suspended = btn.getAttribute("data-suspended") === "1";
              const nextState = !suspended;
              btn.disabled = true;
              btn.innerText = nextState ? "Suspending..." : "Unsuspending...";
              fetch(API_BASE + "/api/subscriptions/users/" + id + "/suspend", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token
                },
                body: JSON.stringify({ suspended: nextState })
              })
                .then(r => r.text().then(text => ({ ok: r.ok, text })))
                .then(({ ok, text }) => {
                  try {
                    const data = JSON.parse(text);
                    if (!ok) {
                      showError((data && data.message) || "Error updating user suspension");
                      btn.disabled = false;
                      btn.innerText = nextState ? "Suspend" : "Unsuspend";
                      return;
                    }
                    btn.setAttribute("data-suspended", nextState ? "1" : "0");
                    btn.innerText = nextState ? "Unsuspend" : "Suspend";
                    btn.style.background = nextState ? "#4caf50" : "#ff9800";
                    btn.disabled = false;
                    loadUsers();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error updating user suspension");
                    btn.disabled = false;
                    btn.innerText = nextState ? "Suspend" : "Unsuspend";
                  }
                })
                .catch(err => {
                  showError("Error updating user suspension: " + err.message);
                  btn.disabled = false;
                  btn.innerText = nextState ? "Suspend" : "Unsuspend";
                });
            });
          });

          document.querySelectorAll(".delete-user-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-id");
              btn.disabled = true;
              btn.innerText = "Removing...";
              fetch(API_BASE + "/api/subscriptions/users/" + id, {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token }
              })
                .then(r => r.text())
                .then(text => {
                  try {
                    JSON.parse(text);
                    loadUsers();
                  } catch (parseErr) {
                    console.error("Response was not JSON:", text);
                    showError("Error removing user");
                    btn.disabled = false;
                    btn.innerText = "Remove";
                  }
                })
                .catch(err => {
                  showError("Error removing user: " + err.message);
                  btn.disabled = false;
                  btn.innerText = "Remove";
                });
            });
          });
        } catch (parseErr) {
          console.error("Response was not JSON:", text);
          showError("Error loading users: " + parseErr.message);
          contentDiv.innerHTML = "";
        }
      })
      .catch(err => {
        showError("Error loading users: " + err.message);
        contentDiv.innerHTML = "";
      });
  }

  btnPayments.addEventListener("click", loadPayments);
  btnVideos.addEventListener("click", loadVideos);
  btnWithdrawals.addEventListener("click", loadWithdrawals);
  btnUsers.addEventListener("click", loadUsers);

  loadPayments();
}

function parseToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

function updateNav() {
  console.log("updateNav called");
  const user = parseToken();
  const loggedIn = !!user;
  console.log("User logged in:", loggedIn, "User:", user);
  
  // Toggle auth buttons vs user section
  const authButtons = document.querySelector(".auth-buttons");
  const userSection = document.querySelector(".user-section");
  
  if (loggedIn) {
    console.log("Hiding auth buttons, showing user section");
    authButtons.style.display = "none";
    userSection.style.display = "block";
    
    // Update user info
    document.getElementById("user-info").innerText = `Logged in as: ${user.email}`;
    
    // Show/hide menu items based on role
    document.getElementById("nav-upload").style.display = user.role !== "admin" ? "block" : "none";
    document.getElementById("nav-subscribe").style.display = user.role !== "admin" ? "block" : "none";
    document.getElementById("nav-invite").style.display = user.role !== "admin" ? "block" : "none";
    const myVideosItem = document.getElementById("nav-my-videos");
    if (myVideosItem) myVideosItem.style.display = user.role !== "admin" ? "block" : "none";
    const pointsItem = document.getElementById("nav-points");
    if (pointsItem) pointsItem.style.display = user.role !== "admin" ? "block" : "none";
    document.getElementById("nav-admin").style.display = user.role === "admin" ? "block" : "none";
  } else {
    console.log("Showing auth buttons, hiding user section");
    if (authButtons) {
      authButtons.style.display = "flex";
      console.log("Auth buttons display set to flex");
    } else {
      console.error("Auth buttons element not found!");
    }
    if (userSection) {
      userSection.style.display = "none";
      console.log("User section display set to none");
    } else {
      console.error("User section element not found!");
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  updateNav();
  handleInitialRoute();

  // Use event delegation for all navigation
  document.addEventListener("click", (e) => {
    const target = e.target;
    
    // Handle auth buttons
    if (target.id === "nav-login") {
      e.preventDefault();
      console.log("Login button clicked");
      showLogin();
    } else if (target.id === "nav-register") {
      e.preventDefault();
      console.log("Register button clicked");
      showRegister();
    }
    
    // Handle menu items
    else if (target.id === "nav-home" || target.closest("#nav-home")) {
      e.preventDefault();
      showHome();
    } else if (target.id === "nav-discovery" || target.closest("#nav-discovery")) {
      e.preventDefault();
      showDiscovery();
    }
    
    // Handle category items
    else if (target.id === "nav-drama" || target.closest("#nav-drama")) {
      e.preventDefault();
      filterByCategory("Drama");
    } else if (target.id === "nav-educative" || target.closest("#nav-educative")) {
      e.preventDefault();
      filterByCategory("Educative");
    } else if (target.id === "nav-comedies" || target.closest("#nav-comedies")) {
      e.preventDefault();
      filterByCategory("Comedies");
    } else if (target.id === "nav-dancing" || target.closest("#nav-dancing")) {
      e.preventDefault();
      filterByCategory("Dancing Videos");
    } else if (target.id === "nav-music" || target.closest("#nav-music")) {
      e.preventDefault();
      filterByCategory("Music Videos");
    } else if (target.id === "nav-faq" || target.closest("#nav-faq")) {
      e.preventDefault();
      showFAQ();
    } else if (target.id === "nav-terms" || target.closest("#nav-terms")) {
      e.preventDefault();
      showTerms();
    } else if (target.id === "nav-contact" || target.closest("#nav-contact")) {
      e.preventDefault();
      showContact();
    }

    // Handle user menu items
    else if (target.id === "nav-upload" || target.closest("#nav-upload")) {
      e.preventDefault();
      showUpload();
    } else if (target.id === "nav-subscribe" || target.closest("#nav-subscribe")) {
      e.preventDefault();
      showSubscribe();
    } else if (target.id === "nav-invite" || target.closest("#nav-invite")) {
      e.preventDefault();
      showInvite();
    } else if (target.id === "nav-my-videos" || target.closest("#nav-my-videos")) {
      e.preventDefault();
      showMyVideos();
    } else if (target.id === "nav-points" || target.closest("#nav-points")) {
      e.preventDefault();
      showPoints();
    } else if (target.id === "nav-admin" || target.closest("#nav-admin")) {
      e.preventDefault();
      showAdmin();
        } else if (target.id === "nav-logout" || target.closest("#nav-logout")) {
      e.preventDefault();
      clearToken();
      updateNav();
      showHome();
    }
  });
});

function setupEventListeners() {
  console.log("setupEventListeners called");
  
  // Auth buttons
  const loginBtn = document.getElementById("nav-login");
  const registerBtn = document.getElementById("nav-register");
  
  console.log("Login button element:", loginBtn);
  console.log("Register button element:", registerBtn);
  
  if (loginBtn) {
    console.log("Adding click listener to login button");
    loginBtn.addEventListener("click", e => { 
      console.log("Login button clicked via event listener");
      e.preventDefault(); 
      showLogin(); 
    });
  } else {
    console.error("Login button not found!");
  }
  
  if (registerBtn) {
    console.log("Adding click listener to register button");
    registerBtn.addEventListener("click", e => { 
      console.log("Register button clicked via event listener");
      e.preventDefault(); 
      showRegister(); 
    });
  } else {
    console.error("Register button not found!");
  }
  
  // User menu items
  const uploadItem = document.getElementById("nav-upload");
  if (uploadItem) {
    uploadItem.addEventListener("click", e => { 
      e.preventDefault(); 
      showUpload(); 
    });
  }
  
  const subscribeItem = document.getElementById("nav-subscribe");
  if (subscribeItem) {
    subscribeItem.addEventListener("click", e => { 
      e.preventDefault(); 
      showSubscribe(); 
    });
  }
  
  const adminItem = document.getElementById("nav-admin");
  if (adminItem) {
    adminItem.addEventListener("click", e => { 
      e.preventDefault(); 
      showAdmin(); 
    });
  }
  
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
        logoutBtn.addEventListener("click", e => { 
      e.preventDefault(); 
      clearToken(); 
      updateNav();
      showHome();
    });
  }
}

// Make functions global for onclick handlers
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showHome = showHome;
window.showDiscovery = showDiscovery;
window.showFAQ = showFAQ;
window.showTerms = showTerms;
window.filterByCategory = filterByCategory;
window.showUpload = showUpload;
window.showSubscribe = showSubscribe;
window.showInvite = showInvite;
window.showMyVideos = showMyVideos;
window.showPoints = showPoints;
window.showAdmin = showAdmin;
window.clearToken = clearToken;
window.updateNav = updateNav;

