import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, borrowBankLoan, buyBusiness, buyInvestment, completeTurn, continueAfterExit, createGame, formatGM, getFinancials, repayBankLoan, resolveDream, resolveExpense, resolveLifeEvent, startRoll, validateGameState } from '../engine/engine';
import { BIG_OPPORTUNITIES, SMALL_OPPORTUNITIES, BUSINESSES, DREAMS, EXPENSES, LIFE_EVENTS } from '../data/cards';
import type { GameConfig, PlayerSetup } from '../types';

const setups: PlayerSetup[] = [
  { id: 'p1', name: 'Amina', color: '#45c4a0', professionId: 'teacher', dreamId: 'vacation-home' },
  { id: 'p2', name: 'Rafi', color: '#f3b75b', professionId: 'engineer', dreamId: 'world-tour' },
];
const cfg: GameConfig = { ...DEFAULT_CONFIG };

function game() { return createGame(setups, cfg); }

describe('Wealth Loop financial engine', () => {
  it('creates correct starting financials from the profession card', () => {
    const state = game();
    const player = state.players[0];
    const f = getFinancials(player);
    expect(player.cash).toBe(10);
    expect(f.totalIncome).toBe(12);
    expect(f.totalExpenses).toBe(8);
    expect(f.cashFlow).toBe(4);
    expect(f.passiveIncome).toBe(0);
    expect(f.netWorth).toBe(10);
    expect(validateGameState(state)).toEqual([]);
  });

  it('processes a financed property as one consistent transaction', () => {
    const state = game();
    const result = buyInvestment(state, 'p1', SMALL_OPPORTUNITIES.find((x) => x.id === 'rental-room')!);
    const player = result.players[0];
    const f = getFinancials(player);
    expect(player.cash).toBe(5);
    expect(player.assets).toHaveLength(1);
    expect(player.assets[0].currentValue).toBe(20);
    expect(player.liabilities[0].principal).toBe(15);
    expect(f.passiveIncome).toBe(2);
    expect(f.totalExpenses).toBe(9.5);
    expect(f.cashFlow).toBe(4.5);
    expect(result.transactions[0].cashImpact).toBe(-5);
  });

  it('settles Payday once when the movement crosses it', () => {
    const state = game();
    state.players[0].position = 23;
    const result = startRoll(state);
    const settlements = result.transactions.filter((t) => t.type === 'Payday settlement');
    expect(settlements).toHaveLength(1);
    expect(result.players[0].cash).toBe(14);
  });

  it('enters the Fast Track after passive income exceeds expenses', () => {
    const state = game();
    const player = state.players[0];
    player.profession.salary = 12;
    player.profession.livingExpense = 1;
    player.otherExpense = 0;
    player.assets.push({ id: 'passive', name: 'Test asset', category: 'business', purchasePrice: 1, currentValue: 10, monthlyIncome: 2, operatingExpense: 0, loanPayment: 0, liquidationMultiplier: .5 });
    const exit = completeTurn(state);
    expect(exit.phase).toBe('rat-race-exit');
    const next = continueAfterExit(exit);
    expect(next.players[0].stage).toBe('fast-track');
    expect(next.players[0].position).toBe(-1);
    expect(getFinancials(next.players[0]).salary).toBe(0);
  });

  it('wins the cash-flow game after buying an affordable Fast Track business', () => {
    const state = game();
    state.players[0].stage = 'fast-track';
    state.players[0].position = -1;
    state.players[0].cash = 120;
    state.config.victoryMode = 'cashflow';
    state.config.cashFlowTarget = 5;
    const result = buyBusiness(state, 'p1', BUSINESSES.find((x) => x.id === 'retail-chain')!.id);
    expect(result.phase).toBe('finished');
    expect(result.winnerId).toBe('p1');
    expect(result.players[0].cash).toBe(20);
    expect(getFinancials(result.players[0]).cashFlow).toBe(5);
  });

  it('prevents unaffordable investment purchases', () => {
    const state = game();
    expect(() => buyInvestment(state, 'p2', BIG_OPPORTUNITIES.find((x) => x.id === 'apartment-building')!)).toThrow();
    expect(state.players[1].cash).toBe(20);
  });


  it('records multi-unit purchases with the correct recurring income', () => {
    const card = SMALL_OPPORTUNITIES.find((x) => x.id === 'index-fund')!;
    const result = buyInvestment(game(), 'p1', card, 2);
    expect(result.players[0].cash).toBe(0);
    expect(result.players[0].assets[0].quantity).toBe(2);
    expect(result.transactions[0].cashFlowImpact).toBe(0.2);
  });

  it('enforces the Bank Loan cap and recalculates interest after principal repayment', () => {
    let result = borrowBankLoan(game(), 'p1', 2);
    expect(result.players[0].liabilities[0].monthlyPayment).toBe(0.2);
    result = repayBankLoan(result, 'p1', 1);
    expect(result.players[0].liabilities[0].principal).toBe(1);
    expect(result.players[0].liabilities[0].monthlyPayment).toBe(0.1);
    expect(() => borrowBankLoan(result, 'p1', 20)).toThrow();
  });

  it('does not double-count a one-time expense in transaction history', () => {
    const state = game();
    state.phase = 'decision';
    state.pending = { type: 'expense', card: EXPENSES.find((x) => x.id === 'phone-upgrade')! };
    const result = resolveExpense(state, 'apply');
    expect(result.players[0].cash).toBe(8);
    const related = result.transactions.filter((x) => x.reference === 'phone-upgrade');
    expect(related.reduce((sum, x) => sum + x.cashImpact, 0)).toBe(-2);
  });

  it('applies inflation to all players and records each affected player', () => {
    const state = game();
    state.phase = 'decision';
    state.pending = { type: 'life', card: LIFE_EVENTS.find((x) => x.id === 'inflation')! };
    const result = resolveLifeEvent(state, 'apply');
    expect(result.players.map((x) => x.profession.livingExpense)).toEqual([6, 9]);
    expect(result.transactions.filter((x) => x.type === 'Life event' && x.reference === 'inflation')).toHaveLength(2);
  });

  it('finishes the game when a player completes an affordable Dream on Fast Track', () => {
    const state = game();
    state.players[0].stage = 'fast-track';
    state.players[0].position = 7;
    state.players[0].cash = 100;
    state.phase = 'decision';
    state.pending = { type: 'dream', dream: DREAMS.find((x) => x.id === 'vacation-home')! };
    const result = resolveDream(state, 'complete');
    expect(result.phase).toBe('finished');
    expect(result.winnerId).toBe('p1');
    expect(result.players[0].cash).toBe(0);
    expect(result.players[0].dreamCompleted).toBe(true);
  });

  it('formats internal GM as Bangladeshi taka', () => {
    expect(formatGM(12)).toBe('৳12,000');
    expect(formatGM(0.5)).toBe('৳500');
  });
});
