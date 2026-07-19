import type { Request, Response } from 'express';

class HomeController {
  public index(req: Request, res: Response): void {
    res.render('dashboard/index', {
      title: 'Dashboard',
    });
  }
}

export default new HomeController();
