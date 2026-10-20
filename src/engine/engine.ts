import {
  BIG_OPPORTUNITIES, BUSINESSES, DREAMS, EXPENSES, LIFE_EVENTS, MARKETS, PROFESSIONS, SMALL_OPPORTUNITIES,
} from '../data/cards';
import type {
  Asset, DeckName, Decks, GameConfig, GameState, InvestmentCard, MarketCard, Player, PlayerSetup, ProfessionCard, Transaction,
} from '../types';

export const RAT_RACE_BOARD = [
  'Payday', 'Small Opportunity', 'Expense', 'Market', 'Small Opportunity', 'Life Event',
  'Payday', 'Big Opportunity', 'Expense', 'Small Opportunity', 'Charity', 'Market',
  'Payday', 'Baby', 'Big Opportunity', 'Expense', 'Small Opportunity', 'Life Event',
  'Payday', 'Market', 'Downsized', 'Small Opportunity', 'Big Opportunity', 'Expense',
] as const;
export const FAST_TRACK_BOARD = [
  'Business Opportunity', 'Cash Flow Day', 'Market', 'Blank', 'Business Opportunity', 'Expense',
  'Cash Flow Day', 'Dream', 'Market', 'Business Opportunity', 'Cash Flow Day', 'Blank', 'Expense',
  'Business Opportunity', 'Dream', 'Market',
] as const;

const PLAYER_COLORS = ['#45c4a0', '#f3b75b', '#8ea7ff', '#ee8491', '#c49af5', '#f08f55'];
const BANK_MAX = 20;

export interface Financials {
  salary: number; otherIncome: number; assetIncome: number; totalIncome: number;
  livingExpense: number; employmentExpense: number; otherRecurringExpense: number; childExpense: number; assetOperatingExpense: number;
  assetLoanPayments: number; bankLoanPayments: number; otherDebtPayments: number; totalExpenses: number;
  cashFlow: number; passiveIncome: number; assetValue: number; totalDebt: number; netWorth: number;
}

export function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDecks(): Decks {
  return {
    small: { drawPile: shuffle(SMALL_OPPORTUNITIES.map((x) => x.id)), discardPile: [] },
    big: { drawPile: shuffle(BIG_OPPORTUNITIES.map((x) => x.id)), discardPile: [] },
    market: { drawPile: shuffle(MARKETS.map((x) => x.id)), discardPile: [] },
    expense: { drawPile: shuffle(EXPENSES.map((x) => x.id)), discardPile: [] },
    life: { drawPile: shuffle(LIFE_EVENTS.map((x) => x.id)), discardPile: [] },
    business: { drawPile: shuffle(BUSINESSES.map((x) => x.id)), discardPile: [] },
  };
}

function cardIds(deck: DeckName): string[] {
  switch (deck) {
    case 'small': return SMALL_OPPORTUNITIES.map((x) => x.id);
    case 'big': return BIG_OPPORTUNITIES.map((x) => x.id);
    case 'market': return MARKETS.map((x) => x.id);
    case 'expense': return EXPENSES.map((x) => x.id);
    case 'life': return LIFE_EVENTS.map((x) => x.id);
    case 'business': return BUSINESSES.map((x) => x.id);
  }
}

export function drawCardId(state: GameState, deckName: DeckName): string | undefined {
  const deck = state.decks[deckName];
  if (deck.drawPile.length === 0 && deck.discardPile.length > 0) {
    deck.drawPile = shuffle(deck.discardPile);
    deck.discardPile = [];
  }
  return deck.drawPile.shift();
}

