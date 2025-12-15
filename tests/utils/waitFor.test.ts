import waitFor from '../../src/utils/waitFor';

// Mock setTimeout to speed up tests
jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

describe('waitFor', () => {
  let mockSetTimeout: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetTimeout = require('timers/promises').setTimeout;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful conditions', () => {
    it('should resolve immediately when condition is true from start', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(true);

      await waitFor(conditionPredicate);

      expect(conditionPredicate).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should resolve after condition becomes true', async () => {
      const conditionPredicate = jest.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await waitFor(conditionPredicate, 30000, 1000);

      expect(conditionPredicate).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledWith(1000);
    });
  });

  describe('timeout scenarios', () => {
    it('should complete all iterations when condition never becomes true', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 3000, 1000);

      // 3000ms / 1000ms = 3 iterations
      expect(conditionPredicate).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(3);
    });

    it('should handle edge case where maxWaitTime is less than interval', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 500, 1000);

      // Should use min(500, 1000) = 500ms as interval
      // 500ms / 500ms = 1 iteration
      expect(conditionPredicate).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(500);
    });

    it('should handle fractional iterations correctly', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 2500, 1000);

      // ceil(2500 / 1000) = ceil(2.5) = 3 iterations
      expect(conditionPredicate).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(3);
    });
  });

  describe('default parameters', () => {
    it('should use default maxWaitTime and conditionCheckInterval', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate);

      // Default: 30000ms / 5000ms = 6 iterations
      expect(conditionPredicate).toHaveBeenCalledTimes(6);
      expect(mockSetTimeout).toHaveBeenCalledTimes(6);
      expect(mockSetTimeout).toHaveBeenCalledWith(5000);
    });

    it('should use custom maxWaitTime with default interval', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 10000);

      // 10000ms / 5000ms = 2 iterations
      expect(conditionPredicate).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledWith(5000);
    });
  });

  describe('real-world scenarios', () => {
    it('should work with state that changes over time', async () => {
      let counter = 0;
      const conditionPredicate = jest.fn(() => {
        counter++;
        return counter >= 3;
      });

      await waitFor(conditionPredicate, 10000, 1000);

      expect(conditionPredicate).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });

    it('should work with async condition predicates', async () => {
      let isReady = false;
      const conditionPredicate = jest.fn(() => isReady);

      // Simulate async state change
      setTimeout(() => {
        isReady = true;
      }, 0);

      await waitFor(conditionPredicate, 5000, 1000);

      expect(conditionPredicate).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxWaitTime', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 0, 1000);

      // ceil(0 / 1000) = 0, but we should still check at least once
      expect(conditionPredicate).toHaveBeenCalledTimes(0);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should handle very small intervals', async () => {
      const conditionPredicate = jest.fn().mockReturnValue(false);

      await waitFor(conditionPredicate, 100, 1);

      // ceil(100 / 1) = 100 iterations
      expect(conditionPredicate).toHaveBeenCalledTimes(100);
      expect(mockSetTimeout).toHaveBeenCalledTimes(100);
      expect(mockSetTimeout).toHaveBeenCalledWith(1);
    });
  });
});