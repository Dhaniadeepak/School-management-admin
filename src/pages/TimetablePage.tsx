import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useClassesQuery,
  useCreateSubstitutionMutation,
  useDeleteSlotMutation,
  useDeleteSubstitutionMutation,
  usePublishTimetableMutation,
  useSaveSlotMutation,
  useSubstitutionsQuery,
  useTeacherOptionsQuery,
  useTimetableEntriesQuery,
  useTimetableMetaQuery,
} from '../api/adminApi';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner, Tabs } from '../components/ui';
import { DAY_NAMES, errorMessage, formatDateTime, todayISO } from '../lib/utils';
import type { CoverPeriod, TimetableEntry } from '../types';

interface SlotTarget {
  day: number;
  period: number;
  entry?: TimetableEntry;
}

function SlotEditor({ teacherId, target, onClose }: { teacherId: string; target: SlotTarget; onClose: () => void }) {
  const { data: classes = [] } = useClassesQuery();
  const [save, saveState] = useSaveSlotMutation();
  const [remove, removeState] = useDeleteSlotMutation();
  const e = target.entry;
  const [kind, setKind] = useState<'class' | 'duty' | 'free'>(e?.kind ?? 'class');
  const [classId, setClassId] = useState(e?.classId ?? '');
  const [subject, setSubject] = useState(e?.subject ?? '');
  const [room, setRoom] = useState(e?.room ?? '');
  const [note, setNote] = useState(e?.note ?? '');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (kind === 'free') {
      if (e) await remove(e.id).unwrap().catch(() => null);
      return onClose();
    }
    const ok = await save({
      teacherId,
      day: target.day,
      period: target.period,
      kind,
      classId: classId || undefined,
      subject: subject || undefined,
      room: room || undefined,
      note: note || undefined,
    })
      .unwrap()
      .catch(() => null);
    if (ok !== null) onClose();
  };

  return (
    <Modal title={`${DAY_NAMES[target.day]}, period ${target.period}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <Tabs
          value={kind}
          onChange={setKind}
          tabs={[
            { value: 'class', label: 'Teaching' },
            { value: 'duty', label: 'Free period with duty' },
            { value: 'free', label: 'Free' },
          ]}
        />
        {kind !== 'free' && (
          <div className="form-grid">
            <Field label={kind === 'class' ? 'Class' : 'Go to class (optional)'}>
              <select value={classId} onChange={(ev) => setClassId(ev.target.value)} required={kind === 'class'}>
                <option value="">{kind === 'class' ? 'Choose…' : '— None —'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            {kind === 'class' && (
              <Field label="Subject">
                <input value={subject} onChange={(ev) => setSubject(ev.target.value)} required />
              </Field>
            )}
            <Field label="Room">
              <input value={room} onChange={(ev) => setRoom(ev.target.value)} />
            </Field>
          </div>
        )}
        {kind === 'duty' && (
          <Field label="Duty" hint="Shown to the teacher, e.g. Cover 6-B, Library duty, Gate duty">
            <input value={note} onChange={(ev) => setNote(ev.target.value)} required />
          </Field>
        )}
        {kind === 'free' && <p className="muted">This period will be a plain free period.</p>}
        <Alert>{errorMessage(saveState.error || removeState.error)}</Alert>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saveState.isLoading || removeState.isLoading}>Save to draft</Button>
        </div>
      </form>
    </Modal>
  );
}

function WeeklyGrid() {
  const { data: meta } = useTimetableMetaQuery();
  const { data: teachers = [], isLoading: loadingTeachers } = useTeacherOptionsQuery();
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [target, setTarget] = useState<SlotTarget | null>(null);
  const [publish, publishState] = usePublishTimetableMutation();

  useEffect(() => {
    if (!teacherId && teachers.length) setTeacherId(teachers[0].id);
  }, [teachers, teacherId]);

  const { data: entries = [], isFetching } = useTimetableEntriesQuery({ teacherId, status }, { skip: !teacherId });
  const byKey = useMemo(() => new Map(entries.map((e) => [`${e.day}-${e.period}`, e])), [entries]);

  if (!meta || loadingTeachers) return <Spinner />;
  if (!meta.periods.length) return <Alert kind="warning">Set up the school's periods in Settings first.</Alert>;
  if (!teachers.length) return <Empty>Approve at least one teacher first.</Empty>;

  return (
    <>
      <Card>
        <div className="row between">
          <div className="row">
            <Field label="Teacher">
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Show">
              <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
                <option value="draft">Draft (editable)</option>
                <option value="published">Published (what teachers see)</option>
              </select>
            </Field>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end' }}>
            <div className="row">
              {meta.hasUnpublishedChanges ? <Badge tone="amber">Draft has unpublished changes</Badge> : <Badge tone="green">Up to date</Badge>}
              <Button
                loading={publishState.isLoading}
                onClick={() => confirm('Publish the draft timetable? All teachers will be notified.') && publish()}
              >
                Publish timetable
              </Button>
            </div>
            <span className="muted small">
              Version {meta.publishedVersion}
              {meta.publishedAt ? `, published ${formatDateTime(meta.publishedAt)}` : ''}
            </span>
          </div>
        </div>
        <Alert>{errorMessage(publishState.error)}</Alert>
        {publishState.isSuccess && <Alert kind="success">Published version {publishState.data?.version}. Teachers have been notified.</Alert>}
      </Card>

      <Card>
        <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}>
          <table className="tt-grid">
            <thead>
              <tr>
                <th>Period</th>
                {meta.workingDays.map((d) => (
                  <th key={d}>{DAY_NAMES[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.periods.map((p) => (
                <tr key={p.number}>
                  <th>
                    {p.number}
                    <div className="muted small">
                      {p.start}–{p.end}
                    </div>
                  </th>
                  {meta.workingDays.map((d) => {
                    const e = byKey.get(`${d}-${p.number}`);
                    return (
                      <td key={d}>
                        <button
                          className={`tt-cell ${e?.kind ?? ''}`}
                          disabled={status === 'published'}
                          onClick={() => setTarget({ day: d, period: p.number, entry: e })}
                        >
                          {e?.kind === 'class' && (
                            <>
                              <strong>{e.className}</strong>
                              <span>{e.subject}</span>
                              {e.room && <span className="muted">Room {e.room}</span>}
                            </>
                          )}
                          {e?.kind === 'duty' && (
                            <>
                              <strong>Free · duty</strong>
                              <span>{e.note}</span>
                              {(e.className || e.room) && <span className="muted">{[e.className, e.room && `Room ${e.room}`].filter(Boolean).join(', ')}</span>}
                            </>
                          )}
                          {!e && <span className="muted">Free</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Click a cell to edit the draft. A teacher cannot be in two places at once, and a class cannot have two teachers in the same period.</p>
      </Card>
      {target && <SlotEditor teacherId={teacherId} target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function CoverTab() {
  const [date, setDate] = useState(todayISO());
  const { data, isLoading, error } = useSubstitutionsQuery(date);
  const { data: teachers = [] } = useTeacherOptionsQuery();
  const { data: classes = [] } = useClassesQuery();
  const [create, createState] = useCreateSubstitutionMutation();
  const [remove] = useDeleteSubstitutionMutation();
  const [form, setForm] = useState({ period: '', classId: '', substituteTeacherId: '', originalTeacherId: '', subject: '', room: '', note: '' });

  const prefill = (c: CoverPeriod) =>
    setForm({ period: String(c.period), classId: c.classId ?? '', substituteTeacherId: '', originalTeacherId: c.teacherId, subject: c.subject ?? '', room: c.room ?? '', note: '' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await create({
      date,
      period: Number(form.period),
      classId: form.classId,
      substituteTeacherId: form.substituteTeacherId,
      originalTeacherId: form.originalTeacherId || undefined,
      subject: form.subject || undefined,
      room: form.room || undefined,
      note: form.note || undefined,
    })
      .unwrap()
      .catch(() => null);
    if (ok !== null) setForm({ period: '', classId: '', substituteTeacherId: '', originalTeacherId: '', subject: '', room: '', note: '' });
  };

  return (
    <div className="grid grid-2">
      <Card title="Periods needing cover" actions={<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />}>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.needCover.length ? (
          <Empty>No teacher is on approved leave that day.</Empty>
        ) : (
          <ul className="list">
            {data.needCover.map((c) => (
              <li key={`${c.teacherId}-${c.period}`} className="row between">
                <span>
                  P{c.period} · {c.className} {c.subject} <span className="muted small">({c.teacherName} on leave)</span>
                </span>
                {c.coveredBy ? (
                  <Badge tone="green">{c.coveredBy}</Badge>
                ) : (
                  <Button variant="secondary" onClick={() => prefill(c)}>
                    Assign
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Assign a one-day substitution">
        <form className="stack" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Period">
              <input type="number" min={1} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required />
            </Field>
            <Field label="Class">
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                <option value="">Choose…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Covering teacher">
              <select value={form.substituteTeacherId} onChange={(e) => setForm({ ...form, substituteTeacherId: e.target.value })} required>
                <option value="">Choose…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Room">
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </Field>
          </div>
          <Field label="Note for the teacher">
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Alert>{errorMessage(createState.error)}</Alert>
          <div>
            <Button loading={createState.isLoading}>Assign cover</Button>
          </div>
        </form>

        <h3 style={{ marginTop: '1rem' }}>Assigned for this date</h3>
        {!data?.items.length ? (
          <Empty>None yet.</Empty>
        ) : (
          <ul className="list">
            {data.items.map((s) => (
              <li key={s.id} className="row between">
                <span>
                  P{s.period} · {s.className} → <strong>{s.substituteTeacherName}</strong>
                  {s.originalTeacherName ? <span className="muted small"> (for {s.originalTeacherName})</span> : null}
                </span>
                <Button variant="ghost" onClick={() => remove(s.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function TimetablePage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'weekly' | 'cover') ?? 'weekly';
  return (
    <>
      <PageHeader title="Timetable" subtitle="Build each teacher's week, mark free periods with duties, then publish." />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'weekly' ? {} : { tab: v })}
        tabs={[
          { value: 'weekly', label: 'Weekly timetable' },
          { value: 'cover', label: 'Cover & substitutions' },
        ]}
      />
      {tab === 'weekly' ? <WeeklyGrid /> : <CoverTab />}
    </>
  );
}
