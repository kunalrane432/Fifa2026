const mongoose = require('mongoose');

const pickSchema = new mongoose.Schema({
  cousinName: { type: String, required: true, trim: true },
  teamCode: { type: String, required: true },
  teamName: { type: String, required: true },
  teamFlag: { type: String, required: true },
  pickedAt: { type: Date, default: Date.now },
  isLastPick: { type: Boolean, default: false }
});

module.exports = mongoose.model('Pick', pickSchema);
