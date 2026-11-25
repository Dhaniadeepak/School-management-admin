import { useEffect, useState, type FormEvent } from 'react';
import { useAddHolidayMutation, useAuditLogQuery, useDeleteHolidayMutation, useSettingsQuery, useUpdateSettingsMutation } from '../api/adminApi';
import { Alert, Button, Card, Empty, Field, PageHeader, Spinner, Tabs } from '../components/ui';
import { DAY_NAMES, errorMessage, formatDate, formatDateTime } from '../lib/utils';
import type { Period, SchoolSettings } from '../types';

function GeneralTab({ data }: { data: SchoolSettings }) {
  const [save, state] = useUpdateSettingsMutation();
  const [name, setName] = useState(data.name);
  const [address, setAddress] = useState(data.address);
  const [phone, setPhone] = useState(data.phone);
  const [s, setS] = useState(data.settings);
  const [periods, setPeriods] = useState<Period[]>(data.settings.periods);
  const [leaveTypes, setLeaveTypes] = useState(data.settings.leaveTypes.join(', '));

  useEffect(() => {
    setS(data.settings);
    setPeriods(data.settings.periods);
  }, [data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save({
      name,
      address,
      phone,
      settings: {
        workingDays: s.workingDays,
        periods: periods.map((p, i) => ({ ...p, number: i + 1 })),
        attendanceEditWindowHours: s.attendanceEditWindowHours,
        leaveTypes: leaveTypes.split(',').map((x) => x.trim()).filter(Boolean),
        allowInstallments: s.allowInstallments,
        academicYear: s.academicYear,
      },
    })
      .unwrap()
      .catch(() => null);
  };

  return (
    <form className="stack" onSubmit={submit}>
      <Card title="School">
        <div className="form-grid">
          <Field label="School name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="School code" hint="Teachers enter this when they register">
            <input value={data.code} readOnly />
          </Field>
        </div>
        <Field label="Address (printed on receipts)">
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </Card>

      <Card title="Week and periods">
        <Field label="Working days">
          <div className="row">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <label key={d} className="check">
                <input
                  type="checkbox"
                  checked={s.workingDays.includes(d)}
                  onChange={(e) =>
                    setS({ ...s, workingDays: e.target.checked ? [...s.workingDays, d].sort() : s.workingDays.filter((x) => x !== d) })
                  }
                />
                {DAY_NAMES[d]}
              </label>
            ))}
          </div>
        </Field>
        <h3 style={{ marginTop: '1rem' }}>Periods</h3>
        {periods.map((p, i) => (
          <div className="row" key={i}>
            <strong style={{ width: '2rem' }}>{i + 1}</strong>
            <input type="time" value={p.start} onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} required />
            <span>to</span>
            <input type="time" value={p.end} onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} required />
            <Button type="button" variant="ghost" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPeriods([...periods, { number: periods.length + 1, start: periods.at(-1)?.end ?? '08:00', end: '' }])}
        >
          + Add period
        </Button>
        <p className="muted small">Changing periods does not move existing timetable entries; check the timetable afterwards.</p>
      </Card>

      <Card title="Rules">
        <div className="form-grid">
          <Field label="Academic year" hint="e.g. 2026-27">
            <input value={s.academicYear} onChange={(e) => setS({ ...s, academicYear: e.target.value })} pattern="\d{4}-\d{2}" required />
          </Field>
          <Field label="Teachers can edit attendance for (hours)" hint="After this only the office can correct it">
            <input
              type="number"
              min={1}
              max={168}
              value={s.attendanceEditWindowHours}
              onChange={(e) => setS({ ...s, attendanceEditWindowHours: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Leave types" hint="Comma separated">
          <input value={leaveTypes} onChange={(e) => setLeaveTypes(e.target.value)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={s.allowInstallments} onChange={(e) => setS({ ...s, allowInstallments: e.target.checked })} /> Allow parents to pay
          the yearly fee in two installments
        </label>
      </Card>

      <Alert>{errorMessage(state.error)}</Alert>
      {state.isSuccess && <Alert kind="success">Settings saved.</Alert>}
      <div>
        <Button loading={state.isLoading}>Save settings</Button>
      </div>
    </form>
  );
}

function HolidaysTab({ data }: { data: SchoolSettings }) {
  const [add, addState] = useAddHolidayMutation();
  const [remove] = useDeleteHolidayMutation();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await add({ date, name }).unwrap().catch(() => null);
    if (ok !== null) {
      setDate('');
      setName('');
    }
  };

  return (
    <Card title="School holidays" actions={null}>
      <form className="row" onSubmit={submit}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input placeholder="Holiday name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button loading={addState.isLoading}>Add</Button>
      </form>
      <Alert>{errorMessage(addState.error)}</Alert>
      <p className="muted small">Holidays appear on the parents' attendance calendar and teachers see no periods that day.</p>
      {!data.holidays.length ? (
        <Empty>No holidays added.</Empty>
      ) : (
        <ul className="list">
          {data.holidays.map((h) => (
            <li key={h.date} className="row between">
              <span>
                <strong>{formatDate(h.date)}</strong> {h.name}
              </span>
              <Button variant="ghost" onClick={() => remove(h.date)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AuditTab() {
  const { data, isLoading, error } = useAuditLogQuery();
  return (
    <Card title="Change log" actions={<span className="muted small">Attendance corrections and fee changes</span>}>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : !data?.length ? (
        <Empty>No changes recorded yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Before → after</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap small">{formatDateTime(a.at)}</td>
                  <td>{a.user}</td>
                  <td>{a.action}</td>
                  <td className="small muted">
                    <code>{JSON.stringify(a.oldValue)?.slice(0, 120)}</code> → <code>{JSON.stringify(a.newValue)?.slice(0, 120)}</code>
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

export default function SettingsPage() {
  const { data, isLoading, error } = useSettingsQuery();
  const [tab, setTab] = useState<'general' | 'holidays' | 'audit'>('general');
  if (isLoading) return <Spinner />;
  if (!data) return <Alert>{errorMessage(error)}</Alert>;
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'general', label: 'School & rules' },
          { value: 'holidays', label: 'Holidays' },
          { value: 'audit', label: 'Change log' },
        ]}
      />
      {tab === 'general' && <GeneralTab data={data} />}
      {tab === 'holidays' && <HolidaysTab data={data} />}
      {tab === 'audit' && <AuditTab />}
    </>
  );
}
