import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  authState,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from '@angular/fire/auth';
import { Database, ref, set, get, child } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { User as FirebaseUser } from '@firebase/auth';
import { AppUser } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private db: Database = inject(Database);
  private injector = inject(Injector);

  // Observable para saber el estado de autenticación del usuario en tiempo real
  public readonly userState$: Observable<FirebaseUser | null> = authState(this.auth);

  constructor() {}

  /**
   * Obtiene el usuario actual logueado
   */
  get currentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Registra a un nuevo usuario con Email, Contraseña y Nombre.
   * Tras crear la cuenta en Firebase Auth, guarda su perfil en Realtime Database.
   */
  async registerWithEmail(email: string, password: string, name: string): Promise<void> {
    try {
      // 1. Crear el usuario en Firebase Auth
      const userCredential = await runInInjectionContext(this.injector, () =>
        createUserWithEmailAndPassword(this.auth, email, password)
      );
      const user = userCredential.user;

      // 2. Actualizar el perfil en Auth para tener el Display Name
      await runInInjectionContext(this.injector, () =>
        updateProfile(user, { displayName: name })
      );

      // 3. Guardar el perfil en Realtime Database (/users/{uid})
      await this.saveUserToDatabase({
        uid: user.uid,
        email: user.email,
        name: name
      });
    } catch (error) {
      console.error('Error durante el registro:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con Email y Contraseña
   */
  async loginWithEmail(email: string, password: string): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () =>
        signInWithEmailAndPassword(this.auth, email, password)
      );
    } catch (error) {
      console.error('Error durante el inicio de sesión:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con Google (Gmail)
   * Si es la primera vez que entra, crea su perfil en Realtime Database.
   */
  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await runInInjectionContext(this.injector, () =>
        signInWithPopup(this.auth, provider)
      );
      const user = userCredential.user;

      // Comprobar si el usuario ya existe en la DB
      const dbRef = ref(this.db);
      const snapshot = await runInInjectionContext(this.injector, () =>
        get(child(dbRef, `users/${user.uid}`))
      );
      
      // Si no existe (es su primer login con Google), lo guardamos
      if (!snapshot.exists()) {
        await this.saveUserToDatabase({
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL
        });
      }
    } catch (error) {
      console.error('Error durante el login con Google:', error);
      throw error;
    }
  }

  /**
   * Cierra la sesión activa
   */
  async logout(): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () =>
        signOut(this.auth)
      );
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw error;
    }
  }

  /**
   * Función privada auxiliar para guardar el perfil en Realtime Database
   */
  private async saveUserToDatabase(user: AppUser): Promise<void> {
    const userRef = ref(this.db, `users/${user.uid}`);
    await runInInjectionContext(this.injector, () =>
      set(userRef, user)
    );
  }
}
