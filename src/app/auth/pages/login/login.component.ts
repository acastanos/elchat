import { Component, inject } from '@angular/core';
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

  public loginForm: FormGroup;
  public isLoading = false;
  public errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

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
