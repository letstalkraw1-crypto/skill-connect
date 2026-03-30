const mongoose = require('mongoose');

const proficiencyLevelSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, unique: true, required: true }
});

module.exports = mongoose.model('ProficiencyLevel', proficiencyLevelSchema);
