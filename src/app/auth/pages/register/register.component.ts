import { Component, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NgZone } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonInput, IonButton, IonText, IonSpinner
  ]
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  public registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required, Validators.minLength(6), confirmPasswordValidator]]
  });
  public isLoading = false;
  public errorMessage = '';
  private userSub!: Subscription;
  
  private nameEvents = toSignal(this.registerForm.get('name')!.events);
  private emailEvents = toSignal(this.registerForm.get('email')!.events);
  private passwordEvents = toSignal(this.registerForm.get('password')!.events);
  private confirmarPasswordEvents = toSignal(this.registerForm.get('confirmarPassword')!.events);

  ngOnInit() {
    this.userSub = this.authService.userState$.subscribe(user => {
      if (user) {
        this.ngZone.run(() => {
          this.router.navigate(['/chat']);
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  nameLabel = computed(() => {
    this.nameEvents(); 
    const control = this.registerForm.get('name');
    if (!control) return 'Tu Nombre';
    if (control.hasError('required') && control.touched) {
      return 'Nombre (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 2 caracteres';
    }
    return 'Tu Nombre';
  });

  emailLabel = computed(() => {
    this.emailEvents();
    const control = this.registerForm.get('email');
    if (!control) return 'Correo electrónico';
    if (control.hasError('required') && control.touched) {
      return 'Correo electrónico (Requerido)';
    }
    if (control.hasError('email') && control.dirty) {
      return 'Correo electrónico inválido';
    }
    return 'Correo electrónico';
  });

  passwordLabel = computed(() => {
    this.passwordEvents();
    const control = this.registerForm.get('password');
    if (!control) return 'Contraseña';
    if (control.hasError('required') && control.touched) {
      return 'Contraseña (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 6 caracteres';
    }
    return 'Contraseña';
  });

  confirmarPasswordLabel = computed(() => {
    this.confirmarPasswordEvents();
    const control = this.registerForm.get('confirmarPassword');
    if (!control) return 'Confirmar Contraseña';
    if (control.hasError('required') && control.touched) {
      return 'Confirmar Contraseña (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 6 caracteres';
    }
    if (control.hasError('passwordMismatch') && control.dirty) {
      return 'Las contraseñas no coinciden';
    }
    return 'Confirmar Contraseña';
  });



  /**
   * Intenta registrar al usuario con Nombre, Email y Contraseña
   */
  async onRegister() {

    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password, name } = this.registerForm.value;

    try {
      await this.authService.registerWithEmail(email, password, name);
      // Forzamos la ejecución dentro de Angular Zone para actualizar la UI y rutear
      this.ngZone.run(() => {
        this.isLoading = false;
        this.router.navigate(['/chat']);
      });
    } catch (error: any) {
      this.ngZone.run(() => {
        if(error.code === 'auth/email-already-in-use'){
          this.errorMessage = 'El correo electrónico ya está en uso.';
        }else if(error.code === 'auth/invalid-email'){
          this.errorMessage = 'El correo electrónico es inválido.';
        }else{
          this.errorMessage = 'Hubo un error al registrarse.';
        }
        this.isLoading = false;
      });
    }
  }
}

/**
 * Valida que las contraseñas coincidan
 */
export const confirmPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.parent?.get('password')?.value;
  return password === control.value ? null : { passwordMismatch: true };
};