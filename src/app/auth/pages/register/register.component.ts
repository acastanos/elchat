import { Component, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

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
    IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
  ]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public registerForm: FormGroup;
  public isLoading = false;
  public errorMessage = '';
  

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', [Validators.required, Validators.minLength(6), confirmPasswordValidator]]
    },);
  }


  // Creamos un getter para cada campo que dependa del estado del validador/error
  get nameLabel(): string {
    const control = this.registerForm?.get('name');
    if (!control) return 'Tu Nombre';
    if (control.hasError('required') && control.touched) {
      return 'Nombre (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 2 caracteres';
    }
    return 'Tu Nombre';
  }

  get emailLabel(): string {
    const control = this.registerForm?.get('email');
    if (!control) return 'Correo electrónico';
    if (control.hasError('required') && control.touched) {
      return 'Correo electrónico (Requerido)';
    }
    if (control.hasError('email') && control.dirty) {
      return 'Correo electrónico inválido';
    }
    return 'Correo electrónico';
  }

  get passwordLabel(): string {
    const control = this.registerForm?.get('password');
    if (!control) return 'Contraseña';
    if (control.hasError('required') && control.touched) {
      return 'Contraseña (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 6 caracteres';
    }
    return 'Contraseña';
  }

  get confirmarPasswordLabel(): string {
    const control = this.registerForm?.get('confirmarPassword');
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
  }



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
      // Redirigir al usuario al chat tras el registro exitoso
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = 'Hubo un error al registrarse. Puede que el email ya esté en uso.';
    } finally {
      this.isLoading = false;
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