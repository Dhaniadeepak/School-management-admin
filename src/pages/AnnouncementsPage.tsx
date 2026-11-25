import { useState, type FormEvent } from 'react';
import {
  useAnnouncementsQuery,
  useClassesQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from '../api/adminApi';
import { Alert, Badge, Button, Card, Empty, Field, Modal, PageHeader, Spinner } from '../components/ui';
import { errorMessage, formatDate, formatDateTime } from '../lib/utils';
import type { Announcement, AnnouncementInput, AudienceKind } from '../types';

const audienceLabel: Record<AudienceKind, string> = { all: 'Everyone', teachers: 'Teachers', parents: 'Parents', classes: 'Selected classes' };

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AnnouncementForm({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
  const { data: classes = [] } = useClassesQuery();
  const [create, createState] = useCreateAnnouncementMutation();
  const [update, updateState] = useUpdateAnnouncementMutation();
  const [kind, setKind] = useState<'notice' | 'event'>(item?.kind ?? 'notice');
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [audience, setAudience] = useState<AudienceKind>(item?.audience.kind ?? 'all');
  const [classIds, setClassIds] = useState<string[]>(item?.audience.classIds ?? []);
  const [eventDate, setEventDate] = useState(item?.event?.date ?? '');
  const [eventTime, setEventTime] = useState(item?.event?.time ?? '');
  const [place, setPlace] = useState(item?.event?.place ?? '');
  const [schedule, setSchedule] = useState(item?.status === 'scheduled');
  const [publishAt, setPublishAt] = useState(item ? toLocalInput(item.publishAt) : '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input: AnnouncementInput = {
      kind,
      title,
      body,
      audience: { kind: audience, classIds: audience === 'classes' ? classIds : [] },
      event: kind === 'event' ? { date: eventDate, time: eventTime || undefined, place: place || undefined } : undefined,
      publishAt: schedule && publishAt ? new Date(publishAt).toISOString() : undefined,
    };
    const res = item ? await update({ id: item.id, ...input }).unwrap().catch(() => null) : await create(input).unwrap().catch(() => null);
    if (res !== null) onClose();
  };
  const state = item ? updateState : createState;

  return (
    <Modal title={item ? 'Edit notice' : 'New notice or event'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="row">
          <label className="check">
            <input type="radio" checked={kind === 'notice'} onChange={() => setKind('notice')} /> Notice
          </label>
          <label className="check">
            <input type="radio" checked={kind === 'event'} onChange={() => setKind('event')} /> Event (shows on the calendar)
          </label>
        </div>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </Field>
        <Field label="Details">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </Field>
        {kind === 'event' && (
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </Field>
            <Field label="Time">
              <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </Field>
            <Field label="Place">
              <input value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Who should see it">
          <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceKind)}>
            {Object.entries(audienceLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {audience === 'classes' && (
          <div className="row">
            {classes.map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={classIds.includes(c.id)}
                  onChange={(e) => setClassIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))}
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
        {(!item || item.status === 'scheduled') && (
          <>
            <label className="check">
              <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} /> Publish later
            </label>
            {schedule && (
              <Field label="Publish at">
                <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} required />
              </Field>
            )}
          </>
        )}
        <p className="muted small">A push notification is sent to everyone in the audience when it is published.</p>
        <Alert>{errorMessage(state.error)}</Alert>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={state.isLoading}>{item ? 'Save' : schedule ? 'Schedule' : 'Publish now'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AnnouncementsPage() {
  const { data, isLoading, error } = useAnnouncementsQuery();
  const [remove] = useDeleteAnnouncementMutation();
  const [editing, setEditing] = useState<Announcement | null | 'new'>(null);
  const events = (data ?? []).filter((a) => a.kind === 'event' && a.event).sort((a, b) => a.event!.date.localeCompare(b.event!.date));

  return (
    <>
      <PageHeader title="Notices & events" actions={<Button onClick={() => setEditing('new')}>New notice or event</Button>} />
      <div className="grid grid-2">
        <Card title="All notices">
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <Alert>{errorMessage(error)}</Alert>
          ) : !data?.length ? (
            <Empty>Nothing posted yet.</Empty>
          ) : (
            <ul className="list">
              {data.map((a) => (
                <li key={a.id} className="stack" style={{ gap: '0.25rem' }}>
                  <div className="row between">
                    <strong>{a.title}</strong>
                    <span className="row">
                      <Badge tone={a.kind === 'event' ? 'blue' : 'gray'}>{a.kind}</Badge>
                      {a.status === 'scheduled' ? <Badge tone="amber">scheduled {formatDateTime(a.publishAt)}</Badge> : null}
                    </span>
                  </div>
                  {a.event && (
                    <span className="small">
                      📅 {formatDate(a.event.date)} {a.event.time ?? ''} {a.event.place ? `· ${a.event.place}` : ''}
                    </span>
                  )}
                  {a.body && <span className="muted small">{a.body.slice(0, 180)}</span>}
                  <div className="row between small muted">
                    <span>
                      {a.audience.kind === 'classes' ? a.audience.classNames.join(', ') : audienceLabel[a.audience.kind]} · {a.createdBy} ·{' '}
                      {formatDateTime(a.publishAt)}
                    </span>
                    <span>
                      <Button variant="ghost" onClick={() => setEditing(a)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => confirm('Delete this notice?') && remove(a.id)}>
                        Delete
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Event calendar">
          {!events.length ? (
            <Empty>No events.</Empty>
          ) : (
            <ul className="list">
              {events.map((e) => (
                <li key={e.id} className="row between">
                  <span>
                    <strong>{formatDate(e.event!.date)}</strong> {e.event!.time ?? ''}
                  </span>
                  <span>{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {editing && <AnnouncementForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
