import { Link } from 'react-router-dom';
import { useDashboardQuery } from '../api/adminApi';
import { Alert, Badge, Card, Empty, PageHeader, Spinner, Stat } from '../components/ui';
import { errorMessage, formatDate } from '../lib/utils';

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useDashboardQuery();

  if (isLoading) return <Spinner />;
  if (!data) return <Alert>{errorMessage(error)}</Alert>;

  const { teachers, approvals, attendance, cover } = data;
  const uncovered = cover.filter((c) => !c.coveredBy);

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatDate(data.date)}
        actions={
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </button>
        }
      />

      <div className="grid grid-4">
        <Stat label="Teachers present" value={`${teachers.present}/${teachers.total}`} tone={teachers.onLeave.length ? 'amber' : 'green'} hint={teachers.onLeave.length ? `${teachers.onLeave.length} on leave` : 'Everyone in'} />
        <Stat label="Students absent today" value={attendance.absent} tone={attendance.absent ? 'red' : undefined} hint={`of ${attendance.studentsTotal} students`} />
        <Stat
          label="Classes with attendance"
          value={`${attendance.classesMarked}/${attendance.classesTotal}`}
          tone={attendance.classesMarked < attendance.classesTotal ? 'amber' : 'green'}
        />
        <Stat label="Waiting for you" value={approvals.pendingTeachers.length + approvals.pendingLeaves.length} hint="teacher requests and leave" />
      </div>

      <div className="grid grid-2" style={{ marginTop: '1rem' }}>
        <Card title="Teachers on leave today">
          {teachers.onLeave.length === 0 ? (
            <Empty>No teacher is on leave today.</Empty>
          ) : (
            <ul className="list">
              {teachers.onLeave.map((t) => (
                <li key={t.id} className="row between">
                  <strong>{t.name}</strong>
                  <span className="muted small">
                    {t.type} · {formatDate(t.from)} – {formatDate(t.to)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Periods that need cover" actions={<Link to="/timetable?tab=cover">Assign cover</Link>}>
          {cover.length === 0 ? (
            <Empty>Nothing to cover today.</Empty>
          ) : (
            <>
              {uncovered.length > 0 && <Alert kind="warning">{uncovered.length} period(s) have no teacher yet.</Alert>}
              <ul className="list">
                {cover.map((c) => (
                  <li key={`${c.teacherId}-${c.period}`} className="row between">
                    <span>
                      Period {c.period} · Class {c.className} {c.subject ? `· ${c.subject}` : ''}
                      <span className="muted small"> (instead of {c.teacherName})</span>
                    </span>
                    {c.coveredBy ? <Badge tone="green">{c.coveredBy}</Badge> : <Badge tone="red">Not covered</Badge>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="New teacher requests" actions={<Link to="/teachers">Review</Link>}>
          {approvals.pendingTeachers.length === 0 ? (
            <Empty>No requests waiting.</Empty>
          ) : (
            <ul className="list">
              {approvals.pendingTeachers.map((t) => (
                <li key={t.id} className="row between">
                  <strong>{t.name}</strong>
                  <span className="muted">{t.phone}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Leave requests" actions={<Link to="/leave">Review</Link>}>
          {approvals.pendingLeaves.length === 0 ? (
            <Empty>No leave requests waiting.</Empty>
          ) : (
            <ul className="list">
              {approvals.pendingLeaves.map((l) => (
                <li key={l.id} className="row between">
                  <strong>{l.teacherName}</strong>
                  <span className="muted small">
                    {l.type} · {formatDate(l.from)} – {formatDate(l.to)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Attendance not taken yet" actions={<Link to="/attendance">Open attendance</Link>}>
          {attendance.unmarkedClasses.length === 0 ? (
            <Empty>All classes have submitted attendance.</Empty>
          ) : (
            <div className="row">
              {attendance.unmarkedClasses.map((c) => (
                <Badge key={c.id} tone="amber">
                  {c.name}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
