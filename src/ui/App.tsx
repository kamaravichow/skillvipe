import { useCallback, useState } from 'react';
import { Box, useApp, useWindowSize } from 'ink';
import { scanInventory } from '../core/inventory.js';
import { BrowseView } from './BrowseView.js';
import { CleanupView } from './CleanupView.js';
import { StatusLine, type Status } from './Footer.js';
import { Header } from './Header.js';
import { HelpView } from './HelpView.js';

type View = 'browse' | 'cleanup' | 'help';

/** Rows used by everything except the list: header, tabs, filters, borders, detail, status, hints. */
const CHROME_ROWS = 13;

export function App({ cwd }: { cwd: string }) {
  const { exit } = useApp();
  const { rows } = useWindowSize();
  const [inventory, setInventory] = useState(() => scanInventory(cwd));
  const [view, setView] = useState<View>('browse');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(() =>
    inventory.errors.length
      ? { tone: 'error', text: `Could not read: ${inventory.errors.join(' | ')}` }
      : { tone: 'info', text: 'Press ? for help. Changes apply the next time each agent starts.' },
  );

  const rescan = useCallback(() => setInventory(scanInventory(cwd)), [cwd]);

  const run = useCallback(
    (task: () => Promise<Status>) => {
      setBusy(true);
      setStatus({ tone: 'info', text: 'Working…' });
      task()
        .then(setStatus)
        .catch((error: unknown) => setStatus({ tone: 'error', text: String(error) }))
        .finally(() => {
          rescan();
          setBusy(false);
        });
    },
    [rescan],
  );

  const listHeight = Math.max(3, rows - CHROME_ROWS);

  return (
    <Box flexDirection="column" height={rows}>
      <Header items={inventory.items} />
      {view === 'help' && <HelpView onClose={() => setView('browse')} />}
      {view === 'cleanup' && (
        <CleanupView
          items={inventory.items}
          listHeight={listHeight}
          onStatus={setStatus}
          onChanged={rescan}
          onBack={() => setView('browse')}
        />
      )}
      {view === 'browse' && (
        <BrowseView
          harnesses={inventory.harnesses}
          items={inventory.items}
          listHeight={listHeight}
          busy={busy}
          onStatus={setStatus}
          onRun={run}
          onOpenCleanup={() => setView('cleanup')}
          onOpenHelp={() => setView('help')}
          onRescan={() => {
            rescan();
            setStatus({ tone: 'info', text: 'Rescanned.' });
          }}
          onQuit={exit}
        />
      )}
      <StatusLine status={status} />
    </Box>
  );
}
