import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Institution from '../models/Institution.js';
import { successResponse, errorResponse } from '../services/utils.js';

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function register(req, res) {
  try {
    const { name, email, password, role, phone, institutionId, institutionCode, stream, targetYear } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return errorResponse(res, 'User already exists', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    let userInstitutionId = institutionId;

    if (role === 'institution_admin') {
      if (!institutionCode) return errorResponse(res, 'Institution code is required', 400);
      let inst = await Institution.findOne({ code: institutionCode });
      if (!inst) {
        inst = new Institution({ name, code: institutionCode, email, phone: phone || '', isActive: true });
        await inst.save();
      }
      userInstitutionId = inst._id;
    } else if (role === 'student') {
      if (!req.userId) {
        return errorResponse(res, 'Students cannot register themselves. Please contact your administrator for credentials.', 403);
      }
      if (institutionCode && !userInstitutionId) {
        const inst = await Institution.findOne({ code: institutionCode });
        if (!inst) return errorResponse(res, 'Invalid institution code', 400);
        userInstitutionId = inst._id;
      }
      if (!userInstitutionId) return errorResponse(res, 'Institution code is required', 400);
    }

    const user = new User({
      name, email, password: hashedPassword,
      role: role || 'student', phone,
      institutionId: userInstitutionId,
      stream: stream || 'PCM',
      targetYear
    });
    await user.save();

    if (role === 'institution_admin' && userInstitutionId) {
      await Institution.findByIdAndUpdate(userInstitutionId, { adminId: user._id });
    }

    successResponse(res, {
      id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId
    }, 'User created', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createStudent(req, res) {
  try {
    const { name, email, phone, targetYear, institutionCode } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email are required', 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return errorResponse(res, 'User with this email already exists', 400);

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    let userInstitutionId = req.institutionId;

    if (institutionCode && !userInstitutionId) {
      const inst = await Institution.findOne({ code: institutionCode });
      if (inst) userInstitutionId = inst._id;
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      phone: phone || '',
      institutionId: userInstitutionId,
      stream: 'PCM',
      targetYear: targetYear || null
    });
    await user.save();

    successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      password
    }, 'Student created successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, phone, role, institutionCode, targetYear } = req.body;

    if (!name || !email || !role) {
      return errorResponse(res, 'Name, email and role are required', 400);
    }

    if (!['super_admin', 'institution_admin', 'student'].includes(role)) {
      return errorResponse(res, 'Invalid role. Must be super_admin, institution_admin, or student', 400);
    }

    if (role === 'super_admin' && req.userRole !== 'super_admin') {
      return errorResponse(res, 'Only super admins can create other super admins', 403);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return errorResponse(res, 'User with this email already exists', 400);

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    let userInstitutionId = null;

    if (role === 'institution_admin' || role === 'student') {
      if (institutionCode) {
        let inst = await Institution.findOne({ code: institutionCode });
        if (!inst) {
          inst = new Institution({ name: institutionCode, code: institutionCode, email, phone: phone || '', isActive: true });
          await inst.save();
        }
        userInstitutionId = inst._id;
      } else if (req.institutionId) {
        userInstitutionId = req.institutionId;
      }
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      institutionId: userInstitutionId,
      stream: role === 'student' ? 'PCM' : undefined,
      targetYear: role === 'student' ? (targetYear || null) : undefined
    });
    await user.save();

    if (role === 'institution_admin' && userInstitutionId) {
      await Institution.findByIdAndUpdate(userInstitutionId, { adminId: user._id });
    }

    successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      password
    }, `${role} created successfully`, 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createBulkUsers(req, res) {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return errorResponse(res, 'Users array is required', 400);
    }

    if (users.length > 500) {
      return errorResponse(res, 'Maximum 500 users can be created at once', 400);
    }

    const createdUsers = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      try {
        if (!u.name || !u.email || !u.role) {
          errors.push({ index: i, email: u.email, error: 'Name, email and role are required' });
          continue;
        }

        if (!['super_admin', 'institution_admin', 'student'].includes(u.role)) {
          errors.push({ index: i, email: u.email, error: 'Invalid role' });
          continue;
        }

        const existingUser = await User.findOne({ email: u.email });
        if (existingUser) {
          errors.push({ index: i, email: u.email, error: 'Email already exists' });
          continue;
        }

        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        let userInstitutionId = req.institutionId;
        if (u.institutionCode && !userInstitutionId) {
          const inst = await Institution.findOne({ code: u.institutionCode });
          if (inst) userInstitutionId = inst._id;
        }

        const user = new User({
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          phone: u.phone || '',
          institutionId: userInstitutionId,
          stream: u.role === 'student' ? 'PCM' : undefined,
          targetYear: u.role === 'student' ? (u.targetYear || null) : undefined
        });
        await user.save();

        createdUsers.push({
          name: user.name,
          email: user.email,
          role: user.role,
          password,
          id: user._id
        });
      } catch (err) {
        errors.push({ index: i, email: u.email, error: err.message });
      }
    }

    successResponse(res, {
      created: createdUsers.length,
      errors: errors.length,
      users: createdUsers,
      allErrors: errors
    }, `${createdUsers.length} users created`);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email?.toLowerCase() });
    
    if (!user) return errorResponse(res, 'Invalid credentials', 400);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return errorResponse(res, 'Invalid credentials', 400);

    const token = jwt.sign(
      { userId: user._id, role: user.role, institutionId: user.institutionId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId }
    }, 'Login successful');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.userId).select('-password').populate('institutionId');
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, user);
  } catch (error) {
    errorResponse(res, 'Token is invalid', 401);
  }
}

export async function getAllUsers(req, res) {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    let query = {};

    if (req.userRole === 'institution_admin') {
      query.institutionId = req.institutionId;
    }
    if (role) query.role = role;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    successResponse(res, { users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, user);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateUser(req, res) {
  try {
    const updates = { ...req.body };
    delete updates.password;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, user, 'User updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, null, 'User deleted');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function resetPassword(req, res) {
  try {
    let newPassword;
    
    if (req.body.newPassword && req.body.newPassword.length >= 6) {
      newPassword = req.body.newPassword;
    } else {
      newPassword = generatePassword();
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password: hashedPassword }, { new: true }).select('-password');
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, { password: newPassword }, 'Password reset successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getUserStats(req, res) {
  try {
    let query = {};
    if (req.userRole === 'institution_admin') query.institutionId = req.institutionId;
    const totalUsers = await User.countDocuments(query);
    const totalStudents = await User.countDocuments({ ...query, role: 'student' });
    const totalAdmins = await User.countDocuments({ ...query, role: 'institution_admin' });
    const recentUsers = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(5);
    successResponse(res, { totalUsers, totalStudents, totalAdmins, recentUsers });
  } catch (error) {
    errorResponse(res, error.message);
  }
}
