import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { AiOrchestratorService } from './chat/services/ai-orchestrator.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private aiOrchestrator = inject(AiOrchestratorService);

  constructor() {}
}
