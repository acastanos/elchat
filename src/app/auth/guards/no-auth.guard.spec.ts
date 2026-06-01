import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { noAuthGuard } from './no-auth.guard';
import { of } from 'rxjs';

describe('noAuthGuard', () => {
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
  });

  it('debe permitir el acceso (true) a /auth si el usuario NO está autenticado', (done) => {
    const mockAuthService = jasmine.createSpyObj('AuthService', [], {
      userState$: of(null)
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    TestBed.runInInjectionContext(() => {
      const guardResult: any = noAuthGuard({} as any, {} as any);
      guardResult.subscribe((result: boolean) => {
        expect(result).toBeTrue();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('debe redirigir a /chat si el usuario SÍ está autenticado', (done) => {
    const mockAuthService = jasmine.createSpyObj('AuthService', [], {
      userState$: of({ uid: 'test-uid' })
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    TestBed.runInInjectionContext(() => {
      const guardResult: any = noAuthGuard({} as any, {} as any);
      guardResult.subscribe((result: boolean) => {
        expect(result).toBeFalse();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/chat']);
        done();
      });
    });
  });
});
