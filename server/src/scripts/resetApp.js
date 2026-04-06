import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gate_mock';

async function resetApp() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Found collections:', collections.map(c => c.name).join(', '));

    // Drop all collections
    console.log('\n🗑️  Clearing all collections...');
    for (const coll of collections) {
      await mongoose.connection.db.dropCollection(coll.name);
      console.log(`   ✓ Dropped: ${coll.name}`);
    }
    console.log('✅ All collections cleared\n');

    // Create Institution
    const InstitutionSchema = new mongoose.Schema({
      name: String,
      code: String,
      email: String,
      phone: String,
      address: String,
      isActive: Boolean,
      maxStudents: Number
    });
    const Institution = mongoose.models.Institution || mongoose.model('Institution', InstitutionSchema);

    const institution = new Institution({
      name: 'KEAM Mock Test Platform',
      code: 'KEAM',
      email: 'admin@keam.com',
      phone: '',
      address: '',
      isActive: true,
      maxStudents: 10000
    });
    await institution.save();
    console.log('✅ Created Institution: KEAM\n');

    // Create User model
    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['super_admin', 'institution_admin', 'student'], default: 'student' },
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
      phone: String,
      stream: String,
      targetYear: Number,
      examsTaken: Array,
      createdAt: { type: Date, default: Date.now }
    });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const password = await bcrypt.hash('Keam@2026', 10);

    // Create Super Admin
    const superAdmin = new User({
      name: 'Super Administrator',
      email: 'super@keam.com',
      password: password,
      role: 'super_admin',
      institutionId: institution._id,
      phone: '+91 9876543210',
      stream: 'PCM',
      targetYear: 2026
    });
    await superAdmin.save();
    console.log('✅ Created Super Admin:');
    console.log('   Email: super@keam.com');
    console.log('   Password: Keam@2026\n');

    // Create Admin
    const admin = new User({
      name: 'Test Administrator',
      email: 'admin@keam.com',
      password: password,
      role: 'institution_admin',
      institutionId: institution._id,
      phone: '+91 9876543211',
      stream: 'PCM',
      targetYear: 2026
    });
    await admin.save();
    console.log('✅ Created Admin:');
    console.log('   Email: admin@keam.com');
    console.log('   Password: Keam@2026\n');

    // Create Student
    const student = new User({
      name: 'Demo Student',
      email: 'student@keam.com',
      password: password,
      role: 'student',
      institutionId: institution._id,
      phone: '+91 9876543212',
      stream: 'PCM',
      targetYear: 2026
    });
    await student.save();
    console.log('✅ Created Student:');
    console.log('   Email: student@keam.com');
    console.log('   Password: Keam@2026\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('                  RESET COMPLETE                    ');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📋 Credentials:');
    console.log('┌─────────────────┬────────────────────┬────────────┐');
    console.log('│ Role            │ Email              │ Password   │');
    console.log('├─────────────────┼────────────────────┼────────────┤');
    console.log('│ Super Admin     │ super@keam.com     │ Keam@2026 │');
    console.log('│ Admin           │ admin@keam.com     │ Keam@2026 │');
    console.log('│ Student         │ student@keam.com   │ Keam@2026 │');
    console.log('└─────────────────┴────────────────────┴────────────┘\n');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetApp();
