import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAnalyzeTask, handleReorganizeTree } from './server/api';

function geminiProxyPlugin(): Plugin {
  return {
    name: 'gemini-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/analyze-task', async (req, res) => {
        try {
          const env = loadEnv(server.config.mode, process.cwd(), '');
          const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
          await handleAnalyzeTask(req, res, apiKey);
        } catch (err: any) {
          console.error('[geminiProxyPlugin] Uncaught middleware error in analyze-task:', err);
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                fallback: true,
                reason: 'PROXY_EXCEPTION',
                result: {
                  action: 'create_top_level',
                  taskTitle: 'New Task',
                  targetParentId: null,
                  reparentExistingTaskIds: [],
                  reasoning: 'Saved safely due to server proxy exception.',
                  confidence: 0.5,
                  isFallback: true
                }
              })
            );
          }
        }
      });

      server.middlewares.use('/api/reorganize-tree', async (req, res) => {
        try {
          const env = loadEnv(server.config.mode, process.cwd(), '');
          const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
          await handleReorganizeTree(req, res, apiKey);
        } catch (err: any) {
          console.error('[geminiProxyPlugin] Uncaught middleware error in reorganize-tree:', err);
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                fallback: true,
                result: {
                  clusters: [],
                  reasoning: 'Reorganization fallback triggered.',
                  isFallback: true
                }
              })
            );
          }
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), geminiProxyPlugin()],
  server: {
    port: 5173,
    host: true
  }
});
