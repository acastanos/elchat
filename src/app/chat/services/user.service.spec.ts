import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { Database } from '@angular/fire/database';
import { AuthService } from '../../auth/services/auth.service';

describe('UserService', () => {
  let service: UserService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let databaseSpy: jasmine.SpyObj<Database>;

  beforeEach(() => {
    // Inicializamos mocks
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: { uid: 'user123', email: 'test@mail.com' }
    });
    databaseSpy = jasmine.createSpyObj('Database', ['app', 'type']);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Database, useValue: databaseSpy }
      ]
    });
    service = TestBed.inject(UserService);
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });
  
  it('debería retornar un array vacío si el término de búsqueda está vacío', async () => {
    // Podemos probar el filtro inicial sin necesidad de base de datos
    const result = await service.searchUsersByName('');
    expect(result).toEqual([]);
    
    const resultSpaces = await service.searchUsersByName('   ');
    expect(resultSpaces).toEqual([]);
  });
});
