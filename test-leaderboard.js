require('dotenv').config();
const mongoose = require('mongoose');
const Pick = require('./models/Pick');
const Match = require('./models/Match');
const Elimination = require('./models/Elimination');

// ── Same calcPoints logic as server.js ────────────────────────────────────
function calcPoints(matches, teamCode) {
  let pts = 0;
  for (const m of matches) {
    const isHome = m.homeTeamCode === teamCode;
    const isAway = m.awayTeamCode === teamCode;
    if (!isHome && !isAway) continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    const scored   = isHome ? m.homeScore : m.awayScore;
    const conceded = isHome ? m.awayScore : m.homeScore;
    const diff = scored - conceded;
    if (diff > 0)        { pts += 10; if (diff > 2) pts += 5; }
    else if (diff === 0) { pts += 5; }
  }
  return pts;
}

// ── Unit tests (no DB needed) ─────────────────────────────────────────────
function runUnitTests() {
  console.log('\n── UNIT TESTS (calcPoints logic) ─────────────────────');

  const mockMatches = [
    { homeTeamCode: 'FRA', awayTeamCode: 'GER', homeScore: 3, awayScore: 0 }, // FRA wins 3-0  → diff 3 → 15pts
    { homeTeamCode: 'ARG', awayTeamCode: 'BRA', homeScore: 1, awayScore: 1 }, // draw 1-1      → 5pts each
    { homeTeamCode: 'FRA', awayTeamCode: 'ARG', homeScore: 2, awayScore: 1 }, // FRA wins 2-1  → diff 1 → 10pts, ARG 0
    { homeTeamCode: 'ESP', awayTeamCode: 'ENG', homeScore: 0, awayScore: 4 }, // ENG wins 4-0  → diff 4 → 15pts
    { homeTeamCode: 'MAR', awayTeamCode: 'NGA', homeScore: 2, awayScore: 0 }, // MAR wins 2-0  → diff 2 (NOT >2) → 10pts
    { homeTeamCode: 'JPN', awayTeamCode: 'KOR', homeScore: 0, awayScore: 0 }, // draw 0-0      → 5pts each
  ];

  const cases = [
    { team: 'FRA', expected: 25,  note: 'win 3-0 (15) + win 2-1 (10)' },
    { team: 'GER', expected: 0,   note: 'loss 0-3' },
    { team: 'ARG', expected: 5,   note: 'draw 1-1 (5) + loss 1-2 (0)' },
    { team: 'BRA', expected: 5,   note: 'draw 1-1 (5)' },
    { team: 'ENG', expected: 15,  note: 'win 4-0 → diff=4 > 2 → 15pts' },
    { team: 'ESP', expected: 0,   note: 'loss 0-4' },
    { team: 'MAR', expected: 10,  note: 'win 2-0 → diff=2 NOT > 2 → 10pts only' },
    { team: 'NGA', expected: 0,   note: 'loss 0-2' },
    { team: 'JPN', expected: 5,   note: 'draw 0-0' },
    { team: 'KOR', expected: 5,   note: 'draw 0-0' },
  ];

  let passed = 0, failed = 0;
  for (const { team, expected, note } of cases) {
    const got = calcPoints(mockMatches, team);
    const ok = got === expected;
    console.log(`  ${ok ? '✅' : '❌'} ${team}: expected ${expected}, got ${got}  (${note})`);
    ok ? passed++ : failed++;
  }
  console.log(`\n  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ── Integration tests (requires MongoDB) ─────────────────────────────────
const TEST_PREFIX = '__TEST__';

async function insertTestData() {
  const picks = await Pick.insertMany([
    { cousinName: `${TEST_PREFIX}Alice`,  teamCode: 'FRA', teamName: 'France',    teamFlag: '🇫🇷' },
    { cousinName: `${TEST_PREFIX}Bob`,    teamCode: 'ARG', teamName: 'Argentina', teamFlag: '🇦🇷' },
    { cousinName: `${TEST_PREFIX}Carol`,  teamCode: 'BRA', teamName: 'Brazil',    teamFlag: '🇧🇷' },
    { cousinName: `${TEST_PREFIX}Dave`,   teamCode: 'GER', teamName: 'Germany',   teamFlag: '🇩🇪' },
    { cousinName: `${TEST_PREFIX}Eve`,    teamCode: 'ENG', teamName: 'England',   teamFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { cousinName: `${TEST_PREFIX}Frank`,  teamCode: 'MAR', teamName: 'Morocco',   teamFlag: '🇲🇦' },
  ]);

  await Match.insertMany([
    { matchId: 99001, homeTeamCode: 'FRA', awayTeamCode: 'GER', homeScore: 3, awayScore: 0, homeTeamName: 'France',   awayTeamName: 'Germany',   stage: 'GROUP_STAGE', status: 'FINISHED', date: new Date() },
    { matchId: 99002, homeTeamCode: 'ARG', awayTeamCode: 'BRA', homeScore: 1, awayScore: 1, homeTeamName: 'Argentina',awayTeamName: 'Brazil',    stage: 'GROUP_STAGE', status: 'FINISHED', date: new Date() },
    { matchId: 99003, homeTeamCode: 'FRA', awayTeamCode: 'ARG', homeScore: 2, awayScore: 1, homeTeamName: 'France',   awayTeamName: 'Argentina', stage: 'GROUP_STAGE', status: 'FINISHED', date: new Date() },
    { matchId: 99004, homeTeamCode: 'ENG', awayTeamCode: 'MAR', homeScore: 4, awayScore: 0, homeTeamName: 'England',  awayTeamName: 'Morocco',   stage: 'GROUP_STAGE', status: 'FINISHED', date: new Date() },
  ]);

  // Eliminate Germany
  await Elimination.findOneAndUpdate({ teamCode: 'GER' }, { teamCode: 'GER', eliminatedAt: new Date() }, { upsert: true });

  return picks;
}

async function runIntegrationTests() {
  console.log('\n── INTEGRATION TESTS (MongoDB) ───────────────────────');

  const [picks, matches, eliminations] = await Promise.all([
    Pick.find({ cousinName: { $regex: TEST_PREFIX } }),
    Match.find({ matchId: { $gte: 99001, $lte: 99999 }, status: 'FINISHED' }),
    Elimination.find({})
  ]);

  const eliminatedCodes = new Set(eliminations.map(e => e.teamCode));
  const leaderboard = picks.map(p => ({
    memberName:   p.cousinName.replace(TEST_PREFIX, ''),
    teamCode:     p.teamCode,
    points:       calcPoints(matches, p.teamCode),
    isEliminated: eliminatedCodes.has(p.teamCode)
  })).sort((a, b) => b.points - a.points || (a.isEliminated ? 1 : -1));

  leaderboard.forEach(entry => {
    entry.rank = leaderboard.filter(e => e.points > entry.points).length + 1;
  });

  // Expected points (order within same-point ties is non-deterministic):
  // Alice (FRA): 3-0 win (15) + 2-1 win (10) = 25 pts
  // Eve   (ENG): 4-0 win (15)                = 15 pts
  // Bob   (ARG): 1-1 draw (5) + loss (0)     = 5 pts  ┐ tie — order not guaranteed
  // Carol (BRA): 1-1 draw (5)                = 5 pts  ┘
  // Frank (MAR): 0-4 loss                    = 0 pts  ┐ tie — non-eliminated first
  // Dave  (GER): 0-3 loss [ELIMINATED]       = 0 pts  ┘

  console.log('\n  Leaderboard returned:');
  leaderboard.forEach(e => {
    console.log(`    Rank ${e.rank}  ${e.memberName.padEnd(8)} ${String(e.points).padStart(3)} pts ${e.isEliminated ? '❌ eliminated' : '✅'}`);
  });

  // Expected ranks with standard competition (1224) style:
  //   Alice  25pts → rank 1
  //   Eve    15pts → rank 2
  //   Bob     5pts → rank 3  ┐ tie → both rank 3, next rank is 5
  //   Carol   5pts → rank 3  ┘
  //   Frank   0pts → rank 5  (alive, before Dave)
  //   Dave    0pts → rank 5  (eliminated, sorts after Frank)

  let passed = 0, failed = 0;
  const assertRank = (label, entry, expRank, expPts) => {
    const ok = entry?.rank === expRank && entry?.points === expPts;
    console.log(`  ${ok ? '✅' : '❌'} ${label}: expected rank ${expRank} / ${expPts}pts, got rank ${entry?.rank} / ${entry?.points}pts`);
    ok ? passed++ : failed++;
  };

  console.log('\n  Assertions:');
  assertRank('Alice rank 1 / 25pts', leaderboard[0], 1, 25);
  assertRank('Eve   rank 2 / 15pts', leaderboard[1], 2, 15);

  // Tied at rank 3 — verify both Bob and Carol appear with rank 3
  const rank3 = leaderboard.filter(e => e.rank === 3);
  const rank3ok = rank3.length === 2 && rank3.every(e => e.points === 5);
  console.log(`  ${rank3ok ? '✅' : '❌'} Bob & Carol both rank 3 / 5pts: found ${rank3.map(e => e.memberName).join(', ')}`);
  rank3ok ? passed++ : failed++;

  // After a 2-way tie at rank 3, next rank should be 5 (skipping rank 4)
  const rank5 = leaderboard.filter(e => e.rank === 5);
  const rank5ok = rank5.length === 2 && rank5.every(e => e.points === 0);
  console.log(`  ${rank5ok ? '✅' : '❌'} Frank & Dave both rank 5 / 0pts (rank 4 skipped): found ${rank5.map(e => e.memberName).join(', ')}`);
  rank5ok ? passed++ : failed++;

  // Eliminated player (Dave) must appear after non-eliminated (Frank) within same rank
  const frank = leaderboard.find(e => e.memberName === 'Frank');
  const dave  = leaderboard.find(e => e.memberName === 'Dave');
  const orderOk = leaderboard.indexOf(frank) < leaderboard.indexOf(dave);
  console.log(`  ${orderOk ? '✅' : '❌'} Frank (alive) appears before Dave (eliminated) within rank 5`);
  orderOk ? passed++ : failed++;

  // No rank 4 should exist
  const noRank4 = leaderboard.every(e => e.rank !== 4);
  console.log(`  ${noRank4 ? '✅' : '❌'} Rank 4 correctly skipped`);
  noRank4 ? passed++ : failed++;

  console.log(`\n  Result: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function cleanup() {
  await Pick.deleteMany({ cousinName: { $regex: TEST_PREFIX } });
  await Match.deleteMany({ matchId: { $gte: 99001, $lte: 99999 } });
  await Elimination.deleteOne({ teamCode: 'GER' });
  console.log('\n  🧹 Test data cleaned up');
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  const unitOk = runUnitTests();

  console.log('\n── Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('   Connected ✅');

  await insertTestData();
  const integrationOk = await runIntegrationTests();
  await cleanup();

  await mongoose.disconnect();

  const allOk = unitOk && integrationOk;
  console.log(`\n${'─'.repeat(54)}`);
  console.log(allOk ? '✅  ALL TESTS PASSED — leaderboard is working correctly' : '❌  SOME TESTS FAILED — check output above');
  console.log(`${'─'.repeat(54)}\n`);
  process.exit(allOk ? 0 : 1);
})();
