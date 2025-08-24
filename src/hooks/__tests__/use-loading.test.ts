import { renderHook, act } from '@testing-library/react';
import { useLoading, useCrudLoading, useMultipleLoading } from '../use-loading';

describe('useLoading', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLoading());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should handle successful async operation', async () => {
    const { result } = renderHook(() => useLoading());
    
    const mockAsyncFn = jest.fn().mockResolvedValue('success data');
    
    await act(async () => {
      const data = await result.current.execute(mockAsyncFn);
      expect(data).toBe('success data');
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('success data');
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should handle failed async operation', async () => {
    const { result } = renderHook(() => useLoading());
    
    const mockError = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError);
    
    await act(async () => {
      try {
        await result.current.execute(mockAsyncFn);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeNull();
  });

  it('should set loading state during execution', async () => {
    const { result } = renderHook(() => useLoading());
    
    const mockAsyncFn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
    );
    
    act(() => {
      result.current.execute(mockAsyncFn);
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear error when clearError is called', async () => {
    const { result } = renderHook(() => useLoading());
    
    const mockError = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError);
    
    await act(async () => {
      try {
        await result.current.execute(mockAsyncFn);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.error).toBe(mockError);
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should reset all state when reset is called', async () => {
    const { result } = renderHook(() => useLoading());
    
    const mockAsyncFn = jest.fn().mockResolvedValue('test data');
    
    await act(async () => {
      await result.current.execute(mockAsyncFn);
    });
    
    expect(result.current.data).toBe('test data');
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });
});

describe('useCrudLoading', () => {
  it('should initialize with default CRUD states', () => {
    const { result } = renderHook(() => useCrudLoading());
    
    expect(result.current.creating).toBe(false);
    expect(result.current.reading).toBe(false);
    expect(result.current.updating).toBe(false);
    expect(result.current.deleting).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle create operation', async () => {
    const { result } = renderHook(() => useCrudLoading());
    
    const mockCreateFn = jest.fn().mockResolvedValue('created');
    
    await act(async () => {
      await result.current.executeCreate(mockCreateFn);
    });
    
    expect(result.current.creating).toBe(false);
    expect(mockCreateFn).toHaveBeenCalledTimes(1);
  });

  it('should handle read operation', async () => {
    const { result } = renderHook(() => useCrudLoading());
    
    const mockReadFn = jest.fn().mockResolvedValue('read data');
    
    await act(async () => {
      await result.current.executeRead(mockReadFn);
    });
    
    expect(result.current.reading).toBe(false);
    expect(mockReadFn).toHaveBeenCalledTimes(1);
  });

  it('should handle update operation', async () => {
    const { result } = renderHook(() => useCrudLoading());
    
    const mockUpdateFn = jest.fn().mockResolvedValue('updated');
    
    await act(async () => {
      await result.current.executeUpdate(mockUpdateFn);
    });
    
    expect(result.current.updating).toBe(false);
    expect(mockUpdateFn).toHaveBeenCalledTimes(1);
  });

  it('should handle delete operation', async () => {
    const { result } = renderHook(() => useCrudLoading());
    
    const mockDeleteFn = jest.fn().mockResolvedValue('deleted');
    
    await act(async () => {
      await result.current.executeDelete(mockDeleteFn);
    });
    
    expect(result.current.deleting).toBe(false);
    expect(mockDeleteFn).toHaveBeenCalledTimes(1);
  });

  it('should set isLoading to true when any operation is running', async () => {
    const { result } = renderHook(() => useCrudLoading());
    
    const mockCreateFn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('created'), 100))
    );
    
    act(() => {
      result.current.executeCreate(mockCreateFn);
    });
    
    expect(result.current.creating).toBe(true);
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    expect(result.current.creating).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useMultipleLoading', () => {
  it('should initialize with empty loading states', () => {
    const { result } = renderHook(() => useMultipleLoading());
    
    expect(result.current.loadingStates).toEqual({});
    expect(result.current.isAnyLoading).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('should handle multiple operations with different keys', async () => {
    const { result } = renderHook(() => useMultipleLoading());
    
    const mockFn1 = jest.fn().mockResolvedValue('result1');
    const mockFn2 = jest.fn().mockResolvedValue('result2');
    
    await act(async () => {
      await Promise.all([
        result.current.execute('operation1', mockFn1),
        result.current.execute('operation2', mockFn2)
      ]);
    });
    
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    expect(result.current.isAnyLoading).toBe(false);
  });

  it('should track loading state for specific operations', async () => {
    const { result } = renderHook(() => useMultipleLoading());
    
    const mockFn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('result'), 100))
    );
    
    act(() => {
      result.current.execute('test-operation', mockFn);
    });
    
    expect(result.current.isLoading('test-operation')).toBe(true);
    expect(result.current.isAnyLoading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    expect(result.current.isLoading('test-operation')).toBe(false);
    expect(result.current.isAnyLoading).toBe(false);
  });

  it('should handle errors for specific operations', async () => {
    const { result } = renderHook(() => useMultipleLoading());
    
    const mockError = new Error('Test error');
    const mockFn = jest.fn().mockRejectedValue(mockError);
    
    await act(async () => {
      try {
        await result.current.execute('error-operation', mockFn);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.getError('error-operation')).toBe(mockError);
  });

  it('should clear errors for specific operations', async () => {
    const { result } = renderHook(() => useMultipleLoading());
    
    const mockError = new Error('Test error');
    const mockFn = jest.fn().mockRejectedValue(mockError);
    
    await act(async () => {
      try {
        await result.current.execute('error-operation', mockFn);
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.getError('error-operation')).toBe(mockError);
    
    act(() => {
      result.current.clearError('error-operation');
    });
    
    expect(result.current.getError('error-operation')).toBeNull();
  });
});