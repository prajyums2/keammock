import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Institution from '../models/Institution.js';

export const seedAdmin = async () => {
  try {
    let institution = await Institution.findOne({ code: 'KEAM' });
    if (!institution) {
      institution = new Institution({
        name: 'KEAM Mock Test Platform',
        code: 'KEAM',
        email: 'admin@keam.com',
        phone: '',
        address: '',
        isActive: true,
        maxStudents: 10000
      });
      await institution.save();
      console.log('✅ Default institution created: KEAM');
    }

    const passwordHash = await bcrypt.hash('Keam@2026', 10);
    console.log('SEED: Hashing password, result:', passwordHash.slice(0, 30));

    // Create Super Admin
    const existingSuper = await User.findOne({ email: 'super@keam.com' });
    if (!existingSuper) {
      const superAdmin = new User({
        name: 'Super Administrator',
        email: 'super@keam.com',
        password: passwordHash,
        role: 'super_admin',
        institutionId: institution._id,
        phone: '+91 9876543210',
        stream: 'PCM',
        targetYear: 2026
      });
      await superAdmin.save();
      console.log('✅ Super admin created: super@keam.com / Keam@2026');
    }

    // Create Institution Admin
    const existingAdmin = await User.findOne({ email: 'admin@keam.com' });
    if (!existingAdmin) {
      const admin = new User({
        name: 'Test Administrator',
        email: 'admin@keam.com',
        password: passwordHash,
        role: 'institution_admin',
        institutionId: institution._id,
        phone: '+91 9876543211',
        stream: 'PCM',
        targetYear: 2026
      });
      await admin.save();
      console.log('✅ Admin created: admin@keam.com / Keam@2026');
    }

    // Create Student
    const existingStudent = await User.findOne({ email: 'student@keam.com' });
    if (!existingStudent) {
      const student = new User({
        name: 'Demo Student',
        email: 'student@keam.com',
        password: passwordHash,
        role: 'student',
        institutionId: institution._id,
        phone: '+91 9876543212',
        stream: 'PCM',
        targetYear: 2026
      });
      await student.save();
      console.log('✅ Student created: student@keam.com / Keam@2026');
    }
  } catch (error) {
    console.error('❌ Error seeding:', error);
  }
};
