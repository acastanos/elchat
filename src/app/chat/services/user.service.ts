import { Injectable, inject } from '@angular/core';
import { Database, ref, query, orderByChild, startAt, endAt, get } from '@angular/fire/database';
import { User as FirebaseUser } from '@angular/fire/auth';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db: Database = inject(Database);
  private authService = inject(AuthService);

  /**
   * Busca usuarios en Realtime Database cuyo nombre comience por el término de búsqueda.
   * Excluye al usuario actual de los resultados.
   */
  async searchUsersByName(searchTerm: string): Promise<FirebaseUser[]> {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    
    const term = searchTerm.trim();
    
    // Referencia al nodo principal de usuarios
    const usersRef = ref(this.db, 'users');
    
    // Creamos la query usando Firebase Realtime DB.
    // El caracter '\uf8ff' es un código Unicode muy alto, utilizado como un truco en Firebase
    // para emular una consulta SQL del estilo "LIKE 'term%'"
    const searchQuery = query(
      usersRef, 
      orderByChild('name'), 
      startAt(term), 
      endAt(term + '\uf8ff')
    );

    const snapshot = await get(searchQuery);
    const users: FirebaseUser[] = [];
    
    const currentUserUid = this.authService.userData?.uid;

    if (snapshot.exists()) {
      // Usamos forEach para iterar de forma segura sobre el snapshot de Firebase
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val() as FirebaseUser;
        // No queremos chatear con nosotros mismos en esta búsqueda
        if (user.uid !== currentUserUid) {
          users.push(user);
        }
      });
    }

    return users;
  }
}
