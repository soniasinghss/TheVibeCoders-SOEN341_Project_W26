const loadingEl = document.getElementById('loading');
const profileEl = document.getElementById('profile');
const errorEl = document.getElementById('error');

function showError(msg) {
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.textContent = msg || 'Unable to load profile';
  }
  if (loadingEl) loadingEl.style.display = 'none';
  if (profileEl) profileEl.style.display = 'none';
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

const token = localStorage.getItem('token');
if (!token) {
  showError('Not authenticated. Redirecting to login...');
  setTimeout(() => window.location.href = './login.html', 800);
} else {
  const decoded = decodeJwt(token);
  console.log('token:', token);
  console.log('decoded token payload:', decoded);

  fetch('http://localhost:4000/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(async res => {
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      console.log('/users/me response', res.status, data);
      if (!res.ok) throw new Error(data?.error || data || `Status ${res.status}`);
      return data;
    })
    .then(user => {
      if (document.getElementById('name')) document.getElementById('name').textContent = user.name || 'Not provided';
      if (document.getElementById('email')) document.getElementById('email').textContent = user.email || 'Not provided';
      if (document.getElementById('dietPreferences')) document.getElementById('dietPreferences').textContent = user.dietPreferences || 'Not provided';
      if (document.getElementById('allergies')) document.getElementById('allergies').textContent = user.allergies || 'Not provided';
      if (loadingEl) loadingEl.style.display = 'none';
      if (profileEl) profileEl.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';
    })
    .catch(err => {
      console.error('Profile error:', err);
      showError(err.message || 'Network or server error');
    });
}
// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    // Clear auth data
    localStorage.removeItem("token");

    // Redirect to login page
    window.location.href = "./login.html";
  });
}
