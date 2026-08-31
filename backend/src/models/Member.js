const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    shg: { type: mongoose.Schema.Types.ObjectId, ref: 'SHG', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    memberId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    address: String,
    joinedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    roleInGroup: { type: String, default: 'Member' },
    aadhaarMasked: String,
    nominee: String,
    notes: String,
  },
  { timestamps: true }
);

memberSchema.index({ name: 'text', phone: 'text', memberId: 'text' });

module.exports = mongoose.model('Member', memberSchema);