function discardCard(state: GameState, deck: DeckName, cardId?: string): void {
  if (!cardId) return;
  if (cardIds(deck).includes(cardId)) state.decks[deck].discardPile.push(cardId);
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getFinancials(player: Player): Financials {
  const salary = player.stage === 'fast-track' || player.salarySuspendedTurns > 0 ? 0 : player.profession.salary;
  const assetIncome = player.assets.reduce((sum, asset) => sum + asset.monthlyIncome, 0);
  const totalIncome = salary + player.otherIncome + assetIncome;
  const livingExpense = player.profession.livingExpense;
  // The basic rules treat profession-specific "other expenses" as employment-only costs after Fast Track entry.
  const employmentExpense = player.stage === 'rat-race' ? player.otherExpense : 0;
  const childExpense = player.childCount;
  const otherRecurringExpense = player.otherRecurringExpense;
  const assetOperatingExpense = player.assets.reduce((sum, asset) => sum + asset.operatingExpense, 0);
  const assetLoanPayments = player.assets.reduce((sum, asset) => sum + asset.loanPayment, 0);
  const bankLoanPayments = player.liabilities.filter((x) => x.kind === 'bank-loan').reduce((sum, x) => sum + x.monthlyPayment, 0);
  const otherDebtPayments = player.liabilities.filter((x) => x.kind !== 'bank-loan' && !x.assetId).reduce((sum, x) => sum + x.monthlyPayment, 0);
  const totalExpenses = livingExpense + employmentExpense + otherRecurringExpense + childExpense + assetOperatingExpense + assetLoanPayments + bankLoanPayments + otherDebtPayments;
  const passiveIncome = player.otherIncome + assetIncome;
  const assetValue = player.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalDebt = player.liabilities.reduce((sum, liability) => sum + liability.principal, 0);
  return {
    salary, otherIncome: player.otherIncome, assetIncome, totalIncome,
    livingExpense, employmentExpense, otherRecurringExpense, childExpense, assetOperatingExpense, assetLoanPayments,
    bankLoanPayments, otherDebtPayments, totalExpenses, cashFlow: totalIncome - totalExpenses,
    passiveIncome, assetValue, totalDebt, netWorth: player.cash + assetValue - totalDebt,
  };
}

function logTransaction(
  state: GameState, player: Player, type: string, summary: string, cashImpact = 0, cashFlowImpact?: number, reference?: string,
): void {
  const transaction: Transaction = {
    id: makeId('tx'), turn: state.turn, playerId: player.id, playerName: player.name, type, summary,
    cashImpact, ...(cashFlowImpact === undefined ? {} : { cashFlowImpact }), ...(reference ? { reference } : {}), timestamp: Date.now(),
  };
  state.transactions.unshift(transaction);
  if (state.transactions.length > 500) state.transactions.length = 500;
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function createGame(setups: PlayerSetup[], config: GameConfig): GameState {
  if (setups.length < 2 || setups.length > 6) throw new Error('Choose between 2 and 6 players.');
  const names = setups.map((x) => x.name.trim().toLocaleLowerCase());
  if (names.some((name) => !name) || new Set(names).size !== names.length) throw new Error('Player names must be present and unique.');
  const players: Player[] = setups.map((setup, index) => {
    const profession: ProfessionCard = PROFESSIONS.find((x) => x.id === setup.professionId) ?? PROFESSIONS[index % PROFESSIONS.length];
    const dream = DREAMS.find((x) => x.id === setup.dreamId) ?? DREAMS[index % DREAMS.length];
    return {
      id: setup.id || makeId('player'), name: setup.name.trim(), color: setup.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
      profession: { id: profession.id, name: profession.name, salary: profession.salary, livingExpense: profession.livingExpense, otherExpense: profession.otherExpense },
      stage: 'rat-race', position: 0, cash: profession.startingCash, childCount: 0, otherIncome: 0, otherExpense: profession.otherExpense,
      otherRecurringExpense: 0, pendingSalaryIncrease: 0, assets: [], liabilities: [], dreamId: dream.id, dreamCompleted: false, salarySuspendedTurns: 0, skipTurns: 0, charityTurns: 0,
      bankrupt: false, restartCount: 0, cashFlowHistory: [profession.salary - profession.livingExpense - profession.otherExpense], realizedProfitLoss: 0, salarySuspendedAtTurn: null,
    };
  });
  const state: GameState = {
    id: makeId('game'), players, currentPlayerIndex: 0, turn: 1, round: 1, phase: 'ready', decks: createDecks(), transactions: [],
    config: { ...config }, dice: [], rolledTotal: 0, lastRollPath: [], lastEvent: 'Your first turn begins. Build income-producing assets and protect your cash.',
    bankInterestRate: 0.1, saveUpdatedAt: Date.now(), turnsTaken: 0,
  };
  players.forEach((p) => logTransaction(state, p, 'Setup', `${p.profession.name} starts with ${formatGM(p.cash)} in cash.`, p.cash, p.profession.salary - p.profession.livingExpense - p.profession.otherExpense));
  return state;
}

export function formatGM(value: number): string {
  const taka = Math.round(value * 1000);
  const sign = taka < 0 ? '−' : '';
  const absolute = Math.abs(taka);
  return `${sign}৳${absolute.toLocaleString('en-BD')}`;
}

export function formatMonthly(value: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${prefix}${formatGM(Math.abs(value))}/mo`;
}

export function currentBoard(stage: Player['stage']): readonly string[] {
  return stage === 'rat-race' ? RAT_RACE_BOARD : FAST_TRACK_BOARD;
}

export function canBankBorrow(player: Player): number {
  const current = player.liabilities.filter((x) => x.kind === 'bank-loan').reduce((sum, x) => sum + x.principal, 0);
  return Math.max(0, BANK_MAX - current);
}

export function borrowBankLoan(state: GameState, playerId: string, amount: number): GameState {
  const next = clone(state);
  const player = next.players.find((x) => x.id === playerId);
  if (!player) throw new Error('Player not found.');
  if (!Number.isInteger(amount) || amount < 1) throw new Error('Borrow in whole GM increments.');
  const available = canBankBorrow(player);
  if (amount > available) throw new Error(`The Bank can lend up to ${formatGM(available)} more.`);
  player.cash += amount;
  const loan = player.liabilities.find((x) => x.kind === 'bank-loan');
  if (loan) {
    loan.principal += amount;
    loan.monthlyRate = next.bankInterestRate;
    loan.monthlyPayment = loan.principal * next.bankInterestRate;
  } else {
    player.liabilities.push({ id: makeId('debt'), name: 'Bank Loan', kind: 'bank-loan', principal: amount, monthlyPayment: amount * next.bankInterestRate, monthlyRate: next.bankInterestRate });
  }
  logTransaction(next, player, 'Loan', `Borrowed ${formatGM(amount)} from the Bank. Interest-only payment is ${formatGM(amount * next.bankInterestRate)}/month.`, amount, -amount * next.bankInterestRate, 'Bank Loan');
  return next;
}

export function repayBankLoan(state: GameState, playerId: string, amount: number): GameState {
  const next = clone(state);
  const player = next.players.find((x) => x.id === playerId);
  if (!player) throw new Error('Player not found.');
  const loan = player.liabilities.find((x) => x.kind === 'bank-loan');
  if (!loan || loan.principal <= 0) throw new Error('There is no outstanding Bank Loan.');
  if (!Number.isInteger(amount) || amount < 1 || amount > loan.principal) throw new Error('Enter a whole GM amount no greater than the principal.');
  if (player.cash < amount) throw new Error('Not enough cash to repay that amount.');
  player.cash -= amount;
  loan.principal -= amount;
  loan.monthlyPayment = loan.principal * (loan.monthlyRate ?? next.bankInterestRate);
  if (loan.principal === 0) player.liabilities = player.liabilities.filter((x) => x.id !== loan.id);
  logTransaction(next, player, 'Debt repayment', `Repaid ${formatGM(amount)} of Bank Loan principal.`, -amount, amount * (loan.monthlyRate ?? next.bankInterestRate), 'Bank Loan');
  next.saveUpdatedAt = Date.now();
  return next;
}

export function buyInvestment(state: GameState, playerId: string, card: InvestmentCard, quantity = 1): GameState {
  const next = clone(state);
  const player = next.players.find((x) => x.id === playerId);
  if (!player) throw new Error('Player not found.');
  const unitPrice = card.unitPrice ?? card.price;
  const isUnitAsset = card.unitPrice !== undefined || ['stock', 'fund', 'cd'].includes(card.category);
  const shares = isUnitAsset ? Math.max(1, Math.floor(quantity)) : 1;
  const downPayment = isUnitAsset ? unitPrice * shares : card.downPayment;
  const loanAmount = isUnitAsset ? 0 : card.loanAmount;
  if (player.cash < downPayment) throw new Error(`You need ${formatGM(downPayment)} available to buy this.`);
  player.cash -= downPayment;
  const assetId = makeId('asset');
  const liabilityId = loanAmount > 0 ? makeId('debt') : undefined;
  const value = isUnitAsset ? unitPrice * shares : card.price;
  const asset: Asset = {
    id: assetId, name: isUnitAsset && shares > 1 ? `${card.name} × ${shares}` : card.name, category: card.category,
    purchasePrice: isUnitAsset ? downPayment : card.price, currentValue: value,
    monthlyIncome: isUnitAsset ? card.monthlyIncome * shares : card.monthlyIncome,
    operatingExpense: isUnitAsset ? 0 : card.operatingExpense,
    loanPayment: isUnitAsset ? 0 : card.loanPayment,
    ...(liabilityId ? { liabilityId } : {}),
    ...(isUnitAsset ? { quantity: shares, unitPurchasePrice: unitPrice, unitCurrentPrice: unitPrice } : {}),
    description: card.description, risk: card.risk, liquidationMultiplier: isUnitAsset ? 0.7 : 0.5,
  };
  player.assets.push(asset);
  if (loanAmount > 0 && liabilityId) {
    player.liabilities.push({ id: liabilityId, name: `${card.name} Loan`, kind: card.category === 'real-estate' ? 'mortgage' : 'investment-loan', principal: loanAmount, monthlyPayment: card.loanPayment, assetId });
  }
  logTransaction(next, player, 'Investment purchase', `Bought ${asset.name} for ${formatGM(value)} (${formatGM(downPayment)} paid now${loanAmount ? `; ${formatGM(loanAmount)} financed` : ''}).`, -downPayment, asset.monthlyIncome - asset.operatingExpense - asset.loanPayment, assetId);
  next.lastEvent = `${player.name} acquired ${asset.name}.`;
  next.saveUpdatedAt = Date.now();
  return next;
}

export function buyBusiness(state: GameState, playerId: string, cardId: string): GameState {
  const next = clone(state);
  const player = next.players.find((x) => x.id === playerId);
  const card = BUSINESSES.find((x) => x.id === cardId);
  if (!player || !card) throw new Error('Player or business not found.');
  if (player.stage !== 'fast-track') throw new Error('Business opportunities are available only on the Fast Track.');
  if (player.cash < card.price) throw new Error('Not enough cash. Bank loans cannot fund Fast Track businesses.');
  player.cash -= card.price;
  const asset: Asset = {
    id: makeId('asset'), name: card.name, category: 'business', purchasePrice: card.price, currentValue: card.price,
    monthlyIncome: card.monthlyNet, operatingExpense: 0, loanPayment: 0, description: card.description, risk: card.risk, liquidationMultiplier: 0.5,
  };
  player.assets.push(asset);
  logTransaction(next, player, 'Business purchase', `Bought ${card.name} for ${formatGM(card.price)}.`, -card.price, card.monthlyNet, asset.id);
  next.lastEvent = `${card.name} is now producing ${formatMonthly(card.monthlyNet)}.`;
  next.decks.business.discardPile.push(card.id);
  maybeFastTrackWin(next, player);
  return next;
}

function maybeFastTrackWin(state: GameState, player: Player): boolean {
  if (state.phase === 'finished' || player.bankrupt || player.stage !== 'fast-track') return false;
  if (state.config.victoryMode === 'cashflow' && getFinancials(player).cashFlow >= state.config.cashFlowTarget) {
    state.phase = 'finished';
    state.turnsTaken += 1;
    state.winnerId = player.id;
    state.pending = undefined;
    state.lastEvent = `${player.name} reached the Fast Track cash-flow target.`;
    logTransaction(state, player, 'Victory', `Won by reaching ${formatMonthly(state.config.cashFlowTarget)} cash flow.`, 0, getFinancials(player).cashFlow, player.id);
    return true;
  }
  return false;
}

export function sellAsset(state: GameState, playerId: string, assetId: string, salePrice: number): GameState {
  const next = clone(state);
  const player = next.players.find((x) => x.id === playerId);
  const asset = player?.assets.find((x) => x.id === assetId);
  if (!player || !asset) throw new Error('That asset is not owned by this player.');
  const loan = asset.liabilityId ? player.liabilities.find((x) => x.id === asset.liabilityId) : undefined;
  const payoff = loan?.principal ?? 0;
  const netProceeds = salePrice - payoff;
  if (netProceeds < 0 && player.cash < Math.abs(netProceeds)) throw new Error('Sale proceeds would not cover the attached debt. More cash is required to close this sale.');
  player.cash += netProceeds;
  player.realizedProfitLoss += salePrice - asset.purchasePrice;
  player.assets = player.assets.filter((x) => x.id !== assetId);
  if (loan) player.liabilities = player.liabilities.filter((x) => x.id !== loan.id);
  logTransaction(next, player, 'Asset sale', `Sold ${asset.name} for ${formatGM(salePrice)}; debt payoff ${formatGM(payoff)}; cash impact ${formatGM(netProceeds)}.`, netProceeds, -(asset.monthlyIncome - asset.operatingExpense - asset.loanPayment), assetId);
  next.lastEvent = `${asset.name} was sold. Cash proceeds: ${formatGM(netProceeds)}.`;
  next.pending = undefined;
  next.phase = 'decision';
  return next;
}

export function startRoll(state: GameState): GameState {
  if (state.phase !== 'ready') throw new Error('Resolve the current action before rolling again.');
  const next = clone(state);
  const player = next.players[next.currentPlayerIndex];
  if (!player || player.bankrupt || next.phase === 'finished') throw new Error('This player cannot take a turn.');
  if (player.skipTurns > 0) throw new Error('This player must resolve a skipped turn instead.');
  const diceCount = player.stage === 'fast-track' || player.charityTurns > 0 ? 2 : 1;
  next.dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
  next.rolledTotal = diceCount === 1 ? next.dice[0] : 0;
  logTransaction(next, player, 'Dice roll', `Rolled ${next.dice.join(' and ')}${diceCount === 2 ? ' — choose either result' : ''}.`, 0, undefined);
  if (diceCount === 2 && player.charityTurns > 0) {
    next.phase = 'choose-die';
    next.lastEvent = `Charity benefit: choose either ${next.dice[0]} or ${next.dice[1]} for movement.`;
    return next;
  }
  next.rolledTotal = next.dice.reduce((sum, die) => sum + die, 0);
  return movePlayer(next, next.rolledTotal);
}

export function chooseCharityDie(state: GameState, chosen: number): GameState {
  if (state.phase !== 'choose-die' || !state.dice.includes(chosen)) throw new Error('Choose one of the dice that was rolled.');
  const next = clone(state);
  next.rolledTotal = chosen;
  return movePlayer(next, chosen);
}

function movePlayer(state: GameState, steps: number): GameState {
  const next = clone(state);
  const player = next.players[next.currentPlayerIndex];
  const board = currentBoard(player.stage);
  const oldPosition = player.position;
  const path: number[] = [];
  let paydayCrossed = false;
  for (let i = 1; i <= steps; i += 1) {
    const pos = (oldPosition + i) % board.length;
    path.push(pos);
    const space = board[pos];
    if ((player.stage === 'rat-race' && space === 'Payday') || (player.stage === 'fast-track' && space === 'Cash Flow Day')) paydayCrossed = true;
  }
  player.position = (oldPosition + steps) % board.length;
  next.lastRollPath = path;
  next.phase = 'decision';
  next.lastEvent = `${player.name} rolled ${steps} and landed on ${board[player.position]}.`;
  logTransaction(next, player, 'Movement', `Moved ${steps} spaces to #${player.position + 1}: ${board[player.position]}.`, 0, undefined, `space-${player.position + 1}`);
  if (paydayCrossed) {
    if (player.pendingSalaryIncrease > 0) {
      const increase = player.pendingSalaryIncrease;
      player.profession.salary += increase;
      player.pendingSalaryIncrease = 0;
      logTransaction(next, player, 'Scheduled salary increase', `Salary increased by ${formatGM(increase)}/month at Payday.`, 0, increase);
    }
    const financials = getFinancials(player);
    const due = -financials.cashFlow;
    if (financials.cashFlow >= 0) {
      player.cash += financials.cashFlow;
      logTransaction(next, player, player.stage === 'rat-race' ? 'Payday settlement' : 'Cash Flow Day settlement', `Bank paid ${formatGM(financials.cashFlow)} for one monthly settlement.`, financials.cashFlow, financials.cashFlow);
      next.lastEvent = `${player.stage === 'rat-race' ? 'Payday' : 'Cash Flow Day'}: Bank paid ${formatGM(financials.cashFlow)}.`;
    } else if (player.cash >= due) {
      player.cash -= due;
      logTransaction(next, player, player.stage === 'rat-race' ? 'Payday settlement' : 'Cash Flow Day settlement', `Paid ${formatGM(due)} for one monthly settlement.`, -due, financials.cashFlow);
      next.lastEvent = `${player.stage === 'rat-race' ? 'Payday' : 'Cash Flow Day'}: paid ${formatGM(due)}.`;
    } else {
      next.phase = 'insufficient';
      next.pending = { type: 'payment', amount: due, reason: `${player.stage === 'rat-race' ? 'Payday' : 'Cash Flow Day'} monthly settlement`, continuation: 'resolve-landing' };
      next.lastEvent = `Monthly settlement requires ${formatGM(due)}, but only ${formatGM(player.cash)} is available.`;
      return next;
    }
  }
  return resolveLanding(next);
}

export function resolveLanding(state: GameState): GameState {
  if (state.phase === 'finished') return state;
  const next = clone(state);
  const player = next.players[next.currentPlayerIndex];
  const space = currentBoard(player.stage)[player.position];
  if (space === 'Payday' || space === 'Cash Flow Day') {
    next.pending = { type: 'notice', title: space, description: 'Your monthly cash flow was settled once for this movement.' };
    next.phase = 'decision';
    return next;
  }
  if (space === 'Small Opportunity' || space === 'Big Opportunity') {
    const deck: 'small' | 'big' = space === 'Small Opportunity' ? 'small' : 'big';
    const id = drawCardId(next, deck);
    const card = (deck === 'small' ? SMALL_OPPORTUNITIES : BIG_OPPORTUNITIES).find((x) => x.id === id);
    if (!card) {
      next.pending = { type: 'notice', title: 'No opportunity available', description: 'The deck and discard pile are empty. Continue to the next turn.' };
      return next;
    }
    next.pending = { type: 'investment', card, deck, quantity: 1 };
    next.lastEvent = `Opportunity revealed: ${card.name}.`;
    return next;
  }
  if (space === 'Business Opportunity') {
    const id = drawCardId(next, 'business');
    const card = BUSINESSES.find((x) => x.id === id);
    if (!card) {
      next.pending = { type: 'notice', title: 'No business available', description: 'The business deck is empty. Continue to the next turn.' };
      return next;
    }
    next.pending = { type: 'business', card };
    next.lastEvent = `Business opportunity: ${card.name}.`;
    return next;
  }
  if (space === 'Expense') {
    const id = drawCardId(next, 'expense');
    const card = EXPENSES.find((x) => x.id === id);
    if (!card) { next.pending = { type: 'notice', title: 'Expense deck empty', description: 'No card is available. Continue.' }; return next; }
    next.pending = { type: 'expense', card };
    next.lastEvent = `Expense card: ${card.name}.`;
    return next;
  }
  if (space === 'Life Event') {
    const id = drawCardId(next, 'life');
    const card = LIFE_EVENTS.find((x) => x.id === id);
    if (!card) { next.pending = { type: 'notice', title: 'Life-event deck empty', description: 'No card is available. Continue.' }; return next; }
    next.pending = { type: 'life', card };
    next.lastEvent = `Life event: ${card.name}.`;
    return next;
  }
  if (space === 'Market') return resolveMarket(next);
  if (space === 'Charity') {
    next.pending = { type: 'charity' };
    next.lastEvent = 'Charity is optional. A donation can grant a temporary two-dice benefit.';
    return next;
  }
  if (space === 'Baby') {
    if (player.childCount >= 3) {
      logTransaction(next, player, 'Baby event', 'No effect: the child limit is three.', 0, 0);
      next.pending = { type: 'notice', title: 'Family limit reached', description: 'The basic rules cap the number of children at three, so this event has no effect.' };
    } else {
      player.childCount += 1;
      logTransaction(next, player, 'Baby event', `Family grew. Monthly child expenses are now ${formatGM(player.childCount)}.`, 0, -1);
      next.pending = { type: 'notice', title: 'A new addition', description: 'Your family grew by one. Monthly child expenses increase by ৳1,000.' };
    }
    next.lastEvent = 'Baby space resolved.';
    return next;
  }
  if (space === 'Downsized') {
    player.salarySuspendedTurns = Math.max(player.salarySuspendedTurns, 2);
    player.salarySuspendedAtTurn = next.turn;
    player.skipTurns = Math.max(player.skipTurns, 2);
    player.charityTurns = 0;
    const due = getFinancials(player).totalExpenses;
    logTransaction(next, player, 'Downsized', 'Salary suspended; two future turns will be skipped. Charity benefit ended.', 0, -player.profession.salary);
    next.lastEvent = 'Downsized: salary is suspended and your next two active turns are skipped.';
    if (player.cash >= due) {
      player.cash -= due;
      logTransaction(next, player, 'Downsized payment', `Paid one month of expenses: ${formatGM(due)}.`, -due, -due);
      next.pending = { type: 'notice', title: 'Downsized', description: `You paid ${formatGM(due)} for one month of expenses. Your next two turns are skipped; salary is suspended during the disruption.` };
    } else {
      next.phase = 'insufficient';
      next.pending = { type: 'payment', amount: due, reason: 'Downsized: one month of expenses', continuation: 'finish' };
    }
    return next;
  }
  if (space === 'Dream') {
    const dream = DREAMS.find((x) => x.id === player.dreamId) ?? DREAMS[0];
    next.pending = { type: 'dream', dream };
    next.lastEvent = `Dream space: ${dream.name}.`;
    return next;
  }
  next.pending = { type: 'notice', title: 'Quiet space', description: 'No special effect this time. Review your numbers, then continue.' };
  return next;
}

function resolveMarket(state: GameState): GameState {
  const next = state;
  const id = drawCardId(next, 'market');
  const card: MarketCard | undefined = MARKETS.find((x) => x.id === id);
  if (!card) { next.pending = { type: 'notice', title: 'Market is quiet', description: 'No market card is available.' }; return next; }
  const active = next.players[next.currentPlayerIndex];
  let summary = card.description;
  switch (card.effect) {
    case 'property-boom':
    case 'property-crash': {
      const factor = card.factor ?? 1;
      next.players.forEach((player) => player.assets.forEach((asset) => {
        if (asset.category === 'real-estate') asset.currentValue = roundHalf(asset.currentValue * factor);
      }));
      break;
    }
    case 'stock-rise':
    case 'stock-fall': {
      const factor = card.factor ?? 1;
      next.players.forEach((player) => player.assets.forEach((asset) => {
        if (asset.category === 'stock' || asset.category === 'fund') {
          asset.currentValue = roundHalf(asset.currentValue * factor);
          if (asset.quantity && asset.unitCurrentPrice !== undefined) asset.unitCurrentPrice = roundHalf(asset.unitCurrentPrice * factor);
        }
      }));
      break;
    }
    case 'interest-rise': {
      next.bankInterestRate = card.value ?? 0.12;
      next.players.forEach((player) => player.liabilities.forEach((liability) => {
        if (liability.kind === 'bank-loan') {
          liability.monthlyRate = next.bankInterestRate;
          liability.monthlyPayment = liability.principal * next.bankInterestRate;
        }
      }));
      break;
    }
    case 'business-buyer': {
      const eligibleAssetIds = active.assets.map((x) => x.id);
      if (eligibleAssetIds.length > 0) {
        next.pending = { type: 'market-sale', card, eligibleAssetIds };
        next.lastEvent = card.description;
        return next;
      }
      summary = 'No owned asset could be sold, so this market card has no eligible target.';
      break;
    }
    case 'dividend':
      next.players.forEach((player) => player.assets.forEach((asset) => {
        if (asset.category === 'stock' || asset.category === 'fund') asset.monthlyIncome = roundHalf(asset.monthlyIncome + (card.value ?? 0.2));
      }));
      break;
    case 'rental-demand':
      next.players.forEach((player) => player.assets.forEach((asset) => {
        if (asset.category === 'real-estate') asset.monthlyIncome = roundHalf(asset.monthlyIncome + (card.value ?? 0.5));
      }));
      break;
  }
  next.players.forEach((player) => logTransaction(next, player, 'Market event', `${card.name}: ${summary}`, 0, undefined, card.id));
  next.pending = { type: 'notice', title: card.name, description: summary, cardId: card.id };
  next.lastEvent = `${card.name}: ${summary}`;
  return next;
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function resolveInvestment(state: GameState, action: 'buy' | 'decline', quantity = 1): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'investment') throw new Error('There is no investment decision pending.');
  const pending = state.pending;
  const player = getActivePlayer(state);
  if (action === 'decline') {
    const next = clone(state);
    discardCard(next, pending.deck, pending.card.id);
    next.pending = undefined;
    logTransaction(next, next.players[next.currentPlayerIndex], 'Opportunity declined', `Declined ${pending.card.name}. The card returns to the bottom of its deck.`, 0, 0, pending.card.id);
    return completeTurn(next);
  }
  const next = buyInvestment(state, player.id, pending.card, quantity);
  discardCard(next, pending.deck, pending.card.id);
  next.pending = undefined;
  if (maybeFastTrackWin(next, next.players[next.currentPlayerIndex])) return next;
  return completeTurn(next);
}

export function resolveBusiness(state: GameState, action: 'buy' | 'decline'): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'business') throw new Error('There is no business decision pending.');
  const pending = state.pending;
  if (action === 'decline') {
    const next = clone(state);
    discardCard(next, 'business', pending.card.id);
    next.pending = undefined;
    logTransaction(next, getActivePlayer(next), 'Business declined', `Declined ${pending.card.name}.`, 0, 0, pending.card.id);
    return completeTurn(next);
  }
  if (getActivePlayer(state).cash < pending.card.price) throw new Error('Not enough cash. Bank loans are not allowed for Fast Track businesses.');
  const next = buyBusiness(state, getActivePlayer(state).id, pending.card.id);
  next.pending = undefined;
  if (next.phase === 'finished') return next;
  return completeTurn(next);
}

