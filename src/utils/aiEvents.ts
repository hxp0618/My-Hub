export const AI_CONFIGURATION_REQUIRED_EVENT = 'myhub:ai-configuration-required';

export const notifyAIConfigurationRequired = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AI_CONFIGURATION_REQUIRED_EVENT));
};
