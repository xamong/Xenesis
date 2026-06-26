import React from 'react';
import { type DemoScene, getSceneActions } from '../demoLabPreset';
import { type DemoLabPlaybackSnapshot, getDemoLabSceneActionCount } from '../useDemoLabPlayback';

type TimelineDragState =
  | { type: 'scene'; sceneIndex: number }
  | { type: 'action'; sceneIndex: number; actionIndex: number };

type TimelineDropPosition = 'before' | 'after' | 'end';

type TimelineDropTarget =
  | { type: 'scene'; sceneIndex: number; position: Exclude<TimelineDropPosition, 'end'> }
  | { type: 'action'; sceneIndex: number; actionIndex: number; position: Exclude<TimelineDropPosition, 'end'> }
  | { type: 'action-list'; sceneIndex: number; position: 'end' };

function getTimelineDropPosition(
  event: React.DragEvent<HTMLElement>,
  element: HTMLElement,
  axis: 'horizontal' | 'vertical',
): Exclude<TimelineDropPosition, 'end'> {
  const rect = element.getBoundingClientRect();
  if (axis === 'horizontal') {
    return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
  }
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function getTimelineDropClass(position?: TimelineDropPosition): string {
  if (position === 'before') return ' is-drag-over is-drop-before';
  if (position === 'after') return ' is-drag-over is-drop-after';
  if (position === 'end') return ' is-drag-over is-drop-end';
  return '';
}

export interface DemoLabTimelinePanelProps {
  scenes: DemoScene[];
  playbackSnapshot: DemoLabPlaybackSnapshot;
  seekSceneAction: (sceneIndex: number, actionIndex?: number) => void;
  onUpdateActionDuration?: (sceneIndex: number, actionIndex: number, duration: number) => void;
  onDuplicateScene?: (sceneIndex: number) => void;
  onDeleteScene?: (sceneIndex: number) => void;
  onDuplicateAction?: (sceneIndex: number, actionIndex: number) => void;
  onDeleteAction?: (sceneIndex: number, actionIndex: number) => void;
  onMoveScene?: (fromSceneIndex: number, toSceneIndex: number) => void;
  onMoveAction?: (fromSceneIndex: number, fromActionIndex: number, toSceneIndex: number, toActionIndex: number) => void;
}

export function DemoLabTimelinePanel({
  scenes,
  playbackSnapshot,
  seekSceneAction,
  onUpdateActionDuration,
  onDuplicateScene,
  onDeleteScene,
  onDuplicateAction,
  onDeleteAction,
  onMoveScene,
  onMoveAction,
}: DemoLabTimelinePanelProps) {
  const progressPercent = Math.round(playbackSnapshot.progress * 100);
  const [dragState, setDragState] = React.useState<TimelineDragState | null>(null);
  const [dropTarget, setDropTarget] = React.useState<TimelineDropTarget | null>(null);

  const allowTimelineDrop = (event: React.DragEvent<HTMLElement>): boolean => {
    if (!dragState) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return true;
  };

  const clearTimelineDrag = () => {
    setDragState(null);
    setDropTarget(null);
  };

  const beginSceneDrag = (event: React.DragEvent<HTMLElement>, sceneIndex: number) => {
    setDragState({ type: 'scene', sceneIndex });
    setDropTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `scene:${sceneIndex}`);
  };

  const beginActionDrag = (event: React.DragEvent<HTMLElement>, sceneIndex: number, actionIndex: number) => {
    event.stopPropagation();
    setDragState({ type: 'action', sceneIndex, actionIndex });
    setDropTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `action:${sceneIndex}:${actionIndex}`);
  };

  const updateSceneDropTarget = (event: React.DragEvent<HTMLElement>, sceneIndex: number) => {
    if (!allowTimelineDrop(event)) return;
    if (dragState?.type === 'scene') {
      setDropTarget({
        type: 'scene',
        sceneIndex,
        position: getTimelineDropPosition(event, event.currentTarget, 'vertical'),
      });
      return;
    }
    setDropTarget({ type: 'action-list', sceneIndex, position: 'end' });
  };

  const updateActionDropTarget = (event: React.DragEvent<HTMLElement>, sceneIndex: number, actionIndex: number) => {
    if (dragState?.type !== 'action') return;
    event.stopPropagation();
    if (!allowTimelineDrop(event)) return;
    setDropTarget({
      type: 'action',
      sceneIndex,
      actionIndex,
      position: getTimelineDropPosition(event, event.currentTarget, 'horizontal'),
    });
  };

  const dropOnScene = (event: React.DragEvent<HTMLElement>, sceneIndex: number, actionCount: number) => {
    if (!dragState) return;
    event.preventDefault();
    if (dragState.type === 'scene') {
      const targetPosition =
        dropTarget?.type === 'scene' && dropTarget.sceneIndex === sceneIndex
          ? dropTarget.position
          : getTimelineDropPosition(event, event.currentTarget, 'vertical');
      onMoveScene?.(dragState.sceneIndex, targetPosition === 'after' ? sceneIndex + 1 : sceneIndex);
    } else {
      onMoveAction?.(dragState.sceneIndex, dragState.actionIndex, sceneIndex, actionCount);
    }
    clearTimelineDrag();
  };

  const dropOnAction = (event: React.DragEvent<HTMLElement>, sceneIndex: number, actionIndex: number) => {
    if (dragState?.type !== 'action') return;
    event.preventDefault();
    event.stopPropagation();
    const targetPosition =
      dropTarget?.type === 'action' && dropTarget.sceneIndex === sceneIndex && dropTarget.actionIndex === actionIndex
        ? dropTarget.position
        : getTimelineDropPosition(event, event.currentTarget, 'horizontal');
    onMoveAction?.(
      dragState.sceneIndex,
      dragState.actionIndex,
      sceneIndex,
      targetPosition === 'after' ? actionIndex + 1 : actionIndex,
    );
    clearTimelineDrag();
  };

  const handleSceneKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, sceneIndex: number) => {
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (sceneIndex > 0) onMoveScene?.(sceneIndex, sceneIndex - 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (sceneIndex < scenes.length - 1) onMoveScene?.(sceneIndex, sceneIndex + 2);
    }
  };

  const handleActionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    sceneIndex: number,
    actionIndex: number,
    actionCount: number,
  ) => {
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (actionIndex > 0) onMoveAction?.(sceneIndex, actionIndex, sceneIndex, actionIndex - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (actionIndex < actionCount - 1) onMoveAction?.(sceneIndex, actionIndex, sceneIndex, actionIndex + 2);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (sceneIndex > 0 && actionCount > 1) {
        onMoveAction?.(sceneIndex, actionIndex, sceneIndex - 1, getSceneActions(scenes[sceneIndex - 1]).length);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (sceneIndex < scenes.length - 1 && actionCount > 1) {
        onMoveAction?.(sceneIndex, actionIndex, sceneIndex + 1, getSceneActions(scenes[sceneIndex + 1]).length);
      }
    }
  };

  return (
    <aside className="wfr-demo-player__scenes wfr-demo-timeline" aria-label="Demo scene timeline">
      <div className="wfr-demo-timeline__head">
        <strong>Timeline</strong>
        <span>
          {playbackSnapshot.sceneCount} scene(s) / {playbackSnapshot.actionCount} action(s)
        </span>
      </div>
      <div className="wfr-demo-timeline__progress" aria-label={`Playback progress ${progressPercent}%`}>
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="wfr-demo-timeline__list">
        {scenes.map((scene, sceneIndex) => {
          const actions = getSceneActions(scene);
          const sceneIsActive = sceneIndex === playbackSnapshot.activeSceneIndex;
          const sceneIsDragging = dragState?.type === 'scene' && dragState.sceneIndex === sceneIndex;
          const sceneDropPosition =
            dropTarget?.type === 'scene' && dropTarget.sceneIndex === sceneIndex ? dropTarget.position : undefined;
          const actionListDropPosition =
            dropTarget?.type === 'action-list' && dropTarget.sceneIndex === sceneIndex
              ? dropTarget.position
              : undefined;

          return (
            <article
              key={scene.id}
              className={`wfr-demo-timeline__card${sceneIsActive ? ' is-active' : ''}${sceneIsDragging ? ' is-dragging' : ''}${getTimelineDropClass(sceneDropPosition)}`}
              data-drop-position={sceneDropPosition}
              onDragOver={(event) => updateSceneDropTarget(event, sceneIndex)}
              onDrop={(event) => dropOnScene(event, sceneIndex, actions.length)}
            >
              <button
                type="button"
                className="wfr-demo-timeline__scene"
                title={`${scene.title} (Ctrl+ArrowUp/Down to reorder scene)`}
                onClick={() => seekSceneAction(sceneIndex, 0)}
                onKeyDown={(event) => handleSceneKeyDown(event, sceneIndex)}
              >
                <span>{sceneIndex + 1}</span>
                <strong>{scene.title}</strong>
                <small>
                  {scene.action.toUpperCase()} / {getDemoLabSceneActionCount(scene)} action(s)
                </small>
                <em
                  className="wfr-demo-timeline__drag-handle"
                  draggable
                  onDragStart={(event) => beginSceneDrag(event, sceneIndex)}
                  onDragEnd={clearTimelineDrag}
                >
                  Drag scene
                </em>
              </button>
              <div className="wfr-demo-timeline__scene-tools" aria-label={`${scene.title} scene editing`}>
                <button
                  type="button"
                  className="wfr-demo-timeline__tool-button"
                  title="Move scene up"
                  aria-label="Move scene up"
                  onClick={() => onMoveScene?.(sceneIndex, sceneIndex - 1)}
                  disabled={sceneIndex <= 0}
                >
                  <span aria-hidden="true">^</span>
                </button>
                <button
                  type="button"
                  className="wfr-demo-timeline__tool-button"
                  title="Move scene down"
                  aria-label="Move scene down"
                  onClick={() => onMoveScene?.(sceneIndex, sceneIndex + 2)}
                  disabled={sceneIndex >= scenes.length - 1}
                >
                  <span aria-hidden="true">v</span>
                </button>
                <details className="wfr-demo-timeline__tool-menu">
                  <summary title="More scene actions" aria-label="More scene actions">
                    <span aria-hidden="true">...</span>
                  </summary>
                  <div className="wfr-demo-timeline__tool-menu-panel">
                    <button
                      type="button"
                      className="wfr-demo-timeline__tool-button"
                      title="Duplicate scene"
                      aria-label="Duplicate scene"
                      onClick={() => onDuplicateScene?.(sceneIndex)}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                    <button
                      type="button"
                      className="wfr-demo-timeline__tool-button"
                      title="Delete scene"
                      aria-label="Delete scene"
                      onClick={() => onDeleteScene?.(sceneIndex)}
                      disabled={scenes.length <= 1}
                    >
                      <span aria-hidden="true">x</span>
                    </button>
                  </div>
                </details>
              </div>

              <div
                className={`wfr-demo-timeline__actions${getTimelineDropClass(actionListDropPosition)}`}
                data-drop-position={actionListDropPosition}
                aria-label={`${scene.title} actions`}
                onDragOver={(event) => {
                  if (dragState?.type !== 'action') return;
                  event.stopPropagation();
                  if (!allowTimelineDrop(event)) return;
                  setDropTarget({ type: 'action-list', sceneIndex, position: 'end' });
                }}
                onDrop={(event) => {
                  if (dragState?.type !== 'action') return;
                  event.stopPropagation();
                  dropOnScene(event, sceneIndex, actions.length);
                }}
              >
                {actions.map((action, actionIndex) => {
                  const actionIsActive = sceneIsActive && actionIndex === playbackSnapshot.activeActionIndex;
                  const actionDuration =
                    action.duration ?? Math.max(80, Math.round(scene.duration / Math.max(actions.length, 1)));
                  const actionIsDragging =
                    dragState?.type === 'action' &&
                    dragState.sceneIndex === sceneIndex &&
                    dragState.actionIndex === actionIndex;
                  const actionDropPosition =
                    dropTarget?.type === 'action' &&
                    dropTarget.sceneIndex === sceneIndex &&
                    dropTarget.actionIndex === actionIndex
                      ? dropTarget.position
                      : undefined;
                  const actionValueLabel =
                    typeof action.value === 'object' ? JSON.stringify(action.value) : action.value;
                  return (
                    <div
                      key={`${scene.id}-${actionIndex}-${action.type}`}
                      className={`wfr-demo-timeline__action-row${actionIsDragging ? ' is-dragging' : ''}${getTimelineDropClass(actionDropPosition)}`}
                      data-drop-position={actionDropPosition}
                      onDragOver={(event) => updateActionDropTarget(event, sceneIndex, actionIndex)}
                      onDrop={(event) => dropOnAction(event, sceneIndex, actionIndex)}
                    >
                      <button
                        type="button"
                        className={`wfr-demo-timeline__action${actionIsActive ? ' is-active' : ''}`}
                        onClick={() => seekSceneAction(sceneIndex, actionIndex)}
                        onKeyDown={(event) => handleActionKeyDown(event, sceneIndex, actionIndex, actions.length)}
                        title={`${action.text ?? actionValueLabel ?? action.target ?? action.type} (Ctrl+Arrow keys to reorder action)`}
                      >
                        {action.type}
                      </button>
                      <span
                        className="wfr-demo-timeline__drag-handle"
                        draggable
                        onDragStart={(event) => beginActionDrag(event, sceneIndex, actionIndex)}
                        onDragEnd={clearTimelineDrag}
                      >
                        Drag action
                      </span>
                      <div className="wfr-demo-timeline__action-tools" aria-label={`${action.type} action editing`}>
                        <label className="wfr-demo-timeline__duration">
                          Action duration
                          <input
                            type="number"
                            min={80}
                            step={20}
                            value={actionDuration}
                            onChange={(event) => {
                              onUpdateActionDuration?.(
                                sceneIndex,
                                actionIndex,
                                Number(event.currentTarget.value) || 80,
                              );
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="wfr-demo-timeline__tool-button"
                          title="Move action left"
                          aria-label="Move action left"
                          onClick={() => onMoveAction?.(sceneIndex, actionIndex, sceneIndex, actionIndex - 1)}
                          disabled={actionIndex <= 0}
                        >
                          <span aria-hidden="true">&lt;</span>
                        </button>
                        <button
                          type="button"
                          className="wfr-demo-timeline__tool-button"
                          title="Move action right"
                          aria-label="Move action right"
                          onClick={() => onMoveAction?.(sceneIndex, actionIndex, sceneIndex, actionIndex + 2)}
                          disabled={actionIndex >= actions.length - 1}
                        >
                          <span aria-hidden="true">&gt;</span>
                        </button>
                        <details className="wfr-demo-timeline__tool-menu">
                          <summary title="More action tools" aria-label="More action tools">
                            <span aria-hidden="true">...</span>
                          </summary>
                          <div className="wfr-demo-timeline__tool-menu-panel">
                            <button
                              type="button"
                              className="wfr-demo-timeline__tool-button"
                              title="Move action to previous scene"
                              aria-label="Move action to previous scene"
                              onClick={() =>
                                onMoveAction?.(
                                  sceneIndex,
                                  actionIndex,
                                  sceneIndex - 1,
                                  getSceneActions(scenes[sceneIndex - 1]).length,
                                )
                              }
                              disabled={sceneIndex <= 0 || actions.length <= 1}
                            >
                              <span aria-hidden="true">|&lt;</span>
                            </button>
                            <button
                              type="button"
                              className="wfr-demo-timeline__tool-button"
                              title="Move action to next scene"
                              aria-label="Move action to next scene"
                              onClick={() =>
                                onMoveAction?.(
                                  sceneIndex,
                                  actionIndex,
                                  sceneIndex + 1,
                                  getSceneActions(scenes[sceneIndex + 1]).length,
                                )
                              }
                              disabled={sceneIndex >= scenes.length - 1 || actions.length <= 1}
                            >
                              <span aria-hidden="true">&gt;|</span>
                            </button>
                            <button
                              type="button"
                              className="wfr-demo-timeline__tool-button"
                              title="Duplicate action"
                              aria-label="Duplicate action"
                              onClick={() => onDuplicateAction?.(sceneIndex, actionIndex)}
                            >
                              <span aria-hidden="true">+</span>
                            </button>
                            <button
                              type="button"
                              className="wfr-demo-timeline__tool-button"
                              title="Delete action"
                              aria-label="Delete action"
                              onClick={() => onDeleteAction?.(sceneIndex, actionIndex)}
                              disabled={actions.length <= 1}
                            >
                              <span aria-hidden="true">x</span>
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
