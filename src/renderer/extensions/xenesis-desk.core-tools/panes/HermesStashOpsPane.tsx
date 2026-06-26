import React, { useState } from 'react';
import { sendXenesisBotCommand } from '../../../utils/xenesisContextSend';

interface StashCommand {
  label: string;
  command: string;
  detail: string;
  kind: 'read' | 'repair' | 'action';
}

const STASH_COMMANDS: StashCommand[] = [
  {
    label: 'Refresh Health',
    command: '/xd stash health',
    detail: 'Summarize all stash schedules and repair needs.',
    kind: 'read',
  },
  {
    label: 'Schedules',
    command: '/xd stash schedules',
    detail: 'List tracked schedules with live cron state.',
    kind: 'read',
  },
  {
    label: 'Repair',
    command: '/xd stash repair apply',
    detail: 'Recreate missing jobs/scripts and remove orphan cron jobs.',
    kind: 'repair',
  },
  {
    label: 'Trigger',
    command: '/xd stash trigger #1',
    detail: 'Run the first schedule now.',
    kind: 'action',
  },
  {
    label: 'Pause',
    command: '/xd stash pause #1',
    detail: 'Pause the first schedule.',
    kind: 'action',
  },
  {
    label: 'Resume',
    command: '/xd stash resume #1',
    detail: 'Resume the first schedule.',
    kind: 'action',
  },
];

function dispatchBotCommand(text: string) {
  sendXenesisBotCommand(text, {
    sessionId: 'xenesis-bot',
    source: 'hermes-stash-ops',
  });
}

export function HermesStashOpsPane() {
  const [notice, setNotice] = useState('');

  function runCommand(command: string) {
    dispatchBotCommand(command);
    setNotice(`Sent: ${command}`);
  }

  function openBot() {
    dispatchBotCommand('/xd stash health');
    setNotice('Opened Hermes Bot with stash health.');
  }

  return (
    <div className="xd-stash-ops">
      <header className="xd-stash-ops-head">
        <div>
          <h2>Hermes Stash Operations</h2>
          <p>Schedule health, repair, and manual controls through Hermes Bot.</p>
        </div>
        <button type="button" onClick={openBot}>
          Open Hermes Bot
        </button>
      </header>

      {notice && <div className="xd-stash-notice">{notice}</div>}

      <section className="xd-stash-command-grid" aria-label="Hermes stash commands">
        {STASH_COMMANDS.map((item) => (
          <article key={item.label} className={`xd-stash-command-card is-${item.kind}`}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
              <code>{item.command}</code>
            </div>
            <button type="button" onClick={() => runCommand(item.command)}>
              {item.label}
            </button>
          </article>
        ))}
      </section>

      <section className="xd-stash-ops-foot">
        <div>
          <strong>Templates</strong>
          <code>/xd stash template list</code>
        </div>
        <div>
          <strong>Delivery Presets</strong>
          <code>/xd stash preset list</code>
        </div>
        <div>
          <strong>Retention</strong>
          <code>/xd stash retention run-days=30 failed-days=90</code>
        </div>
      </section>
    </div>
  );
}
