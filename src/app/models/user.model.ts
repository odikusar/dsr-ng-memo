export interface User {
  id: string;
  email: string;
  name: string;
  activeMemoFileId: string;
  isTranslationByDefault: boolean;
  isDemo: boolean;
  isRandom?: boolean;
}
