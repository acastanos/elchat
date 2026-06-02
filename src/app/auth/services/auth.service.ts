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
import { User as FirebaseUser } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private db: Database = inject(Database);
  private injector = inject(Injector);

  // Observable para saber el estado de autenticación del usuario en tiempo real
  public readonly userState$: Observable<FirebaseUser | null> = authState(this.auth);

  public userData?: FirebaseUser | null;

  constructor() {
    this.userState$.subscribe((user) => {
      this.userData = user;
    });
  }

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
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

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
      await signInWithEmailAndPassword(this.auth, email, password);
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
      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;

      const dbRef = ref(this.db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      
      if (!snapshot.exists()) {
        await this.saveUserToDatabase({
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Usuario de Google',
          photoURL: user.photoURL || ''
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
      await signOut(this.auth);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw error;
    }
  }

  /**
   * Función privada auxiliar para guardar el perfil en Realtime Database
   */
  private async saveUserToDatabase(user: any): Promise<void> {
    const userRef = ref(this.db, `users/${user.uid}`);
    await set(userRef, user);
  }
}
