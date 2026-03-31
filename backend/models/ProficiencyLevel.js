const mongoose = require('mongoose');

const proficiencyLevelSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  name: { type: String, unique: true, required: true }
});

module.exports = mongoose.model('ProficiencyLevel', proficiencyLevelSchema);
