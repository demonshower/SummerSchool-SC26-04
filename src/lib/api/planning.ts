import { apiClient } from './client';

export const planningApi = {
  /** 提交规划任务，立即返回 jobId */
  createPlan: (tripId: string, dto?: any) =>
    apiClient.post(`/trips/${tripId}/planning/plan`, dto || {}),

  getStatus: (tripId: string) => apiClient.get(`/trips/${tripId}/planning/status`),

  getJob: (tripId: string, jobId: string) =>
    apiClient.get(`/trips/${tripId}/planning/jobs/${jobId}`),

  getResult: (tripId: string) => apiClient.get(`/trips/${tripId}/planning/result`),

  applyPlan: (tripId: string, version: number) =>
    apiClient.post(`/trips/${tripId}/planning/apply`, { version }),

  /** 轮询直到完成/失败 */
  async waitUntilDone(tripId: string, jobId?: string, timeoutMs = 180000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status: any = await planningApi.getStatus(tripId);
      const job = status?.job;
      if (jobId && job?.jobId && job.jobId !== jobId) {
        // still ok, take latest
      }
      if (status?.tripStatus === 'ready' && (!job || job.status === 'completed')) {
        return status;
      }
      if (job?.status === 'failed') {
        throw new Error(job.error || '规划失败');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('规划超时');
  },
};
