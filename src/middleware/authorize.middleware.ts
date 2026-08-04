import { Request, Response, NextFunction } from 'express';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.redirect(`/pages/login?error=${encodeURIComponent('Unauthenticated. Please log in.')}`);
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).render('errors/403', {
        title: 'Forbidden',
        pageTitle: '403 - Forbidden',
        pageDescription: "You don't have permission to access this page.",
        currentPath: '/dashboard',
      });
    }

    next();
  };
}
