import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No authentication token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.institutionId = decoded.institutionId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is invalid' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.userRole !== 'super_admin' && req.userRole !== 'institution_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

export const superAdminOnly = (req, res, next) => {
  if (req.userRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
  }
  next();
};

export const institutionAdminOnly = (req, res, next) => {
  if (req.userRole !== 'institution_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Institution admin only.' });
  }
  next();
};
