// ===== Game History View =====

const GameHistory = {
  async load() {
    const container = document.getElementById('view-history');
    container.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    const { data: games, error } = await db
      .from('games')
      .select('*, results(*, players(name))')
      .order('game_date', { ascending: false });

    if (error) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load games</p></div>';
      return;
    }

    if (!games.length) {
      container.innerHTML = '<div class="empty-state"><p>No games yet.<br>Go to "New Game" to enter results.</p></div>';
      return;
    }

    let html = '<div class="section-title">Game History</div>';

    games.forEach(game => {
      const results = (game.results || []).sort((a, b) => {
        // Podium first (1,2,3), then rest
        const pa = a.position || 99;
        const pb = b.position || 99;
        return pa - pb;
      });

      const playerCount = results.length;
      const winner = results.find(r => r.position === 1);
      const second = results.find(r => r.position === 2);
      const third = results.find(r => r.position === 3);
      const bubble = results.find(r => r.is_bubble);

      const podiumText = [
        winner ? `🥇 ${winner.players?.name}` : '',
        second ? `🥈 ${second.players?.name}` : '',
        third ? `🥉 ${third.players?.name}` : ''
      ].filter(Boolean).join('  ');

      html += `
        <div class="game-card" data-game-id="${game.id}">
          <div class="game-card-header" onclick="GameHistory.toggle('${game.id}')">
            <div>
              <div class="game-date">${App.formatDate(game.game_date)}</div>
              <div class="game-summary">${playerCount} players · ${podiumText}</div>
            </div>
            <div class="chevron" id="chevron-${game.id}">▸</div>
          </div>
          <div class="game-details" id="details-${game.id}">
            ${results.map(r => {
              let badge = '';
              if (r.position === 1) badge = '<span class="badge badge-gold">1st</span>';
              else if (r.position === 2) badge = '<span class="badge badge-silver">2nd</span>';
              else if (r.position === 3) badge = '<span class="badge badge-bronze">3rd</span>';
              else if (r.position === 4) badge = '<span class="badge" style="background:#1a2a1a;color:var(--text-muted)">4th</span>';
              if (r.is_bubble) badge += ' <span class="badge badge-bubble">Bubble</span>';
              if (r.is_final_table) badge += ' <span class="badge" style="background:#2a2a10;color:var(--gold)">FT</span>';

              return `<div class="game-result-row">
                <span>${this.escHtml(r.players?.name || '?')} ${badge}</span>
                <span style="font-weight:600">${r.points} pts</span>
              </div>`;
            }).join('')}
            ${game.notes ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;font-style:italic">${this.escHtml(game.notes)}</div>` : ''}
            <div class="game-actions">
              <button class="btn btn-secondary btn-sm flex-1" onclick="EnterGame.loadForEdit('${game.id}')">Edit</button>
              <button class="btn btn-danger btn-sm flex-1" onclick="GameHistory.confirmDelete('${game.id}')">Delete</button>
            </div>
          </div>
        </div>`;
    });

    container.innerHTML = html;
  },

  toggle(gameId) {
    const details = document.getElementById(`details-${gameId}`);
    const chevron = document.getElementById(`chevron-${gameId}`);
    const isOpen = details.classList.contains('open');
    details.classList.toggle('open');
    chevron.textContent = isOpen ? '▸' : '▾';
  },

  confirmDelete(gameId) {
    App.showModal('Delete Game', `
      <p style="margin-bottom:16px">Are you sure? This will permanently delete this game and all its results.</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick="App.hideModal()">Cancel</button>
        <button class="btn btn-danger" onclick="GameHistory.deleteGame('${gameId}')">Delete</button>
      </div>
    `);
  },

  async deleteGame(gameId) {
    App.hideModal();
    App.showLoading();

    const { error } = await db.from('games').delete().eq('id', gameId);

    App.hideLoading();

    if (error) {
      App.toast('Failed to delete game', 'error');
      return;
    }

    App.toast('Game deleted');
    App.clearPlayersCache();
    this.load();
  },

  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
