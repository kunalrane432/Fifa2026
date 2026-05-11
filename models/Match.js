const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId:      { type: Number, unique: true, required: true },
  homeTeamCode: { type: String },
  awayTeamCode: { type: String },
  homeTeamName: { type: String },
  awayTeamName: { type: String },
  homeScore:    { type: Number, default: null },
  awayScore:    { type: Number, default: null },
  date:         { type: Date },
  stage:        { type: String },
  status:       { type: String }
});

module.exports = mongoose.model('Match', matchSchema);
