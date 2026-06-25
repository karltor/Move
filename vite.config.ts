import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages project-page hosting requires the build to know the repo
// sub-path. Repo is `karltor/Move`, so the site lives at /Move/.
// If you rename the repo, change this one string (or replace with
// '__REPO_NAME__' and fill it in).
const REPO_BASE = '/Move/';

export default defineConfig({
  base: REPO_BASE,
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
