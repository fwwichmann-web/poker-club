// ===== Leaderboard View =====

const Leaderboard = {
  async load() {
    const container = document.getElementById('view-leaderboard');
    container.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    const { data: results, error } = await supabase
      .from('results')
      .select('player_id, points, position, is_bubble, game_id');

    if (error) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load leaderboard</p></div>';
      return;
    }

    const players = await App.getPlayers(true);
    const playerMap = {};
    players.forEach(p => { playerMap[p.id] = p; });

    // Aggregate stats per player
    const stats = {};
    results.forEach(r => {
      if (!stats[r.player_id]) {
        stats[r.player_id] = { points: 0, games: 0, wins: 0, podiums: 0, bubbles: 0, gameIds: new Set() };
      }
      const s = stats[r.player_id];
      s.points += r.points;
      if (!s.gameIds.has(r.game_id)) {
        s.games++;
        s.gameIds.add(r.game_id);
      }
      if (r.position === 1) { s.wins++; s.podiums++; }
      else if (r.position === 2 || r.position === 3) { s.podiums++; }
      if (r.is_bubble) s.bubbles++;
    });

    // Build sorted leaderboard
    const board = Object.entries(stats)
      .filter(([id]) => playerMap[id])
      .map(([id, s]) => ({
        id,
        name: playerMap[id].name,
        active: playerMap[id].active,
        ...s
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.games - b.games; // fewer games = more efficient
      });

    if (!board.length) {
      container.innerHTML = '<div class="empty-state"><p>No games played yet.<br>Add players and enter a game to get started!</p></div>';
      return;
    }

    let html = '<div class="section-title">Leaderboard</div>';
    board.forEach((p, i) => {
      const rank = i + 1;
      const qualified = p.games >= 10;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rowClass = qualified ? 'qualified' : (p.active ? '' : 'not-qualified');

      html += `
        <div class="leaderboard-row ${rowClass}">
          <div class="rank ${rankClass}">${rank}</div>
          <div class="player-info">
            <div class="player-name">${this.escHtml(p.name)}</div>
            <div class="player-meta">
              ${p.games} game${p.games !== 1 ? 's' : ''} · ${p.wins}W · ${p.podiums}P · ${p.bubbles}B
              ${qualified ? ' <span class="badge badge-qualified">Qualified</span>' : ''}
            </div>
          </div>
          <div class="player-points">${p.points}</div>
        </div>`;
    });

    container.innerHTML = html;
  },

  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
