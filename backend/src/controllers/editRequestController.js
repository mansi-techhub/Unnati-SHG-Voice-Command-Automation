const EditRequest = require('../models/EditRequest');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const filter = { shg: req.user.shg };
  if (req.user.role !== 'admin') filter.member = req.user.member;
  const requests = await EditRequest.find(filter)
    .populate('member', 'name memberId')
    .sort({ createdAt: -1 });
  res.json(requests);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.user.member) return res.status(403).json({ message: 'A linked member profile is required to submit a correction request' });
  const member = await Member.findOne({ _id: req.user.member, shg: req.user.shg }).select('name memberId');
  if (!member) return res.status(403).json({ message: 'Member profile not found in this SHG' });

  const request = await EditRequest.create({
    shg: req.user.shg,
    member: member._id,
    memberName: member.name,
    memberId: member.memberId,
    category: req.body.category,
    reference: req.body.reference,
    description: req.body.description,
  });
  res.status(201).json(request);
});

exports.update = asyncHandler(async (req, res) => {
  const request = await EditRequest.findOneAndUpdate(
    { _id: req.params.id, shg: req.user.shg },
    {
      status: req.body.status,
      adminResponse: req.body.adminResponse,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true, runValidators: true }
  ).populate('member', 'name memberId');
  if (!request) return res.status(404).json({ message: 'Correction request not found' });
  res.json(request);
});
