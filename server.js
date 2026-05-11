require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const Pick = require('./models/Pick');
const Elimination = require('./models/Elimination');
const Match = require('./models/Match');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'goat2026', 10);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try { await Pick.collection.dropIndex('teamCode_1'); } catch (_) {}
  })
  .catch(err => console.error('MongoDB error:', err));

// ── Teams data ───────────────────────────────────────────────────────────────
const TEAMS = [
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'HOST', confederation: 'CONCACAF' },
  { code: 'CAN', name: 'Canada',        flag: '🇨🇦', group: 'HOST', confederation: 'CONCACAF' },
  { code: 'MEX', name: 'Mexico',        flag: '🇲🇽', group: 'HOST', confederation: 'CONCACAF' },
  { code: 'ARG', name: 'Argentina',     flag: '🇦🇷', confederation: 'CONMEBOL' },
  { code: 'BRA', name: 'Brazil',        flag: '🇧🇷', confederation: 'CONMEBOL' },
  { code: 'URU', name: 'Uruguay',       flag: '🇺🇾', confederation: 'CONMEBOL' },
  { code: 'COL', name: 'Colombia',      flag: '🇨🇴', confederation: 'CONMEBOL' },
  { code: 'ECU', name: 'Ecuador',       flag: '🇪🇨', confederation: 'CONMEBOL' },
  { code: 'VEN', name: 'Venezuela',     flag: '🇻🇪', confederation: 'CONMEBOL' },
  { code: 'FRA', name: 'France',        flag: '🇫🇷', confederation: 'UEFA' },
  { code: 'ESP', name: 'Spain',         flag: '🇪🇸', confederation: 'UEFA' },
  { code: 'GER', name: 'Germany',       flag: '🇩🇪', confederation: 'UEFA' },
  { code: 'ENG', name: 'England',       flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA' },
  { code: 'POR', name: 'Portugal',      flag: '🇵🇹', confederation: 'UEFA' },
  { code: 'NED', name: 'Netherlands',   flag: '🇳🇱', confederation: 'UEFA' },
  { code: 'BEL', name: 'Belgium',       flag: '🇧🇪', confederation: 'UEFA' },
  { code: 'ITA', name: 'Italy',         flag: '🇮🇹', confederation: 'UEFA' },
  { code: 'CRO', name: 'Croatia',       flag: '🇭🇷', confederation: 'UEFA' },
  { code: 'AUT', name: 'Austria',       flag: '🇦🇹', confederation: 'UEFA' },
  { code: 'SUI', name: 'Switzerland',   flag: '🇨🇭', confederation: 'UEFA' },
  { code: 'SCO', name: 'Scotland',      flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA' },
  { code: 'TUR', name: 'Turkey',        flag: '🇹🇷', confederation: 'UEFA' },
  { code: 'UKR', name: 'Ukraine',       flag: '🇺🇦', confederation: 'UEFA' },
  { code: 'SRB', name: 'Serbia',        flag: '🇷🇸', confederation: 'UEFA' },
  { code: 'DEN', name: 'Denmark',       flag: '🇩🇰', confederation: 'UEFA' },
  { code: 'POL', name: 'Poland',        flag: '🇵🇱', confederation: 'UEFA' },
  { code: 'HUN', name: 'Hungary',       flag: '🇭🇺', confederation: 'UEFA' },
  { code: 'MAR', name: 'Morocco',       flag: '🇲🇦', confederation: 'CAF' },
  { code: 'SEN', name: 'Senegal',       flag: '🇸🇳', confederation: 'CAF' },
  { code: 'NGA', name: 'Nigeria',       flag: '🇳🇬', confederation: 'CAF' },
  { code: 'EGY', name: 'Egypt',         flag: '🇪🇬', confederation: 'CAF' },
  { code: 'CMR', name: 'Cameroon',      flag: '🇨🇲', confederation: 'CAF' },
  { code: 'GHA', name: 'Ghana',         flag: '🇬🇭', confederation: 'CAF' },
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', confederation: 'CAF' },
  { code: 'TUN', name: 'Tunisia',       flag: '🇹🇳', confederation: 'CAF' },
  { code: 'ALG', name: 'Algeria',       flag: '🇩🇿', confederation: 'CAF' },
  { code: 'JPN', name: 'Japan',         flag: '🇯🇵', confederation: 'AFC' },
  { code: 'KOR', name: 'South Korea',   flag: '🇰🇷', confederation: 'AFC' },
  { code: 'IRN', name: 'Iran',          flag: '🇮🇷', confederation: 'AFC' },
  { code: 'KSA', name: 'Saudi Arabia',  flag: '🇸🇦', confederation: 'AFC' },
  { code: 'AUS', name: 'Australia',     flag: '🇦🇺', confederation: 'AFC' },
  { code: 'QAT', name: 'Qatar',         flag: '🇶🇦', confederation: 'AFC' },
  { code: 'IRQ', name: 'Iraq',          flag: '🇮🇶', confederation: 'AFC' },
  { code: 'UZB', name: 'Uzbekistan',    flag: '🇺🇿', confederation: 'AFC' },
  { code: 'PAN', name: 'Panama',        flag: '🇵🇦', confederation: 'CONCACAF' },
  { code: 'CRC', name: 'Costa Rica',    flag: '🇨🇷', confederation: 'CONCACAF' },
  { code: 'HON', name: 'Honduras',      flag: '🇭🇳', confederation: 'CONCACAF' },
  { code: 'NZL', name: 'New Zealand',   flag: '🇳🇿', confederation: 'OFC' },
];

// Maps football-data.org team names → our team codes
const TEAM_NAME_MAP = {
  'United States':  'USA', 'USA':             'USA',
  'Canada':         'CAN', 'Mexico':          'MEX',
  'Argentina':      'ARG', 'Brazil':          'BRA',
  'Uruguay':        'URU', 'Colombia':        'COL',
  'Ecuador':        'ECU', 'Venezuela':       'VEN',
  'France':         'FRA', 'Spain':           'ESP',
  'Germany':        'GER', 'England':         'ENG',
  'Portugal':       'POR', 'Netherlands':     'NED',
  'Belgium':        'BEL', 'Italy':           'ITA',
  'Croatia':        'CRO', 'Austria':         'AUT',
  'Switzerland':    'SUI', 'Scotland':        'SCO',
  'Turkey':         'TUR', 'Ukraine':         'UKR',
  'Serbia':         'SRB', 'Denmark':         'DEN',
  'Poland':         'POL', 'Hungary':         'HUN',
  'Morocco':        'MAR', 'Senegal':         'SEN',
  'Nigeria':        'NGA', 'Egypt':           'EGY',
  'Cameroon':       'CMR', 'Ghana':           'GHA',
  "Côte d'Ivoire":  'CIV', "Cote d'Ivoire":   'CIV',
  'Ivory Coast':    'CIV', 'Tunisia':         'TUN',
  'Algeria':        'ALG', 'Japan':           'JPN',
  'South Korea':    'KOR', 'Korea Republic':  'KOR',
  'Iran':           'IRN', 'Saudi Arabia':    'KSA',
  'Australia':      'AUS', 'Qatar':           'QAT',
  'Iraq':           'IRQ', 'Uzbekistan':      'UZB',
  'Panama':         'PAN', 'Costa Rica':      'CRC',
  'Honduras':       'HON', 'New Zealand':     'NZL',
};

function calcPoints(matches, teamCode) {
  let pts = 0;
  for (const m of matches) {
    const isHome = m.homeTeamCode === teamCode;
    const isAway = m.awayTeamCode === teamCode;
    if (!isHome && !isAway) continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    const scored = isHome ? m.homeScore : m.awayScore;
    const conceded = isHome ? m.awayScore : m.homeScore;
    const diff = scored - conceded;
    if (diff > 0)       { pts += 10; if (diff > 2) pts += 5; }
    else if (diff === 0) { pts += 5; }
  }
  return pts;
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
  const [picks, eliminations] = await Promise.all([Pick.find({}), Elimination.find({})]);
  const eliminatedCodes = new Set(eliminations.map(e => e.teamCode));
  const pickersByTeam = {};
  picks.forEach(p => {
    if (!pickersByTeam[p.teamCode]) pickersByTeam[p.teamCode] = [];
    pickersByTeam[p.teamCode].push(p.cousinName);
  });
  const teams = TEAMS.map(t => ({
    ...t,
    isPicked: !!pickersByTeam[t.code],
    pickers: pickersByTeam[t.code] || [],
    isEliminated: eliminatedCodes.has(t.code)
  }));
  res.json({ teams, totalTeams: TEAMS.length });
});

