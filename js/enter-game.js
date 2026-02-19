// ===== Enter Game Results View =====

const EnterGame = {
  selectedPlayers: new Set(),
  editingGameId: null,

  async load() {
    const container = document.getElementById('view-enter-game');
    this.selectedPlayers = new Set();
    this.editingGameId = null;

    const players = await App.getPlayers();
    const activePlayers = players.filter(p => p.active);

    let html = `
      <div class="section-title">Enter Game Results</div>
      <div class="form-group">
        <label>Game Date</label>
        <input type="date" id="game-date" value="${App.todayStr()}">
      </div>
      <div class="form-group">
        <label>Select Attending Players</label>
        <div class="checkbox-grid" id="player-checkboxes">
          ${activePlayers.map(p => `
            <label class="checkbox-item" data-id="${p.id}">
              <input type="checkbox" value="${p.id}">
              <span>${this.escHtml(p.name)}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div id="podium-section" style="display:none">
        <div class="form-group">
          <label>Podium Positions</label>
          <div class="podium-row">
            <div>
              <label style="font-size:0.7rem;color:var(--gold)">1st Place</label>
              <select id="pos-1"><option value="">—</option></select>
            </div>
            <div>
              <label style="font-size:0.7rem;color:var(--silver)">2nd Place</label>
              <select id="pos-2"><option value="">—</option></select>
            </div>
            <div>
              <label style="font-size:0.7rem;color:var(--bronze)">3rd Place</label>
              <select id="pos-3"><option value="">—</option></select>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Bubble Player</label>
          <select id="bubble-player"><option value="">None</option></select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="game-notes" rows="2" placeholder="e.g. Big hand: AA vs KK"></textarea>
        </div>
        <div id="points-preview" class="card mb-16" style="display:none"></div>
        <button class="btn btn-primary" id="submit-game">Save Game Results</button>
      </div>`;

    container.innerHTML = html;
    this.setupListeners();
  },

  setupListeners() {
    // Checkbox toggling
    document.querySelectorAll('#player-checkboxes .checkbox-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return; // let checkbox handle itself
        const cb = item.querySelector('input');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });

      item.querySelector('input').addEventListener('change', (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          this.selectedPlayers.add(id);
          item.classList.add('selected');
        } else {
          this.selectedPlayers.delete(id);
          item.classList.remove('selected');
        }
        this.updatePodiumSection();
      });
    });

    // Podium/bubble change → preview
    ['pos-1', 'pos-2', 'pos-3', 'bubble-player'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.updatePreview());
    });

    // Submit
    document.getElementById('submit-game').addEventListener('click', () => this.submitGame());
  },

  updatePodiumSection() {
    const section = document.getElementById('podium-section');
    if (this.selectedPlayers.size < 3) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    const players = App.playersCache.filter(p => this.selectedPlayers.has(p.id));
    const options = players.map(p => `<option value="${p.id}">${this.escHtml(p.name)}</option>`).join('');

    ['pos-1', 'pos-2', 'pos-3', 'bubble-player'].forEach(id => {
      const sel = document.getElementById(id);
      const current = sel.value;
      sel.innerHTML = `<option value="">—</option>${options}`;
      sel.value = current; // restore selection if still valid
    });

    this.updatePreview();
  },

  updatePreview() {
    const preview = document.getElementById('points-preview');
    if (this.selectedPlayers.size < 3) {
      preview.style.display = 'none';
      return;
    }

    const pos1 = document.getElementById('pos-1').value;
    const pos2 = document.getElementById('pos-2').value;
    const pos3 = document.getElementById('pos-3').value;
    const bubble = document.getElementById('bubble-player').value;
    const playerMap = {};
    App.playersCache.forEach(p => { playerMap[p.id] = p.name; });

    let html = '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Points Preview</div>';
    let rows = [];

    this.selectedPlayers.forEach(id => {
      let pts = 1;
      let label = '';
      let cls = '';
      if (id === pos1) { pts = 10; label = '1st'; cls = 'text-gold'; }
      else if (id === pos2) { pts = 5; label = '2nd'; cls = 'text-silver'; }
      else if (id === pos3) { pts = 3; label = '3rd'; cls = 'text-bronze'; }

      const isBubble = id === bubble;
      rows.push({ name: playerMap[id] || '?', pts, label, cls, isBubble });
    });

    rows.sort((a, b) => b.pts - a.pts);
    rows.forEach(r => {
      html += `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.85rem">
        <span class="${r.cls}">${this.escHtml(r.name)} ${r.label ? `(${r.label})` : ''} ${r.isBubble ? '<span class="text-red">🫧</span>' : ''}</span>
        <span style="font-weight:700">${r.pts} pts</span>
      </div>`;
    });

    preview.innerHTML = html;
    preview.style.display = 'block';
  },

  async submitGame() {
    if (this.selectedPlayers.size < 3) {
      App.toast('Need at least 3 players', 'error');
      return;
    }

    const pos1 = document.getElementById('pos-1').value;
    const pos2 = document.getElementById('pos-2').value;
    const pos3 = document.getElementById('pos-3').value;

    if (!pos1 || !pos2 || !pos3) {
      App.toast('Please assign all podium positions', 'error');
      return;
    }

    // Check for duplicate podium selections
    if (new Set([pos1, pos2, pos3]).size < 3) {
      App.toast('Each podium position must be a different player', 'error');
      return;
    }

    const gameDate = document.getElementById('game-date').value;
    const notes = document.getElementById('game-notes').value.trim();
    const bubble = document.getElementById('bubble-player').value;

    App.showLoading();

    // Create game
    const { data: game, error: gameErr } = await db
      .from('games')
      .insert({ game_date: gameDate, notes: notes || null })
      .select()
      .single();

    if (gameErr) {
      App.hideLoading();
      App.toast('Failed to create game: ' + gameErr.message, 'error');
      return;
    }

    // Build results
    const resultRows = [];
    this.selectedPlayers.forEach(id => {
      let position = null;
      let points = 1;
      if (id === pos1) { position = 1; points = 10; }
      else if (id === pos2) { position = 2; points = 5; }
      else if (id === pos3) { position = 3; points = 3; }

      resultRows.push({
        game_id: game.id,
        player_id: id,
        position,
        is_bubble: id === bubble,
        points
      });
    });

    const { error: resErr } = await db
      .from('results')
      .insert(resultRows);

    App.hideLoading();

    if (resErr) {
      App.toast('Failed to save results: ' + resErr.message, 'error');
      // Clean up the game
      await db.from('games').delete().eq('id', game.id);
      return;
    }

    App.toast('Game saved!');
    App.clearPlayersCache();
    this.load(); // Reset form
  },

  // Load form pre-filled for editing
  async loadForEdit(gameId) {
    App.switchTab('enter-game');
    const container = document.getElementById('view-enter-game');
    container.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    const [gameRes, resultsRes] = await Promise.all([
      db.from('games').select('*').eq('id', gameId).single(),
      db.from('results').select('*').eq('game_id', gameId)
    ]);

    if (gameRes.error || resultsRes.error) {
      App.toast('Failed to load game for editing', 'error');
      this.load();
      return;
    }

    const game = gameRes.data;
    const results = resultsRes.data;

    await this.load();
    this.editingGameId = gameId;

    // Set date
    document.getElementById('game-date').value = game.game_date;

    // Select players
    results.forEach(r => {
      const cb = document.querySelector(`#player-checkboxes input[value="${r.player_id}"]`);
      if (cb) {
        cb.checked = true;
        cb.closest('.checkbox-item').classList.add('selected');
        this.selectedPlayers.add(r.player_id);
      }
    });

    this.updatePodiumSection();

    // Set podium & bubble
    results.forEach(r => {
      if (r.position === 1) document.getElementById('pos-1').value = r.player_id;
      if (r.position === 2) document.getElementById('pos-2').value = r.player_id;
      if (r.position === 3) document.getElementById('pos-3').value = r.player_id;
      if (r.is_bubble) document.getElementById('bubble-player').value = r.player_id;
    });

    if (game.notes) document.getElementById('game-notes').value = game.notes;

    this.updatePreview();

    // Change submit button to update
    const btn = document.getElementById('submit-game');
    btn.textContent = 'Update Game Results';
    btn.removeEventListener('click', this._submitHandler);
    this._submitHandler = () => this.updateGame(gameId);
    btn.addEventListener('click', this._submitHandler);

    // Update section title
    container.querySelector('.section-title').textContent = 'Edit Game Results';
  },

  async updateGame(gameId) {
    if (this.selectedPlayers.size < 3) {
      App.toast('Need at least 3 players', 'error');
      return;
    }

    const pos1 = document.getElementById('pos-1').value;
    const pos2 = document.getElementById('pos-2').value;
    const pos3 = document.getElementById('pos-3').value;

    if (!pos1 || !pos2 || !pos3) {
      App.toast('Please assign all podium positions', 'error');
      return;
    }

    if (new Set([pos1, pos2, pos3]).size < 3) {
      App.toast('Each podium position must be a different player', 'error');
      return;
    }

    const gameDate = document.getElementById('game-date').value;
    const notes = document.getElementById('game-notes').value.trim();
    const bubble = document.getElementById('bubble-player').value;

    App.showLoading();

    // Update game
    const { error: gameErr } = await db
      .from('games')
      .update({ game_date: gameDate, notes: notes || null })
      .eq('id', gameId);

    if (gameErr) {
      App.hideLoading();
      App.toast('Failed to update game', 'error');
      return;
    }

    // Delete old results, insert new
    await db.from('results').delete().eq('game_id', gameId);

    const resultRows = [];
    this.selectedPlayers.forEach(id => {
      let position = null;
      let points = 1;
      if (id === pos1) { position = 1; points = 10; }
      else if (id === pos2) { position = 2; points = 5; }
      else if (id === pos3) { position = 3; points = 3; }

      resultRows.push({
        game_id: gameId,
        player_id: id,
        position,
        is_bubble: id === bubble,
        points
      });
    });

    const { error: resErr } = await db.from('results').insert(resultRows);

    App.hideLoading();

    if (resErr) {
      App.toast('Failed to update results', 'error');
      return;
    }

    App.toast('Game updated!');
    App.clearPlayersCache();
    App.switchTab('history');
  },

  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
