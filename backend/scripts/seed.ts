/**
 * Seed Script — Deliverable 2
 * ─────────────────────────────────────────────────────────────────
 * Creates 5 professors and 20 students in Supabase Auth + DB tables.
 *
 * Run: npm run seed
 *
 * IMPORTANT:
 *  - Run schema.sql in Supabase SQL Editor BEFORE running this script.
 *  - Requires SUPABASE_SERVICE_ROLE_KEY in your .env file.
 *  - Safe to re-run: skips users that already exist.
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_PASSWORD = 'Password123!';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const professors = [
  { full_name: 'Dr. Alice Martin',    email: 'prof.martin@university.edu',  department: 'Computer Science' },
  { full_name: 'Dr. Robert Chen',     email: 'prof.chen@university.edu',    department: 'Mathematics' },
  { full_name: 'Dr. Sarah Johnson',   email: 'prof.johnson@university.edu', department: 'Physics' },
  { full_name: 'Dr. Marcus Rivera',   email: 'prof.rivera@university.edu',  department: 'Software Engineering' },
  { full_name: 'Dr. Emily Nguyen',    email: 'prof.nguyen@university.edu',  department: 'Data Science' },
];

const students = [
  { full_name: 'Alex Thompson',    email: 'student1@university.edu' },
  { full_name: 'Jordan Lee',       email: 'student2@university.edu' },
  { full_name: 'Morgan Davis',     email: 'student3@university.edu' },
  { full_name: 'Taylor Brown',     email: 'student4@university.edu' },
  { full_name: 'Casey Wilson',     email: 'student5@university.edu' },
  { full_name: 'Riley Anderson',   email: 'student6@university.edu' },
  { full_name: 'Jamie Taylor',     email: 'student7@university.edu' },
  { full_name: 'Avery Thomas',     email: 'student8@university.edu' },
  { full_name: 'Cameron Jackson',  email: 'student9@university.edu' },
  { full_name: 'Drew White',       email: 'student10@university.edu' },
  { full_name: 'Blake Harris',     email: 'student11@university.edu' },
  { full_name: 'Skyler Martin',    email: 'student12@university.edu' },
  { full_name: 'Quinn Garcia',     email: 'student13@university.edu' },
  { full_name: 'Peyton Martinez',  email: 'student14@university.edu' },
  { full_name: 'Reese Robinson',   email: 'student15@university.edu' },
  { full_name: 'Finley Clark',     email: 'student16@university.edu' },
  { full_name: 'Rowan Rodriguez',  email: 'student17@university.edu' },
  { full_name: 'Sage Lewis',       email: 'student18@university.edu' },
  { full_name: 'River Walker',     email: 'student19@university.edu' },
  { full_name: 'Harper Hall',      email: 'student20@university.edu' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAuthUser(
  email: string,
  fullName: string,
  role: 'professor' | 'student',
  department?: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,     // Skip email confirmation — pre-seeded accounts
    user_metadata: {
      full_name: fullName,
      role,
      ...(department ? { department } : {}),
    },
  });

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log(`  ⏭  Skipped (already exists): ${email}`);
      // Fetch existing user ID
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find(u => u.email === email);
      return existing?.id ?? null;
    }
    console.error(`  ❌ Failed to create auth user ${email}:`, error.message);
    return null;
  }

  return data.user.id;
}

async function upsertProfessor(id: string, fullName: string, email: string, department: string) {
  const { error } = await supabase
    .from('professors')
    .upsert({ id, full_name: fullName, email, department, availability_status: 'available' });

  if (error) {
    console.error(`  ❌ Failed to upsert professor row for ${email}:`, error.message);
  }
}

async function upsertStudent(id: string, fullName: string, email: string) {
  const { error } = await supabase
    .from('students')
    .upsert({ id, full_name: fullName, email });

  if (error) {
    console.error(`  ❌ Failed to upsert student row for ${email}:`, error.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Starting seed...\n');
  console.log(`   Default password for all accounts: ${DEFAULT_PASSWORD}\n`);

  // ── Professors ──
  console.log('👩‍🏫 Creating professors...');
  for (const prof of professors) {
    process.stdout.write(`  → ${prof.full_name} (${prof.email}) ... `);
    const id = await createAuthUser(prof.email, prof.full_name, 'professor', prof.department);
    if (id) {
      await upsertProfessor(id, prof.full_name, prof.email, prof.department);
      console.log('✅');
    }
  }

  // ── Students ──
  console.log('\n🎓 Creating students...');
  for (const student of students) {
    process.stdout.write(`  → ${student.full_name} (${student.email}) ... `);
    const id = await createAuthUser(student.email, student.full_name, 'student');
    if (id) {
      await upsertStudent(id, student.full_name, student.email);
      console.log('✅');
    }
  }

  // ── Summary ──
  console.log('\n─────────────────────────────────────────────');
  console.log('✅ Seed complete!\n');
  console.log('Test credentials (all use the same password):');
  console.log(`  Password: ${DEFAULT_PASSWORD}\n`);
  console.log('Professors:');
  professors.forEach(p => console.log(`  ${p.email}`));
  console.log('\nStudents (sample):');
  console.log('  student1@university.edu');
  console.log('  student2@university.edu');
  console.log('  student3@university.edu');
  console.log('  ...');
  console.log('─────────────────────────────────────────────\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
