const mongoose = require('mongoose');

const eliminationSchema = new mongoose.Schema({
  teamCode: { type: String, required: true, unique: true },
  eliminatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Elimination', eliminationSchema);
