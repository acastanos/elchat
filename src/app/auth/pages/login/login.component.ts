import { Component, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonItem, IonInput, IonButton, IonText, IonSpinner
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  public isLoading = false;
  public errorMessage = '';
  private userSub!: Subscription;
  
  public loginForm: FormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

  private emailEvents = toSignal(this.loginForm.get('email')!.events);
  private passwordEvents = toSignal(this.loginForm.get('password')!.events);

  ngOnInit() {
    this.userSub = this.authService.userState$.subscribe(user => {
      console.log('LoginComponent detectó userState$:', user ? user.email : 'null');
      if (user) {
        this.ngZone.run(() => {
          console.log('Redirigiendo a /chat...');
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

  ionViewWillEnter() {
    // Al entrar en la vista nos aseguramos de que el loading esté quitado
    this.isLoading = false;
    this.errorMessage = '';
    this.loginForm.reset(); // Limpiar el formulario al volver (ej: hacer logout)
  }

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
      // Forzamos la ejecución dentro de Angular Zone para actualizar la UI y rutear
      this.ngZone.run(() => {
        this.isLoading = false;
        this.router.navigate(['/chat']);
      });
    } catch (error: any) {
      this.ngZone.run(() => {
        this.errorMessage = 'Credenciales incorrectas o error de conexión.';
        this.isLoading = false;
      });
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
      // Como usamos signInWithRedirect, la página recargará e irá a Google.
      // El ruteo final a /chat se encarga ngOnInit() cuando vuelva la sesión de Google.
    } catch (error: any) {
      this.ngZone.run(() => {
        this.errorMessage = 'Error al iniciar sesión con Google.';
        this.isLoading = false;
      });
    }
  }
}
