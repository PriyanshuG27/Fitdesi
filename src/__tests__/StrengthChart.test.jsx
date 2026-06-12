import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrengthChart } from '../components/shared/StrengthChart';
import { useUIStore } from '../stores/useUIStore';

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: ({ children, data }) => (
      <div data-testid="area-chart" data-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Area: (props) => <div data-testid="area" {...props} />,
    XAxis: (props) => {
      // Execute the tickFormatter to cover the function
      if (props.tickFormatter) {
        props.tickFormatter(''); // empty
        props.tickFormatter('invalid-date'); // parts.length !== 3
        props.tickFormatter('invalid-date-format'); // parts.length === 3 but invalid
        props.tickFormatter('2023-04-15'); // valid
      }
      return <div data-testid="xaxis" />;
    },
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: (props) => {
      // Render the custom tooltip directly to cover the CustomTooltip component
      if (props.content) {
        const Content = props.content.type;
        return (
          <div data-testid="tooltip">
            {/* Active with payload */}
            <Content active={true} payload={[{ payload: { maxWeight: 100, maxReps: 5, date: '2023-04-15' } }]} />
            {/* Inactive or empty payload */}
            <Content active={false} payload={[]} />
            <Content active={true} payload={[]} />
            <Content active={true} />
          </div>
        );
      }
      return <div />;
    },
  };
});

describe('StrengthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ sidebarOpen: false });
  });

  it('renders loading skeleton when loading is true', () => {
    render(<StrengthChart loading={true} />);
    // Skeleton has a specific animate-pulse container but no direct text.
    // We can check if it renders the skeleton divs.
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeInTheDocument();
  });

  it('renders empty state when data is empty or not provided', () => {
    const { rerender } = render(<StrengthChart data={[]} exerciseName="Bench Press" />);
    expect(screen.getByText('Log Bench Press to see strength progress')).toBeInTheDocument();
    
    rerender(<StrengthChart data={null} />);
    expect(screen.getByText('Log exercises to see strength progress')).toBeInTheDocument();
  });

  it('renders area chart with data correctly', () => {
    const mockData = [
      { date: '2023-04-10', maxWeight: 90, maxReps: 5 },
      { date: '2023-04-15', maxWeight: 100, maxReps: 5 },
    ];
    
    render(<StrengthChart data={mockData} exerciseName="Bench Press" loading={false} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('xaxis')).toBeInTheDocument();
    
    // Check tooltip content coverage (it renders inside our mock Tooltip)
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('5 reps')).toBeInTheDocument();
    expect(screen.getByText('on 15 Apr')).toBeInTheDocument();
  });

  it('respects sidebarOpen state for key rendering', () => {
    useUIStore.setState({ sidebarOpen: true });
    const mockData = [{ date: '2023-04-10', maxWeight: 90, maxReps: 5 }];
    render(<StrengthChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
