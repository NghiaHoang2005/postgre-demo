function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    return res.sendStatus(403);
  };
}
module.exports = { requireRole };