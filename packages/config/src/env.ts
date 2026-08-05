import { z } from 'zod';

const baseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function validateEnvironment<T extends z.ZodRawShape>(
  shape: T,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return baseEnvironmentSchema.extend(shape).parse(environment);
}