export function resolveExpense(state: GameState, action: 'apply' | 'borrow' | 'bankruptcy'): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'expense') throw new Error('There is no expense card pending.');
  const pending = state.pending;
  const player = getActivePlayer(state);
  if (action === 'bankruptcy') return declareBankruptcy(state, player.id);
  let next = clone(state);
  const p = getActivePlayer(next);
  if (pending.card.cost > p.cash) {
    if (action !== 'borrow') throw new Error('You do not have enough cash to pay this expense.');
    const shortage = Math.ceil(pending.card.cost - p.cash);
    if (canBankBorrow(p) < shortage) throw new Error('The Bank Loan limit is not enough to cover this expense.');
    next = borrowBankLoan(next, p.id, shortage);
  }
  const p2 = getActivePlayer(next);
  if (pending.card.cost > p2.cash) throw new Error('Not enough cash after borrowing.');
  p2.cash -= pending.card.cost;
  if (pending.card.cost > 0) logTransaction(next, p2, 'Expense', `${pending.card.name}: paid ${formatGM(pending.card.cost)}.`, -pending.card.cost, 0, pending.card.id);
  const card = pending.card;
  let monthlyImpact = 0;
  if (card.effect === 'new-car') { p2.otherRecurringExpense += card.value ?? 1; monthlyImpact -= card.value ?? 1; }
  if (card.effect === 'education') { p2.pendingSalaryIncrease += card.value ?? 2; monthlyImpact += card.value ?? 2; }
  if (card.effect === 'baby') { if (p2.childCount < 3) { p2.childCount += 1; monthlyImpact -= 1; } }
  if (card.effect === 'insurance') { p2.otherRecurringExpense += card.value ?? 0.5; monthlyImpact -= card.value ?? 0.5; }
  discardCard(next, 'expense', card.id);
  logTransaction(next, p2, 'Expense effect', card.description, 0, monthlyImpact, card.id);
  next.lastEvent = `${card.name} resolved. ${card.description}`;
  next.pending = undefined;
  return completeTurn(next);
}

