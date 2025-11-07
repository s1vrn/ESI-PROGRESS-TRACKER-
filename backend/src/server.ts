import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

app.use(cors());
app.use(express.json({ limit: '25mb' }));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple mock auth middleware using headers: x-user-id, x-role (student|professor)
app.use((req, res, next) => {
  const userId = req.header('x-user-id') || 'anon';
  const role = (req.header('x-role') as 'student' | 'professor' | undefined) || 'student';
  (req as any).auth = { userId, role };
  next();
});

// Data helpers
type User = {
  id: string;
  userId: string;
  password: string; // In production, use hashed passwords (bcrypt)
  role: 'student' | 'professor';
  email: string; // Required ESI institutional email
  name?: string;
  profilePicture?: string; // URL or path to profile picture
  branch?: string; // Student's branch/major (required for students)
  year?: 'freshman' | 'second year' | 'third year'; // Student's year (required for students)
  verified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: string;
  createdAt: string;
};

type SubmissionVersion = {
  version: number;
  contentRef: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  changes?: string; // Description of changes in this version
};

type Submission = {
  id: string;
  studentId: string;
  professorId: string; // Required: professor responsible for this submission
  groupId?: string;
  title: string;
  type: 'pdf' | 'zip' | 'link' | 'report' | 'other';
  contentRef: string; // path or URL (current version)
  notes?: string;
  milestones?: { label: string; date: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
  status: 'submitted' | 'approved' | 'resubmit';
  grade?: number;
  feedback?: { by: string; text: string; date: string }[];
  versions?: SubmissionVersion[]; // Version history
  currentVersion: number; // Current version number
};

type Group = {
  id: string;
  name: string;
  description?: string;
  createdBy: string; // Student who created the group
  members: string[]; // Array of student userIds
  createdAt: string;
  updatedAt: string;
};

type AssignmentTemplate = {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'zip' | 'link' | 'report' | 'other';
  instructions?: string;
  requirements?: string[];
  dueDate?: string;
  createdBy: string; // Professor who created the template
  createdAt: string;
  updatedAt: string;
};

type Notification = {
  id: string;
  userId: string; // Recipient user ID
  type: 'feedback' | 'status_change' | 'grade' | 'new_submission' | 'milestone_reminder';
  title: string;
  message: string;
  relatedId?: string; // Related submission ID or other entity
  read: boolean;
  createdAt: string;
  link?: string; // Optional link to navigate to
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  pinned: boolean;
  createdBy: string;
  createdAt: string;
};

ensureDataDir();

const dbPath = path.join(DATA_DIR, 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

type DBUserRow = {
  id: string;
  userId: string;
  password: string;
  role: string;
  email: string;
  name: string | null;
  profilePicture: string | null;
  branch: string | null;
  year: string | null;
  verified: number;
  verificationCode: string | null;
  verificationCodeExpiry: string | null;
  createdAt: string;
};

type DBSubmissionRow = {
  id: string;
  studentId: string;
  professorId: string;
  groupId: string | null;
  title: string;
  type: string;
  contentRef: string;
  notes: string | null;
  milestones: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  versions: string | null;
  currentVersion: number;
};

type DBAnnouncementRow = {
  id: string;
  title: string;
  message: string;
  pinned: number;
  createdBy: string;
  createdAt: string;
};

function initDatabase() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT NOT NULL,
      userId TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      profilePicture TEXT,
      branch TEXT,
      year TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verificationCode TEXT,
      verificationCodeExpiry TEXT,
      createdAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      professorId TEXT NOT NULL,
      groupId TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      contentRef TEXT NOT NULL,
      notes TEXT,
      milestones TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT NOT NULL,
      grade REAL,
      feedback TEXT,
      versions TEXT,
      currentVersion INTEGER NOT NULL,
      FOREIGN KEY(studentId) REFERENCES users(userId) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY(professorId) REFERENCES users(userId) ON UPDATE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 1,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(createdBy) REFERENCES users(userId) ON UPDATE CASCADE
    )
  `).run();
}

initDatabase();

const upsertUserStmt = db.prepare(`
  INSERT INTO users (
    id, userId, password, role, email, name, profilePicture, branch, year, verified,
    verificationCode, verificationCodeExpiry, createdAt
  ) VALUES (
    @id, @userId, @password, @role, @email, @name, @profilePicture, @branch, @year, @verified,
    @verificationCode, @verificationCodeExpiry, @createdAt
  )
  ON CONFLICT(userId) DO UPDATE SET
    id = excluded.id,
    password = excluded.password,
    role = excluded.role,
    email = excluded.email,
    name = excluded.name,
    profilePicture = excluded.profilePicture,
    branch = excluded.branch,
    year = excluded.year,
    verified = excluded.verified,
    verificationCode = excluded.verificationCode,
    verificationCodeExpiry = excluded.verificationCodeExpiry,
    createdAt = excluded.createdAt
`);

const upsertSubmissionStmt = db.prepare(`
  INSERT INTO submissions (
    id, studentId, professorId, groupId, title, type, contentRef, notes, milestones,
    createdAt, updatedAt, status, grade, feedback, versions, currentVersion
  ) VALUES (
    @id, @studentId, @professorId, @groupId, @title, @type, @contentRef, @notes, @milestones,
    @createdAt, @updatedAt, @status, @grade, @feedback, @versions, @currentVersion
  )
  ON CONFLICT(id) DO UPDATE SET
    studentId = excluded.studentId,
    professorId = excluded.professorId,
    groupId = excluded.groupId,
    title = excluded.title,
    type = excluded.type,
    contentRef = excluded.contentRef,
    notes = excluded.notes,
    milestones = excluded.milestones,
    createdAt = excluded.createdAt,
    updatedAt = excluded.updatedAt,
    status = excluded.status,
    grade = excluded.grade,
    feedback = excluded.feedback,
    versions = excluded.versions,
    currentVersion = excluded.currentVersion
`);

const upsertAnnouncementStmt = db.prepare(`
  INSERT INTO announcements (
    id, title, message, pinned, createdBy, createdAt
  ) VALUES (
    @id, @title, @message, @pinned, @createdBy, @createdAt
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    message = excluded.message,
    pinned = excluded.pinned,
    createdBy = excluded.createdBy,
    createdAt = excluded.createdAt
`);

function mapUserRow(row: DBUserRow | undefined): User | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.userId,
    password: row.password,
    role: row.role as 'student' | 'professor',
    email: row.email,
    name: row.name ?? undefined,
    profilePicture: row.profilePicture ?? undefined,
    branch: row.branch ?? undefined,
    year: row.year as User['year'] | undefined,
    verified: !!row.verified,
    verificationCode: row.verificationCode ?? undefined,
    verificationCodeExpiry: row.verificationCodeExpiry ?? undefined,
    createdAt: row.createdAt,
  };
}

function saveUser(user: User) {
  upsertUserStmt.run({
    ...user,
    name: user.name ?? null,
    profilePicture: user.profilePicture ?? null,
    branch: user.branch ?? null,
    year: user.year ?? null,
    verified: user.verified ? 1 : 0,
    verificationCode: user.verificationCode ?? null,
    verificationCodeExpiry: user.verificationCodeExpiry ?? null,
  });
}

function getUserByUserId(userId: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId) as DBUserRow | undefined;
  return mapUserRow(row);
}

function getUserByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DBUserRow | undefined;
  return mapUserRow(row);
}

function listVerifiedStudents(): Array<{ userId: string; name?: string; email: string }> {
  return db
    .prepare('SELECT userId, name, email FROM users WHERE role = ? AND verified = 1')
    .all('student')
    .map((row: any) => ({ userId: row.userId, name: row.name ?? undefined, email: row.email }));
}

function listVerifiedProfessors(): Array<{ userId: string; name?: string; email: string }> {
  return db
    .prepare('SELECT userId, name, email FROM users WHERE role = ? AND verified = 1')
    .all('professor')
    .map((row: any) => ({ userId: row.userId, name: row.name ?? undefined, email: row.email }));
}

function listAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users').all() as DBUserRow[];
  return rows.map(row => mapUserRow(row)).filter((u): u is User => !!u);
}

function filterSubmissionsByProfessor(submissions: Submission[], professorId: string, persist = false): Submission[] {
  const matches: Submission[] = [];
  const professorIdLower = professorId.toLowerCase();
  for (const submission of submissions) {
    if (!submission.professorId) continue;
    if (submission.professorId === professorId) {
      matches.push(submission);
      continue;
    }
    const submissionProfLower = submission.professorId.toLowerCase();
    if (
      submissionProfLower === professorIdLower ||
      submissionProfLower.includes(professorIdLower) ||
      professorIdLower.includes(submissionProfLower)
    ) {
      if (persist && submission.professorId !== professorId) {
        submission.professorId = professorId;
        saveSubmission(submission);
      }
      matches.push(submission);
    }
  }
  return matches;
}

function mapSubmissionRow(row: DBSubmissionRow | undefined): Submission | undefined {
  if (!row) return undefined;
  const milestones = row.milestones ? JSON.parse(row.milestones) : [];
  const feedback = row.feedback ? JSON.parse(row.feedback) : [];
  const versions = row.versions ? JSON.parse(row.versions) : undefined;
  return {
    id: row.id,
    studentId: row.studentId,
    professorId: row.professorId,
    groupId: row.groupId ?? undefined,
    title: row.title,
    type: row.type as Submission['type'],
    contentRef: row.contentRef,
    notes: row.notes ?? undefined,
    milestones,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status as Submission['status'],
    grade: row.grade ?? undefined,
    feedback,
    versions,
    currentVersion: row.currentVersion ?? 1,
  };
}

function listSubmissionsFromDb(): Submission[] {
  const rows = db.prepare('SELECT * FROM submissions').all() as DBSubmissionRow[];
  return rows.map(row => mapSubmissionRow(row)).filter((s): s is Submission => !!s);
}

function mapAnnouncementRow(row: DBAnnouncementRow | undefined): Announcement | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    pinned: !!row.pinned,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function listAnnouncementsFromDb(): Announcement[] {
  const rows = db
    .prepare('SELECT * FROM announcements ORDER BY datetime(createdAt) DESC')
    .all() as DBAnnouncementRow[];
  return rows.map(row => mapAnnouncementRow(row)).filter((a): a is Announcement => !!a);
}

function listPinnedAnnouncements(): Announcement[] {
  const rows = db
    .prepare('SELECT * FROM announcements WHERE pinned = 1 ORDER BY datetime(createdAt) DESC')
    .all() as DBAnnouncementRow[];
  return rows.map(row => mapAnnouncementRow(row)).filter((a): a is Announcement => !!a);
}

function saveAnnouncement(announcement: Announcement) {
  upsertAnnouncementStmt.run({
    ...announcement,
    pinned: announcement.pinned ? 1 : 0,
  });
}

function deleteAnnouncement(id: string) {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
}

function getSubmissionById(id: string): Submission | undefined {
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as DBSubmissionRow | undefined;
  return mapSubmissionRow(row);
}

function saveSubmission(submission: Submission) {
  upsertSubmissionStmt.run({
    ...submission,
    groupId: submission.groupId ?? null,
    notes: submission.notes ?? null,
    milestones: JSON.stringify(submission.milestones ?? []),
    grade: typeof submission.grade === 'number' ? submission.grade : null,
    feedback: JSON.stringify(submission.feedback ?? []),
    versions: JSON.stringify(submission.versions ?? []),
    currentVersion: submission.currentVersion ?? 1,
  });
}

function migrateJsonToDatabase() {
  const existingUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if ((existingUserCount?.count || 0) === 0) {
    const jsonUsers = readJson<User[]>('users.json', []);
    const insertUsers = db.transaction((usersToInsert: User[]) => {
      for (const user of usersToInsert) {
        const normalized: User = {
          id: user.id || `user_${Date.now()}`,
          userId: user.userId,
          password: user.password,
          role: user.role,
          email: user.email,
          name: (user as any).name ?? (user as any)['Full Name'] ?? user.name,
          profilePicture: user.profilePicture,
          branch: user.branch,
          year: user.year,
          verified: !!user.verified,
          verificationCode: user.verificationCode,
          verificationCodeExpiry: user.verificationCodeExpiry,
          createdAt: user.createdAt || new Date().toISOString(),
        };
        saveUser(normalized);
      }
    });
    insertUsers(jsonUsers);
  }

  const existingSubmissionCount = db.prepare('SELECT COUNT(*) as count FROM submissions').get() as { count: number };
  if ((existingSubmissionCount?.count || 0) === 0) {
    const jsonSubmissions = readJson<Submission[]>('submissions.json', []);
    const insertSubs = db.transaction((subsToInsert: Submission[]) => {
      for (const submission of subsToInsert) {
        const normalized: Submission = {
          ...submission,
          notes: submission.notes ?? undefined,
          milestones: submission.milestones ?? [],
          feedback: submission.feedback ?? [],
          versions: submission.versions ?? [],
          currentVersion: submission.currentVersion ?? (submission.versions ? submission.versions.length : 1),
          grade: typeof submission.grade === 'number' ? submission.grade : undefined,
        };
        if (!normalized.createdAt) normalized.createdAt = new Date().toISOString();
        if (!normalized.updatedAt) normalized.updatedAt = normalized.createdAt;
        saveSubmission(normalized);
      }
    });
    insertSubs(jsonSubmissions);
  }

  const existingAnnouncementCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number };
  if ((existingAnnouncementCount?.count || 0) === 0) {
    const jsonAnnouncements = readJson<Announcement[]>('announcements.json', []);
    const insertAnnouncements = db.transaction((announcements: Announcement[]) => {
      for (const announcement of announcements) {
        const normalized: Announcement = {
          id: announcement.id || `announcement_${Date.now()}`,
          title: announcement.title,
          message: announcement.message,
          pinned: announcement.pinned ?? true,
          createdBy: announcement.createdBy,
          createdAt: announcement.createdAt || new Date().toISOString(),
        };
        saveAnnouncement(normalized);
      }
    });
    insertAnnouncements(jsonAnnouncements);
  }
}

migrateJsonToDatabase();

function readJson<T>(name: string, fallback: T): T {
  ensureDataDir();
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(name: string, data: T) {
  ensureDataDir();
  const file = path.join(DATA_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Notification helpers
function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  relatedId?: string,
  link?: string
): Notification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    relatedId,
    read: false,
    createdAt: new Date().toISOString(),
    link,
  };
}

function addNotification(notification: Notification) {
  const notifications = readJson<Notification[]>('notifications.json', []);
  notifications.push(notification);
  writeJson('notifications.json', notifications);
  return notification;
}

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate ESI institutional email
function isValidESIEmail(email: string): boolean {
  return /^[a-zA-Z0-9._-]+@esi\.ac\.ma$/.test(email);
}

// Static uploads
app.use('/uploads', (req, res, next) => {
  ensureDataDir();
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  next();
}, express.static(UPLOADS_DIR));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'esi-progress-tracker' });
});

// Get all students (for group management)
app.get('/api/user/all-students', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  res.json(listVerifiedStudents());
});

// Get user profile
app.get('/api/user/profile', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const user = getUserByUserId(auth.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Return user data without password
  const { password, verificationCode, verificationCodeExpiry, ...profile } = user;
  res.json(profile);
});

// Get student profile by userId (for professors)
app.get('/api/user/:userId', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  // Only professors can view other users' profiles
  if (auth.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can view student profiles' });
  }
  const { userId } = req.params;
  const user = getUserByUserId(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Return user data without sensitive information
  const { password, verificationCode, verificationCodeExpiry, ...profile } = user;
  res.json(profile);
});

// Update user profile
app.patch('/api/user/profile', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { name, branch, year, profilePicture } = req.body || {};
  const user = getUserByUserId(auth.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (typeof name !== 'undefined') user.name = name;
  if (typeof profilePicture !== 'undefined') user.profilePicture = profilePicture;
  if (auth.role === 'student') {
    if (typeof branch !== 'undefined') user.branch = branch;
    if (typeof year !== 'undefined' && ['freshman', 'second year', 'third year'].includes(year)) {
      user.year = year as 'freshman' | 'second year' | 'third year';
    }
  }
  saveUser(user);
  const { password, verificationCode, verificationCodeExpiry, ...profile } = user;
  res.json(profile);
});

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { userId, password, role, email, name, branch, year } = req.body || {};
  if (!userId || !password || !role || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (role !== 'student' && role !== 'professor') {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!isValidESIEmail(email)) {
    return res.status(400).json({ error: 'Email must be an ESI institutional email (@esi.ac.ma)' });
  }
  // Validate student-specific fields
  if (role === 'student') {
    if (!branch || !year) {
      return res.status(400).json({ error: 'Branch and year are required for students' });
    }
    if (!['freshman', 'second year', 'third year'].includes(year)) {
      return res.status(400).json({ error: 'Year must be: freshman, second year, or third year' });
    }
  }
  if (getUserByUserId(userId)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const verificationCode = generateVerificationCode();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const newUser: User = {
    id: `user_${Date.now()}`,
    userId,
    password, // In production, hash this with bcrypt
    role,
    email,
    name,
    branch: role === 'student' ? branch : undefined,
    year: role === 'student' ? year as 'freshman' | 'second year' | 'third year' : undefined,
    verified: false,
    verificationCode,
    verificationCodeExpiry: expiry,
    createdAt: new Date().toISOString(),
  };
  saveUser(newUser);
  
  // In production, send email here. For now, log it.
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`📧 VERIFICATION CODE FOR: ${email}`);
  console.log(`🔑 CODE: ${verificationCode}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
  
  res.status(201).json({ 
    userId: newUser.userId, 
    role: newUser.role, 
    id: newUser.id,
    email: newUser.email,
    verified: false,
    message: 'Verification code sent to your ESI email',
    // Development only: include code in response
    verificationCode: verificationCode
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = getUserByUserId(userId);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.verified) {
    return res.status(403).json({ 
      error: 'Email not verified', 
      requiresVerification: true,
      email: user.email 
    });
  }
  res.json({ userId: user.userId, role: user.role, id: user.id, verified: user.verified });
});

// Verify email with code
app.post('/api/auth/verify', (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or verification code' });
  }
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.verified) {
    return res.json({ message: 'Email already verified', verified: true });
  }
  if (!user.verificationCode || user.verificationCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }
  if (user.verificationCodeExpiry && new Date(user.verificationCodeExpiry) < new Date()) {
    return res.status(400).json({ error: 'Verification code expired' });
  }
  user.verified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  saveUser(user);
  res.json({ message: 'Email verified successfully', verified: true });
});

