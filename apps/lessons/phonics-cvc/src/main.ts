import { LessonBridge } from '@lillskolan/lesson-sdk';
import { HUB_ORIGIN } from './config';

const app = document.getElementById('app');
if (app) {
  // Create bridge to communicate with hub
  const bridge = new LessonBridge({
    targetOrigin: HUB_ORIGIN,
    devMode: (import.meta as unknown as { env: { DEV?: boolean } }).env?.DEV === true,
  });

  // Demo: send progress events every 2 seconds, then complete after 3 steps
  let stepIndex = 0;
  const totalSteps = 5;
  const accuracy = 0.85;

  const progressInterval = setInterval(() => {
    stepIndex++;
    
    if (stepIndex <= totalSteps) {
      bridge.sendProgress({
        stepIndex,
        totalSteps,
        accuracy,
      });
      
      app.innerHTML = `
        <h1>Läsläs: CVC</h1>
        <p>Steg ${stepIndex} av ${totalSteps}</p>
        <p>Skickar framsteg till hub...</p>
      `;
    } else {
      // Complete the lesson
      clearInterval(progressInterval);
      
      bridge.sendComplete({
        stars: 3,
        completionTimeMs: stepIndex * 2000,
        summary: 'Demo: CVC-lektion klar!',
      });
      
      app.innerHTML = `
        <h1>Läsläs: CVC</h1>
        <p>🎉 Bra jobbat! Lektionen är klar!</p>
        <p>3 stjärnor earned</p>
      `;
    }
  }, 2000);

  // Initial render
  app.innerHTML = `
    <h1>Läsläs: CVC</h1>
    <p>Startar lektion...</p>
  `;
}