export function resolveLifeEvent(state: GameState, action: 'apply' | 'borrow' | 'bankruptcy'): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'life') throw new Error('There is no life-event card pending.');
  const card = state.pending.card;
  const player = getActivePlayer(state);
  if (action === 'bankruptcy') return declareBankruptcy(state, player.id);
  let next = clone(state);
  const p = getActivePlayer(next);
  if (card.effect === 'repair' && (card.value ?? 2) > p.cash) {
    if (action !== 'borrow') throw new Error('You do not have enough cash for the repair.');
    const shortage = Math.ceil((card.value ?? 2) - p.cash);
    if (canBankBorrow(p) < shortage) throw new Error('The Bank Loan limit is not enough to cover the repair.');
    next = borrowBankLoan(next, p.id, shortage);
  }
  const p2 = getActivePlayer(next);
  let cashImpact = 0;
  let monthlyImpact = 0;
  switch (card.effect) {
    case 'promotion': p2.profession.salary += card.value ?? 3; monthlyImpact += card.value ?? 3; break;
    case 'job-loss': p2.salarySuspendedTurns = Math.max(p2.salarySuspendedTurns, card.value ?? 2); p2.salarySuspendedAtTurn = next.turn; monthlyImpact -= p2.profession.salary; break;
    case 'side-business': p2.otherIncome += card.value ?? 2; monthlyImpact += card.value ?? 2; break;
    case 'inheritance': p2.cash += card.value ?? 5; cashImpact += card.value ?? 5; break;
    case 'repair': {
      const cost = card.value ?? 2;
      if (p2.cash < cost) throw new Error('Not enough cash after borrowing.');
      p2.cash -= cost; cashImpact -= cost; break;
    }
    case 'inflation':
      next.players.forEach((pl) => {
        pl.profession.livingExpense += card.value ?? 1;
        logTransaction(next, pl, 'Life event', `${card.name}: ${card.description}`, 0, -(card.value ?? 1), card.id);
      });
      break;
  }
  discardCard(next, 'life', card.id);
  if (card.effect !== 'inflation') logTransaction(next, p2, 'Life event', card.description, cashImpact, monthlyImpact, card.id);
  next.lastEvent = `${card.name}: ${card.description}`;
  next.pending = undefined;
  return completeTurn(next);
}