app.get('/api/picks', async (req, res) => {
  const picks = await Pick.find({}).sort({ pickedAt: -1 });
  res.json(picks);
});

app.get('/api/leaderboard', async (req, res) => {
  const [picks, matches, eliminations] = await Promise.all([
    Pick.find({}),
    Match.find({ status: 'FINISHED' }),
    Elimination.find({})
  ]);
  const eliminatedCodes = new Set(eliminations.map(e => e.teamCode));
  const leaderboard = picks.map(p => ({
    memberName:   p.cousinName,
    teamCode:     p.teamCode,
    teamName:     p.teamName,
    teamFlag:     p.teamFlag,
    points:       calcPoints(matches, p.teamCode),
    isEliminated: eliminatedCodes.has(p.teamCode)
  })).sort((a, b) => b.points - a.points || (a.isEliminated ? 1 : -1));

  // Standard competition ranking: tied players share the same rank,
  // next rank skips (e.g. two at #1 → next is #3)
  leaderboard.forEach(entry => {
    entry.rank = leaderboard.filter(e => e.points > entry.points).length + 1;
  });

  res.json(leaderboard);
});

app.post('/api/pick', async (req, res) => {
  const { cousinName, teamCode } = req.body;
  if (!cousinName || !teamCode) return res.status(400).json({ error: 'Missing fields' });

  const team = TEAMS.find(t => t.code === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const allExistingPicks = await Pick.find({}, 'cousinName teamName');
  const newLower = cousinName.toLowerCase();
  const conflict = allExistingPicks.find(p => {
    const ex = p.cousinName.toLowerCase();
    return ex.includes(newLower) || newLower.includes(ex);
  });
  if (conflict) return res.status(409).json({ error: `Name "${cousinName}" is too similar to "${conflict.cousinName}" who already picked ${conflict.teamName}!` });

  const pick = new Pick({ cousinName, teamCode, teamName: team.name, teamFlag: team.flag });
  await pick.save();
  const totalPicks = await Pick.countDocuments();
  res.json({ success: true, cousinName, teamCode, teamName: team.name, teamFlag: team.flag, pickedAt: pick.pickedAt, totalPicks });
});

app.post('/api/admin/update', async (req, res) => {
  const { password, cousinName, newTeamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password 😏' });

  const pick = await Pick.findOne({ cousinName: { $regex: new RegExp(`^${cousinName}$`, 'i') } });
  if (!pick) return res.status(404).json({ error: 'Member not found' });

  const team = TEAMS.find(t => t.code === newTeamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const oldTeam = pick.teamName;
  pick.teamCode = newTeamCode; pick.teamName = team.name;
  pick.teamFlag = team.flag;   pick.pickedAt = new Date();
  await pick.save();
  res.json({ success: true, message: `${cousinName}'s team changed from ${oldTeam} to ${team.name}` });
});

app.post('/api/admin/delete', async (req, res) => {
  const { password, cousinName } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password 😏' });

  const result = await Pick.deleteOne({ cousinName: { $regex: new RegExp(`^${cousinName}$`, 'i') } });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Member not found' });
  res.json({ success: true, message: `${cousinName}'s pick removed` });
});

app.post('/api/admin/eliminate', async (req, res) => {
  const { password, teamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password' });

  const team = TEAMS.find(t => t.code === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  await Elimination.findOneAndUpdate({ teamCode }, { teamCode, eliminatedAt: new Date() }, { upsert: true, new: true });
  res.json({ success: true, message: `${team.flag} ${team.name} eliminated` });
});

app.post('/api/admin/restore', async (req, res) => {
  const { password, teamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password' });

  const team = TEAMS.find(t => t.code === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  await Elimination.deleteOne({ teamCode });
  res.json({ success: true, message: `${team.flag} ${team.name} restored` });
});

app.post('/api/admin/sync-matches', async (req, res) => {
  const { password } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password' });

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FOOTBALL_API_KEY not set in environment variables' });

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey }
    });
    if (!response.ok) throw new Error(`API responded with ${response.status}`);

    const data = await response.json();
    const matches = (data.matches || []).filter(m => m.status === 'FINISHED');

    let synced = 0;
    for (const m of matches) {
      const homeCode = TEAM_NAME_MAP[m.homeTeam.name] || m.homeTeam.tla;
      const awayCode = TEAM_NAME_MAP[m.awayTeam.name] || m.awayTeam.tla;
      await Match.findOneAndUpdate(
        { matchId: m.id },
        {
          matchId:      m.id,
          homeTeamCode: homeCode,
          awayTeamCode: awayCode,
          homeTeamName: m.homeTeam.name,
          awayTeamName: m.awayTeam.name,
          homeScore:    m.score.fullTime.home,
          awayScore:    m.score.fullTime.away,
          date:         new Date(m.utcDate),
          stage:        m.stage,
          status:       m.status
        },
        { upsert: true, new: true }
      );
      synced++;
    }
    res.json({ success: true, message: `Synced ${synced} finished match${synced !== 1 ? 'es' : ''}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teams-data', (req, res) => res.json(TEAMS));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n⚽ FIFA 2026 Family running at http://localhost:${PORT}\n`));

module.exports = app;
