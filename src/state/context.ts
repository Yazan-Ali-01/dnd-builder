import { createContext } from 'react';
import type { Commands } from './commands';
import type { BuilderStore } from './store';

export interface BuilderContextValue {
  store: BuilderStore;
  commands: Commands;
}

export const BuilderContext = createContext<BuilderContextValue | null>(null);
