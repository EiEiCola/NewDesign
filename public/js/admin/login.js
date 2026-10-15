(function () {
    const form = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    const button = document.getElementById('login-btn');
    const password = document.getElementById('password');

    /** Only allow redirects inside this site (prevents ?next=https://evil.com). */
    function nextUrl(user) {
        const next = new URLSearchParams(location.search).get('next');
        if (next && next.startsWith('/') && !next.startsWith('//')) return next;
        return user.canPost ? '/admin/index.html' : '/index.html';
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    // Already logged in → skip the form
    API.get('/api/auth/me').then(({ user }) => location.replace(nextUrl(user))).catch(() => {});

    document.getElementById('toggle-password').addEventListener('click', (e) => {
        const show = password.type === 'password';
        password.type = show ? 'text' : 'password';
        e.currentTarget.querySelector('i').className = `fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'} text-xs`;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.classList.add('hidden');

        const username = form.username.value.trim();
        if (!username || !password.value) return showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

        await withBusy(button, async () => {
            try {
                const { user } = await API.post('/api/auth/login', { username, password: password.value });
                location.replace(nextUrl(user));
            } catch (err) {
                showError(err.message);
                password.value = '';
                password.focus();
            }
        });
    });
})();
