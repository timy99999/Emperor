(function () {
  'use strict';

  var IDEA_TITLES = [
    'Дискотека после файналов',
    'Музыка на большой перемене',
    'Игра «Бегущий мудрец»',
    'Турниры и квизы',
    'Pajama Day',
    'Номинации семестра',
    'Новый год',
    '«Королевский бал»',
    'Маскот колледжа',
    'Соревнование между группами',
    'Онлайн-платформа TSI',
  ];

  var STATUS_LABEL = { pending: 'На модерации', approved: 'Одобрено', rejected: 'Отклонено' };

  var loginScreen = document.getElementById('login-screen');
  var dashboard = document.getElementById('dashboard');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var suggestionsList = document.getElementById('suggestions-list');
  var likesTable = document.getElementById('likes-table');
  var logoutBtn = document.getElementById('logout-btn');

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    opts.credentials = 'include';
    return fetch((window.API_BASE || '') + '/api' + path, opts).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return {}; }).then(function (body) {
        throw Object.assign(new Error(body.error || 'request_failed'), { status: res.status });
      });
      return res.status === 204 ? null : res.json();
    });
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadSuggestions();
    loadLikes();
  }

  function showLogin() {
    loginScreen.style.display = 'block';
    dashboard.style.display = 'none';
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString('ru-RU');
    } catch (e) {
      return '';
    }
  }

  function renderSuggestions(rows) {
    suggestionsList.innerHTML = '';
    if (!rows.length) {
      suggestionsList.innerHTML = '<p class="empty">Пока ничего не прислали.</p>';
      return;
    }
    rows.forEach(function (row) {
      var card = document.createElement('div');
      card.className = 'card';

      var meta = document.createElement('div');
      meta.className = 'meta';

      var status = document.createElement('span');
      status.className = 'status ' + row.status;
      status.textContent = STATUS_LABEL[row.status] || row.status;

      var time = document.createElement('span');
      time.className = 'time';
      time.textContent = formatTime(row.created_at);

      meta.appendChild(status);
      meta.appendChild(time);

      var text = document.createElement('p');
      text.className = 'text';
      text.textContent = row.text; // textContent only — never innerHTML, avoids XSS from submitted text.

      var actions = document.createElement('div');
      actions.className = 'actions';

      if (row.status !== 'approved') {
        actions.appendChild(makeButton('Одобрить', 'btn-primary', function () {
          setStatus(row.id, 'approved');
        }));
      }
      if (row.status !== 'rejected') {
        actions.appendChild(makeButton('Отклонить', 'btn-ghost', function () {
          setStatus(row.id, 'rejected');
        }));
      }
      actions.appendChild(makeButton('Удалить', 'btn-danger', function () {
        if (confirm('Удалить это предложение безвозвратно?')) removeSuggestion(row.id);
      }));

      card.appendChild(meta);
      card.appendChild(text);
      card.appendChild(actions);
      suggestionsList.appendChild(card);
    });
  }

  function makeButton(label, cls, onClick) {
    var btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function loadSuggestions() {
    api('/suggestions').then(renderSuggestions).catch(function (err) {
      if (err.status === 401) showLogin();
    });
  }

  function setStatus(id, status) {
    api('/suggestions/' + id, { method: 'PATCH', body: JSON.stringify({ status: status }) })
      .then(loadSuggestions)
      .catch(function (err) { if (err.status === 401) showLogin(); });
  }

  function removeSuggestion(id) {
    api('/suggestions/' + id, { method: 'DELETE' })
      .then(loadSuggestions)
      .catch(function (err) { if (err.status === 401) showLogin(); });
  }

  function loadLikes() {
    api('/likes').then(function (data) {
      var counts = data.counts || [];
      var rows = IDEA_TITLES.map(function (title, i) {
        return { title: title, count: counts[i] || 0 };
      }).sort(function (a, b) { return b.count - a.count; });

      likesTable.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        var tdTitle = document.createElement('td');
        tdTitle.textContent = r.title;
        var tdCount = document.createElement('td');
        tdCount.className = 'count';
        tdCount.style.textAlign = 'right';
        tdCount.textContent = r.count;
        tr.appendChild(tdTitle);
        tr.appendChild(tdCount);
        likesTable.appendChild(tr);
      });
    }).catch(function (err) {
      if (err.status === 401) showLogin();
    });
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.textContent = '';
    var password = document.getElementById('password').value;
    api('/admin/login', { method: 'POST', body: JSON.stringify({ password: password }) })
      .then(function () {
        document.getElementById('password').value = '';
        showDashboard();
      })
      .catch(function () {
        loginError.textContent = 'Неверный пароль.';
      });
  });

  logoutBtn.addEventListener('click', function () {
    api('/admin/logout', { method: 'POST' }).then(showLogin).catch(showLogin);
  });

  // On load, check whether we already have a valid admin session cookie.
  api('/admin/session').then(showDashboard).catch(showLogin);
})();
