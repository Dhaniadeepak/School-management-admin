import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDecideLeaveMutation, useLeaveRequestsQuery } from '../api/adminApi';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner, Tabs } from '../components/ui';
import { errorMessage, formatDate } from '../lib/utils';
import type { CoverPeriod, LeaveRequest } from '../types';

const tone = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' } as const;

export default function LeavePage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const { data, isLoading, error } = useLeaveRequestsQuery({ status: tab === 'pending' ? 'pending' : undefined });
  const [decide, decideState] = useDecideLeaveMutation();
  const [deciding, setDeciding] = useState<{ leave: LeaveRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [comment, setComment] = useState('');
  const [cover, setCover] = useState<{ name: string; periods: CoverPeriod[] } | null>(null);

  const submit = async () => {
    if (!deciding) return;
    const res = await decide({ id: deciding.leave.id, decision: deciding.decision, comment: comment || undefined }).unwrap().catch(() => null);
    if (res) {
      if (res.cover.length) setCover({ name: deciding.leave.teacherName, periods: res.cover });
      setDeciding(null);
    }
  };

  return (
    <>
      <PageHeader title="Leave requests" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Waiting' },
          { value: 'all', label: 'All requests' },
        ]}
      />
      {cover && (
        <Alert kind="info">
          {cover.name}'s leave is approved. {cover.periods.length} period(s) need cover:{' '}
          {cover.periods.slice(0, 6).map((p) => `${formatDate(p.date)} P${p.period} ${p.className}`).join('; ')}
          {cover.periods.length > 6 ? '…' : ''} <Link to="/timetable?tab=cover">Assign cover</Link>
        </Alert>
      )}
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.length ? (
          <Empty>{tab === 'pending' ? 'No leave requests waiting.' : 'No leave requests yet.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.teacherName}</strong>
                      <div className="muted small">Applied {formatDate(l.appliedAt)}</div>
                    </td>
                    <td>{l.type}</td>
                    <td className="nowrap">
                      {formatDate(l.from)} – {formatDate(l.to)}
                      <div className="muted small">{l.days} day(s)</div>
                    </td>
                    <td>
                      {l.reason}
                      {l.document && (
                        <div>
                          <a href={l.document.url} target="_blank" rel="noreferrer">
                            {l.document.name}
                          </a>
                        </div>
                      )}
                      {l.decisionComment && <div className="muted small">Comment: {l.decisionComment}</div>}
                    </td>
                    <td>
                      <Badge tone={tone[l.status]}>{l.status}</Badge>
                      {l.decidedBy && <div className="muted small">by {l.decidedBy}</div>}
                    </td>
                    <td className="actions">
                      {l.status === 'pending' && (
                        <>
                          <Button onClick={() => { setComment(''); setDeciding({ leave: l, decision: 'approved' }); }}>Approve</Button>{' '}
                          <Button variant="secondary" onClick={() => { setComment(''); setDeciding({ leave: l, decision: 'rejected' }); }}>
                            Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deciding && (
        <Modal
          title={`${deciding.decision === 'approved' ? 'Approve' : 'Reject'} leave for ${deciding.leave.teacherName}`}
          onClose={() => setDeciding(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeciding(null)}>
                Cancel
              </Button>
              <Button variant={deciding.decision === 'approved' ? 'primary' : 'danger'} onClick={submit} loading={decideState.isLoading}>
                {deciding.decision === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </>
          }
        >
          <p>
            {deciding.leave.type} leave, {formatDate(deciding.leave.from)} – {formatDate(deciding.leave.to)} ({deciding.leave.days} day(s))
          </p>
          <Field label="Comment for the teacher (optional)">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <Alert>{errorMessage(decideState.error)}</Alert>
        </Modal>
      )}
    </>
  );
}
