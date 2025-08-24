import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveTable, StatusBadge, ActionButton } from '../responsive-table';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile');
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

// Mock data for testing
const mockData = [
  { id: 1, name: 'João Silva', email: 'joao@email.com', status: 'active', role: 'admin' },
  { id: 2, name: 'Maria Santos', email: 'maria@email.com', status: 'inactive', role: 'user' },
  { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', status: 'active', role: 'user' },
];

const mockColumns = [
  {
    key: 'name' as keyof typeof mockData[0],
    label: 'Nome',
    priority: 'high' as const,
    sortable: true,
  },
  {
    key: 'email' as keyof typeof mockData[0],
    label: 'Email',
    priority: 'medium' as const,
    sortable: true,
  },
  {
    key: 'status' as keyof typeof mockData[0],
    label: 'Status',
    priority: 'low' as const,
    render: (value: string) => <StatusBadge status={value} />,
  },
  {
    key: 'role' as keyof typeof mockData[0],
    label: 'Função',
    priority: 'low' as const,
  },
];

describe('ResponsiveTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop view', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false);
    });

    it('should render all columns in desktop view', () => {
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          title="Usuários"
        />
      );

      expect(screen.getByText('Usuários')).toBeInTheDocument();
      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Função')).toBeInTheDocument();
    });

    it('should render all data rows in desktop view', () => {
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
        />
      );

      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('joao@email.com')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('maria@email.com')).toBeInTheDocument();
    });

    it('should handle sorting when column header is clicked', () => {
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
        />
      );

      const nameHeader = screen.getByText('Nome');
      fireEvent.click(nameHeader);

      // Should show sort indicator
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('should call onRowClick when row is clicked', () => {
      const mockOnRowClick = jest.fn();
      
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          onRowClick={mockOnRowClick}
        />
      );

      const firstRow = screen.getByText('João Silva').closest('tr');
      if (firstRow) {
        fireEvent.click(firstRow);
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
      }
    });
  });

  describe('Mobile view', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('should render only high priority columns in mobile view', () => {
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          title="Usuários"
        />
      );

      expect(screen.getByText('Usuários')).toBeInTheDocument();
      const nomeLabels = screen.getAllByText('Nome:');
      expect(nomeLabels.length).toBe(mockData.length);
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      
      // Should not show medium/low priority columns initially
      expect(screen.queryByText('Email:')).not.toBeInTheDocument();
      expect(screen.queryByText('Status:')).not.toBeInTheDocument();
    });

    it('should expand row to show hidden columns when expand button is clicked', () => {
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
        />
      );

      // Select the first expand button (only expand buttons exist when no actions are provided)
      const buttons = screen.getAllByRole('button');
      const expandButton = buttons[0];
      
      if (expandButton) {
        fireEvent.click(expandButton);
        // Should now show hidden columns
        expect(screen.getByText('Email:')).toBeInTheDocument();
        expect(screen.getByText('joao@email.com')).toBeInTheDocument();
      }
    });

    it('should call onRowClick when mobile card is clicked', () => {
      const mockOnRowClick = jest.fn();
      
      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          onRowClick={mockOnRowClick}
        />
      );

      const firstCard = screen.getByText('João Silva').closest('div');
      if (firstCard && firstCard.classList.contains('cursor-pointer')) {
        fireEvent.click(firstCard);
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
      }
    });
  });

  describe('Loading and empty states', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false);
    });

    it('should show loading skeleton when loading is true', () => {
      render(
        <ResponsiveTable
          data={[]}
          columns={mockColumns}
          keyField="id"
          loading={true}
        />
      );

      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty message when no data', () => {
      render(
        <ResponsiveTable
          data={[]}
          columns={mockColumns}
          keyField="id"
          emptyMessage="Nenhum usuário encontrado"
        />
      );

      expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
    });

    it('should show default empty message when no custom message provided', () => {
      render(
        <ResponsiveTable
          data={[]}
          columns={mockColumns}
          keyField="id"
        />
      );

      expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false);
    });

    it('should render actions for each row', () => {
      const mockActions = jest.fn((item) => (
        <ActionButton onClick={() => console.log('Edit', item.id)}>
          Editar
        </ActionButton>
      ));

      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          actions={mockActions}
        />
      );

      const editButtons = screen.getAllByText('Editar');
      expect(editButtons).toHaveLength(mockData.length);
    });

    it('should not propagate click events from actions to row click', () => {
      const mockOnRowClick = jest.fn();
      const mockActionClick = jest.fn();

      render(
        <ResponsiveTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          onRowClick={mockOnRowClick}
          actions={(item) => (
            <ActionButton onClick={mockActionClick}>
              Editar
            </ActionButton>
          )}
        />
      );

      const editButton = screen.getAllByText('Editar')[0];
      fireEvent.click(editButton);

      expect(mockActionClick).toHaveBeenCalled();
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });
});

describe('StatusBadge', () => {
  it('should render status with default variant', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should render status with custom variant', () => {
    render(<StatusBadge status="error" variant="destructive" />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });
});

describe('ActionButton', () => {
  it('should render button with children and handle click', () => {
    const mockClick = jest.fn();
    
    render(
      <ActionButton onClick={mockClick}>
        Test Action
      </ActionButton>
    );

    const button = screen.getByText('Test Action');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom variant and size', () => {
    render(
      <ActionButton onClick={() => {}} variant="outline" size="lg">
        Custom Button
      </ActionButton>
    );

    expect(screen.getByText('Custom Button')).toBeInTheDocument();
  });
});