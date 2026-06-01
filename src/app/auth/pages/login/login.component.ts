import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public isLoading = false;
  public errorMessage = '';
  public loginForm: FormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

  private emailEvents = toSignal(this.loginForm.get('email')!.events);
  private passwordEvents = toSignal(this.loginForm.get('password')!.events);


  emailLabel = computed(() => {
    this.emailEvents();
    const control = this.loginForm.get('email');
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
    const control = this.loginForm.get('password');
    if (!control) return 'Contraseña';
    if (control.hasError('required') && control.touched) {
      return 'Contraseña (Requerido)';
    }
    if (control.hasError('minlength') && control.dirty) {
      return 'Mínimo 6 caracteres';
    }
    return 'Contraseña';
  });

  /**
   * Intenta iniciar sesión con Email y Contraseña
   */
  async onLogin() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    try {
      await this.authService.loginWithEmail(email, password);
      // Redirigir al usuario al chat tras hacer login exitoso
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = 'Credenciales incorrectas o error de conexión.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Intenta iniciar sesión con Google
   */
  async onGoogleLogin() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = 'Error al iniciar sesión con Google.';
    } finally {
      this.isLoading = false;
    }
  }
}
