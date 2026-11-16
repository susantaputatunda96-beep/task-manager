// If already logged in, go straight to the tasks page
if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}

let mode = 'login'; // or 'signup'

const heading = document.getElementById('heading');
const submitBtn = document.getElementById('submit');
const switchBtn = document.getElementById('switch');
const switchText = document.getElementById('switch-text');
const errorEl = document.getElementById('error');

switchBtn.addEventListener('click', () => {
  mode = mode === 'login' ? 'signup' : 'login';
  const isLogin = mode === 'login';
  heading.textContent = isLogin ? 'Log in' : 'Create account';
  submitBtn.textContent = isLogin ? 'Log in' : 'Sign up';
  switchText.textContent = isLogin ? 'New here?' : 'Already have an account?';
  switchBtn.textContent = isLogin ? 'Create an account' : 'Log in';
  errorEl.textContent = '';
});

submitBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  errorEl.textContent = '';

  try {
    const res = await fetch(`/api/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;
      return;
    }

    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  } catch (err) {
    errorEl.textContent = 'Could not reach the server. Try again.';
  }
});
