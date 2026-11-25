import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useClassesQuery,
  useCreateStudentMutation,
  useStudentsQuery,
  useUpdateStudentMutation,
  useUploadStudentsMutation,
  type StudentInput,
} from '../api/adminApi';
import { useAppSelector } from '../app/hooks';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner } from '../components/ui';
import { downloadWithAuth, errorDetails, errorMessage } from '../lib/utils';
import type { StudentRow } from '../types';

type ParentForm = { name: string; phone: string; relation: string };
const emptyParent = (): ParentForm => ({ name: '', phone: '', relation: '' });

function StudentForm({ student, onClose }: { student: StudentRow | null; onClose: () => void }) {
  const { data: classes = [] } = useClassesQuery();
  const [create, createState] = useCreateStudentMutation();
  const [update, updateState] = useUpdateStudentMutation();
  const [form, setForm] = useState({
    admissionNo: student?.admissionNo ?? '',
    name: student?.name ?? '',
    classId: student?.classId ?? '',
    rollNo: student?.rollNo ? String(student.rollNo) : '',
    gender: student?.gender ?? '',
    dob: student?.dob ?? '',
    active: student?.active ?? true,
  });
  const [parents, setParents] = useState<ParentForm[]>(
    student?.parents.length ? student.parents.map((p) => ({ name: p.name, phone: p.phone, relation: p.relation ?? '' })) : [emptyParent()],
  );
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setParent = (i: number, k: keyof ParentForm, v: string) => setParents((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: StudentInput = {
      admissionNo: form.admissionNo,
      name: form.name,
      classId: form.classId,
      rollNo: form.rollNo ? Number(form.rollNo) : undefined,
      gender: form.gender || undefined,
      dob: form.dob || undefined,
      parents: parents.filter((p) => p.phone.trim()).map((p) => ({ name: p.name, phone: p.phone, relation: p.relation || undefined })),
      active: form.active,
    };
    const res = student ? await update({ id: student.id, ...body }).unwrap().catch(() => null) : await create(body).unwrap().catch(() => null);
    if (res !== null) onClose();
  };

  const state = student ? updateState : createState;
  return (
    <Modal title={student ? `Edit ${student.name}` : 'Add student'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Admission no.">
            <input value={form.admissionNo} onChange={(e) => set('admissionNo', e.target.value)} required />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <Field label="Class">
            <select value={form.classId} onChange={(e) => set('classId', e.target.value)} required>
              <option value="">Choose…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Roll no.">
            <input type="number" min={1} value={form.rollNo} onChange={(e) => set('rollNo', e.target.value)} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
          </Field>
        </div>
        <h3>Parents / guardians</h3>
        <p className="muted small">Parents log in to the parent app with this phone number. Brothers and sisters with the same number are linked automatically.</p>
        {parents.map((p, i) => (
          <div className="form-grid" key={i}>
            <Field label="Name">
              <input value={p.name} onChange={(e) => setParent(i, 'name', e.target.value)} required={i === 0} />
            </Field>
            <Field label="Mobile">
              <input value={p.phone} onChange={(e) => setParent(i, 'phone', e.target.value)} inputMode="tel" required={i === 0} />
            </Field>
            <Field label="Relation">
              <input value={p.relation} onChange={(e) => setParent(i, 'relation', e.target.value)} placeholder="Father / Mother" />
            </Field>
          </div>
        ))}
        {parents.length < 3 && (
          <div>
            <Button type="button" variant="ghost" onClick={() => setParents((ps) => [...ps, emptyParent()])}>
              + Add another guardian
            </Button>
          </div>
        )}
        {student && (
          <label className="check">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active (uncheck if the student has left)
          </label>
        )}
        <Alert>{errorMessage(state.error)}</Alert>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={state.isLoading}>{student ? 'Save' : 'Add student'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function UploadCard() {
  const token = useAppSelector((s) => s.auth.accessToken);
  const [upload, state] = useUploadStudentsMutation();
  const [file, setFile] = useState<File | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const rowErrors = errorDetails<{ errors: { row: number; message: string }[]; totalRows: number }>(state.error);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await upload(fd).unwrap().catch(() => null);
  };

  return (
    <Card title="Upload students from Excel">
      <form className="stack" onSubmit={submit}>
        <p className="muted small">
          Download the template, fill one row per student with parent phone numbers, then upload it. If any row has a problem, nothing is imported
          and you get a list of rows to fix.
        </p>
        <div className="row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadWithAuth('/admin/students/template', 'students-template.xlsx', token).catch((e: Error) => setDownloadError(e.message))}
          >
            Download template
          </Button>
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button loading={state.isLoading} disabled={!file}>
            Upload
          </Button>
        </div>
        <Alert>{downloadError}</Alert>
        {state.isSuccess && state.data && (
          <Alert kind="success">
            Imported {state.data.created} students. {state.data.parentsCreated} new parent accounts were created.
          </Alert>
        )}
        {state.isError && <Alert>{errorMessage(state.error)}</Alert>}
        {rowErrors?.errors?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Problem</th>
                </tr>
              </thead>
              <tbody>
                {rowErrors.errors.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </form>
    </Card>
  );
}

export default function StudentsPage() {
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: classes = [] } = useClassesQuery();
  const { data, isLoading, isFetching, error } = useStudentsQuery({ classId: classId || undefined, q: search || undefined, page });
  const [editing, setEditing] = useState<StudentRow | null | 'new'>(null);

  useEffect(() => setPage(1), [classId, search]);
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;

  return (
    <>
      <PageHeader title="Students" subtitle={data ? `${data.total} students` : undefined} actions={<Button onClick={() => setEditing('new')}>Add student</Button>} />
      <UploadCard />
      <Card
        title="Student list"
        actions={
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q);
            }}
          >
            <select value={classId} onChange={(e) => setParams(e.target.value ? { classId: e.target.value } : {})}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input placeholder="Name or admission no." value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="secondary">Search</Button>
          </form>
        }
      >
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.items.length ? (
          <Empty>No students found.</Empty>
        ) : (
          <>
            <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}>
              <table>
                <thead>
                  <tr>
                    <th>Adm. no.</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Roll</th>
                    <th>Parents</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td>{s.admissionNo}</td>
                      <td>
                        {s.name} {!s.active && <Badge>left</Badge>}
                      </td>
                      <td>{s.className}</td>
                      <td>{s.rollNo ?? ''}</td>
                      <td className="small">
                        {s.parents.map((p) => (
                          <div key={p.phone}>
                            {p.name} · {p.phone} {p.relation ? <span className="muted">({p.relation})</span> : null}
                          </div>
                        ))}
                      </td>
                      <td className="actions">
                        <Button variant="ghost" onClick={() => setEditing(s)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="muted small">
                  Page {page} of {pages}
                </span>
                <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
      {editing && <StudentForm student={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
