import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, BarChart3, BriefcaseBusiness, Building2,
  Check, CircleDollarSign, Coins, Compass, Crown, Dice5, FileText, HeartHandshake,
  HelpCircle, Home, Landmark, ListFilter, LockKeyhole, Minus, Plus, RotateCcw, Save, Settings2, ShieldAlert,
  Sparkles, Target, TrendingDown, TrendingUp, Trophy, Wallet, X, Zap,
} from 'lucide-react';
import './styles.css';
import {
  DREAMS, PROFESSIONS,
} from './data/cards';
import {
  borrowBankLoan, canBankBorrow, canCompleteDream, chooseCharityDie, continueAfterExit, createGame,
  declareBankruptcy, DEFAULT_CONFIG, formatGM, formatMonthly, getActivePlayer, getFinancials, nextPlayer, resolveBusiness,
  PLAYER_COLOR_OPTIONS, RAT_RACE_BOARD, FAST_TRACK_BOARD, repayBankLoan, resolveCharity, resolveDream, resolveExpense,
  resolveInvestment, resolveLifeEvent, resolveMarketSale, resolveNotice, resolvePayment, startRoll, validateGameState,
} from './engine/engine';
import type { GameConfig, GamePhase, GameState, Player, PlayerSetup, Stage } from './types';
import type { Financials } from './engine/engine';

const SAVE_KEY = 'wealth-loop-save-v1';
const UNDO_KEY = 'wealth-loop-undo-v1';
const PREF_KEY = 'wealth-loop-prefs-v1';
type Screen = 'home' | 'setup' | 'game' | 'results';
type WorkspaceTab = 'overview' | 'statement' | 'assets' | 'transactions' | 'help';
type Prefs = { sound: boolean; reducedMotion: boolean; compactDisplay: boolean };
const DEFAULT_PREFS: Prefs = { sound: false, reducedMotion: false, compactDisplay: false };

function parseStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
function writeStored(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsers may block storage or run out of space. */ }
}
function removeStored(key: string): void {
  try { localStorage.removeItem(key); } catch { /* A blocked storage area should not break the game UI. */ }
}
function nextSetup(index: number): PlayerSetup {
  return { id: `setup-${index + 1}`, name: `Player ${index + 1}`, color: PLAYER_COLOR_OPTIONS[index % PLAYER_COLOR_OPTIONS.length], professionId: PROFESSIONS[index % PROFESSIONS.length].id, dreamId: DREAMS[index % DREAMS.length].id };
}
function activeFollowingPlayer(state: GameState): Player {
  let index = state.currentPlayerIndex;
  for (let n = 0; n < state.players.length; n += 1) {
    index = (index + 1) % state.players.length;
    if (!state.players[index].bankrupt) return state.players[index];
  }
  return state.players[state.currentPlayerIndex];
}
function iconForSpace(space: string): string {
  const map: Record<string, string> = {
    'Payday': '৳', 'Small Opportunity': '↗', 'Big Opportunity': '◆', 'Expense': '−', 'Market': '⇄',
    'Life Event': '✳', 'Charity': '♡', 'Baby': '✦', 'Downsized': '↓', 'Business Opportunity': '▣',
    'Cash Flow Day': '৳', 'Dream': '☆', 'Blank': '·',
  };
  return map[space] ?? '·';
}
function spaceClass(space: string): string {
  const name = space.toLowerCase().replaceAll(' ', '-');
  if (space.includes('Payday') || space === 'Cash Flow Day') return 'space-payday';
  if (space.includes('Opportunity')) return 'space-opportunity';
  if (space === 'Expense' || space === 'Downsized') return 'space-expense';
  if (space === 'Market') return 'space-market';
  if (space === 'Life Event' || space === 'Baby') return 'space-event';
  if (space === 'Charity') return 'space-charity';
  if (space === 'Dream') return 'space-dream';
  return `space-${name}`;
}
function boardCoordinates(stage: Stage): Array<{ row: number; col: number }> {
  if (stage === 'fast-track') return [
    ...Array.from({ length: 5 }, (_, col) => ({ row: 0, col })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: i + 1, col: 4 })),
    ...Array.from({ length: 5 }, (_, i) => ({ row: 4, col: 4 - i })),
    ...Array.from({ length: 3 }, (_, i) => ({ row: 3 - i, col: 0 })),
  ];
  return [
    ...Array.from({ length: 7 }, (_, col) => ({ row: 0, col })),
    ...Array.from({ length: 5 }, (_, i) => ({ row: i + 1, col: 6 })),
    ...Array.from({ length: 7 }, (_, i) => ({ row: 6, col: 6 - i })),
    ...Array.from({ length: 5 }, (_, i) => ({ row: 5 - i, col: 0 })),
  ];
}
function resultTitle(state: GameState): string {
  const winner = state.players.find((p) => p.id === state.winnerId);
  return winner ? `${winner.name} wins the Wealth Loop.` : 'The game has ended.';
}

function useSound(enabled: boolean) {
  return () => {
    if (!enabled) return;
    try {
      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.085);
      oscillator.onended = () => { void context.close(); };
    } catch { /* audio is an optional preference */ }
  };
}

