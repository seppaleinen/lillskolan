export interface LessonConfig {
  id: string;
  name: string;
  description: string;
  origin: string;
  entry: string;
  accentColor: string;
  icon?: string;
  estimatedSteps?: number;
}

export interface WordProgress {
  word: string;
  completed: boolean;
  stars: number;
  bestAccuracy: number;
  attempts: number;
  lastPlayedAt: number;
}

export interface LessonProgress {
  lessonId: string;
  stars: number;
  completedWords: Record<string, WordProgress>;
  bestAccuracy: number;
  completionCount: number;
  lastPlayedAt: number;
}

export type ProgressState = Record<string, LessonProgress>;

export type HubView = 'grid' | 'lesson';

export interface HubState {
  view: HubView;
  activeLessonId: string | null;
  progress: ProgressState;
}