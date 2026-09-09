(() => {
  const $ = id => document.getElementById(id);

  const api = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  async function checkExistingSession() {
    try {
      await api('/api/admin/me');
      location.replace('/admin/dashboard');
    } catch {}
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginMessage').textContent = '';

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('loginEmail').value,
          password: $('loginPassword').value
        })
      });
      location.replace('/admin/dashboard');
    } catch (error) {
      $('loginMessage').textContent = error.message;
    }
  });

  checkExistingSession();
})();
