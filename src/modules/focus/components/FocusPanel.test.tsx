import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {FocusPanel} from './FocusPanel';

describe('FocusPanel', () => {
  it('renders running task title and stops through callback', () => {
    const onStop = vi.fn();

    render(
      <FocusPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2', secondary: '#fda4af'}}
        runningSession={{
          id: 1,
          taskId: 2,
          userId: 1,
          startedAt: '',
          status: 'RUNNING',
          createdAt: '',
          taskTitle: '写周报',
        }}
        focusTimeElapsed={3661}
        formattedElapsed="01:01:01"
        progressOffset={320}
        handleStopSession={onStop}
      />,
    );

    expect(screen.getByText(/写周报/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: /停止并记录专注时长/i}));

    expect(onStop).toHaveBeenCalledOnce();
  });
});
