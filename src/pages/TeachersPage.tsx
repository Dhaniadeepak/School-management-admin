import { useState } from 'react';
import { useTeacherActionMutation, useTeachersQuery } from '../api/adminApi';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner, Tabs } from '../components/ui';
import { errorMessage, formatDate } from '../lib/utils';
import type { Teacher, UserStatus } from '../types';

const statusTone = { pending: 'amber', approved: 'green', rejected: 'red', deactivated: 'gray' } as const;

export default function TeachersPage() {
  const [tab, setTab] = useState<UserStatus>('pending');
  const { data, isLoading, error } = useTeachersQuery({ status: tab });
  const [act, actState] = useTeacherActionMutation();
  const [approving, setApproving] = useState<Teacher | null>(null);
  const [rejecting, setRejecting] = useState<Teacher | null>(null);
  const [subjects, setSubjects] = useState('');
  const [reason, setReason] = useState('');

  const approve = async () => {
    if (!approving) return;
    const list = subjects.split(',').map((s) => s.trim()).filter(Boolean);
    await act({ id: approving.id, action: 'approve', subjects: list.length ? list : undefined }).unwrap().catch(() => null);
    setApproving(null);
  };
  const reject = async () => {
    if (!rejecting) return;
    const ok = await act({ id: rejecting.id, action: 'reject', reason }).unwrap().catch(() => null);
    if (ok !== null) setRejecting(null);
  };
  const simple = (t: Teacher, action: 'deactivate' | 'reactivate') => {
    if (action === 'deactivate' && !confirm(`Deactivate ${t.name}? They will be signed out and lose access.`)) return;
    void act({ id: t.id, action });
  };

  return (
    <>
      <PageHeader title="Teacher approvals" subtitle="Teachers register with your school code. They see nothing until you approve them." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Waiting' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'deactivated', label: 'Deactivated' },
        ]}
      />
      <Alert>{errorMessage(actState.error)}</Alert>
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.length ? (
          <Empty>No teachers here.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Subjects</th>
                  <th>Status</th>
                  <th>{tab === 'pending' ? 'Registered' : 'Decided'}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                      {t.qualification ? <div className="muted small">{t.qualification}</div> : null}
                      {t.rejectionReason ? <div className="muted small">Reason: {t.rejectionReason}</div> : null}
                    </td>
                    <td className="nowrap">{t.phone}</td>
                    <td>{t.subjects.join(', ') || '—'}</td>
                    <td>
                      <Badge tone={statusTone[t.status]}>{t.status}</Badge>
                    </td>
                    <td className="small muted">
                      {tab === 'pending' ? formatDate(t.registeredAt) : `${formatDate(t.decidedAt)}${t.decidedBy ? ` by ${t.decidedBy}` : ''}`}
                    </td>
                    <td className="actions">
                      {t.status === 'pending' && (
                        <>
                          <Button onClick={() => { setSubjects(t.subjects.join(', ')); setApproving(t); }}>Approve</Button>{' '}
                          <Button variant="secondary" onClick={() => { setReason(''); setRejecting(t); }}>
                            Reject
                          </Button>
                        </>
                      )}
                      {t.status === 'approved' && (
                        <Button variant="secondary" onClick={() => simple(t, 'deactivate')}>
                          Deactivate
                        </Button>
                      )}
                      {t.status === 'deactivated' && (
                        <Button variant="secondary" onClick={() => simple(t, 'reactivate')}>
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {approving && (
        <Modal
          title={`Approve ${approving.name}`}
          onClose={() => setApproving(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setApproving(null)}>
                Cancel
              </Button>
              <Button onClick={approve} loading={actState.isLoading}>
                Approve
              </Button>
            </>
          }
        >
          <p className="muted">The teacher will be notified and can then see their timetable and classes.</p>
          <Field label="Subjects" hint="Comma separated, e.g. Maths, Science">
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} />
          </Field>
        </Modal>
      )}

      {rejecting && (
        <Modal
          title={`Reject ${rejecting.name}`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={reject} loading={actState.isLoading} disabled={reason.trim().length < 3}>
                Reject
              </Button>
            </>
          }
        >
          <Field label="Reason (sent to the teacher)">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  );
}
