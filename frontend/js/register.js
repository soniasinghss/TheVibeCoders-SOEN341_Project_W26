const form = document.getElementById('registerForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');

const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const msg = document.getElementById('msg');

const API_URL = 'https://thevibecoders-soen341-project-w26.onrender.com/auth/register';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function clearErrors() {
  emailError.textContent = '';
  passwordError.textContent = '';
  msg.textContent = '';
  msg.className = '';
}

function showError(target, text) {
  target.textContent = text;
}

function showSuccess(text) {
  msg.textContent = text;
  msg.className = 'success';
}

function validateInputs(firstName, lastName, email, password) {
  let ok = true;

  if (!firstName) {
    showError(msg, 'First name is required');
    ok = false;
  }

  if (!lastName) {
    showError(msg, 'Last name is required');
    ok = false;
  }

  if (!email) {
    showError(emailError, 'Email is required');
    ok = false;
  } else if (!isValidEmail(email)) {
    showError(emailError, 'Invalid email format');
    ok = false;
  }

  if (!password) {
    showError(passwordError, 'Password is required');
    ok = false;
  } else if (!isValidPassword(password)) {
    showError(passwordError, 'Password must be 8+ chars and include a letter + number');
    ok = false;
  }

  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!validateInputs(firstName, lastName, email, password)) return;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({firstName, lastName, email, password}),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(msg, data.error || 'Registration failed.');
      msg.className = 'error';
      return;
    }

    showSuccess('Account created successfully ✅ Redirecting to login...');
    form.reset();
    emailError.textContent = '';
    passwordError.textContent = '';

    setTimeout(() => {
      try {
        window.location.href = 'login.html';
      } catch {
        msg.className = 'success';
        msg.innerHTML = `Account created ✅ <a href="login.html">Click here to log in</a>`;
      }
    }, 1200);
  } catch (err) {
    msg.textContent = 'Could not reach server. Is the backend running?';
    msg.className = 'error';
  }
});
