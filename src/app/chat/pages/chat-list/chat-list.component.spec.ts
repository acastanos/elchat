import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ChatListComponent } from './chat-list.component';

import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { UserService } from '../../services/user.service';
import { BehaviorSubject, of } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('ChatListComponent', () => {
  let component: ChatListComponent;
  let fixture: ComponentFixture<ChatListComponent>;

  beforeEach(async () => {
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['getUserChats', 'createOrGetDirectChat', 'deleteChat']);
    chatServiceSpy.getUserChats.and.returnValue(of([]));

    const authSpy = jasmine.createSpyObj('AuthService', ['logout']);
    authSpy.userData = { uid: 'user123' };
    
    const userSpy = jasmine.createSpyObj('UserService', ['getUsers', 'searchUsers']);
    userSpy.getUsers.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [ChatListComponent],
      providers: [
        provideRouter([]),
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: UserService, useValue: userSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
