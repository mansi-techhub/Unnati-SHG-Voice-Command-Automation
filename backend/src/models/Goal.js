const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    dueDate: Date,
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    contributions: [{ amount: Number, date: { type: Date, default: Date.now }, note: String, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
