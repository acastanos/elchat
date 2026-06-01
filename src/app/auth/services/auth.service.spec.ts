import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    // Mockeamos las dependencias de Firebase para el test
    const authSpy = jasmine.createSpyObj('Auth', ['currentUser']);
    const dbSpy = jasmine.createSpyObj('Database', ['app']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Database, useValue: dbSpy }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('debería tener los métodos de autenticación definidos', () => {
    expect(service.registerWithEmail).toBeDefined();
    expect(service.loginWithEmail).toBeDefined();
    expect(service.loginWithGoogle).toBeDefined();
    expect(service.logout).toBeDefined();
  });
});