// Get verification code (development only)
app.get('/api/auth/verification-code', (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.verified) {
    return res.json({ message: 'Email already verified', verified: true });
  }
  if (!user.verificationCode) {
    return res.status(404).json({ error: 'No verification code found' });
  }
  res.json({ verificationCode: user.verificationCode });
});
app.post('/api/auth/resend-verification', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.verified) {
    return res.json({ message: 'Email already verified' });
  }
  const verificationCode = generateVerificationCode();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  user.verificationCode = verificationCode;
  user.verificationCodeExpiry = expiry;
  saveUser(user);
  
  // In production, send email here. For now, log it.
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`📧 VERIFICATION CODE RESENT FOR: ${email}`);
  console.log(`🔑 CODE: ${verificationCode}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
  
  res.json({ 
    message: 'Verification code resent to your email',
    // Development only: include code in response
    verificationCode: verificationCode
  });
});

// Simple base64 file upload
app.post('/api/uploads', (req, res) => {
  const { filename, data } = req.body || {} as { filename?: string; data?: string };
  if (!filename || !data) {
    return res.status(400).json({ error: 'Missing filename or data' });
  }
  ensureDataDir();
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, safeName);
  
  // Extract base64 data (remove data:image/...;base64, prefix if present)
  let base64 = data;
  if (data.includes(',')) {
    base64 = data.split(',')[1];
  }
  
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ File uploaded: ${safeName} (${(buffer.length / 1024).toFixed(2)} KB)`);
  } catch (e) {
    console.error('❌ Upload error:', e);
    return res.status(500).json({ error: 'Failed to write file: ' + (e instanceof Error ? e.message : 'Unknown error') });
  }
  const url = `/uploads/${safeName}`;
  res.status(201).json({ url, filename: safeName });
});

