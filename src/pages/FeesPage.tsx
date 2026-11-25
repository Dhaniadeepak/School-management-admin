import { useState, type FormEvent } from 'react';
import {
  useClassesQuery,
  useCreateFeeStructureMutation,
  useFeeDuesQuery,
  useFeeStructuresQuery,
  useGenerateDuesMutation,
  usePaymentsQuery,
  useSettingsQuery,
  useUpdateFeeStructureMutation,
} from '../api/adminApi';
import { useAppSelector } from '../app/hooks';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner, Stat, Tabs } from '../components/ui';
import { downloadWithAuth, errorMessage, formatDate, formatDateTime, rupees, todayISO } from '../lib/utils';
import type { FeeStructure, FeeStructureInput } from '../types';

function StructureForm({ item, onClose }: { item: FeeStructure | null; onClose: () => void }) {
  const { data: classes = [] } = useClassesQuery();
  const { data: settings } = useSettingsQuery();
  const [create, createState] = useCreateFeeStructureMutation();
  const [update, updateState] = useUpdateFeeStructureMutation();
  const [classId, setClassId] = useState(item?.classId ?? '');
  const [heads, setHeads] = useState(item?.heads.map((h) => ({ name: h.name, amount: String(h.amount) })) ?? [{ name: 'Tuition', amount: '' }]);
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [allow, setAllow] = useState(item?.allowInstallments ?? false);
  const [inst, setInst] = useState(
    item?.installments.length
      ? item.installments.map((i) => ({ label: i.label, dueDate: i.dueDate, amount: String(i.amount) }))
      : [
          { label: 'Installment 1', dueDate: '', amount: '' },
          { label: 'Installment 2', dueDate: '', amount: '' },
        ],
  );
  const total = heads.reduce((s, h) => s + (Number(h.amount) || 0), 0);
  const instTotal = inst.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const installmentsAllowed = settings?.settings.allowInstallments ?? true;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: FeeStructureInput = {
      classId,
      heads: heads.filter((h) => h.name).map((h) => ({ name: h.name, amount: Number(h.amount) || 0 })),
      dueDate,
      allowInstallments: allow,
      installments: allow ? inst.map((i) => ({ label: i.label, dueDate: i.dueDate, amount: Number(i.amount) || 0 })) : undefined,
    };
    const res = item ? await update({ id: item.id, ...body }).unwrap().catch(() => null) : await create(body).unwrap().catch(() => null);
    if (res !== null) onClose();
  };
  const state = item ? updateState : createState;

  return (
    <Modal title={item ? `Edit fee for ${item.className}` : 'New fee structure'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <Field label="Class">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!!item} required>
            <option value="">Choose…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <h3>Fee heads (₹)</h3>
        {heads.map((h, i) => (
          <div className="row" key={i}>
            <input placeholder="Tuition, Transport…" value={h.name} onChange={(e) => setHeads(heads.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input type="number" min={0} placeholder="Amount" value={h.amount} onChange={(e) => setHeads(heads.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            {heads.length > 1 && (
              <Button type="button" variant="ghost" onClick={() => setHeads(heads.filter((_, j) => j !== i))}>
                Remove
              </Button>
            )}
          </div>
        ))}
        <div className="row between">
          <Button type="button" variant="ghost" onClick={() => setHeads([...heads, { name: '', amount: '' }])}>
            + Add fee head
          </Button>
          <strong>Total {rupees(total)}</strong>
        </div>
        <Field label="Due date (when paid in full)">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </Field>
        <label className="check">
          <input type="checkbox" checked={allow} disabled={!installmentsAllowed} onChange={(e) => setAllow(e.target.checked)} /> Allow paying in two
          installments {!installmentsAllowed && <span className="muted small">(switched off in Settings)</span>}
        </label>
        {allow &&
          inst.map((i, n) => (
            <div className="form-grid" key={n}>
              <Field label="Label">
                <input value={i.label} onChange={(e) => setInst(inst.map((x, j) => (j === n ? { ...x, label: e.target.value } : x)))} required />
              </Field>
              <Field label="Due date">
                <input type="date" value={i.dueDate} onChange={(e) => setInst(inst.map((x, j) => (j === n ? { ...x, dueDate: e.target.value } : x)))} required />
              </Field>
              <Field label="Amount (₹)">
                <input type="number" min={0} value={i.amount} onChange={(e) => setInst(inst.map((x, j) => (j === n ? { ...x, amount: e.target.value } : x)))} required />
              </Field>
            </div>
          ))}
        {allow && instTotal !== total && <Alert kind="warning">The installments add up to {rupees(instTotal)}; they must equal the total {rupees(total)}.</Alert>}
        {item && <Alert kind="info">Saving removes this fee's unpaid dues. Generate the dues again afterwards.</Alert>}
        <Alert>{errorMessage(state.error)}</Alert>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={state.isLoading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function StructuresTab() {
  const { data, isLoading, error } = useFeeStructuresQuery();
  const [generate, genState] = useGenerateDuesMutation();
  const [editing, setEditing] = useState<FeeStructure | null | 'new'>(null);

  return (
    <>
      <Card title="Fee for each class" actions={<Button onClick={() => setEditing('new')}>New fee structure</Button>}>
        <Alert>{errorMessage(genState.error)}</Alert>
        {genState.isSuccess && genState.data && (
          <Alert kind="success">
            Created {genState.data.created} new dues for {genState.data.students} students.
          </Alert>
        )}
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.length ? (
          <Empty>No fee structures yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Year</th>
                  <th>Fee heads</th>
                  <th className="right">Total</th>
                  <th>Payment plan</th>
                  <th>Collected</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.className}</strong>
                    </td>
                    <td>{s.academicYear}</td>
                    <td className="small">{s.heads.map((h) => `${h.name} ${rupees(h.amount)}`).join(', ')}</td>
                    <td className="right">{rupees(s.total)}</td>
                    <td className="small">
                      {s.allowInstallments
                        ? s.installments.map((i) => `${rupees(i.amount)} by ${formatDate(i.dueDate)}`).join(' + ')
                        : `Full by ${formatDate(s.dueDate)}`}
                    </td>
                    <td className="small">
                      {rupees(s.dues.paidAmount)} paid
                      <div className="muted">{rupees(s.dues.pendingAmount)} pending</div>
                    </td>
                    <td className="actions">
                      <Button variant="secondary" onClick={() => generate(s.id)} loading={genState.isLoading && genState.originalArgs === s.id}>
                        Generate dues
                      </Button>{' '}
                      <Button variant="ghost" onClick={() => setEditing(s)} disabled={s.dues.paid > 0} title={s.dues.paid > 0 ? 'Some parents have paid already' : undefined}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">"Generate dues" creates what each active student of the class owes. Run it again after adding students; existing dues are kept.</p>
      </Card>
      {editing && <StructureForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function DuesTab() {
  const token = useAppSelector((s) => s.auth.accessToken);
  const { data: classes = [] } = useClassesQuery();
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<'' | 'pending' | 'paid' | 'overdue'>('');
  const params = { classId: classId || undefined, status: status === 'overdue' || !status ? undefined : status, overdue: status === 'overdue' ? 'true' : undefined };
  const { data, isLoading, isFetching, error } = useFeeDuesQuery(params);
  const [exportError, setExportError] = useState('');

  const doExport = () => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    downloadWithAuth(`/admin/fees/dues/export${qs ? `?${qs}` : ''}`, `fees-${todayISO()}.xlsx`, token).catch((e: Error) => setExportError(e.message));
  };

  return (
    <>
      {data && (
        <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
          <Stat label="Collected" value={rupees(data.totals.paid)} tone="green" />
          <Stat label="Pending" value={rupees(data.totals.pending)} tone="amber" />
          <Stat label="Rows" value={data.totals.count} />
        </div>
      )}
      <Card
        title="Paid and pending"
        actions={
          <div className="row">
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">Paid and pending</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
            <Button variant="secondary" onClick={doExport}>
              Export to Excel
            </Button>
          </div>
        }
      >
        <Alert>{exportError}</Alert>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.items.length ? (
          <Empty>No dues match. Generate dues from the Fee structures tab.</Empty>
        ) : (
          <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}>
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Student</th>
                  <th>Fee</th>
                  <th className="right">Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id}>
                    <td>{d.className}</td>
                    <td>
                      {d.studentName}
                      <div className="muted small">{d.admissionNo}</div>
                    </td>
                    <td>{d.label}</td>
                    <td className="right">{rupees(d.amount)}</td>
                    <td className="nowrap">{formatDate(d.dueDate)}</td>
                    <td>
                      {d.status === 'paid' ? (
                        <Badge tone="green">paid {formatDate(d.paidAt)}</Badge>
                      ) : d.dueDate < todayISO() ? (
                        <Badge tone="red">overdue</Badge>
                      ) : (
                        <Badge tone="amber">pending</Badge>
                      )}
                    </td>
                    <td className="small">{d.receiptNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function PaymentsTab() {
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = usePaymentsQuery({ status: status || undefined });
  const tone = { created: 'gray', paid: 'green', failed: 'red', refunded: 'amber' } as const;
  return (
    <Card
      title="Online payment attempts"
      actions={
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="paid">Paid</option>
          <option value="created">Started, not finished</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      }
    >
      <p className="muted small">Every attempt is kept. Payments are marked paid only when the gateway confirms them. Use this list to match the gateway's settlement report.</p>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : !data?.length ? (
        <Empty>No payments yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Student</th>
                <th className="right">Amount</th>
                <th>Status</th>
                <th>Receipt</th>
                <th>Gateway IDs</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap small">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td>
                    {p.studentName}
                    <div className="muted small">{p.admissionNo}</div>
                  </td>
                  <td className="right">{rupees(p.amount)}</td>
                  <td>
                    <Badge tone={tone[p.status]}>{p.status}</Badge>
                    {p.failureReason && <div className="muted small">{p.failureReason}</div>}
                  </td>
                  <td className="small">{p.receiptNo}</td>
                  <td className="small muted">
                    {p.orderId}
                    {p.transactionId ? <div>{p.transactionId}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function FeesPage() {
  const [tab, setTab] = useState<'dues' | 'structures' | 'payments'>('dues');
  return (
    <>
      <PageHeader title="Fees" subtitle="Set the fee for each class, then watch who has paid." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'dues', label: 'Paid & pending' },
          { value: 'structures', label: 'Fee structures' },
          { value: 'payments', label: 'Online payments' },
        ]}
      />
      {tab === 'dues' && <DuesTab />}
      {tab === 'structures' && <StructuresTab />}
      {tab === 'payments' && <PaymentsTab />}
    </>
  );
}