function Metric({ label, value, tone = 'neutral', sub }: { label: string; value: string; tone?: 'positive' | 'negative' | 'neutral' | 'gold'; sub?: string }) {
  return <div className={`metric metric-${tone}`}><span className="metric-label">{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;
}

function CashBar({ income, expenses }: { income: number; expenses: number }) {
  const total = Math.max(1, income + expenses);
  const width = Math.min(100, Math.max(1, (income / total) * 100));
  return <div className="cash-bar-wrap" aria-label={`Income ${formatGM(income)}, expenses ${formatGM(expenses)}`}>
    <div className="cash-bar"><span style={{ width: `${width}%` }} /></div>
    <div className="cash-bar-labels"><span>Income {formatGM(income)}</span><span>Expenses {formatGM(expenses)}</span></div>
  </div>;
}

function WealthChart({ history }: { history: number[] }) {
  const values = history.length > 1 ? history : [history[0] ?? 0, history[0] ?? 0];
  const min = Math.min(...values, 0); const max = Math.max(...values, 1); const range = max - min || 1;
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${100 - ((v - min) / range) * 84}`).join(' ');
  return <div className="trend-wrap">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Monthly cash-flow trend from recorded turns">
      <line x1="0" y1={100 - ((0 - min) / range) * 84} x2="100" y2={100 - ((0 - min) / range) * 84} className="chart-zero" />
      <polyline points={points} className="chart-line" />
    </svg>
    <div className="trend-axis"><span>Earlier turns</span><span>Latest</span></div>
    <p className="micro-copy">Each point reflects the recorded monthly cash flow after a completed turn.</p>
  </div>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [setupStep, setSetupStep] = useState(0);
  const [playersSetup, setPlayersSetup] = useState<PlayerSetup[]>([nextSetup(0), nextSetup(1)]);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [game, setGame] = useState<GameState | null>(() => {
    const saved = parseStored<GameState | null>(SAVE_KEY, null);
    if (!saved || !Array.isArray(saved.players)) return null;
    return validateGameState(saved).length === 0 ? saved : null;
  });
  const [undoStack, setUndoStack] = useState<GameState[]>(() => parseStored<GameState[]>(UNDO_KEY, []));
  const [prefs, setPrefs] = useState<Prefs>(() => parseStored(PREF_KEY, DEFAULT_PREFS));
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('overview');
  const [boardView, setBoardView] = useState<Stage>('rat-race');
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showHowTo, setShowHowTo] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFreshConfirm, setShowFreshConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [loanAmount, setLoanAmount] = useState('1');
  const [repayAmount, setRepayAmount] = useState('1');
  const [shareQuantity, setShareQuantity] = useState('1');
  const [toast, setToast] = useState('');
  const clickSound = useSound(prefs.sound);

  useEffect(() => { writeStored(PREF_KEY, prefs); }, [prefs]);
  useEffect(() => {
    if (game) {
      const safe = { ...game, saveUpdatedAt: Date.now() };
      writeStored(SAVE_KEY, safe);
    }
  }, [game]);
  useEffect(() => { writeStored(UNDO_KEY, undoStack.slice(-20)); }, [undoStack]);
  useEffect(() => {
    if (game && (game.phase === 'ready' || game.phase === 'handover')) setBoardView(game.players[game.currentPlayerIndex]?.stage ?? 'rat-race');
  }, [game?.currentPlayerIndex, game?.players[game?.currentPlayerIndex ?? 0]?.stage]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const current = game ? getActivePlayer(game) : null;
  const financials = current ? getFinancials(current) : null;
  const savedExists = !!game;

  function commit(transform: (state: GameState) => GameState) {
    if (!game) return;
    try {
      const next = transform(game);
      const errors = validateGameState(next);
      if (errors.length) throw new Error(errors[0]);
      if (next !== game) {
        setUndoStack((prev) => [...prev, game].slice(-20));
        setGame({ ...next, saveUpdatedAt: Date.now() });
        clickSound();
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'That action could not be completed.');
    }
  }

  function beginSetup() {
    setPlayersSetup([nextSetup(0), nextSetup(1)]);
    setConfig(DEFAULT_CONFIG);
    setSetupStep(0);
    if (game) setShowFreshConfirm(true); else setScreen('setup');
  }
  function startFreshConfirmed() {
    setShowFreshConfirm(false);
    setGame(null); setUndoStack([]);
    removeStored(SAVE_KEY); removeStored(UNDO_KEY);
    setScreen('setup');
  }
  function updateSetup(index: number, updates: Partial<PlayerSetup>) {
    setPlayersSetup((prev) => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  }
  function randomizeProfession(index: number) {
    const pool = PROFESSIONS.filter((p) => !playersSetup.some((x, i) => i !== index && x.professionId === p.id));
    const choice = pool[Math.floor(Math.random() * pool.length)] ?? PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
    updateSetup(index, { professionId: choice.id });
  }
  function startGame() {
    try {
      const next = createGame(playersSetup, config);
      const errors = validateGameState(next);
      if (errors.length) throw new Error(errors[0]);
      setUndoStack([]); setGame(next); setScreen('game'); setBoardView('rat-race'); setWorkspaceTab('overview');
    } catch (error) { setToast(error instanceof Error ? error.message : 'Check your setup.'); }
  }
  function undo() {
    if (!game || undoStack.length === 0) { setToast('There is no safe previous state to restore.'); return; }
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setGame(previous);
    setToast('Previous game state restored.');
  }
  function home() {
    if (game && game.phase !== 'finished') setShowHomeConfirm(true);
    else setScreen('home');
  }
  function resume() {
    if (!game) return;
    setScreen(game.phase === 'finished' ? 'results' : 'game');
  }
  function changePref(key: keyof Prefs, value: boolean) { setPrefs((prev) => ({ ...prev, [key]: value })); }

  const glossary = [
    ['Cash on hand', 'Money you can spend immediately. It is not the same as total asset value.'],
    ['Asset', 'Something the game counts as owned value, such as property, shares, a fund, or a business.'],
    ['Liability', 'A debt still owed to the Bank or another lender.'],
    ['Monthly cash flow', 'Total recurring monthly income minus recurring monthly expenses.'],
    ['Passive income', 'Recurring income from investments and side income, excluding your salary.'],
    ['Net worth', 'Cash + current asset values − outstanding debts.'],
    ['Down payment', 'The cash you must pay now when the rest of a purchase is financed.'],
    ['GM / game unit', 'A balancing unit used by the game. 1 GM is displayed as ৳1,000 BDT. All card values are fictional.'],
  ];

  if (screen === 'home') return <div className={`app-shell ${prefs.reducedMotion ? 'reduce-motion' : ''} ${prefs.compactDisplay ? 'compact-display' : ''}`}>
    <header className="home-nav">
      <button className="brand brand-button" onClick={() => setScreen('home')} aria-label="Wealth Loop home"><span className="brand-mark"><CircleDollarSign size={24} /></span><span><strong>WEALTH LOOP</strong><small>FINANCIAL STRATEGY GAME</small></span></button>
      <div className="nav-actions"><button className="text-button" onClick={() => setShowHowTo(true)}><HelpCircle size={16} /> How to play</button><button className="icon-button nav-icon" onClick={() => setShowSettings(true)} aria-label="Settings"><Settings2 size={18} /></button></div>
    </header>
    <main className="home-main">
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY. YOUR MOVES.</div>
          <h1>Build assets.<br /><em>Break the loop.</em></h1>
          <p className="hero-subtitle">A financial strategy game about the choices that change your cash flow — one turn at a time.</p>
          <div className="hero-actions"><button className="button button-primary button-large" onClick={beginSetup}>New game <ArrowRight size={18} /></button>{savedExists && <button className="button button-outline button-large" onClick={resume}><RotateCcw size={17} /> Resume game</button>}</div>
          <div className="hero-meta"><span><LockKeyhole size={14} /> Private, local save</span><span><UsersIcon /> 2–6 players</span><span><Banknote size={14} /> BDT-based game values</span></div>
        </div>
        <div className="hero-visual" aria-label="Abstract illustration of a financial board game">
          <div className="visual-glow" />
          <div className="floating-label floating-top"><span className="float-icon float-green"><TrendingUp size={15} /></span><div><small>PASSIVE INCOME</small><strong>+৳8,500 <i>/ month</i></strong></div></div>
          <div className="visual-board">
            <div className="visual-board-header"><span>YOUR FINANCIAL JOURNEY</span><span className="board-live"><i /> LIVE GAME</span></div>
            <div className="visual-route">
              {['PAYDAY', 'OPPORTUNITY', 'MARKET', 'EXPENSE', 'ASSET', 'PAYDAY', 'DREAM', 'CASH FLOW'].map((x, i) => <div key={x + i} className={`route-cell ${i === 4 || i === 7 ? 'route-green' : i === 2 || i === 6 ? 'route-gold' : ''}`}><span>{['৳', '↗', '⇄', '−', '◆', '৳', '☆', '↗'][i]}</span><small>{x}</small></div>)}
            </div>
            <div className="visual-board-footer"><div className="avatar-stack"><b>NS</b><b>RA</b><b>TA</b></div><span>Every move has a consequence.</span><Sparkles size={16} /></div>
          </div>
          <div className="floating-label floating-bottom"><span className="float-icon float-gold"><Target size={15} /></span><div><small>NEXT MILESTONE</small><strong>Escape the Rat Race</strong></div></div>
          <div className="decor-dot dot-one" /><div className="decor-dot dot-two" /><div className="decor-dot dot-three" />
        </div>
      </section>
      <section className="stage-section">
        <div className="section-heading"><div><div className="eyebrow eyebrow-muted">TWO STAGES. ONE GOAL.</div><h2>Learn to make money work for you.</h2></div><button className="text-button" onClick={() => setShowHowTo(true)}>Explore the rules <ArrowRight size={15} /></button></div>
        <div className="stage-cards">
          <article className="stage-card"><div className="stage-number">01 / BUILD</div><div className="stage-art rat-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-token"><Banknote size={27} /></div><span className="art-chip chip-a">PAYDAY</span><span className="art-chip chip-b">EXPENSE</span><span className="art-chip chip-c">INVEST</span></div><div className="stage-card-content"><h3>The Rat Race</h3><p>Earn salary, control expenses, buy investments, and grow passive income beyond your monthly costs.</p><div className="stage-tags"><span>Cash flow</span><span>Investments</span><span>Risk & reward</span></div></div></article>
          <article className="stage-card stage-card-fast"><div className="stage-number">02 / GROW</div><div className="stage-art fast-art"><div className="fast-art-sun" /><div className="fast-art-bar bar-one" /><div className="fast-art-bar bar-two" /><div className="fast-art-bar bar-three" /><div className="fast-art-coin"><Crown size={24} /></div><span className="fast-art-label">FINANCIAL FREEDOM</span></div><div className="stage-card-content"><h3>The Fast Track</h3><p>Reinvest your gains into larger businesses, chase your Dream, and compete to finish first.</p><div className="stage-tags"><span>Business deals</span><span>Big goals</span><span>Victory</span></div></div></article>
        </div>
      </section>
      <section className="principles-row"><div><span className="principle-icon"><Wallet size={18} /></span><div><strong>Own the numbers</strong><small>Every transaction changes your financial statement.</small></div></div><div><span className="principle-icon"><Save size={18} /></span><div><strong>Pick up where you left off</strong><small>Progress saves automatically on this device.</small></div></div><div><span className="principle-icon"><UsersIcon /></span><div><strong>Pass and play</strong><small>Take turns together, without creating accounts.</small></div></div></section>
    </main>
    <footer className="site-footer"><span>WEALTH LOOP <b>©</b> 2026</span><span>Original, fictional financial simulation · 1 GM = ৳1,000</span><button onClick={() => setShowGlossary(true)}>Financial glossary <ArrowRight size={13} /></button></footer>
    {showHowTo && <InfoModal title="How to play Wealth Loop" onClose={() => setShowHowTo(false)}><div className="howto-list"><div><b>01</b><section><strong>Start with your profession</strong><p>Your salary, expenses, and cash reserve shape your starting point. All card amounts are fictional game values.</p></section></div><div><b>02</b><section><strong>Roll, move, resolve</strong><p>Roll one die in the Rat Race and two dice on the Fast Track. Resolve every space before passing the device.</p></section></div><div><b>03</b><section><strong>Study each decision</strong><p>Investments change cash, asset value, debt, monthly income, and expenses. Check the full impact before buying.</p></section></div><div><b>04</b><section><strong>Escape and finish</strong><p>Passive income must exceed monthly expenses to escape the Rat Race. On the Fast Track, complete your selected Dream or hit the cash-flow target.</p></section></div></div><p className="modal-footnote">Local pass-and-play only. Your game is saved in this browser, not synced online.</p></InfoModal>}
    {showGlossary && <InfoModal title="Rules & financial glossary" onClose={() => setShowGlossary(false)}><div className="glossary-list">{glossary.map(([term, description]) => <div key={term}><strong>{term}</strong><p>{description}</p></div>)}</div><h3 className="modal-subhead">Victory conditions</h3><p className="modal-paragraph">Dream mode: first player to reach the Fast Track and pay for their chosen Dream wins. Cash Flow mode: first Fast Track player to reach the configured monthly cash-flow target wins. If the turn limit is reached, net worth breaks the tie, then passive income.</p></InfoModal>}
    {showSettings && <SettingsModal prefs={prefs} onChange={changePref} onClose={() => setShowSettings(false)} />}
    {showFreshConfirm && <ConfirmModal title="Start a new game?" message="This will replace the saved game on this device. Your current game will not be recoverable unless you undo before resetting." confirmLabel="Start new game" onCancel={() => setShowFreshConfirm(false)} onConfirm={startFreshConfirmed} />}
    {toast && <Toast message={toast} />}
  </div>;

  if (screen === 'setup') return <div className={`app-shell setup-shell ${prefs.reducedMotion ? 'reduce-motion' : ''}`}>
    <header className="home-nav setup-nav"><button className="brand brand-button" onClick={home}><span className="brand-mark"><CircleDollarSign size={24} /></span><span><strong>WEALTH LOOP</strong><small>NEW GAME SETUP</small></span></button><button className="text-button" onClick={home}><X size={16} /> Cancel</button></header>
    <main className="setup-main"><div className="setup-heading"><div className="eyebrow eyebrow-muted">YOUR TABLE. YOUR STRATEGY.</div><h1>Set up your game.</h1><p>Choose who’s playing and how victory is earned.</p></div>
      <div className="setup-progress">{['Players', 'Rules', 'Professions', 'Review'].map((step, i) => <div key={step} className={`progress-step ${i === setupStep ? 'active' : ''} ${i < setupStep ? 'done' : ''}`}><span>{i < setupStep ? <Check size={14} /> : i + 1}</span><small>{step}</small></div>)}</div>
      <section className="setup-card">
        {setupStep === 0 && <><div className="setup-card-top"><div><h2>Who's at the table?</h2><p>Enter a name for each player. Names must be unique.</p></div><span className="step-counter">STEP 01 / 04</span></div><div className="player-form-list">{playersSetup.map((p, i) => <div key={p.id} className="player-form-row"><span className="player-color-dot" style={{ background: p.color }} /><div className="player-form-fields"><label>Player {i + 1}<input value={p.name} maxLength={24} onChange={(e) => updateSetup(i, { name: e.target.value })} placeholder="Display name" /></label><label>Token color<select value={p.color} onChange={(e) => updateSetup(i, { color: e.target.value })}>{PLAYER_COLOR_OPTIONS.map((c) => <option key={c} value={c}>{colorName(c)}</option>)}</select></label></div>{playersSetup.length > 2 && <button className="icon-button remove-player" aria-label={`Remove ${p.name}`} onClick={() => setPlayersSetup((prev) => prev.filter((_, j) => j !== i))}><X size={16} /></button>}</div>)}</div><div className="setup-inline-actions"><button className="text-button" disabled={playersSetup.length >= 6} onClick={() => setPlayersSetup((prev) => [...prev, nextSetup(prev.length)])}><Plus size={16} /> Add player <small>({playersSetup.length}/6)</small></button><span>Pass-and-play · one shared device</span></div></>}
        {setupStep === 1 && <><div className="setup-card-top"><div><h2>Choose your rules.</h2><p>Pick the finish line and optional table rules.</p></div><span className="step-counter">STEP 02 / 04</span></div><div className="form-stack"><label className="field-label">Victory condition</label><div className="victory-options"><button className={`victory-option ${config.victoryMode === 'dream' ? 'selected' : ''}`} onClick={() => setConfig((c) => ({ ...c, victoryMode: 'dream' }))}><span className="option-symbol"><Target size={20} /></span><strong>Financial Dream</strong><p>Reach Fast Track, then pay for the Dream you selected.</p>{config.victoryMode === 'dream' && <Check size={17} className="option-check" />}</button><button className={`victory-option ${config.victoryMode === 'cashflow' ? 'selected' : ''}`} onClick={() => setConfig((c) => ({ ...c, victoryMode: 'cashflow' }))}><span className="option-symbol"><TrendingUp size={20} /></span><strong>Fast Track cash flow</strong><p>First to reach the monthly cash-flow target wins.</p>{config.victoryMode === 'cashflow' && <Check size={17} className="option-check" />}</button></div>{config.victoryMode === 'cashflow' && <label className="field-label">Monthly cash-flow target <select value={config.cashFlowTarget} onChange={(e) => setConfig((c) => ({ ...c, cashFlowTarget: Number(e.target.value) }))}><option value={25}>{formatMonthly(25)} — accessible</option><option value={50}>{formatMonthly(50)} — standard</option><option value={75}>{formatMonthly(75)} — ambitious</option><option value={100}>{formatMonthly(100)} — expert</option></select></label>}
          <div className="settings-list"><label className="switch-row"><span><strong>Restart after bankruptcy</strong><small>Restart that player with 5 GM and a new profession.</small></span><input type="checkbox" checked={config.restartAfterBankruptcy} onChange={(e) => setConfig((c) => ({ ...c, restartAfterBankruptcy: e.target.checked }))} /><i /></label><label className="switch-row"><span><strong>Tutorial prompts</strong><small>Show helpful explanations alongside game actions.</small></span><input type="checkbox" checked={config.tutorialPrompts} onChange={(e) => setConfig((c) => ({ ...c, tutorialPrompts: e.target.checked }))} /><i /></label><label className="field-label">Session turn limit <select value={config.turnLimit ?? 0} onChange={(e) => setConfig((c) => ({ ...c, turnLimit: Number(e.target.value) || null }))}><option value={0}>No turn limit</option><option value={60}>60 turns</option><option value={100}>100 turns</option><option value={150}>150 turns (default)</option><option value={200}>200 turns</option></select></label></div><p className="callout-note"><Banknote size={16} /> Game balances use GM internally, displayed as BDT at ৳1,000 per GM. These are fictional balancing values, not real-world forecasts.</p></div></>}
        {setupStep === 2 && <><div className="setup-card-top"><div><h2>Give every player a starting hand.</h2><p>Choose a profession and a personal Dream for each player.</p></div><span className="step-counter">STEP 03 / 04</span></div><div className="profession-setup-list">{playersSetup.map((p, i) => { const profession = PROFESSIONS.find((x) => x.id === p.professionId) ?? PROFESSIONS[0]; const dream = DREAMS.find((x) => x.id === p.dreamId) ?? DREAMS[0]; return <article className="profession-setup-card" key={p.id}><div className="profession-setup-head"><span className="avatar" style={{ background: p.color }}>{initials(p.name || `P${i + 1}`)}</span><div><strong>{p.name || `Player ${i + 1}`}</strong><small>Player {i + 1}</small></div><button className="text-button small-text-button" onClick={() => randomizeProfession(i)}><Sparkles size={14} /> Randomize</button></div><label className="field-label">Profession<select value={p.professionId} onChange={(e) => updateSetup(i, { professionId: e.target.value })}>{PROFESSIONS.map((prof) => <option key={prof.id} value={prof.id}>{prof.name}</option>)}</select></label><div className="profession-preview"><div><small>Salary / mo</small><strong>{formatGM(profession.salary)}</strong></div><div><small>Expenses / mo</small><strong>{formatGM(profession.livingExpense + profession.otherExpense)}</strong></div><div><small>Starting cash</small><strong>{formatGM(profession.startingCash)}</strong></div><div><small>Initial cash flow</small><strong className={profession.salary - profession.livingExpense - profession.otherExpense >= 0 ? 'positive-text' : 'negative-text'}>{formatMonthly(profession.salary - profession.livingExpense - profession.otherExpense)}</strong></div></div><label className="field-label">Selected Dream<select value={p.dreamId} onChange={(e) => updateSetup(i, { dreamId: e.target.value })}>{DREAMS.map((d) => <option key={d.id} value={d.id}>{d.name} · {formatGM(d.cost)}</option>)}</select></label><p className="profession-desc">{profession.description} Dream: {dream.description}</p></article>; })}</div></>}
        {setupStep === 3 && <><div className="setup-card-top"><div><h2>Ready to start?</h2><p>Review the table before the Bank opens the first round.</p></div><span className="step-counter">STEP 04 / 04</span></div><div className="review-banner"><span className="review-banner-icon"><Check size={21} /></span><div><strong>Everything is set.</strong><p>{playersSetup.length} players · Rat Race starting board · Local autosave enabled</p></div></div><div className="review-player-list">{playersSetup.map((p, i) => { const prof = PROFESSIONS.find((x) => x.id === p.professionId) ?? PROFESSIONS[0]; const dream = DREAMS.find((x) => x.id === p.dreamId) ?? DREAMS[0]; return <div className="review-player" key={p.id}><span className="avatar" style={{ background: p.color }}>{initials(p.name || `P${i + 1}`)}</span><div className="review-player-main"><strong>{p.name || `Player ${i + 1}`}</strong><small>{prof.name} · Dream: {dream.name}</small></div><div className="review-player-cash"><strong>{formatGM(prof.startingCash)}</strong><small>Starting cash</small></div><div className="review-player-cash"><strong>{formatMonthly(prof.salary - prof.livingExpense - prof.otherExpense)}</strong><small>Initial cash flow</small></div></div>; })}</div><div className="review-settings"><span><strong>Victory</strong>{config.victoryMode === 'dream' ? 'Financial Dream' : `Cash flow ${formatMonthly(config.cashFlowTarget)}`}</span><span><strong>Bankruptcy restart</strong>{config.restartAfterBankruptcy ? 'Enabled' : 'Disabled'}</span><span><strong>Turn limit</strong>{config.turnLimit === null ? 'None' : config.turnLimit}</span></div><label className="acknowledge"><input type="checkbox" defaultChecked /> <span>I understand this is a fictional financial strategy game and I have reviewed the selected rules.</span></label></>}
        <div className="setup-footer">{setupStep > 0 ? <button className="button button-ghost" onClick={() => setSetupStep((s) => s - 1)}><ArrowLeft size={16} /> Back</button> : <span className="setup-footnote">You can review the rules before play starts.</span>}{setupStep < 3 ? <button className="button button-primary" onClick={() => { if (setupStep === 0) { const names = playersSetup.map((p) => p.name.trim().toLowerCase()); if (playersSetup.some((p) => !p.name.trim())) { setToast('Every player needs a display name.'); return; } if (new Set(names).size !== names.length) { setToast('Player names must be unique.'); return; } } setSetupStep((s) => s + 1); }}>{setupStep === 2 ? 'Review game' : 'Continue'} <ArrowRight size={16} /></button> : <button className="button button-primary" onClick={startGame}><Zap size={16} /> Start Wealth Loop</button>}</div>
      </section><div className="setup-smallprint"><LockKeyhole size={13} /> Your game is saved only in this browser. It is not uploaded to a server.</div>
    </main>
    {toast && <Toast message={toast} />}
  </div>;

  if (!game || !current || !financials) return <div className="load-error"><CircleDollarSign size={32} /><h1>No saved game found</h1><p>Start a new game to begin.</p><button className="button button-primary" onClick={() => setScreen('home')}>Return home</button></div>;
  if (screen === 'results' || game.phase === 'finished') return <ResultsScreen game={game} onNewGame={() => { setGame(null); setUndoStack([]); localStorage.removeItem(SAVE_KEY); localStorage.removeItem(UNDO_KEY); setScreen('setup'); setPlayersSetup([nextSetup(0), nextSetup(1)]); setConfig(DEFAULT_CONFIG); setSetupStep(0); }} onHome={() => setScreen('home')} />;

  return <div className={`app-shell game-shell ${prefs.reducedMotion ? 'reduce-motion' : ''} ${prefs.compactDisplay ? 'compact-display' : ''}`}>
    <header className="game-topbar"><button className="brand brand-button" onClick={home}><span className="brand-mark"><CircleDollarSign size={22} /></span><span><strong>WEALTH LOOP</strong><small>FINANCIAL STRATEGY GAME</small></span></button><div className="game-top-meta"><span className="turn-pill"><span className="turn-dot" /> ROUND {game.round} <i>·</i> TURN {game.turn}</span><span className="saved-indicator"><Save size={14} /> Saved locally</span></div><div className="game-top-actions"><button className="icon-button" disabled={!undoStack.length} onClick={undo} aria-label="Undo last action" title="Undo last action"><RotateCcw size={17} /></button><button className="icon-button" onClick={() => setShowGlossary(true)} aria-label="Rules and glossary" title="Rules and glossary"><HelpCircle size={17} /></button><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings"><Settings2 size={17} /></button><button className="icon-button" onClick={home} aria-label="Exit to home" title="Exit to home"><Home size={17} /></button></div></header>
    <div className="game-main-grid">
      <aside className="players-sidebar panel-card"><div className="panel-heading"><div><span className="overline">AT THE TABLE</span><h2>Players <span className="count-badge">{game.players.length}</span></h2></div><button className="icon-button subtle-icon" onClick={() => setShowGlossary(true)} aria-label="Player help"><HelpCircle size={15} /></button></div><div className="players-list">{game.players.map((p, i) => { const f = getFinancials(p); const isActive = i === game.currentPlayerIndex; return <button className={`player-row ${isActive ? 'player-row-active' : ''} ${p.bankrupt ? 'player-row-bankrupt' : ''}`} key={p.id} onClick={() => { setFilterPlayer(p.id); setWorkspaceTab('statement'); }}><span className="avatar player-list-avatar" style={{ background: p.color }}>{initials(p.name)}</span><span className="player-row-copy"><strong>{p.name}{isActive && <i className="active-mark" />}</strong><small>{p.bankrupt ? 'Bankrupt' : `${p.stage === 'rat-race' ? 'Rat Race' : 'Fast Track'} · ${p.profession.name}`}</small><span className="player-row-metrics"><b>{formatGM(p.cash)}</b><span className={f.cashFlow >= 0 ? 'positive-text' : 'negative-text'}>{formatMonthly(f.cashFlow)}</span></span></span></button>; })}</div><div className="sidebar-divider" /><div className="active-player-quick"><span className="overline">CURRENT TURN</span><div className="quick-player-head"><span className="avatar" style={{ background: current.color }}>{initials(current.name)}</span><div><strong>{current.name}</strong><small>{current.stage === 'rat-race' ? 'The Rat Race' : 'The Fast Track'}</small></div></div><div className="quick-stat-row"><span>Passive income</span><strong>{formatGM(financials.passiveIncome)}<small>/mo</small></strong></div><div className="quick-stat-row"><span>Expenses</span><strong>{formatGM(financials.totalExpenses)}<small>/mo</small></strong></div><div className="quick-stat-row"><span>Net worth</span><strong>{formatGM(financials.netWorth)}</strong></div><div className="exit-progress"><div className="exit-progress-label"><span>Rat Race exit</span><b>{financials.passiveIncome > financials.totalExpenses ? 'Ready' : `${formatGM(financials.passiveIncome)} / ${formatGM(financials.totalExpenses)}`}</b></div><div className="exit-progress-track"><span style={{ width: `${Math.min(100, financials.totalExpenses > 0 ? financials.passiveIncome / financials.totalExpenses * 100 : 100)}%` }} /></div><small>Passive income must exceed expenses.</small></div></div><div className="sidebar-footer"><span><i /> LOCAL GAME</span><span>v1.0</span></div></aside>

      <main className="board-column">
        <div className="board-title-row"><div><div className="overline">THE GAME BOARD</div><h1>{current.stage === 'rat-race' ? 'The Rat Race' : 'The Fast Track'} <span className={`stage-badge ${current.stage}`}>{current.stage === 'rat-race' ? 'BUILD' : 'GROW'}</span></h1><p>{current.stage === 'rat-race' ? 'Grow passive income until it beats your monthly expenses.' : 'Acquire businesses, reach your Dream, and secure the win.'}</p></div><div className="board-switch"><button className={boardView === 'rat-race' ? 'selected' : ''} onClick={() => setBoardView('rat-race')}>Rat Race</button><button className={boardView === 'fast-track' ? 'selected' : ''} onClick={() => setBoardView('fast-track')}>Fast Track</button></div></div>
        <Board stage={boardView} players={game.players} activePlayerId={current.id} rollPath={current.stage === boardView ? game.lastRollPath : []} />
        <div className="turn-action-card"><div className="turn-action-left"><div className="turn-action-icon">{game.phase === 'ready' ? <Dice5 size={22} /> : game.phase === 'rat-race-exit' ? <Trophy size={22} /> : game.phase === 'handover' ? <UsersIcon /> : <Sparkles size={22} />}</div><div><div className="turn-action-overline">{game.phase === 'ready' ? `${current.name.toUpperCase()}’S MOVE` : phaseLabel(game.phase)}</div><strong>{game.phase === 'ready' ? (current.skipTurns > 0 ? 'A skipped turn is due.' : 'Ready to roll?') : game.phase === 'handover' ? `Turn ${game.turn} is complete.` : game.phase === 'rat-race-exit' ? 'You can leave the Rat Race.' : game.phase === 'choose-die' ? 'Choose your movement.' : 'Resolve the current action.'}</strong><p>{game.lastEvent}</p>{game.phase === 'ready' && current.skipTurns > 0 && <small className="negative-text">{current.skipTurns} skipped turn(s) remaining · salary suspension: {current.salarySuspendedTurns}</small>}</div></div><div className="turn-action-controls">{game.phase === 'ready' && <button className="button button-primary" disabled={current.bankrupt} onClick={() => commit(startRoll)}><Dice5 size={17} /> Roll dice</button>}{game.phase === 'choose-die' && <div className="dice-choice">{game.dice.map((die, i) => <button key={`${die}-${i}`} className="button button-primary" onClick={() => commit((s) => chooseCharityDie(s, die))}>Move {die}</button>)}</div>}{game.phase === 'rat-race-exit' && <button className="button button-primary" onClick={() => commit(continueAfterExit)}><TrendingUp size={17} /> Enter Fast Track</button>}{game.phase === 'handover' && <button className="button button-primary" onClick={() => commit(nextPlayer)}><ArrowRight size={17} /> {current.skipTurns > 0 ? 'Continue turn order' : `Next player: ${activeFollowingPlayer(game).name}`}</button>}</div></div>
        {game.dice.length > 0 && <div className="dice-results" aria-live="polite"><div><span className="overline">LAST ROLL</span><div className="dice-row">{game.dice.map((die, i) => <span className="die-face" key={`${die}-${i}`}>{die}</span>)}{game.phase !== 'choose-die' && <strong className="dice-total">{game.rolledTotal}</strong>}</div></div><div className="dice-caption">{game.phase === 'choose-die' ? 'Choose either die to move.' : `${game.rolledTotal} ${game.rolledTotal === 1 ? 'space' : 'spaces'} moved · effects resolved in order`}</div></div>}
        <div className="board-legend"><span><i className="legend-dot dot-green" /> Income</span><span><i className="legend-dot dot-gold" /> Opportunity</span><span><i className="legend-dot dot-red" /> Expenses</span><span><i className="legend-dot dot-blue" /> Events</span></div>
        {game.config.tutorialPrompts && <div className="tip-strip"><span className="tip-icon"><Sparkles size={15} /></span><p><strong>Strategy tip</strong> {current.stage === 'rat-race' ? 'An investment’s monthly cash flow matters as much as its price. Check debt payments before buying.' : 'Fast Track businesses require the full price in cash. Keep enough liquidity for the Dream you chose.'}</p><button onClick={() => setShowHowTo(true)} className="text-button">Learn more <ArrowRight size={13} /></button></div>}
      </main>

      <aside className="finance-sidebar panel-card"><div className="panel-heading finance-heading"><div><span className="overline">FINANCIAL WORKSPACE</span><h2>Your numbers</h2></div><span className="currency-tag">BDT</span></div><div className="workspace-tabs" role="tablist">{([['overview','Overview'],['statement','Statement'],['assets','Assets & debt'],['transactions','Activity'],['help','Rules']] as [WorkspaceTab,string][]).map(([id,label]) => <button key={id} role="tab" aria-selected={workspaceTab === id} className={workspaceTab === id ? 'active' : ''} onClick={() => setWorkspaceTab(id)}>{label}</button>)}</div>
        <div className="workspace-content">
          {workspaceTab === 'overview' && <><div className="overview-intro"><span>MY FINANCIAL SNAPSHOT</span><small>Updated after every action</small></div><div className="overview-hero-metric"><div><span>Monthly cash flow</span><strong className={financials.cashFlow >= 0 ? 'positive-text' : 'negative-text'}>{formatMonthly(financials.cashFlow)}</strong></div><span className={`flow-icon ${financials.cashFlow >= 0 ? 'flow-up' : 'flow-down'}`}>{financials.cashFlow >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}</span></div><div className="overview-metric-grid"><Metric label="Cash on hand" value={formatGM(current.cash)} tone="neutral" /><Metric label="Passive income" value={`${formatGM(financials.passiveIncome)}/mo`} tone="positive" /><Metric label="Total expenses" value={`${formatGM(financials.totalExpenses)}/mo`} tone="negative" /><Metric label="Net worth" value={formatGM(financials.netWorth)} tone={financials.netWorth >= 0 ? 'gold' : 'negative'} /></div><div className="chart-panel"><div className="chart-title"><strong>Income vs. expenses</strong><span>Monthly</span></div><CashBar income={financials.totalIncome} expenses={financials.totalExpenses} /></div><div className="chart-panel"><div className="chart-title"><strong>Cash-flow trend</strong><span>{current.cashFlowHistory.length} points</span></div><WealthChart history={current.cashFlowHistory} /></div><div className="mini-dream-card"><span className="dream-symbol"><Target size={18} /></span><div><small>YOUR DREAM</small><strong>{DREAMS.find((d) => d.id === current.dreamId)?.name ?? 'Personal Dream'}</strong><span>Cost {formatGM(DREAMS.find((d) => d.id === current.dreamId)?.cost ?? 0)} · {current.stage === 'fast-track' ? 'Fast Track' : 'To unlock: Fast Track'}</span></div></div><div className="quick-actions-grid"><button onClick={() => setWorkspaceTab('assets')}><Building2 size={15} /> View assets</button><button onClick={() => setWorkspaceTab('statement')}><FileText size={15} /> Full statement</button></div></>}
          {workspaceTab === 'statement' && <FinancialStatement player={current} financials={financials} />}
          {workspaceTab === 'assets' && <AssetsWorkspace player={current} onBorrow={(amount) => commit((s) => { setLoanAmount(String(amount)); return (awaitlessBorrow(s, current.id, amount)); })} onRepay={(amount) => commit((s) => repayBankLoan(s, current.id, amount))} loanAmount={loanAmount} setLoanAmount={setLoanAmount} repayAmount={repayAmount} setRepayAmount={setRepayAmount} onToast={setToast} />}
          {workspaceTab === 'transactions' && <TransactionsWorkspace transactions={game.transactions} players={game.players} filterPlayer={filterPlayer} setFilterPlayer={setFilterPlayer} filterType={filterType} setFilterType={setFilterType} />}
          {workspaceTab === 'help' && <RulesWorkspace player={current} state={game} onGlossary={() => setShowGlossary(true)} onHowTo={() => setShowHowTo(true)} />}
        </div></aside>
    </div>
    {game.phase === 'decision' && game.pending && <DecisionModal game={game} onClose={() => setToast('Resolve this card before the next turn.')} onInvestment={(a, q) => commit((s) => resolveInvestment(s, a, q))} onBusiness={(a) => commit((s) => resolveBusiness(s, a))} onExpense={(a) => commit((s) => resolveExpense(s, a))} onLife={(a) => commit((s) => resolveLifeEvent(s, a))} onCharity={(a) => commit((s) => resolveCharity(s, a))} onDream={(a) => commit((s) => resolveDream(s, a))} onMarketSale={(id) => commit((s) => resolveMarketSale(s, id))} onNotice={() => commit(resolveNotice)} quantity={shareQuantity} setQuantity={setShareQuantity} />}
    {game.phase === 'insufficient' && game.pending?.type === 'payment' && <PaymentModal player={current} payment={game.pending} maxBorrow={canBankBorrow(current)} onPay={() => commit((s) => resolvePayment(s, 'pay'))} onBorrow={() => commit((s) => resolvePayment(s, 'borrow'))} onBankruptcy={() => commit((s) => declareBankruptcy(s, current.id))} onClose={() => setToast('This payment must be resolved before play can continue.')} />}
    {game.phase === 'rat-race-exit' && <MilestoneModal player={current} financials={financials} onContinue={() => commit(continueAfterExit)} />}
    {showGlossary && <InfoModal title="Rules & financial glossary" onClose={() => setShowGlossary(false)}><div className="glossary-list">{glossary.map(([term, description]) => <div key={term}><strong>{term}</strong><p>{description}</p></div>)}</div><h3 className="modal-subhead">Fast reference</h3><p className="modal-paragraph">Rat Race: roll one die. Fast Track: roll two dice. Payday/Cash Flow Day settles cash flow once per movement. Bank loans are capped at 20 GM and charge interest only each monthly settlement.</p></InfoModal>}
    {showHowTo && <InfoModal title="How to play" onClose={() => setShowHowTo(false)}><div className="howto-list"><div><b>01</b><section><strong>Roll and move</strong><p>The path and turn phase are controlled by the current game state. Resolve a card before the next player takes control.</p></section></div><div><b>02</b><section><strong>Read the impact</strong><p>Purchases and events update cash, assets, liabilities and monthly cash flow. You cannot spend cash you do not have.</p></section></div><div><b>03</b><section><strong>Escape, then win</strong><p>Passive income must exceed total expenses. In Fast Track, buy businesses with cash and complete your Dream or hit the configured target.</p></section></div></div></InfoModal>}
    {showSettings && <SettingsModal prefs={prefs} onChange={changePref} onClose={() => setShowSettings(false)} />}
    {showHomeConfirm && <ConfirmModal title="Return to the main menu?" message="Your current turn will be saved automatically. You can resume this game from the main menu on this device." confirmLabel="Save & return home" onCancel={() => setShowHomeConfirm(false)} onConfirm={() => { setShowHomeConfirm(false); setScreen('home'); }} />}
    {toast && <Toast message={toast} />}
  </div>;
}

function UsersIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function colorName(color: string): string { const idx = PLAYER_COLOR_OPTIONS.indexOf(color); return ['Emerald', 'Amber', 'Blue', 'Rose', 'Violet', 'Coral'][idx] ?? 'Custom'; }
function initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? '').join('') || '?'; }
function phaseLabel(phase: GamePhase): string { const labels: Record<GamePhase,string> = { ready:'TURN READY', 'choose-die':'CHARITY BENEFIT', decision:'ACTION REQUIRED', insufficient:'PAYMENT REQUIRED', 'rat-race-exit':'MILESTONE', handover:'TURN COMPLETE', finished:'GAME COMPLETE' }; return labels[phase]; }
function awaitlessBorrow(state: GameState, playerId: string, amount: number): GameState {
  // Kept as a small wrapper so the panel's transaction uses the same validated engine rule.
  return borrowBankLoan(state, playerId, amount);
}

function Board({ stage, players, activePlayerId, rollPath }: { stage: Stage; players: Player[]; activePlayerId: string; rollPath: number[] }) {
  const spaces = stage === 'rat-race' ? RAT_RACE_BOARD : FAST_TRACK_BOARD;
  const coords = boardCoordinates(stage);
  const gridSize = stage === 'rat-race' ? 7 : 5;
  const tokens = players.filter((p) => p.stage === stage && p.position >= 0 && p.position < spaces.length && !p.bankrupt);
  const active = players.find((p) => p.id === activePlayerId);
  return <section className={`board-card ${stage === 'fast-track' ? 'board-fast' : ''}`} aria-label={`${stage === 'rat-race' ? 'Rat Race' : 'Fast Track'} board`}>
    <div className="board-card-top"><div className="board-caption"><span className="board-caption-icon"><Compass size={16} /></span><div><strong>{stage === 'rat-race' ? 'THE RAT RACE LOOP' : 'THE FAST TRACK'}</strong><small>{spaces.length} spaces · clockwise movement</small></div></div><div className="board-progress"><span>{tokens.filter((p) => p.stage === stage).length} tokens on track</span><span className="board-stage-indicator"><i className={stage === 'rat-race' ? 'indicator-green' : 'indicator-gold'} /> {stage === 'rat-race' ? 'BUILD PHASE' : 'GROW PHASE'}</span></div></div>
    <div className="board-grid-scroller"><div className={`board-grid board-grid-${gridSize}`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(${stage === 'rat-race' ? 66 : 88}px, 1fr))`, gridTemplateRows: `repeat(${gridSize}, minmax(${stage === 'rat-race' ? 66 : 88}px, 1fr))` }}>
      {spaces.map((space, i) => { const at = coords[i]; const occupants = tokens.filter((p) => p.position === i); const visited = rollPath.includes(i); return <div key={`${space}-${i}`} className={`board-space ${spaceClass(space)} ${occupants.some((p) => p.id === activePlayerId) ? 'space-active' : ''} ${visited ? 'space-visited' : ''} ${i === 0 ? 'space-start' : ''}`} style={{ gridColumn: at.col + 1, gridRow: at.row + 1 }}><span className="space-number">{i + 1}</span><span className="space-icon">{iconForSpace(space)}</span><span className="space-label">{space}</span>{i === 0 && <span className="start-label">START</span>}{occupants.length > 0 && <div className="space-tokens">{occupants.map((p) => <span title={p.name} key={p.id} className={`board-token ${p.id === activePlayerId ? 'token-current' : ''}`} style={{ background: p.color }}>{initials(p.name)}</span>)}</div>}</div>; })}
      <div className="board-center" style={{ gridColumn: `2 / ${gridSize}`, gridRow: `2 / ${gridSize}` }}><div className="center-logo"><span className="center-mark"><CircleDollarSign size={27} /></span><strong>WEALTH<br />LOOP</strong><small>{stage === 'rat-race' ? 'BUILD YOUR BASE' : 'MAKE IT COUNT'}</small><div className="center-divider" /><div className="center-player-chip"><span className="avatar" style={{ background: active?.color ?? '#45c4a0' }}>{initials(active?.name ?? 'P')}</span><span><small>ACTIVE PLAYER</small><strong>{active?.name ?? '—'}</strong></span></div></div></div>
    </div></div><div className="board-footer"><span><i className="footer-token" style={{ background: active?.color ?? '#45c4a0' }} /> Active token: <strong>{active?.name}</strong></span><span>Landing space: <strong>{active && active.position >= 0 ? `${active.position + 1}. ${spaces[active.position]}` : 'Fast Track entrance'}</strong></span></div>
  </section>;
}

