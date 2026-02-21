const loadingEl = document.getElementById('loading');
const profileEl = document.getElementById('profile');
const errorEl = document.getElementById('error');
let currentUser = null;

function showError(msg) {
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.textContent = msg || 'Unable to load profile';
  }
  if (loadingEl) loadingEl.style.display = 'none';
  if (profileEl) profileEl.style.display = 'none';
}

function showNotification(message, type = 'success', duration = 3500) {
  const notificationEl = document.getElementById('notification');
  if (!notificationEl) return;

  notificationEl.textContent = message;
  notificationEl.className = `notification ${type}`;
  notificationEl.style.display = 'block';

  setTimeout(() => {
    notificationEl.style.display = 'none';
  }, duration);
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
      currentUser = user;
      if (document.getElementById('name')) document.getElementById('name').textContent = user.name || 'Not provided';
      if (document.getElementById('email')) document.getElementById('email').textContent = user.email || 'Not provided';
      if (document.getElementById('dietPreferencesDisplay')) document.getElementById('dietPreferencesDisplay').textContent = user.dietPreferences || 'Not provided';
      renderAllergyTags(user.allergies);
      if (loadingEl) loadingEl.style.display = 'none';
      if (profileEl) profileEl.style.display = 'block';
      if (errorEl) errorEl.style.display = 'none';
      setupEditMode();
      setupAllergiesEditMode();
    })
    .catch(err => {
      console.error('Profile error:', err);
      showError(err.message || 'Network or server error');
    });
}

// Edit mode functionality
function setupEditMode() {
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const dietDisplayEl = document.getElementById('dietPreferencesDisplay');
  const dietEditEl = document.getElementById('dietPreferencesEdit');
  const checkboxes = document.querySelectorAll('input[name="diet"]');

  // Initialize checkboxes based on current preferences
  if (currentUser.dietPreferences) {
    const prefs = currentUser.dietPreferences.split(',').map(p => p.trim());
    checkboxes.forEach(checkbox => {
      checkbox.checked = prefs.includes(checkbox.value);
    });
  }

  editBtn.addEventListener('click', () => {
    dietDisplayEl.style.display = 'none';
    dietEditEl.style.display = 'block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
  });

  cancelBtn.addEventListener('click', () => {
    dietDisplayEl.style.display = 'block';
    dietEditEl.style.display = 'none';
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    
    // Reset checkboxes
    if (currentUser.dietPreferences) {
      const prefs = currentUser.dietPreferences.split(',').map(p => p.trim());
      checkboxes.forEach(checkbox => {
        checkbox.checked = prefs.includes(checkbox.value);
      });
    } else {
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    }
  });

  saveBtn.addEventListener('click', async () => {
    const selectedPrefs = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value)
      .join(', ');

    try {
      const res = await fetch('http://localhost:4000/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dietPreferences: selectedPrefs })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update preferences');

      currentUser.dietPreferences = selectedPrefs;
      dietDisplayEl.textContent = selectedPrefs || 'Not provided';
      dietDisplayEl.style.display = 'block';
      dietEditEl.style.display = 'none';
      editBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      showNotification('Diet preferences updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating preferences:', err);
      showNotification('Failed to update diet preferences: ' + err.message, 'error');
    }
  });
}

// Parse and display allergy tags
function renderAllergyTags(allergiesString) {
  const allergyTagsEl = document.getElementById('allergyTags');
  if (!allergyTagsEl) return;

  if (!allergiesString || allergiesString.trim() === '') {
    allergyTagsEl.innerHTML = '—';
    return;
  }

  const allergies = allergiesString.split(',').map(a => a.trim()).filter(a => a);
  allergyTagsEl.innerHTML = allergies.map(allergy => 
    `<span class="allergy-tag">${allergy}</span>`
  ).join('');
}

// Parse and display editable allergy tags
function renderEditableAllergyTags(allergiesString) {
  const allergyTagsEditEl = document.getElementById('allergyTagsEdit');
  if (!allergyTagsEditEl) return;

  const allergies = allergiesString ? 
    allergiesString.split(',').map(a => a.trim()).filter(a => a) : 
    [];

  allergyTagsEditEl.innerHTML = allergies.map(allergy => 
    `<span class="allergy-tag-edit">
      ${allergy}
      <button class="remove-allergyBtn" type="button" data-allergy="${allergy}">×</button>
    </span>`
  ).join('');

  // Add remove handlers
  document.querySelectorAll('.remove-allergyBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.remove();
    });
  });
}

