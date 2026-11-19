export class QuizConfigurationError extends Error {constructor(){super('Quiz grading is temporarily unavailable. Your answers are saved. Please contact the app administrator.');this.code='QUIZ_SETUP_REQUIRED';this.status=503}}
// The same private value must be set on every app instance and retained across deployments.
// A process-local random fallback loses saved answer keys on a cold start.
export function quizSecret(env=process.env){const secret=env.QUIZ_SIGNING_SECRET?.trim();if(!secret||secret.length<32)throw new QuizConfigurationError();return secret}
