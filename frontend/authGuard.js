// tiny auth guard used on protected pages
(function checkAuth() {
	const token = localStorage.getItem('token');
	if (!token) {
		// quick redirect back to login if not signed in
		window.location.replace('./login.html');
	}
})();

// logout helper for pages
window.logoutUser = function () {
	localStorage.removeItem('token');
	localStorage.removeItem('userEmail');
	// give a very brief visual cue before redirecting
	setTimeout(() => window.location.replace('./login.html'), 50);
};

