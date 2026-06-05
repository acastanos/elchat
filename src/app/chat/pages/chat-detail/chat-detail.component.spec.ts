import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChatDetailComponent } from './chat-detail.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';
import { BehaviorSubject } from 'rxjs';
import { Message } from '../../interfaces/chat.interface';
import { Geolocation } from '@capacitor/geolocation';

describe('ChatDetailComponent', () => {
  let component: ChatDetailComponent;
  let fixture: ComponentFixture<ChatDetailComponent>;
  
  let chatServiceSpy: jasmine.SpyObj<ChatService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  
  const mockMessages$ = new BehaviorSubject<(Message & { id: string, isFirstUnread?: boolean })[]>([]);

  beforeEach(async () => {
    spyOn(Geolocation, 'getCurrentPosition').and.returnValue(Promise.resolve({ coords: { latitude: 0, longitude: 0 } } as any));
    spyOn(Geolocation, 'watchPosition').and.returnValue(Promise.resolve('watch_id_123'));
    spyOn(Geolocation, 'clearWatch').and.returnValue(Promise.resolve());

    chatServiceSpy = jasmine.createSpyObj('ChatService', [
      'getMessages', 'initChatState', 'getChatById', 
      'loadOlderMessages', 'loadNewerMessages', 
      'sendMessage', 'resetToBottom', 'markChatAsRead'
    ], {
      hasMoreOlder: true,
      hasMoreNewer: true
    });
    chatServiceSpy.getMessages.and.returnValue(mockMessages$.asObservable());
    chatServiceSpy.initChatState.and.returnValue(Promise.resolve());
    chatServiceSpy.getChatById.and.returnValue(Promise.resolve({
      type: 'direct_chat', participantIds: ['testUser123', 'otherUser456'], updatedAt: 1234
    }));

    userServiceSpy = jasmine.createSpyObj('UserService', ['getUserById']);
    userServiceSpy.getUserById.and.returnValue(Promise.resolve({ name: 'Other User', photoURL: 'url.jpg' }));

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      userData: { uid: 'testUser123' }
    });

    await TestBed.configureTestingModule({
      imports: [ChatDetailComponent, ReactiveFormsModule],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'testChatId' } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatDetailComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el chat con el ID de la ruta en ngOnInit', fakeAsync(() => {
    fixture.detectChanges();
    tick(); // Para resolver las promesas de initChatState y getChatById

    expect(component.chatId).toBe('testChatId');
    expect(chatServiceSpy.initChatState).toHaveBeenCalledWith('testChatId');
    expect(chatServiceSpy.getChatById).toHaveBeenCalledWith('testChatId');
    expect(component.otherUserName).toBe('Other User');
  }));

  it('debería deshabilitar el botón de enviar si el formulario está inválido o vacío', () => {
    fixture.detectChanges();
    expect(component.messageForm.invalid).toBeTrue(); // Porque text está vacío

    component.messageForm.patchValue({ text: 'Hola mundo' });
    fixture.detectChanges();
    
    expect(component.messageForm.invalid).toBeFalse();
  });

  it('debería llamar a sendMessage en el servicio cuando se envía un mensaje válido', fakeAsync(() => {
    fixture.detectChanges();
    
    component.messageForm.patchValue({ text: '  Mensaje de prueba  ' });
    component.sendMessage();
    tick(100);

    // Debe hacer trim() al texto
    expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith('testChatId', 'Mensaje de prueba', 'text');
    expect(component.messageForm.get('text')?.value).toBeNull(); // Se resetea después de enviar
    expect(chatServiceSpy.resetToBottom).toHaveBeenCalled();
  }));

  it('debería llamar a markChatAsRead al destruir la vista (ionViewWillLeave)', fakeAsync(() => {
    fixture.detectChanges();
    component.ionViewWillLeave();
    tick();

    expect(chatServiceSpy.markChatAsRead).toHaveBeenCalledWith('testChatId');
  }));
});