function FinancialStatement({ player, financials }: { player: Player; financials: Financials }) {
  const rows = [
    { section: 'INCOME', lines: [['Employment salary', financials.salary], ['Other recurring income', financials.otherIncome], ['Asset income', financials.assetIncome], ['TOTAL INCOME', financials.totalIncome]] },
    { section: 'EXPENSES', lines: [['Living expenses', financials.livingExpense], ['Employment expenses', financials.employmentExpense], ['Children', financials.childExpense], ['Other recurring expenses', financials.otherRecurringExpense], ['Asset operating costs', financials.assetOperatingExpense], ['Asset loan payments', financials.assetLoanPayments], ['Bank loan interest', financials.bankLoanPayments], ['Other debt payments', financials.otherDebtPayments], ['TOTAL EXPENSES', financials.totalExpenses]] },
  ];
  return <div className="statement-workspace"><div className="statement-note"><FileText size={17} /><span><strong>{player.name}’s financial statement</strong><small>All recurring amounts are monthly. Figures update after every resolved action.</small></span></div>{rows.map((section) => <section className="statement-section" key={section.section}><h3>{section.section}</h3>{section.lines.map(([name, value]) => <div className={`statement-row ${String(name).startsWith('TOTAL') ? 'statement-total' : ''}`} key={String(name)}><span>{name}</span><strong>{formatGM(Number(value))}</strong></div>)}</section>)}<section className="statement-section asset-totals"><h3>POSITION</h3><div className="statement-row"><span>Cash on hand</span><strong>{formatGM(player.cash)}</strong></div><div className="statement-row"><span>Total assets</span><strong>{formatGM(financials.assetValue + player.cash)}</strong></div><div className="statement-row"><span>Outstanding liabilities</span><strong className="negative-text">−{formatGM(financials.totalDebt)}</strong></div><div className="statement-row statement-total"><span>NET WORTH</span><strong>{formatGM(financials.netWorth)}</strong></div></section><div className="statement-highlight"><span>MONTHLY CASH FLOW</span><strong className={financials.cashFlow >= 0 ? 'positive-text' : 'negative-text'}>{formatMonthly(financials.cashFlow)}</strong><small>Passive income: {formatGM(financials.passiveIncome)} · Excluding salary</small></div><p className="micro-copy">Income from financed assets is recorded as gross recurring income; their operating cost and loan payment are listed separately to avoid double-counting.</p></div>;
}

