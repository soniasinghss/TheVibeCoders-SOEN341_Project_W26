const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/login.html';
}

fetch('http://localhost:4000/users/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error();
    return res.json();
  })
  .then(user => {
    document.getElementById('name').textContent = user.name;
    document.getElementById('email').textContent = user.email;
    document.getElementById('dietPreferences').textContent = user.dietPreferences || 'N/A';
    document.getElementById('allergies').textContent = user.allergies || 'N/A';

    document.getElementById('loading').hidden = true;
    document.getElementById('profile').hidden = false;
  })
  .catch(() => {
    document.getElementById('loading').hidden = true;
    document.getElementById('error').hidden = false;
  });