// Get list of professors (for students to select)
app.get('/api/professors', (_req, res) => {
  const professors = listVerifiedProfessors().map(p => ({
    id: p.userId,
    userId: p.userId,
    name: p.name || p.userId,
    email: p.email,
  }));
  res.json(professors);
});

// Create submission (student)
app.post('/api/submissions', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'student') return res.status(403).json({ error: 'Only students can submit' });
  const { title, type, contentRef, notes, milestones, groupId, professorId } = req.body || {};
  if (!title || !type || !contentRef || !professorId) {
    return res.status(400).json({ error: 'Missing required fields: title, type, contentRef, and professorId are required' });
  }
  const professor = getUserByUserId(professorId);
  if (!professor || professor.role !== 'professor' || !professor.verified) {
    return res.status(400).json({ error: 'Invalid professor selected' });
  }
  if (groupId) {
    const groups = readJson<Group[]>('groups.json', []);
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(400).json({ error: 'Group not found' });
    }
    if (!group.members.includes(auth.userId)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
  }
  const now = new Date().toISOString();
  const submissionMilestones = Array.isArray(milestones) ? milestones : [];
  const newSubmission: Submission = {
    id: `sub_${Date.now()}`,
    studentId: auth.userId,
    professorId,
    groupId,
    title,
    type,
    contentRef,
    notes,
    milestones: submissionMilestones,
    createdAt: now,
    updatedAt: now,
    status: 'submitted',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        contentRef,
        notes,
        createdAt: now,
        createdBy: auth.userId,
        changes: 'Initial submission',
      },
    ],
    feedback: [],
  };
  saveSubmission(newSubmission);

  const submitterName = groupId ? `Group submission` : auth.userId;
  addNotification(createNotification(
    professorId,
    'new_submission',
    'New Submission Received',
    `${submitterName} submitted "${title}"`,
    newSubmission.id,
    `/professor`
  ));

  res.status(201).json(newSubmission);
});