function AssetsWorkspace({ player, onBorrow, onRepay, loanAmount, setLoanAmount, repayAmount, setRepayAmount, onToast }: { player: Player; onBorrow: (amount: number) => void; onRepay: (amount: number) => void; loanAmount: string; setLoanAmount: (v: string) => void; repayAmount: string; setRepayAmount: (v: string) => void; onToast: (s: string) => void }) {
  const bankLoan = player.liabilities.find((x) => x.kind === 'bank-loan');
  const maxBorrow = canBankBorrow(player);
  return <div className="assets-workspace"><div className="assets-summary-row"><div><span>ASSET VALUE</span><strong>{formatGM(player.assets.reduce((s, a) => s + a.currentValue, 0))}</strong></div><div><span>DEBT</span><strong className={player.liabilities.length ? 'negative-text' : ''}>{formatGM(player.liabilities.reduce((s, l) => s + l.principal, 0))}</strong></div></div><div className="subsection-title"><h3>Owned assets <span>{player.assets.length}</span></h3></div>{player.assets.length === 0 ? <EmptyState icon={<Building2 size={22} />} title="No assets yet" text="Investment opportunities can turn part of your cash into recurring income." /> : <div className="owned-assets-list">{player.assets.map((a) => <div key={a.id} className="owned-asset-card"><span className={`asset-type-icon asset-${a.category}`}>{a.category === 'real-estate' ? <Building2 size={16} /> : a.category === 'business' ? <BriefcaseBusiness size={16} /> : <BarChart3 size={16} />}</span><div className="owned-asset-main"><strong>{a.name}</strong><small>{assetCategoryLabel(a.category)} · Bought for {formatGM(a.purchasePrice)}</small><span>Value {formatGM(a.currentValue)} · {formatMonthly(a.monthlyIncome - a.operatingExpense - a.loanPayment)}</span></div></div>)}</div>}<div className="subsection-title debt-title"><h3>Liabilities <span>{player.liabilities.length}</span></h3></div>{player.liabilities.length === 0 ? <p className="quiet-empty">No outstanding debt.</p> : player.liabilities.map((l) => <div className="liability-row" key={l.id}><span className="liability-icon"><Landmark size={15} /></span><div><strong>{l.name}</strong><small>{formatGM(l.principal)} outstanding · {formatGM(l.monthlyPayment)}/mo</small></div></div>)}<div className="loan-tool"><div className="loan-tool-heading"><span><Landmark size={16} /></span><div><strong>Bank loan facility</strong><small>Limit 20 GM · interest-only payment</small></div></div><div className="loan-status"><span>Available to borrow</span><strong>{formatGM(maxBorrow)}</strong></div><div className="loan-input-row"><label>Borrow (whole GM)<input type="number" min="1" max={maxBorrow} step="1" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} /></label><button className="button button-secondary" disabled={maxBorrow < 1 || !Number.isInteger(Number(loanAmount)) || Number(loanAmount) < 1 || Number(loanAmount) > maxBorrow} onClick={() => onBorrow(Number(loanAmount))}>Borrow</button></div><div className="loan-input-row"><label>Repay principal<input type="number" min="1" max={bankLoan?.principal ?? 0} step="1" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} /></label><button className="button button-outline" disabled={!bankLoan || !Number.isInteger(Number(repayAmount)) || Number(repayAmount) < 1 || Number(repayAmount) > (bankLoan?.principal ?? 0) || Number(repayAmount) > player.cash} onClick={() => { try { onRepay(Number(repayAmount)); } catch { onToast('Could not repay that amount. Check cash and principal.'); } }}>Repay</button></div><p className="loan-footnote">Monthly interest is {formatGM(bankLoan?.monthlyPayment ?? 0)} at the current rate. Repaying principal lowers future interest but does not refund past payments.</p></div></div>;
}
function assetCategoryLabel(category: string): string { return ({ 'real-estate':'Real estate', stock:'Stocks', fund:'Fund', cd:'Certificate deposit', business:'Business', other:'Other' } as Record<string,string>)[category] ?? category; }
function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>; }

