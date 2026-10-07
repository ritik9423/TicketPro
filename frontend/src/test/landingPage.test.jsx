import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

describe('LandingPage render test', () => {
  it('renders LandingPage without crashing', async () => {
    let container;
    await act(async () => {
      const rendered = render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );
      container = rendered.container;
    });
    expect(container).toBeDefined();
    expect(container.textContent).toContain('TicketPro');
  });
});
