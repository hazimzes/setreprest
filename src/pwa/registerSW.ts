import { registerSW } from 'virtual:pwa-register';

export function setupUpdatePrompt(onUpdate: (reload: () => void) => () => void) {
  const updateSW = registerSW({
    onNeedRefresh() {
      const dispose = onUpdate(() => {
        void updateSW(true);
      });
      return dispose;
    },
  });
  return updateSW;
}
