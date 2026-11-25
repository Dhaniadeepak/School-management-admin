import { useEffect, useState } from 'react';
import { useAttendanceSummaryQuery, useClassAttendanceQuery, useCorrectAttendanceMutation } from '../api/adminApi';
import { Alert, Badge, Button, Card, Empty, Modal, PageHeader, Spinner } from '../components/ui';
import { errorMessage, formatDate, formatDateTime, todayISO } from '../lib/utils';

function CorrectModal({ classId, className, date, onClose }: { classId: string; className: string; date: string; onClose: () => void }) {
  const { data, isLoading, error } = useClassAttendanceQuery({ classId, date });
  const [save, saveState] = useCorrectAttendanceMutation();
  const [absent, setAbsent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data) setAbsent(new Set(data.students.filter((s) => s.status === 'absent').map((s) => s.id)));
  }, [data]);

  const toggle = (id: string) =>
    setAbsent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (!data) return;
    const res = await save({
      classId,
      date,
      records: data.students.map((s) => ({ studentId: s.id, status: absent.has(s.id) ? 'absent' : 'present' })),
    })
      .unwrap()
      .catch(() => null);
    if (res) onClose();
  };

  return (
    <Modal
      title={`Class ${className} · ${formatDate(date)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saveState.isLoading} disabled={!data}>
            Save corrections
          </Button>
        </>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : data ? (
        <>
          <p className="muted small">
            {data.marked ? `Submitted ${formatDateTime(data.markedAt)}.` : 'Not submitted yet.'} Tap a student to switch present / absent. Every change is
            logged, and parents of newly absent students are alerted.
          </p>
          <div className="att-list">
            {data.students.map((s) => (
              <div key={s.id} className={`att-row ${absent.has(s.id) ? 'absent' : ''}`} onClick={() => toggle(s.id)}>
                <span className="roll">{s.rollNo ?? ''}</span>
                <span className="name">{s.name}</span>
                <span className="state">{absent.has(s.id) ? 'Absent' : 'Present'}</span>
              </div>
            ))}
          </div>
          <Alert>{errorMessage(saveState.error)}</Alert>
        </>
      ) : null}
    </Modal>
  );
}

export default function AttendancePage() {
  const [date, setDate] = useState(todayISO());
  const { data, isLoading, error } = useAttendanceSummaryQuery(date);
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);

  const totalAbsent = data?.classes.reduce((s, c) => s + c.absent, 0) ?? 0;
  const marked = data?.classes.filter((c) => c.marked).length ?? 0;

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={data ? `${marked} of ${data.classes.length} classes submitted · ${totalAbsent} absent` : undefined}
        actions={<input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />}
      />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.classes.length ? (
          <Empty>No classes yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Absent</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.classes.map((c) => (
                  <tr key={c.classId}>
                    <td>
                      <strong>{c.className}</strong>
                    </td>
                    <td>{c.students}</td>
                    <td>{c.marked ? <Badge tone="green">submitted</Badge> : <Badge tone="amber">not taken</Badge>}</td>
                    <td>{c.marked ? c.absent : '—'}</td>
                    <td className="actions">
                      <Button variant="secondary" onClick={() => setOpen({ id: c.classId, name: c.className })}>
                        {c.marked ? 'View / correct' : 'Mark'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <CorrectModal classId={open.id} className={open.name} date={date} onClose={() => setOpen(null)} />}
    </>
  );
}
