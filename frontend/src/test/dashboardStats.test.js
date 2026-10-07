/**
 * Unit tests for Dashboard stats computation utilities
 * These test the pure business logic of ticket filtering by status and priority
 */
import { describe, it, expect } from 'vitest';

// Pure helper functions � same logic used in Dashboard.jsx
const computeStats = (ticketList) => {
  const total = ticketList.length;
  const open = ticketList.filter(t => t.status === 'OPEN' || t.status === 'NEW').length;
  const inProgress = ticketList.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = ticketList.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const high = ticketList.filter(t => ['HIGH', 'CRITICAL', 'URGENT'].includes((t.priority || '').toUpperCase())).length;
  const medium = ticketList.filter(t => (t.priority || '').toUpperCase() === 'MEDIUM').length;
  const low = ticketList.filter(t => ['LOW', ''].includes((t.priority || '').toUpperCase())).length;
  return { total, open, inProgress, resolved, high, medium, low };
};

const sampleTickets = [
  { id: 1, status: 'OPEN',        priority: 'HIGH',   createdAt: '2026-01-10T10:00:00Z' },
  { id: 2, status: 'OPEN',        priority: 'LOW',    createdAt: '2026-01-11T10:00:00Z' },
  { id: 3, status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: '2026-01-12T10:00:00Z' },
  { id: 4, status: 'RESOLVED',    priority: 'CRITICAL', createdAt: '2026-01-13T10:00:00Z' },
  { id: 5, status: 'NEW',         priority: 'URGENT', createdAt: '2026-01-14T10:00:00Z' },
  { id: 6, status: 'CLOSED',      priority: 'medium', createdAt: '2026-01-15T10:00:00Z' },
];

describe('Dashboard � ticket stats computation', () => {
  it('counts total tickets correctly', () => {
    const stats = computeStats(sampleTickets);
    expect(stats.total).toBe(6);
  });

  it('counts OPEN and NEW tickets as open', () => {
    const stats = computeStats(sampleTickets);
    // ticket 1 (OPEN) + ticket 2 (OPEN) + ticket 5 (NEW) = 3
    expect(stats.open).toBe(3);
  });

  it('counts IN_PROGRESS tickets', () => {
    const stats = computeStats(sampleTickets);
    expect(stats.inProgress).toBe(1);
  });

  it('counts RESOLVED and CLOSED tickets as resolved', () => {
    const stats = computeStats(sampleTickets);
    // ticket 4 (RESOLVED) + ticket 6 (CLOSED) = 2
    expect(stats.resolved).toBe(2);
  });

  it('counts HIGH, CRITICAL, URGENT as high priority (case-insensitive)', () => {
    const stats = computeStats(sampleTickets);
    // ticket 1 (HIGH) + ticket 4 (CRITICAL) + ticket 5 (URGENT) = 3
    expect(stats.high).toBe(3);
  });

  it('counts MEDIUM case-insensitively', () => {
    const stats = computeStats(sampleTickets);
    // ticket 3 (MEDIUM) + ticket 6 (medium lowercase) = 2
    expect(stats.medium).toBe(2);
  });

  it('handles empty ticket list gracefully', () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.open).toBe(0);
    expect(stats.resolved).toBe(0);
  });

  it('handles tickets with missing priority field', () => {
    const tickets = [{ id: 99, status: 'OPEN', createdAt: '2026-01-01T00:00:00Z' }];
    const stats = computeStats(tickets);
    // Missing priority = empty string = low
    expect(stats.low).toBe(1);
    expect(stats.total).toBe(1);
  });
});
