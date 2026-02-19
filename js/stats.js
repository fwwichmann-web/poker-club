// ===== Stats Dashboard View =====

const Stats = {
  async load() {
    const container = document.getElementById('view-stats');
    container.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

    const [gamesRes, resultsRes] = await Promise.all([
      supabase.from('games').select('*').order('game_date', { ascending: false }),
      supabase.from('results').select('*, players(name)')
    ]);

    if (gamesRes.error || resultsRes.error) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load stats</p></div>';
      return;
    }

    const games = gamesRes.data || [];
    const results = resultsRes.data || [];

    // Prize pool: total results rows × R50
    const prizePool = results.length * 50;

    // Games this year
    const currentYear = new Date().getFullYear();
    const gamesThisYear = games.filter(g => new Date(g.game_date).getFullYear() === currentYear).length;

    // Next game date (every second Thursday)
    const nextGame = this.getNextGameDate();

    // Per-player stats
    const playerStats = {};
    results.forEach(r => {
      const name = r.players?.name || 'Unknown';
      if (!playerStats[name]) {
        playerStats[name] = { points: 0, games: 0, wins: 0, bubbles: 0, gameIds: new Set(), recentPoints: [] };
      }
      const s = playerStats[name];
      s.points += r.points;
      if (!s.gameIds.has(r.game_id)) {
        s.games++;
        s.gameIds.add(r.game_id);
      }
      if (r.position === 1) s.wins++;
      if (r.is_bubble) s.bubbles++;
    });

    // Calculate recent form (last 5 games per player)
    // We need game dates to sort
    const gameMap = {};
    games.forEach(g => { gameMap[g.id] = g.game_date; });

    // Sort results by game date desc for form calculation
    const sortedResults = [...results].sort((a, b) => {
      const da = gameMap[a.game_id] || '';
      const db = gameMap[b.game_id] || '';
      return db.localeCompare(da);
    });

    const formTracker = {};
    sortedResults.forEach(r => {
      const name = r.players?.name || 'Unknown';
      if (!formTracker[name]) formTracker[name] = [];
      if (formTracker[name].length < 5) {
        formTracker[name].push(r.points);
      }
    });

    // Find stat leaders
    const entries = Object.entries(playerStats);
    const mostWins = entries.reduce((best, [name, s]) => s.wins > (best.val || 0) ? { name, val: s.wins } : best, {});
    const mostBubbles = entries.reduce((best, [name, s]) => s.bubbles > (best.val || 0) ? { name, val: s.bubbles } : best, {});
    const bestAvg = entries
      .filter(([, s]) => s.games >= 3) // min 3 games for avg
      .reduce((best, [name, s]) => {
        const avg = s.points / s.games;
        return avg > (best.val || 0) ? { name, val: avg } : best;
      }, {});

    // Best current form (avg of last 5)
    const bestForm = Object.entries(formTracker)
      .filter(([, pts]) => pts.length >= 3)
      .reduce((best, [name, pts]) => {
        const avg = pts.reduce((s, p) => s + p, 0) / pts.length;
        return avg > (best.val || 0) ? { name, val: avg, games: pts.length } : best;
      }, {});

    let html = `
      <div class="section-title">Stats Dashboard</div>

      <div class="stats-hero">
        <div class="stat-value text-gold">R${prizePool.toLocaleString()}</div>
        <div class="stat-label">End-of-Year Prize Pool</div>
      </div>

      <div class="stats-row">
        <div class="stats-card">
          <div class="stats-card-title">Games This Year</div>
          <div class="stats-card-value">${gamesThisYear}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Total Games</div>
          <div class="stats-card-value">${games.length}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stats-card">
          <div class="stats-card-title">Total Players</div>
          <div class="stats-card-value">${entries.length}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Next Game</div>
          <div class="stats-card-value" style="font-size:0.85rem">${nextGame}</div>
        </div>
      </div>

      <div class="section-title mt-16">Achievements</div>

      <div class="stats-row">
        <div class="stats-card">
          <div class="stats-card-title">Most Wins</div>
          <div class="stats-card-value text-gold">${this.escHtml(mostWins.name || '—')}</div>
          <div class="stats-card-sub">${mostWins.val || 0} wins</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Most Bubbles</div>
          <div class="stats-card-value text-red">${this.escHtml(mostBubbles.name || '—')}</div>
          <div class="stats-card-sub">${mostBubbles.val || 0} bubbles</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stats-card">
          <div class="stats-card-title">Best Average</div>
          <div class="stats-card-value">${this.escHtml(bestAvg.name || '—')}</div>
          <div class="stats-card-sub">${bestAvg.val ? bestAvg.val.toFixed(1) + ' pts/game' : 'Min 3 games'}</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Hot Streak</div>
          <div class="stats-card-value">${this.escHtml(bestForm.name || '—')}</div>
          <div class="stats-card-sub">${bestForm.val ? bestForm.val.toFixed(1) + ' avg (last ' + bestForm.games + ')' : 'Min 3 games'}</div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  getNextGameDate() {
    // Find next second Thursday from today
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Try current month and next month
    for (let m = month; m <= month + 2; m++) {
      const d = new Date(year, m, 1);
      // Find first Thursday
      while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
      // Second Thursday = first Thursday + 7
      const secondThurs = new Date(d);
      secondThurs.setDate(secondThurs.getDate() + 7);

      if (secondThurs >= today) {
        return secondThurs.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      }
    }
    return '—';
  },

  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
