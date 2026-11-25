import type {
  Announcement,
  AnnouncementInput,
  AttendanceSummary,
  AuditEntry,
  ClassAttendance,
  ClassRow,
  CoverPeriod,
  Dashboard,
  FeeDueRow,
  FeeStructure,
  FeeStructureInput,
  LeaveRequest,
  NotificationItem,
  Option,
  PaymentRow,
  SchoolSettings,
  Session,
  StudentRow,
  Substitution,
  Teacher,
  TimetableEntry,
  TimetableMeta,
} from '../types';
import { baseApi, unwrap } from './baseApi';

export interface StudentInput {
  admissionNo: string;
  name: string;
  classId: string;
  rollNo?: number;
  gender?: string;
  dob?: string;
  parents: { name: string; phone: string; relation?: string }[];
  active?: boolean;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // ---------- auth ----------
    login: b.mutation<Session, { login: string; password: string }>({
      query: (body) => ({ url: '/auth/admin/login', method: 'POST', body }),
      transformResponse: unwrap<Session>,
    }),
    forgotPassword: b.mutation<{ sent: boolean }, { phone: string }>({
      query: (body) => ({ url: '/auth/password/forgot', method: 'POST', body: { ...body, role: 'admin' } }),
      transformResponse: unwrap<{ sent: boolean }>,
    }),
    resetPassword: b.mutation<{ reset: boolean }, { phone: string; code: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/password/reset', method: 'POST', body: { ...body, role: 'admin' } }),
      transformResponse: unwrap<{ reset: boolean }>,
    }),
    logout: b.mutation<unknown, void>({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),

    // ---------- notifications ----------
    notifications: b.query<{ unreadCount: number; items: NotificationItem[] }, void>({
      query: () => '/me/notifications',
      transformResponse: unwrap<{ unreadCount: number; items: NotificationItem[] }>,
      providesTags: ['Notifications'],
    }),
    markAllRead: b.mutation<unknown, void>({
      query: () => ({ url: '/me/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),

    // ---------- dashboard ----------
    dashboard: b.query<Dashboard, void>({
      query: () => '/admin/dashboard',
      transformResponse: unwrap<Dashboard>,
      providesTags: ['Dashboard'],
    }),

    // ---------- teachers ----------
    teachers: b.query<Teacher[], { status?: string }>({
      query: ({ status }) => ({ url: '/admin/teachers', params: status ? { status } : undefined }),
      transformResponse: unwrap<Teacher[]>,
      providesTags: ['Teachers'],
    }),
    teacherOptions: b.query<Option[], void>({
      query: () => '/admin/teacher-options',
      transformResponse: unwrap<Option[]>,
      providesTags: ['Teachers'],
    }),
    teacherAction: b.mutation<unknown, { id: string; action: 'approve' | 'reject' | 'deactivate' | 'reactivate'; reason?: string; subjects?: string[] }>({
      query: ({ id, action, ...body }) => ({ url: `/admin/teachers/${id}/${action}`, method: 'POST', body }),
      invalidatesTags: ['Teachers', 'Dashboard'],
    }),

    // ---------- classes and students ----------
    classes: b.query<ClassRow[], void>({
      query: () => '/admin/classes',
      transformResponse: unwrap<ClassRow[]>,
      providesTags: ['Classes'],
    }),
    createClass: b.mutation<unknown, { name: string; section: string; classTeacherId?: string | null }>({
      query: (body) => ({ url: '/admin/classes', method: 'POST', body }),
      invalidatesTags: ['Classes'],
    }),
    updateClass: b.mutation<unknown, { id: string; classTeacherId?: string | null; name?: string; section?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/classes/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Classes'],
    }),
    deleteClass: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/classes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Classes'],
    }),
    students: b.query<{ total: number; page: number; items: StudentRow[] }, { classId?: string; q?: string; page?: number }>({
      query: (params) => ({ url: '/admin/students', params: { ...params, limit: 50 } }),
      transformResponse: unwrap<{ total: number; page: number; items: StudentRow[] }>,
      providesTags: ['Students'],
    }),
    createStudent: b.mutation<unknown, StudentInput>({
      query: (body) => ({ url: '/admin/students', method: 'POST', body }),
      invalidatesTags: ['Students', 'Classes'],
    }),
    updateStudent: b.mutation<unknown, Partial<StudentInput> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/students/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Students', 'Classes'],
    }),
    uploadStudents: b.mutation<{ created: number; parentsCreated: number }, FormData>({
      query: (body) => ({ url: '/admin/students/upload', method: 'POST', body }),
      transformResponse: unwrap<{ created: number; parentsCreated: number }>,
      invalidatesTags: ['Students', 'Classes'],
    }),

    // ---------- timetable ----------
    timetableMeta: b.query<TimetableMeta, void>({
      query: () => '/admin/timetable/meta',
      transformResponse: unwrap<TimetableMeta>,
      providesTags: ['Timetable'],
    }),
    timetableEntries: b.query<TimetableEntry[], { teacherId?: string; classId?: string; status?: 'draft' | 'published' }>({
      query: (params) => ({ url: '/admin/timetable/entries', params }),
      transformResponse: unwrap<TimetableEntry[]>,
      providesTags: ['Timetable'],
    }),
    saveSlot: b.mutation<
      unknown,
      { teacherId: string; day: number; period: number; kind: 'class' | 'duty'; classId?: string; subject?: string; room?: string; note?: string }
    >({
      query: (body) => ({ url: '/admin/timetable/entries', method: 'PUT', body }),
      invalidatesTags: ['Timetable'],
    }),
    deleteSlot: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/timetable/entries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Timetable'],
    }),
    publishTimetable: b.mutation<{ version: number; entries: number }, void>({
      query: () => ({ url: '/admin/timetable/publish', method: 'POST' }),
      transformResponse: unwrap<{ version: number; entries: number }>,
      invalidatesTags: ['Timetable'],
    }),
    substitutions: b.query<{ date: string; items: Substitution[]; needCover: CoverPeriod[] }, string>({
      query: (date) => ({ url: '/admin/timetable/substitutions', params: { date } }),
      transformResponse: unwrap<{ date: string; items: Substitution[]; needCover: CoverPeriod[] }>,
      providesTags: ['Substitutions'],
    }),
    createSubstitution: b.mutation<
      unknown,
      { date: string; period: number; classId: string; substituteTeacherId: string; originalTeacherId?: string; subject?: string; room?: string; note?: string }
    >({
      query: (body) => ({ url: '/admin/timetable/substitutions', method: 'POST', body }),
      invalidatesTags: ['Substitutions', 'Dashboard'],
    }),
    deleteSubstitution: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/timetable/substitutions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Substitutions', 'Dashboard'],
    }),

    // ---------- leave ----------
    leaveRequests: b.query<LeaveRequest[], { status?: string }>({
      query: ({ status }) => ({ url: '/admin/leave', params: status ? { status } : undefined }),
      transformResponse: unwrap<LeaveRequest[]>,
      providesTags: ['Leave'],
    }),
    decideLeave: b.mutation<{ status: string; cover: CoverPeriod[] }, { id: string; decision: 'approved' | 'rejected'; comment?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/leave/${id}/decide`, method: 'POST', body }),
      transformResponse: unwrap<{ status: string; cover: CoverPeriod[] }>,
      invalidatesTags: ['Leave', 'Dashboard', 'Substitutions'],
    }),

    // ---------- announcements ----------
    announcements: b.query<Announcement[], void>({
      query: () => '/admin/announcements',
      transformResponse: unwrap<Announcement[]>,
      providesTags: ['Announcements'],
    }),
    createAnnouncement: b.mutation<unknown, AnnouncementInput>({
      query: (body) => ({ url: '/admin/announcements', method: 'POST', body }),
      invalidatesTags: ['Announcements'],
    }),
    updateAnnouncement: b.mutation<unknown, AnnouncementInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/announcements/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Announcements'],
    }),
    deleteAnnouncement: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/announcements/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Announcements'],
    }),

    // ---------- fees ----------
    feeStructures: b.query<FeeStructure[], void>({
      query: () => '/admin/fees/structures',
      transformResponse: unwrap<FeeStructure[]>,
      providesTags: ['Fees'],
    }),
    createFeeStructure: b.mutation<unknown, FeeStructureInput>({
      query: (body) => ({ url: '/admin/fees/structures', method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    updateFeeStructure: b.mutation<unknown, FeeStructureInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/fees/structures/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Fees'],
    }),
    generateDues: b.mutation<{ students: number; created: number }, string>({
      query: (id) => ({ url: `/admin/fees/structures/${id}/generate-dues`, method: 'POST' }),
      transformResponse: unwrap<{ students: number; created: number }>,
      invalidatesTags: ['Fees'],
    }),
    feeDues: b.query<
      { items: FeeDueRow[]; totals: { paid: number; pending: number; count: number } },
      { classId?: string; status?: string; overdue?: string }
    >({
      query: (params) => ({ url: '/admin/fees/dues', params }),
      transformResponse: unwrap<{ items: FeeDueRow[]; totals: { paid: number; pending: number; count: number } }>,
      providesTags: ['Fees'],
    }),
    payments: b.query<PaymentRow[], { status?: string }>({
      query: (params) => ({ url: '/admin/fees/payments', params }),
      transformResponse: unwrap<PaymentRow[]>,
      providesTags: ['Fees'],
    }),

    // ---------- attendance ----------
    attendanceSummary: b.query<AttendanceSummary, string>({
      query: (date) => ({ url: '/admin/attendance/summary', params: { date } }),
      transformResponse: unwrap<AttendanceSummary>,
      providesTags: ['Attendance'],
    }),
    classAttendance: b.query<ClassAttendance, { classId: string; date: string }>({
      query: (params) => ({ url: '/admin/attendance', params }),
      transformResponse: unwrap<ClassAttendance>,
      providesTags: ['Attendance'],
    }),
    correctAttendance: b.mutation<
      { saved: number; newlyAbsent: number },
      { classId: string; date: string; records: { studentId: string; status: 'present' | 'absent' }[] }
    >({
      query: (body) => ({ url: '/admin/attendance', method: 'PUT', body }),
      transformResponse: unwrap<{ saved: number; newlyAbsent: number }>,
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),

    // ---------- settings ----------
    settings: b.query<SchoolSettings, void>({
      query: () => '/admin/settings',
      transformResponse: unwrap<SchoolSettings>,
      providesTags: ['Settings'],
    }),
    updateSettings: b.mutation<unknown, Partial<Omit<SchoolSettings, 'settings' | 'holidays' | 'code'>> & { settings?: Partial<SchoolSettings['settings']> }>({
      query: (body) => ({ url: '/admin/settings', method: 'PATCH', body }),
      invalidatesTags: ['Settings', 'Timetable'],
    }),
    addHoliday: b.mutation<unknown, { date: string; name: string }>({
      query: (body) => ({ url: '/admin/settings/holidays', method: 'POST', body }),
      invalidatesTags: ['Settings'],
    }),
    deleteHoliday: b.mutation<unknown, string>({
      query: (date) => ({ url: `/admin/settings/holidays/${date}`, method: 'DELETE' }),
      invalidatesTags: ['Settings'],
    }),
    auditLog: b.query<AuditEntry[], void>({
      query: () => '/admin/settings/audit-log',
      transformResponse: unwrap<AuditEntry[]>,
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useNotificationsQuery,
  useMarkAllReadMutation,
  useDashboardQuery,
  useTeachersQuery,
  useTeacherOptionsQuery,
  useTeacherActionMutation,
  useClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useStudentsQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useUploadStudentsMutation,
  useTimetableMetaQuery,
  useTimetableEntriesQuery,
  useSaveSlotMutation,
  useDeleteSlotMutation,
  usePublishTimetableMutation,
  useSubstitutionsQuery,
  useCreateSubstitutionMutation,
  useDeleteSubstitutionMutation,
  useLeaveRequestsQuery,
  useDecideLeaveMutation,
  useAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useGenerateDuesMutation,
  useFeeDuesQuery,
  usePaymentsQuery,
  useAttendanceSummaryQuery,
  useClassAttendanceQuery,
  useCorrectAttendanceMutation,
  useSettingsQuery,
  useUpdateSettingsMutation,
  useAddHolidayMutation,
  useDeleteHolidayMutation,
  useAuditLogQuery,
} = adminApi;
