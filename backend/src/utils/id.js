function makeId(prefix) {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${stamp}${random}`;
}

module.exports = { makeId };