function TransactionsWorkspace({ transactions, players, filterPlayer, setFilterPlayer, filterType, setFilterType }: { transactions: GameState['transactions']; players: Player[]; filterPlayer: string; setFilterPlayer: (s: string) => void; filterType: string; setFilterType: (s: string) => void }) {
  const types = Array.from(new Set(transactions.map((t) => t.type))).sort();
  const filtered = transactions.filter((t) => (filterPlayer === 'all' || t.playerId === filterPlayer) && (filterType === 'all' || t.type === filterType));
  return <div className="transactions-workspace"><div className="transaction-filter-head"><span className="overline">AUDIT TRAIL</span><strong>{filtered.length} records</strong></div><div className="transaction-filters"><label><span>Player</span><select value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value)}><option value="all">All players</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Type</span><select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">All activity</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></label></div>{filtered.length === 0 ? <EmptyState icon={<ListFilter size={20} />} title="No matching activity" text="Try a different player or activity filter." /> : <div className="transaction-list">{filtered.map((t) => <article className="transaction-item" key={t.id}><span className={`transaction-mark ${t.cashImpact > 0 ? 'mark-positive' : t.cashImpact < 0 ? 'mark-negative' : ''}`}>{t.cashImpact > 0 ? <Plus size={13} /> : t.cashImpact < 0 ? <Minus size={13} /> : <CircleDollarSign size={13} />}</span><div className="transaction-main"><strong>{t.summary}</strong><small>Turn {t.turn} · {t.playerName} · {t.type}</small>{t.cashFlowImpact !== undefined && <small>Cash flow impact {formatMonthly(t.cashFlowImpact)}</small>}</div><span className={`transaction-impact ${t.cashImpact > 0 ? 'positive-text' : t.cashImpact < 0 ? 'negative-text' : ''}`}>{t.cashImpact > 0 ? '+' : t.cashImpact < 0 ? '−' : ''}{t.cashImpact !== 0 ? formatGM(Math.abs(t.cashImpact)) : '—'}</span></article>)}</div>}<p className="micro-copy">Newest activity appears first. Records are generated from real game-state changes.</p></div>;
}

