import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { provideAuth } from '@angular/fire/auth';
import { initializeAuth, indexedDBLocalPersistence, getAuth } from 'firebase/auth';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from './environments/environment';
import { Capacitor } from '@capacitor/core';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment)),
    provideAuth(() => {
      const app = getApp();
      if (Capacitor.isNativePlatform()) {
        return initializeAuth(app, {
          persistence: indexedDBLocalPersistence
        });
      } else {
        return getAuth(app);
      }
    }),
    provideDatabase(() => getDatabase(getApp(), environment.databaseURL)),
    provideFirestore(() => getFirestore()),
  ],
});

