import { Worker } from '../../src/common/worker';

// Concrete implementation for testing
class TestWorker extends Worker {
  public runProcessMock: jest.Mock;

  constructor() {
    super();
    this.runProcessMock = jest.fn();
  }

  protected async runProcess(): Promise<void> {
    return this.runProcessMock();
  }

  // Expose protected property for testing
  public getCurrentProcessPromise(): Promise<void> | null {
    return this.currentProcessPromise;
  }

  // Helper to check if worker is running
  public isRunning(): boolean {
    return this.currentProcessPromise !== null;
  }
}

describe('Worker', () => {
  let worker: TestWorker;

  beforeEach(() => {
    worker = new TestWorker();
  });

  describe('start', () => {
    it('should start the worker when not already running', async () => {
      worker.runProcessMock.mockResolvedValue(undefined);

      expect(worker.getCurrentProcessPromise()).toBeNull();

      const result = await worker.start();

      expect(worker.runProcessMock).toHaveBeenCalledTimes(1);
      expect(worker.getCurrentProcessPromise()).not.toBeNull();
      expect(result).toBeUndefined();
    });

    it('should return existing promise when already running', () => {
      const mockPromise = Promise.resolve();
      worker.runProcessMock.mockReturnValue(mockPromise);

      // Start the worker first time
      const firstStart = worker.start();
      expect(worker.isRunning()).toBe(true);
      
      // Try to start again while first is still running
      const secondStart = worker.start();

      // Should return same promise and not call runProcess again
      expect(firstStart).toStrictEqual(secondStart);
      expect(worker.runProcessMock).toHaveBeenCalledTimes(1);
    });

    it('should handle runProcess that returns undefined', async () => {
      worker.runProcessMock.mockReturnValue(undefined);

      const result = await worker.start();

      expect(worker.runProcessMock).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should handle runProcess that throws an error', async () => {
      const error = new Error('Process failed');
      worker.runProcessMock.mockRejectedValue(error);

      await expect(worker.start()).rejects.toThrow('Process failed');
      expect(worker.runProcessMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should return null when no process is running', async () => {
      expect(worker.getCurrentProcessPromise()).toBeNull();

      const result = await worker.stop();

      expect(result).toBeNull();
      expect(worker.getCurrentProcessPromise()).toBeNull();
    });

    it('should clear current process when called', () => {
      const mockPromise = Promise.resolve();
      worker.runProcessMock.mockReturnValue(mockPromise);

      // Start the worker
      worker.start();
      expect(worker.isRunning()).toBe(true);

      // Stop the worker - should return the promise and clear state
      const result = worker.stop();
      expect(result).toStrictEqual(mockPromise);
      expect(worker.isRunning()).toBe(false);
    });

    it('should handle multiple stop calls', async () => {
      const firstStop = await worker.stop();
      const secondStop = await worker.stop();

      expect(firstStop).toBeNull();
      expect(secondStop).toBeNull();
      expect(worker.isRunning()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle start-stop-start cycle', () => {
      const firstPromise = Promise.resolve();
      const secondPromise = Promise.resolve();
      
      worker.runProcessMock
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // First start
      const start1 = worker.start();
      expect(worker.isRunning()).toBe(true);
      expect(start1).toStrictEqual(firstPromise);

      // Stop
      const stop = worker.stop();
      expect(stop).toStrictEqual(firstPromise);
      expect(worker.isRunning()).toBe(false);

      // Second start
      const start2 = worker.start();
      expect(worker.isRunning()).toBe(true);
      expect(start2).toStrictEqual(secondPromise);
      expect(start2).not.toBe(firstPromise);

      expect(worker.runProcessMock).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent start calls', () => {
      const mockPromise = Promise.resolve();
      worker.runProcessMock.mockReturnValue(mockPromise);

      // Start concurrently (don't await)
      const firstStart = worker.start();
      const secondStart = worker.start();
      const thirdStart = worker.start();

      expect(firstStart).toStrictEqual(secondStart);
      expect(secondStart).toStrictEqual(thirdStart);
      expect(firstStart).toStrictEqual(mockPromise);
      expect(worker.runProcessMock).toHaveBeenCalledTimes(1);
    });
  });
});