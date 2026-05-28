import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getDatabase, provideDatabase } from '@angular/fire/database';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)), provideFirebaseApp(() => initializeApp(
      {
        apiKey: "AIzaSyC8JFRBhCqyj3he899vmt6815V687w6-dw",
        authDomain: "el-chat-69585.firebaseapp.com",
        projectId: "el-chat-69585",
        storageBucket: "el-chat-69585.firebasestorage.app",
        messagingSenderId: "286043571507",
        appId: "1:286043571507:web:df524546eb11e2178baa46",
        measurementId: "G-YQ419HJSKZ"
      }
    )), provideAuth(() => getAuth()), provideDatabase(() => getDatabase()),
  ],
});
