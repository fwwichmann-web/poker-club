// ===== Players View =====

const Players = {
  async load() {
    const container = document.getElementById('view-players');
    container.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    const players = await App.getPlayers(true);

    let html = `
      <div class="section-title">Players</div>
      <div class="card mb-16">
        <div style="display:flex;gap:8px">
          <input type="text" id="new-player-name" placeholder="New player name" style="flex:1">
          <button class="btn btn-primary" style="width:auto;padding:12px 20px" onclick="Players.addPlayer()">Add</button>
        </div>
      </div>`;

    const active = players.filter(p => p.active);
    const inactive = players.filter(p => !p.active);

    if (active.length) {
      active.forEach(p => {
        html += `
          <div class="player-list-item" onclick="Players.showProfile('${p.id}')">
            <span style="font-weight:600">${this.escHtml(p.name)}</span>
            <span class="chevron">▸</span>
          </div>`;
      });
    }

    if (inactive.length) {
      html += '<div class="section-title mt-16">Inactive</div>';
      inactive.forEach(p => {
        html += `
          <div class="player-list-item inactive" onclick="Players.showProfile('${p.id}')">
            <span>${this.escHtml(p.name)}</span>
            <span class="chevron">▸</span>
          </div>`;
      });
    }

    if (!players.length) {
      html += '<div class="empty-state"><p>No players yet. Add your first player above!</p></div>';
    }

    container.innerHTML = html;

    // Enter key to add player
    document.getElementById('new-player-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Players.addPlayer();
    });
  },

  async addPlayer() {
    const input = document.getElementById('new-player-name');
    const name = input.value.trim();
    if (!name) { App.toast('Enter a player name', 'error'); return; }

    App.showLoading();
    const { error } = await db.from('players').insert({ name });
    App.hideLoading();

    if (error) {
      if (error.code === '23505') {
        App.toast('Player already exists', 'error');
      } else {
        App.toast('Failed to add player: ' + error.message, 'error');
      }
      return;
    }

    App.toast(`${name} added!`);
    App.clearPlayersCache();
    this.load();
  },

  async showProfile(playerId) {
    App.showLoading();

    const [playerRes, resultsRes] = await Promise.all([
      db.from('players').select('*').eq('id', playerId).single(),
      db.from('results').select('*, games(game_date)').eq('player_id', playerId).order('created_at', { ascending: false })
    ]);

    App.hideLoading();

    if (playerRes.error) { App.toast('Failed to load player', 'error'); return; }

    const player = playerRes.data;
    const results = resultsRes.data || [];

    const totalPoints = results.reduce((s, r) => s + r.points, 0);
    const games = results.length;
    const wins = results.filter(r => r.position === 1).length;
    const podiums = results.filter(r => r.position && r.position <= 3).length;
    const bubbles = results.filter(r => r.is_bubble).length;
    const avgPoints = games ? (totalPoints / games).toFixed(1) : '0';
    const winPct = games ? ((wins / games) * 100).toFixed(0) : '0';

    let html = `
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${totalPoints}</div>
          <div class="stat-label">Total Points</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${games}</div>
          <div class="stat-label">Games Played</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${avgPoints}</div>
          <div class="stat-label">Avg Points</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${winPct}%</div>
          <div class="stat-label">Win Rate</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${podiums}</div>
          <div class="stat-label">Podiums</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${bubbles}</div>
          <div class="stat-label">Bubbles</div>
        </div>
      </div>
      ${games >= 10 ? '<div style="text-align:center;margin-bottom:16px"><span class="badge badge-qualified">Qualified for End-of-Year</span></div>' : `<div style="text-align:center;margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">${10 - games} more game${10 - games !== 1 ? 's' : ''} to qualify</div>`}
    `;

    // Recent games
    if (results.length) {
      html += '<div class="section-title">Recent Games</div>';
      results.slice(0, 10).forEach(r => {
        let badge = '';
        if (r.position === 1) badge = '<span class="badge badge-gold">1st</span>';
        else if (r.position === 2) badge = '<span class="badge badge-silver">2nd</span>';
        else if (r.position === 3) badge = '<span class="badge badge-bronze">3rd</span>';
        if (r.is_bubble) badge += ' <span class="badge badge-bubble">Bubble</span>';

        html += `<div class="game-result-row">
          <span style="font-size:0.85rem">${App.formatDate(r.games?.game_date)} ${badge}</span>
          <span style="font-weight:600">${r.points} pts</span>
        </div>`;
      });
    }

    // Action buttons
    html += `
      <div style="margin-top:20px;display:flex;gap:8px">
        <button class="btn btn-secondary flex-1" onclick="Players.toggleActive('${player.id}', ${player.active})">
          ${player.active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>`;

    App.showModal(player.name, html);
  },

  async toggleActive(playerId, currentActive) {
    App.showLoading();
    const { error } = await db
      .from('players')
      .update({ active: !currentActive })
      .eq('id', playerId);
    App.hideLoading();

    if (error) { App.toast('Failed to update player', 'error'); return; }

    App.toast(currentActive ? 'Player deactivated' : 'Player reactivated');
    App.hideModal();
    App.clearPlayersCache();
    this.load();
  },

  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