export function resolveCharity(state: GameState, donate: boolean): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'charity') throw new Error('There is no Charity decision pending.');
  const next = clone(state);
  const player = getActivePlayer(next);
  if (donate) {
    const cashFlow = getFinancials(player).cashFlow;
    const donation = Math.floor(Math.max(0, cashFlow) * 0.1 * 2) / 2;
    if (player.cash < donation) throw new Error('You do not have enough cash for this donation.');
    player.cash -= donation;
    player.charityTurns = 3;
    logTransaction(next, player, 'Charity donation', `Donated ${formatGM(donation)} and earned a three-turn two-dice benefit.`, -donation, 0);
    next.lastEvent = `Donated ${formatGM(donation)}. Two dice may be rolled and either result chosen for the next three active turns.`;
  } else {
    logTransaction(next, player, 'Charity declined', 'Skipped the optional Charity donation.', 0, 0);
    next.lastEvent = 'Charity declined. No donation or dice benefit.';
  }
  next.pending = undefined;
  return completeTurn(next);
}

export function resolveDream(state: GameState, action: 'inspect' | 'complete' | 'continue'): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'dream') throw new Error('There is no Dream decision pending.');
  const pending = state.pending;
  const player = getActivePlayer(state);
  if (action === 'complete') {
    if (player.stage !== 'fast-track') throw new Error('Dreams can only be completed on the Fast Track.');
    if (player.cash < pending.dream.cost) throw new Error('Not enough cash to pay for this Dream.');
    const next = clone(state);
    const p = getActivePlayer(next);
    p.cash -= pending.dream.cost;
    p.dreamCompleted = true;
    next.phase = 'finished';
    next.turnsTaken += 1;
    next.winnerId = p.id;
    next.pending = undefined;
    next.lastEvent = `${p.name} completed the Dream: ${pending.dream.name}.`;
    logTransaction(next, p, 'Dream completed', `Paid ${formatGM(pending.dream.cost)} and completed ${pending.dream.name}.`, -pending.dream.cost, 0, pending.dream.id);
    logTransaction(next, p, 'Victory', `Won by completing the Dream ${pending.dream.name}.`, 0, undefined, pending.dream.id);
    return next;
  }
  const next = clone(state);
  next.pending = undefined;
  if (action === 'inspect') next.lastEvent = `${pending.dream.name}: ${pending.dream.description} Cost ${formatGM(pending.dream.cost)}.`;
  return completeTurn(next);
}

