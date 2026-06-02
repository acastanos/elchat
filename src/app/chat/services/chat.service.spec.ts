import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { Database } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';

describe('ChatService', () => {
  let service: ChatService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let databaseSpy: jasmine.SpyObj<Database>;

  beforeEach(() => {
    // Creamos espías (mocks) para no interactuar con la base de datos real
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: { uid: 'testUser123', email: 'test@test.com' }
    });
    databaseSpy = jasmine.createSpyObj('Database', ['app', 'type']);

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Database, useValue: databaseSpy }
      ]
    });
    service = TestBed.inject(ChatService);
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // Nota: Las funciones modulares de Firebase (ref, get, set, push) son difíciles de simular
  // sin un entorno de prueba de Firebase o herramientas avanzadas de mockeo de módulos de ES.
  // Por el momento validamos la inyección y el estado inicial del servicio para el coverage base.
});