// List submissions (student sees own and group submissions; professor sees only assigned to them)
app.get('/api/submissions', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const submissions = listSubmissionsFromDb();
  const groups = readJson<Group[]>('groups.json', []);
  const { studentId, groupId } = req.query as { studentId?: string; groupId?: string };
  if (auth.role === 'student') {
    // Students see their own submissions and group submissions they're members of
    const userGroups = groups.filter(g => g.members.includes(auth.userId));
    const userGroupIds = userGroups.map(g => g.id);
    let items = submissions.filter(s =>
      s.studentId === auth.userId || (s.groupId && userGroupIds.includes(s.groupId))
    );
    if (studentId) items = items.filter(s => s.studentId === studentId);
    if (groupId) items = items.filter(s => s.groupId === groupId);
    return res.json(items);
  }
  // professor - only see submissions assigned to them
  // Match by exact userId, but also handle case-insensitive matching and variations
  const matches = filterSubmissionsByProfessor(submissions, auth.userId, true);
  let filtered = matches;
  if (studentId) filtered = filtered.filter(s => s.studentId === studentId);
  if (groupId) filtered = filtered.filter(s => s.groupId === groupId);
  res.json(filtered);
});

// Update submission (student can update title, type, contentRef, notes, milestones)
app.patch('/api/submissions/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const sub = getSubmissionById(id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  
  // Check if student is owner or group member
  if (auth.role === 'student') {
    if (sub.groupId) {
      const groups = readJson<Group[]>('groups.json', []);
      const group = groups.find(g => g.id === sub.groupId);
      if (!group || !group.members.includes(auth.userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (sub.studentId !== auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  const { title, type, contentRef, notes, milestones, professorId, changes } = req.body || {};
  const now = new Date().toISOString();
  
  // Students can update their own submissions
  if (auth.role === 'student') {
    // Track version if contentRef or notes changed
    const contentChanged = contentRef && contentRef !== sub.contentRef;
    const notesChanged = notes !== undefined && notes !== sub.notes;
    
    if (contentChanged || notesChanged) {
      // Create new version
      sub.versions = sub.versions || [];
      sub.currentVersion = (sub.currentVersion || 1) + 1;
      sub.versions.push({
        version: sub.currentVersion,
        contentRef: contentRef || sub.contentRef,
        notes: notes !== undefined ? notes : sub.notes,
        createdAt: now,
        createdBy: auth.userId,
        changes: changes || (contentChanged ? 'Content updated' : 'Notes updated'),
      });
      // Update current contentRef and notes
      if (contentRef) sub.contentRef = contentRef;
      if (notes !== undefined) sub.notes = notes;
    }
    
    if (typeof title !== 'undefined') sub.title = title;
    if (typeof type !== 'undefined') sub.type = type;
    if (typeof milestones !== 'undefined') sub.milestones = Array.isArray(milestones) ? milestones : sub.milestones;
    if (typeof professorId !== 'undefined') {
      // Verify professor exists if changing
      const professor = getUserByUserId(professorId);
      if (!professor || professor.role !== 'professor' || !professor.verified) {
        return res.status(400).json({ error: 'Invalid professor selected' });
      }
      sub.professorId = professorId;
    }
  } else {
    // Professors can only update notes and milestones
    if (typeof notes !== 'undefined') sub.notes = notes;
    if (typeof milestones !== 'undefined') sub.milestones = Array.isArray(milestones) ? milestones : sub.milestones;
  }
  
  sub.updatedAt = now;
  saveSubmission(sub);
  res.json(sub);
});

// Student comment (students can add comments to their own submissions)
app.post('/api/submissions/:id/comment', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'student') return res.status(403).json({ error: 'Only students can add comments' });
  const { id } = req.params;
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  const sub = getSubmissionById(id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.studentId !== auth.userId) {
    return res.status(403).json({ error: 'You can only comment on your own submissions' });
  }
  sub.feedback = sub.feedback || [];
  sub.feedback.push({ by: auth.userId, text: text.trim(), date: new Date().toISOString() });
  sub.updatedAt = new Date().toISOString();
  saveSubmission(sub);
  res.json(sub);
});

// Professor feedback and status
app.post('/api/submissions/:id/feedback', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') return res.status(403).json({ error: 'Only professors can comment' });
  const { id } = req.params;
  const { text, status, grade } = req.body || {};
  const sub = getSubmissionById(id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  // Verify professor is assigned to this submission
  if (sub.professorId !== auth.userId) {
    return res.status(403).json({ error: 'You are not assigned to this submission' });
  }
  sub.feedback = sub.feedback || [];
  const oldStatus = sub.status;
  const oldGrade = sub.grade;
  
  if (text) sub.feedback.push({ by: auth.userId, text, date: new Date().toISOString() });
  if (status && ['submitted', 'approved', 'resubmit'].includes(status)) sub.status = status;
  if (typeof grade === 'number') sub.grade = grade;
  sub.updatedAt = new Date().toISOString();
  saveSubmission(sub);
  
  // Create notifications for student
  if (text) {
    addNotification(createNotification(
      sub.studentId,
      'feedback',
      'New Feedback Received',
      `${auth.userId} commented on "${sub.title}"`,
      sub.id,
      `/student`
    ));
  }
  
  if (status && status !== oldStatus) {
    const statusMessages: Record<string, string> = {
      approved: 'Your submission has been approved!',
      resubmit: 'Your submission needs to be resubmitted',
      submitted: 'Your submission status has been updated',
    };
    addNotification(createNotification(
      sub.studentId,
      'status_change',
      'Submission Status Updated',
      statusMessages[status] || `Status changed to ${status}`,
      sub.id,
      `/student`
    ));
  }
  
  if (typeof grade === 'number' && grade !== oldGrade) {
    addNotification(createNotification(
      sub.studentId,
      'grade',
      'Grade Assigned',
      `You received a grade of ${grade}/100 for "${sub.title}"`,
      sub.id,
      `/student`
    ));
  }
  
  res.json(sub);
});

// Stats/analytics
app.get('/api/stats/overview', (_req, res) => {
  const submissions = listSubmissionsFromDb();
  const total = submissions.length;
  const byStatus = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const byStudent: Record<string, number> = {};
  for (const s of submissions) byStudent[s.studentId] = (byStudent[s.studentId] || 0) + 1;
  const avgGrade = (() => {
    const graded = submissions.filter(s => typeof s.grade === 'number');
    if (!graded.length) return null;
    return graded.reduce((sum, s) => sum + (s.grade as number), 0) / graded.length;
  })();
  res.json({ total, byStatus, byStudent, avgGrade });
});

// Advanced Analytics Endpoints
app.get('/api/analytics/overview', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const submissions = listSubmissionsFromDb();
  
  let relevantSubmissions = submissions;
  if (auth.role === 'student') {
    relevantSubmissions = submissions.filter(s => s.studentId === auth.userId);
  } else if (auth.role === 'professor') {
    relevantSubmissions = filterSubmissionsByProfessor(submissions, auth.userId, true);
  }
  
  const total = relevantSubmissions.length;
  const byStatus = relevantSubmissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  
  const graded = relevantSubmissions.filter(s => typeof s.grade === 'number');
  const avgGrade = graded.length > 0
    ? graded.reduce((sum, s) => sum + (s.grade as number), 0) / graded.length
    : null;
  
  const gradeDistribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
  graded.forEach(s => {
    const grade = s.grade as number;
    if (grade <= 20) gradeDistribution[0]++;
    else if (grade <= 40) gradeDistribution[1]++;
    else if (grade <= 60) gradeDistribution[2]++;
    else if (grade <= 80) gradeDistribution[3]++;
    else gradeDistribution[4]++;
  });
  
  res.json({
    total,
    byStatus,
    avgGrade: avgGrade ? Math.round(avgGrade * 10) / 10 : null,
    gradeDistribution,
    gradedCount: graded.length,
    ungradedCount: relevantSubmissions.length - graded.length,
  });
});

app.get('/api/analytics/submission-trends', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const submissions = listSubmissionsFromDb();
  
  let relevantSubmissions = submissions;
  if (auth.role === 'student') {
    relevantSubmissions = submissions.filter(s => s.studentId === auth.userId);
  } else if (auth.role === 'professor') {
    relevantSubmissions = filterSubmissionsByProfessor(submissions, auth.userId, true);
  }
  
  // Group by month
  const monthlyData: Record<string, number> = {};
  relevantSubmissions.forEach(s => {
    const date = new Date(s.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
  });
  
  // Get last 6 months
  const last6Months: Array<{ month: string; count: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    last6Months.push({
      month: monthName,
      count: monthlyData[monthKey] || 0,
    });
  }
  
  res.json({ trends: last6Months });
});

app.get('/api/analytics/performance', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const submissions = listSubmissionsFromDb();
  const users = listAllUsers();
  
  if (auth.role === 'student') {
    const studentSubs = submissions.filter(s => s.studentId === auth.userId);
    const graded = studentSubs.filter(s => typeof s.grade === 'number');
    
    const grades = graded.map(s => s.grade as number);
    const avgGrade = grades.length > 0
      ? grades.reduce((sum, g) => sum + g, 0) / grades.length
      : null;
    
    const bestGrade = grades.length > 0 ? Math.max(...grades) : null;
    const worstGrade = grades.length > 0 ? Math.min(...grades) : null;
    
    // Calculate average time to approval
    const approvedSubs = studentSubs.filter(s => s.status === 'approved');
    let avgTimeToApproval = null;
    if (approvedSubs.length > 0) {
      const times = approvedSubs
        .map(s => {
          const created = new Date(s.createdAt);
          const updated = new Date(s.updatedAt);
          return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        })
        .filter(t => t > 0);
      if (times.length > 0) {
        avgTimeToApproval = times.reduce((sum, t) => sum + t, 0) / times.length;
      }
    }
    
    res.json({
      avgGrade: avgGrade ? Math.round(avgGrade * 10) / 10 : null,
      bestGrade,
      worstGrade,
      totalSubmissions: studentSubs.length,
      approvedCount: approvedSubs.length,
      pendingCount: studentSubs.filter(s => s.status === 'submitted').length,
      resubmitCount: studentSubs.filter(s => s.status === 'resubmit').length,
      avgTimeToApproval: avgTimeToApproval ? Math.round(avgTimeToApproval * 10) / 10 : null,
    });
  } else {
    // Professor analytics - handle matching like in other endpoints
    const profSubs = filterSubmissionsByProfessor(submissions, auth.userId, true);
    const uniqueStudents = new Set(profSubs.map(s => s.studentId)).size;
    
    const graded = profSubs.filter(s => typeof s.grade === 'number');
    const avgGrade = graded.length > 0
      ? graded.reduce((sum, s) => sum + (s.grade as number), 0) / graded.length
      : null;
    
    // Average grading time
    let avgGradingTime = null;
    if (graded.length > 0) {
      const times = graded
        .map(s => {
          const created = new Date(s.createdAt);
          const updated = new Date(s.updatedAt);
          return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        })
        .filter(t => t > 0);
      if (times.length > 0) {
        avgGradingTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      }
    }
    
    // Top students by grade
    const studentGrades: Record<string, { total: number; sum: number; count: number }> = {};
    graded.forEach(s => {
      if (!studentGrades[s.studentId]) {
        studentGrades[s.studentId] = { total: 0, sum: 0, count: 0 };
      }
      studentGrades[s.studentId].sum += s.grade as number;
      studentGrades[s.studentId].count++;
    });
    
    const topStudents = Object.entries(studentGrades)
      .map(([studentId, data]) => ({
        studentId,
        avgGrade: data.sum / data.count,
        submissionCount: data.count,
      }))
      .sort((a, b) => b.avgGrade - a.avgGrade)
      .slice(0, 5)
      .map(item => {
        const user = users.find(u => u.userId === item.studentId);
        return {
          ...item,
          name: user?.name || item.studentId,
        };
      });
    
    res.json({
      totalSubmissions: profSubs.length,
      uniqueStudents,
      avgGrade: avgGrade ? Math.round(avgGrade * 10) / 10 : null,
      avgGradingTime: avgGradingTime ? Math.round(avgGradingTime * 10) / 10 : null,
      pendingCount: profSubs.filter(s => s.status === 'submitted').length,
      approvedCount: profSubs.filter(s => s.status === 'approved').length,
      resubmitCount: profSubs.filter(s => s.status === 'resubmit').length,
      topStudents,
    });
  }
});

