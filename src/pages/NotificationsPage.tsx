import { useMarkAllReadMutation, useNotificationsQuery } from '../api/adminApi';
import { Alert, Button, Card, Empty, PageHeader, Spinner } from '../components/ui';
import { errorMessage, formatDateTime } from '../lib/utils';

export default function NotificationsPage() {
  const { data, isLoading, error } = useNotificationsQuery();
  const [markAll, state] = useMarkAllReadMutation();
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          data?.unreadCount ? (
            <Button variant="secondary" onClick={() => markAll()} loading={state.isLoading}>
              Mark all as read
            </Button>
          ) : null
        }
      />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : !data?.items.length ? (
          <Empty>No notifications.</Empty>
        ) : (
          <ul className="list">
            {data.items.map((n) => (
              <li key={n.id} style={{ fontWeight: n.read ? 400 : 600 }}>
                <div className="row between">
                  <span>{n.title}</span>
                  <span className="muted small">{formatDateTime(n.createdAt)}</span>
                </div>
                <div className="muted small">{n.body}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
