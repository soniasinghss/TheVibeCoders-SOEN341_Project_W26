const form = document.getElementById("registerForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pw) {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

function validateEmail() {
  const email = emailInput.value.trim();

  if (email === "") {
    emailError.textContent = "Email is required.";
    return false;
  }

  if (!isValidEmail(email)) {
    emailError.textContent = "Invalid email format.";
    return false;
  }

  emailError.textContent = "";
  return true;
}

function validatePassword() {
  const pw = passwordInput.value;

  if (pw === "") {
    passwordError.textContent = "Password is required.";
    return false;
  }
  if (!isValidPassword(pw)) {
    passwordError.textContent =
      "Password must be 8+ chars and include a letter + a number.";
    return false;
  }

  passwordError.textContent = "";
  return true;
}

form.addEventListener("submit", (e) => {
  const okEmail = validateEmail();
  const okPw = validatePassword();

  if (!okEmail || !okPw) {
    e.preventDefault();
  }
}
);
emailInput.addEventListener("input", validateEmail);
passwordInput.addEventListener("input", validatePassword);
