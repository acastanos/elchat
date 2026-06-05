import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../../auth/services/auth.service';
import { ChatService } from '../../../chat/services/chat.service';
import { UserService } from '../../../chat/services/user.service';
import { AlertController, ToastController } from '@ionic/angular/standalone';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let alertElementSpy: any;
  let toastElementSpy: any;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      userData: { uid: 'testUser123', email: 'test@test.com' }
    });

    chatServiceSpy = jasmine.createSpyObj('ChatService', ['wipeAllChats', 'markAllChatsAsUnread']);
    chatServiceSpy.wipeAllChats.and.returnValue(Promise.resolve());
    chatServiceSpy.markAllChatsAsUnread.and.returnValue(Promise.resolve());

    userServiceSpy = jasmine.createSpyObj('UserService', ['getUserById']);

    alertElementSpy = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
    alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve(alertElementSpy));

    toastElementSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(toastElementSpy));

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería marcar isAdmin como true si el usuario es admin', fakeAsync(() => {
    userServiceSpy.getUserById.and.returnValue(Promise.resolve({ role: 'admin' }));
    
    // Disparamos ngOnInit (en Ionic components standalone a veces hay que llamarlo manual o hacer detectChanges)
    fixture.detectChanges();
    tick();

    expect(userServiceSpy.getUserById).toHaveBeenCalledWith('testUser123');
    expect(component.isAdmin).toBeTrue();
  }));

  it('NO debería marcar isAdmin como true si el usuario no es admin', fakeAsync(() => {
    userServiceSpy.getUserById.and.returnValue(Promise.resolve({ role: 'user' }));
    
    fixture.detectChanges();
    tick();

    expect(component.isAdmin).toBeFalse();
  }));

  describe('Acciones de Administrador', () => {
    beforeEach(() => {
      component.isAdmin = true;
    });

    it('debería mostrar alerta de confirmación al llamar confirmWipeAll', fakeAsync(() => {
      component.confirmWipeAll();
      tick();
      expect(alertControllerSpy.create).toHaveBeenCalled();
      expect(alertElementSpy.present).toHaveBeenCalled();
    }));

    it('debería llamar a wipeAllChats y mostrar un toast de éxito al ejecutar executeWipe', fakeAsync(() => {
      // executeWipe es privado, lo llamamos a través de la interfaz pública
      // @ts-ignore
      component.executeWipe();
      tick();

      expect(chatServiceSpy.wipeAllChats).toHaveBeenCalled();
      expect(toastControllerSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
        color: 'success'
      }));
      expect(toastElementSpy.present).toHaveBeenCalled();
    }));

    it('debería mostrar alerta de confirmación al llamar confirmMarkAllUnread', fakeAsync(() => {
      component.confirmMarkAllUnread();
      tick();
      expect(alertControllerSpy.create).toHaveBeenCalled();
      expect(alertElementSpy.present).toHaveBeenCalled();
    }));

    it('debería llamar a markAllChatsAsUnread y mostrar toast de éxito al ejecutar executeMarkAllUnread', fakeAsync(() => {
      // executeMarkAllUnread es privado
      // @ts-ignore
      component.executeMarkAllUnread();
      tick();

      expect(chatServiceSpy.markAllChatsAsUnread).toHaveBeenCalled();
      expect(toastControllerSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
        color: 'success'
      }));
      expect(toastElementSpy.present).toHaveBeenCalled();
    }));
  });
});
