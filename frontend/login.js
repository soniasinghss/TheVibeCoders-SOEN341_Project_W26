const form = document.getElementById('loginForm');
const errBox = document.getElementById('error');

function showError(msg) {
  errBox.textContent = msg;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showError('');

  const email = document.getElementById('email').value.trim();
  const pwd = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pwd }),
    });

    const payload = await response.json();
    if (!response.ok) {
      showError(payload?.error || 'Could not sign you in');
      return;
    }

    if (!payload.token) {
      showError('Unexpected server response');
      return;
    }

    // persist token and a small piece of user info
    localStorage.setItem('token', payload.token);
    if (payload.user && payload.user.email) {
      localStorage.setItem('userEmail', payload.user.email);
    }

    // go to protected area
    window.location.href = './protected.html';
  } catch (err) {
    console.error('Login error', err);
    showError('Network or server error');
  }
});
