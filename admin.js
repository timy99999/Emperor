(function () {
  'use strict';

  var STATUS_LABEL = { pending: 'На модерации', approved: 'Одобрено', rejected: 'Отклонено' };

  var loginScreen = document.getElementById('login-screen');
  var dashboard = document.getElementById('dashboard');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var suggestionsList = document.getElementById('suggestions-list');
  var ideasList = document.getElementById('ideas-list');
  var ideaNewTitle = document.getElementById('idea-new-title');
  var ideaNewText = document.getElementById('idea-new-text');
  var ideaAddError = document.getElementById('idea-add-error');
  var ideaAddBtn = document.getElementById('idea-add-btn');
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
    loadIdeas();
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

  function renderIdeas(ideas, likeCounts) {
    ideasList.innerHTML = '';
    if (!ideas.length) {
      ideasList.innerHTML = '<p class="empty">Идей пока нет — добавьте первую выше.</p>';
      return;
    }
    ideas.forEach(function (idea) {
      var card = document.createElement('div');
      card.className = 'card';

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'idea-title';
      titleInput.value = idea.title;

      var textArea = document.createElement('textarea');
      textArea.className = 'idea-text';
      textArea.value = idea.text;

      var meta = document.createElement('div');
      meta.className = 'meta';
      var likes = document.createElement('span');
      likes.className = 'idea-likes';
      likes.textContent = 'Лайков: ' + (likeCounts[idea.id] || 0);
      meta.appendChild(likes);

      var error = document.createElement('div');
      error.className = 'error';

      var actions = document.createElement('div');
      actions.className = 'actions';
      actions.appendChild(makeButton('Сохранить', 'btn-primary', function () {
        var title = titleInput.value.trim();
        var text = textArea.value.trim();
        error.textContent = '';
        if (!title || !text) {
          error.textContent = 'Название и текст не должны быть пустыми.';
          return;
        }
        api('/ideas/' + idea.id, { method: 'PATCH', body: JSON.stringify({ title: title, text: text }) })
          .then(loadIdeas)
          .catch(function (err) {
            if (err.status === 401) return showLogin();
            error.textContent = 'Не получилось сохранить.';
          });
      }));
      actions.appendChild(makeButton('Удалить', 'btn-danger', function () {
        if (confirm('Удалить идею «' + idea.title + '» безвозвратно?')) {
          api('/ideas/' + idea.id, { method: 'DELETE' })
            .then(loadIdeas)
            .catch(function (err) { if (err.status === 401) showLogin(); });
        }
      }));

      card.appendChild(titleInput);
      card.appendChild(textArea);
      card.appendChild(meta);
      card.appendChild(error);
      card.appendChild(actions);
      ideasList.appendChild(card);
    });
  }

  function loadIdeas() {
    Promise.all([api('/ideas'), api('/likes')])
      .then(function (results) {
        var ideas = results[0] || [];
        var likeCounts = (results[1] && results[1].counts) || {};
        renderIdeas(ideas, likeCounts);
      })
      .catch(function (err) { if (err.status === 401) showLogin(); });
  }

  ideaAddBtn.addEventListener('click', function () {
    var title = ideaNewTitle.value.trim();
    var text = ideaNewText.value.trim();
    ideaAddError.textContent = '';
    if (!title || !text) {
      ideaAddError.textContent = 'Заполните название и описание.';
      return;
    }
    api('/ideas', { method: 'POST', body: JSON.stringify({ title: title, text: text }) })
      .then(function () {
        ideaNewTitle.value = '';
        ideaNewText.value = '';
        loadIdeas();
      })
      .catch(function (err) {
        if (err.status === 401) return showLogin();
        ideaAddError.textContent = 'Не получилось добавить идею.';
      });
  });

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
