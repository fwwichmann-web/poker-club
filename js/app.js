// ===== App Core — Tab Routing & Utilities =====

const App = {
  currentView: 'leaderboard',
  playersCache: [],

  init() {
    this.setupTabs();
    this.loadView('leaderboard');
  },

  setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchTab(view);
      });
    });
  },

  switchTab(viewName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    this.currentView = viewName;
    this.loadView(viewName);
  },

  async loadView(viewName) {
    try {
      switch (viewName) {
        case 'leaderboard': await Leaderboard.load(); break;
        case 'enter-game': await EnterGame.load(); break;
        case 'history': await GameHistory.load(); break;
        case 'players': await Players.load(); break;
        case 'stats': await Stats.load(); break;
      }
    } catch (err) {
      console.error('View load error:', err);
      const container = document.getElementById(`view-${viewName}`);
      if (container) container.innerHTML = `<div class="empty-state"><p>Something went wrong.<br><small style="color:var(--red)">${err.message || err}</small></p></div>`;
    }
  },

  // Fetch all active players (cached)
  async getPlayers(forceRefresh = false) {
    if (this.playersCache.length && !forceRefresh) return this.playersCache;
    const { data, error } = await db
      .from('players')
      .select('*')
      .order('name');
    if (error) { this.toast('Failed to load players', 'error'); return []; }
    this.playersCache = data;
    return data;
  },

  // Invalidate cache
  clearPlayersCache() {
    this.playersCache = [];
  },

  // Show loading overlay
  showLoading() {
    document.getElementById('loading-overlay').classList.add('show');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.remove('show');
  },

  // Toast notification
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  // Modal
  showModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  // Format date
  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  },

  // Today's date as YYYY-MM-DD
  todayStr() {
    return new Date().toISOString().split('T')[0];
  },

  // Points for a position
  pointsForPosition(pos) {
    if (pos === 1) return 10;
    if (pos === 2) return 5;
    if (pos === 3) return 3;
    return 1;
  },

  // Position label
  positionLabel(pos) {
    if (pos === 1) return '1st';
    if (pos === 2) return '2nd';
    if (pos === 3) return '3rd';
    return '';
  },

  // Position class
  positionClass(pos) {
    if (pos === 1) return 'text-gold';
    if (pos === 2) return 'text-silver';
    if (pos === 3) return 'text-bronze';
    return '';
  }
};

// Close modal on overlay/button click
document.getElementById('modal-close').addEventListener('click', () => App.hideModal());
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) App.hideModal();
});

// Init on load
document.addEventListener('DOMContentLoaded', () => App.init());
