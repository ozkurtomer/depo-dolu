// Node'un tip silme modu uzantısız göreli içe aktarmaları (`./i18n`) çözmez; Angular kaynağı ise
// uzantısız yazar. Bu kanca yalnızca testlerde `.ts` ekleyerek aradaki farkı kapatır.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch { /* uzantısız haliyle dene */ }
    }
    return nextResolve(specifier, context);
  },
});
