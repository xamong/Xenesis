import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditContextMenu } from './EditContextMenu';
import { createDefaultEditCommandState, type EditableSurfaceAdapter, resolveEditShortcut } from './editCommandModel';
import { editCommandRegistry } from './editCommandRegistry';

interface UseEditableSurfaceOptions {
  adapter: EditableSurfaceAdapter | null;
  includeSave?: boolean;
}

export function useEditableSurface({ adapter, includeSave = true }: UseEditableSurfaceOptions) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!adapter) return undefined;
    return editCommandRegistry.register(adapter);
  }, [adapter]);

  const activate = useCallback(() => {
    if (adapter) editCommandRegistry.activate(adapter.id);
  }, [adapter]);

  const runCommand = useCallback(async (command: Parameters<typeof editCommandRegistry.run>[0]) => {
    await editCommandRegistry.run(command);
    setMenu(null);
  }, []);

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!adapter) return;
      event.preventDefault();
      event.stopPropagation();
      editCommandRegistry.activate(adapter.id);
      setMenu({ x: event.clientX, y: event.clientY });
    },
    [adapter],
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const command = resolveEditShortcut(event.nativeEvent);
    if (!command) return;
    if (!editCommandRegistry.getState()[command]) return;
    event.preventDefault();
    void editCommandRegistry.run(command);
  }, []);

  const menuElement = useMemo(() => {
    if (!menu || !adapter) return null;
    return (
      <EditContextMenu
        x={menu.x}
        y={menu.y}
        state={adapter.getState() ?? createDefaultEditCommandState()}
        includeSave={includeSave}
        onRun={runCommand}
        onClose={() => setMenu(null)}
      />
    );
  }, [adapter, includeSave, menu, runCommand]);

  return {
    activate,
    onFocusCapture: activate,
    onPointerDownCapture: activate,
    onContextMenu,
    onKeyDown,
    menuElement,
  };
}