app.get('/api/analytics/type-distribution', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const submissions = listSubmissionsFromDb();
  
  let relevantSubmissions = submissions;
  if (auth.role === 'student') {
    relevantSubmissions = submissions.filter(s => s.studentId === auth.userId);
  } else if (auth.role === 'professor') {
    relevantSubmissions = filterSubmissionsByProfessor(submissions, auth.userId, true);
  }
  
  const typeDistribution = relevantSubmissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});
  
  res.json({ distribution: typeDistribution });
});

// Announcements Endpoints
app.get('/api/announcements', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  try {
    if (auth.role === 'professor') {
      res.json(listAnnouncementsFromDb());
    } else {
      res.json(listPinnedAnnouncements());
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

app.post('/api/announcements', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can create announcements' });
  }
  const { title, message, pinned = true } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  const announcement: Announcement = {
    id: `announcement_${Date.now()}`,
    title: String(title).trim(),
    message: String(message).trim(),
    pinned: !!pinned,
    createdBy: auth.userId,
    createdAt: new Date().toISOString(),
  };
  try {
    saveAnnouncement(announcement);
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

app.patch('/api/announcements/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can update announcements' });
  }
  const { id } = req.params;
  const announcement = listAnnouncementsFromDb().find(a => a.id === id);
  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  const { title, message, pinned } = req.body || {};
  const updated: Announcement = {
    ...announcement,
    title: typeof title === 'string' ? title.trim() : announcement.title,
    message: typeof message === 'string' ? message.trim() : announcement.message,
    pinned: typeof pinned === 'boolean' ? pinned : announcement.pinned,
  };
  try {
    saveAnnouncement(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

app.delete('/api/announcements/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can delete announcements' });
  }
  const { id } = req.params;
  const announcement = listAnnouncementsFromDb().find(a => a.id === id);
  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  try {
    deleteAnnouncement(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Notification endpoints
app.get('/api/notifications', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const notifications = readJson<Notification[]>('notifications.json', []);
  const userNotifications = notifications
    .filter(n => n.userId === auth.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(userNotifications);
});

app.get('/api/notifications/unread-count', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const notifications = readJson<Notification[]>('notifications.json', []);
  const unreadCount = notifications.filter(n => n.userId === auth.userId && !n.read).length;
  res.json({ count: unreadCount });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const notifications = readJson<Notification[]>('notifications.json', []);
  const idx = notifications.findIndex(n => n.id === id && n.userId === auth.userId);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
  notifications[idx].read = true;
  writeJson('notifications.json', notifications);
  res.json(notifications[idx]);
});

app.patch('/api/notifications/read-all', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const notifications = readJson<Notification[]>('notifications.json', []);
  notifications.forEach(n => {
    if (n.userId === auth.userId && !n.read) {
      n.read = true;
    }
  });
  writeJson('notifications.json', notifications);
  res.json({ message: 'All notifications marked as read' });
});

// Group Management Endpoints
app.post('/api/groups', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'student') return res.status(403).json({ error: 'Only students can create groups' });
  const { name, description } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  const groups = readJson<Group[]>('groups.json', []);
  const now = new Date().toISOString();
  const newGroup: Group = {
    id: `group_${Date.now()}`,
    name,
    description,
    createdBy: auth.userId,
    members: [auth.userId], // Creator is automatically a member
    createdAt: now,
    updatedAt: now,
  };
  groups.push(newGroup);
  writeJson('groups.json', groups);
  res.status(201).json(newGroup);
});

