import { describe, expect, it } from 'vitest';
import { progressResponseSchema } from './types';

function validResponse() {
  return {
    learnerId: 'abc123',
    generatedAt: '2026-10-04T16:30:00Z',
    overall: {
      mastery: 0.78,
      trend: 'improving',
      summary: 'Your child is making steady progress.',
    },
    skills: [
      { id: 'initial-consonants', name: 'Initial Sounds', mastery: 0.89, trend: 'strong' },
      { id: 'short-vowels', name: 'Short Vowels', mastery: 0.67, trend: 'improving' },
    ],
    strengths: ['Initial consonant sounds', 'Final consonant sounds'],
    practiceAreas: [
      {
        skillId: 'short-vowels',
        title: 'Short Vowel Sounds',
        description: 'Short vowel sounds are currently more challenging.',
        suggestion: 'Practice words with short /a/ and /i/ sounds.',
      },
    ],
    encouragement: 'Keep encouraging your child.',
  };
}

describe('progressResponseSchema', () => {
  it('accepts a fully valid response', () => {
    const result = progressResponseSchema.safeParse(validResponse());
    expect(result.success).toBe(true);
  });

  it('accepts empty strengths/practiceAreas/skills arrays', () => {
    const result = progressResponseSchema.safeParse({
      ...validResponse(),
      skills: [],
      strengths: [],
      practiceAreas: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response missing a required top-level field', () => {
    const response = validResponse() as Partial<ReturnType<typeof validResponse>>;
    delete response.encouragement;
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects an out-of-range mastery value', () => {
    const response = validResponse();
    response.overall.mastery = 1.5;
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a negative mastery value', () => {
    const response = validResponse();
    response.overall.mastery = -0.1;
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects an invalid overall trend', () => {
    const response = validResponse() as unknown as Record<string, Record<string, unknown>>;
    response.overall.trend = 'amazing';
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a malformed skill entry', () => {
    const response = validResponse() as unknown as Record<string, unknown>;
    response.skills = [{ id: 'short-vowels', mastery: 0.5 }]; // missing name/trend
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a skill with an out-of-range mastery value', () => {
    const response = validResponse();
    response.skills[0].mastery = 2;
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });

  it('rejects a non-array strengths field', () => {
    const response = validResponse() as unknown as Record<string, unknown>;
    response.strengths = 'Initial sounds';
    expect(progressResponseSchema.safeParse(response).success).toBe(false);
  });
});
