import app from '../server';

export default async function handler(req: any, res: any) {
  // Restore full path if rewritten by Vercel
  if (req.query?.__path) {
    const subpath = Array.isArray(req.query.__path) ? req.query.__path.join('/') : req.query.__path;
    req.url = '/api/' + subpath;
  } else if (typeof req.headers['x-forwarded-uri'] === 'string' && req.headers['x-forwarded-uri'].startsWith('/api')) {
    req.url = req.headers['x-forwarded-uri'];
  } else if (typeof req.headers['x-matched-path'] === 'string' && req.headers['x-matched-path'].startsWith('/api')) {
    req.url = req.headers['x-matched-path'];
  }

  return app(req, res);
}