function RulesWorkspace({ player, state, onGlossary, onHowTo }: { player: Player; state: GameState; onGlossary: () => void; onHowTo: () => void }) {
  return <div className="rules-workspace"><div className="rules-callout"><span><HelpCircle size={18} /></span><div><strong>What can I do right now?</strong><p>{state.phase === 'ready' ? 'Roll to move. Your die count depends on your stage and any Charity benefit.' : state.phase === 'handover' ? 'Finish the handover to give the next player their turn.' : 'Complete the pending card or payment before the turn advances.'}</p></div></div><div className="rules-mini-list"><div><span>01</span><div><strong>Movement</strong><p>{player.stage === 'rat-race' ? 'One six-sided die. Cross or land on Payday to settle monthly cash flow once.' : 'Two six-sided dice. Cross or land on Cash Flow Day to settle monthly cash flow once.'}</p></div></div><div><span>02</span><div><strong>Borrowing</strong><p>Bank loans are capped at 20 GM per player and charge interest-only payments. Fast Track businesses cannot be financed with these loans.</p></div></div><div><span>03</span><div><strong>Win condition</strong><p>{state.config.victoryMode === 'dream' ? 'Complete your selected Dream by paying its full cost on a Dream space in the Fast Track.' : `Reach ${formatMonthly(state.config.cashFlowTarget)} in monthly cash flow on the Fast Track.`}</p></div></div></div><button className="button button-outline button-full" onClick={onGlossary}><FileText size={16} /> Rules and financial glossary</button><button className="button button-ghost button-full" onClick={onHowTo}><HelpCircle size={16} /> Open how to play</button></div>;
}

