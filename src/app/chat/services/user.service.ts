import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Database, ref, query, orderByChild, startAt, endAt, get } from '@angular/fire/database';
import { User as FirebaseUser } from '@angular/fire/auth';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);
  private injector = inject(Injector);

  /**
   * Busca usuarios en Realtime Database cuyo nombre comience por el término de búsqueda.
   * Excluye al usuario actual de los resultados.
   */
  async searchUsersByName(searchTerm: string): Promise<FirebaseUser[]> {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    
    const term = searchTerm.trim().toLowerCase();
    
    // Ejecutamos la construcción de la query y el get dentro del contexto de inyección 
    // de Angular para evitar el warning/error de AngularFire
    const snapshot = await runInInjectionContext(this.injector, () => {
      const usersRef = ref(this.db, 'users');
      const searchQuery = query(
        usersRef, 
        orderByChild('nameLowercase'), 
        startAt(term), 
        endAt(term + '\uf8ff')
      );
      return get(searchQuery);
    });
    const users: FirebaseUser[] = [];
    
    const currentUserUid = this.authService.userData?.uid;

    if (snapshot.exists()) {
      console.log('Firebase snapshot de búsqueda:', snapshot.val());
      snapshot.forEach((childSnapshot) => {
        const dbUser = childSnapshot.val();
        // Mapeamos 'name' a 'displayName' para que encaje con la interfaz FirebaseUser
        const user = { ...dbUser, displayName: dbUser.name || dbUser.displayName } as FirebaseUser;
        console.log('Usuario iterado:', user);
        // No queremos chatear con nosotros mismos en esta búsqueda
        if (user.uid !== currentUserUid) {
          users.push(user);
        } else {
          console.log('Ignorando al propio usuario actual:', user.uid);
        }
      });
    } else {
      console.log('El snapshot de la búsqueda no devolvió datos para el término:', term);
    }

    console.log('Usuarios devueltos por searchUsersByName:', users);

    return users;
  }

  /**
   * Obtiene la información de un usuario por su UID.
   */
  async getUserById(uid: string): Promise<any> {
    return runInInjectionContext(this.injector, async () => {
      const userRef = ref(this.db, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    });
  }
}