app.get('/api/groups', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const groups = readJson<Group[]>('groups.json', []);
  if (auth.role === 'student') {
    // Students see only groups they're members of
    const userGroups = groups.filter(g => g.members.includes(auth.userId));
    res.json(userGroups);
  } else {
    // Professors see all groups
    res.json(groups);
  }
});

app.get('/api/groups/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const groups = readJson<Group[]>('groups.json', []);
  const group = groups.find(g => g.id === id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  if (auth.role === 'student' && !group.members.includes(auth.userId)) {
    return res.status(403).json({ error: 'You are not a member of this group' });
  }
  res.json(group);
});

app.patch('/api/groups/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const { name, description } = req.body || {};
  const groups = readJson<Group[]>('groups.json', []);
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Group not found' });
  const group = groups[idx];
  // Only creator can update group details
  if (group.createdBy !== auth.userId) {
    return res.status(403).json({ error: 'Only the group creator can update group details' });
  }
  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  group.updatedAt = new Date().toISOString();
  groups[idx] = group;
  writeJson('groups.json', groups);
  res.json(group);
});

app.post('/api/groups/:id/members', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'student') return res.status(403).json({ error: 'Only students can manage group members' });
  const { id } = req.params;
  const { studentId } = req.body || {};
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }
  const groups = readJson<Group[]>('groups.json', []);
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Group not found' });
  const group = groups[idx];
  // Only creator can add members
  if (group.createdBy !== auth.userId) {
    return res.status(403).json({ error: 'Only the group creator can add members' });
  }
  // Verify student exists
  const student = getUserByUserId(studentId);
  if (!student) {
    return res.status(400).json({ error: 'Student not found or not verified' });
  }
  if (student.role !== 'student' || !student.verified) {
    return res.status(400).json({ error: 'Student not found or not verified' });
  }
  if (group.members.includes(studentId)) {
    return res.status(400).json({ error: 'Student is already a member' });
  }
  group.members.push(studentId);
  group.updatedAt = new Date().toISOString();
  groups[idx] = group;
  writeJson('groups.json', groups);
  res.json(group);
});