function DecisionModal({ game, onClose, onInvestment, onBusiness, onExpense, onLife, onCharity, onDream, onMarketSale, onNotice, quantity, setQuantity }: {
  game: GameState; onClose: () => void; onInvestment: (a: 'buy' | 'decline', q?: number) => void; onBusiness: (a: 'buy' | 'decline') => void;
  onExpense: (a: 'apply' | 'borrow' | 'bankruptcy') => void; onLife: (a: 'apply' | 'borrow' | 'bankruptcy') => void;
  onCharity: (a: boolean) => void; onDream: (a: 'inspect' | 'complete' | 'continue') => void; onMarketSale: (id?: string) => void; onNotice: () => void;
  quantity: string; setQuantity: (v: string) => void;
}) {
  const player = getActivePlayer(game); const f = getFinancials(player); const pending = game.pending!;
  const actionContext = (() => {
    if (pending.type === 'investment') return { title: pending.card.name, tag: pending.card.size === 'small' ? 'SMALL OPPORTUNITY' : 'BIG OPPORTUNITY', description: pending.card.description, icon: <Building2 size={20} /> };
    if (pending.type === 'business') return { title: pending.card.name, tag: 'FAST TRACK BUSINESS', description: pending.card.description, icon: <BriefcaseBusiness size={20} /> };
    if (pending.type === 'expense') return { title: pending.card.name, tag: 'EXPENSE CARD', description: pending.card.description, icon: <TrendingDown size={20} /> };
    if (pending.type === 'life') return { title: pending.card.name, tag: 'LIFE EVENT', description: pending.card.description, icon: <Sparkles size={20} /> };
    if (pending.type === 'charity') return { title: 'A moment to give back', tag: 'CHARITY SPACE', description: 'Donate 10% of positive monthly cash flow, rounded down to the nearest 0.5 GM, to earn a two-dice choice for your next three active turns.', icon: <HeartHandshake size={20} /> };
    if (pending.type === 'dream') return { title: pending.dream.name, tag: 'YOUR DREAM', description: pending.dream.description, icon: <Target size={20} /> };
    if (pending.type === 'market-sale') return { title: pending.card.name, tag: 'MARKET OFFER', description: pending.card.description, icon: <TrendingUp size={20} /> };
    return pending.type === 'notice' ? { title: pending.title, tag: 'SPACE RESOLVED', description: pending.description, icon: <CircleDollarSign size={20} /> } : { title: 'Payment required', tag: 'PAYMENT REQUIRED', description: pending.reason, icon: <ShieldAlert size={20} /> };
  })();
  const isUnit = pending.type === 'investment' && pending.card.unitPrice !== undefined;
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const required = pending.type === 'investment' ? (isUnit ? (pending.card.unitPrice ?? pending.card.price) * qty : pending.card.downPayment) : 0;
  const loan = pending.type === 'investment' && !isUnit ? pending.card.loanAmount : 0;
  const newMonthly = pending.type === 'investment' ? (isUnit ? pending.card.monthlyIncome * qty : pending.card.monthlyIncome - pending.card.operatingExpense - pending.card.loanPayment) : 0;
  const canBuy = pending.type === 'investment' ? player.cash >= required : false;
  const businessAffordable = pending.type === 'business' && player.cash >= pending.card.price;
  const expenseCost = pending.type === 'expense' ? pending.card.cost : pending.type === 'life' && pending.card.effect === 'repair' ? (pending.card.value ?? 2) : 0;
  const canPayCard = player.cash >= expenseCost;
  const borrowAllowed = canBankBorrow(player) >= Math.ceil(Math.max(0, expenseCost - player.cash));
  const dreamAffordable = pending.type === 'dream' && canCompleteDream(player) && player.cash >= pending.dream.cost;
  return <div className="modal-backdrop decision-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div className="decision-head"><span className="decision-icon">{actionContext.icon}</span><div><span className="overline">{actionContext.tag}</span><h2 id="decision-title">{actionContext.title}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={17} /></button></div><p className="decision-description">{actionContext.description}</p>
    {pending.type === 'investment' && <><div className="impact-grid"><ImpactItem label="Purchase price" value={formatGM(pending.card.price)} /><ImpactItem label={isUnit ? 'Price / unit' : 'Down payment'} value={formatGM(isUnit ? (pending.card.unitPrice ?? pending.card.price) : pending.card.downPayment)} /><ImpactItem label="Loan" value={formatGM(loan)} /><ImpactItem label="Monthly net impact" value={formatMonthly(newMonthly)} positive={newMonthly >= 0} /></div>{isUnit && <label className="quantity-label">Whole units or shares<input type="number" min="1" max={Math.max(1, Math.floor(player.cash / (pending.card.unitPrice ?? pending.card.price)))} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>}<div className="impact-preview"><span>Cash before</span><strong>{formatGM(player.cash)}</strong><span>Pay now</span><strong>{formatGM(required)}</strong><span>Cash after</span><strong>{formatGM(player.cash - required)}</strong><span>New liability</span><strong>{formatGM(loan)}</strong><span>Monthly income</span><strong>{formatGM(isUnit ? pending.card.monthlyIncome * qty : pending.card.monthlyIncome)}</strong><span>Operating + loan costs</span><strong>{formatGM(isUnit ? 0 : pending.card.operatingExpense + pending.card.loanPayment)}</strong></div><div className="risk-note"><ShieldAlert size={15} /><span>Risk note: {pending.card.risk}. Values and future returns are fictional game mechanics.</span></div><div className="decision-actions"><button className="button button-ghost" onClick={() => onInvestment('decline')}>Decline offer</button><button className="button button-primary" disabled={!canBuy || (isUnit && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1))} onClick={() => onInvestment('buy', qty)}>{canBuy ? 'Buy investment' : `Need ${formatGM(Math.max(0, required - player.cash))} more`} <ArrowRight size={16} /></button></div></>}
    {pending.type === 'business' && <><div className="impact-grid"><ImpactItem label="Full purchase price" value={formatGM(pending.card.price)} /><ImpactItem label="Monthly net cash flow" value={formatMonthly(pending.card.monthlyNet)} positive /><ImpactItem label="Cash available" value={formatGM(player.cash)} /><ImpactItem label="Cash after purchase" value={formatGM(player.cash - pending.card.price)} /></div><div className="risk-note"><ShieldAlert size={15} /><span>{pending.card.risk}. Bank loans cannot be used for Fast Track business purchases.</span></div><div className="decision-actions"><button className="button button-ghost" onClick={() => onBusiness('decline')}>Decline</button><button className="button button-primary" disabled={!businessAffordable} onClick={() => onBusiness('buy')}>{businessAffordable ? 'Buy business' : `Need ${formatGM(pending.card.price - player.cash)} more`} <ArrowRight size={16} /></button></div></>}
    {pending.type === 'expense' && <><div className="impact-grid"><ImpactItem label="Pay now" value={formatGM(pending.card.cost)} /><ImpactItem label="Cash available" value={formatGM(player.cash)} /><ImpactItem label="Recurring effect" value={pending.card.effect === 'new-car' || pending.card.effect === 'insurance' ? `−${formatGM(pending.card.value ?? 0)}/mo` : pending.card.effect === 'education' ? `+${formatGM(pending.card.value ?? 0)}/mo salary` : pending.card.effect === 'baby' ? 'Child +1' : 'None'} /></div><div className="decision-actions">{pending.card.cost > player.cash && !borrowAllowed && <button className="button button-ghost" onClick={() => onExpense('bankruptcy')}>Declare bankruptcy</button>}{pending.card.cost > player.cash && <button className="button button-outline" disabled={!borrowAllowed || Math.ceil(pending.card.cost - player.cash) < 1} onClick={() => onExpense('borrow')}>Borrow & pay ({formatGM(Math.ceil(pending.card.cost - player.cash))})</button>}<button className="button button-primary" disabled={!canPayCard} onClick={() => onExpense('apply')}>{pending.card.cost > 0 ? `Pay ${formatGM(pending.card.cost)}` : 'Apply effect'} <ArrowRight size={16} /></button></div>{!canPayCard && !borrowAllowed && <p className="error-note">Your cash and remaining Bank Loan allowance cannot cover this expense.</p>}</>}
    {pending.type === 'life' && <><div className="impact-grid"><ImpactItem label="Immediate cash effect" value={pending.card.effect === 'inheritance' ? `+${formatGM(pending.card.value ?? 5)}` : pending.card.effect === 'repair' ? `−${formatGM(pending.card.value ?? 2)}` : '৳0'} positive={pending.card.effect === 'inheritance'} /><ImpactItem label="Monthly impact" value={pending.card.effect === 'promotion' ? `+${formatGM(pending.card.value ?? 3)}` : pending.card.effect === 'side-business' ? `+${formatGM(pending.card.value ?? 2)}` : pending.card.effect === 'inflation' ? `−${formatGM(pending.card.value ?? 1)} per player` : pending.card.effect === 'job-loss' ? 'Salary suspended' : 'No change'} /><ImpactItem label="Cash available" value={formatGM(player.cash)} /></div><div className="decision-actions">{pending.card.effect === 'repair' && player.cash < (pending.card.value ?? 2) && !borrowAllowed && <button className="button button-ghost" onClick={() => onLife('bankruptcy')}>Declare bankruptcy</button>}{pending.card.effect === 'repair' && player.cash < (pending.card.value ?? 2) && <button className="button button-outline" disabled={!borrowAllowed} onClick={() => onLife('borrow')}>Borrow & pay</button>}<button className="button button-primary" disabled={pending.card.effect === 'repair' && !canPayCard} onClick={() => onLife('apply')}>{pending.card.effect === 'repair' ? `Pay ${formatGM(pending.card.value ?? 2)}` : 'Apply life event'} <ArrowRight size={16} /></button></div></>}
    {pending.type === 'charity' && <><div className="impact-grid"><ImpactItem label="Suggested donation" value={formatGM(Math.floor(Math.max(0, f.cashFlow) * 0.1 * 2) / 2)} /><ImpactItem label="Cash available" value={formatGM(player.cash)} /><ImpactItem label="Benefit" value="2 dice · 3 turns" /></div><p className="modal-paragraph">This is optional. The benefit cannot stack; a new donation replaces any remaining duration.</p><div className="decision-actions"><button className="button button-ghost" onClick={() => onCharity(false)}>Skip donation</button><button className="button button-primary" disabled={player.cash < Math.floor(Math.max(0, f.cashFlow) * 0.1 * 2) / 2} onClick={() => onCharity(true)}>Donate & earn benefit <ArrowRight size={16} /></button></div></>}
    {pending.type === 'dream' && <><div className="dream-modal-banner"><span><Target size={22} /></span><div><small>YOUR SELECTED DREAM</small><strong>{pending.dream.name}</strong><p>{pending.dream.description}</p></div></div><div className="impact-grid"><ImpactItem label="Dream cost" value={formatGM(pending.dream.cost)} /><ImpactItem label="Cash available" value={formatGM(player.cash)} /><ImpactItem label="After purchase" value={formatGM(player.cash - pending.dream.cost)} /></div><div className="requirements-list">{pending.dream.requirements.map((r) => <span key={r}><Check size={14} /> {r}</span>)}</div><div className="decision-actions"><button className="button button-ghost" onClick={() => onDream('continue')}>Not now</button><button className="button button-primary" disabled={!dreamAffordable} onClick={() => onDream('complete')}>{dreamAffordable ? 'Complete Dream' : player.stage !== 'fast-track' ? 'Reach Fast Track first' : `Need ${formatGM(pending.dream.cost - player.cash)} more`} <Trophy size={16} /></button></div></>}
    {pending.type === 'market-sale' && <><div className="market-assets-list">{pending.eligibleAssetIds.map((id) => { const asset = player.assets.find((x) => x.id === id); if (!asset) return null; const price = Math.round(asset.currentValue * (pending.card.factor ?? 1.4) * 2) / 2; const payoff = asset.liabilityId ? player.liabilities.find((x) => x.id === asset.liabilityId)?.principal ?? 0 : 0; return <button className="market-sale-option" key={id} onClick={() => onMarketSale(id)}><span className="asset-type-icon"><Building2 size={16} /></span><span><strong>{asset.name}</strong><small>Sale {formatGM(price)} · Debt payoff {formatGM(payoff)}</small></span><span className="sale-proceeds">{formatGM(price - payoff)}<small>cash proceeds</small></span><ArrowRight size={16} /></button>; })}</div><div className="decision-actions"><button className="button button-ghost" onClick={() => onMarketSale()}>Keep all assets</button></div></>}
    {pending.type === 'notice' && <><div className="notice-body"><span className="notice-check"><Check size={20} /></span><p>{pending.description}</p></div><div className="decision-actions"><button className="button button-primary" onClick={onNotice}>Continue <ArrowRight size={16} /></button></div></>}
    </section></div>;
}

