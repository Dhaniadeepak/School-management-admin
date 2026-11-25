import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useClassesQuery, useCreateClassMutation, useDeleteClassMutation, useTeacherOptionsQuery, useUpdateClassMutation } from '../api/adminApi';
import { Alert, Button, Card, Empty, Field, PageHeader, Spinner } from '../components/ui';
import { errorMessage } from '../lib/utils';

export default function ClassesPage() {
  const { data: classes, isLoading, error } = useClassesQuery();
  const { data: teachers = [] } = useTeacherOptionsQuery();
  const [create, createState] = useCreateClassMutation();
  const [update, updateState] = useUpdateClassMutation();
  const [remove, removeState] = useDeleteClassMutation();
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await create({ name, section, classTeacherId: classTeacherId || null }).unwrap().catch(() => null);
    if (ok !== null) {
      setSection('');
      setClassTeacherId('');
    }
  };

  return (
    <>
      <PageHeader title="Classes and sections" subtitle="Create every class-section first; students and fees are attached to them." />
      <div className="grid grid-2">
        <Card title="Add a class">
          <form className="stack" onSubmit={onCreate}>
            <div className="form-grid">
              <Field label="Class" hint="e.g. 6, 10, LKG">
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Section" hint="e.g. A">
                <input value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} maxLength={5} required />
              </Field>
            </div>
            <Field label="Class teacher (optional)">
              <select value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)}>
                <option value="">— None —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Alert>{errorMessage(createState.error)}</Alert>
            <div>
              <Button loading={createState.isLoading}>Add class</Button>
            </div>
          </form>
        </Card>

        <Card title="All classes">
          <Alert>{errorMessage(updateState.error || removeState.error)}</Alert>
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <Alert>{errorMessage(error)}</Alert>
          ) : !classes?.length ? (
            <Empty>No classes yet.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Students</th>
                    <th>Class teacher</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.label}</strong>
                      </td>
                      <td>
                        <Link to={`/students?classId=${c.id}`}>{c.studentCount}</Link>
                      </td>
                      <td>
                        <select value={c.classTeacherId ?? ''} onChange={(e) => update({ id: c.id, classTeacherId: e.target.value || null })}>
                          <option value="">— None —</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="actions">
                        <Button
                          variant="ghost"
                          disabled={c.studentCount > 0}
                          title={c.studentCount > 0 ? 'Move the students first' : undefined}
                          onClick={() => confirm(`Delete class ${c.label}?`) && remove(c.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