app.delete('/api/groups/:id/members/:studentId', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'student') return res.status(403).json({ error: 'Only students can manage group members' });
  const { id, studentId } = req.params;
  const groups = readJson<Group[]>('groups.json', []);
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Group not found' });
  const group = groups[idx];
  // Only creator can remove members (or member can remove themselves)
  if (group.createdBy !== auth.userId && studentId !== auth.userId) {
    return res.status(403).json({ error: 'You can only remove yourself or be removed by the creator' });
  }
  if (studentId === group.createdBy) {
    return res.status(400).json({ error: 'Cannot remove the group creator' });
  }
  group.members = group.members.filter(m => m !== studentId);
  group.updatedAt = new Date().toISOString();
  groups[idx] = group;
  writeJson('groups.json', groups);
  res.json(group);
});

// Version Management Endpoints
app.get('/api/submissions/:id/versions', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const sub = getSubmissionById(id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  
  // Check access
  if (auth.role === 'student') {
    if (sub.groupId) {
      const groups = readJson<Group[]>('groups.json', []);
      const group = groups.find(g => g.id === sub.groupId);
      if (!group || !group.members.includes(auth.userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (sub.studentId !== auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (auth.role === 'professor') {
    if (sub.professorId !== auth.userId && sub.professorId?.toLowerCase() !== auth.userId.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (sub.professorId !== auth.userId) {
      sub.professorId = auth.userId;
      saveSubmission(sub);
    }
  }
  
  res.json({ versions: sub.versions || [], currentVersion: sub.currentVersion || 1 });
});

app.get('/api/submissions/:id/versions/:version', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id, version } = req.params;
  const versionNum = parseInt(version, 10);
  const sub = getSubmissionById(id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  
  // Check access (same as above)
  if (auth.role === 'student') {
    if (sub.groupId) {
      const groups = readJson<Group[]>('groups.json', []);
      const group = groups.find(g => g.id === sub.groupId);
      if (!group || !group.members.includes(auth.userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (sub.studentId !== auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (auth.role === 'professor') {
    if (sub.professorId !== auth.userId && sub.professorId?.toLowerCase() !== auth.userId.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (sub.professorId !== auth.userId) {
      sub.professorId = auth.userId;
      saveSubmission(sub);
    }
  }
  
  const versions = sub.versions || [];
  const versionData = versions.find(v => v.version === versionNum);
  if (!versionData) {
    return res.status(404).json({ error: 'Version not found' });
  }
  
  res.json(versionData);
});

// Assignment Template Endpoints
app.post('/api/templates', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') return res.status(403).json({ error: 'Only professors can create templates' });
  const { title, description, type, instructions, requirements, dueDate } = req.body || {};
  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }
  const templates = readJson<AssignmentTemplate[]>('templates.json', []);
  const now = new Date().toISOString();
  const newTemplate: AssignmentTemplate = {
    id: `template_${Date.now()}`,
    title,
    description,
    type,
    instructions,
    requirements: requirements || [],
    dueDate,
    createdBy: auth.userId,
    createdAt: now,
    updatedAt: now,
  };
  templates.push(newTemplate);
  writeJson('templates.json', templates);
  res.status(201).json(newTemplate);
});

app.get('/api/templates', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const templates = readJson<AssignmentTemplate[]>('templates.json', []);
  if (auth.role === 'professor') {
    // Professors see all templates (their own and others)
    res.json(templates);
  } else {
    // Students see all templates
    res.json(templates);
  }
});

app.get('/api/templates/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  const { id } = req.params;
  const templates = readJson<AssignmentTemplate[]>('templates.json', []);
  const template = templates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

app.patch('/api/templates/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') return res.status(403).json({ error: 'Only professors can update templates' });
  const { id } = req.params;
  const { title, description, type, instructions, requirements, dueDate } = req.body || {};
  const templates = readJson<AssignmentTemplate[]>('templates.json', []);
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  const template = templates[idx];
  // Only creator can update
  if (template.createdBy !== auth.userId) {
    return res.status(403).json({ error: 'Only the template creator can update it' });
  }
  if (title) template.title = title;
  if (description !== undefined) template.description = description;
  if (type) template.type = type;
  if (instructions !== undefined) template.instructions = instructions;
  if (requirements !== undefined) template.requirements = requirements;
  if (dueDate !== undefined) template.dueDate = dueDate;
  template.updatedAt = new Date().toISOString();
  templates[idx] = template;
  writeJson('templates.json', templates);
  res.json(template);
});

app.delete('/api/templates/:id', (req, res) => {
  const auth = (req as any).auth as { userId: string; role: 'student' | 'professor' };
  if (auth.role !== 'professor') return res.status(403).json({ error: 'Only professors can delete templates' });
  const { id } = req.params;
  const templates = readJson<AssignmentTemplate[]>('templates.json', []);
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  const template = templates[idx];
  // Only creator can delete
  if (template.createdBy !== auth.userId) {
    return res.status(403).json({ error: 'Only the template creator can delete it' });
  }
  templates.splice(idx, 1);
  writeJson('templates.json', templates);
  res.json({ message: 'Template deleted successfully' });
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`Backend listening on http://localhost:${PORT}`);
});


