require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const Pick = require('./models/Pick');
const Elimination = require('./models/Elimination');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'goat2026', 10);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Drop the old unique index on teamCode so multiple cousins can pick the same team
    try {
      await Pick.collection.dropIndex('teamCode_1');
      console.log('Dropped teamCode unique index');
    } catch (_) {}
  })
  .catch(err => console.error('MongoDB error:', err));

// ── Teams data ──────────────────────────────────────────────────────────────
const TEAMS = [
  // Host nations (glowing)
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'HOST', confederation: 'CONCACAF' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'HOST', confederation: 'CONCACAF' },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'HOST', confederation: 'CONCACAF' },
  // CONMEBOL
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', confederation: 'CONMEBOL' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', confederation: 'CONMEBOL' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', confederation: 'CONMEBOL' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', confederation: 'CONMEBOL' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', confederation: 'CONMEBOL' },
  { code: 'VEN', name: 'Venezuela', flag: '🇻🇪', confederation: 'CONMEBOL' },
  // UEFA
  { code: 'FRA', name: 'France', flag: '🇫🇷', confederation: 'UEFA' },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', confederation: 'UEFA' },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', confederation: 'UEFA' },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', confederation: 'UEFA' },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', confederation: 'UEFA' },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', confederation: 'UEFA' },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', confederation: 'UEFA' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', confederation: 'UEFA' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', confederation: 'UEFA' },
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', confederation: 'UEFA' },
  { code: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA' },
  { code: 'TUR', name: 'Turkey', flag: '🇹🇷', confederation: 'UEFA' },
  { code: 'UKR', name: 'Ukraine', flag: '🇺🇦', confederation: 'UEFA' },
  { code: 'SRB', name: 'Serbia', flag: '🇷🇸', confederation: 'UEFA' },
  { code: 'DEN', name: 'Denmark', flag: '🇩🇰', confederation: 'UEFA' },
  { code: 'POL', name: 'Poland', flag: '🇵🇱', confederation: 'UEFA' },
  { code: 'HUN', name: 'Hungary', flag: '🇭🇺', confederation: 'UEFA' },
  // CAF
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', confederation: 'CAF' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', confederation: 'CAF' },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬', confederation: 'CAF' },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', confederation: 'CAF' },
  { code: 'CMR', name: 'Cameroon', flag: '🇨🇲', confederation: 'CAF' },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', confederation: 'CAF' },
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', confederation: 'CAF' },
  { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', confederation: 'CAF' },
  { code: 'ALG', name: 'Algeria', flag: '🇩🇿', confederation: 'CAF' },
  // AFC
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', confederation: 'AFC' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', confederation: 'AFC' },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', confederation: 'AFC' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', confederation: 'AFC' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', confederation: 'AFC' },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', confederation: 'AFC' },
  { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', confederation: 'AFC' },
  { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', confederation: 'AFC' },
  // CONCACAF
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', confederation: 'CONCACAF' },
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷', confederation: 'CONCACAF' },
  { code: 'HON', name: 'Honduras', flag: '🇭🇳', confederation: 'CONCACAF' },
  // OFC
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', confederation: 'OFC' },
];

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
  const [picks, eliminations] = await Promise.all([
    Pick.find({}),
    Elimination.find({})
  ]);
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
  const payload = { cousinName, teamCode, teamName: team.name, teamFlag: team.flag, pickedAt: pick.pickedAt, totalPicks };
  io.emit('new_pick', payload);

  res.json({ success: true, ...payload });
});

app.post('/api/admin/update', async (req, res) => {
  const { password, cousinName, newTeamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password, try harder 😏' });

  const pick = await Pick.findOne({ cousinName: { $regex: new RegExp(`^${cousinName}$`, 'i') } });
  if (!pick) return res.status(404).json({ error: 'Cousin not found' });

  const team = TEAMS.find(t => t.code === newTeamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const oldTeam = pick.teamName;
  pick.teamCode = newTeamCode;
  pick.teamName = team.name;
  pick.teamFlag = team.flag;
  pick.pickedAt = new Date();
  await pick.save();

  io.emit('pick_updated', { cousinName, oldTeam, newTeam: team.name, newFlag: team.flag });
  res.json({ success: true, message: `${cousinName}'s team changed from ${oldTeam} to ${team.name}` });
});

app.post('/api/admin/delete', async (req, res) => {
  const { password, cousinName } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password 😏' });

  const result = await Pick.deleteOne({ cousinName: { $regex: new RegExp(`^${cousinName}$`, 'i') } });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Cousin not found' });

  io.emit('pick_deleted', { cousinName });
  res.json({ success: true, message: `${cousinName}'s pick removed` });
});

app.post('/api/admin/eliminate', async (req, res) => {
  const { password, teamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password' });

  const team = TEAMS.find(t => t.code === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  await Elimination.findOneAndUpdate(
    { teamCode },
    { teamCode, eliminatedAt: new Date() },
    { upsert: true, new: true }
  );

  io.emit('team_eliminated', { teamCode, teamName: team.name, teamFlag: team.flag });
  res.json({ success: true, message: `${team.flag} ${team.name} eliminated` });
});

app.post('/api/admin/restore', async (req, res) => {
  const { password, teamCode } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_HASH)) return res.status(401).json({ error: 'Wrong password' });

  const team = TEAMS.find(t => t.code === teamCode);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  await Elimination.deleteOne({ teamCode });

  io.emit('team_restored', { teamCode, teamName: team.name });
  res.json({ success: true, message: `${team.flag} ${team.name} restored` });
});

app.get('/api/teams-data', (req, res) => res.json(TEAMS));

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('⚽ A cousin connected:', socket.id);
  socket.on('disconnect', () => console.log('💔 Cousin left:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n⚽ FIFA Cousins 2026 running at http://localhost:${PORT}\n`));
