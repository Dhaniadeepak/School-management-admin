export type Role = 'admin' | 'teacher' | 'parent';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'deactivated';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  email?: string;
  schoolId: string;
  schoolName: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Option {
  id: string;
  name: string;
}

export interface CoverPeriod {
  date: string;
  period: number;
  teacherId: string;
  teacherName: string;
  classId?: string;
  className: string;
  subject?: string;
  room?: string;
  coveredBy: string | null;
  substitutionId: string | null;
}

export interface Dashboard {
  date: string;
  teachers: { total: number; present: number; onLeave: { id: string; name: string; type: string; from: string; to: string }[] };
  approvals: {
    pendingTeachers: { id: string; name: string; phone?: string }[];
    pendingLeaves: { id: string; teacherName: string; type: string; from: string; to: string }[];
  };
  attendance: {
    studentsTotal: number;
    absent: number;
    classesTotal: number;
    classesMarked: number;
    unmarkedClasses: { id: string; name: string }[];
  };
  cover: CoverPeriod[];
}

export interface Teacher {
  id: string;
  name: string;
  phone?: string;
  status: UserStatus;
  subjects: string[];
  qualification?: string;
  rejectionReason?: string;
  decidedAt?: string;
  decidedBy?: string;
  registeredAt?: string;
}

export interface ClassRow {
  id: string;
  name: string;
  section: string;
  label: string;
  classTeacherId: string | null;
  classTeacherName: string | null;
  studentCount: number;
}

export interface ParentInfo {
  name: string;
  phone: string;
  relation?: string;
}

export interface StudentRow {
  id: string;
  admissionNo: string;
  name: string;
  classId: string;
  className: string;
  rollNo: number | null;
  gender?: string;
  dob?: string;
  active: boolean;
  parents: ParentInfo[];
}

export interface Period {
  number: number;
  start: string;
  end: string;
}

export interface TimetableMeta {
  periods: Period[];
  workingDays: number[];
  publishedVersion: number;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}

export interface TimetableEntry {
  id: string;
  teacherId: string;
  teacherName: string;
  day: number;
  period: number;
  kind: 'class' | 'duty';
  classId: string | null;
  className: string;
  subject: string;
  room: string;
  note: string;
}

export interface Substitution {
  id: string;
  period: number;
  classId: string;
  className: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  originalTeacherName: string;
  subject: string;
  room: string;
  note: string;
}

export interface FileLink {
  name: string;
  mime: string;
  size: number;
  url: string;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  document: FileLink | null;
  decidedBy: string;
  decidedAt?: string;
  decisionComment?: string;
  appliedAt: string;
}

export type AudienceKind = 'all' | 'teachers' | 'parents' | 'classes';

export interface Announcement {
  id: string;
  kind: 'notice' | 'event';
  title: string;
  body: string;
  audience: { kind: AudienceKind; classIds: string[]; classNames: string[] };
  event: { date: string; time?: string; place?: string } | null;
  publishAt: string;
  status: 'scheduled' | 'published';
  createdBy: string;
}

export interface AnnouncementInput {
  kind: 'notice' | 'event';
  title: string;
  body: string;
  audience: { kind: AudienceKind; classIds: string[] };
  event?: { date: string; time?: string; place?: string };
  publishAt?: string;
}

export interface FeeStructure {
  id: string;
  classId: string;
  className: string;
  academicYear: string;
  heads: { name: string; amount: number }[];
  total: number;
  dueDate: string;
  allowInstallments: boolean;
  installments: { label: string; dueDate: string; amount: number }[];
  dues: { pending: number; paid: number; pendingAmount: number; paidAmount: number };
}

export interface FeeStructureInput {
  classId: string;
  academicYear?: string;
  heads: { name: string; amount: number }[];
  dueDate: string;
  allowInstallments: boolean;
  installments?: { label: string; dueDate: string; amount: number }[];
}

export interface FeeDueRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  className: string;
  academicYear: string;
  label: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  paidAt: string | null;
  receiptNo: string | null;
  transactionId: string | null;
}

export interface PaymentRow {
  id: string;
  studentName: string;
  admissionNo: string;
  amount: number;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  gateway: string;
  orderId: string;
  transactionId: string | null;
  method: string | null;
  receiptNo: string | null;
  createdAt: string;
  paidAt: string | null;
  failureReason: string | null;
}

export interface ClassAttendance {
  date: string;
  classId: string;
  marked: boolean;
  markedAt: string | null;
  students: { id: string; name: string; rollNo: number | null; admissionNo: string; status: 'present' | 'absent'; recorded: boolean }[];
}

export interface AttendanceSummary {
  date: string;
  classes: { classId: string; className: string; students: number; marked: boolean; absent: number }[];
}

export interface SchoolSettings {
  name: string;
  address: string;
  phone: string;
  code: string;
  settings: {
    workingDays: number[];
    periods: Period[];
    attendanceMode: 'daily';
    attendanceEditWindowHours: number;
    leaveTypes: string[];
    allowInstallments: boolean;
    academicYear: string;
  };
  holidays: { date: string; name: string }[];
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}
