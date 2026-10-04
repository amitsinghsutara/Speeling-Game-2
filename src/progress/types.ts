/**
 * Shapes for the "Child's Progress" feature. The AI Learning Engine is the
 * sole source of truth for the analysis — this module only describes the
 * wire contract and never performs mastery calculation or AI logic itself.
 */
import { z } from 'zod';

export const progressResponseSchema = z.object({
  learnerId: z.string(),
  generatedAt: z.string(),

  overall: z.object({
    mastery: z.number().min(0).max(1),
    trend: z.enum(['improving', 'stable', 'needs-practice']),
    summary: z.string(),
  }),

  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      mastery: z.number().min(0).max(1),
      trend: z.string(),
    }),
  ),

  strengths: z.array(z.string()),

  practiceAreas: z.array(
    z.object({
      skillId: z.string(),
      title: z.string(),
      description: z.string(),
      suggestion: z.string(),
    }),
  ),

  encouragement: z.string(),
});

export type ProgressResponse = z.infer<typeof progressResponseSchema>;

/** Every way a progress request can resolve. Never throws past this boundary. */
export type ProgressFetchResult =
  | { status: 'success'; data: ProgressResponse }
  | { status: 'network-error' }
  | { status: 'timeout' }
  | { status: 'server-error'; httpStatus: number }
  | { status: 'invalid-response' };

export interface ProgressApiClient {
  getLearnerProgress(learnerId: string): Promise<ProgressFetchResult>;
}