export function resolveMarketSale(state: GameState, assetId?: string): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'market-sale') throw new Error('There is no market sale pending.');
  const pending = state.pending;
  const next = clone(state);
  const player = getActivePlayer(next);
  if (!assetId) {
    discardCard(next, 'market', pending.card.id);
    next.pending = undefined;
    logTransaction(next, player, 'Market offer declined', 'Kept all assets despite the business buyer offer.', 0, 0, pending.card.id);
    return completeTurn(next);
  }
  const asset = player.assets.find((x) => x.id === assetId);
  if (!asset || !pending.eligibleAssetIds.includes(assetId)) throw new Error('That asset is not eligible for this sale.');
  const price = roundHalf(asset.currentValue * (pending.card.factor ?? 1.4));
  const liability = asset.liabilityId ? player.liabilities.find((x) => x.id === asset.liabilityId) : undefined;
  const shortfall = (liability?.principal ?? 0) - price;
  if (shortfall > player.cash) throw new Error('The sale price will not cover the attached debt; more cash is required.');
  const sold = sellAsset(next, player.id, assetId, price);
  discardCard(sold, 'market', pending.card.id);
  sold.pending = undefined;
  return completeTurn(sold);
}

export function resolveNotice(state: GameState): GameState {
  if (state.phase !== 'decision' || state.pending?.type !== 'notice') throw new Error('There is no notice to continue from.');
  const pending = state.pending;
  const next = clone(state);
  if (pending.type === 'notice' && pending.cardId) discardCard(next, 'market', pending.cardId);
  next.pending = undefined;
  return completeTurn(next);
}

