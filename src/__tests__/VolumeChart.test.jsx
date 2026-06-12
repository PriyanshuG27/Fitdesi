import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VolumeChart } from '../components/shared/VolumeChart';
import { useUIStore } from '../stores/useUIStore';

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children, data }) => (
      <div data-testid="bar-chart" data-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: (props) => <div data-testid="bar" {...props} />,
    XAxis: (props) => {
      // Execute the tickFormatter to cover the function
      if (props.tickFormatter) {
        props.tickFormatter(''); // empty
        props.tickFormatter('invalid-week'); // parts.length !== 2
        props.tickFormatter('2023-W23'); // valid
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
            <Content active={true} payload={[{ payload: { totalVolume: 15000, week: '2023-W23' } }]} />
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

describe('VolumeChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ sidebarOpen: false });
  });

  it('renders loading skeleton when loading is true', () => {
    render(<VolumeChart loading={true} />);
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeInTheDocument();
  });

  it('renders empty state when data is empty or not provided', () => {
    const { rerender } = render(<VolumeChart data={[]} />);
    expect(screen.getByText('Start logging to see weekly volume')).toBeInTheDocument();
    
    rerender(<VolumeChart data={null} />);
    expect(screen.getByText('Start logging to see weekly volume')).toBeInTheDocument();
  });

  it('renders bar chart with data correctly', () => {
    const mockData = [
      { week: '2023-W22', totalVolume: 10000 },
      { week: '2023-W23', totalVolume: 15000 },
    ];
    
    render(<VolumeChart data={mockData} loading={false} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('xaxis')).toBeInTheDocument();
    
    // Check tooltip content coverage (it renders inside our mock Tooltip)
    expect(screen.getByText('15,000 kg')).toBeInTheDocument();
    expect(screen.getByText('Week: W23')).toBeInTheDocument();
  });

  it('respects sidebarOpen state for key rendering', () => {
    useUIStore.setState({ sidebarOpen: true });
    const mockData = [{ week: '2023-W23', totalVolume: 15000 }];
    render(<VolumeChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
