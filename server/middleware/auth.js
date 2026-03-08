module.exports = function guard(req, res, next) {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  next();
};
