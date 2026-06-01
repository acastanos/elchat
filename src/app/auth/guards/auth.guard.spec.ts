import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { of } from 'rxjs';

describe('authGuard', () => {
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
  });

  it('debe redirigir a /auth/login si el usuario NO está autenticado', (done) => {
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
      const guardResult: any = authGuard({} as any, {} as any);
      guardResult.subscribe((result: boolean) => {
        expect(result).toBeFalse();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
        done();
      });
    });
  });

  it('debe permitir el acceso (true) si el usuario SÍ está autenticado', (done) => {
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
      const guardResult: any = authGuard({} as any, {} as any);
      guardResult.subscribe((result: boolean) => {
        expect(result).toBeTrue();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