function ImpactItem({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div className="impact-item"><span>{label}</span><strong className={positive ? 'positive-text' : ''}>{value}</strong></div>; }

function PaymentModal({ player, payment, maxBorrow, onPay, onBorrow, onBankruptcy, onClose }: { player: Player; payment: Extract<NonNullable<GameState['pending']>, { type: 'payment' }>; maxBorrow: number; onPay: () => void; onBorrow: () => void; onBankruptcy: () => void; onClose: () => void }) {
  const shortage = Math.ceil(Math.max(0, payment.amount - player.cash)); const borrowable = shortage > 0 && maxBorrow >= shortage;
  return <div className="modal-backdrop"><section className="decision-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><div className="decision-head"><span className="decision-icon danger-icon"><ShieldAlert size={20} /></span><div><span className="overline">PAYMENT REQUIRED</span><h2 id="payment-title">Not enough cash.</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button></div><p className="decision-description">{payment.reason}. No balance will silently fall below zero. Choose how to resolve the payment.</p><div className="payment-breakdown"><div><span>Required payment</span><strong>{formatGM(payment.amount)}</strong></div><div><span>Cash available</span><strong>{formatGM(player.cash)}</strong></div><div><span>Shortfall</span><strong className="negative-text">{formatGM(shortage)}</strong></div><div><span>Bank loan available</span><strong>{formatGM(maxBorrow)}</strong></div></div><div className="payment-options"><button className="payment-option" disabled={player.cash < payment.amount} onClick={onPay}><span className="pay-option-icon"><Wallet size={17} /></span><span><strong>Pay from cash</strong><small>Use available cash to settle the full amount.</small></span><ArrowRight size={16} /></button><button className="payment-option" disabled={!borrowable} onClick={onBorrow}><span className="pay-option-icon"><Landmark size={17} /></span><span><strong>Borrow {formatGM(shortage)} and pay</strong><small>{borrowable ? 'Adds a Bank Loan and future interest-only payments.' : 'The remaining Bank Loan allowance is too small.'}</small></span><ArrowRight size={16} /></button>{!borrowable && <button className="payment-option payment-option-danger" onClick={onBankruptcy}><span className="pay-option-icon"><ShieldAlert size={17} /></span><span><strong>Declare bankruptcy</strong><small>Available because cash and the remaining Bank Loan cannot cover this payment.</small></span><ArrowRight size={16} /></button>}</div></section></div>;
}

function MilestoneModal({ player, financials, onContinue }: { player: Player; financials: Financials; onContinue: () => void }) {
  return <div className="modal-backdrop"><section className="milestone-modal" role="dialog" aria-modal="true" aria-labelledby="milestone-title"><div className="milestone-confetti"><span><Trophy size={28} /></span><span><Sparkles size={17} /></span><span><Coins size={18} /></span></div><div className="eyebrow">MILESTONE REACHED</div><h2 id="milestone-title">You’ve escaped<br /><em>the Rat Race.</em></h2><p>Your passive income now exceeds your total monthly expenses. Your next turn begins on the Fast Track.</p><div className="milestone-stats"><div><small>Passive income</small><strong>{formatGM(financials.passiveIncome)}<i>/mo</i></strong></div><div><small>Monthly expenses</small><strong>{formatGM(financials.totalExpenses)}<i>/mo</i></strong></div><div><small>Monthly surplus</small><strong className="positive-text">{formatGM(financials.passiveIncome - financials.totalExpenses)}</strong></div><div><small>Asset value</small><strong>{formatGM(financials.assetValue)}</strong></div></div><div className="milestone-dream"><Target size={16} /><span>Your next target</span><strong>{DREAMS.find((d) => d.id === player.dreamId)?.name ?? 'Your Dream'}</strong></div><button className="button button-primary button-full" onClick={onContinue}>Enter the Fast Track <ArrowRight size={17} /></button></section></div>;
}

function ResultsScreen({ game, onNewGame, onHome }: { game: GameState; onNewGame: () => void; onHome: () => void }) {
  const winner = game.players.find((p) => p.id === game.winnerId);
  const ranked = [...game.players].sort((a, b) => getFinancials(b).netWorth - getFinancials(a).netWorth);
  return <div className="results-shell"><header className="home-nav"><button className="brand brand-button" onClick={onHome}><span className="brand-mark"><CircleDollarSign size={24} /></span><span><strong>WEALTH LOOP</strong><small>FINAL RESULTS</small></span></button><button className="text-button" onClick={onHome}><Home size={15} /> Return home</button></header><main className="results-main"><div className="results-hero"><div className="result-crown"><Trophy size={28} /></div><div className="eyebrow">GAME COMPLETE · {game.turnsTaken} TURNS</div><h1>{winner ? `${winner.name} wins.` : 'Game over.'}</h1><p>{game.lastEvent || resultTitle(game)}</p>{winner && <div className="winner-pill"><span className="avatar" style={{ background: winner.color }}>{initials(winner.name)}</span><div><small>WEALTH LOOP WINNER</small><strong>{winner.name}</strong></div><Crown size={20} /></div>}</div><div className="results-table-card"><div className="results-table-header"><div><h2>Final standings</h2><p>Cash, passive income, monthly expenses, cash flow and net worth.</p></div><span className="currency-tag">BDT</span></div><div className="results-table-wrap"><table className="results-table"><thead><tr><th>Player</th><th>Cash</th><th>Passive income</th><th>Expenses / mo</th><th>Cash flow / mo</th><th>Net worth</th><th>Assets</th><th>Debt</th></tr></thead><tbody>{ranked.map((p) => { const f = getFinancials(p); return <tr key={p.id}><td><span className="result-player-cell"><span className="avatar" style={{ background: p.color }}>{initials(p.name)}</span><span><strong>{p.name} {p.id === winner?.id && <Crown size={13} />}</strong><small>{p.bankrupt ? 'Bankrupt' : p.stage === 'fast-track' ? 'Fast Track' : 'Rat Race'}</small></span></span></td><td>{formatGM(p.cash)}</td><td>{formatGM(f.passiveIncome)}</td><td>{formatGM(f.totalExpenses)}</td><td className={f.cashFlow >= 0 ? 'positive-text' : 'negative-text'}>{formatMonthly(f.cashFlow)}</td><td><strong>{formatGM(f.netWorth)}</strong></td><td>{p.assets.length}</td><td>{formatGM(f.totalDebt)}</td></tr>; })}</tbody></table></div><div className="results-dreams"><h3>Dream progress</h3><div className="results-dream-grid">{game.players.map((p) => <div key={p.id}><span className="avatar" style={{ background: p.color }}>{initials(p.name)}</span><div><strong>{p.name}</strong><small>{DREAMS.find((d) => d.id === p.dreamId)?.name ?? 'Dream'}</small></div><span className={`dream-status ${p.dreamCompleted ? 'completed' : ''}`}>{p.dreamCompleted ? 'Completed' : p.stage === 'fast-track' ? 'Reached Fast Track' : 'Not reached'}</span></div>)}</div></div></div><div className="results-actions"><button className="button button-outline" onClick={onHome}><Home size={16} /> Main menu</button><button className="button button-primary" onClick={onNewGame}><Plus size={17} /> New game</button></div></main><footer className="site-footer"><span>WEALTH LOOP <b>©</b> 2026</span><span>Fictional financial simulation · 1 GM = ৳1,000</span></footer></div>;
}

function InfoModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="info-modal" role="dialog" aria-modal="true" aria-label={title}><div className="info-modal-head"><div><span className="overline">WEALTH LOOP GUIDE</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="info-modal-body">{children}</div><div className="info-modal-foot"><span><LockKeyhole size={13} /> Your game remains on this device.</span><button className="button button-primary" onClick={onClose}>Got it <Check size={16} /></button></div></section></div>;
}
function SettingsModal({ prefs, onChange, onClose }: { prefs: Prefs; onChange: (key: keyof Prefs, value: boolean) => void; onClose: () => void }) {
  return <InfoModal title="Game settings" onClose={onClose}><div className="settings-modal-list"><label className="switch-row"><span><strong>Sound effects</strong><small>Play a soft tone after game actions.</small></span><input type="checkbox" checked={prefs.sound} onChange={(e) => onChange('sound', e.target.checked)} /><i /></label><label className="switch-row"><span><strong>Reduce motion</strong><small>Turn off or soften interface animations.</small></span><input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => onChange('reducedMotion', e.target.checked)} /><i /></label><label className="switch-row"><span><strong>Compact display</strong><small>Reduce spacing to fit more game information on screen.</small></span><input type="checkbox" checked={prefs.compactDisplay} onChange={(e) => onChange('compactDisplay', e.target.checked)} /><i /></label></div><p className="modal-footnote">Preferences are saved locally in this browser.</p></InfoModal>;
}
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return <div className="modal-backdrop"><section className="confirm-modal" role="dialog" aria-modal="true"><div className="confirm-icon"><ShieldAlert size={21} /></div><h2>{title}</h2><p>{message}</p><div className="confirm-actions"><button className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-primary" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
function Toast({ message }: { message: string }) { return <div className="toast" role="status"><ShieldAlert size={16} /><span>{message}</span></div>; }
