import React, { useRef, useState } from 'react';
import {
  WORKFLOW_OUTPUT_DEFAULT_HEIGHT,
  WORKFLOW_OUTPUT_MAX_HEIGHT,
  WORKFLOW_OUTPUT_MIN_HEIGHT,
  WORKFLOW_WORKSPACE_MIN_HEIGHT,
} from './workflowRunnerConstants';
import { clampNumber } from './workflowRunnerRuntimeUtils';

export function useWorkflowRunnerOutputResize() {
  const [outputHeight, setOutputHeight] = useState(WORKFLOW_OUTPUT_DEFAULT_HEIGHT);
  const mainRef = useRef<HTMLElement | null>(null);

  function startOutputResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = outputHeight;
    const mainHeight = mainRef.current?.getBoundingClientRect().height ?? 0;
    const maxHeight = Math.max(
      WORKFLOW_OUTPUT_MIN_HEIGHT,
      Math.min(WORKFLOW_OUTPUT_MAX_HEIGHT, mainHeight - WORKFLOW_WORKSPACE_MIN_HEIGHT),
    );

    function handlePointerMove(moveEvent: PointerEvent) {
      const deltaY = moveEvent.clientY - startY;
      setOutputHeight(clampNumber(startHeight - deltaY, WORKFLOW_OUTPUT_MIN_HEIGHT, maxHeight));
    }

    function cleanupResize() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', cleanupResize);
      window.removeEventListener('pointercancel', cleanupResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', cleanupResize, { once: true });
    window.addEventListener('pointercancel', cleanupResize, { once: true });
  }

  return {
    outputHeight,
    mainRef,
    startOutputResize,
  };
}