export function resolvePayment(state: GameState, action: 'pay' | 'borrow' | 'bankruptcy'): GameState {
  if (state.phase !== 'insufficient' || state.pending?.type !== 'payment') throw new Error('There is no payment to resolve.');
  const pending = state.pending;
  const player = getActivePlayer(state);
  if (action === 'bankruptcy') return declareBankruptcy(state, player.id);
  let next = clone(state);
  let p = getActivePlayer(next);
  if (pending.amount > p.cash) {
    if (action !== 'borrow') throw new Error('There is not enough cash to make this payment.');
    const shortage = Math.ceil(pending.amount - p.cash);
    if (canBankBorrow(p) < shortage) throw new Error('The Bank Loan limit is not enough to cover the payment.');
    next = borrowBankLoan(next, p.id, shortage);
    p = getActivePlayer(next);
  }
  if (p.cash < pending.amount) throw new Error('Not enough cash after borrowing.');
  p.cash -= pending.amount;
  logTransaction(next, p, 'Required payment', `${pending.reason}: paid ${formatGM(pending.amount)}.`, -pending.amount);
  next.pending = undefined;
  next.phase = 'decision';
  if (pending.continuation === 'resolve-landing') return resolveLanding(next);
  if (pending.reason === 'Skipped-turn monthly settlement') {
    if (p.salarySuspendedTurns > 0 && p.salarySuspendedAtTurn !== next.turn) {
      p.salarySuspendedTurns -= 1;
      if (p.salarySuspendedTurns === 0) p.salarySuspendedAtTurn = null;
    }
    next.phase = 'handover';
    next.pending = undefined;
    next.turnsTaken += 1;
    next.lastEvent = `${p.name} has completed a skipped-turn settlement.`;
    if (next.config.turnLimit !== null && next.turnsTaken >= next.config.turnLimit) return decideSessionLimit(next);
    return next;
  }
  if (pending.continuation === 'downsize') {
    const pl = getActivePlayer(next);
    pl.salarySuspendedTurns = Math.max(pl.salarySuspendedTurns, 2);
    pl.skipTurns = Math.max(pl.skipTurns, 2);
    pl.charityTurns = 0;
  }
  return completeTurn(next);
}

export function completeTurn(state: GameState): GameState {
  const next = clone(state);
  const player = getActivePlayer(next);
  if (player.bankrupt) return advanceToHandover(next);
  const financials = getFinancials(player);
  if (player.salarySuspendedTurns > 0 && player.salarySuspendedAtTurn !== next.turn && player.skipTurns === 0) {
    player.salarySuspendedTurns -= 1;
    if (player.salarySuspendedTurns === 0) player.salarySuspendedAtTurn = null;
  }
  if (player.charityTurns > 0 && next.dice.length === 2) player.charityTurns -= 1;
  player.cashFlowHistory.push(financials.cashFlow);
  if (player.cashFlowHistory.length > 24) player.cashFlowHistory.shift();
  if (maybeFastTrackWin(next, player)) return next;
  if (player.stage === 'rat-race' && financials.passiveIncome > financials.totalExpenses) {
    next.phase = 'rat-race-exit';
    next.pending = undefined;
    next.lastEvent = `${player.name} has enough passive income to escape the Rat Race.`;
    logTransaction(next, player, 'Rat Race exit', `Passive income ${formatGM(financials.passiveIncome)} exceeds expenses ${formatGM(financials.totalExpenses)}.`, 0, financials.cashFlow);
    return next;
  }
  next.pending = undefined;
  return advanceToHandover(next);
}

function advanceToHandover(state: GameState): GameState {
  state.phase = 'handover';
  state.pending = undefined;
  state.turnsTaken += 1;
  const player = getActivePlayer(state);
  state.lastEvent = `${player.name}'s turn is complete. Pass the device to the next player.`;
  if (state.config.turnLimit !== null && state.turnsTaken >= state.config.turnLimit) return decideSessionLimit(state);
  return state;
}

function decideSessionLimit(state: GameState): GameState {
  const active = state.players.filter((x) => !x.bankrupt);
  if (!active.length) { state.phase = 'finished'; state.lastEvent = 'No player remains active.'; return state; }
  const ranked = [...active].sort((a, b) => getFinancials(b).netWorth - getFinancials(a).netWorth || getFinancials(b).passiveIncome - getFinancials(a).passiveIncome);
  state.phase = 'finished'; state.winnerId = ranked[0].id;
  state.lastEvent = `Turn limit reached. ${ranked[0].name} wins by net worth, then passive income.`;
  logTransaction(state, ranked[0], 'Session result', `Won at the turn limit with net worth ${formatGM(getFinancials(ranked[0]).netWorth)}.`, 0, getFinancials(ranked[0]).cashFlow);
  return state;
}

export function continueAfterExit(state: GameState): GameState {
  if (state.phase !== 'rat-race-exit') throw new Error('No Rat Race exit is pending.');
  const next = clone(state);
  const player = getActivePlayer(next);
  player.stage = 'fast-track';
  player.position = -1; // Entrance: their next roll lands on the first Fast Track space as they move.
  logTransaction(next, player, 'Fast Track entry', `${player.name} entered the Fast Track. Salary and employment-only expenses no longer apply.`, 0, getFinancials(player).cashFlow);
  next.lastEvent = `${player.name} has entered the Fast Track. Existing assets, debts, and living costs remain.`;
  return advanceToHandover(next);
}

export function nextPlayer(state: GameState): GameState {
  if (state.phase !== 'handover') throw new Error('Finish the current decision before changing players.');
  const next = clone(state);
  if (next.phase === 'finished') return next;
  const count = next.players.length;
  const previousIndex = next.currentPlayerIndex;
  let chosen = previousIndex;
  for (let i = 0; i < count; i += 1) {
    chosen = (chosen + 1) % count;
    if (!next.players[chosen].bankrupt) break;
  }
  next.currentPlayerIndex = chosen;
  if (chosen <= previousIndex) next.round += 1;
  next.turn = next.turnsTaken + 1;
  const player = getActivePlayer(next);
  if (player.skipTurns > 0) {
    player.skipTurns -= 1;
    const financials = getFinancials(player);
    if (financials.cashFlow >= 0) {
      player.cash += financials.cashFlow;
      if (player.salarySuspendedTurns > 0 && player.salarySuspendedAtTurn !== next.turn) { player.salarySuspendedTurns -= 1; if (player.salarySuspendedTurns === 0) player.salarySuspendedAtTurn = null; }
      logTransaction(next, player, 'Skipped-turn settlement', `Skipped a turn and received ${formatGM(financials.cashFlow)} monthly cash flow.`, financials.cashFlow, financials.cashFlow);
      next.phase = 'handover';
      next.turnsTaken += 1;
      next.lastEvent = `${player.name} is downsized and skips this turn; monthly settlement was applied automatically.`;
      if (next.config.turnLimit !== null && next.turnsTaken >= next.config.turnLimit) return decideSessionLimit(next);
      return next;
    }
    const due = -financials.cashFlow;
    if (player.cash >= due) {
      player.cash -= due;
      if (player.salarySuspendedTurns > 0 && player.salarySuspendedAtTurn !== next.turn) { player.salarySuspendedTurns -= 1; if (player.salarySuspendedTurns === 0) player.salarySuspendedAtTurn = null; }
      logTransaction(next, player, 'Skipped-turn settlement', `Skipped a turn and paid ${formatGM(due)} monthly cash flow.`, -due, -due);
      next.phase = 'handover';
      next.turnsTaken += 1;
      next.lastEvent = `${player.name} is downsized and skips this turn; monthly settlement was applied automatically.`;
      if (next.config.turnLimit !== null && next.turnsTaken >= next.config.turnLimit) return decideSessionLimit(next);
      return next;
    }
    next.phase = 'insufficient';
    next.pending = { type: 'payment', amount: due, reason: 'Skipped-turn monthly settlement', continuation: 'finish' };
    next.lastEvent = `${player.name} must settle ${formatGM(due)} during a skipped turn.`;
    return next;
  }
  next.phase = 'ready';
  next.pending = undefined;
  next.dice = [];
  next.rolledTotal = 0;
  next.lastRollPath = [];
  next.lastEvent = `${player.name}, your turn. Review your cash flow and choose your next move.`;
  return next;
}

