import { memo, useEffect } from 'react';
import type { Notice } from '../state/actions';
import { useCommands, useNotices } from '../hooks/useBuilder';

const AUTO_DISMISS_MS = 5000;

const NoticeItem = memo(function NoticeItem({ notice }: { notice: Notice }) {
  const commands = useCommands();

  useEffect(() => {
    const timer = setTimeout(() => commands.dismissNotice(notice.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [commands, notice.id]);

  return (
    <div className="notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      <button type="button" aria-label="Dismiss" onClick={() => commands.dismissNotice(notice.id)}>
        ×
      </button>
    </div>
  );
});

export function Notices() {
  const notices = useNotices();
  return (
    <div className="notices" aria-live="polite">
      {notices.map((notice) => (
        <NoticeItem key={notice.id} notice={notice} />
      ))}
    </div>
  );
}