// Setup allergies edit mode functionality
function setupAllergiesEditMode() {
  const editAllergiesBtn = document.getElementById('editAllergiesBtn');
  const saveAllergiesBtn = document.getElementById('saveAllergiesBtn');
  const cancelAllergiesBtn = document.getElementById('cancelAllergiesBtn');
  const allergiesDisplayEl = document.getElementById('allergiesDisplay');
  const allergiesEditEl = document.getElementById('allergiesEdit');
  const allergyInput = document.getElementById('allergyInput');
  const addAllergyBtn = document.getElementById('addAllergyBtn');

  editAllergiesBtn.addEventListener('click', () => {
    allergiesDisplayEl.style.display = 'none';
    allergiesEditEl.style.display = 'block';
    editAllergiesBtn.style.display = 'none';
    saveAllergiesBtn.style.display = 'inline-block';
    cancelAllergiesBtn.style.display = 'inline-block';
    
    renderEditableAllergyTags(currentUser.allergies);
    allergyInput.value = '';
    allergyInput.focus();
  });

  cancelAllergiesBtn.addEventListener('click', () => {
    allergiesDisplayEl.style.display = 'block';
    allergiesEditEl.style.display = 'none';
    editAllergiesBtn.style.display = 'inline-block';
    saveAllergiesBtn.style.display = 'none';
    cancelAllergiesBtn.style.display = 'none';
  });

  // Add allergy when button is clicked
  addAllergyBtn.addEventListener('click', () => {
    const allergyValue = allergyInput.value.trim();
    const allergyErrorEl = document.getElementById('allergyError');
    
    // Clear previous error
    allergyErrorEl.style.display = 'none';
    allergyErrorEl.textContent = '';
    
    if (!allergyValue) {
      allergyErrorEl.textContent = 'Please enter an allergy';
      allergyErrorEl.style.display = 'block';
      return;
    }
    
    // Check for duplicates (case-insensitive)
    const allergyTagsEditEl = document.getElementById('allergyTagsEdit');
    const existingTags = Array.from(allergyTagsEditEl.querySelectorAll('.allergy-tag-edit'))
      .map(tag => tag.textContent.replace('×', '').trim().toLowerCase());
    
    if (existingTags.includes(allergyValue.toLowerCase())) {
      allergyErrorEl.textContent = `"${allergyValue}" is already added`;
      allergyErrorEl.style.display = 'block';
      return;
    }
    
    const newTag = document.createElement('span');
    newTag.className = 'allergy-tag-edit';
    newTag.innerHTML = `
      ${allergyValue}
      <button class="remove-allergyBtn" type="button" data-allergy="${allergyValue}">×</button>
    `;
    allergyTagsEditEl.appendChild(newTag);
    
    newTag.querySelector('.remove-allergyBtn').addEventListener('click', () => {
      newTag.remove();
    });
    
    allergyInput.value = '';
    allergyInput.focus();
  });

  // Add allergy when Enter key is pressed
  allergyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAllergyBtn.click();
    }
  });

  saveAllergiesBtn.addEventListener('click', async () => {
    const allergyTagsEditEl = document.getElementById('allergyTagsEdit');
    const allergyTags = Array.from(allergyTagsEditEl.querySelectorAll('.allergy-tag-edit'))
      .map(tag => tag.textContent.replace('×', '').trim());
    const allergiesString = allergyTags.join(', ');

    try {
      const res = await fetch('http://localhost:4000/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ allergies: allergiesString })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update allergies');

      currentUser.allergies = allergiesString;
      renderAllergyTags(allergiesString);
      allergiesDisplayEl.style.display = 'block';
      allergiesEditEl.style.display = 'none';
      editAllergiesBtn.style.display = 'inline-block';
      saveAllergiesBtn.style.display = 'none';
      cancelAllergiesBtn.style.display = 'none';
      showNotification('Allergies updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating allergies:', err);
      showNotification('Failed to update allergies: ' + err.message, 'error');
    }
  });
}
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    // Clear auth data
    localStorage.removeItem("token");

    // Redirect to login page
    window.location.href = "./login.html";
  });
}