export function declareBankruptcy(state: GameState, playerId: string): GameState {
  const next = clone(state);
  let player = next.players.find((x) => x.id === playerId);
  if (!player) throw new Error('Player not found.');
  const saleProceeds = player.assets.reduce((sum, asset) => sum + asset.currentValue * asset.liquidationMultiplier, 0);
  player.cash += saleProceeds;
  let remainingCash = player.cash;
  const order = ['bank-loan', 'investment-loan', 'mortgage', 'other'] as const;
  const details: string[] = [];
  for (const kind of order) {
    for (const liability of [...player.liabilities.filter((x) => x.kind === kind)]) {
      const payment = Math.min(remainingCash, liability.principal);
      remainingCash -= payment;
      details.push(`${liability.name}: paid ${formatGM(payment)} of ${formatGM(liability.principal)}`);
    }
  }
  const previousCash = player.cash;
  const writtenOff = player.liabilities.reduce((sum, x) => sum + x.principal, 0);
  player.cash = Math.max(0, remainingCash);
  player.assets = [];
  player.liabilities = [];
  player.otherIncome = 0;
  player.otherExpense = 0;
  player.otherRecurringExpense = 0;
  player.pendingSalaryIncrease = 0;
  player.profession.salary = 0;
  player.profession.livingExpense = 0;
  player.childCount = 0;
  player.bankrupt = true;
  player.skipTurns = 0;
  player.charityTurns = 0;
  logTransaction(next, player, 'Bankruptcy', `Liquidated assets for ${formatGM(saleProceeds)}. Settlements: ${details.join('; ') || 'No liabilities'}. Remaining debt written off: ${formatGM(Math.max(0, writtenOff - (previousCash - player.cash)))}.`, player.cash - (previousCash - saleProceeds), 0);
  next.lastEvent = `${player.name} declared bankruptcy. Assets were liquidated and debts settled in the required order.`;
  next.pending = undefined;
  if (next.config.restartAfterBankruptcy) {
    player.bankrupt = false;
    player.restartCount += 1;
    const profession = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
    player.profession = { id: profession.id, name: profession.name, salary: profession.salary, livingExpense: profession.livingExpense, otherExpense: profession.otherExpense };
    player.otherExpense = profession.otherExpense;
    player.salarySuspendedTurns = 0;
    player.salarySuspendedAtTurn = null;
    player.cash = 5;
    player.stage = 'rat-race';
    player.position = 0;
    player.cashFlowHistory = [profession.salary - profession.livingExpense - profession.otherExpense];
    player.salarySuspendedAtTurn = null;
    logTransaction(next, player, 'Restart', `Restarted as ${profession.name} with ${formatGM(5)} and no assets or debts.`, 5, profession.salary - profession.livingExpense - profession.otherExpense);
    next.phase = 'handover';
  } else {
    next.phase = 'handover';
    next.turnsTaken += 1;
    if (next.players.filter((x) => !x.bankrupt).length <= 1) {
      const winner = next.players.find((x) => !x.bankrupt);
      if (winner) { next.phase = 'finished'; next.winnerId = winner.id; next.lastEvent = `${winner.name} is the last solvent player and wins.`; }
      else { next.phase = 'finished'; next.lastEvent = 'All players are bankrupt. No winner.'; }
    } else if (next.config.turnLimit !== null && next.turnsTaken >= next.config.turnLimit) {
      return decideSessionLimit(next);
    }
  }
  return next;
}

export function enterFastTrack(player: Player): Player {
  return { ...player, stage: 'fast-track', position: -1 };
}

export function canCompleteDream(player: Player): boolean {
  const dream = DREAMS.find((x) => x.id === player.dreamId);
  return !!dream && player.stage === 'fast-track' && player.cash >= dream.cost;
}

export function validateGameState(state: GameState): string[] {
  const errors: string[] = [];
  if (state.players.length < 2 || state.players.length > 6) errors.push('Player count must be between two and six.');
  if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) errors.push('Current player index is out of bounds.');
  const ids = state.players.map((p) => p.id);
  if (new Set(ids).size !== ids.length) errors.push('Player IDs must be unique.');
  for (const player of state.players) {
    if (!Number.isFinite(player.cash) || player.cash < 0) errors.push(`${player.name} has an invalid cash balance.`);
    const validEntrance = player.stage === 'fast-track' && player.position === -1;
    if (!validEntrance && (player.position < 0 || player.position >= currentBoard(player.stage).length)) errors.push(`${player.name} has an invalid board position.`);
    if (player.childCount < 0 || player.childCount > 3) errors.push(`${player.name} has an invalid child count.`);
    if (player.liabilities.some((x) => x.principal < 0)) errors.push(`${player.name} has a negative liability.`);
    if (player.assets.some((x) => x.currentValue < 0)) errors.push(`${player.name} has an invalid asset value.`);
  }
  if (state.phase === 'decision' && !state.pending) errors.push('Decision phase requires a pending decision.');
  if (state.phase === 'insufficient' && state.pending?.type !== 'payment') errors.push('Insufficient-funds phase requires a payment decision.');
  return errors;
}

export const PLAYER_COLOR_OPTIONS = PLAYER_COLORS;
export const DEFAULT_CONFIG: GameConfig = { victoryMode: 'dream', cashFlowTarget: 50, restartAfterBankruptcy: false, tutorialPrompts: true, turnLimit: 150 };
